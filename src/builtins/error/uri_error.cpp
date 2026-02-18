#include "rift/builtins/error/uri_error.h"

#include "rift/builtins/builtin_manager.h"
#include "rift/interpreter/javascript_exception.h"
#include "rift/memory/gc_protector.h"

// ============================================================================
// ECMA-262 -- NativeError: URIError
// @spec https://tc39.es/ecma262/#sec-native-error-types-used-in-this-standard-urierror
// Implements the NativeError constructor pattern (20.5.5) for URIError.
// URIError is thrown when a global URI handling function is used incorrectly.
// ============================================================================

namespace rift::builtins {

// 20.5.5.2 Properties of the NativeError Constructors
// @spec https://tc39.es/ecma262/#sec-properties-of-the-nativeerror-constructors
void URIError::setupStaticMethods(JSObject* constructor, rift::memory::ObjectFactory* factory) {
    RIFT_PROPERTY(constructor, "name", Value("URIError"));
}

// 20.5.5.3 Properties of the NativeError Prototype Objects
// @spec https://tc39.es/ecma262/#sec-properties-of-the-nativeerror-prototype-objects
void URIError::setupPrototypeMethods(JSObject* prototype, rift::memory::ObjectFactory* factory) {
    prototype->defineProperty(
        "name", rift::runtime::PropertyDescriptor(Value("URIError"), true, false, true));
    prototype->defineProperty("message",
                              rift::runtime::PropertyDescriptor(Value(""), true, false, true));
    RIFT_METHOD(prototype, "toString", URIError::toString);
}

// 20.5.5.1 NativeError ( message [, options ] )
// @spec https://tc39.es/ecma262/#sec-nativeerror
Value URIError::constructor(const std::vector<Value>& args) {
    auto errorPrototype = getGlobalPrototype();
    auto* errorObj = getObjectFactory()->createJSObject(errorPrototype);
    rift::memory::GCProtector protect(errorObj, getObjectFactory()->getObjectManager());

    errorObj->setProperty("name", Value("URIError"));

    std::string message = "";
    if(!args.empty() && !args[0].isUndefined()) {
        message = args[0].toString();
    }
    errorObj->setProperty("message", Value(message));

    return Value(errorObj);
}

// 20.5.3.4 Error.prototype.toString ( )
// @spec https://tc39.es/ecma262/#sec-error.prototype.tostring
Value URIError::toString(const std::vector<Value>& args) {
    auto errorObj = getThisErrorObject(args);
    if(!errorObj) {
        throw rift::core::JavaScriptException(
            Value("TypeError: URIError.prototype.toString called on non-object"));
    }

    Value nameValue = errorObj->getProperty("name");
    Value messageValue = errorObj->getProperty("message");

    std::string name = nameValue.isUndefined() ? "URIError" : nameValue.toString();
    std::string message = messageValue.isUndefined() ? "" : messageValue.toString();

    if(message.empty()) {
        return Value(name);
    } else {
        return Value(name + ": " + message);
    }
}

JSObject* URIError::getThisErrorObject(const std::vector<Value>& args) {
    if(args.empty()) {
        return nullptr;
    }
    const Value& thisValue = args[0];
    if(thisValue.isObject()) {
        return thisValue.getObject();
    }
    return nullptr;
}

JSObject* URIError::getGlobalPrototype() {
    return rift::core::BuiltinManager::getURIErrorPrototype();
}

}  // namespace rift::builtins
