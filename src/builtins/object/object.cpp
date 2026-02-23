#include "rift/builtins/object/object.h"

#include <algorithm>

#include "rift/builtins/array/array.h"
#include "rift/builtins/boolean/boolean.h"
#include "rift/builtins/builtin_manager.h"
#include "rift/builtins/error/range_error.h"
#include "rift/builtins/string/string.h"
#include "rift/builtins/symbol/symbol.h"
#include "rift/interpreter/call_context.h"
#include "rift/interpreter/evaluation_utils.h"
#include "rift/interpreter/javascript_exception.h"
#include "rift/memory/gc_protector.h"

// ============================================================================
// ECMA-262 -- Object Objects (20.1)
// @spec https://tc39.es/ecma262/#sec-object-objects
//
// Static methods (20.1.2): assign, create, defineProperty, defineProperties,
//   entries, freeze, fromEntries, getOwnPropertyDescriptor,
//   getOwnPropertyDescriptors, getOwnPropertyNames, getOwnPropertySymbols,
//   getPrototypeOf, hasOwn, is, isExtensible, isFrozen, isSealed, keys,
//   preventExtensions, seal, setPrototypeOf, values
//
// Prototype methods (20.1.3): hasOwnProperty, isPrototypeOf,
//   propertyIsEnumerable, toString, valueOf
// ============================================================================

