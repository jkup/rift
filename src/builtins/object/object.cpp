#include "rift/builtins/object/object.h"

#include <algorithm>

#include "rift/builtins/array/array.h"
#include "rift/builtins/boolean/boolean.h"
#include "rift/builtins/string/string.h"
#include "rift/core/engine/builtin_manager.h"
#include "rift/core/engine/call_context.h"
#include "rift/core/engine/evaluation_utils.h"
#include "rift/memory/gc_protector.h"

namespace rift::builtins {

using rift::core::CallContext;

void Object::setupStaticMethods(JSObject* constructor, rift::memory::ObjectFactory* factory) {
    RIFT_STATIC_METHOD(constructor, "keys", Object::keys);
    RIFT_STATIC_METHOD(constructor, "values", Object::values);
    RIFT_STATIC_METHOD(constructor, "entries", Object::entries);
    RIFT_STATIC_METHOD(constructor, "defineProperty", Object::defineProperty);
    RIFT_STATIC_METHOD(constructor, "getOwnPropertyDescriptor", Object::getOwnPropertyDescriptor);
}

void Object::setupPrototypeMethods(JSObject* prototype, rift::memory::ObjectFactory* factory) {
    RIFT_METHOD(prototype, "toString", Object::toString);
    RIFT_METHOD(prototype, "valueOf", Object::valueOf);
    RIFT_METHOD(prototype, "hasOwnProperty", Object::hasOwnProperty);
}

Value Object::constructor(const CallContext& ctx, const std::vector<Value>& args) {
    // Object constructor - create new object
    if(args.empty()) {
        // Always use factory for consistent GC management
        return Value(getObjectFactory()->createJSObject());
    }

    // Convert argument to object
    Value arg = args[0];
    if(arg.isObject()) {
        return arg;
    }

    // Handle primitive to object conversion according to ECMAScript spec
    if(arg.isString()) {
        // Convert string primitive to String object with proper prototype chain
        auto* stringPrototype = rift::core::BuiltinManager::getStringPrototype();
        auto* stringObj = getObjectFactory()->createJSObject(stringPrototype);

        // Protect from GC during initialization
        rift::memory::GCProtector protect(stringObj, getObjectFactory()->getObjectManager());

        // Store the primitive string value (following similar pattern to Boolean)
        stringObj->setProperty("value", arg);

        return Value(stringObj);
    }

    if(arg.isBoolean()) {
        // Convert boolean primitive to Boolean object with proper prototype chain
        auto* booleanPrototype = rift::core::BuiltinManager::getBooleanPrototype();
        auto* booleanObj = getObjectFactory()->createJSObject(booleanPrototype);

        // Protect from GC during initialization
        rift::memory::GCProtector protect(booleanObj, getObjectFactory()->getObjectManager());

        // Store the primitive boolean value (following Boolean constructor pattern)
        booleanObj->setProperty("value", arg);

        return Value(booleanObj);
    }

    if(arg.isNumber()) {
        // Convert number primitive to Number object with proper prototype chain
        auto* numberPrototype = rift::core::BuiltinManager::getNumberPrototype();
        auto* numberObj = getObjectFactory()->createJSObject(numberPrototype);

        // Protect from GC during initialization
        rift::memory::GCProtector protect(numberObj, getObjectFactory()->getObjectManager());

        numberObj->setProperty("value", arg);
        return Value(numberObj);
    }

    // For null, undefined, or other types, create plain object
    return Value(getObjectFactory()->createJSObject());
}

Value Object::keys(const CallContext& ctx, const std::vector<Value>& args) {
    if(args.empty()) {
        return Value(Array::createArrayObject(getObjectFactory(), {}));
    }

    Value obj = args[0];
    if(!obj.isObject()) {
        return Value(Array::createArrayObject(getObjectFactory(), {}));
    }

    auto* jsObj = obj.getObject();
    if(!jsObj) {
        return Value(Array::createArrayObject(getObjectFactory(), {}));
    }

    // Get only own enumerable property names (not inherited and not non-enumerable)
    std::vector<Value> keys;
    auto propertyNames = jsObj->getEnumerablePropertyNames();
    for(const auto& propName : propertyNames) {
        keys.push_back(Value(propName));
    }

    return Value(Array::createArrayObject(getObjectFactory(), keys));
}

Value Object::values(const CallContext& ctx, const std::vector<Value>& args) {
    if(args.empty()) {
        return Value(Array::createArrayObject(getObjectFactory(), {}));
    }

    Value obj = args[0];
    if(!obj.isObject()) {
        return Value(Array::createArrayObject(getObjectFactory(), {}));
    }

    auto* jsObj = obj.getObject();
    if(!jsObj) {
        return Value(Array::createArrayObject(getObjectFactory(), {}));
    }

    // Get only own property values (not inherited prototype properties)
    std::vector<Value> values;
    auto propertyNames = jsObj->getOwnPropertyNames();
    for(const auto& propName : propertyNames) {
        values.push_back(jsObj->getProperty(propName));
    }

    return Value(Array::createArrayObject(getObjectFactory(), values));
}

Value Object::entries(const CallContext& ctx, const std::vector<Value>& args) {
    if(args.empty()) {
        return Value(Array::createArrayObject(getObjectFactory(), {}));
    }

    Value obj = args[0];
    if(!obj.isObject()) {
        return Value(Array::createArrayObject(getObjectFactory(), {}));
    }

    auto* jsObj = obj.getObject();
    if(!jsObj) {
        return Value(Array::createArrayObject(getObjectFactory(), {}));
    }

    // Get only own [key, value] pairs (not inherited prototype properties)
    std::vector<Value> entries;
    auto propertyNames = jsObj->getOwnPropertyNames();
    for(const auto& propName : propertyNames) {
        std::vector<Value> entry = {Value(propName), jsObj->getProperty(propName)};
        entries.push_back(Value(Array::createArrayObject(getObjectFactory(), entry)));
    }

    return Value(Array::createArrayObject(getObjectFactory(), entries));
}

Value Object::toString(const CallContext& ctx, const std::vector<Value>& args) {
    // Default toString implementation
    return Value("[object Object]");
}

Value Object::valueOf(const CallContext& ctx, const std::vector<Value>& args) {
    // Default valueOf implementation - return the object itself
    const Value& thisValue = ctx.thisValue;
    if(thisValue.isObject() || thisValue.isFunction()) {
        return thisValue;
    }
    return Value(getObjectFactory()->createJSObject());
}

Value Object::hasOwnProperty(const CallContext& ctx, const std::vector<Value>& args) {
    if(args.empty()) {
        return Value(false);
    }

    const Value& thisValue = ctx.thisValue;
    Value propertyName = args[0];

    if(!thisValue.isObject() && !thisValue.isFunction()) {
        return Value(false);
    }

    auto* obj = thisValue.getObject();
    if(!obj) {
        return Value(false);
    }

    std::string propName = propertyName.toString();

    // ECMAScript spec: hasOwnProperty() checks only own properties, not inherited ones
    auto ownPropertyNames = obj->getOwnPropertyNames();
    bool hasOwn = std::find(ownPropertyNames.begin(), ownPropertyNames.end(), propName) !=
                  ownPropertyNames.end();

    return Value(hasOwn);
}

Value Object::defineProperty(const CallContext& ctx, const std::vector<Value>& args) {
    // Object.defineProperty(obj, prop, descriptor)
    if(args.size() < 3) {
        // Should throw TypeError in strict mode
        return Value::undefined();
    }

    Value objVal = args[0];
    if(!objVal.isObject()) {
        // Should throw TypeError
        return Value::undefined();
    }

    auto* obj = objVal.getObject();
    if(!obj) {
        return Value::undefined();
    }

    std::string propertyKey = args[1].toString();

    // Parse descriptor object
    Value descriptorVal = args[2];
    if(!descriptorVal.isObject()) {
        // Should throw TypeError - descriptor must be an object
        return Value::undefined();
    }

    auto* descriptorObj = descriptorVal.getObject();
    if(!descriptorObj) {
        return Value::undefined();
    }

    // Build property descriptor from descriptor object
    rift::runtime::PropertyDescriptor desc;

    // Get value (if present)
    Value valueVal = descriptorObj->getProperty("value");
    if(!valueVal.isUndefined()) {
        desc.value = valueVal;
    } else {
        desc.value = Value::undefined();
    }

    // Get writable (default: false for defineProperty, unlike regular assignment)
    Value writableVal = descriptorObj->getProperty("writable");
    desc.writable = !writableVal.isUndefined() && writableVal.toBool();

    // Get enumerable (default: false for defineProperty)
    Value enumerableVal = descriptorObj->getProperty("enumerable");
    desc.enumerable = !enumerableVal.isUndefined() && enumerableVal.toBool();

    // Get configurable (default: false for defineProperty)
    Value configurableVal = descriptorObj->getProperty("configurable");
    desc.configurable = !configurableVal.isUndefined() && configurableVal.toBool();

    // Define the property with the descriptor
    obj->defineProperty(propertyKey, desc);

    // Return the object
    return objVal;
}

Value Object::getOwnPropertyDescriptor(const CallContext& ctx, const std::vector<Value>& args) {
    // Object.getOwnPropertyDescriptor(obj, prop)
    if(args.size() < 2) {
        return Value::undefined();
    }

    Value objVal = args[0];
    if(!objVal.isObject()) {
        // Should throw TypeError
        return Value::undefined();
    }

    auto* obj = objVal.getObject();
    if(!obj) {
        return Value::undefined();
    }

    std::string propertyKey = args[1].toString();

    // Check if property exists
    if(!obj->hasOwnProperty(propertyKey)) {
        return Value::undefined();
    }

    // Get the property descriptor
    rift::runtime::PropertyDescriptor desc = obj->getOwnPropertyDescriptor(propertyKey);

    // Create descriptor object to return
    auto* descriptorObj = getObjectFactory()->createJSObject();

    // Protect from GC
    rift::memory::GCProtector protect(descriptorObj, getObjectFactory()->getObjectManager());

    descriptorObj->setProperty("value", desc.value);
    descriptorObj->setProperty("writable", Value(desc.writable));
    descriptorObj->setProperty("enumerable", Value(desc.enumerable));
    descriptorObj->setProperty("configurable", Value(desc.configurable));

    return Value(descriptorObj);
}

}  // namespace rift::builtins