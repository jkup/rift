#include "rift/builtins/generator/generator_iterator.h"

#include <vector>

#include "rift/builtins/symbol/symbol.h"
#include "rift/frontend/ast/ast_node.h"
#include "rift/interpreter/engine.h"
#include "rift/interpreter/evaluation_utils.h"
#include "rift/interpreter/generator_evaluator.h"
#include "rift/interpreter/javascript_exception.h"
#include "rift/memory/gc_protector.h"

// ============================================================================
// ECMA-262 -- Generator Objects (ES2025 Section 27.5)
// @spec https://tc39.es/ecma262/#sec-generator-objects
//
// This file implements %GeneratorPrototype% (27.5.1) and the abstract
// operations GeneratorStart (27.5.3.1), GeneratorResume (27.5.3.2), and
// GeneratorResumeAbrupt (27.5.3.3).
//
// DEVIATION: The spec models generator execution contexts as first-class
// objects stored in a [[GeneratorContext]] internal slot. Rift uses a static
// vector (generator_contexts) of GeneratorContextStorage structs, indexed by
// a [[GeneratorContextIndex]] property on the generator object. This is a
// NON-STANDARD implementation detail -- the spec uses execution context
// stack push/pop and completion records, while Rift uses a
// YieldException/ReturnException mechanism to simulate suspend/resume.
//
// DEVIATION: The spec defines generator states as the string enum values
// "suspendedStart", "suspendedYield", "executing", and "completed".
// Rift uses a numeric enum (GeneratorState) cast to double and stored in
// the [[GeneratorState]] property. The semantics are equivalent.
// ============================================================================

