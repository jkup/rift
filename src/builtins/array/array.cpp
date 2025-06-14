#include "rift/builtins/array/array.h"

#include <cmath>
#include <limits>

namespace rift::builtins {

std::shared_ptr<JSObject> Array::create() {
    auto array = std::make_shared<JSFunction>(Array::constructor);

    // Create and set prototype
    auto prototype = createPrototype();
    array->setProperty("prototype", Value(prototype));

    return array;
}

std::shared_ptr<JSObject> Array::createPrototype() {
    auto prototype = std::make_shared<JSObject>();

    // Add prototype methods
    prototype->setProperty("push", Value(std::make_shared<JSFunction>(Array::push)));
    prototype->setProperty("pop", Value(std::make_shared<JSFunction>(Array::pop)));
    prototype->setProperty("forEach", Value(std::make_shared<JSFunction>(Array::forEach)));
    prototype->setProperty("map", Value(std::make_shared<JSFunction>(Array::map)));
    prototype->setProperty("filter", Value(std::make_shared<JSFunction>(Array::filter)));
    prototype->setProperty("reduce", Value(std::make_shared<JSFunction>(Array::reduce)));
    prototype->setProperty("indexOf", Value(std::make_shared<JSFunction>(Array::indexOf)));
    prototype->setProperty("includes", Value(std::make_shared<JSFunction>(Array::includes)));
    prototype->setProperty("slice", Value(std::make_shared<JSFunction>(Array::slice)));
    prototype->setProperty("concat", Value(std::make_shared<JSFunction>(Array::concat)));

    return prototype;
}

Value Array::constructor(const std::vector<Value>& args) {
    auto arrayObj = std::make_shared<JSObject>();

    if (args.empty()) {
        // new Array() - create empty array
        setArrayLength(arrayObj, 0);
    } else if (args.size() == 1 && args[0].isNumber()) {
        // new Array(length) - create array with specific length
        double length = args[0].toNumber();
        if (length < 0 || std::isnan(length) || std::isinf(length)) {
            // In a real implementation, this would throw a RangeError
            setArrayLength(arrayObj, 0);
        } else {
            setArrayLength(arrayObj, static_cast<size_t>(length));
        }
    } else {
        // new Array(element0, element1, ...) - create array with elements
        for (size_t i = 0; i < args.size(); ++i) {
            arrayObj->setProperty(std::to_string(i), args[i]);
        }
        setArrayLength(arrayObj, args.size());
    }

    return Value(arrayObj);
}

Value Array::push(const std::vector<Value>& args) {
    auto arrayObj = getThisArrayObject(args);
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
    auto arrayObj = getThisArrayObject(args);
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
    auto arrayObj = getThisArrayObject(args);
    if (!arrayObj) {
        return Value(0.0);
    }

    return Value(static_cast<double>(getArrayLength(arrayObj)));
}

Value Array::forEach(const std::vector<Value>& args) {
    auto arrayObj = getThisArrayObject(args);
    if (!arrayObj || args.size() < 2) {
        return Value::undefined();
    }

    Value callback = args[1];
    if (!callback.isFunction()) {
        return Value::undefined();
    }

    size_t length = getArrayLength(arrayObj);
    auto callbackFn = callback.getObject();

    for (size_t i = 0; i < length; ++i) {
        Value element = arrayObj->getProperty(std::to_string(i));
        if (!element.isUndefined()) {
            // Call callback(element, index, array)
            std::vector<Value> callArgs = {element, Value(static_cast<double>(i)), Value(arrayObj)};
            // In a full implementation, we'd need to actually call the function
            // For now, this is a simplified placeholder
        }
    }

    return Value::undefined();
}

Value Array::map(const std::vector<Value>& args) {
    auto arrayObj = getThisArrayObject(args);
    if (!arrayObj || args.size() < 2) {
        return Value(createArrayObject({}));
    }

    Value callback = args[1];
    if (!callback.isFunction()) {
        return Value(createArrayObject({}));
    }

    size_t length = getArrayLength(arrayObj);
    std::vector<Value> results;
    results.reserve(length);

    for (size_t i = 0; i < length; ++i) {
        Value element = arrayObj->getProperty(std::to_string(i));
        if (!element.isUndefined()) {
            // Call callback(element, index, array) and collect result
            // For now, just pass through the element (simplified)
            results.push_back(element);
        } else {
            results.push_back(Value::undefined());
        }
    }

    return Value(createArrayObject(results));
}

Value Array::filter(const std::vector<Value>& args) {
    auto arrayObj = getThisArrayObject(args);
    if (!arrayObj || args.size() < 2) {
        return Value(createArrayObject({}));
    }

    Value callback = args[1];
    if (!callback.isFunction()) {
        return Value(createArrayObject({}));
    }

    size_t length = getArrayLength(arrayObj);
    std::vector<Value> filtered;

    for (size_t i = 0; i < length; ++i) {
        Value element = arrayObj->getProperty(std::to_string(i));
        if (!element.isUndefined()) {
            // Call callback(element, index, array) and check if truthy
            // For now, just include all elements (simplified)
            filtered.push_back(element);
        }
    }

    return Value(createArrayObject(filtered));
}

Value Array::reduce(const std::vector<Value>& args) {
    auto arrayObj = getThisArrayObject(args);
    if (!arrayObj || args.size() < 2) {
        return Value::undefined();
    }

    Value callback = args[1];
    if (!callback.isFunction()) {
        return Value::undefined();
    }

    size_t length = getArrayLength(arrayObj);
    if (length == 0 && args.size() < 3) {
        // No initial value and empty array - would throw TypeError
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
            // For now, simplified - just return the accumulator
        }
    }

