#include "rift/builtins/object/object.h"

#include "rift/builtins/array/array.h"
#include "rift/builtins/string/string.h"
#include "rift/builtins/boolean/boolean.h"
#include <algorithm>

namespace rift::builtins {

// Static factory storage
rift::memory::ObjectFactory* Object::object_factory_ = nullptr;

void Object::setObjectFactory(rift::memory::ObjectFactory* factory) {
    object_factory_ = factory;
}

std::shared_ptr<JSObject> Object::create(rift::memory::ObjectFactory* factory) {
    // Create Object constructor using GC-managed creation
    auto object = factory->createJSFunction(Object::constructor);

    // Add static methods using GC-managed function creation
    object->setProperty("keys", Value(factory->createJSFunction(Object::keys)));
    object->setProperty("values", Value(factory->createJSFunction(Object::values)));
    object->setProperty("entries", Value(factory->createJSFunction(Object::entries)));

    // Create and set prototype
    auto prototype = createPrototype(factory);
    object->setProperty("prototype", Value(prototype));

    return object;
}

std::shared_ptr<JSObject> Object::createPrototype(rift::memory::ObjectFactory* factory) {
    // Create Object.prototype using GC-managed creation
    auto prototype = factory->createJSObject();

    // Add prototype methods using GC-managed function creation
    prototype->setProperty("toString", Value(factory->createJSFunction(Object::toString)));
    prototype->setProperty("valueOf", Value(factory->createJSFunction(Object::valueOf)));
    prototype->setProperty("hasOwnProperty", Value(factory->createJSFunction(Object::hasOwnProperty)));

    return prototype;
}

Value Object::constructor(const std::vector<Value>& args) {
    // Object constructor - create new object
    if (args.empty()) {
        // Use factory when available in constructor context
        if (object_factory_) {
            return Value(object_factory_->createJSObject());
        }
        return Value(std::make_shared<JSObject>());
    }
    
    // Convert argument to object
    Value arg = args[0];
    if (arg.isObject()) {
        return arg;
    }
    
    // Handle primitive to object conversion according to ECMAScript spec
    if (arg.isString()) {
        // Convert string primitive to String object
        // Create String object manually since constructor is private
        auto stringObj = object_factory_ ? object_factory_->createJSObject() 
                                         : std::make_shared<JSObject>();
        // Store the primitive string value (following similar pattern to Boolean)
        stringObj->setProperty("value", arg);
        // Add basic String methods
        auto toStringFn = [](const std::vector<Value>& args) -> Value {
            if (!args.empty() && args[0].isObject()) {
                auto obj = args[0].getObject();
                if (obj) {
                    Value val = obj->getProperty("value");
                    if (val.isString()) {
                        return val;
                    }
                }
            }
            return Value("");
        };
        auto valueOfFn = [](const std::vector<Value>& args) -> Value {
            if (!args.empty() && args[0].isObject()) {
                auto obj = args[0].getObject();
                if (obj) {
                    Value val = obj->getProperty("value");
                    if (val.isString()) {
                        return val;
                    }
                }
            }
            return Value("");
        };
        
        if (object_factory_) {
            stringObj->setProperty("toString", Value(object_factory_->createJSFunction(toStringFn)));
            stringObj->setProperty("valueOf", Value(object_factory_->createJSFunction(valueOfFn)));
        } else {
            stringObj->setProperty("toString", Value(std::make_shared<JSFunction>(toStringFn)));
            stringObj->setProperty("valueOf", Value(std::make_shared<JSFunction>(valueOfFn)));
        }
        
        return Value(stringObj);
    }
    
    if (arg.isBoolean()) {
        // Convert boolean primitive to Boolean object  
        // Create Boolean object manually since constructor is private
        auto booleanObj = object_factory_ ? object_factory_->createJSObject() 
                                          : std::make_shared<JSObject>();
        // Store the primitive boolean value (following Boolean constructor pattern)
        booleanObj->setProperty("value", arg);
        // Add basic Boolean methods
        auto toStringFn = [](const std::vector<Value>& args) -> Value {
            if (!args.empty() && args[0].isObject()) {
                auto obj = args[0].getObject();
                if (obj) {
                    Value val = obj->getProperty("value");
                    if (val.isBoolean()) {
                        return Value(val.getBool() ? "true" : "false");
                    }
                }
            }
            return Value("false");
        };
        auto valueOfFn = [](const std::vector<Value>& args) -> Value {
            if (!args.empty() && args[0].isObject()) {
                auto obj = args[0].getObject();
                if (obj) {
                    Value val = obj->getProperty("value");
                    if (val.isBoolean()) {
                        return val;
                    }
                }
            }
            return Value(false);
        };
        
        if (object_factory_) {
            booleanObj->setProperty("toString", Value(object_factory_->createJSFunction(toStringFn)));
            booleanObj->setProperty("valueOf", Value(object_factory_->createJSFunction(valueOfFn)));
        } else {
            booleanObj->setProperty("toString", Value(std::make_shared<JSFunction>(toStringFn)));
            booleanObj->setProperty("valueOf", Value(std::make_shared<JSFunction>(valueOfFn)));
        }
        
        return Value(booleanObj);
    }
    
    if (arg.isNumber()) {
        // Convert number primitive to Number-like object
        // Since we don't have a Number constructor yet, create a simple wrapper
        auto numberObj = object_factory_ ? object_factory_->createJSObject() 
                                         : std::make_shared<JSObject>();
        numberObj->setProperty("value", arg);
        // Add basic Number methods
        auto toStringFn = [](const std::vector<Value>& args) -> Value {
            if (!args.empty() && args[0].isObject()) {
                auto obj = args[0].getObject();
                if (obj) {
                    Value val = obj->getProperty("value");
                    if (val.isNumber()) {
                        return Value(val.toString());
                    }
                }
            }
            return Value("0");
        };
        auto valueOfFn = [](const std::vector<Value>& args) -> Value {
            if (!args.empty() && args[0].isObject()) {
                auto obj = args[0].getObject();
                if (obj) {
                    Value val = obj->getProperty("value");
                    if (val.isNumber()) {
                        return val;
                    }
                }
            }
            return Value(0.0);
        };
        
        if (object_factory_) {
            numberObj->setProperty("toString", Value(object_factory_->createJSFunction(toStringFn)));
            numberObj->setProperty("valueOf", Value(object_factory_->createJSFunction(valueOfFn)));
        } else {
            numberObj->setProperty("toString", Value(std::make_shared<JSFunction>(toStringFn)));
            numberObj->setProperty("valueOf", Value(std::make_shared<JSFunction>(valueOfFn)));
        }
        
        return Value(numberObj);
    }
    
    // For null, undefined, or other types, create plain object
    if (object_factory_) {
        return Value(object_factory_->createJSObject());
    }
    return Value(std::make_shared<JSObject>());
}

Value Object::keys(const std::vector<Value>& args) {
    if (args.size() < 2) {  // args[0] is 'this', args[1] is the object
        return Value(Array::createArrayObject(object_factory_, {}));
    }

    Value obj = args[1];
    if (!obj.isObject()) {
        return Value(Array::createArrayObject(object_factory_, {}));
    }

    auto jsObj = obj.getObject();
    if (!jsObj) {
        return Value(Array::createArrayObject(object_factory_, {}));
    }

    // Get all property names
    std::vector<Value> keys;
    auto propertyNames = jsObj->getPropertyNames();
    for (const auto& propName : propertyNames) {
        keys.push_back(Value(propName));
    }

    return Value(Array::createArrayObject(object_factory_, keys));
}

Value Object::values(const std::vector<Value>& args) {
    if (args.size() < 2) {  // args[0] is 'this', args[1] is the object
        return Value(Array::createArrayObject(object_factory_, {}));
    }

    Value obj = args[1];
    if (!obj.isObject()) {
        return Value(Array::createArrayObject(object_factory_, {}));
    }

    auto jsObj = obj.getObject();
    if (!jsObj) {
        return Value(Array::createArrayObject(object_factory_, {}));
    }

    // Get all property values
    std::vector<Value> values;
    auto propertyNames = jsObj->getPropertyNames();
    for (const auto& propName : propertyNames) {
        values.push_back(jsObj->getProperty(propName));
    }

    return Value(Array::createArrayObject(object_factory_, values));
}

Value Object::entries(const std::vector<Value>& args) {
    if (args.size() < 2) {  // args[0] is 'this', args[1] is the object
        return Value(Array::createArrayObject(object_factory_, {}));
    }

    Value obj = args[1];
    if (!obj.isObject()) {
        return Value(Array::createArrayObject(object_factory_, {}));
    }

    auto jsObj = obj.getObject();
    if (!jsObj) {
        return Value(Array::createArrayObject(object_factory_, {}));
    }

    // Get all [key, value] pairs
    std::vector<Value> entries;
    auto propertyNames = jsObj->getPropertyNames();
    for (const auto& propName : propertyNames) {
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
    
    // ECMAScript spec: hasOwnProperty() checks only own properties, not inherited ones
    // Use getOwnPropertyNames() to check only own properties, excluding prototype chain
    auto ownPropertyNames = obj->getOwnPropertyNames();
    bool hasOwnProperty = std::find(ownPropertyNames.begin(), ownPropertyNames.end(), propName) != ownPropertyNames.end();
    
    return Value(hasOwnProperty);
}

}  // namespace rift::builtins 