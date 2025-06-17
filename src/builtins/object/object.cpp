#include "rift/builtins/object/object.h"

#include "rift/builtins/array/array.h"

namespace rift::builtins {

std::shared_ptr<JSObject> Object::create() {
    auto object = std::make_shared<JSObject>();

    // Add static methods
    object->setProperty("keys", Value(std::make_shared<JSFunction>(Object::keys)));
    object->setProperty("values", Value(std::make_shared<JSFunction>(Object::values)));

    // Create and set prototype
    auto prototype = createPrototype();
    object->setProperty("prototype", Value(prototype));

    return object;
}

std::shared_ptr<JSObject> Object::createPrototype() {
    auto prototype = std::make_shared<JSObject>();

    // Add prototype methods
    prototype->setProperty("toString", Value(std::make_shared<JSFunction>(Object::toString)));
    prototype->setProperty("valueOf", Value(std::make_shared<JSFunction>(Object::valueOf)));
    prototype->setProperty("hasOwnProperty", Value(std::make_shared<JSFunction>(Object::hasOwnProperty)));

    return prototype;
}

Value Object::constructor(const std::vector<Value>& args) {
    if (args.empty()) {
        // new Object() - create empty object
        return Value(std::make_shared<JSObject>());
    }

    Value arg = args[0];

    // If the argument is already an object, return it
    if (arg.isObject() || arg.isFunction()) {
        return arg;
    }

    // For primitive values, create a wrapper object
    auto obj = std::make_shared<JSObject>();
    
    if (arg.isString()) {
        // String wrapper object - simplified implementation
        obj->setProperty("value", arg);
    } else if (arg.isNumber()) {
        // Number wrapper object - simplified implementation
        obj->setProperty("value", arg);
    } else if (arg.isBoolean()) {
        // Boolean wrapper object - simplified implementation
        obj->setProperty("value", arg);
    }

    return Value(obj);
}

Value Object::keys(const std::vector<Value>& args) {
    if (args.empty()) {
        // Object.keys() with no arguments should throw TypeError
        // For now, return empty array
        return Value(Array::createArrayObject({}));
    }

    Value arg = args[0];

    // Object.keys() only works on objects
    if (!arg.isObject() && !arg.isFunction()) {
        // In strict ES5+, this would throw a TypeError
        // For now, return empty array for non-objects
        return Value(Array::createArrayObject({}));
    }

    auto obj = arg.getObject();
    if (!obj) {
        return Value(Array::createArrayObject({}));
    }

    // Get own property names (not inherited)
    std::vector<Value> keys;
    
    // Get only the object's own properties
    auto ownPropertyNames = obj->getOwnPropertyNames();
    
    // Convert property names to Values
    for (const auto& propName : ownPropertyNames) {
        keys.push_back(Value(propName));
    }

    return Value(Array::createArrayObject(keys));
}

Value Object::values(const std::vector<Value>& args) {
    if (args.empty()) {
        // Object.values() with no arguments should throw TypeError
        // For now, return empty array
        return Value(Array::createArrayObject({}));
    }

    Value arg = args[0];

    // Object.values() only works on objects
    if (!arg.isObject() && !arg.isFunction()) {
        // In strict ES5+, this would throw a TypeError
        // For now, return empty array for non-objects
        return Value(Array::createArrayObject({}));
    }

    auto obj = arg.getObject();
    if (!obj) {
        return Value(Array::createArrayObject({}));
    }

    // Get own property values (not inherited)
    std::vector<Value> values;
    
    // Get only the object's own properties
    auto ownPropertyNames = obj->getOwnPropertyNames();
    
    // Get values for each own property
    for (const auto& propName : ownPropertyNames) {
        Value propValue = obj->getProperty(propName);
        values.push_back(propValue);
    }

    return Value(Array::createArrayObject(values));
}

Value Object::toString(const std::vector<Value>& args) {
    // Default toString implementation
    return Value("[object Object]");
}

Value Object::valueOf(const std::vector<Value>& args) {
    // Default valueOf implementation - return the object itself
    if (!args.empty() && (args[0].isObject() || args[0].isFunction())) {
        return args[0];
    }
    return Value(std::make_shared<JSObject>());
}

Value Object::hasOwnProperty(const std::vector<Value>& args) {
    if (args.size() < 2) {
        return Value(false);
    }

    Value thisValue = args[0];
    Value propertyName = args[1];

    if (!thisValue.isObject() && !thisValue.isFunction()) {
        return Value(false);
    }

    auto obj = thisValue.getObject();
    if (!obj) {
        return Value(false);
    }

    std::string propName = propertyName.toString();
    
    // This is a simplified implementation
    // In a full implementation, we'd need to check only own properties, not inherited ones
    bool hasProperty = obj->hasProperty(propName);
    
    return Value(hasProperty);
}

}  // namespace rift::builtins 