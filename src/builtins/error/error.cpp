#include "rift/builtins/error/error.h"

#include "rift/core/engine/builtin_manager.h"
#include "rift/core/engine/evaluation_utils.h"
#include "rift/core/engine/javascript_exception.h"

namespace rift::builtins {

// Static factory storage
rift::memory::ObjectFactory* Error::object_factory_ = nullptr;

void Error::setObjectFactory(rift::memory::ObjectFactory* factory) {
    object_factory_ = factory;
}

JSObject* Error::create(rift::memory::ObjectFactory* factory) {
    // Store factory for use in other methods
    setObjectFactory(factory);

    // Create Error constructor using GC-managed creation
    auto* error = factory->createJSFunction(Error::constructor);

    // Create and set prototype
    auto* prototype = createPrototype(factory);
    error->setProperty("prototype", Value(prototype));  // prototype is now raw pointer

    return error;  // Return raw pointer
}

JSObject* Error::createPrototype(rift::memory::ObjectFactory* factory) {
    // Create Error.prototype using GC-managed creation
    auto* prototype = factory->createJSObject();

    // Set default properties
    prototype->setProperty("name", Value("Error"));
    prototype->setProperty("message", Value(""));

    // Add prototype methods using GC-managed function creation
    prototype->setProperty("toString", Value(factory->createJSFunction(Error::toString)));

    return prototype;  // Return raw pointer
}

Value Error::constructor(const std::vector<Value>& args) {
    // Parse call context from arguments (handles both old and new calling conventions)
    std::vector<Value> realArgs;
    auto callContext = rift::core::EvaluationUtils::parseCallContext(args, realArgs);

    // Create Error object with proper prototype chain
    auto errorPrototype = getGlobalPrototype();
    auto* errorObj = object_factory_->createJSObject(errorPrototype);  // Use factory

    // Set the name property
    errorObj->setProperty("name", Value("Error"));

    // Set the message property
    std::string message = "";
    if(!realArgs.empty() && !realArgs[0].isUndefined()) {
        message = realArgs[0].toString();
    }
    errorObj->setProperty("message", Value(message));

    return Value(errorObj);  // errorObj is now raw pointer
}

Value Error::toString(const std::vector<Value>& args) {
    auto errorObj = getThisErrorObject(args);
    if(!errorObj) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Error.prototype.toString called on non-object"));
    }

    // Get name and message properties
    Value nameValue = errorObj->getProperty("name");
    Value messageValue = errorObj->getProperty("message");

    std::string name = nameValue.isUndefined() ? "Error" : nameValue.toString();
    std::string message = messageValue.isUndefined() ? "" : messageValue.toString();

    // Format according to ECMAScript spec
    if(message.empty()) {
        return Value(name);
    } else {
        return Value(name + ": " + message);
    }
}

JSObject* Error::getThisErrorObject(const std::vector<Value>& args) {
    // For prototype methods, the first argument should be the 'this' value
    if(args.empty()) {
        return nullptr;
    }

    const Value& thisValue = args[0];

    // If it's an object, return it (assuming it's an Error object)
    if(thisValue.isObject()) {
        return thisValue.getObject();  // getObject() now returns raw pointer
    }

    return nullptr;
}

JSObject* Error::getGlobalPrototype() {
    return rift::core::BuiltinManager::getErrorPrototype();  // Now returns raw pointer
}

}  // namespace rift::builtins