namespace rift::builtins {

// Static member initialization
JSObject* GeneratorIterator::prototype_ = nullptr;
rift::memory::ObjectFactory* GeneratorIterator::object_factory_ = nullptr;

// NON-STANDARD: Static storage for generator execution contexts.
// The spec stores context in the [[GeneratorContext]] internal slot of each
// generator object. Rift uses a shared static vector indexed by
// [[GeneratorContextIndex]] to avoid storing C++ objects inside JSObject
// properties. This means generator contexts are never garbage collected --
// they persist for the lifetime of the process.
struct GeneratorContextStorage {
    std::shared_ptr<rift::ast::ASTNode> body;
    std::shared_ptr<Environment> env;
    rift::core::Rift* engine;
    std::vector<std::string> param_names;
    rift::core::GeneratorExecutionContext exec_context;  // Execution state
};

static std::vector<GeneratorContextStorage> generator_contexts;

// NON-STANDARD: Pre-allocate vector capacity to prevent iterator invalidation
// during yield* delegation, which may create new generators while iterating.
static bool initialized = false;
static void ensureCapacity() {
    if(!initialized) {
        generator_contexts.reserve(1000);  // Reserve space for many generators
        initialized = true;
    }
}

// Combines 27.5.3.1 GeneratorStart and OrdinaryCreateFromConstructor (27.5.2.1 step 3)
// @spec https://tc39.es/ecma262/#sec-generatorstart
//
// The spec separates generator creation into two phases:
//   1. OrdinaryCreateFromConstructor (in 27.5.2.1 [[Call]]) creates the
//      generator object with [[GeneratorState]] = undefined.
//   2. GeneratorStart (27.5.3.1) initializes [[GeneratorState]] to
//      suspendedStart and captures the execution context in [[GeneratorContext]].
//
// DEVIATION: Rift combines both phases into this single `create` method.
// Instead of capturing a real execution context, Rift stores the AST body,
// environment, and engine reference in a GeneratorContextStorage struct.
//
// 27.5.3.1 GeneratorStart ( generator, generatorBody ) spec algorithm:
//   1. Assert: The value of generator.[[GeneratorState]] is undefined.
//   2. Let genContext be the running execution context.
//   3. Set the Generator component of genContext to generator.
//   4. Let closure be a new Abstract Closure with no parameters that captures
//      generatorBody and generator and performs the following steps when called:
//      a. Let acGenContext be the running execution context.
//      b. Let acGenerator be the Generator component of acGenContext.
//      c. If generatorBody is a Parse Node, then
//         i. Let result be Completion(Evaluation of generatorBody).
//      d. Else,
//         i. Assert: generatorBody is an Abstract Closure with no parameters.
//         ii. Let result be Completion(generatorBody()).
//      e. Assert: If we return here, the generator either threw or returned.
//      f. Remove acGenContext from the execution context stack.
//      g. Set acGenerator.[[GeneratorContext]] to empty.
//      h. Set acGenerator.[[GeneratorState]] to completed.
//      i. Once a generator enters the completed state, it never leaves it.
//      j. If result is a normal completion, let resultValue be undefined.
//      k. Else if result.[[Type]] is return, let resultValue be result.[[Value]].
//      l. Else, return ? result.
//      m. Return CreateIterResultObject(resultValue, true).
//   5. Set generator.[[GeneratorContext]] to genContext.
//   6. Set generator.[[GeneratorState]] to suspendedStart.
//   7. Return unused.
JSObject* GeneratorIterator::create(rift::memory::ObjectFactory* factory,
                                    std::shared_ptr<rift::ast::ASTNode> body,
                                    std::shared_ptr<Environment> env, rift::core::Rift* engine,
                                    const std::vector<std::string>& paramNames,
                                    const std::vector<Value>& args) {
    // OrdinaryCreateFromConstructor: Create generator object with %GeneratorPrototype%
    auto* iterator = factory->createJSObject(prototype_);
    rift::memory::GCProtector protect(iterator, factory->getObjectManager());

    // DEVIATION: The spec binds parameters during FunctionDeclarationInstantiation
    // before GeneratorStart is called. Rift binds them here as part of creation.
    // Create a child environment for the generator's local scope
    auto gen_env = std::make_shared<Environment>(env);

    // Bind parameters to the generator's environment
    for(size_t i = 0; i < paramNames.size(); ++i) {
        Value arg_value = (i < args.size()) ? args[i] : Value::undefined();
        gen_env->define(paramNames[i], arg_value, runtime::VariableType::Var);
    }

    // NON-STANDARD: Ensure vector capacity to prevent reallocation during
    // yield* delegation, which may create new generators while iterating.
    ensureCapacity();

    // Step 5 (approximate): Store the generator context.
    // DEVIATION: Instead of capturing the running execution context,
    // Rift stores the AST body, environment, and engine reference in a
    // static vector. The spec's [[GeneratorContext]] is an execution context
    // object; Rift's is a struct index.
    GeneratorContextStorage ctx;
    ctx.body = body;
    ctx.env = gen_env;
    ctx.engine = engine;
    ctx.param_names = paramNames;
    // exec_context starts with default values (not started)

    size_t context_index = generator_contexts.size();
    generator_contexts.push_back(std::move(ctx));

    // Step 6: Set generator.[[GeneratorState]] to suspendedStart.
    iterator->setProperty("[[GeneratorState]]",
                          Value(static_cast<double>(GeneratorState::SuspendedStart)));

    // NON-STANDARD: [[GeneratorContextIndex]] stores the index into the
    // static generator_contexts vector.
    iterator->setProperty("[[GeneratorContextIndex]]", Value(static_cast<double>(context_index)));

    return iterator;
}

// 27.5.1.2 %GeneratorPrototype%.next ( value )
// @spec https://tc39.es/ecma262/#sec-generator.prototype.next
//
// Spec algorithm:
//   1. Return ? GeneratorResume(this value, value, empty).
//
// This method delegates to GeneratorResume (27.5.3.2), which is inlined below.
//
// 27.5.3.2 GeneratorResume ( generator, value, generatorBrand ) spec algorithm:
//   1. Let state be ? GeneratorValidate(generator, generatorBrand).
//   2. If state is completed, return CreateIterResultObject(undefined, true).
//   3. Assert: state is either suspendedStart or suspendedYield.
//   4. Let genContext be generator.[[GeneratorContext]].
//   5. Let methodContext be the running execution context.
//   6. Suspend methodContext.
//   7. Set generator.[[GeneratorState]] to executing.
//   8. Push genContext onto the execution context stack; genContext is now
//      the running execution context.
//   9. Resume the suspended evaluation of genContext using NormalCompletion(value)
//      as the result of the operation that suspended it. Let result be the
//      value returned by the resumed computation.
//   10. Assert: When we return here, genContext has already been removed from
//       the execution context stack and methodContext is the currently running
//       execution context.
//   11. Return ? result.
//
// And 27.5.3.4 GeneratorValidate ( generator, generatorBrand ):
//   1. Perform ? RequireInternalSlot(generator, [[GeneratorState]]).
//   2. Perform ? RequireInternalSlot(generator, [[GeneratorBrand]]).
//   3. If generator.[[GeneratorBrand]] is not generatorBrand, throw TypeError.
//   4. Assert: generator also has a [[GeneratorContext]] internal slot.
//   5. Let state be generator.[[GeneratorState]].
//   6. If state is executing, throw a TypeError exception.
//   7. Return state.
Value GeneratorIterator::next(const CallContext& ctx, const std::vector<Value>& args) {
    // GeneratorValidate step 1: RequireInternalSlot(generator, [[GeneratorState]])
    // SIMPLIFIED: Rift checks isObject() rather than checking for [[GeneratorState]] slot.
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
        throw rift::core::JavaScriptException(
            Value("TypeError: Generator factory not initialized"));
    }