namespace rift::builtins {

using rift::core::CallContext;

void Object::setupStaticMethods(JSObject* constructor, rift::memory::ObjectFactory* factory) {
    RIFT_STATIC_METHOD(constructor, "keys", 1, Object::keys);
    RIFT_STATIC_METHOD(constructor, "values", 1, Object::values);
    RIFT_STATIC_METHOD(constructor, "entries", 1, Object::entries);
    RIFT_STATIC_METHOD(constructor, "defineProperty", 3, Object::defineProperty);
    RIFT_STATIC_METHOD(constructor, "defineProperties", 2, Object::defineProperties);
    RIFT_STATIC_METHOD(constructor, "getOwnPropertyDescriptor", 2,
                       Object::getOwnPropertyDescriptor);
    RIFT_STATIC_METHOD(constructor, "create", 2, Object::jsCreate);
    RIFT_STATIC_METHOD(constructor, "getPrototypeOf", 1, Object::getPrototypeOf);
    RIFT_STATIC_METHOD(constructor, "setPrototypeOf", 2, Object::setPrototypeOf);
    RIFT_STATIC_METHOD(constructor, "getOwnPropertyNames", 1, Object::getOwnPropertyNames);
    RIFT_STATIC_METHOD(constructor, "getOwnPropertySymbols", 1, Object::getOwnPropertySymbols);
    RIFT_STATIC_METHOD(constructor, "assign", 2, Object::assign);
    RIFT_STATIC_METHOD(constructor, "preventExtensions", 1, Object::preventExtensions);
    RIFT_STATIC_METHOD(constructor, "isExtensible", 1, Object::isExtensible);
    RIFT_STATIC_METHOD(constructor, "seal", 1, Object::seal);
    RIFT_STATIC_METHOD(constructor, "isSealed", 1, Object::isSealed);
    RIFT_STATIC_METHOD(constructor, "freeze", 1, Object::freeze);
    RIFT_STATIC_METHOD(constructor, "isFrozen", 1, Object::isFrozen);
    RIFT_STATIC_METHOD(constructor, "is", 2, Object::is);
    RIFT_STATIC_METHOD(constructor, "hasOwn", 2, Object::hasOwn);
    RIFT_STATIC_METHOD(constructor, "fromEntries", 1, Object::fromEntries);
    RIFT_STATIC_METHOD(constructor, "groupBy", 2, Object::groupBy);
    RIFT_STATIC_METHOD(constructor, "getOwnPropertyDescriptors", 1,
                       Object::getOwnPropertyDescriptors);
}

void Object::setupPrototypeMethods(JSObject* prototype, rift::memory::ObjectFactory* factory) {
    RIFT_METHOD(prototype, "toString", 0, Object::toString);
    RIFT_METHOD(prototype, "valueOf", 0, Object::valueOf);
    RIFT_METHOD(prototype, "hasOwnProperty", 1, Object::hasOwnProperty);
    RIFT_METHOD(prototype, "propertyIsEnumerable", 1, Object::propertyIsEnumerable);
    RIFT_METHOD(prototype, "isPrototypeOf", 1, Object::isPrototypeOf);
}

// 20.1.1.1 Object ( [ value ] )
// @spec https://tc39.es/ecma262/#sec-object-value
Value Object::constructor(const CallContext& ctx, const std::vector<Value>& args) {
    // 1. If NewTarget is neither undefined nor the active function object, then
    //    a. Return ? OrdinaryCreateFromConstructor(NewTarget, "%Object.prototype%").
    // INCOMPLETE: NewTarget handling not implemented; always behaves as direct call.

    // 2. If value is either undefined or null, return OrdinaryObjectCreate(%Object.prototype%).
    if(args.empty()) {
        // Always use factory for consistent GC management
        return Value(getObjectFactory()->createJSObject());
    }

    // 3. Return ! ToObject(value).
    Value arg = args[0];

    // 3a. If value is an Object, return value.
    if(arg.isObject()) {
        return arg;
    }

    // 3b. If value is a String, return a new String object (ToObject).
    // SIMPLIFIED: Rift uses a plain JSObject with String prototype + "value" property
    // instead of a proper exotic String object with [[StringData]] internal slot.
    if(arg.isString()) {
        auto* stringPrototype = rift::core::BuiltinManager::getStringPrototype();
        auto* stringObj = getObjectFactory()->createJSObject(stringPrototype);

        rift::memory::GCProtector protect(stringObj, getObjectFactory()->getObjectManager());

        stringObj->setProperty("value", arg);

        return Value(stringObj);
    }

    // 3c. If value is a Boolean, return a new Boolean object (ToObject).
    // SIMPLIFIED: Same approach -- plain object with Boolean prototype + "value" property.
    if(arg.isBoolean()) {
        auto* booleanPrototype = rift::core::BuiltinManager::getBooleanPrototype();
        auto* booleanObj = getObjectFactory()->createJSObject(booleanPrototype);

        rift::memory::GCProtector protect(booleanObj, getObjectFactory()->getObjectManager());

        booleanObj->setProperty("value", arg);

        return Value(booleanObj);
    }

    // 3d. If value is a Number, return a new Number object (ToObject).
    // SIMPLIFIED: Same approach -- plain object with Number prototype + "value" property.
    if(arg.isNumber()) {
        auto* numberPrototype = rift::core::BuiltinManager::getNumberPrototype();
        auto* numberObj = getObjectFactory()->createJSObject(numberPrototype);

        rift::memory::GCProtector protect(numberObj, getObjectFactory()->getObjectManager());

        numberObj->setProperty("value", arg);
        return Value(numberObj);
    }

    // DEVIATION: Spec step 2 handles null/undefined explicitly; here we fall through
    // for null, undefined, Symbol, and BigInt, creating a plain object.
    // Spec would throw for Symbol (ToObject wraps it), and BigInt is not implemented.
    return Value(getObjectFactory()->createJSObject());
}

// 20.1.2.18 Object.keys ( O )
// @spec https://tc39.es/ecma262/#sec-object.keys
Value Object::keys(const CallContext& ctx, const std::vector<Value>& args) {
    // 1. Let obj be ? ToObject(O).
    // SIMPLIFIED: Rift returns empty array for non-objects instead of calling ToObject.
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

    // 2. Let nameList be ? EnumerableOwnProperties(obj, key).
    std::vector<Value> keys;
    auto propertyNames = jsObj->getEnumerablePropertyNames();
    for(const auto& propName : propertyNames) {
        keys.push_back(Value(propName));
    }

    // 3. Return CreateArrayFromList(nameList).
    return Value(Array::createArrayObject(getObjectFactory(), keys));
}

// 20.1.2.23 Object.values ( O )
// @spec https://tc39.es/ecma262/#sec-object.values
Value Object::values(const CallContext& ctx, const std::vector<Value>& args) {
    // 1. Let obj be ? ToObject(O).
    // SIMPLIFIED: Rift returns empty array for non-objects instead of calling ToObject.
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

    // 2. Let nameList be ? EnumerableOwnProperties(obj, value).
    // DEVIATION: Uses getOwnPropertyNames (includes non-enumerable) instead of
    // EnumerableOwnProperties. Should filter to only enumerable string-keyed properties.
    std::vector<Value> values;
    auto propertyNames = jsObj->getOwnPropertyNames();
    for(const auto& propName : propertyNames) {
        values.push_back(jsObj->getProperty(propName));
    }

    // 3. Return CreateArrayFromList(nameList).
    return Value(Array::createArrayObject(getObjectFactory(), values));
}

// 20.1.2.5 Object.entries ( O )
// @spec https://tc39.es/ecma262/#sec-object.entries
Value Object::entries(const CallContext& ctx, const std::vector<Value>& args) {
    // 1. Let obj be ? ToObject(O).
    // SIMPLIFIED: Rift returns empty array for non-objects instead of calling ToObject.
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

    // 2. Let nameList be ? EnumerableOwnProperties(obj, key+value).
    // DEVIATION: Uses getOwnPropertyNames (includes non-enumerable) instead of
    // EnumerableOwnProperties. Should filter to only enumerable string-keyed properties.
    std::vector<Value> entries;
    auto propertyNames = jsObj->getOwnPropertyNames();
    for(const auto& propName : propertyNames) {
        std::vector<Value> entry = {Value(propName), jsObj->getProperty(propName)};
        entries.push_back(Value(Array::createArrayObject(getObjectFactory(), entry)));
    }

    // 3. Return CreateArrayFromList(nameList).
    return Value(Array::createArrayObject(getObjectFactory(), entries));
}

// 20.1.3.6 Object.prototype.toString ( )
// @spec https://tc39.es/ecma262/#sec-object.prototype.tostring
Value Object::toString(const CallContext& ctx, const std::vector<Value>& args) {
    const Value& thisValue = ctx.thisValue;

    // 1. If the this value is undefined, return "[object Undefined]".
    if(thisValue.isUndefined()) {
        return Value("[object Undefined]");
    }
    // 2. If the this value is null, return "[object Null]".
    if(thisValue.isNull()) {
        return Value("[object Null]");
    }

    // 3. Let O be ! ToObject(this value).
    // SIMPLIFIED: Rift checks primitive types directly rather than boxing via ToObject.

    // 4-14. Determine builtinTag based on internal slots / type checks.
    // SIMPLIFIED: The spec checks [[Call]], IsArray, and various internal slots
    // ([[ParameterMap]], [[StringData]], [[BooleanData]], [[NumberData]], [[DateValue]],
    // [[RegExpMatcher]], [[ErrorData]]). Rift uses type checks and prototype chain walking.
    if(thisValue.isBoolean()) {
        return Value("[object Boolean]");
    }
    if(thisValue.isNumber()) {
        return Value("[object Number]");
    }
    if(thisValue.isString()) {
        return Value("[object String]");
    }
    if(thisValue.isSymbol()) {
        return Value("[object Symbol]");
    }

    if(thisValue.isFunction()) {
        return Value("[object Function]");
    }

    if(thisValue.isObject()) {
        auto* obj = thisValue.getObject();
        if(obj) {
            // 15. Let tag be ? Get(O, @@toStringTag).
            // 16. If tag is not a String, set tag to builtinTag.
            auto* symbol_prototype = rift::core::BuiltinManager::getSymbolPrototype();
            if(symbol_prototype) {
                std::string tag_key =
                    rift::core::EvaluationUtils::symbolToPropertyKey(Symbol::getToStringTagId());
                Value tag = obj->getProperty(tag_key);
                if(tag.isString()) {
                    // 17. Return the string-concatenation of "[object ", tag, and "]".
                    return Value("[object " + tag.getString() + "]");
                }
            }

            // SIMPLIFIED: Spec determines builtinTag via internal slots; Rift walks
            // the prototype chain to match against known built-in prototypes.
            auto* proto = obj->getPrototype();
            auto* array_proto = rift::core::BuiltinManager::getArrayPrototype();
            auto* regexp_proto = rift::core::BuiltinManager::getRegExpPrototype();
            auto* error_proto = rift::core::BuiltinManager::getErrorPrototype();
            auto* boolean_proto = rift::core::BuiltinManager::getBooleanPrototype();
            auto* number_proto = rift::core::BuiltinManager::getNumberPrototype();

            while(proto) {
                if(array_proto && proto == array_proto) {
                    return Value("[object Array]");
                }
                if(regexp_proto && proto == regexp_proto) {
                    return Value("[object RegExp]");
                }
                if(error_proto && proto == error_proto) {
                    return Value("[object Error]");
                }
                if(boolean_proto && proto == boolean_proto) {
                    return Value("[object Boolean]");
                }
                if(number_proto && proto == number_proto) {
                    return Value("[object Number]");
                }
                proto = proto->getPrototype();
            }
        }
    }

    // 17. Return the string-concatenation of "[object ", tag, and "]".
    return Value("[object Object]");
}

// 20.1.3.7 Object.prototype.valueOf ( )
// @spec https://tc39.es/ecma262/#sec-object.prototype.valueof
Value Object::valueOf(const CallContext& ctx, const std::vector<Value>& args) {
    // 1. Return ? ToObject(this value).
    const Value& thisValue = ctx.thisValue;
    if(thisValue.isObject() || thisValue.isFunction()) {
        return thisValue;
    }
    // DEVIATION: Spec calls ToObject which wraps primitives; Rift returns a new
    // plain object instead of wrapping the primitive.
    return Value(getObjectFactory()->createJSObject());
}

// 20.1.3.2 Object.prototype.hasOwnProperty ( V )
// @spec https://tc39.es/ecma262/#sec-object.prototype.hasownproperty
Value Object::hasOwnProperty(const CallContext& ctx, const std::vector<Value>& args) {
    if(args.empty()) {
        return Value(false);
    }

    const Value& thisValue = ctx.thisValue;
    Value propertyName = args[0];

    // 1. Let P be ? ToPropertyKey(V).
    // SIMPLIFIED: Rift uses toString() instead of the full ToPropertyKey abstract operation.
    // ToPropertyKey handles Symbols; toString() does not.

    // 2. Let O be ? ToObject(this value).
    // SIMPLIFIED: Rift checks isObject/isFunction directly instead of calling ToObject.
    if(!thisValue.isObject() && !thisValue.isFunction()) {
        return Value(false);
    }

    auto* obj = thisValue.getObject();
    if(!obj) {
        return Value(false);
    }

    std::string propName = propertyName.toString();

    // 3. Return ? HasOwnProperty(O, P).
    // HasOwnProperty (7.3.13): Let desc be ? O.[[GetOwnProperty]](P). Return desc is not undefined.
    auto ownPropertyNames = obj->getOwnPropertyNames();
    bool hasOwn = std::find(ownPropertyNames.begin(), ownPropertyNames.end(), propName) !=
                  ownPropertyNames.end();

    return Value(hasOwn);
}

// 20.1.3.4 Object.prototype.propertyIsEnumerable ( V )
// @spec https://tc39.es/ecma262/#sec-object.prototype.propertyisenumerable
Value Object::propertyIsEnumerable(const CallContext& ctx, const std::vector<Value>& args) {
    if(args.empty()) {
        return Value(false);
    }

    const Value& thisValue = ctx.thisValue;

    // 1. Let P be ? ToPropertyKey(V).
    // 2. Let O be ? ToObject(this value).
    // SIMPLIFIED: Rift checks isObject/isFunction directly and uses toString() for the key.
    if(!thisValue.isObject() && !thisValue.isFunction()) {
        return Value(false);
    }

    auto* obj = thisValue.getObject();
    if(!obj) {
        return Value(false);
    }

    std::string propName = args[0].toString();

    // 3. Let desc be ? O.[[GetOwnProperty]](P).
    auto own_names = obj->getOwnPropertyNames();
    bool is_own = std::find(own_names.begin(), own_names.end(), propName) != own_names.end();

    // 4. If desc is undefined, return false.
    if(!is_own) {
        return Value(false);
    }

    // 5. Return desc.[[Enumerable]].
    auto [found, desc] = obj->findPropertyDescriptor(propName);
    if(found && !desc.enumerable) {
        return Value(false);
    }

    return Value(true);
}

// 20.1.3.3 Object.prototype.isPrototypeOf ( V )
// @spec https://tc39.es/ecma262/#sec-object.prototype.isprototypeof
Value Object::isPrototypeOf(const CallContext& ctx, const std::vector<Value>& args) {
    // 1. If V is not an Object, return false.
    if(args.empty()) {
        return Value(false);
    }

    const Value& thisValue = ctx.thisValue;
    // 2. Let O be ? ToObject(this value).
    // SIMPLIFIED: Rift checks isObject/isFunction directly instead of calling ToObject.
    if(!thisValue.isObject() && !thisValue.isFunction()) {
        return Value(false);
    }

    Value arg = args[0];
    // 1. (cont.) If V is not an Object, return false.
    if(!arg.isObject() && !arg.isFunction()) {
        return Value(false);
    }

    auto* this_obj = thisValue.getObject();

    // 3. Repeat,
    auto* proto = arg.getObject()->getPrototype();
    while(proto) {
        // a. Set V to ? V.[[GetPrototypeOf]]().
        // b. If V is null, return false.
        // c. If SameValue(V, O) is true, return true.
        if(proto == this_obj) {
            return Value(true);
        }
        proto = proto->getPrototype();
    }

    return Value(false);
}

// 20.1.2.4 Object.defineProperty ( O, P, Attributes )
// @spec https://tc39.es/ecma262/#sec-object.defineproperty
Value Object::defineProperty(const CallContext& ctx, const std::vector<Value>& args) {
    // 1. If O is not an Object, throw a TypeError exception.
    // DEVIATION: Returns undefined instead of throwing TypeError for non-objects.
    if(args.size() < 3) {
        return Value::undefined();
    }

    Value objVal = args[0];
    if(!objVal.isObject() && !objVal.isFunction()) {
        return Value::undefined();
    }

    auto* obj = objVal.getObject();
    if(!obj) {
        return Value::undefined();
    }

    // 2. Let key be ? ToPropertyKey(P).
    // SIMPLIFIED: Uses toString() instead of full ToPropertyKey (no Symbol key support here).
    std::string propertyKey = args[1].toString();

    // 3. Let desc be ? ToPropertyDescriptor(Attributes).
    // ToPropertyDescriptor (6.2.6.5): converts a JS object to a PropertyDescriptor record.
    Value descriptorVal = args[2];
    if(!descriptorVal.isObject()) {
        return Value::undefined();
    }

    auto* descriptorObj = descriptorVal.getObject();
    if(!descriptorObj) {
        return Value::undefined();
    }

    // Get existing property descriptor to use as base for absent fields.
    // Per spec, ToPropertyDescriptor only sets fields that are present in the
    // JS descriptor object. Absent fields inherit from the existing property.
    bool has_existing = obj->hasOwnProperty(propertyKey);
    rift::runtime::PropertyDescriptor existing_desc;
    if(has_existing) {
        existing_desc = obj->getOwnPropertyDescriptor(propertyKey);
    }

    rift::runtime::PropertyDescriptor desc;
    bool has_get = descriptorObj->hasOwnProperty("get");
    bool has_set = descriptorObj->hasOwnProperty("set");

    // ToPropertyDescriptor steps 3-4: Check for "get" and "set" (accessor descriptor).
    if(has_get || has_set) {
        // Accessor descriptor
        desc.is_accessor = true;
        // For absent getter/setter, inherit from existing accessor if available
        if(has_get) {
            desc.getter = descriptorObj->getProperty("get");
        } else if(has_existing && existing_desc.is_accessor) {
            desc.getter = existing_desc.getter;
        } else {
            desc.getter = Value::undefined();
        }
        if(has_set) {
            desc.setter = descriptorObj->getProperty("set");
        } else if(has_existing && existing_desc.is_accessor) {
            desc.setter = existing_desc.setter;
        } else {
            desc.setter = Value::undefined();
        }
    } else if(has_existing && existing_desc.is_accessor &&
              !descriptorObj->hasOwnProperty("value") &&
              !descriptorObj->hasOwnProperty("writable")) {
        // Existing is accessor and no data fields specified — stay accessor
        desc.is_accessor = true;
        desc.getter = existing_desc.getter;
        desc.setter = existing_desc.setter;
    } else {
        // Data descriptor
        desc.is_accessor = false;

        // ToPropertyDescriptor step 7: If Obj has a "value" property, set desc.[[Value]].
        if(descriptorObj->hasOwnProperty("value")) {
            desc.value = descriptorObj->getProperty("value");
        } else if(has_existing && !existing_desc.is_accessor) {
            desc.value = existing_desc.value;
        } else {
            desc.value = Value::undefined();
        }

        // ToPropertyDescriptor step 8: If Obj has a "writable" property, set desc.[[Writable]].
        if(descriptorObj->hasOwnProperty("writable")) {
            desc.writable = descriptorObj->getProperty("writable").toBool();
        } else if(has_existing && !existing_desc.is_accessor) {
            desc.writable = existing_desc.writable;
        } else {
            desc.writable = false;
        }
    }

    // ToPropertyDescriptor step 5: If Obj has "enumerable", set desc.[[Enumerable]].
    if(descriptorObj->hasOwnProperty("enumerable")) {
        desc.enumerable = descriptorObj->getProperty("enumerable").toBool();
    } else if(has_existing) {
        desc.enumerable = existing_desc.enumerable;
    } else {
        desc.enumerable = false;
    }

    // ToPropertyDescriptor step 6: If Obj has "configurable", set desc.[[Configurable]].
    if(descriptorObj->hasOwnProperty("configurable")) {
        desc.configurable = descriptorObj->getProperty("configurable").toBool();
    } else if(has_existing) {
        desc.configurable = existing_desc.configurable;
    } else {
        desc.configurable = false;
    }

    // 10.4.2.4 ArraySetLength ( A, Desc )
    // @spec https://tc39.es/ecma262/#sec-arraysetlength
    // When defining "length" on an Array exotic object, validate the new value.
    // Only applies to actual arrays (prototype is %Array.prototype%), not plain
    // objects that happen to have a "length" property.
    if(propertyKey == "length" && !desc.is_accessor && desc.value.isNumber() &&
       obj->getPrototype() == rift::core::BuiltinManager::getArrayPrototype()) {
        double len = desc.value.toNumber();
        if(!rift::core::EvaluationUtils::isValidArrayLength(len)) {
            Value err = RangeError::constructor({Value("Invalid array length")});
            throw rift::core::JavaScriptException(err);
        }
    }

    // 4. Perform ? DefinePropertyOrThrow(O, key, desc).
    // @spec https://tc39.es/ecma262/#sec-definepropertyorthrow
    // If [[DefineOwnProperty]] returns false, throw a TypeError.
    bool success = obj->defineProperty(propertyKey, desc);
    if(!success) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Cannot define property '" + propertyKey +
                  "', object is not extensible or property is non-configurable"));
    }

    // 5. Return O.
    return objVal;
}

