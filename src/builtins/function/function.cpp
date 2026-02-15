#include "rift/builtins/function/function.h"

#include <algorithm>

#include "rift/core/engine/builtin_manager.h"
#include "rift/core/engine/call_context.h"
#include "rift/core/engine/engine.h"
#include "rift/core/engine/javascript_exception.h"
#include "rift/frontend/lexer/lexer.h"
#include "rift/frontend/parser/parser.h"
#include "rift/memory/gc_protector.h"

// ============================================================================
// ECMA-262 -- Function Objects (20.2)
// @spec https://tc39.es/ecma262/#sec-function-objects
// Covers: Function constructor, Function.prototype.apply, .bind, .call,
//         .toString
// ============================================================================

namespace rift::builtins {

using rift::core::CallContext;
using rift::core::CallType;
using rift::core::JavaScriptException;

rift::core::Rift* Function::engine_ = nullptr;

// 20.2.2 Properties of the Function Constructor
// @spec https://tc39.es/ecma262/#sec-properties-of-the-function-constructor
void Function::setupStaticMethods(JSObject* constructor, rift::memory::ObjectFactory* factory) {
    // Function has no static methods in standard ECMAScript
}

// 20.2.3 Properties of the Function Prototype Object
// @spec https://tc39.es/ecma262/#sec-properties-of-the-function-prototype-object
void Function::setupPrototypeMethods(JSObject* prototype, rift::memory::ObjectFactory* factory) {
    RIFT_METHOD(prototype, "call", Function::call);     // 20.2.3.3
    RIFT_METHOD(prototype, "apply", Function::apply);   // 20.2.3.1
    RIFT_METHOD(prototype, "bind", Function::bind);     // 20.2.3.2
    RIFT_METHOD(prototype, "toString", Function::toString);  // 20.2.3.5
    // TODO: 20.2.3.6 Function.prototype[@@hasInstance] ( V )
    // @spec https://tc39.es/ecma262/#sec-function.prototype-@@hasinstance
    // Not yet implemented.
}

// 20.2.1.1 Function ( ...parameterArgs, bodyArg )
// @spec https://tc39.es/ecma262/#sec-function-p1-p2-pn-body
// The spec delegates to the abstract operation CreateDynamicFunction (20.2.1.1.1).
// SIMPLIFIED: Rift constructs a source string and parses it directly rather than
// implementing the full CreateDynamicFunction abstract operation, which includes
// detailed parameter validation, goal symbol checks, and environment setup.
Value Function::constructor(const CallContext& ctx, const std::vector<Value>& args) {
    if(!engine_) {
        throw JavaScriptException(Value("TypeError: Function constructor engine not initialized"));
    }

    // Per CreateDynamicFunction (20.2.1.1.1):
    // Steps 8-13: Build the parameter and body strings from arguments.
    // - Zero args: function anonymous() {}
    // - One arg: it's the body, no params
    // - Multiple args: all except last are param names, last is body
    std::string params_str;
    std::string body_str;

    if(args.empty()) {
        // Step 9: If argCount = 0, let P be "" and bodyString be "".
        params_str = "";
        body_str = "";
    } else if(args.size() == 1) {
        // Step 10: Else if argCount = 1, let P be "" and bodyString be args[0].
        body_str = args[0].toString();
    } else {
        // Step 11: Else (argCount > 1), join all but last as parameters.
        // Step 11.a-d: Let P be the string-concatenation of ToString of each
        // parameter argument, separated by ",".
        for(size_t i = 0; i < args.size() - 1; ++i) {
            if(i > 0) {
                params_str += ",";
            }
            params_str += args[i].toString();
        }
        // Step 11.e: Let bodyString be ? ToString(args[argCount - 1]).
        body_str = args[args.size() - 1].toString();
    }

    // Step 17: Let sourceString be the string-concatenation of "function anonymous("
    // + P + "\n) {\n" + bodyString + "\n}".
    // DEVIATION: Rift uses spaces instead of newlines in the source string construction.
    std::string source = "function anonymous(" + params_str + ") { " + body_str + " }";

    try {
        // Steps 18-19: Parse the source text. If parsing fails, throw a SyntaxError.
        // SIMPLIFIED: Rift uses its own lexer/parser pipeline instead of the spec's
        // ParseText abstract operation with the Function goal symbol.
        rift::frontend::Lexer lexer(source);
        auto tokens = lexer.tokenize();
        rift::frontend::Parser parser(tokens);
        auto ast = parser.parse();

        // Steps 28-33: Create the function object in the global scope.
        // SIMPLIFIED: Rift evaluates the parsed AST in the global environment
        // rather than using OrdinaryFunctionCreate + related abstract operations.
        // The spec creates the function with the global environment as its scope,
        // which matches Rift's behavior here.
        auto global_env = engine_->getGlobalEnvironment();
        Value result = engine_->evaluate(ast, global_env);

        // The parsed program contains a FunctionDeclaration for "anonymous"
        // Retrieve it from the environment
        if(global_env->has("anonymous")) {
            Value func_val = global_env->get("anonymous");
            // Clean up the global binding
            return func_val;
        }

        return result;
    } catch(const JavaScriptException&) {
        throw;
    } catch(const std::exception& e) {
        // Step 19/22: If the parse fails, throw a SyntaxError.
        throw JavaScriptException(Value(std::string("SyntaxError: ") + e.what()));
    }
}

// 20.2.3.3 Function.prototype.call ( thisArg, ...args )
// @spec https://tc39.es/ecma262/#sec-function.prototype.call
Value Function::call(const CallContext& ctx, const std::vector<Value>& args) {
    // 1. Let func be the this value.
    // 2. If IsCallable(func) is false, throw a TypeError exception.
    if(!ctx.thisValue.isFunction()) {
        throw JavaScriptException(
            Value("TypeError: Function.prototype.call called on non-function"));
    }

    auto* func = dynamic_cast<JSFunction*>(ctx.thisValue.getObject());
    if(!func) {
        throw JavaScriptException(
            Value("TypeError: Function.prototype.call called on non-function"));
    }

    // (thisArg is the first element of args; ...args are the remaining elements)
    Value thisArg = args.empty() ? Value::undefined() : args[0];

    // 3. Perform PrepareForTailCall().
    // INCOMPLETE: Tail call optimization (PrepareForTailCall) not implemented.

    // 4. Return ? Call(func, thisArg, args).
    std::vector<Value> callArgs;
    for(size_t i = 1; i < args.size(); ++i) {
        callArgs.push_back(args[i]);
    }

    CallContext callCtx(CallType::Function, thisArg);
    return func->call(callCtx, callArgs);
}

// 20.2.3.1 Function.prototype.apply ( thisArg, argArray )
// @spec https://tc39.es/ecma262/#sec-function.prototype.apply
Value Function::apply(const CallContext& ctx, const std::vector<Value>& args) {
    // 1. Let func be the this value.
    // 2. If IsCallable(func) is false, throw a TypeError exception.
    if(!ctx.thisValue.isFunction()) {
        throw JavaScriptException(
            Value("TypeError: Function.prototype.apply called on non-function"));
    }

    auto* func = dynamic_cast<JSFunction*>(ctx.thisValue.getObject());
    if(!func) {
        throw JavaScriptException(
            Value("TypeError: Function.prototype.apply called on non-function"));
    }

    Value thisArg = args.empty() ? Value::undefined() : args[0];

    // 3. If argArray is undefined or null, then
    //    a. Perform PrepareForTailCall().
    //    b. Return ? Call(func, thisArg).
    // INCOMPLETE: Tail call optimization (PrepareForTailCall) not implemented.
    std::vector<Value> callArgs;
    if(args.size() >= 2 && !args[1].isNull() && !args[1].isUndefined()) {
        // 4. Let argList be ? CreateListFromArrayLike(argArray).
        // SIMPLIFIED: Rift inlines CreateListFromArrayLike (7.3.18) here. The spec's
        // CreateListFromArrayLike also validates element types against an optional
        // elementTypes parameter; Rift accepts all value types.
        Value argsArray = args[1];
        if(!argsArray.isObject()) {
            throw JavaScriptException(
                Value("TypeError: CreateListFromArrayLike called on non-object"));
        }

        auto* argsObj = argsArray.getObject();
        // CreateListFromArrayLike step 3: Let len be ? LengthOfArrayLike(obj).
        Value lengthVal = argsObj->getProperty("length");
        if(lengthVal.isNumber()) {
            size_t length = static_cast<size_t>(lengthVal.toNumber());
            callArgs.reserve(length);
            // CreateListFromArrayLike step 5: Repeat, while index < len
            for(size_t i = 0; i < length; ++i) {
                // a. Let indexName be ! ToString(index).
                // b. Let next be ? Get(obj, indexName).
                // c. Append next to the end of list.
                callArgs.push_back(argsObj->getProperty(std::to_string(i)));
            }
        }
    }

    // 5. Perform PrepareForTailCall().
    // INCOMPLETE: Tail call optimization (PrepareForTailCall) not implemented.

    // 6. Return ? Call(func, thisArg, argList).
    CallContext callCtx(CallType::Function, thisArg);
    return func->call(callCtx, callArgs);
}

// 20.2.3.2 Function.prototype.bind ( thisArg, ...args )
// @spec https://tc39.es/ecma262/#sec-function.prototype.bind
Value Function::bind(const CallContext& ctx, const std::vector<Value>& args) {
    // 1. Let Target be the this value.
    // 2. If IsCallable(Target) is false, throw a TypeError exception.
    if(!ctx.thisValue.isFunction()) {
        throw JavaScriptException(
            Value("TypeError: Function.prototype.bind called on non-function"));
    }

    auto* targetFunc = dynamic_cast<JSFunction*>(ctx.thisValue.getObject());
    if(!targetFunc) {
        throw JavaScriptException(
            Value("TypeError: Function.prototype.bind called on non-function"));
    }

    // 3. Let args be the List consisting of all argument values provided
    //    after thisArg, in order.
    Value boundThis = args.empty() ? Value::undefined() : args[0];

    std::vector<Value> boundArgs;
    for(size_t i = 1; i < args.size(); ++i) {
        boundArgs.push_back(args[i]);
    }

    // 4. Let F be ? BoundFunctionCreate(Target, thisArg, args).
    // SIMPLIFIED: Rift does not create a true bound function exotic object
    // (10.4.1) with [[BoundTargetFunction]], [[BoundThis]], and [[BoundArguments]]
    // internal slots. Instead, it uses a closure-based JSFunction that captures
    // the target, thisArg, and args. This means the bound function is not
    // distinguishable from a regular function via internal slot inspection.
    auto* factory = getObjectFactory();

    // Capture target and bound values in the lambda
    auto* boundFunc = factory->createJSFunction(
        [targetFunc, boundThis, boundArgs](const CallContext& callCtx,
                                           const std::vector<Value>& callArgs) -> Value {
            // 10.4.1.1 [[Call]] ( thisArgument, argumentsList )
            // Step 3: Let args be the list-concatenation of bound.[[BoundArguments]]
            //         and argumentsList.
            std::vector<Value> combinedArgs;
            combinedArgs.reserve(boundArgs.size() + callArgs.size());
            combinedArgs.insert(combinedArgs.end(), boundArgs.begin(), boundArgs.end());
            combinedArgs.insert(combinedArgs.end(), callArgs.begin(), callArgs.end());

            // 10.4.1.1 step 2: Let boundThis be bound.[[BoundThis]].
            // 10.4.1.2 [[Construct]]: When called as constructor, this is the
            // newly created object, not the bound this.
            Value effectiveThis =
                (callCtx.type == CallType::Constructor) ? callCtx.thisValue : boundThis;

            // Step 4: Return ? Call(bound.[[BoundTargetFunction]], boundThis, args).
            CallContext boundCtx(callCtx.type, effectiveThis);
            return targetFunc->call(boundCtx, combinedArgs);
        });

    // Protect from GC during setup
    rift::memory::GCProtector protect(boundFunc, factory->getObjectManager());

    // Step 5 (implicit): Set F.[[Prototype]] to Function.prototype.
    // (In the spec, BoundFunctionCreate sets the prototype to the target's prototype;
    //  Rift always uses Function.prototype.)
    // DEVIATION: The spec uses target.[[GetPrototypeOf]]() for the bound function's
    // prototype. Rift unconditionally uses Function.prototype.
    auto* funcProto = rift::core::BuiltinManager::getFunctionPrototype();
    if(funcProto) {
        boundFunc->setPrototype(funcProto);
    }

    // 5. Let argCount be the number of elements in args.
    // 6. Let L be 0.
    // 7. Let targetHasLength be ? HasOwnProperty(Target, "length").
    // 8. If targetHasLength is true, then
    //    a. Let targetLen be ? Get(Target, "length").
    //    b. If targetLen is a Number, then
    //       i. If targetLen is +inf, then set L to +inf.
    //       ii. Else if targetLen is -inf, then set L to 0.
    //       iii. Else, let targetLenAsInt be ! ToIntegerOrInfinity(targetLen).
    //            Set L to max(targetLenAsInt - argCount, 0).
    // 9. Perform SetFunctionLength(F, L).
    Value targetLengthVal = targetFunc->getProperty("length");
    double targetLength = targetLengthVal.isNumber() ? targetLengthVal.toNumber() : 0;
    double boundLength = std::max(0.0, targetLength - static_cast<double>(boundArgs.size()));
    boundFunc->setProperty("length", Value(boundLength));

    // 10. Let targetName be ? Get(Target, "name").
    // 11. If targetName is not a String, set targetName to the empty String.
    // 12. Perform SetFunctionName(F, targetName, "bound").
    Value targetNameVal = targetFunc->getProperty("name");
    std::string targetName = targetNameVal.isString() ? targetNameVal.getString() : "";
    boundFunc->setProperty("name", Value("bound " + targetName));

    // 13. Return F.
    return Value(boundFunc);
}

// 20.2.3.5 Function.prototype.toString ( )
// @spec https://tc39.es/ecma262/#sec-function.prototype.tostring
Value Function::toString(const CallContext& ctx, const std::vector<Value>& args) {
    // 1. Let func be the this value.
    // 2. If func is an Object, func has a [[SourceText]] internal slot,
    //    func.[[SourceText]] is a sequence of Unicode code points, and
    //    HostHasSourceTextAvailable(func) is true, then
    //    a. Return CodePointsToString(func.[[SourceText]]).
    // 3. If func is a built-in function object, return an implementation-approximation
    //    of the original source code of func, which must have the syntax of a
    //    NativeFunction.
    // 4. If func is an Object and IsCallable(func) is true, return an
    //    implementation-defined string source code representation of func which
    //    must have the syntax of a NativeFunction.
    // 5. Throw a TypeError exception.
    // SIMPLIFIED: Rift does not store [[SourceText]] on function objects, so step 2
    // is never taken. All functions return the NativeFunction form from step 3/4.
    if(!ctx.thisValue.isFunction()) {
        throw JavaScriptException(
            Value("TypeError: Function.prototype.toString called on non-function"));
    }

    // NativeFunction : function BindingIdentifier? ( FormalParameters ) { [native code] }
    return Value("function () { [native code] }");
}

// NON-STANDARD: Internal helper to retrieve the Function.prototype object.
// Not part of ECMA-262; used by Rift's builtin infrastructure.
JSObject* Function::getGlobalPrototype() {
    return rift::core::BuiltinManager::getFunctionPrototype();
}

}  // namespace rift::builtins
