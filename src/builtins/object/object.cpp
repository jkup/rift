#include "rift/builtins/object/object.h"

#include <algorithm>

#include "rift/builtins/array/array.h"
#include "rift/builtins/boolean/boolean.h"
#include "rift/builtins/string/string.h"
#include "rift/core/engine/evaluation_utils.h"

namespace rift::builtins {

// Static factory storage
rift::memory::ObjectFactory* Object::object_factory_ = nullptr;

void Object::setObjectFactory(rift::memory::ObjectFactory* factory) {
    object_factory_ = factory;
}

JSObject* Object::create(rift::memory::ObjectFactory* factory) {
    // Store factory for use in other methods
    setObjectFactory(factory);

    // Create Object constructor using GC-managed creation
    auto* object = factory->createJSFunction(Object::constructor);

    // Add static methods using GC-managed function creation
    object->setProperty("keys", Value(factory->createJSFunction(Object::keys)));
    object->setProperty("values", Value(factory->createJSFunction(Object::values)));
    object->setProperty("entries", Value(factory->createJSFunction(Object::entries)));

    // Create and set prototype
    auto* prototype = createPrototype(factory);
    object->setProperty("prototype", Value(prototype));  // prototype is now raw pointer

    return object;  // Return raw pointer
}

JSObject* Object::createPrototype(rift::memory::ObjectFactory* factory) {
    // Create Object.prototype using GC-managed creation
    auto* prototype = factory->createJSObject();

    // Add prototype methods using GC-managed function creation
    prototype->setProperty("toString", Value(factory->createJSFunction(Object::toString)));
    prototype->setProperty("valueOf", Value(factory->createJSFunction(Object::valueOf)));
    prototype->setProperty("hasOwnProperty",
                           Value(factory->createJSFunction(Object::hasOwnProperty)));

    return prototype;  // Return raw pointer
}

Value Object::constructor(const std::vector<Value>& args) {
    // Skip constructor marker if present
    size_t argOffset = 0;
    if(!args.empty() && args[0].isString() &&
       args[0].getString() == rift::core::EvaluationConstants::CONSTRUCTOR_CALL_MARKER) {
        argOffset = 2;  // Skip the constructor marker and the 'this' object
    }

    // Object constructor - create new object
    if(args.size() <= argOffset) {
        // Always use factory for consistent GC management
        return Value(object_factory_->createJSObject());
    }

    // Convert argument to object
    Value arg = args[argOffset];
    if(arg.isObject()) {
        return arg;
    }

    // Handle primitive to object conversion according to ECMAScript spec
    if(arg.isString()) {
        // Convert string primitive to String object
        auto* stringObj = object_factory_->createJSObject();
        // Store the primitive string value (following similar pattern to Boolean)
        stringObj->setProperty("value", arg);
        // Add basic String methods
        auto toStringFn = [](const std::vector<Value>& args) -> Value {
            if(!args.empty() && args[0].isObject()) {
                auto* obj = args[0].getObject();
                if(obj) {
                    Value val = obj->getProperty("value");
                    if(val.isString()) {
                        return val;
                    }
                }
            }
            return Value("");
        };
        auto valueOfFn = [](const std::vector<Value>& args) -> Value {
            if(!args.empty() && args[0].isObject()) {
                auto* obj = args[0].getObject();
                if(obj) {
                    Value val = obj->getProperty("value");
                    if(val.isString()) {
                        return val;
                    }
                }
            }
            return Value("");
        };

        stringObj->setProperty("toString", Value(object_factory_->createJSFunction(toStringFn)));
        stringObj->setProperty("valueOf", Value(object_factory_->createJSFunction(valueOfFn)));

        return Value(stringObj);  // stringObj is now raw pointer
    }

    if(arg.isBoolean()) {
        // Convert boolean primitive to Boolean object
        auto* booleanObj = object_factory_->createJSObject();
        // Store the primitive boolean value (following Boolean constructor pattern)
        booleanObj->setProperty("value", arg);
        // Add basic Boolean methods
        auto toStringFn = [](const std::vector<Value>& args) -> Value {
            if(!args.empty() && args[0].isObject()) {
                auto* obj = args[0].getObject();
                if(obj) {
                    Value val = obj->getProperty("value");
                    if(val.isBoolean()) {
                        return Value(val.getBool() ? "true" : "false");
                    }
                }
            }
            return Value("false");
        };
        auto valueOfFn = [](const std::vector<Value>& args) -> Value {
            if(!args.empty() && args[0].isObject()) {
                auto* obj = args[0].getObject();
                if(obj) {
                    Value val = obj->getProperty("value");
                    if(val.isBoolean()) {
                        return val;
                    }
                }
            }
            return Value(false);
        };

        booleanObj->setProperty("toString", Value(object_factory_->createJSFunction(toStringFn)));
        booleanObj->setProperty("valueOf", Value(object_factory_->createJSFunction(valueOfFn)));

        return Value(booleanObj);  // booleanObj is now raw pointer
    }

    if(arg.isNumber()) {
        // Convert number primitive to Number-like object
        auto* numberObj = object_factory_->createJSObject();
        numberObj->setProperty("value", arg);
        // Add basic Number methods
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

        numberObj->setProperty("toString", Value(object_factory_->createJSFunction(toStringFn)));
        numberObj->setProperty("valueOf", Value(object_factory_->createJSFunction(valueOfFn)));

        return Value(numberObj);  // numberObj is now raw pointer
    }

    // For null, undefined, or other types, create plain object
    return Value(object_factory_->createJSObject());
}

Value Object::keys(const std::vector<Value>& args) {
    if(args.size() < 2) {  // args[0] is 'this', args[1] is the object
        return Value(Array::createArrayObject(object_factory_, {}));
    }

    Value obj = args[1];
    if(!obj.isObject()) {
        return Value(Array::createArrayObject(object_factory_, {}));
    }

    auto* jsObj = obj.getObject();  // getObject() now returns raw pointer
    if(!jsObj) {
        return Value(Array::createArrayObject(object_factory_, {}));
    }

    // Get only own property names (not inherited prototype properties)
    std::vector<Value> keys;
    auto propertyNames = jsObj->getOwnPropertyNames();
    for(const auto& propName : propertyNames) {
        keys.push_back(Value(propName));
    }

    return Value(Array::createArrayObject(object_factory_, keys));
}

Value Object::values(const std::vector<Value>& args) {
    if(args.size() < 2) {  // args[0] is 'this', args[1] is the object
        return Value(Array::createArrayObject(object_factory_, {}));
    }

    Value obj = args[1];
    if(!obj.isObject()) {
        return Value(Array::createArrayObject(object_factory_, {}));
    }

    auto* jsObj = obj.getObject();  // getObject() now returns raw pointer
    if(!jsObj) {
        return Value(Array::createArrayObject(object_factory_, {}));
    }

    // Get only own property values (not inherited prototype properties)
    std::vector<Value> values;
    auto propertyNames = jsObj->getOwnPropertyNames();
    for(const auto& propName : propertyNames) {
        values.push_back(jsObj->getProperty(propName));
    }

    return Value(Array::createArrayObject(object_factory_, values));
}

Value Object::entries(const std::vector<Value>& args) {
    if(args.size() < 2) {  // args[0] is 'this', args[1] is the object
        return Value(Array::createArrayObject(object_factory_, {}));
    }

    Value obj = args[1];
    if(!obj.isObject()) {
        return Value(Array::createArrayObject(object_factory_, {}));
    }

    auto* jsObj = obj.getObject();  // getObject() now returns raw pointer
    if(!jsObj) {
        return Value(Array::createArrayObject(object_factory_, {}));
    }

    // Get only own [key, value] pairs (not inherited prototype properties)
    std::vector<Value> entries;
    auto propertyNames = jsObj->getOwnPropertyNames();
    for(const auto& propName : propertyNames) {
        std::vector<Value> entry = {Value(propName), jsObj->getProperty(propName)};
        entries.push_back(Value(Array::createArrayObject(object_factory_, entry)));
    }

    return Value(Array::createArrayObject(object_factory_, entries));
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
    return Value(object_factory_->createJSObject());  // Use factory instead of std::make_shared
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