// 20.1.2.3 Object.defineProperties ( O, Properties )
// @spec https://tc39.es/ecma262/#sec-object.defineproperties
Value Object::defineProperties(const CallContext& ctx, const std::vector<Value>& args) {
    // 1. If O is not an Object, throw a TypeError exception.
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

    // 2. Return ? ObjectDefineProperties(O, Properties).
    // ObjectDefineProperties (20.1.2.3.1):
    // 1. Let props be ? ToObject(Properties).
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

    // 2. Let keys be ? props.[[OwnPropertyKeys]]().
    auto propNames = propsObj->getOwnPropertyNames();

    // 3. Let descriptors be a new empty List.
    // 4. For each element nextKey of keys, do
    //    a. Let propDesc be ? props.[[GetOwnProperty]](nextKey).
    //    b. If propDesc is not undefined and propDesc.[[Enumerable]] is true, then
    //       i. Let descObj be ? Get(props, nextKey).
    //       ii. Let desc be ? ToPropertyDescriptor(descObj).
    //       iii. Append the Record { [[Key]]: nextKey, [[Descriptor]]: desc } to descriptors.
    // SIMPLIFIED: Rift iterates all own properties without the enumerable check.
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

        // ToPropertyDescriptor (6.2.6.5) -- same logic as defineProperty
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

        // 5. For each element pair of descriptors, do
        //    a. Let P be pair.[[Key]].
        //    b. Let desc be pair.[[Descriptor]].
        //    c. Perform ? DefinePropertyOrThrow(O, P, desc).
        bool success = obj->defineProperty(propName, desc);
        if(!success) {
            throw rift::core::JavaScriptException(
                Value("TypeError: Cannot define property '" + propName +
                      "', object is not extensible or property is non-configurable"));
        }
    }

    // 6. Return O.
    return objVal;
}

