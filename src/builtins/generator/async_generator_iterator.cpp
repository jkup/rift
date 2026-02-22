#include "rift/builtins/generator/async_generator_iterator.h"

#include <deque>
#include <vector>

#include "rift/builtins/builtin_base.h"
#include "rift/builtins/generator/generator_iterator.h"
#include "rift/builtins/promise/promise.h"
#include "rift/builtins/symbol/symbol.h"
#include "rift/frontend/ast/ast_node.h"
#include "rift/interpreter/async_generator_evaluator.h"
#include "rift/interpreter/engine.h"
#include "rift/interpreter/evaluation_utils.h"
#include "rift/interpreter/javascript_exception.h"
#include "rift/memory/gc_protector.h"

namespace rift::builtins {

// Static member initialization
JSObject* AsyncGeneratorIterator::prototype_ = nullptr;
rift::memory::ObjectFactory* AsyncGeneratorIterator::object_factory_ = nullptr;

// Storage for async generator execution contexts
struct AsyncGeneratorContextStorage {
    std::shared_ptr<rift::ast::ASTNode> body;
    std::shared_ptr<Environment> env;
    rift::core::Rift* engine;
    std::vector<std::string> param_names;
    rift::core::AsyncGeneratorExecutionContext exec_context;
};

// Use deque instead of vector: deque does not invalidate references/pointers to
// existing elements when push_back is called, which is critical since we pass
// exec_context by reference to the evaluator and new generators may be created
// during execution.
static std::deque<AsyncGeneratorContextStorage> async_generator_contexts;

// Helper: create an iterator result object {value, done}
static JSObject* createIterResult(rift::memory::ObjectFactory* factory, const Value& value,
                                  bool done) {
    auto* result = factory->createJSObject();
    rift::memory::GCProtector protect(result, factory->getObjectManager());
    result->setProperty("value", value);
    result->setProperty("done", Value(done));
    return result;
}

// Forward declaration of step function
static void step(JSObject* gen, size_t context_index, JSObject* result_promise,
                 rift::memory::ObjectFactory* factory);

JSObject* AsyncGeneratorIterator::create(rift::memory::ObjectFactory* factory,
                                         std::shared_ptr<rift::ast::ASTNode> body,
                                         std::shared_ptr<Environment> env, rift::core::Rift* engine,
                                         const std::vector<std::string>& paramNames,
                                         const std::vector<Value>& args) {
    auto* iterator = factory->createJSObject(prototype_);
    rift::memory::GCProtector protect(iterator, factory->getObjectManager());

    // Create a child environment for the generator's local scope
    auto gen_env = std::make_shared<Environment>(env);

    // Bind parameters
    for(size_t i = 0; i < paramNames.size(); ++i) {
        Value arg_value = (i < args.size()) ? args[i] : Value::undefined();
        gen_env->define(paramNames[i], arg_value, runtime::VariableType::Var);
    }

    AsyncGeneratorContextStorage ctx;
    ctx.body = body;
    ctx.env = gen_env;
    ctx.engine = engine;
    ctx.param_names = paramNames;

    size_t context_index = async_generator_contexts.size();
    async_generator_contexts.push_back(std::move(ctx));

    iterator->setProperty("[[GeneratorState]]",
                          Value(static_cast<double>(GeneratorState::SuspendedStart)));
    iterator->setProperty("[[GeneratorContextIndex]]", Value(static_cast<double>(context_index)));

    return iterator;
}

// The core step function: runs the body until a suspension point
static void step(JSObject* gen, size_t context_index, JSObject* result_promise,
                 rift::memory::ObjectFactory* factory) {
    if(context_index >= async_generator_contexts.size()) {
        gen->setProperty("[[GeneratorState]]",
                         Value(static_cast<double>(GeneratorState::Completed)));
        auto* iter_result = createIterResult(factory, Value::undefined(), true);
        Promise::resolvePromise(result_promise, Value(iter_result));
        return;
    }

    auto& gen_ctx = async_generator_contexts[context_index];

    try {
        Value final_value = rift::core::AsyncGeneratorEvaluator::execute(
            gen_ctx.body, gen_ctx.env, gen_ctx.engine, gen_ctx.exec_context);

        // Body completed normally
        gen->setProperty("[[GeneratorState]]",
                         Value(static_cast<double>(GeneratorState::Completed)));
        auto* iter_result = createIterResult(factory, final_value, true);
        Promise::resolvePromise(result_promise, Value(iter_result));

    } catch(const rift::core::YieldException& e) {
        // Generator yielded a value
        gen_ctx.exec_context.currentSuspensionId = e.getYieldPointId();
        gen_ctx.exec_context.resumeStatementIndex = e.getStatementIndex();
        gen_ctx.exec_context.suspendedAtYield = true;
        gen_ctx.exec_context.suspendedAtAwait = false;

        gen->setProperty("[[GeneratorState]]",
                         Value(static_cast<double>(GeneratorState::SuspendedYield)));

        auto* iter_result = createIterResult(factory, e.getValue(), false);
        Promise::resolvePromise(result_promise, Value(iter_result));

    } catch(const rift::core::AwaitException& e) {
        // Generator hit an await - transparent to caller, promise stays pending
        gen_ctx.exec_context.currentSuspensionId = e.getAwaitPointId();
        gen_ctx.exec_context.resumeStatementIndex = e.getStatementIndex();
        gen_ctx.exec_context.suspendedAtYield = false;
        gen_ctx.exec_context.suspendedAtAwait = true;

        // Keep state as Executing during internal await
        // (caller's promise stays pending until yield or completion)

        Value awaited = e.getValue();

        // Wrap non-Promise values
        if(!Promise::isPromise(awaited)) {
            auto* wrapped = Promise::createPromiseObject(factory);
            Promise::resolvePromise(wrapped, awaited);
            awaited = Value(wrapped);
        }

        // Create onFulfilled handler
        auto* on_fulfilled = factory->createJSFunction(
            [gen, context_index, result_promise, factory](const rift::core::CallContext& /*ctx*/,
                                                          const std::vector<Value>& args) -> Value {
                auto& ctx = async_generator_contexts[context_index];
                ctx.exec_context.sentValue = args.empty() ? Value::undefined() : args[0];
                ctx.exec_context.isResuming = true;
                ctx.exec_context.throwOnResume = false;
                step(gen, context_index, result_promise, factory);
                return Value::undefined();
            });

        // Create onRejected handler
        auto* on_rejected = factory->createJSFunction(
            [gen, context_index, result_promise, factory](const rift::core::CallContext& /*ctx*/,
                                                          const std::vector<Value>& args) -> Value {
                auto& ctx = async_generator_contexts[context_index];
                ctx.exec_context.sentValue = args.empty() ? Value::undefined() : args[0];
                ctx.exec_context.isResuming = true;
                ctx.exec_context.throwOnResume = true;
                step(gen, context_index, result_promise, factory);
                return Value::undefined();
            });

        // Attach handlers via Promise.prototype.then
        rift::core::CallContext then_ctx(rift::core::CallType::Function, awaited);
        Promise::then(then_ctx, {Value(on_fulfilled), Value(on_rejected)});

    } catch(const rift::core::ReturnException& e) {
        gen->setProperty("[[GeneratorState]]",
                         Value(static_cast<double>(GeneratorState::Completed)));
        auto* iter_result = createIterResult(factory, e.getValue(), true);
        Promise::resolvePromise(result_promise, Value(iter_result));

    } catch(const rift::core::JavaScriptException& e) {
        gen->setProperty("[[GeneratorState]]",
                         Value(static_cast<double>(GeneratorState::Completed)));
        Promise::rejectPromise(result_promise, e.getValue());

    } catch(const std::exception& e) {
        gen->setProperty("[[GeneratorState]]",
                         Value(static_cast<double>(GeneratorState::Completed)));
        Promise::rejectPromise(result_promise, Value(std::string(e.what())));
    }
}

Value AsyncGeneratorIterator::next(const CallContext& ctx, const std::vector<Value>& args) {
    if(!ctx.thisValue.isObject()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: AsyncGenerator.prototype.next called on non-object"));
    }

    auto* gen = ctx.thisValue.getObject();
    if(!gen) {
        throw rift::core::JavaScriptException(Value("TypeError: invalid AsyncGenerator"));
    }

    auto* factory = getObjectFactory();
    if(!factory) {
        throw rift::core::JavaScriptException(
            Value("TypeError: AsyncGenerator factory not initialized"));
    }

    // Create the result promise
    auto* result_promise = Promise::createPromiseObject(factory);
    rift::memory::GCProtector protect_promise(result_promise, factory->getObjectManager());

    Value state_val = gen->getProperty("[[GeneratorState]]");
    auto state = static_cast<GeneratorState>(static_cast<int>(state_val.toNumber()));

    // Completed: resolve with {value: undefined, done: true}
    if(state == GeneratorState::Completed) {
        auto* iter_result = createIterResult(factory, Value::undefined(), true);
        Promise::resolvePromise(result_promise, Value(iter_result));
        return Value(result_promise);
    }

    // Executing: throw TypeError
    if(state == GeneratorState::Executing) {
        Promise::rejectPromise(result_promise,
                               Value("TypeError: AsyncGenerator is already executing"));
        return Value(result_promise);
    }

    // Get context
    Value context_index_val = gen->getProperty("[[GeneratorContextIndex]]");
    size_t context_index = static_cast<size_t>(context_index_val.toNumber());

    if(context_index >= async_generator_contexts.size()) {
        gen->setProperty("[[GeneratorState]]",
                         Value(static_cast<double>(GeneratorState::Completed)));
        auto* iter_result = createIterResult(factory, Value::undefined(), true);
        Promise::resolvePromise(result_promise, Value(iter_result));
        return Value(result_promise);
    }

    auto& gen_ctx = async_generator_contexts[context_index];

    // Set up resumption
    Value sent_value = args.empty() ? Value::undefined() : args[0];
    gen_ctx.exec_context.sentValue = sent_value;

    if(state == GeneratorState::SuspendedYield) {
        gen_ctx.exec_context.isResuming = true;
    } else {
        gen_ctx.exec_context.isResuming = false;
        gen_ctx.exec_context.currentSuspensionId = -1;
        gen_ctx.exec_context.resumeStatementIndex = 0;
    }

    // Set state to executing
    gen->setProperty("[[GeneratorState]]", Value(static_cast<double>(GeneratorState::Executing)));

    // Run the step function
    step(gen, context_index, result_promise, factory);

    return Value(result_promise);
}

Value AsyncGeneratorIterator::returnMethod(const CallContext& ctx, const std::vector<Value>& args) {
    if(!ctx.thisValue.isObject()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: AsyncGenerator.prototype.return called on non-object"));
    }

    auto* gen = ctx.thisValue.getObject();
    if(!gen) {
        throw rift::core::JavaScriptException(Value("TypeError: invalid AsyncGenerator"));
    }

    auto* factory = getObjectFactory();
    Value return_value = args.empty() ? Value::undefined() : args[0];

    auto* result_promise = Promise::createPromiseObject(factory);
    rift::memory::GCProtector protect_promise(result_promise, factory->getObjectManager());

    Value state_val = gen->getProperty("[[GeneratorState]]");
    auto state = static_cast<GeneratorState>(static_cast<int>(state_val.toNumber()));

    // If completed or suspendedStart, just resolve with {value, done: true}
    if(state == GeneratorState::Completed || state == GeneratorState::SuspendedStart) {
        gen->setProperty("[[GeneratorState]]",
                         Value(static_cast<double>(GeneratorState::Completed)));
        auto* iter_result = createIterResult(factory, return_value, true);
        Promise::resolvePromise(result_promise, Value(iter_result));
        return Value(result_promise);
    }

    // SuspendedYield: resume the body with a return completion so finally blocks execute.
    Value context_index_val = gen->getProperty("[[GeneratorContextIndex]]");
    size_t context_index = static_cast<size_t>(context_index_val.toNumber());

    if(context_index >= async_generator_contexts.size()) {
        gen->setProperty("[[GeneratorState]]",
                         Value(static_cast<double>(GeneratorState::Completed)));
        auto* iter_result = createIterResult(factory, return_value, true);
        Promise::resolvePromise(result_promise, Value(iter_result));
        return Value(result_promise);
    }

    auto& gen_ctx = async_generator_contexts[context_index];
    gen_ctx.exec_context.sentValue = return_value;
    gen_ctx.exec_context.isResuming = true;
    gen_ctx.exec_context.returnOnResume = true;
    gen_ctx.exec_context.throwOnResume = false;

    gen->setProperty("[[GeneratorState]]", Value(static_cast<double>(GeneratorState::Executing)));
    step(gen, context_index, result_promise, factory);

    return Value(result_promise);
}

Value AsyncGeneratorIterator::throwMethod(const CallContext& ctx, const std::vector<Value>& args) {
    if(!ctx.thisValue.isObject()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: AsyncGenerator.prototype.throw called on non-object"));
    }

    auto* gen = ctx.thisValue.getObject();
    if(!gen) {
        throw rift::core::JavaScriptException(Value("TypeError: invalid AsyncGenerator"));
    }

    auto* factory = getObjectFactory();
    Value exception = args.empty() ? Value::undefined() : args[0];

    auto* result_promise = Promise::createPromiseObject(factory);
    rift::memory::GCProtector protect_promise(result_promise, factory->getObjectManager());

    Value state_val = gen->getProperty("[[GeneratorState]]");
    auto state = static_cast<GeneratorState>(static_cast<int>(state_val.toNumber()));

    // SuspendedStart or Completed: immediately reject
    if(state == GeneratorState::SuspendedStart || state == GeneratorState::Completed) {
        gen->setProperty("[[GeneratorState]]",
                         Value(static_cast<double>(GeneratorState::Completed)));
        Promise::rejectPromise(result_promise, exception);
        return Value(result_promise);
    }

    // SuspendedYield: resume the body with a throw completion so try/catch can handle it.
    Value context_index_val = gen->getProperty("[[GeneratorContextIndex]]");
    size_t context_index = static_cast<size_t>(context_index_val.toNumber());

    if(context_index >= async_generator_contexts.size()) {
        gen->setProperty("[[GeneratorState]]",
                         Value(static_cast<double>(GeneratorState::Completed)));
        Promise::rejectPromise(result_promise, exception);
        return Value(result_promise);
    }

    auto& gen_ctx = async_generator_contexts[context_index];
    gen_ctx.exec_context.sentValue = exception;
    gen_ctx.exec_context.isResuming = true;
    gen_ctx.exec_context.throwOnResume = true;
    gen_ctx.exec_context.returnOnResume = false;

    gen->setProperty("[[GeneratorState]]", Value(static_cast<double>(GeneratorState::Executing)));
    step(gen, context_index, result_promise, factory);

    return Value(result_promise);
}

void AsyncGeneratorIterator::setupPrototype(rift::memory::ObjectFactory* factory,
                                            JSObject* /*iterator_prototype*/) {
    object_factory_ = factory;

    // 27.1.3 The %AsyncIteratorPrototype% Object
    // Async iterators have a separate prototype chain from sync iterators:
    // %AsyncGeneratorPrototype% -> %AsyncIteratorPrototype% -> %ObjectPrototype%
    // (Not inheriting from %IteratorPrototype% per spec)
    auto* async_iterator_prototype = factory->createJSObject();
    std::string async_iter_key =
        rift::core::EvaluationUtils::symbolToPropertyKey(Symbol::getAsyncIteratorId());
    auto* async_iter_self_func = factory->createJSFunction(
        [](const rift::core::CallContext& ctx, const std::vector<Value>& /*args*/) -> Value {
            return ctx.thisValue;
        });
    async_iterator_prototype->defineProperty(
        async_iter_key,
        rift::runtime::PropertyDescriptor(Value(async_iter_self_func), true, false, true));

    // 27.6.1 The %AsyncGeneratorPrototype% Object
    // Create %AsyncGeneratorPrototype% inheriting from %AsyncIteratorPrototype%
    prototype_ = factory->createJSObject(async_iterator_prototype);

    // 27.6.1.2 %AsyncGeneratorPrototype%.next ( value )
    RIFT_METHOD(prototype_, "next", 1, AsyncGeneratorIterator::next);

    // 27.6.1.3 %AsyncGeneratorPrototype%.return ( value )
    RIFT_METHOD(prototype_, "return", 1, AsyncGeneratorIterator::returnMethod);

    // 27.6.1.4 %AsyncGeneratorPrototype%.throw ( exception )
    RIFT_METHOD(prototype_, "throw", 1, AsyncGeneratorIterator::throwMethod);

    // 27.6.1.5 %AsyncGeneratorPrototype% [ @@toStringTag ]
    std::string tag_key =
        rift::core::EvaluationUtils::symbolToPropertyKey(Symbol::getToStringTagId());
    prototype_->defineProperty(
        tag_key, rift::runtime::PropertyDescriptor(Value("AsyncGenerator"), false, false, true));
}

JSObject* AsyncGeneratorIterator::getPrototype() {
    return prototype_;
}

void AsyncGeneratorIterator::setObjectFactory(rift::memory::ObjectFactory* factory) {
    object_factory_ = factory;
}

rift::memory::ObjectFactory* AsyncGeneratorIterator::getObjectFactory() {
    return object_factory_;
}

}  // namespace rift::builtins