    // GeneratorValidate step 5: Let state be generator.[[GeneratorState]].
    Value state_val = gen->getProperty("[[GeneratorState]]");
    auto state = static_cast<GeneratorState>(static_cast<int>(state_val.toNumber()));

    // 7.4.16 CreateIterResultObject ( value, done )
    // @spec https://tc39.es/ecma262/#sec-createiterresultobject
    // SIMPLIFIED: Rift creates the result object inline rather than calling
    // the abstract operation. The spec creates an OrdinaryObjectCreate(%Object.prototype%)
    // with "value" and "done" properties.
    auto* result = factory->createJSObject();
    rift::memory::GCProtector protect_result(result, factory->getObjectManager());

    // GeneratorResume step 2: If state is completed,
    // return CreateIterResultObject(undefined, true).
    if(state == GeneratorState::Completed) {
        result->setProperty("done", Value(true));
        result->setProperty("value", Value::undefined());
        return Value(result);
    }

    // GeneratorValidate step 6: If state is executing, throw a TypeError.
    if(state == GeneratorState::Executing) {
        throw rift::core::JavaScriptException(Value("TypeError: Generator is already executing"));
    }

    // GeneratorResume step 4: Let genContext be generator.[[GeneratorContext]].
    // DEVIATION: Rift retrieves the context from the static generator_contexts
    // vector via [[GeneratorContextIndex]], not from [[GeneratorContext]].
    Value context_index_val = gen->getProperty("[[GeneratorContextIndex]]");
    size_t context_index = static_cast<size_t>(context_index_val.toNumber());

    // NON-STANDARD: Bounds check on the context index. If out of range,
    // treat the generator as completed (defensive guard).
    if(context_index >= generator_contexts.size()) {
        gen->setProperty("[[GeneratorState]]",
                         Value(static_cast<double>(GeneratorState::Completed)));
        result->setProperty("done", Value(true));
        result->setProperty("value", Value::undefined());
        return Value(result);
    }

    auto& gen_ctx = generator_contexts[context_index];

    // GeneratorResume step 9: Resume using NormalCompletion(value).
    // DEVIATION: The spec passes `value` as a NormalCompletion to the suspended
    // evaluation. Rift stores it as sentValue on the execution context, which
    // the GeneratorEvaluator reads when resuming at a yield point.
    Value sent_value = args.empty() ? Value::undefined() : args[0];
    gen_ctx.exec_context.sentValue = sent_value;

    // Set up resumption state based on whether this is the first call or a
    // resumption after yield. The spec handles this implicitly via execution
    // context suspension/resumption.
    if(state == GeneratorState::SuspendedYield) {
        gen_ctx.exec_context.isResuming = true;
    } else {
        gen_ctx.exec_context.isResuming = false;
        gen_ctx.exec_context.currentYieldId = -1;
        gen_ctx.exec_context.resumeStatementIndex = 0;
    }

    // GeneratorResume step 7: Set generator.[[GeneratorState]] to executing.
    gen->setProperty("[[GeneratorState]]", Value(static_cast<double>(GeneratorState::Executing)));

