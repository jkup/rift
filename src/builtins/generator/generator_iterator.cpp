#include "rift/builtins/generator/generator_iterator.h"

#include <vector>

#include "rift/builtins/symbol/symbol.h"
#include "rift/core/engine/engine.h"
#include "rift/core/engine/evaluation_utils.h"
#include "rift/core/engine/generator_evaluator.h"
#include "rift/core/engine/javascript_exception.h"
#include "rift/frontend/ast/ast_node.h"
#include "rift/memory/gc_protector.h"

namespace rift::builtins {

// Static member initialization
JSObject* GeneratorIterator::prototype_ = nullptr;
rift::memory::ObjectFactory* GeneratorIterator::object_factory_ = nullptr;

// Storage for generator contexts (body AST and environment)
// Each generator stores an index into these vectors
struct GeneratorContextStorage {
    std::shared_ptr<rift::ast::ASTNode> body;
    std::shared_ptr<Environment> env;
    rift::core::Rift* engine;
    std::vector<std::string> param_names;
    rift::core::GeneratorExecutionContext exec_context;  // Execution state
};

static std::vector<GeneratorContextStorage> generator_contexts;

// Reserve space to prevent reallocation during yield* delegation
static bool initialized = false;
static void ensureCapacity() {
    if(!initialized) {
        generator_contexts.reserve(1000);  // Reserve space for many generators
        initialized = true;
    }
}

JSObject* GeneratorIterator::create(rift::memory::ObjectFactory* factory,
                                    std::shared_ptr<rift::ast::ASTNode> body,
                                    std::shared_ptr<Environment> env, rift::core::Rift* engine,
                                    const std::vector<std::string>& paramNames,
                                    const std::vector<Value>& args) {
    // Create generator iterator object inheriting from %GeneratorPrototype%
    auto* iterator = factory->createJSObject(prototype_);
    rift::memory::GCProtector protect(iterator, factory->getObjectManager());

    // Create a child environment for the generator's local scope
    auto gen_env = std::make_shared<Environment>(env);

    // Bind parameters to the generator's environment
    for(size_t i = 0; i < paramNames.size(); ++i) {
        Value arg_value = (i < args.size()) ? args[i] : Value::undefined();
        gen_env->define(paramNames[i], arg_value, runtime::VariableType::Var);
    }

    // Ensure vector capacity to prevent reallocation during yield* delegation
    ensureCapacity();

    // Store the generator context
    GeneratorContextStorage ctx;
    ctx.body = body;
    ctx.env = gen_env;
    ctx.engine = engine;
    ctx.param_names = paramNames;
    // exec_context starts with default values (not started)

    size_t context_index = generator_contexts.size();
    generator_contexts.push_back(std::move(ctx));

    // Store internal slots
    // [[GeneratorState]] - starts as SuspendedStart
    iterator->setProperty("[[GeneratorState]]",
                          Value(static_cast<double>(GeneratorState::SuspendedStart)));

    // [[GeneratorContextIndex]] - index into generator_contexts vector
    iterator->setProperty("[[GeneratorContextIndex]]", Value(static_cast<double>(context_index)));

    return iterator;
}

Value GeneratorIterator::next(const CallContext& ctx, const std::vector<Value>& args) {
    // Get the generator object
    if(!ctx.thisValue.isObject()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Generator.prototype.next called on non-object"));
    }

    auto* gen = ctx.thisValue.getObject();
    if(!gen) {
        throw rift::core::JavaScriptException(Value("TypeError: invalid Generator"));
    }

    auto* factory = getObjectFactory();
    if(!factory) {
        throw rift::core::JavaScriptException(Value("TypeError: Generator factory not initialized"));
    }

    // Get current state
    Value state_val = gen->getProperty("[[GeneratorState]]");
    auto state = static_cast<GeneratorState>(static_cast<int>(state_val.toNumber()));

    // Create result object
    auto* result = factory->createJSObject();
    rift::memory::GCProtector protect_result(result, factory->getObjectManager());

    // Handle completed state
    if(state == GeneratorState::Completed) {
        result->setProperty("done", Value(true));
        result->setProperty("value", Value::undefined());
        return Value(result);
    }

    // Handle executing state (re-entrant call - not allowed)
    if(state == GeneratorState::Executing) {
        throw rift::core::JavaScriptException(Value("TypeError: Generator is already executing"));
    }

    // Get the generator context
    Value context_index_val = gen->getProperty("[[GeneratorContextIndex]]");
    size_t context_index = static_cast<size_t>(context_index_val.toNumber());

    if(context_index >= generator_contexts.size()) {
        gen->setProperty("[[GeneratorState]]",
                         Value(static_cast<double>(GeneratorState::Completed)));
        result->setProperty("done", Value(true));
        result->setProperty("value", Value::undefined());
        return Value(result);
    }

    auto& gen_ctx = generator_contexts[context_index];

    // Store the sent value (argument to next())
    Value sent_value = args.empty() ? Value::undefined() : args[0];
    gen_ctx.exec_context.sentValue = sent_value;

    // Set up resumption state
    if(state == GeneratorState::SuspendedYield) {
        gen_ctx.exec_context.isResuming = true;
    } else {
        gen_ctx.exec_context.isResuming = false;
        gen_ctx.exec_context.currentYieldId = -1;
        gen_ctx.exec_context.resumeStatementIndex = 0;
    }

    // Mark as executing
    gen->setProperty("[[GeneratorState]]", Value(static_cast<double>(GeneratorState::Executing)));

    try {
        // Execute the generator body
        Value final_value =
            rift::core::GeneratorEvaluator::execute(gen_ctx.body, gen_ctx.env, gen_ctx.engine,
                                                    gen_ctx.exec_context);

        // Generator completed normally (no more yields)
        gen->setProperty("[[GeneratorState]]",
                         Value(static_cast<double>(GeneratorState::Completed)));
        result->setProperty("done", Value(true));
        result->setProperty("value", final_value);
        return Value(result);

    } catch(const rift::core::YieldException& e) {
        // Generator yielded
        gen_ctx.exec_context.currentYieldId = e.getYieldPointId();
        gen_ctx.exec_context.resumeStatementIndex = e.getStatementIndex();

        gen->setProperty("[[GeneratorState]]",
                         Value(static_cast<double>(GeneratorState::SuspendedYield)));
        result->setProperty("done", Value(false));
        result->setProperty("value", e.getValue());
        return Value(result);

    } catch(const rift::core::ReturnException& e) {
        // Generator returned explicitly
        gen->setProperty("[[GeneratorState]]",
                         Value(static_cast<double>(GeneratorState::Completed)));
        result->setProperty("done", Value(true));
        result->setProperty("value", e.getValue());
        return Value(result);

    } catch(const rift::core::JavaScriptException&) {
        // Generator threw an exception
        gen->setProperty("[[GeneratorState]]",
                         Value(static_cast<double>(GeneratorState::Completed)));
        throw;  // Re-throw to propagate the error

    } catch(const std::exception&) {
        // Other error
        gen->setProperty("[[GeneratorState]]",
                         Value(static_cast<double>(GeneratorState::Completed)));
        throw;
    }
}

Value GeneratorIterator::returnMethod(const CallContext& ctx, const std::vector<Value>& args) {
    // Get the generator object
    if(!ctx.thisValue.isObject()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Generator.prototype.return called on non-object"));
    }

    auto* gen = ctx.thisValue.getObject();
    if(!gen) {
        throw rift::core::JavaScriptException(Value("TypeError: invalid Generator"));
    }

    auto* factory = getObjectFactory();

    // Get the return value
    Value return_value = args.empty() ? Value::undefined() : args[0];

    // Get current state
    Value state_val = gen->getProperty("[[GeneratorState]]");
    auto state = static_cast<GeneratorState>(static_cast<int>(state_val.toNumber()));

    // Create result object
    auto* result = factory->createJSObject();
    rift::memory::GCProtector protect_result(result, factory->getObjectManager());

    // If already completed, just return with the value
    if(state == GeneratorState::Completed) {
        result->setProperty("done", Value(true));
        result->setProperty("value", return_value);
        return Value(result);
    }

    // Mark as completed
    gen->setProperty("[[GeneratorState]]", Value(static_cast<double>(GeneratorState::Completed)));

    // TODO: In Phase 3b, if we're in a try block with finally, run the finally
    result->setProperty("done", Value(true));
    result->setProperty("value", return_value);
    return Value(result);
}

Value GeneratorIterator::throwMethod(const CallContext& ctx, const std::vector<Value>& args) {
    // Get the generator object
    if(!ctx.thisValue.isObject()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Generator.prototype.throw called on non-object"));
    }

    auto* gen = ctx.thisValue.getObject();
    if(!gen) {
        throw rift::core::JavaScriptException(Value("TypeError: invalid Generator"));
    }

    // Get the exception value
    Value exception = args.empty() ? Value::undefined() : args[0];

    // Get current state
    Value state_val = gen->getProperty("[[GeneratorState]]");
    auto state = static_cast<GeneratorState>(static_cast<int>(state_val.toNumber()));

    // If not started or completed, throw immediately
    if(state == GeneratorState::SuspendedStart || state == GeneratorState::Completed) {
        gen->setProperty("[[GeneratorState]]",
                         Value(static_cast<double>(GeneratorState::Completed)));
        throw rift::core::JavaScriptException(exception);
    }

    // TODO: In Phase 3b, throw at the current yield point and let try/catch handle it
    gen->setProperty("[[GeneratorState]]", Value(static_cast<double>(GeneratorState::Completed)));
    throw rift::core::JavaScriptException(exception);
}

void GeneratorIterator::setupPrototype(rift::memory::ObjectFactory* factory,
                                       JSObject* iterator_prototype) {
    object_factory_ = factory;

    // Create %GeneratorPrototype% inheriting from %IteratorPrototype%
    prototype_ = factory->createJSObject(iterator_prototype);

    // Add next() method
    auto* next_func = factory->createJSFunction(GeneratorIterator::next);
    prototype_->setProperty("next", Value(next_func));

    // Add return() method
    auto* return_func = factory->createJSFunction(GeneratorIterator::returnMethod);
    prototype_->setProperty("return", Value(return_func));

    // Add throw() method
    auto* throw_func = factory->createJSFunction(GeneratorIterator::throwMethod);
    prototype_->setProperty("throw", Value(throw_func));

    // Add [Symbol.toStringTag] = "Generator"
    std::string tag_key =
        rift::core::EvaluationUtils::symbolToPropertyKey(Symbol::getToStringTagId());
    prototype_->setProperty(tag_key, Value("Generator"));
}

JSObject* GeneratorIterator::getPrototype() {
    return prototype_;
}

void GeneratorIterator::setObjectFactory(rift::memory::ObjectFactory* factory) {
    object_factory_ = factory;
}

rift::memory::ObjectFactory* GeneratorIterator::getObjectFactory() {
    return object_factory_;
}

}  // namespace rift::builtins
