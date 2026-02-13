#include "rift/builtins/object/object.h"

#include <algorithm>

#include "rift/builtins/array/array.h"
#include "rift/builtins/boolean/boolean.h"
#include "rift/builtins/string/string.h"
#include "rift/builtins/symbol/symbol.h"
#include "rift/core/engine/builtin_manager.h"
#include "rift/core/engine/call_context.h"
#include "rift/core/engine/evaluation_utils.h"
#include "rift/core/engine/javascript_exception.h"
#include "rift/memory/gc_protector.h"

namespace rift::builtins {

using rift::core::CallContext;

void Object::setupStaticMethods(JSObject* constructor, rift::memory::ObjectFactory* factory) {
    RIFT_STATIC_METHOD(constructor, "keys", Object::keys);
    RIFT_STATIC_METHOD(constructor, "values", Object::values);
    RIFT_STATIC_METHOD(constructor, "entries", Object::entries);
    RIFT_STATIC_METHOD(constructor, "defineProperty", Object::defineProperty);
    RIFT_STATIC_METHOD(constructor, "defineProperties", Object::defineProperties);
    RIFT_STATIC_METHOD(constructor, "getOwnPropertyDescriptor", Object::getOwnPropertyDescriptor);
    RIFT_STATIC_METHOD(constructor, "create", Object::jsCreate);
    RIFT_STATIC_METHOD(constructor, "getPrototypeOf", Object::getPrototypeOf);
    RIFT_STATIC_METHOD(constructor, "setPrototypeOf", Object::setPrototypeOf);
    RIFT_STATIC_METHOD(constructor, "getOwnPropertyNames", Object::getOwnPropertyNames);
    RIFT_STATIC_METHOD(constructor, "getOwnPropertySymbols", Object::getOwnPropertySymbols);
    RIFT_STATIC_METHOD(constructor, "assign", Object::assign);
    RIFT_STATIC_METHOD(constructor, "preventExtensions", Object::preventExtensions);
    RIFT_STATIC_METHOD(constructor, "isExtensible", Object::isExtensible);
    RIFT_STATIC_METHOD(constructor, "seal", Object::seal);
    RIFT_STATIC_METHOD(constructor, "isSealed", Object::isSealed);
    RIFT_STATIC_METHOD(constructor, "freeze", Object::freeze);
    RIFT_STATIC_METHOD(constructor, "isFrozen", Object::isFrozen);
    RIFT_STATIC_METHOD(constructor, "is", Object::is);
    RIFT_STATIC_METHOD(constructor, "hasOwn", Object::hasOwn);
    RIFT_STATIC_METHOD(constructor, "fromEntries", Object::fromEntries);
    RIFT_STATIC_METHOD(constructor, "getOwnPropertyDescriptors", Object::getOwnPropertyDescriptors);
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
    if(!obj.isObject() && !obj.isFunction()) {
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
    if(!obj.isObject() && !obj.isFunction()) {
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
    if(!obj.isObject() && !obj.isFunction()) {
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
    if(!objVal.isObject() && !objVal.isFunction()) {
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

    // Check for accessor descriptor (get/set)
    Value getVal = descriptorObj->getProperty("get");
    Value setVal = descriptorObj->getProperty("set");

    if(!getVal.isUndefined() || !setVal.isUndefined()) {
        // Accessor descriptor
        desc.is_accessor = true;
        desc.getter = getVal.isUndefined() ? Value::undefined() : getVal;
        desc.setter = setVal.isUndefined() ? Value::undefined() : setVal;
    } else {
        // Data descriptor
        Value valueVal = descriptorObj->getProperty("value");
        if(!valueVal.isUndefined()) {
            desc.value = valueVal;
        } else {
            desc.value = Value::undefined();
        }

        // Get writable (default: false for defineProperty, unlike regular assignment)
        Value writableVal = descriptorObj->getProperty("writable");
        desc.writable = !writableVal.isUndefined() && writableVal.toBool();
    }

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

Value Object::defineProperties(const CallContext& ctx, const std::vector<Value>& args) {
    // Object.defineProperties(obj, props) — ECMAScript §20.1.2.3
    if(args.size() < 2) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Object.defineProperties requires two arguments"));
    }

    Value objVal = args[0];
    if(!objVal.isObject() && !objVal.isFunction()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Object.defineProperties called on non-object"));
    }

    auto* obj = objVal.getObject();
    if(!obj) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Object.defineProperties called on non-object"));
    }

    Value propsVal = args[1];
    if(!propsVal.isObject()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Property description must be an object"));
    }

    auto* propsObj = propsVal.getObject();
    if(!propsObj) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Property description must be an object"));
    }

    auto propNames = propsObj->getOwnPropertyNames();
    for(const auto& propName : propNames) {
        Value descriptorVal = propsObj->getProperty(propName);
        if(!descriptorVal.isObject()) {
            throw rift::core::JavaScriptException(
                Value("TypeError: Property description must be an object: " + propName));
        }

        auto* descriptorObj = descriptorVal.getObject();
        if(!descriptorObj) {
            throw rift::core::JavaScriptException(
                Value("TypeError: Property description must be an object: " + propName));
        }

        // Build property descriptor (same logic as defineProperty)
        rift::runtime::PropertyDescriptor desc;

        Value getVal = descriptorObj->getProperty("get");
        Value setVal = descriptorObj->getProperty("set");

        if(!getVal.isUndefined() || !setVal.isUndefined()) {
            desc.is_accessor = true;
            desc.getter = getVal.isUndefined() ? Value::undefined() : getVal;
            desc.setter = setVal.isUndefined() ? Value::undefined() : setVal;
        } else {
            Value valueVal = descriptorObj->getProperty("value");
            if(!valueVal.isUndefined()) {
                desc.value = valueVal;
            } else {
                desc.value = Value::undefined();
            }

            Value writableVal = descriptorObj->getProperty("writable");
            desc.writable = !writableVal.isUndefined() && writableVal.toBool();
        }

        Value enumerableVal = descriptorObj->getProperty("enumerable");
        desc.enumerable = !enumerableVal.isUndefined() && enumerableVal.toBool();

        Value configurableVal = descriptorObj->getProperty("configurable");
        desc.configurable = !configurableVal.isUndefined() && configurableVal.toBool();

        obj->defineProperty(propName, desc);
    }

    return objVal;
}

Value Object::getOwnPropertyDescriptor(const CallContext& ctx, const std::vector<Value>& args) {
    // Object.getOwnPropertyDescriptor(obj, prop)
    if(args.size() < 2) {
        return Value::undefined();
    }

    Value objVal = args[0];
    if(!objVal.isObject() && !objVal.isFunction()) {
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

    if(desc.is_accessor) {
        descriptorObj->setProperty("get", desc.getter);
        descriptorObj->setProperty("set", desc.setter);
    } else {
        descriptorObj->setProperty("value", desc.value);
        descriptorObj->setProperty("writable", Value(desc.writable));
    }
    descriptorObj->setProperty("enumerable", Value(desc.enumerable));
    descriptorObj->setProperty("configurable", Value(desc.configurable));

    return Value(descriptorObj);
}

Value Object::jsCreate(const CallContext& ctx, const std::vector<Value>& args) {
    // Object.create(proto, propertiesObject)
    if(args.empty()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Object prototype may only be an Object or null: undefined"));
    }

    Value protoArg = args[0];
    JSObject* prototype = nullptr;

    if(protoArg.isNull()) {
        prototype = nullptr;  // Object with null prototype
    } else if(protoArg.isObject()) {
        prototype = protoArg.getObject();
    } else {
        // TypeError: Object prototype may only be an Object or null
        throw rift::core::JavaScriptException(
            Value("TypeError: Object prototype may only be an Object or null"));
    }

    // Create the new object with the specified prototype
    auto* obj = getObjectFactory()->createJSObject(prototype);
    rift::memory::GCProtector protect(obj, getObjectFactory()->getObjectManager());

    // If propertiesObject is provided, define properties
    if(args.size() >= 2 && args[1].isObject()) {
        auto* propsObj = args[1].getObject();
        if(propsObj) {
            auto propNames = propsObj->getOwnPropertyNames();
            for(const auto& propName : propNames) {
                Value descriptorVal = propsObj->getProperty(propName);
                if(descriptorVal.isObject()) {
                    auto* descriptorObj = descriptorVal.getObject();
                    if(descriptorObj) {
                        rift::runtime::PropertyDescriptor desc;

                        Value valueVal = descriptorObj->getProperty("value");
                        desc.value = valueVal.isUndefined() ? Value::undefined() : valueVal;

                        Value writableVal = descriptorObj->getProperty("writable");
                        desc.writable = !writableVal.isUndefined() && writableVal.toBool();

                        Value enumerableVal = descriptorObj->getProperty("enumerable");
                        desc.enumerable = !enumerableVal.isUndefined() && enumerableVal.toBool();

                        Value configurableVal = descriptorObj->getProperty("configurable");
                        desc.configurable =
                            !configurableVal.isUndefined() && configurableVal.toBool();

                        obj->defineProperty(propName, desc);
                    }
                }
            }
        }
    }

    return Value(obj);
}

Value Object::getPrototypeOf(const CallContext& ctx, const std::vector<Value>& args) {
    // Object.getPrototypeOf(obj)
    if(args.empty()) {
        return Value::undefined();
    }

    Value objVal = args[0];
    if(!objVal.isObject() && !objVal.isFunction()) {
        // ECMAScript 6+: coerce to object first, but for primitives return their prototype
        // For simplicity, return undefined for non-objects
        return Value::undefined();
    }

    auto* obj = objVal.getObject();
    if(!obj) {
        return Value::undefined();
    }

    JSObject* proto = obj->getPrototype();
    if(!proto) {
        return Value::null();
    }
    return Value(proto);
}

Value Object::setPrototypeOf(const CallContext& ctx, const std::vector<Value>& args) {
    // Object.setPrototypeOf(obj, proto)
    if(args.size() < 2) {
        return Value::undefined();
    }

    Value objVal = args[0];
    if(!objVal.isObject() && !objVal.isFunction()) {
        // TypeError for non-objects in strict mode
        return objVal;  // Return the value as-is per spec for non-objects
    }

    auto* obj = objVal.getObject();
    if(!obj) {
        return objVal;
    }

    // Check if object is extensible
    if(!obj->isExtensible()) {
        // TypeError: cannot set prototype on non-extensible object
        return objVal;
    }

    Value protoArg = args[1];
    JSObject* newProto = nullptr;

    if(protoArg.isNull()) {
        newProto = nullptr;
    } else if(protoArg.isObject()) {
        newProto = protoArg.getObject();
    } else {
        // TypeError: Object prototype may only be an Object or null
        return objVal;
    }

    obj->setPrototype(newProto);
    return objVal;
}

Value Object::getOwnPropertyNames(const CallContext& ctx, const std::vector<Value>& args) {
    // Object.getOwnPropertyNames(obj)
    if(args.empty()) {
        return Value(Array::createArrayObject(getObjectFactory(), {}));
    }

    Value objVal = args[0];
    if(!objVal.isObject() && !objVal.isFunction()) {
        return Value(Array::createArrayObject(getObjectFactory(), {}));
    }

    auto* obj = objVal.getObject();
    if(!obj) {
        return Value(Array::createArrayObject(getObjectFactory(), {}));
    }

    std::vector<Value> names;
    auto propNames = obj->getOwnPropertyNames();
    for(const auto& name : propNames) {
        names.push_back(Value(name));
    }

    return Value(Array::createArrayObject(getObjectFactory(), names));
}

Value Object::getOwnPropertySymbols(const CallContext& ctx, const std::vector<Value>& args) {
    // Object.getOwnPropertySymbols(obj)
    if(args.empty()) {
        return Value(Array::createArrayObject(getObjectFactory(), {}));
    }

    Value objVal = args[0];
    if(!objVal.isObject() && !objVal.isFunction()) {
        return Value(Array::createArrayObject(getObjectFactory(), {}));
    }

    auto* obj = objVal.getObject();
    if(!obj) {
        return Value(Array::createArrayObject(getObjectFactory(), {}));
    }

    std::vector<Value> symbols;
    auto symbolKeys = obj->getOwnPropertySymbols();
    for(const auto& key : symbolKeys) {
        symbols.push_back(Value(key));
    }

    return Value(Array::createArrayObject(getObjectFactory(), symbols));
}

Value Object::assign(const CallContext& ctx, const std::vector<Value>& args) {
    // Object.assign(target, ...sources)
    if(args.empty()) {
        // TypeError: Cannot convert undefined or null to object
        return Value::undefined();
    }

    Value targetVal = args[0];
    if(!targetVal.isObject() && !targetVal.isFunction()) {
        // Should coerce to object, but for simplicity return undefined for non-objects
        return Value::undefined();
    }

    auto* target = targetVal.getObject();
    if(!target) {
        return Value::undefined();
    }

    // Copy properties from each source
    for(size_t i = 1; i < args.size(); ++i) {
        Value sourceVal = args[i];
        if(sourceVal.isNull() || sourceVal.isUndefined()) {
            continue;  // Skip null/undefined sources
        }
        if(!sourceVal.isObject() && !sourceVal.isFunction()) {
            continue;  // Skip non-objects
        }

        auto* source = sourceVal.getObject();
        if(!source) {
            continue;
        }

        // Copy own enumerable properties
        auto propNames = source->getEnumerablePropertyNames();
        for(const auto& propName : propNames) {
            Value value = source->getProperty(propName);
            target->setProperty(propName, value);
        }

        // Also copy enumerable symbol properties
        auto symbolKeys = source->getOwnPropertySymbols();
        for(const auto& symbolKey : symbolKeys) {
            auto desc = source->getOwnPropertyDescriptor(symbolKey);
            if(desc.enumerable) {
                target->setProperty(symbolKey, desc.value);
            }
        }
    }

    return targetVal;
}

Value Object::preventExtensions(const CallContext& ctx, const std::vector<Value>& args) {
    // Object.preventExtensions(obj)
    if(args.empty()) {
        return Value::undefined();
    }

    Value objVal = args[0];
    if(!objVal.isObject() && !objVal.isFunction()) {
        // Return the value as-is for non-objects (ES6 behavior)
        return objVal;
    }

    auto* obj = objVal.getObject();
    if(obj) {
        obj->preventExtensions();
    }

    return objVal;
}

Value Object::isExtensible(const CallContext& ctx, const std::vector<Value>& args) {
    // Object.isExtensible(obj)
    if(args.empty()) {
        return Value(false);
    }

    Value objVal = args[0];
    if(!objVal.isObject() && !objVal.isFunction()) {
        // Non-objects are considered non-extensible (ES6 behavior)
        return Value(false);
    }

    auto* obj = objVal.getObject();
    if(!obj) {
        return Value(false);
    }

    return Value(obj->isExtensible());
}

Value Object::seal(const CallContext& ctx, const std::vector<Value>& args) {
    // Object.seal(obj)
    // Makes all properties non-configurable and prevents new properties
    if(args.empty()) {
        return Value::undefined();
    }

    Value objVal = args[0];
    if(!objVal.isObject() && !objVal.isFunction()) {
        return objVal;
    }

    auto* obj = objVal.getObject();
    if(!obj) {
        return objVal;
    }

    // Get all own property names (including non-enumerable)
    auto propNames = obj->getOwnPropertyNames();
    for(const auto& propName : propNames) {
        auto desc = obj->getOwnPropertyDescriptor(propName);
        desc.configurable = false;
        // Force define even if not configurable (we're sealing)
        obj->defineProperty(propName, desc);
    }

    // Also seal symbol properties
    auto symbolKeys = obj->getOwnPropertySymbols();
    for(const auto& symbolKey : symbolKeys) {
        auto desc = obj->getOwnPropertyDescriptor(symbolKey);
        desc.configurable = false;
        obj->defineProperty(symbolKey, desc);
    }

    // Prevent new properties
    obj->preventExtensions();

    return objVal;
}

Value Object::isSealed(const CallContext& ctx, const std::vector<Value>& args) {
    // Object.isSealed(obj)
    if(args.empty()) {
        return Value(true);  // undefined/missing is considered sealed
    }

    Value objVal = args[0];
    if(!objVal.isObject() && !objVal.isFunction()) {
        return Value(true);  // Non-objects are considered sealed (ES6)
    }

    auto* obj = objVal.getObject();
    if(!obj) {
        return Value(true);
    }

    // Must be non-extensible
    if(obj->isExtensible()) {
        return Value(false);
    }

    // All own properties must be non-configurable
    auto propNames = obj->getOwnPropertyNames();
    for(const auto& propName : propNames) {
        auto desc = obj->getOwnPropertyDescriptor(propName);
        if(desc.configurable) {
            return Value(false);
        }
    }

    // Check symbol properties too
    auto symbolKeys = obj->getOwnPropertySymbols();
    for(const auto& symbolKey : symbolKeys) {
        auto desc = obj->getOwnPropertyDescriptor(symbolKey);
        if(desc.configurable) {
            return Value(false);
        }
    }

    return Value(true);
}

Value Object::freeze(const CallContext& ctx, const std::vector<Value>& args) {
    // Object.freeze(obj)
    // Makes all properties non-writable and non-configurable, prevents new properties
    if(args.empty()) {
        return Value::undefined();
    }

    Value objVal = args[0];
    if(!objVal.isObject() && !objVal.isFunction()) {
        return objVal;
    }

    auto* obj = objVal.getObject();
    if(!obj) {
        return objVal;
    }

    // Get all own property names
    auto propNames = obj->getOwnPropertyNames();
    for(const auto& propName : propNames) {
        auto desc = obj->getOwnPropertyDescriptor(propName);
        desc.writable = false;
        desc.configurable = false;
        obj->defineProperty(propName, desc);
    }

    // Also freeze symbol properties
    auto symbolKeys = obj->getOwnPropertySymbols();
    for(const auto& symbolKey : symbolKeys) {
        auto desc = obj->getOwnPropertyDescriptor(symbolKey);
        desc.writable = false;
        desc.configurable = false;
        obj->defineProperty(symbolKey, desc);
    }

    // Prevent new properties
    obj->preventExtensions();

    return objVal;
}

Value Object::isFrozen(const CallContext& ctx, const std::vector<Value>& args) {
    // Object.isFrozen(obj)
    if(args.empty()) {
        return Value(true);  // undefined/missing is considered frozen
    }

    Value objVal = args[0];
    if(!objVal.isObject() && !objVal.isFunction()) {
        return Value(true);  // Non-objects are considered frozen (ES6)
    }

    auto* obj = objVal.getObject();
    if(!obj) {
        return Value(true);
    }

    // Must be non-extensible
    if(obj->isExtensible()) {
        return Value(false);
    }

    // All own properties must be non-writable and non-configurable
    auto propNames = obj->getOwnPropertyNames();
    for(const auto& propName : propNames) {
        auto desc = obj->getOwnPropertyDescriptor(propName);
        if(desc.writable || desc.configurable) {
            return Value(false);
        }
    }

    // Check symbol properties too
    auto symbolKeys = obj->getOwnPropertySymbols();
    for(const auto& symbolKey : symbolKeys) {
        auto desc = obj->getOwnPropertyDescriptor(symbolKey);
        if(desc.writable || desc.configurable) {
            return Value(false);
        }
    }

    return Value(true);
}

Value Object::is(const CallContext& ctx, const std::vector<Value>& args) {
    // Object.is(value1, value2) - SameValue comparison
    Value x = args.size() > 0 ? args[0] : Value::undefined();
    Value y = args.size() > 1 ? args[1] : Value::undefined();

    // Handle undefined
    if(x.isUndefined() && y.isUndefined()) {
        return Value(true);
    }
    // Handle null
    if(x.isNull() && y.isNull()) {
        return Value(true);
    }
    // Handle numbers (differs from === for NaN and -0/+0)
    if(x.isNumber() && y.isNumber()) {
        double xn = x.toNumber();
        double yn = y.toNumber();
        // NaN === NaN should be true for SameValue
        if(std::isnan(xn) && std::isnan(yn)) {
            return Value(true);
        }
        // +0 and -0 should be false for SameValue
        if(xn == 0.0 && yn == 0.0) {
            return Value(std::signbit(xn) == std::signbit(yn));
        }
        return Value(xn == yn);
    }
    // Handle strings
    if(x.isString() && y.isString()) {
        return Value(x.getString() == y.getString());
    }
    // Handle booleans
    if(x.isBoolean() && y.isBoolean()) {
        return Value(x.toBool() == y.toBool());
    }
    // Handle objects/functions - reference equality
    if((x.isObject() || x.isFunction()) && (y.isObject() || y.isFunction())) {
        return Value(x.getObject() == y.getObject());
    }
    // Different types
    return Value(false);
}

Value Object::hasOwn(const CallContext& ctx, const std::vector<Value>& args) {
    // Object.hasOwn(obj, prop)
    if(args.size() < 2) {
        if(args.empty()) {
            throw rift::core::JavaScriptException(
                Value("TypeError: Cannot convert undefined or null to object"));
        }
        return Value(false);
    }

    Value obj_val = args[0];
    if(!obj_val.isObject() && !obj_val.isFunction()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Cannot convert undefined or null to object"));
    }

    auto* obj = obj_val.getObject();
    if(!obj) {
        return Value(false);
    }

    std::string prop_name = args[1].toString();
    return Value(obj->hasOwnProperty(prop_name));
}

Value Object::fromEntries(const CallContext& ctx, const std::vector<Value>& args) {
    // Object.fromEntries(iterable)
    if(args.empty() || args[0].isUndefined() || args[0].isNull()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Cannot convert undefined or null to object"));
    }

    Value iterable = args[0];
    if(!iterable.isObject()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: iterable.@@iterator is not a function"));
    }

    auto* result_obj = getObjectFactory()->createJSObject();
    rift::memory::GCProtector protect(result_obj, getObjectFactory()->getObjectManager());

    auto* iter_obj = iterable.getObject();

    // Get Symbol.iterator
    std::string iterator_key =
        rift::core::EvaluationUtils::symbolToPropertyKey(Symbol::getIteratorId());
    Value iterator_method = iter_obj->getProperty(iterator_key);

    if(!iterator_method.isFunction()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: iterable.@@iterator is not a function"));
    }

    auto* iterator_func = dynamic_cast<JSFunction*>(iterator_method.getObject());
    if(!iterator_func) {
        throw rift::core::JavaScriptException(
            Value("TypeError: iterable.@@iterator is not a function"));
    }

    rift::core::CallContext iter_ctx(rift::core::CallType::Function, iterable);
    Value iterator = iterator_func->call(iter_ctx, {});

    if(!iterator.isObject()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Result of the Symbol.iterator method is not an object"));
    }

    auto* iterator_object = iterator.getObject();

    // Iterate through entries
    while(true) {
        Value next_method = iterator_object->getProperty("next");
        if(!next_method.isFunction()) {
            break;
        }

        auto* next_func = dynamic_cast<JSFunction*>(next_method.getObject());
        if(!next_func) {
            break;
        }

        rift::core::CallContext next_ctx(rift::core::CallType::Function, iterator);
        Value iter_result = next_func->call(next_ctx, {});

        if(!iter_result.isObject()) {
            break;
        }

        auto* result_object = iter_result.getObject();
        Value done = result_object->getProperty("done");
        if(done.toBool()) {
            break;
        }

        Value entry = result_object->getProperty("value");
        if(!entry.isObject()) {
            throw rift::core::JavaScriptException(
                Value("TypeError: Iterator value is not an entry object"));
        }

        auto* entry_obj = entry.getObject();
        Value key = entry_obj->getProperty("0");
        Value value = entry_obj->getProperty("1");

        result_obj->setProperty(key.toString(), value);
    }

    return Value(result_obj);
}

Value Object::getOwnPropertyDescriptors(const CallContext& ctx, const std::vector<Value>& args) {
    // Object.getOwnPropertyDescriptors(obj)
    if(args.empty()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Cannot convert undefined or null to object"));
    }

    Value obj_val = args[0];
    if(!obj_val.isObject() && !obj_val.isFunction()) {
        // Return empty object for non-objects
        return Value(getObjectFactory()->createJSObject());
    }

    auto* obj = obj_val.getObject();
    if(!obj) {
        return Value(getObjectFactory()->createJSObject());
    }

    auto* result = getObjectFactory()->createJSObject();
    rift::memory::GCProtector protect(result, getObjectFactory()->getObjectManager());

    // Process string-keyed own properties
    auto prop_names = obj->getOwnPropertyNames();
    for(const auto& prop_name : prop_names) {
        rift::runtime::PropertyDescriptor desc = obj->getOwnPropertyDescriptor(prop_name);

        auto* descriptor_obj = getObjectFactory()->createJSObject();
        rift::memory::GCProtector desc_protect(descriptor_obj,
                                               getObjectFactory()->getObjectManager());

        if(desc.is_accessor) {
            descriptor_obj->setProperty("get", desc.getter);
            descriptor_obj->setProperty("set", desc.setter);
        } else {
            descriptor_obj->setProperty("value", desc.value);
            descriptor_obj->setProperty("writable", Value(desc.writable));
        }
        descriptor_obj->setProperty("enumerable", Value(desc.enumerable));
        descriptor_obj->setProperty("configurable", Value(desc.configurable));

        result->setProperty(prop_name, Value(descriptor_obj));
    }

    // Process symbol-keyed own properties
    auto symbol_keys = obj->getOwnPropertySymbols();
    for(const auto& symbol_key : symbol_keys) {
        rift::runtime::PropertyDescriptor desc = obj->getOwnPropertyDescriptor(symbol_key);

        auto* descriptor_obj = getObjectFactory()->createJSObject();
        rift::memory::GCProtector desc_protect(descriptor_obj,
                                               getObjectFactory()->getObjectManager());

        if(desc.is_accessor) {
            descriptor_obj->setProperty("get", desc.getter);
            descriptor_obj->setProperty("set", desc.setter);
        } else {
            descriptor_obj->setProperty("value", desc.value);
            descriptor_obj->setProperty("writable", Value(desc.writable));
        }
        descriptor_obj->setProperty("enumerable", Value(desc.enumerable));
        descriptor_obj->setProperty("configurable", Value(desc.configurable));

        result->setProperty(symbol_key, Value(descriptor_obj));
    }

    return Value(result);
}

}  // namespace rift::builtins