    // GeneratorResume steps 8-9: Push genContext and resume evaluation.
    // DEVIATION: The spec pushes the generator's execution context onto the
    // stack and resumes it. Rift calls GeneratorEvaluator::execute() which
    // re-evaluates the body AST, skipping to the saved yield point. Suspension
    // is modeled via YieldException (for yield) and ReturnException (for return),
    // rather than the spec's completion records.
    try {
        // GeneratorStart step 4.c.i: Let result be Evaluation of generatorBody.
        Value final_value = rift::core::GeneratorEvaluator::execute(
            gen_ctx.body, gen_ctx.env, gen_ctx.engine, gen_ctx.exec_context);

        // GeneratorStart step 4.h: Set generator.[[GeneratorState]] to completed.
        // GeneratorStart step 4.j: Normal completion -- resultValue is undefined.
        // DEVIATION: Rift uses the actual return value of the body rather than
        // undefined for normal completion. This matches spec behavior since a
        // generator body without an explicit return evaluates to undefined.
        gen->setProperty("[[GeneratorState]]",
                         Value(static_cast<double>(GeneratorState::Completed)));
        // GeneratorStart step 4.m: Return CreateIterResultObject(resultValue, true).
        result->setProperty("done", Value(true));
        result->setProperty("value", final_value);
        return Value(result);

    } catch(const rift::core::YieldException& e) {
        // 27.5.3.5 GeneratorYield ( iterNextObj )
        // @spec https://tc39.es/ecma262/#sec-generatoryield
        // DEVIATION: The spec suspends the execution context and returns the
        // yielded value via GeneratorYield. Rift throws a YieldException to
        // unwind the call stack back to next(), simulating suspension.
        gen_ctx.exec_context.currentYieldId = e.getYieldPointId();
        gen_ctx.exec_context.resumeStatementIndex = e.getStatementIndex();

        // GeneratorYield step 9: Set generator.[[GeneratorState]] to suspendedYield.
        gen->setProperty("[[GeneratorState]]",
                         Value(static_cast<double>(GeneratorState::SuspendedYield)));
        // GeneratorYield step 11: Return NormalCompletion(iterNextObj).
        // The yielded value becomes the "value" of the iterator result.
        result->setProperty("done", Value(false));
        result->setProperty("value", e.getValue());
        return Value(result);

    } catch(const rift::core::ReturnException& e) {
        // GeneratorStart step 4.k: result.[[Type]] is return,
        // let resultValue be result.[[Value]].
        // DEVIATION: The spec uses a return completion record. Rift throws
        // a ReturnException which carries the return value.
        gen->setProperty("[[GeneratorState]]",
                         Value(static_cast<double>(GeneratorState::Completed)));
        // GeneratorStart step 4.m: Return CreateIterResultObject(resultValue, true).
        result->setProperty("done", Value(true));
        result->setProperty("value", e.getValue());
        return Value(result);

    } catch(const rift::core::JavaScriptException&) {
        // GeneratorStart step 4.l: result is an abrupt completion (throw),
        // return ? result (re-throw to the caller).
        gen->setProperty("[[GeneratorState]]",
                         Value(static_cast<double>(GeneratorState::Completed)));
        throw;  // Re-throw to propagate the error

    } catch(const std::exception&) {
        // NON-STANDARD: Catch C++ exceptions that aren't JavaScript errors.
        // The spec only deals with JavaScript completion records.
        gen->setProperty("[[GeneratorState]]",
                         Value(static_cast<double>(GeneratorState::Completed)));
        throw;
    }
}

