#include "rift/builtins/boolean/boolean.h"

#include "rift/core/engine/builtin_manager.h"
#include "rift/core/engine/evaluation_utils.h"

namespace rift::builtins {

void Boolean::setupStaticMethods(JSObject* constructor, rift::memory::ObjectFactory* factory) {
    // Boolean has no static methods (like Array.isArray), so this is empty
}

void Boolean::setupPrototypeMethods(JSObject* prototype, rift::memory::ObjectFactory* factory) {
    // Add Boolean.prototype methods using GC-managed function creation
    prototype->setProperty("toString", Value(factory->createJSFunction(Boolean::toString)));
    prototype->setProperty("valueOf", Value(factory->createJSFunction(Boolean::valueOf)));
}

Value Boolean::constructor(const std::vector<Value>& args) {
    // Parse call context from arguments (handles both old and new calling conventions)
    std::vector<Value> realArgs;
    auto callContext = rift::core::EvaluationUtils::parseCallContext(args, realArgs);

    // Determine the boolean value from the actual arguments
    bool boolValue;
    if(realArgs.empty()) {
        boolValue = false;
    } else {
        boolValue = realArgs[0].toBool();
    }

    // Return behavior depends on how we were called
    if(callContext.isConstructorCall()) {
        // new Boolean() - return Boolean object
        auto booleanPrototype = getGlobalPrototype();
        auto* booleanObj = getObjectFactory()->createJSObject(booleanPrototype);
        booleanObj->setProperty("value", Value(boolValue));
        return Value(booleanObj);
    } else {
        // Boolean() - return primitive boolean
        return Value(boolValue);
    }
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
    if(args.empty()) {
        return false;
    }

    const Value& thisValue = args[0];

    // If it's a boolean primitive, return it directly
    if(thisValue.isBoolean()) {
        return thisValue.getBool();
    }

    // If it's a Boolean object, extract the primitive value
    if(thisValue.isObject()) {
        auto obj = thisValue.getObject();  // getObject() now returns raw pointer
        if(obj) {
            // Check if it has a boolean value property (for Boolean objects)
            Value valueProperty = obj->getProperty("value");
            if(valueProperty.isBoolean()) {
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