#include "rift/builtins/error/eval_error.h"

#include "rift/builtins/builtin_manager.h"
#include "rift/interpreter/javascript_exception.h"
#include "rift/memory/gc_protector.h"

// ============================================================================
// ECMA-262 -- NativeError: EvalError
// @spec https://tc39.es/ecma262/#sec-native-error-types-used-in-this-standard-evalerror
// Implements the NativeError constructor pattern (20.5.5) for EvalError.
// EvalError is not currently used by the spec but is retained for compatibility.
// ============================================================================

namespace rift::builtins {

// 20.5.5.2 Properties of the NativeError Constructors
// @spec https://tc39.es/ecma262/#sec-properties-of-the-nativeerror-constructors
void EvalError::setupStaticMethods(JSObject* constructor, rift::memory::ObjectFactory* factory) {
    RIFT_PROPERTY(constructor, "name", Value("EvalError"));
}

// 20.5.5.3 Properties of the NativeError Prototype Objects
// @spec https://tc39.es/ecma262/#sec-properties-of-the-nativeerror-prototype-objects
void EvalError::setupPrototypeMethods(JSObject* prototype, rift::memory::ObjectFactory* factory) {
    prototype->defineProperty(
        "name", rift::runtime::PropertyDescriptor(Value("EvalError"), true, false, true));
    prototype->defineProperty("message",
                              rift::runtime::PropertyDescriptor(Value(""), true, false, true));
    RIFT_METHOD(prototype, "toString", 0, EvalError::toString);
}

// 20.5.5.1 NativeError ( message [, options ] )
// @spec https://tc39.es/ecma262/#sec-nativeerror
Value EvalError::constructor(const std::vector<Value>& args) {
    auto errorPrototype = getGlobalPrototype();
    auto* errorObj = getObjectFactory()->createJSObject(errorPrototype);
    rift::memory::GCProtector protect(errorObj, getObjectFactory()->getObjectManager());

    errorObj->setProperty("name", Value("EvalError"));

    std::string message = "";
    if(!args.empty() && !args[0].isUndefined()) {
        message = args[0].toString();
    }
    errorObj->setProperty("message", Value(message));

    return Value(errorObj);
}

// 20.5.3.4 Error.prototype.toString ( )
// @spec https://tc39.es/ecma262/#sec-error.prototype.tostring
Value EvalError::toString(const std::vector<Value>& args) {
    auto errorObj = getThisErrorObject(args);
    if(!errorObj) {
        throw rift::core::JavaScriptException(
            Value("TypeError: EvalError.prototype.toString called on non-object"));
    }

    Value nameValue = errorObj->getProperty("name");
    Value messageValue = errorObj->getProperty("message");

    std::string name = nameValue.isUndefined() ? "EvalError" : nameValue.toString();
    std::string message = messageValue.isUndefined() ? "" : messageValue.toString();

    if(message.empty()) {
        return Value(name);
    } else {
        return Value(name + ": " + message);
    }
}

JSObject* EvalError::getThisErrorObject(const std::vector<Value>& args) {
    if(args.empty()) {
        return nullptr;
    }
    const Value& thisValue = args[0];
    if(thisValue.isObject()) {
        return thisValue.getObject();
    }
    return nullptr;
}

JSObject* EvalError::getGlobalPrototype() {
    return rift::core::BuiltinManager::getEvalErrorPrototype();
}

}  // namespace rift::builtins
