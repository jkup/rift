#include "rift/builtins/function/function.h"

#include <algorithm>

#include "rift/core/engine/builtin_manager.h"
#include "rift/core/engine/call_context.h"
#include "rift/core/engine/javascript_exception.h"
#include "rift/memory/gc_protector.h"

namespace rift::builtins {

using rift::core::CallContext;
using rift::core::CallType;
using rift::core::JavaScriptException;

void Function::setupStaticMethods(JSObject* constructor,
                                  rift::memory::ObjectFactory* factory) {
    // Function has no static methods in standard ECMAScript
}

void Function::setupPrototypeMethods(JSObject* prototype,
                                     rift::memory::ObjectFactory* factory) {
    RIFT_METHOD(prototype, "call", Function::call);
    RIFT_METHOD(prototype, "apply", Function::apply);
    RIFT_METHOD(prototype, "bind", Function::bind);
    RIFT_METHOD(prototype, "toString", Function::toString);
}

Value Function::constructor(const CallContext& ctx,
                            const std::vector<Value>& args) {
    // Creating functions from strings is complex - requires parsing
    // For now, throw an error
    throw JavaScriptException(
        Value("TypeError: Function constructor is not yet implemented"));
}

Value Function::call(const CallContext& ctx, const std::vector<Value>& args) {
    // 1. Get the function (this value must be a function)
    if (!ctx.thisValue.isFunction()) {
        throw JavaScriptException(
            Value("TypeError: Function.prototype.call called on non-function"));
    }

    auto* func = dynamic_cast<JSFunction*>(ctx.thisValue.getObject());
    if (!func) {
        throw JavaScriptException(
            Value("TypeError: Function.prototype.call called on non-function"));
    }

    // 2. Get thisArg (first argument, or undefined)
    Value thisArg = args.empty() ? Value::undefined() : args[0];

    // 3. Collect remaining arguments
    std::vector<Value> callArgs;
    for (size_t i = 1; i < args.size(); ++i) {
        callArgs.push_back(args[i]);
    }

    // 4. Call the function with the specified this value
    CallContext callCtx(CallType::Function, thisArg);
    return func->call(callCtx, callArgs);
}

Value Function::apply(const CallContext& ctx, const std::vector<Value>& args) {
    // 1. Verify this is a function
    if (!ctx.thisValue.isFunction()) {
        throw JavaScriptException(Value(
            "TypeError: Function.prototype.apply called on non-function"));
    }

    auto* func = dynamic_cast<JSFunction*>(ctx.thisValue.getObject());
    if (!func) {
        throw JavaScriptException(Value(
            "TypeError: Function.prototype.apply called on non-function"));
    }

    // 2. Get thisArg
    Value thisArg = args.empty() ? Value::undefined() : args[0];

    // 3. Get arguments from array
    std::vector<Value> callArgs;
    if (args.size() >= 2 && !args[1].isNull() && !args[1].isUndefined()) {
        Value argsArray = args[1];
        if (!argsArray.isObject()) {
            throw JavaScriptException(Value(
                "TypeError: CreateListFromArrayLike called on non-object"));
        }

        auto* argsObj = argsArray.getObject();
        Value lengthVal = argsObj->getProperty("length");
        if (lengthVal.isNumber()) {
            size_t length = static_cast<size_t>(lengthVal.toNumber());
            callArgs.reserve(length);
            for (size_t i = 0; i < length; ++i) {
                callArgs.push_back(argsObj->getProperty(std::to_string(i)));
            }
        }
    }

    // 4. Call the function
    CallContext callCtx(CallType::Function, thisArg);
    return func->call(callCtx, callArgs);
}

Value Function::bind(const CallContext& ctx, const std::vector<Value>& args) {
    // 1. Verify this is a function
    if (!ctx.thisValue.isFunction()) {
        throw JavaScriptException(
            Value("TypeError: Function.prototype.bind called on non-function"));
    }

    auto* targetFunc = dynamic_cast<JSFunction*>(ctx.thisValue.getObject());
    if (!targetFunc) {
        throw JavaScriptException(
            Value("TypeError: Function.prototype.bind called on non-function"));
    }

    // 2. Get bound this value
    Value boundThis = args.empty() ? Value::undefined() : args[0];

    // 3. Collect bound arguments
    std::vector<Value> boundArgs;
    for (size_t i = 1; i < args.size(); ++i) {
        boundArgs.push_back(args[i]);
    }

    // 4. Create bound function using closure
    auto* factory = getObjectFactory();

    // Capture target and bound values in the lambda
    auto* boundFunc = factory->createJSFunction(
        [targetFunc, boundThis, boundArgs](const CallContext& callCtx,
                                           const std::vector<Value>& callArgs)
            -> Value {
            // Combine bound args with call args
            std::vector<Value> combinedArgs;
            combinedArgs.reserve(boundArgs.size() + callArgs.size());
            combinedArgs.insert(combinedArgs.end(), boundArgs.begin(),
                                boundArgs.end());
            combinedArgs.insert(combinedArgs.end(), callArgs.begin(),
                                callArgs.end());

            // Determine this value:
            // - For constructor calls, use the new object (callCtx.thisValue)
            // - For regular calls, use boundThis
            Value effectiveThis = (callCtx.type == CallType::Constructor)
                                      ? callCtx.thisValue
                                      : boundThis;

            CallContext boundCtx(callCtx.type, effectiveThis);
            return targetFunc->call(boundCtx, combinedArgs);
        });

    // 5. Protect from GC during setup
    rift::memory::GCProtector protect(boundFunc, factory->getObjectManager());

    // 6. Set up bound function properties
    // Set prototype to Function.prototype
    auto* funcProto = rift::core::BuiltinManager::getFunctionPrototype();
    if (funcProto) {
        boundFunc->setPrototype(funcProto);
    }

    // Calculate and set length property
    Value targetLengthVal = targetFunc->getProperty("length");
    double targetLength =
        targetLengthVal.isNumber() ? targetLengthVal.toNumber() : 0;
    double boundLength =
        std::max(0.0, targetLength - static_cast<double>(boundArgs.size()));
    boundFunc->setProperty("length", Value(boundLength));

    // Set name property (bound functions have "bound " prefix)
    Value targetNameVal = targetFunc->getProperty("name");
    std::string targetName =
        targetNameVal.isString() ? targetNameVal.getString() : "";
    boundFunc->setProperty("name", Value("bound " + targetName));

    return Value(boundFunc);
}

Value Function::toString(const CallContext& ctx,
                         const std::vector<Value>& args) {
    // Verify this is a function
    if (!ctx.thisValue.isFunction()) {
        throw JavaScriptException(Value(
            "TypeError: Function.prototype.toString called on non-function"));
    }

    // Return a generic function representation
    // In a full implementation, we'd return the actual source code
    return Value("function () { [native code] }");
}

JSObject* Function::getGlobalPrototype() {
    return rift::core::BuiltinManager::getFunctionPrototype();
}

}  // namespace rift::builtins
