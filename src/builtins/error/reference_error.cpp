#include "rift/builtins/error/reference_error.h"

#include "rift/core/engine/builtin_manager.h"
#include "rift/core/engine/javascript_exception.h"
#include "rift/memory/gc_protector.h"

namespace rift::builtins {

void ReferenceError::setupStaticMethods(JSObject* constructor, rift::memory::ObjectFactory* factory) {
    // ReferenceError has no static methods
}

void ReferenceError::setupPrototypeMethods(JSObject* prototype, rift::memory::ObjectFactory* factory) {
    // Set default properties
    prototype->setProperty("name", Value("ReferenceError"));
    prototype->setProperty("message", Value(""));

    // Add ReferenceError.prototype methods using GC-managed function creation
    prototype->setProperty("toString", Value(factory->createJSFunction(ReferenceError::toString)));
}

Value ReferenceError::constructor(const std::vector<Value>& args) {
    // Create ReferenceError object with proper prototype chain
    auto errorPrototype = getGlobalPrototype();
    auto* errorObj = getObjectFactory()->createJSObject(errorPrototype);
    
    // Protect from GC during initialization
    rift::memory::GCProtector protect(errorObj, getObjectFactory()->getObjectManager());

    // Set the name property
    errorObj->setProperty("name", Value("ReferenceError"));

    // Set the message property
    std::string message = "";
    if(!args.empty() && !args[0].isUndefined()) {
        message = args[0].toString();
    }
    errorObj->setProperty("message", Value(message));

    return Value(errorObj);
}

Value ReferenceError::toString(const std::vector<Value>& args) {
    auto errorObj = getThisErrorObject(args);
    if(!errorObj) {
        throw rift::core::JavaScriptException(
            Value("TypeError: ReferenceError.prototype.toString called on non-object"));
    }

    // Get name and message properties
    Value nameValue = errorObj->getProperty("name");
    Value messageValue = errorObj->getProperty("message");

    std::string name = nameValue.isUndefined() ? "ReferenceError" : nameValue.toString();
    std::string message = messageValue.isUndefined() ? "" : messageValue.toString();

    // Format according to ECMAScript spec
    if(message.empty()) {
        return Value(name);
    } else {
        return Value(name + ": " + message);
    }
}

JSObject* ReferenceError::getThisErrorObject(const std::vector<Value>& args) {
    // For prototype methods, the first argument should be the 'this' value
    if(args.empty()) {
        return nullptr;
    }

    const Value& thisValue = args[0];

    if(thisValue.isObject()) {
        return thisValue.getObject();
    }

    return nullptr;
}

JSObject* ReferenceError::getGlobalPrototype() {
    return rift::core::BuiltinManager::getReferenceErrorPrototype();
}

}  // namespace rift::builtins