// 20.1.2.8 Object.getOwnPropertyDescriptor ( O, P )
// @spec https://tc39.es/ecma262/#sec-object.getownpropertydescriptor
Value Object::getOwnPropertyDescriptor(const CallContext& ctx, const std::vector<Value>& args) {
    // 1. Let obj be ? ToObject(O).
    // SIMPLIFIED: Returns undefined for non-objects instead of calling ToObject.
    if(args.size() < 2) {
        return Value::undefined();
    }

    Value objVal = args[0];
    if(!objVal.isObject() && !objVal.isFunction()) {
        return Value::undefined();
    }

    auto* obj = objVal.getObject();
    if(!obj) {
        return Value::undefined();
    }

    // 2. Let key be ? ToPropertyKey(P).
    std::string propertyKey = args[1].toString();

    // 3. Let desc be ? obj.[[GetOwnProperty]](key).
    if(!obj->hasOwnProperty(propertyKey)) {
        // 4. Return FromPropertyDescriptor(desc).
        // FromPropertyDescriptor(undefined) returns undefined.
        return Value::undefined();
    }

    rift::runtime::PropertyDescriptor desc = obj->getOwnPropertyDescriptor(propertyKey);

    // 4. Return FromPropertyDescriptor(desc).
    // FromPropertyDescriptor (6.2.6.4): creates a new object with descriptor fields.
    auto* descriptorObj =
        getObjectFactory()->createJSObject(rift::core::BuiltinManager::getObjectPrototype());

    rift::memory::GCProtector protect(descriptorObj, getObjectFactory()->getObjectManager());

    if(desc.is_accessor) {
        // 3. If desc has a [[Get]] field, then set obj.[[Get]] to desc.[[Get]].
        descriptorObj->setProperty("get", desc.getter);
        // 4. If desc has a [[Set]] field, then set obj.[[Set]] to desc.[[Set]].
        descriptorObj->setProperty("set", desc.setter);
    } else {
        // 1. If desc has a [[Value]] field, then set obj.[[Value]] to desc.[[Value]].
        descriptorObj->setProperty("value", desc.value);
        // 2. If desc has a [[Writable]] field, then set obj.[[Writable]] to desc.[[Writable]].
        descriptorObj->setProperty("writable", Value(desc.writable));
    }
    // 5. Set obj.[[Enumerable]] to desc.[[Enumerable]].
    descriptorObj->setProperty("enumerable", Value(desc.enumerable));
    // 6. Set obj.[[Configurable]] to desc.[[Configurable]].
    descriptorObj->setProperty("configurable", Value(desc.configurable));

    return Value(descriptorObj);
}

