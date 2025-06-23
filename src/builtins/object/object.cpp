#include "rift/builtins/object/object.h"

#include "rift/builtins/array/array.h"

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
    
    // TODO: Handle primitive to object conversion
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
    
    // This is a simplified implementation
    // In a full implementation, we'd need to check only own properties, not inherited ones
    bool hasProperty = obj->hasProperty(propName);
    
    return Value(hasProperty);
}

}  // namespace rift::builtins 