// 27.5.1.3 %GeneratorPrototype%.return ( value )
// @spec https://tc39.es/ecma262/#sec-generator.prototype.return
//
// Spec algorithm:
//   1. Let g be the this value.
//   2. Let C be Completion Record { [[Type]]: return, [[Value]]: value,
//      [[Target]]: empty }.
//   3. Return ? GeneratorResumeAbrupt(g, C, empty).
//
// This delegates to GeneratorResumeAbrupt (27.5.3.3):
//   1. Let state be ? GeneratorValidate(generator, generatorBrand).
//   2. If state is suspendedStart, then
//      a. Set generator.[[GeneratorState]] to completed.
//      b. NOTE: Once a generator enters completed state, it never leaves it.
//      c. Set state to completed.
//   3. If state is completed, then
//      a. If abruptCompletion.[[Type]] is return, then
//         i. Return CreateIterResultObject(abruptCompletion.[[Value]], true).
//      b. Return ? abruptCompletion.
//   4. Assert: state is suspendedYield.
//   5. Let genContext be generator.[[GeneratorContext]].
//   6. Let methodContext be the running execution context.
//   7. Suspend methodContext.
//   8. Set generator.[[GeneratorState]] to executing.
//   9. Push genContext onto the execution context stack.
//   10. Resume the suspended evaluation of genContext using abruptCompletion
//       as the result of the operation that suspended it. Let result be the
//       completion record returned by the resumed computation.
//   11. Assert: When we return here, genContext has already been removed.
//   12. Return ? result.
//
// INCOMPLETE: Steps 4-12 (resuming at a suspended yield point with a return
// completion) are not implemented. When the generator is in suspendedYield
// state, the spec resumes execution at the yield point with a return
// completion, which allows try...finally blocks to execute their finally
// clauses. Rift currently skips directly to completed state.
Value GeneratorIterator::returnMethod(const CallContext& ctx, const std::vector<Value>& args) {
    // GeneratorValidate step 1: RequireInternalSlot(generator, [[GeneratorState]])
    if(!ctx.thisValue.isObject()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Generator.prototype.return called on non-object"));
    }

    auto* gen = ctx.thisValue.getObject();
    if(!gen) {
        throw rift::core::JavaScriptException(Value("TypeError: invalid Generator"));
    }

    auto* factory = getObjectFactory();

    // GeneratorResumeAbrupt: Let C be { [[Type]]: return, [[Value]]: value }.
    Value return_value = args.empty() ? Value::undefined() : args[0];

    // GeneratorValidate step 5: Let state be generator.[[GeneratorState]].
    Value state_val = gen->getProperty("[[GeneratorState]]");
    auto state = static_cast<GeneratorState>(static_cast<int>(state_val.toNumber()));

    auto* result = factory->createJSObject();
    rift::memory::GCProtector protect_result(result, factory->getObjectManager());

    // GeneratorResumeAbrupt step 3: If state is completed, then
    //   step 3a: abruptCompletion.[[Type]] is return, so
    //   step 3a.i: Return CreateIterResultObject(value, true).
    if(state == GeneratorState::Completed) {
        result->setProperty("done", Value(true));
        result->setProperty("value", return_value);
        return Value(result);
    }

    // GeneratorResumeAbrupt step 2: If state is suspendedStart, then
    //   step 2a: Set generator.[[GeneratorState]] to completed.
    // Also handles suspendedYield (falls through to step 3a.i).
    // INCOMPLETE: For suspendedYield, the spec resumes execution with a return
    // completion (steps 4-12) to allow finally blocks to run. Rift skips
    // straight to completed. TODO: Phase 3b -- resume at yield with return
    // completion to support try...finally in generators.
    gen->setProperty("[[GeneratorState]]", Value(static_cast<double>(GeneratorState::Completed)));

    // GeneratorResumeAbrupt step 3a.i: Return CreateIterResultObject(value, true).
    result->setProperty("done", Value(true));
    result->setProperty("value", return_value);
    return Value(result);
}