// 20.1.2.2 Object.create ( O, Properties )
// @spec https://tc39.es/ecma262/#sec-object.create
Value Object::jsCreate(const CallContext& ctx, const std::vector<Value>& args) {
    // 1. If O is not an Object and O is not null, throw a TypeError exception.
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
        throw rift::core::JavaScriptException(
            Value("TypeError: Object prototype may only be an Object or null"));
    }

    // 2. Let obj be OrdinaryObjectCreate(O).
    auto* obj = getObjectFactory()->createJSObject(prototype);
    rift::memory::GCProtector protect(obj, getObjectFactory()->getObjectManager());

    // 3. If Properties is not undefined, then
    //    a. Return ? ObjectDefineProperties(obj, Properties).
    // SIMPLIFIED: Rift inlines a simplified ObjectDefineProperties that only handles
    // data descriptors. Accessor descriptors in the Properties arg are not processed.
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

    // 4. Return obj.
    return Value(obj);
}

// 20.1.2.12 Object.getPrototypeOf ( O )
// @spec https://tc39.es/ecma262/#sec-object.getprototypeof
Value Object::getPrototypeOf(const CallContext& ctx, const std::vector<Value>& args) {
    // 1. Let obj be ? ToObject(O).
    // SIMPLIFIED: Returns undefined for non-objects instead of calling ToObject.
    // Spec would wrap primitives (e.g., strings get String.prototype).
    if(args.empty()) {
        return Value::undefined();
    }

    Value objVal = args[0];
    if(!objVal.isObject() && !objVal.isFunction()) {
        return Value::undefined();
    }

    auto* obj = objVal.getObject();
    if(!obj) {
        return Value::undefined();
    }

    // 2. Return ? obj.[[GetPrototypeOf]]().
    JSObject* proto = obj->getPrototype();
    if(!proto) {
        return Value::null();
    }
    return Value(proto);
}

// 20.1.2.22 Object.setPrototypeOf ( O, proto )
// @spec https://tc39.es/ecma262/#sec-object.setprototypeof
Value Object::setPrototypeOf(const CallContext& ctx, const std::vector<Value>& args) {
    // 1. Set O to ? RequireObjectCoercible(O).
    if(args.size() < 2) {
        return Value::undefined();
    }

    Value objVal = args[0];

    // 2. If proto is not an Object and proto is not null, throw a TypeError exception.
    // (checked below after the non-object early return)

    // 3. If O is not an Object, return O.
    if(!objVal.isObject() && !objVal.isFunction()) {
        return objVal;
    }

    auto* obj = objVal.getObject();
    if(!obj) {
        return objVal;
    }

    // DEVIATION: Spec does not check extensibility here; it relies on
    // [[SetPrototypeOf]] to handle that (which may throw). Rift checks early
    // and silently returns without throwing.
    if(!obj->isExtensible()) {
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
        // DEVIATION: Should throw TypeError per step 2; Rift silently returns.
        return objVal;
    }

    // 4. Let status be ? O.[[SetPrototypeOf]](proto).
    // 5. If status is false, throw a TypeError exception.
    // INCOMPLETE: Rift does not check the return value of [[SetPrototypeOf]]
    // (e.g., for prototype chain cycle detection).
    obj->setPrototype(newProto);

    // 6. Return O.
    return objVal;
}

