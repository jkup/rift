#include "rift/builtins/object/object.h"

#include <algorithm>

#include "rift/builtins/array/array.h"
#include "rift/builtins/boolean/boolean.h"
#include "rift/builtins/string/string.h"
#include "rift/core/engine/evaluation_utils.h"
#include "rift/core/engine/builtin_manager.h"
#include "rift/memory/gc_protector.h"

namespace rift::builtins {

void Object::setupStaticMethods(JSObject* constructor, rift::memory::ObjectFactory* factory) {
    // Add Object static methods
    constructor->setProperty("keys", Value(factory->createJSFunction(Object::keys)));
    constructor->setProperty("values", Value(factory->createJSFunction(Object::values)));
    constructor->setProperty("entries", Value(factory->createJSFunction(Object::entries)));
}

void Object::setupPrototypeMethods(JSObject* prototype, rift::memory::ObjectFactory* factory) {
    // Add Object.prototype methods
    prototype->setProperty("toString", Value(factory->createJSFunction(Object::toString)));
    prototype->setProperty("valueOf", Value(factory->createJSFunction(Object::valueOf)));
    prototype->setProperty("hasOwnProperty",
                           Value(factory->createJSFunction(Object::hasOwnProperty)));
}

Value Object::constructor(const std::vector<Value>& args) {
    // With CallContext migration, args are the real constructor arguments

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
        
        return Value(stringObj);  // stringObj is now raw pointer with String.prototype
    }

    if(arg.isBoolean()) {
        // Convert boolean primitive to Boolean object with proper prototype chain
        auto* booleanPrototype = rift::core::BuiltinManager::getBooleanPrototype();
        auto* booleanObj = getObjectFactory()->createJSObject(booleanPrototype);
        
        // Protect from GC during initialization
        rift::memory::GCProtector protect(booleanObj, getObjectFactory()->getObjectManager());
        
        // Store the primitive boolean value (following Boolean constructor pattern)
        booleanObj->setProperty("value", arg);

        return Value(booleanObj);  // booleanObj is now raw pointer with Boolean.prototype
    }

    if(arg.isNumber()) {
        // Convert number primitive to Number-like object (no Number.prototype yet)
        auto* numberObj = getObjectFactory()->createJSObject();
        
        // Protect from GC during initialization
        rift::memory::GCProtector protect(numberObj, getObjectFactory()->getObjectManager());
        
        numberObj->setProperty("value", arg);
        // Add basic Number methods since we don't have Number.prototype yet
        auto toStringFn = [](const std::vector<Value>& args) -> Value {
            if(!args.empty() && args[0].isObject()) {
                auto* obj = args[0].getObject();
                if(obj) {
                    Value val = obj->getProperty("value");
                    if(val.isNumber()) {
                        return Value(val.toString());
                    }
                }
            }
            return Value("0");
        };
        auto valueOfFn = [](const std::vector<Value>& args) -> Value {
            if(!args.empty() && args[0].isObject()) {
                auto* obj = args[0].getObject();
                if(obj) {
                    Value val = obj->getProperty("value");
                    if(val.isNumber()) {
                        return val;
                    }
                }
            }
            return Value(0.0);
        };

        // Create both functions and protect them during property assignment
        auto* toStringFunc = getObjectFactory()->createJSFunction(toStringFn);
        rift::memory::GCProtector protectToString(toStringFunc, getObjectFactory()->getObjectManager());
        
        auto* valueOfFunc = getObjectFactory()->createJSFunction(valueOfFn);
        rift::memory::GCProtector protectValueOf(valueOfFunc, getObjectFactory()->getObjectManager());
        
        numberObj->setProperty("toString", Value(toStringFunc));
        numberObj->setProperty("valueOf", Value(valueOfFunc));

        return Value(numberObj);  // numberObj is now raw pointer
    }

    // For null, undefined, or other types, create plain object
    return Value(getObjectFactory()->createJSObject());
}

Value Object::keys(const std::vector<Value>& args) {
    if(args.size() < 2) {  // args[0] is 'this', args[1] is the object
        return Value(Array::createArrayObject(getObjectFactory(), {}));
    }

    Value obj = args[1];
    if(!obj.isObject()) {
        return Value(Array::createArrayObject(getObjectFactory(), {}));
    }

    auto* jsObj = obj.getObject();  // getObject() now returns raw pointer
    if(!jsObj) {
        return Value(Array::createArrayObject(getObjectFactory(), {}));
    }

    // Get only own property names (not inherited prototype properties)
    std::vector<Value> keys;
    auto propertyNames = jsObj->getOwnPropertyNames();
    for(const auto& propName : propertyNames) {
        keys.push_back(Value(propName));
    }

    return Value(Array::createArrayObject(getObjectFactory(), keys));
}

Value Object::values(const std::vector<Value>& args) {
    if(args.size() < 2) {  // args[0] is 'this', args[1] is the object
        return Value(Array::createArrayObject(getObjectFactory(), {}));
    }

    Value obj = args[1];
    if(!obj.isObject()) {
        return Value(Array::createArrayObject(getObjectFactory(), {}));
    }

    auto* jsObj = obj.getObject();  // getObject() now returns raw pointer
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

Value Object::entries(const std::vector<Value>& args) {
    if(args.size() < 2) {  // args[0] is 'this', args[1] is the object
        return Value(Array::createArrayObject(getObjectFactory(), {}));
    }

    Value obj = args[1];
    if(!obj.isObject()) {
        return Value(Array::createArrayObject(getObjectFactory(), {}));
    }

    auto* jsObj = obj.getObject();  // getObject() now returns raw pointer
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

Value Object::toString(const std::vector<Value>& args) {
    // Default toString implementation
    return Value("[object Object]");
}

Value Object::valueOf(const std::vector<Value>& args) {
    // Default valueOf implementation - return the object itself
    if(!args.empty() && (args[0].isObject() || args[0].isFunction())) {
        return args[0];
    }
    return Value(getObjectFactory()->createJSObject());  // Use factory instead of std::make_shared
}

Value Object::hasOwnProperty(const std::vector<Value>& args) {
    if(args.size() < 2) {
        return Value(false);
    }

    Value thisValue = args[0];
    Value propertyName = args[1];

    if(!thisValue.isObject() && !thisValue.isFunction()) {
        return Value(false);
    }

    auto* obj = thisValue.getObject();  // getObject() now returns raw pointer
    if(!obj) {
        return Value(false);
    }

    std::string propName = propertyName.toString();

    // ECMAScript spec: hasOwnProperty() checks only own properties, not inherited ones
    // Use getOwnPropertyNames() to check only own properties, excluding prototype chain
    auto ownPropertyNames = obj->getOwnPropertyNames();
    bool hasOwnProperty = std::find(ownPropertyNames.begin(), ownPropertyNames.end(), propName) !=
                          ownPropertyNames.end();

    return Value(hasOwnProperty);
}

}  // namespace rift::builtins