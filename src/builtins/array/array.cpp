#include "rift/builtins/array/array.h"
#include "rift/core/engine/builtin_manager.h"
#include "rift/core/engine/evaluation_utils.h"

#include <cmath>
#include <limits>
#include <iostream>

namespace rift::builtins {

// Static factory storage
rift::memory::ObjectFactory* Array::object_factory_ = nullptr;

void Array::setObjectFactory(rift::memory::ObjectFactory* factory) {
    object_factory_ = factory;
}

JSObject* Array::create(rift::memory::ObjectFactory* factory) {
    // Store factory for use in other methods
    setObjectFactory(factory);
    
    auto *array = factory->createJSFunction(Array::constructor);

    // Add static methods
    array->setProperty("isArray", Value(factory->createJSFunction(Array::isArray)));

    // Create and set prototype
    auto *prototype = createPrototype(factory);
    array->setProperty("prototype", Value(prototype));  // prototype is now raw pointer

    return array;  // Return raw pointer
}

JSObject* Array::createPrototype(rift::memory::ObjectFactory* factory) {
    auto *prototype = factory->createJSObject();

    // Add prototype methods
    prototype->setProperty("push", Value(factory->createJSFunction(Array::push)));
    prototype->setProperty("pop", Value(factory->createJSFunction(Array::pop)));
    prototype->setProperty("forEach", Value(factory->createJSFunction(Array::forEach)));
    prototype->setProperty("map", Value(factory->createJSFunction(Array::map)));
    prototype->setProperty("filter", Value(factory->createJSFunction(Array::filter)));
    prototype->setProperty("reduce", Value(factory->createJSFunction(Array::reduce)));
    prototype->setProperty("indexOf", Value(factory->createJSFunction(Array::indexOf)));
    prototype->setProperty("includes", Value(factory->createJSFunction(Array::includes)));
    prototype->setProperty("slice", Value(factory->createJSFunction(Array::slice)));
    prototype->setProperty("concat", Value(factory->createJSFunction(Array::concat)));
    prototype->setProperty("toString", Value(factory->createJSFunction(Array::toString)));

    return prototype;  // Return raw pointer
}

Value Array::constructor(const std::vector<Value>& args) {
    // Skip constructor marker if present
    size_t argOffset = 0;
    if (!args.empty() && args[0].isString() && args[0].getString() == rift::core::EvaluationConstants::CONSTRUCTOR_CALL_MARKER) {
        argOffset = 2;  // Skip the constructor marker and the 'this' object
    }
    
    // Create array with proper prototype chain using GC-managed creation
    auto *arrayPrototype = getGlobalPrototype();
    auto *arrayObj = object_factory_->createJSObject(arrayPrototype);

    size_t effectiveArgCount = args.size() - argOffset;
    
    if (effectiveArgCount == 0) {
        // new Array() - create empty array
        setArrayLength(arrayObj, 0);
    } else if (effectiveArgCount == 1 && args[argOffset].isNumber()) {
        // new Array(length) - create array with specific length
        double length = args[argOffset].toNumber();
        if (length < 0 || std::isnan(length) || std::isinf(length)) {
            // In a real implementation, this would throw a RangeError
            setArrayLength(arrayObj, 0);
        } else {
            setArrayLength(arrayObj, static_cast<size_t>(length));
        }
    } else {
        // new Array(element0, element1, ...) - create array with elements
        for (size_t i = 0; i < effectiveArgCount; ++i) {
            arrayObj->setProperty(std::to_string(i), args[argOffset + i]);
        }
        setArrayLength(arrayObj, effectiveArgCount);
    }

    return Value(arrayObj);  // arrayObj is now raw pointer
}

Value Array::push(const std::vector<Value>& args) {
    auto *arrayObj = getThisArrayObject(args);
    if (!arrayObj) {
        return Value(std::numeric_limits<double>::quiet_NaN());
    }

    size_t length = getArrayLength(arrayObj);

    // Add all arguments to the end of the array
    for (size_t i = 1; i < args.size(); ++i) {  // Skip first arg (the array itself)
        arrayObj->setProperty(std::to_string(length), args[i]);
        length++;
    }

    setArrayLength(arrayObj, length);
    return Value(static_cast<double>(length));
}

Value Array::pop(const std::vector<Value>& args) {
    auto *arrayObj = getThisArrayObject(args);
    if (!arrayObj) {
        return Value::undefined();
    }

    size_t length = getArrayLength(arrayObj);

    if (length == 0) {
        return Value::undefined();
    }

    // Get the last element
    Value lastElement = arrayObj->getProperty(std::to_string(length - 1));

    // Remove it by setting to undefined (simplified)
    arrayObj->setProperty(std::to_string(length - 1), Value::undefined());

    // Update length
    setArrayLength(arrayObj, length - 1);

    return lastElement;
}

Value Array::getLength(const std::vector<Value>& args) {
    auto *arrayObj = getThisArrayObject(args);
    if (!arrayObj) {
        return Value(0.0);
    }

    return Value(static_cast<double>(getArrayLength(arrayObj)));
}

Value Array::forEach(const std::vector<Value>& args) {
    auto *arrayObj = getThisArrayObject(args);
    if (!arrayObj || args.size() < 2) {
        return Value::undefined();
    }

    Value callback = args[1];
    if (!callback.isFunction()) {
        return Value::undefined();
    }

    size_t length = getArrayLength(arrayObj);
    auto *callbackFn = dynamic_cast<JSFunction*>(callback.getObject());  // Use dynamic_cast for raw pointers
    
    if (!callbackFn) {
        return Value::undefined();
    }

    for (size_t i = 0; i < length; ++i) {
        Value element = arrayObj->getProperty(std::to_string(i));
        if (!element.isUndefined()) {
            // Call callback(element, index, array)
            std::vector<Value> callArgs = {element, Value(static_cast<double>(i)), Value(arrayObj)};
            callbackFn->call(callArgs);
        }
    }

    return Value::undefined();
}

Value Array::map(const std::vector<Value>& args) {
    auto *arrayObj = getThisArrayObject(args);
    if (!arrayObj || args.size() < 2) {
        return Value(createArrayObject(object_factory_, {}));
    }

    Value callback = args[1];
    if (!callback.isFunction()) {
        return Value(createArrayObject(object_factory_, {}));
    }

    size_t length = getArrayLength(arrayObj);
    std::vector<Value> results;
    results.reserve(length);
    
    auto *callbackFn = dynamic_cast<JSFunction*>(callback.getObject());  // Use dynamic_cast for raw pointers
    if (!callbackFn) {
        return Value(createArrayObject(object_factory_, {}));
    }

    for (size_t i = 0; i < length; ++i) {
        Value element = arrayObj->getProperty(std::to_string(i));
        if (!element.isUndefined()) {
            // Call callback(element, index, array) and collect result
            std::vector<Value> callArgs = {element, Value(static_cast<double>(i)), Value(arrayObj)};
            Value result = callbackFn->call(callArgs);
            results.push_back(result);
        } else {
            results.push_back(Value::undefined());
        }
    }

    return Value(createArrayObject(object_factory_, results));
}

Value Array::filter(const std::vector<Value>& args) {
    auto *arrayObj = getThisArrayObject(args);
    if (!arrayObj || args.size() < 2) {
        return Value(createArrayObject(object_factory_, {}));
    }

    Value callback = args[1];
    if (!callback.isFunction()) {
        return Value(createArrayObject(object_factory_, {}));
    }

    size_t length = getArrayLength(arrayObj);
    std::vector<Value> results;
    
    auto *callbackFn = dynamic_cast<JSFunction*>(callback.getObject());  // Use dynamic_cast for raw pointers
    if (!callbackFn) {
        return Value(createArrayObject(object_factory_, {}));
    }

    for (size_t i = 0; i < length; ++i) {
        Value element = arrayObj->getProperty(std::to_string(i));
        if (!element.isUndefined()) {
            // Call callback(element, index, array)
            std::vector<Value> callArgs = {element, Value(static_cast<double>(i)), Value(arrayObj)};
            Value result = callbackFn->call(callArgs);
            
            // If callback returns truthy value, include element
            if (result.toBool()) {
                results.push_back(element);
            }
        }
    }

    return Value(createArrayObject(object_factory_, results));
}

Value Array::reduce(const std::vector<Value>& args) {
    auto *arrayObj = getThisArrayObject(args);
    if (!arrayObj || args.size() < 2) {
        return Value::undefined();
    }

    Value callback = args[1];
    if (!callback.isFunction()) {
        return Value::undefined();
    }

    size_t length = getArrayLength(arrayObj);
    if (length == 0 && args.size() < 3) {
        // Empty array with no initial value
        return Value::undefined();
    }

    auto *callbackFn = dynamic_cast<JSFunction*>(callback.getObject());  // Use dynamic_cast for raw pointers
    if (!callbackFn) {
        return Value::undefined();
    }

    Value accumulator;
    size_t startIndex = 0;

    if (args.size() >= 3) {
        // Initial value provided
        accumulator = args[2];
    } else {
        // Use first element as initial value
        accumulator = arrayObj->getProperty("0");
        startIndex = 1;
    }

    for (size_t i = startIndex; i < length; ++i) {
        Value element = arrayObj->getProperty(std::to_string(i));
        if (!element.isUndefined()) {
            // Call callback(accumulator, element, index, array)
            std::vector<Value> callArgs = {accumulator, element, Value(static_cast<double>(i)), Value(arrayObj)};
            accumulator = callbackFn->call(callArgs);
        }
    }

    return accumulator;
}

Value Array::indexOf(const std::vector<Value>& args) {
    auto *arrayObj = getThisArrayObject(args);
    if (!arrayObj || args.size() < 2) {
        return Value(-1.0);
    }

    Value searchElement = args[1];
    size_t fromIndex = 0;

    if (args.size() >= 3) {
        double fromIndexNum = args[2].toNumber();
        if (!std::isnan(fromIndexNum) && fromIndexNum >= 0) {
            fromIndex = static_cast<size_t>(fromIndexNum);
        }
    }

    size_t length = getArrayLength(arrayObj);

    for (size_t i = fromIndex; i < length; ++i) {
        Value element = arrayObj->getProperty(std::to_string(i));
        // Use strict equality comparison
        if (element.toString() == searchElement.toString() && 
            element.getType() == searchElement.getType()) {
            return Value(static_cast<double>(i));
        }
    }

    return Value(-1.0);
}

Value Array::includes(const std::vector<Value>& args) {
    Value indexResult = indexOf(args);
    return Value(indexResult.toNumber() >= 0);
}

Value Array::slice(const std::vector<Value>& args) {
    auto *arrayObj = getThisArrayObject(args);
    if (!arrayObj) {
        return Value(createArrayObject(object_factory_, {}));
    }

    size_t length = getArrayLength(arrayObj);
    size_t start = 0;
    size_t end = length;

    if (args.size() >= 2) {
        double startNum = args[1].toNumber();
        if (!std::isnan(startNum)) {
            if (startNum < 0) {
                start = static_cast<size_t>(std::max(0.0, static_cast<double>(length) + startNum));
            } else {
                start = std::min(static_cast<size_t>(startNum), length);
            }
        }
    }

    if (args.size() >= 3 && !args[2].isUndefined()) {
        double endNum = args[2].toNumber();
        if (!std::isnan(endNum)) {
            if (endNum < 0) {
                end = static_cast<size_t>(std::max(0.0, static_cast<double>(length) + endNum));
            } else {
                end = std::min(static_cast<size_t>(endNum), length);
            }
        }
    }

    std::vector<Value> sliced;
    for (size_t i = start; i < end; ++i) {
        Value element = arrayObj->getProperty(std::to_string(i));
        sliced.push_back(element);
    }

    return Value(createArrayObject(object_factory_, sliced));
}

Value Array::concat(const std::vector<Value>& args) {
    auto *arrayObj = getThisArrayObject(args);
    if (!arrayObj) {
        return Value(createArrayObject(object_factory_, {}));
    }

    std::vector<Value> result;
    size_t length = getArrayLength(arrayObj);

    // Add elements from the original array
    for (size_t i = 0; i < length; ++i) {
        Value element = arrayObj->getProperty(std::to_string(i));
        result.push_back(element);
    }

    // Add elements from arguments
    for (size_t i = 1; i < args.size(); ++i) {
        if (args[i].isObject()) {
            // If it's an array, add its elements
            auto *otherArray = args[i].getObject();  // getObject() now returns raw pointer
            size_t otherLength = getArrayLength(otherArray);
            for (size_t j = 0; j < otherLength; ++j) {
                Value element = otherArray->getProperty(std::to_string(j));
                result.push_back(element);
            }
        } else {
            // Add the value itself
            result.push_back(args[i]);
        }
    }

    return Value(createArrayObject(object_factory_, result));
}

// Helper methods - now use raw pointers
JSObject* Array::getThisArrayObject(const std::vector<Value>& args) {
    if (args.empty()) {
        return nullptr;
    }

    if (args[0].isObject()) {
        return args[0].getObject();  // getObject() now returns raw pointer
    }

    return nullptr;
}

size_t Array::getArrayLength(JSObject* obj) {  // Now takes raw pointer
    if (!obj) {
        return 0;
    }

    Value lengthValue = obj->getProperty("length");
    if (lengthValue.isNumber()) {
        double length = lengthValue.toNumber();
        if (length >= 0 && !std::isnan(length) && !std::isinf(length)) {
            return static_cast<size_t>(length);
        }
    }

    return 0;
}

void Array::setArrayLength(JSObject* obj, size_t length) {  // Now takes raw pointer
    if (obj) {
        obj->setProperty("length", Value(static_cast<double>(length)));
    }
}

JSObject* Array::createArrayObject(rift::memory::ObjectFactory* factory, const std::vector<Value>& elements) {  // Now returns raw pointer
    // Create array with proper prototype chain
    auto *arrayPrototype = getGlobalPrototype();
    
    // Use factory for GC-managed creation
    auto *arrayObj = factory->createJSObject(arrayPrototype);

    // Set up array elements
    for (size_t i = 0; i < elements.size(); ++i) {
        arrayObj->setProperty(std::to_string(i), elements[i]);
    }

    // Set array length
    setArrayLength(arrayObj, elements.size());

    return arrayObj;  // Return raw pointer
}

Value Array::toString(const std::vector<Value>& args) {
    auto *arrayObj = getThisArrayObject(args);
    if (!arrayObj) {
        return Value("");
    }

    size_t length = getArrayLength(arrayObj);
    std::string result = "";

    for (size_t i = 0; i < length; ++i) {
        if (i > 0) {
            result += ",";
        }
        Value element = arrayObj->getProperty(std::to_string(i));
        if (!element.isUndefined() && !element.isNull()) {
            result += element.toString();
        }
    }

    return Value(result);
}

JSObject* Array::getGlobalPrototype() {  // Now returns raw pointer
    return rift::core::BuiltinManager::getArrayPrototype();
}

// Array static methods
Value Array::isArray(const std::vector<Value>& args) {
    // Array.isArray() requires exactly one argument (plus the 'this' value)
    // args[0] is the Array constructor (this), args[1] is the actual argument
    if (args.size() < 2) {
        return Value(false);
    }

    Value arg = args[1];  // Use the actual argument, not the 'this' value
    
    // Non-objects cannot be arrays (check both Object and Function types)
    if (!arg.isObject() && !arg.isFunction()) {
        return Value(false);
    }

    auto *obj = arg.getObject();  // getObject() now returns raw pointer
    if (!obj) {
        return Value(false);
    }

    // Simplified array detection:
    // 1. Must have a numeric 'length' property
    // 2. Must have array methods (push/pop) OR numeric indices
    Value lengthValue = obj->getProperty("length");
    if (!lengthValue.isNumber()) {
        return Value(false);
    }

    double length = lengthValue.toNumber();
    if (length < 0 || std::isnan(length) || std::isinf(length)) {
        return Value(false);
    }

    // Check if it has array methods (most reliable indicator)
    Value pushMethod = obj->getProperty("push");
    if (pushMethod.isFunction()) {
        return Value(true);
    }

    // For empty arrays, just having a length property is sufficient
    if (length == 0) {
        return Value(true);
    }

    // For non-empty arrays, check if it has numeric indices
    size_t arrayLength = static_cast<size_t>(length);
    for (size_t i = 0; i < std::min(arrayLength, static_cast<size_t>(3)); ++i) {
        Value element = obj->getProperty(std::to_string(i));
        if (!element.isUndefined()) {
            return Value(true);
        }
    }

    return Value(false);
}

}  // namespace rift::builtins