// 27.5.1.4 %GeneratorPrototype%.throw ( exception )
// @spec https://tc39.es/ecma262/#sec-generator.prototype.throw
//
// Spec algorithm:
//   1. Let g be the this value.
//   2. Let C be ThrowCompletion(exception).
//   3. Return ? GeneratorResumeAbrupt(g, C, empty).
//
// This delegates to GeneratorResumeAbrupt (27.5.3.3):
//   1. Let state be ? GeneratorValidate(generator, generatorBrand).
//   2. If state is suspendedStart, then
//      a. Set generator.[[GeneratorState]] to completed.
//      b. Set state to completed.
//   3. If state is completed, then
//      a. If abruptCompletion.[[Type]] is return, then
//         i. Return CreateIterResultObject(abruptCompletion.[[Value]], true).
//      b. Return ? abruptCompletion.
//         (For throw: this re-throws the exception.)
//   4. Assert: state is suspendedYield.
//   5. Let genContext be generator.[[GeneratorContext]].
//   6-9. (Set up execution context, set state to executing, push genContext.)
//   10. Resume the suspended evaluation of genContext using abruptCompletion
//       (a throw completion) as the result of the operation that suspended it.
//       Let result be the completion record returned by the resumed computation.
//   11. Assert: genContext has been removed from the stack.
//   12. Return ? result.
//
// INCOMPLETE: Steps 4-12 (resuming at a suspended yield point with a throw
// completion) are not implemented. When the generator is in suspendedYield
// state, the spec resumes execution at the yield point with a throw
// completion, which allows try...catch blocks to catch the exception and
// continue execution. Rift currently always transitions to completed state
// and re-throws. TODO: Phase 3b -- resume at yield with throw completion
// to support try...catch in generators.
Value GeneratorIterator::throwMethod(const CallContext& ctx, const std::vector<Value>& args) {
    // GeneratorValidate step 1: RequireInternalSlot(generator, [[GeneratorState]])
    if(!ctx.thisValue.isObject()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Generator.prototype.throw called on non-object"));
    }

    auto* gen = ctx.thisValue.getObject();
    if(!gen) {
        throw rift::core::JavaScriptException(Value("TypeError: invalid Generator"));
    }

    // GeneratorResumeAbrupt: Let C be ThrowCompletion(exception).
    Value exception = args.empty() ? Value::undefined() : args[0];

    // GeneratorValidate step 5: Let state be generator.[[GeneratorState]].
    Value state_val = gen->getProperty("[[GeneratorState]]");
    auto state = static_cast<GeneratorState>(static_cast<int>(state_val.toNumber()));

    // GeneratorResumeAbrupt step 2: If state is suspendedStart, set to completed.
    // GeneratorResumeAbrupt step 3: If state is completed, then
    //   step 3b: abruptCompletion.[[Type]] is throw, so return ? abruptCompletion
    //   (re-throw the exception).
    if(state == GeneratorState::SuspendedStart || state == GeneratorState::Completed) {
        gen->setProperty("[[GeneratorState]]",
                         Value(static_cast<double>(GeneratorState::Completed)));
        throw rift::core::JavaScriptException(exception);
    }

    // INCOMPLETE: Steps 4-12 -- should resume at the suspended yield point
    // with the throw completion, allowing try...catch to handle it.
    // Currently always transitions to completed and re-throws.
    // TODO: Phase 3b -- resume at yield with throw completion.
    gen->setProperty("[[GeneratorState]]", Value(static_cast<double>(GeneratorState::Completed)));
    throw rift::core::JavaScriptException(exception);
}

// 27.5.1 Properties of the %GeneratorPrototype% Object
// @spec https://tc39.es/ecma262/#sec-properties-of-generator-prototype
//
// The %GeneratorPrototype% object:
//   - is %GeneratorFunction.prototype.prototype%
//   - is an ordinary object
//   - is not a Generator instance and does not have [[GeneratorState]] or
//     [[GeneratorContext]] internal slots
//   - has a [[Prototype]] internal slot whose value is %IteratorPrototype%
void GeneratorIterator::setupPrototype(rift::memory::ObjectFactory* factory,
                                       JSObject* iterator_prototype) {
    object_factory_ = factory;

    // Create %GeneratorPrototype% inheriting from %IteratorPrototype%
    // Per spec: [[Prototype]] is %IteratorPrototype% (27.1.2)
    prototype_ = factory->createJSObject(iterator_prototype);

    // 27.5.1.2 %GeneratorPrototype%.next ( value )
    // @spec https://tc39.es/ecma262/#sec-generator.prototype.next
    auto* next_func = factory->createJSFunction(GeneratorIterator::next);
    prototype_->setProperty("next", Value(next_func));

    // 27.5.1.3 %GeneratorPrototype%.return ( value )
    // @spec https://tc39.es/ecma262/#sec-generator.prototype.return
    auto* return_func = factory->createJSFunction(GeneratorIterator::returnMethod);
    prototype_->setProperty("return", Value(return_func));

    // 27.5.1.4 %GeneratorPrototype%.throw ( exception )
    // @spec https://tc39.es/ecma262/#sec-generator.prototype.throw
    auto* throw_func = factory->createJSFunction(GeneratorIterator::throwMethod);
    prototype_->setProperty("throw", Value(throw_func));

    // 27.5.1.5 %GeneratorPrototype% [ @@toStringTag ]
    // @spec https://tc39.es/ecma262/#sec-generator.prototype-@@tostringtag
    // The initial value is the String value "Generator".
    // This property has the attributes { [[Writable]]: false,
    // [[Enumerable]]: false, [[Configurable]]: true }.
    // INCOMPLETE: Property attributes are not set per spec. Rift sets it as a
    // regular writable, enumerable property rather than non-writable,
    // non-enumerable, configurable.
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