// 20.1.2.10 Object.getOwnPropertyNames ( O )
// @spec https://tc39.es/ecma262/#sec-object.getownpropertynames
Value Object::getOwnPropertyNames(const CallContext& ctx, const std::vector<Value>& args) {
    // 1. Return CreateArrayFromList(? GetOwnPropertyKeys(O, string)).
    // SIMPLIFIED: Rift returns empty array for non-objects instead of calling ToObject.
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

// 20.1.2.11 Object.getOwnPropertySymbols ( O )
// @spec https://tc39.es/ecma262/#sec-object.getownpropertysymbols
Value Object::getOwnPropertySymbols(const CallContext& ctx, const std::vector<Value>& args) {
    // 1. Return CreateArrayFromList(? GetOwnPropertyKeys(O, symbol)).
    // SIMPLIFIED: Rift returns empty array for non-objects instead of calling ToObject.
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

// 20.1.2.1 Object.assign ( target, ...sources )
// @spec https://tc39.es/ecma262/#sec-object.assign
Value Object::assign(const CallContext& ctx, const std::vector<Value>& args) {
    // 1. Let to be ? ToObject(target).
    // DEVIATION: Returns undefined for non-objects instead of calling ToObject + throwing.
    if(args.empty()) {
        return Value::undefined();
    }

    Value targetVal = args[0];
    if(!targetVal.isObject() && !targetVal.isFunction()) {
        return Value::undefined();
    }

    auto* target = targetVal.getObject();
    if(!target) {
        return Value::undefined();
    }

    // 2. If only one argument was passed, return to.
    // 3. For each element nextSource of sources, do
    for(size_t i = 1; i < args.size(); ++i) {
        Value sourceVal = args[i];
        // a. If nextSource is neither undefined nor null, then
        if(sourceVal.isNull() || sourceVal.isUndefined()) {
            continue;
        }
        if(!sourceVal.isObject() && !sourceVal.isFunction()) {
            // DEVIATION: Spec calls ToObject on primitives (e.g., strings become
            // String objects with indexed properties). Rift skips non-objects.
            continue;
        }

        auto* source = sourceVal.getObject();
        if(!source) {
            continue;
        }

        // i. Let from be ! ToObject(nextSource).
        // ii. Let keys be ? from.[[OwnPropertyKeys]]().
        // iii. For each element nextKey of keys, do
        //   1. Let desc be ? from.[[GetOwnProperty]](nextKey).
        //   2. If desc is not undefined and desc.[[Enumerable]] is true, then
        //     a. Let propValue be ? Get(from, nextKey).
        //     b. Perform ? Set(to, nextKey, propValue, true).
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

    // 4. Return to.
    return targetVal;
}

// 20.1.2.19 Object.preventExtensions ( O )
// @spec https://tc39.es/ecma262/#sec-object.preventextensions
Value Object::preventExtensions(const CallContext& ctx, const std::vector<Value>& args) {
    // 1. If O is not an Object, return O.
    if(args.empty()) {
        return Value::undefined();
    }

    Value objVal = args[0];
    if(!objVal.isObject() && !objVal.isFunction()) {
        return objVal;
    }

    auto* obj = objVal.getObject();
    if(obj) {
        // 2. Let status be ? O.[[PreventExtensions]]().
        // 3. If status is false, throw a TypeError exception.
        // INCOMPLETE: Rift does not check the return status for Proxy objects.
        obj->preventExtensions();
    }

    // 4. Return O.
    return objVal;
}

// 20.1.2.15 Object.isExtensible ( O )
// @spec https://tc39.es/ecma262/#sec-object.isextensible
Value Object::isExtensible(const CallContext& ctx, const std::vector<Value>& args) {
    // 1. If O is not an Object, return false.
    if(args.empty()) {
        return Value(false);
    }

    Value objVal = args[0];
    if(!objVal.isObject() && !objVal.isFunction()) {
        return Value(false);
    }

    auto* obj = objVal.getObject();
    if(!obj) {
        return Value(false);
    }

    // 2. Return ? O.[[IsExtensible]]().
    return Value(obj->isExtensible());
}

// 20.1.2.21 Object.seal ( O )
// @spec https://tc39.es/ecma262/#sec-object.seal
Value Object::seal(const CallContext& ctx, const std::vector<Value>& args) {
    // 1. If O is not an Object, return O.
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

    // 2. Let status be ? SetIntegrityLevel(O, sealed).
    // SetIntegrityLevel (7.3.16) with level "sealed":
    //   1. Let status be ? O.[[PreventExtensions]]().
    //   3. Let keys be ? O.[[OwnPropertyKeys]]().
    //   4. For each element k of keys, do
    //     a. Perform ? DefinePropertyOrThrow(O, k, PropertyDescriptor { [[Configurable]]: false }).

    auto propNames = obj->getOwnPropertyNames();
    for(const auto& propName : propNames) {
        auto desc = obj->getOwnPropertyDescriptor(propName);
        desc.configurable = false;
        obj->defineProperty(propName, desc);
    }

    // Also seal symbol properties
    auto symbolKeys = obj->getOwnPropertySymbols();
    for(const auto& symbolKey : symbolKeys) {
        auto desc = obj->getOwnPropertyDescriptor(symbolKey);
        desc.configurable = false;
        obj->defineProperty(symbolKey, desc);
    }

    obj->preventExtensions();

    // 3. If status is false, throw a TypeError exception.
    // INCOMPLETE: Rift does not check the return status.

    // 4. Return O.
    return objVal;
}

// 20.1.2.17 Object.isSealed ( O )
// @spec https://tc39.es/ecma262/#sec-object.issealed
Value Object::isSealed(const CallContext& ctx, const std::vector<Value>& args) {
    // 1. If O is not an Object, return true.
    if(args.empty()) {
        return Value(true);
    }

    Value objVal = args[0];
    if(!objVal.isObject() && !objVal.isFunction()) {
        return Value(true);
    }

    auto* obj = objVal.getObject();
    if(!obj) {
        return Value(true);
    }

    // 2. Return ? TestIntegrityLevel(O, sealed).
    // TestIntegrityLevel (7.3.15) with level "sealed":
    //   1. Let extensible be ? O.[[IsExtensible]]().
    //   2. If extensible is true, return false.
    if(obj->isExtensible()) {
        return Value(false);
    }

    //   3. Let keys be ? O.[[OwnPropertyKeys]]().
    //   4. For each element k of keys, do
    //     a. Let currentDesc be ? O.[[GetOwnProperty]](k).
    //     b. If currentDesc is not undefined, then
    //       i. If currentDesc.[[Configurable]] is true, return false.
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

    //   5. Return true.
    return Value(true);
}

// 20.1.2.6 Object.freeze ( O )
// @spec https://tc39.es/ecma262/#sec-object.freeze
Value Object::freeze(const CallContext& ctx, const std::vector<Value>& args) {
    // 1. If O is not an Object, return O.
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

    // 2. Let status be ? SetIntegrityLevel(O, frozen).
    // SetIntegrityLevel (7.3.16) with level "frozen":
    //   1. Let status be ? O.[[PreventExtensions]]().
    //   3. Let keys be ? O.[[OwnPropertyKeys]]().
    //   4. For each element k of keys, do
    //     a. Let currentDesc be ? O.[[GetOwnProperty]](k).
    //     b. If currentDesc is not undefined, then
    //       i. If IsAccessorDescriptor(currentDesc), then
    //          1. Perform ? DefinePropertyOrThrow(O, k, { [[Configurable]]: false }).
    //       ii. Else,
    //          1. Perform ? DefinePropertyOrThrow(O, k,
    //              { [[Configurable]]: false, [[Writable]]: false }).
    // DEVIATION: Rift sets writable=false on all properties including accessor descriptors.
    // Spec only sets writable=false on data descriptors (accessor descriptors have no
    // [[Writable]]).
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

    obj->preventExtensions();

    // 3. If status is false, throw a TypeError exception.
    // INCOMPLETE: Rift does not check the return status.

    // 4. Return O.
    return objVal;
}

// 20.1.2.16 Object.isFrozen ( O )
// @spec https://tc39.es/ecma262/#sec-object.isfrozen
Value Object::isFrozen(const CallContext& ctx, const std::vector<Value>& args) {
    // 1. If O is not an Object, return true.
    if(args.empty()) {
        return Value(true);
    }

    Value objVal = args[0];
    if(!objVal.isObject() && !objVal.isFunction()) {
        return Value(true);
    }

    auto* obj = objVal.getObject();
    if(!obj) {
        return Value(true);
    }

    // 2. Return ? TestIntegrityLevel(O, frozen).
    // TestIntegrityLevel (7.3.15) with level "frozen":
    //   1. Let extensible be ? O.[[IsExtensible]]().
    //   2. If extensible is true, return false.
    if(obj->isExtensible()) {
        return Value(false);
    }

    //   3. Let keys be ? O.[[OwnPropertyKeys]]().
    //   4. For each element k of keys, do
    //     a. Let currentDesc be ? O.[[GetOwnProperty]](k).
    //     b. If currentDesc is not undefined, then
    //       i. If IsDataDescriptor(currentDesc) and currentDesc.[[Writable]] is true, return false.
    //       ii. If currentDesc.[[Configurable]] is true, return false.
    // DEVIATION: Rift checks writable on all properties, not just data descriptors.
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

    //   5. Return true.
    return Value(true);
}

// 20.1.2.14 Object.is ( value1, value2 )
// @spec https://tc39.es/ecma262/#sec-object.is
// Implements: SameValue ( x, y ) -- 7.2.11
// @spec https://tc39.es/ecma262/#sec-samevalue
Value Object::is(const CallContext& ctx, const std::vector<Value>& args) {
    // 1. If SameValue(value1, value2) is true, return true.
    // 2. Return false.
    Value x = args.size() > 0 ? args[0] : Value::undefined();
    Value y = args.size() > 1 ? args[1] : Value::undefined();

    // SameValue (7.2.11):
    // 1. If Type(x) is not Type(y), return false.
    // 2. If x is a Number, then
    //    a. Return Number::sameValue(x, y).
    // 3. Return SameValueNonNumber(x, y).

    // SameValueNonNumber handles undefined, null, strings, booleans, objects
    if(x.isUndefined() && y.isUndefined()) {
        return Value(true);
    }
    if(x.isNull() && y.isNull()) {
        return Value(true);
    }

    // Number::sameValue:
    // 1. If x is NaN and y is NaN, return true.
    // 2. If x is +0 and y is -0, return false.
    // 3. If x is -0 and y is +0, return false.
    // 4. If x is y, return true.
    // 5. Return false.
    if(x.isNumber() && y.isNumber()) {
        double xn = x.toNumber();
        double yn = y.toNumber();
        if(std::isnan(xn) && std::isnan(yn)) {
            return Value(true);
        }
        if(xn == 0.0 && yn == 0.0) {
            return Value(std::signbit(xn) == std::signbit(yn));
        }
        return Value(xn == yn);
    }
    if(x.isString() && y.isString()) {
        return Value(x.getString() == y.getString());
    }
    if(x.isBoolean() && y.isBoolean()) {
        return Value(x.toBool() == y.toBool());
    }
    // SameValueNonNumber: If x and y are the same Object value, return true.
    if((x.isObject() || x.isFunction()) && (y.isObject() || y.isFunction())) {
        return Value(x.getObject() == y.getObject());
    }
    // Different types or no match
    return Value(false);
}

// 20.1.2.13 Object.hasOwn ( O, P )
// @spec https://tc39.es/ecma262/#sec-object.hasown
Value Object::hasOwn(const CallContext& ctx, const std::vector<Value>& args) {
    // 1. Let obj be ? ToObject(O).
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

    // 2. Let key be ? ToPropertyKey(P).
    std::string prop_name = args[1].toString();

    // 3. Return ? HasOwnProperty(obj, key).
    return Value(obj->hasOwnProperty(prop_name));
}

// 20.1.2.7 Object.fromEntries ( iterable )
// @spec https://tc39.es/ecma262/#sec-object.fromentries
Value Object::fromEntries(const CallContext& ctx, const std::vector<Value>& args) {
    // 1. Perform ? RequireObjectCoercible(iterable).
    if(args.empty() || args[0].isUndefined() || args[0].isNull()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Cannot convert undefined or null to object"));
    }

    Value iterable = args[0];
    if(!iterable.isObject()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: iterable.@@iterator is not a function"));
    }

    // 2. Let obj be OrdinaryObjectCreate(%Object.prototype%).
    auto* result_obj = getObjectFactory()->createJSObject();
    rift::memory::GCProtector protect(result_obj, getObjectFactory()->getObjectManager());

    auto* iter_obj = iterable.getObject();

    // 3. Assert: obj is an extensible ordinary object with no own properties.
    // 4. Let closure be a new Abstract Closure with parameters (key, value) that ...
    //    (spec defines a callback to set properties)
    // 5. Let adder be CreateBuiltinFunction(closure, 2, "", ...).
    // 6. Return ? AddEntriesFromIterable(obj, iterable, adder).
    // SIMPLIFIED: Rift inlines the iteration instead of using AddEntriesFromIterable.

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

    // GetIterator: Call @@iterator to get the iterator object.
    rift::core::CallContext iter_ctx(rift::core::CallType::Function, iterable);
    Value iterator = iterator_func->call(iter_ctx, {});

    if(!iterator.isObject()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Result of the Symbol.iterator method is not an object"));
    }

    auto* iterator_object = iterator.getObject();

    // IteratorStep + IteratorValue loop
    while(true) {
        // IteratorStep: Call iterator.next()
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

        // IteratorComplete: If result.done is true, break.
        Value done = result_object->getProperty("done");
        if(done.toBool()) {
            break;
        }

        // IteratorValue: Get result.value
        Value entry = result_object->getProperty("value");
        if(!entry.isObject()) {
            throw rift::core::JavaScriptException(
                Value("TypeError: Iterator value is not an entry object"));
        }

        // Each entry must be an array-like [key, value]
        auto* entry_obj = entry.getObject();
        Value key = entry_obj->getProperty("0");
        Value value = entry_obj->getProperty("1");

        // CreateDataPropertyOnObject(obj, key, value)
        result_obj->setProperty(key.toString(), value);
    }

    return Value(result_obj);
}

// Object.groupBy ( items, callbackfn )
// @spec https://tc39.es/ecma262/#sec-object.groupby
Value Object::groupBy(const CallContext& ctx, const std::vector<Value>& args) {
    // 1. Let items be the first argument.
    // 2. Let callbackfn be the second argument.
    Value items = args.size() > 0 ? args[0] : Value::undefined();
    Value callback = args.size() > 1 ? args[1] : Value::undefined();

    // 3. If items is undefined or null, throw a TypeError.
    if(items.isUndefined() || items.isNull()) {
        throw rift::core::JavaScriptException(Value("TypeError: Cannot read properties of " +
                                                    items.toString() +
                                                    " (reading 'Symbol(Symbol.iterator)')"));
    }

    // 4. If IsCallable(callbackfn) is false, throw a TypeError.
    if(!callback.isFunction()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: " + callback.toString() + " is not a function"));
    }

    auto* callback_func = dynamic_cast<JSFunction*>(callback.getObject());
    if(!callback_func) {
        throw rift::core::JavaScriptException(Value("TypeError: callbackfn is not a function"));
    }

    // 5. Let groups be a new empty Map (we use an ordered map of key -> array).
    // 6. Let result be OrdinaryObjectCreate(null).
    auto* result = getObjectFactory()->createJSObject(nullptr);
    rift::memory::GCProtector protect(result, getObjectFactory()->getObjectManager());

    // Helper lambda to process a single element
    double index = 0;
    auto processElement = [&](const Value& value) {
        // Call callbackfn(value, index) with this = undefined
        rift::core::CallContext cb_ctx(rift::core::CallType::Function, Value::undefined());
        Value key_result = callback_func->call(cb_ctx, {value, Value(index)});

        // Coerce result to property key (string)
        std::string key = key_result.toString();

        // If key doesn't exist on result, create a new empty array
        if(!result->hasOwnProperty(key)) {
            auto* group_array = Array::createArrayObject(getObjectFactory(), {});
            result->setProperty(key, Value(group_array));
        }

        // Push value into that array
        Value group = result->getProperty(key);
        if(group.isObject()) {
            auto* group_obj = group.getObject();
            Value length_val = group_obj->getProperty("length");
            double length = length_val.toNumber();
            group_obj->setProperty(std::to_string(static_cast<int>(length)), value);
            group_obj->setProperty("length", Value(length + 1));
        }

        index++;
    };

    // String fast path: iterate characters directly
    // DEVIATION: Rift iterates bytes, not Unicode code points, matching for-of behavior.
    if(items.isString()) {
        std::string str = items.getString();
        for(char c : str) {
            processElement(Value(std::string(1, c)));
        }
        return Value(result);
    }

    // Get the iterator from items via Symbol.iterator protocol
    if(!items.isObject() && !items.isFunction()) {
        throw rift::core::JavaScriptException(Value("TypeError: items is not iterable"));
    }

    auto* items_obj = items.getObject();
    std::string iterator_key =
        rift::core::EvaluationUtils::symbolToPropertyKey(Symbol::getIteratorId());
    Value iterator_method = items_obj->getProperty(iterator_key);

    if(!iterator_method.isFunction()) {
        throw rift::core::JavaScriptException(Value(
            "TypeError: items is not iterable (cannot read property Symbol(Symbol.iterator))"));
    }

    auto* iterator_func = dynamic_cast<JSFunction*>(iterator_method.getObject());
    if(!iterator_func) {
        throw rift::core::JavaScriptException(Value("TypeError: items is not iterable"));
    }

    // Call @@iterator to get the iterator object
    rift::core::CallContext iter_ctx(rift::core::CallType::Function, items);
    Value iterator = iterator_func->call(iter_ctx, {});

    if(!iterator.isObject()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Result of the Symbol.iterator method is not an object"));
    }

    auto* iterator_object = iterator.getObject();

    // IteratorStep + IteratorValue loop
    while(true) {
        // IteratorStep: Call iterator.next()
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

        // IteratorComplete: If result.done is true, break.
        Value done = result_object->getProperty("done");
        if(done.toBool()) {
            break;
        }

        // IteratorValue: Get result.value
        Value value = result_object->getProperty("value");

        processElement(value);
    }

    return Value(result);
}

// 20.1.2.9 Object.getOwnPropertyDescriptors ( O )
// @spec https://tc39.es/ecma262/#sec-object.getownpropertydescriptors
Value Object::getOwnPropertyDescriptors(const CallContext& ctx, const std::vector<Value>& args) {
    // 1. Let obj be ? ToObject(O).
    if(args.empty()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Cannot convert undefined or null to object"));
    }

    Value obj_val = args[0];
    if(!obj_val.isObject() && !obj_val.isFunction()) {
        return Value(
            getObjectFactory()->createJSObject(rift::core::BuiltinManager::getObjectPrototype()));
    }

    auto* obj = obj_val.getObject();
    if(!obj) {
        return Value(
            getObjectFactory()->createJSObject(rift::core::BuiltinManager::getObjectPrototype()));
    }

    // 2. Let ownKeys be ? obj.[[OwnPropertyKeys]]().
    // 3. Let descriptors be OrdinaryObjectCreate(%Object.prototype%).
    auto* result =
        getObjectFactory()->createJSObject(rift::core::BuiltinManager::getObjectPrototype());
    rift::memory::GCProtector protect(result, getObjectFactory()->getObjectManager());

    // 4. For each element key of ownKeys, do
    //    a. Let desc be ? obj.[[GetOwnProperty]](key).
    //    b. Let descriptor be FromPropertyDescriptor(desc).
    //    c. If descriptor is not undefined,
    //       perform ! CreateDataPropertyOrThrow(descriptors, key, descriptor).

    // Process string-keyed own properties
    auto prop_names = obj->getOwnPropertyNames();
    for(const auto& prop_name : prop_names) {
        rift::runtime::PropertyDescriptor desc = obj->getOwnPropertyDescriptor(prop_name);

        // FromPropertyDescriptor (6.2.6.4)
        auto* descriptor_obj =
            getObjectFactory()->createJSObject(rift::core::BuiltinManager::getObjectPrototype());
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

        // FromPropertyDescriptor (6.2.6.4)
        auto* descriptor_obj =
            getObjectFactory()->createJSObject(rift::core::BuiltinManager::getObjectPrototype());
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

    // 5. Return descriptors.
    return Value(result);
}

}  // namespace rift::builtins
