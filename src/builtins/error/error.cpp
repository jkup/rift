#include "rift/builtins/error/error.h"
#include "rift/core/engine/builtin_manager.h"
#include "rift/core/engine/javascript_exception.h"

namespace rift::builtins {

std::shared_ptr<JSObject> Error::create() {
    auto error = std::make_shared<JSFunction>(Error::constructor);

    // Create and set prototype
    auto prototype = createPrototype();
    error->setProperty("prototype", Value(prototype));

    return error;
}

std::shared_ptr<JSObject> Error::createPrototype() {
    auto prototype = std::make_shared<JSObject>();

    // Set default properties
    prototype->setProperty("name", Value("Error"));
    prototype->setProperty("message", Value(""));

    // Add prototype methods
    prototype->setProperty("toString", Value(std::make_shared<JSFunction>(Error::toString)));

    return prototype;
}

Value Error::constructor(const std::vector<Value>& args) {
    // Create Error object with proper prototype chain
    auto errorPrototype = getGlobalPrototype();
    auto errorObj = std::make_shared<JSObject>(errorPrototype);
    
    // Set the name property
    errorObj->setProperty("name", Value("Error"));
    
    // Set the message property
    std::string message = "";
    if (!args.empty() && !args[0].isUndefined()) {
        message = args[0].toString();
    }
    errorObj->setProperty("message", Value(message));
    
    return Value(errorObj);
}

Value Error::toString(const std::vector<Value>& args) {
    auto errorObj = getThisErrorObject(args);
    if (!errorObj) {
        throw rift::core::JavaScriptException(Value("TypeError: Error.prototype.toString called on non-object"));
    }
    
    // Get name and message properties
    Value nameValue = errorObj->getProperty("name");
    Value messageValue = errorObj->getProperty("message");
    
    std::string name = nameValue.isUndefined() ? "Error" : nameValue.toString();
    std::string message = messageValue.isUndefined() ? "" : messageValue.toString();
    
    // Format according to ECMAScript spec
    if (message.empty()) {
        return Value(name);
    } else {
        return Value(name + ": " + message);
    }
}

std::shared_ptr<JSObject> Error::getThisErrorObject(const std::vector<Value>& args) {
    // For prototype methods, the first argument should be the 'this' value
    if (args.empty()) {
        return nullptr;
    }

    const Value& thisValue = args[0];
    
    // If it's an object, return it (assuming it's an Error object)
    if (thisValue.isObject()) {
        return thisValue.getObject();
    }
    
    return nullptr;
}

std::shared_ptr<JSObject> Error::getGlobalPrototype() {
    return rift::core::BuiltinManager::getErrorPrototype();
}

}  // namespace rift::builtins 