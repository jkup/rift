#include "rift/builtins/boolean/boolean.h"
#include "rift/core/engine/builtin_manager.h"

namespace rift::builtins {

// Static factory storage
rift::memory::ObjectFactory* Boolean::object_factory_ = nullptr;

void Boolean::setObjectFactory(rift::memory::ObjectFactory* factory) {
    object_factory_ = factory;
}

JSObject* Boolean::create(rift::memory::ObjectFactory* factory) {
    // Create Boolean constructor using GC-managed creation
    auto boolean = factory->createJSFunction(Boolean::constructor);

    // Create and set prototype
    auto prototype = createPrototype(factory);
    boolean->setProperty("prototype", Value(prototype));  // prototype is now raw pointer

    return boolean;  // Return raw pointer
}

JSObject* Boolean::createPrototype(rift::memory::ObjectFactory* factory) {
    // Create Boolean.prototype using GC-managed creation
    auto prototype = factory->createJSObject();

    // Add prototype methods using GC-managed function creation
    prototype->setProperty("toString", Value(factory->createJSFunction(Boolean::toString)));
    prototype->setProperty("valueOf", Value(factory->createJSFunction(Boolean::valueOf)));

    return prototype;  // Return raw pointer
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
    auto booleanObj = object_factory_->createJSObject(booleanPrototype);  // Use factory
    
    // Store the primitive boolean value
    booleanObj->setProperty("value", Value(boolValue));
    
    return Value(booleanObj);  // booleanObj is now raw pointer
}

Value Boolean::toString(const std::vector<Value>& args) {
    // Get the boolean value from 'this'
    bool boolValue = getBooleanValue(args);
    return Value(boolValue ? "true" : "false");
}

Value Boolean::valueOf(const std::vector<Value>& args) {
    // Get the boolean value from 'this'
    bool boolValue = getBooleanValue(args);
    return Value(boolValue);
}

bool Boolean::getBooleanValue(const std::vector<Value>& args) {
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
        auto obj = thisValue.getObject();  // getObject() now returns raw pointer
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

JSObject* Boolean::getGlobalPrototype() {
    return rift::core::BuiltinManager::getBooleanPrototype();  // Now returns raw pointer
}

}  // namespace rift::builtins 