#include "rift/builtins/reflect/reflect.h"

#include <cmath>

#include "rift/builtins/array/array.h"
#include "rift/builtins/builtin_base.h"
#include "rift/builtins/builtin_manager.h"
#include "rift/builtins/error/type_error.h"
#include "rift/builtins/object/object.h"
#include "rift/builtins/symbol/symbol.h"
#include "rift/interpreter/evaluation_utils.h"
#include "rift/interpreter/javascript_exception.h"
#include "rift/memory/gc_protector.h"

namespace rift::builtins {

using rift::core::EvaluationUtils::isSymbolPropertyKey;
using rift::core::EvaluationUtils::symbolIdFromPropertyKey;
using rift::core::EvaluationUtils::symbolToPropertyKey;
using rift::core::EvaluationUtils::toPropertyKeyString;

namespace {
rift::memory::ObjectFactory* object_factory = nullptr;
}

void Reflect::throwTypeError(const std::string& message) {
    throw rift::core::JavaScriptException(TypeError::constructor({Value(message)}));
}

JSObject* Reflect::requireObject(const std::vector<Value>& args, const char* method_name) {
    // Shared step 1 of every Reflect method: If target is not an Object, throw a TypeError.
    if(args.empty() || (!args[0].isObject() && !args[0].isFunction()) || !args[0].getObject()) {
        throwTypeError(std::string("Reflect.") + method_name + " called on non-object");
    }
    return args[0].getObject();
}

std::string Reflect::toPropertyKey(const Value& value) {
    // 7.1.19 ToPropertyKey ( argument )
    // @spec https://tc39.es/ecma262/#sec-topropertykey
    // Symbols become Rift's internal "@@sym:<id>" string keys.
    if(value.isSymbol()) {
        return symbolToPropertyKey(value.getSymbol().id);
    }
    return toPropertyKeyString(value);
}

Value Reflect::propertyKeyToValue(const std::string& key) {
    if(isSymbolPropertyKey(key)) {
        return Value::symbol(symbolIdFromPropertyKey(key));
    }
    return Value(key);
}

Value Reflect::objectGet(JSObject* obj, const std::string& key, const Value& receiver) {
    // 7.3.2 Get ( O, P ) with Receiver threading (OrdinaryGet, 10.1.8.1)
    // @spec https://tc39.es/ecma262/#sec-ordinaryget
    // A Proxy implements [[Get]] entirely inside getProperty (the trap handles
    // accessors itself), so don't pre-walk descriptors for exotic objects.
    if(obj->isProxy()) {
        return obj->getProperty(key, receiver);
    }

    auto [found, desc] = obj->findPropertyDescriptor(key);
    if(found && desc.is_accessor) {
        // Step 6-8: accessor property — call the getter with Receiver as this
        if(!desc.getter.isFunction()) {
            return Value::undefined();
        }
        auto* getter = dynamic_cast<JSFunction*>(desc.getter.getObject());
        if(!getter) {
            return Value::undefined();
        }
        rift::core::CallContext getter_ctx(rift::core::CallType::Function, receiver);
        return getter->call(getter_ctx, {});
    }
    return obj->getProperty(key, receiver);
}

bool Reflect::objectSet(JSObject* obj, const std::string& key, const Value& value,
                        const Value& receiver) {
    // 7.3.4 Set ( O, P, V ) / OrdinarySetWithOwnDescriptor (10.1.9.2)
    // @spec https://tc39.es/ecma262/#sec-ordinarysetwithowndescriptor
    if(obj->isProxy()) {
        return obj->setProperty(key, value, receiver);
    }

    // Step 1-2: find ownDesc, walking the prototype chain (OrdinarySet step 2:
    // parent.[[Set]](P, V, Receiver) — a Proxy in the chain takes over).
    PropertyDescriptor own_desc;
    bool has_own = false;
    for(JSObject* holder = obj; holder != nullptr; holder = holder->getPrototype()) {
        if(holder->isProxy()) {
            return holder->setProperty(key, value, receiver);
        }
        if(holder->hasOwnProperty(key)) {
            own_desc = holder->getOwnPropertyDescriptor(key);
            has_own = true;
            break;
        }
    }
    // Step 2.c: no existing property — behave as default data descriptor
    if(!has_own) {
        own_desc = PropertyDescriptor(Value::undefined(), true, true, true);
    }

    // Step 7: accessor property — call the setter with Receiver as this
    if(own_desc.is_accessor) {
        if(!own_desc.setter.isFunction()) {
            return false;
        }
        auto* setter = dynamic_cast<JSFunction*>(own_desc.setter.getObject());
        if(!setter) {
            return false;
        }
        rift::core::CallContext setter_ctx(rift::core::CallType::Function, receiver);
        setter->call(setter_ctx, {value});
        return true;
    }

    // Step 3: data property
    // Step 3.a: If ownDesc.[[Writable]] is false, return false.
    if(!own_desc.writable) {
        return false;
    }
    // Step 3.b: If Receiver is not an Object, return false.
    if(!receiver.isObject() && !receiver.isFunction()) {
        return false;
    }
    auto* receiver_obj = receiver.getObject();
    if(!receiver_obj) {
        return false;
    }
    // Step 3.c-d: existing own property on Receiver constrains the write.
    if(receiver_obj->hasOwnProperty(key)) {
        PropertyDescriptor existing = receiver_obj->getOwnPropertyDescriptor(key);
        // Step 3.d.i: Receiver's own property is an accessor — return false.
        if(existing.is_accessor) {
            return false;
        }
        // Step 3.d.ii: Receiver's own property is non-writable — return false.
        if(!existing.writable) {
            return false;
        }
        // Step 3.d.iv: define only [[Value]], keeping the other attributes.
        existing.value = value;
        return receiver_obj->defineProperty(key, existing);
    }
    // Step 3.e: CreateDataProperty(Receiver, P, V).
    return receiver_obj->setProperty(key, value);
}

std::vector<Value> Reflect::createListFromArrayLike(const Value& array_like) {
    // 7.3.19 CreateListFromArrayLike ( obj )
    // @spec https://tc39.es/ecma262/#sec-createlistfromarraylike
    // Step 2: If obj is not an Object, throw a TypeError.
    if((!array_like.isObject() && !array_like.isFunction()) || !array_like.getObject()) {
        throwTypeError("CreateListFromArrayLike called on non-object");
    }
    auto* obj = array_like.getObject();

    // Step 3: Let len be ? LengthOfArrayLike(obj) — ToLength(Get(obj, "length")).
    // ToLength (7.1.20): ToIntegerOrInfinity, clamped to [0, 2^53-1].
    double len_num = objectGet(obj, "length", array_like).toIntegerOrInfinity();
    if(len_num < 0 || std::isnan(len_num)) {
        len_num = 0;
    }
    if(len_num > 9007199254740991.0) {
        len_num = 9007199254740991.0;
    }
    auto len = static_cast<size_t>(len_num);

    // Steps 4-6: collect elements 0..len-1 (getter-aware reads)
    std::vector<Value> list;
    list.reserve(len);
    for(size_t i = 0; i < len; ++i) {
        list.push_back(objectGet(obj, std::to_string(i), array_like));
    }
    return list;
}

Value Reflect::constructObject(JSFunction* target, const std::vector<Value>& args,
                               JSFunction* new_target) {
    // 7.3.14 Construct ( F, argumentsList [ , newTarget ] )
    // @spec https://tc39.es/ecma262/#sec-construct
    // [[Construct]] step 3a: OrdinaryCreateFromConstructor(newTarget) — the
    // instance prototype comes from newTarget, not target.
    Value proto_value = new_target->getProperty("prototype");
    JSObject* prototype = nullptr;
    if(proto_value.isObject()) {
        prototype = proto_value.getObject();
    }

    auto* new_obj = object_factory->createJSObject(prototype);
    rift::memory::GCProtector protect(new_obj, object_factory->getObjectManager());

    // SIMPLIFIED: newTarget is not observable inside the constructor body
    // (Rift's CallContext has no [[NewTarget]] slot / new.target support).
    rift::core::CallContext ctor_context(rift::core::CallType::Constructor, Value(new_obj));
    Value result = target->call(ctor_context, args);

    // [[Construct]] step 8: if the constructor returned an object, use it.
    if(result.isObject() || result.isFunction()) {
        return result;
    }
    // Step 9: otherwise return the created instance.
    return Value(new_obj);
}

// 28.1.1 Reflect.apply ( target, thisArgument, argumentsList )
// @spec https://tc39.es/ecma262/#sec-reflect.apply
Value Reflect::apply(const CallContext& ctx, const std::vector<Value>& args) {
    // Step 1: If IsCallable(target) is false, throw a TypeError.
    if(args.empty() || !args[0].isFunction()) {
        throwTypeError("Reflect.apply target is not a function");
    }
    auto* target = dynamic_cast<JSFunction*>(args[0].getObject());
    if(!target) {
        throwTypeError("Reflect.apply target is not a function");
    }

    // Step 2: Let args be ? CreateListFromArrayLike(argumentsList).
    std::vector<Value> arg_list =
        createListFromArrayLike(args.size() > 2 ? args[2] : Value::undefined());

    // Step 4: Return ? Call(target, thisArgument, args).
    Value this_arg = args.size() > 1 ? args[1] : Value::undefined();
    rift::core::CallContext call_ctx(rift::core::CallType::Function, this_arg);
    return target->call(call_ctx, arg_list);
}

// 28.1.2 Reflect.construct ( target, argumentsList [ , newTarget ] )
// @spec https://tc39.es/ecma262/#sec-reflect.construct
Value Reflect::construct(const CallContext& ctx, const std::vector<Value>& args) {
    // Step 1: If IsConstructor(target) is false, throw a TypeError.
    if(args.empty() || !args[0].isFunction()) {
        throwTypeError("Reflect.construct target is not a constructor");
    }
    auto* target = dynamic_cast<JSFunction*>(args[0].getObject());
    if(!target || !target->isConstructor()) {
        throwTypeError("Reflect.construct target is not a constructor");
    }

    // Step 2-3: newTarget defaults to target; must be a constructor if present.
    JSFunction* new_target = target;
    if(args.size() > 2) {
        if(!args[2].isFunction()) {
            throwTypeError("Reflect.construct newTarget is not a constructor");
        }
        new_target = dynamic_cast<JSFunction*>(args[2].getObject());
        if(!new_target || !new_target->isConstructor()) {
            throwTypeError("Reflect.construct newTarget is not a constructor");
        }
    }

    // Step 4: Let args be ? CreateListFromArrayLike(argumentsList).
    std::vector<Value> arg_list =
        createListFromArrayLike(args.size() > 1 ? args[1] : Value::undefined());

    // Step 5: Return ? Construct(target, args, newTarget).
    return constructObject(target, arg_list, new_target);
}

// 28.1.3 Reflect.defineProperty ( target, propertyKey, attributes )
// @spec https://tc39.es/ecma262/#sec-reflect.defineproperty
Value Reflect::defineProperty(const CallContext& ctx, const std::vector<Value>& args) {
    // Step 1: If target is not an Object, throw a TypeError.
    requireObject(args, "defineProperty");

    // Step 3 precondition: ToPropertyDescriptor throws if attributes is not an Object.
    Value attributes = args.size() > 2 ? args[2] : Value::undefined();
    if(!attributes.isObject() && !attributes.isFunction()) {
        throwTypeError("Reflect.defineProperty attributes must be an object");
    }

    // Steps 2-4: delegate to Object.defineProperty's ToPropertyDescriptor +
    // [[DefineOwnProperty]] logic, mapping its throw-on-failure to `false`.
    // Symbol keys are pre-converted to internal key strings, which round-trip
    // through Object.defineProperty's toString() unchanged.
    std::string key = toPropertyKey(args.size() > 1 ? args[1] : Value::undefined());
    try {
        Object::defineProperty(ctx, {args[0], Value(key), attributes});
        return Value(true);
    } catch(const rift::core::JavaScriptException& e) {
        // Only the DefinePropertyOrThrow failure becomes `false`; abrupt
        // completions from ToPropertyDescriptor (e.g. a throwing getter on the
        // attributes object) must propagate.
        if(e.getValue().isString() &&
           e.getValue().getString().rfind("TypeError: Cannot define property", 0) == 0) {
            return Value(false);
        }
        throw;
    }
}

// 28.1.4 Reflect.deleteProperty ( target, propertyKey )
// @spec https://tc39.es/ecma262/#sec-reflect.deleteproperty
Value Reflect::deleteProperty(const CallContext& ctx, const std::vector<Value>& args) {
    auto* target = requireObject(args, "deleteProperty");
    std::string key = toPropertyKey(args.size() > 1 ? args[1] : Value::undefined());
    // Steps 2-3: Return ? target.[[Delete]](key).
    return Value(target->deleteProperty(key));
}

// 28.1.5 Reflect.get ( target, propertyKey [ , receiver ] )
// @spec https://tc39.es/ecma262/#sec-reflect.get
Value Reflect::get(const CallContext& ctx, const std::vector<Value>& args) {
    auto* target = requireObject(args, "get");
    std::string key = toPropertyKey(args.size() > 1 ? args[1] : Value::undefined());
    // Step 3: If receiver is not present, set receiver to target.
    Value receiver = args.size() > 2 ? args[2] : args[0];
    // Step 4: Return ? target.[[Get]](key, receiver).
    return objectGet(target, key, receiver);
}

// 28.1.6 Reflect.getOwnPropertyDescriptor ( target, propertyKey )
// @spec https://tc39.es/ecma262/#sec-reflect.getownpropertydescriptor
Value Reflect::getOwnPropertyDescriptor(const CallContext& ctx, const std::vector<Value>& args) {
    requireObject(args, "getOwnPropertyDescriptor");
    std::string key = toPropertyKey(args.size() > 1 ? args[1] : Value::undefined());
    // Steps 2-3: delegate to Object.getOwnPropertyDescriptor (same
    // [[GetOwnProperty]] + FromPropertyDescriptor logic).
    return Object::getOwnPropertyDescriptor(ctx, {args[0], Value(key)});
}

// 28.1.7 Reflect.getPrototypeOf ( target )
// @spec https://tc39.es/ecma262/#sec-reflect.getprototypeof
Value Reflect::getPrototypeOf(const CallContext& ctx, const std::vector<Value>& args) {
    auto* target = requireObject(args, "getPrototypeOf");
    // Step 2: Return ? target.[[GetPrototypeOf]]().
    JSObject* proto = target->getPrototype();
    if(!proto) {
        return Value::null();
    }
    return Value(proto);
}

// 28.1.8 Reflect.has ( target, propertyKey )
// @spec https://tc39.es/ecma262/#sec-reflect.has
Value Reflect::has(const CallContext& ctx, const std::vector<Value>& args) {
    auto* target = requireObject(args, "has");
    std::string key = toPropertyKey(args.size() > 1 ? args[1] : Value::undefined());
    // Steps 2-3: Return ? target.[[HasProperty]](key).
    return Value(target->hasProperty(key));
}

// 28.1.9 Reflect.isExtensible ( target )
// @spec https://tc39.es/ecma262/#sec-reflect.isextensible
Value Reflect::isExtensible(const CallContext& ctx, const std::vector<Value>& args) {
    auto* target = requireObject(args, "isExtensible");
    // Step 2: Return ? target.[[IsExtensible]]().
    return Value(target->isExtensible());
}

// 28.1.10 Reflect.ownKeys ( target )
// @spec https://tc39.es/ecma262/#sec-reflect.ownkeys
Value Reflect::ownKeys(const CallContext& ctx, const std::vector<Value>& args) {
    auto* target = requireObject(args, "ownKeys");
    // Step 2: Let keys be ? target.[[OwnPropertyKeys]]().
    std::vector<Value> keys;
    for(const auto& key : target->getOwnPropertyKeys()) {
        keys.push_back(propertyKeyToValue(key));
    }
    // Step 3: Return CreateArrayFromList(keys).
    return Value(Array::createArrayObject(object_factory, keys));
}

// 28.1.11 Reflect.preventExtensions ( target )
// @spec https://tc39.es/ecma262/#sec-reflect.preventextensions
Value Reflect::preventExtensions(const CallContext& ctx, const std::vector<Value>& args) {
    auto* target = requireObject(args, "preventExtensions");
    // Step 2: Return ? target.[[PreventExtensions]]().
    target->preventExtensions();
    return Value(true);
}

// 28.1.12 Reflect.set ( target, propertyKey, V [ , receiver ] )
// @spec https://tc39.es/ecma262/#sec-reflect.set
Value Reflect::set(const CallContext& ctx, const std::vector<Value>& args) {
    auto* target = requireObject(args, "set");
    std::string key = toPropertyKey(args.size() > 1 ? args[1] : Value::undefined());
    Value value = args.size() > 2 ? args[2] : Value::undefined();
    // Step 3: If receiver is not present, set receiver to target.
    Value receiver = args.size() > 3 ? args[3] : args[0];
    // Step 4: Return ? target.[[Set]](key, V, receiver).
    return Value(objectSet(target, key, value, receiver));
}

// 28.1.13 Reflect.setPrototypeOf ( target, proto )
// @spec https://tc39.es/ecma262/#sec-reflect.setprototypeof
Value Reflect::setPrototypeOf(const CallContext& ctx, const std::vector<Value>& args) {
    auto* target = requireObject(args, "setPrototypeOf");

    // Step 2: If proto is not an Object and proto is not null, throw a TypeError.
    Value proto_val = args.size() > 1 ? args[1] : Value::undefined();
    JSObject* proto = nullptr;
    if(proto_val.isObject() || proto_val.isFunction()) {
        proto = proto_val.getObject();
    } else if(!proto_val.isNull()) {
        throwTypeError("Reflect.setPrototypeOf proto must be an object or null");
    }

    // Step 3: Return ? target.[[SetPrototypeOf]](proto).
    // OrdinarySetPrototypeOf (10.1.2.1):
    // Step 4: If current and proto are the same, return true.
    if(target->getPrototype() == proto) {
        return Value(true);
    }
    // Step 5: If extensible is false, return false.
    if(!target->isExtensible()) {
        return Value(false);
    }
    // Step 8: Reject prototype chain cycles.
    for(JSObject* p = proto; p != nullptr; p = p->getPrototype()) {
        if(p == target) {
            return Value(false);
        }
        // Walking stops at exotic objects whose [[GetPrototypeOf]] is not
        // the ordinary one (per spec step 8.c.i) — Proxy handles this itself.
        if(p->isProxy()) {
            break;
        }
    }
    target->setPrototype(proto);
    return Value(true);
}

JSObject* Reflect::create(rift::memory::ObjectFactory* factory) {
    object_factory = factory;

    auto* reflect = factory->createJSObject(rift::core::BuiltinManager::getObjectPrototype());
    rift::memory::GCProtector protect(reflect, factory->getObjectManager());

    // 28.1 Function Properties of the Reflect Object
    RIFT_METHOD(reflect, "apply", 3, Reflect::apply);
    RIFT_METHOD(reflect, "construct", 2, Reflect::construct);
    RIFT_METHOD(reflect, "defineProperty", 3, Reflect::defineProperty);
    RIFT_METHOD(reflect, "deleteProperty", 2, Reflect::deleteProperty);
    RIFT_METHOD(reflect, "get", 2, Reflect::get);
    RIFT_METHOD(reflect, "getOwnPropertyDescriptor", 2, Reflect::getOwnPropertyDescriptor);
    RIFT_METHOD(reflect, "getPrototypeOf", 1, Reflect::getPrototypeOf);
    RIFT_METHOD(reflect, "has", 2, Reflect::has);
    RIFT_METHOD(reflect, "isExtensible", 1, Reflect::isExtensible);
    RIFT_METHOD(reflect, "ownKeys", 1, Reflect::ownKeys);
    RIFT_METHOD(reflect, "preventExtensions", 1, Reflect::preventExtensions);
    RIFT_METHOD(reflect, "set", 3, Reflect::set);
    RIFT_METHOD(reflect, "setPrototypeOf", 2, Reflect::setPrototypeOf);

    // 28.1.14 Reflect [ @@toStringTag ] = "Reflect"
    // { [[Writable]]: false, [[Enumerable]]: false, [[Configurable]]: true }
    reflect->defineProperty(symbolToPropertyKey(Symbol::getToStringTagId()),
                            PropertyDescriptor(Value(std::string("Reflect")), false, false, true));

    return reflect;
}

}  // namespace rift::builtins
