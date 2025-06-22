#include "rift/builtins/boolean/boolean.h"
#include "rift/core/engine/builtin_manager.h"

namespace rift::builtins {

std::shared_ptr<JSObject> Boolean::create() {
    auto boolean = std::make_shared<JSFunction>(Boolean::constructor);

    // Create and set prototype
    auto prototype = createPrototype();
    boolean->setProperty("prototype", Value(prototype));

    return boolean;
}

std::shared_ptr<JSObject> Boolean::createPrototype() {
    auto prototype = std::make_shared<JSObject>();

    // Add prototype methods
    prototype->setProperty("toString", Value(std::make_shared<JSFunction>(Boolean::toString)));
    prototype->setProperty("valueOf", Value(std::make_shared<JSFunction>(Boolean::valueOf)));

    return prototype;
}

Value Boolean::constructor(const std::vector<Value>& args) {
    // The Boolean constructor creates a Boolean object when called with new
    // (In JavaScript, Boolean() without new returns primitive, but our new expression
    // evaluator always calls constructors expecting objects)
    
    // Determine the boolean value to wrap
    bool boolValue;
    if (args.empty()) {
        boolValue = false;
    } else {
        boolValue = args[0].toBool();
    }
    
    // Create Boolean object with proper prototype chain
    auto booleanPrototype = getGlobalPrototype();
    auto booleanObj = std::make_shared<JSObject>(booleanPrototype);
    
    // Store the primitive boolean value
    booleanObj->setProperty("value", Value(boolValue));
    
    return Value(booleanObj);
}

Value Boolean::toString(const std::vector<Value>& args) {
    // Get the boolean value from 'this'
    bool boolValue = getThisBooleanValue(args);
    return Value(boolValue ? "true" : "false");
}

Value Boolean::valueOf(const std::vector<Value>& args) {
    // Get the boolean value from 'this'
    bool boolValue = getThisBooleanValue(args);
    return Value(boolValue);
}

bool Boolean::getThisBooleanValue(const std::vector<Value>& args) {
    // For prototype methods, the first argument should be the 'this' value
    if (args.empty()) {
        return false;
    }

    const Value& thisValue = args[0];
    
    // If it's a boolean primitive, return it directly
    if (thisValue.isBoolean()) {
        return thisValue.getBool();
    }
    
    // If it's a Boolean object, extract the primitive value
    if (thisValue.isObject()) {
        auto obj = thisValue.getObject();
        if (obj) {
            // Check if it has a boolean value property (for Boolean objects)
            Value valueProperty = obj->getProperty("value");
            if (valueProperty.isBoolean()) {
                return valueProperty.getBool();
            }
        }
    }
    
    // Default case: convert to boolean
    return thisValue.toBool();
}

std::shared_ptr<JSObject> Boolean::getGlobalPrototype() {
    return rift::core::BuiltinManager::getBooleanPrototype();
}

}  // namespace rift::builtins 