    return accumulator;
}

Value Array::indexOf(const std::vector<Value>& args) {
    auto arrayObj = getThisArrayObject(args);
    if (!arrayObj || args.size() < 2) {
        return Value(-1.0);
    }

    Value searchElement = args[1];
    size_t length = getArrayLength(arrayObj);
    size_t fromIndex = 0;

    if (args.size() >= 3) {
        double fromIndexNum = args[2].toNumber();
        if (!std::isnan(fromIndexNum) && fromIndexNum >= 0) {
            fromIndex = static_cast<size_t>(fromIndexNum);
        }
    }

    for (size_t i = fromIndex; i < length; ++i) {
        Value element = arrayObj->getProperty(std::to_string(i));
        // Simplified equality check
        if (element.toString() == searchElement.toString()) {
            return Value(static_cast<double>(i));
        }
    }

    return Value(-1.0);
}

Value Array::includes(const std::vector<Value>& args) {
    auto arrayObj = getThisArrayObject(args);
    if (!arrayObj || args.size() < 2) {
        return Value(false);
    }

    Value searchElement = args[1];
    size_t length = getArrayLength(arrayObj);
    size_t fromIndex = 0;

    if (args.size() >= 3) {
        double fromIndexNum = args[2].toNumber();
        if (!std::isnan(fromIndexNum) && fromIndexNum >= 0) {
            fromIndex = static_cast<size_t>(fromIndexNum);
        }
    }

    for (size_t i = fromIndex; i < length; ++i) {
        Value element = arrayObj->getProperty(std::to_string(i));
        // Simplified equality check
        if (element.toString() == searchElement.toString()) {
            return Value(true);
        }
    }

    return Value(false);
}

Value Array::slice(const std::vector<Value>& args) {
    auto arrayObj = getThisArrayObject(args);
    if (!arrayObj) {
        return Value(createArrayObject({}));
    }

    size_t length = getArrayLength(arrayObj);
    size_t start = 0;
    size_t end = length;

    if (args.size() >= 2) {
        double startNum = args[1].toNumber();
        if (!std::isnan(startNum)) {
            if (startNum < 0) {
                start = std::max(0.0, static_cast<double>(length) + startNum);
            } else {
                start = std::min(static_cast<size_t>(startNum), length);
            }
        }
    }

    if (args.size() >= 3 && !args[2].isUndefined()) {
        double endNum = args[2].toNumber();
        if (!std::isnan(endNum)) {
            if (endNum < 0) {
                end = std::max(0.0, static_cast<double>(length) + endNum);
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

    return Value(createArrayObject(sliced));
}

Value Array::concat(const std::vector<Value>& args) {
    auto arrayObj = getThisArrayObject(args);
    if (!arrayObj) {
        return Value(createArrayObject({}));
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
            auto otherArray = args[i].getObject();
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

    return Value(createArrayObject(result));
}

// Helper methods
std::shared_ptr<JSObject> Array::getThisArrayObject(const std::vector<Value>& args) {
    if (args.empty()) {
        return nullptr;
    }

    if (args[0].isObject()) {
        return args[0].getObject();
    }

    return nullptr;
}

size_t Array::getArrayLength(std::shared_ptr<JSObject> obj) {
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

void Array::setArrayLength(std::shared_ptr<JSObject> obj, size_t length) {
    if (obj) {
        obj->setProperty("length", Value(static_cast<double>(length)));
    }
}

std::shared_ptr<JSObject> Array::createArrayObject(const std::vector<Value>& elements) {
    auto arrayObj = std::make_shared<JSObject>();

    // Set up array elements
    for (size_t i = 0; i < elements.size(); ++i) {
        arrayObj->setProperty(std::to_string(i), elements[i]);
    }

    // Set array length
    setArrayLength(arrayObj, elements.size());

    // Add array methods directly to the array object for now
    // (In a full implementation, this would be done via prototype chain)
    arrayObj->setProperty(
        "push",
        Value(std::make_shared<JSFunction>([arrayObj](const std::vector<Value>& args) -> Value {
            size_t length = Array::getArrayLength(arrayObj);

            // Add all arguments to the end of the array
            for (size_t i = 0; i < args.size(); ++i) {
                arrayObj->setProperty(std::to_string(length), args[i]);
                length++;
            }

            Array::setArrayLength(arrayObj, length);
            return Value(static_cast<double>(length));
        })));

    arrayObj->setProperty(
        "pop",
        Value(std::make_shared<JSFunction>([arrayObj](const std::vector<Value>& args) -> Value {
            size_t length = Array::getArrayLength(arrayObj);

            if (length == 0) {
                return Value::undefined();
            }

            // Get the last element
            Value lastElement = arrayObj->getProperty(std::to_string(length - 1));

            // Remove it by setting to undefined
            arrayObj->setProperty(std::to_string(length - 1), Value::undefined());

            // Update length
            Array::setArrayLength(arrayObj, length - 1);

            return lastElement;
        })));

    arrayObj->setProperty(
        "toString",
        Value(std::make_shared<JSFunction>([arrayObj](const std::vector<Value>& args) -> Value {
            size_t length = Array::getArrayLength(arrayObj);
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
        })));

    return arrayObj;
}

}  // namespace rift::builtins