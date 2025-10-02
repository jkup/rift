#include "rift/builtins/array/array.h"

#include <cmath>
#include <functional>
#include <iostream>
#include <limits>

#include "rift/core/engine/builtin_manager.h"
#include "rift/core/engine/call_context.h"
#include "rift/core/engine/evaluation_utils.h"
#include "rift/core/engine/javascript_exception.h"

namespace rift::builtins {

void Array::setupStaticMethods(JSObject* constructor, rift::memory::ObjectFactory* factory) {
    // Add Array static methods
    constructor->setProperty("isArray", Value(factory->createJSFunction(Array::isArray)));
    constructor->setProperty("from", Value(factory->createJSFunction(Array::from)));
    constructor->setProperty("of", Value(factory->createJSFunction(Array::of)));
}

void Array::setupPrototypeMethods(JSObject* prototype, rift::memory::ObjectFactory* factory) {
    // Add Array.prototype methods
    prototype->setProperty("push", Value(factory->createJSFunction(Array::push)));
    prototype->setProperty("pop", Value(factory->createJSFunction(Array::pop)));
    prototype->setProperty("shift", Value(factory->createJSFunction(Array::shift)));
    prototype->setProperty("unshift", Value(factory->createJSFunction(Array::unshift)));
    prototype->setProperty("join", Value(factory->createJSFunction(Array::join)));
    prototype->setProperty("splice", Value(factory->createJSFunction(Array::splice)));
    prototype->setProperty("reverse", Value(factory->createJSFunction(Array::reverse)));
    prototype->setProperty("sort", Value(factory->createJSFunction(Array::sort)));
    prototype->setProperty("find", Value(factory->createJSFunction(Array::find)));
    prototype->setProperty("findIndex", Value(factory->createJSFunction(Array::findIndex)));
    prototype->setProperty("every", Value(factory->createJSFunction(Array::every)));
    prototype->setProperty("some", Value(factory->createJSFunction(Array::some)));
    prototype->setProperty("lastIndexOf", Value(factory->createJSFunction(Array::lastIndexOf)));
    prototype->setProperty("reduceRight", Value(factory->createJSFunction(Array::reduceRight)));
    prototype->setProperty("flatMap", Value(factory->createJSFunction(Array::flatMap)));
    prototype->setProperty("flat", Value(factory->createJSFunction(Array::flat)));
    prototype->setProperty("findLast", Value(factory->createJSFunction(Array::findLast)));
    prototype->setProperty("findLastIndex", Value(factory->createJSFunction(Array::findLastIndex)));
    prototype->setProperty("forEach", Value(factory->createJSFunction(Array::forEach)));
    prototype->setProperty("map", Value(factory->createJSFunction(Array::map)));
    prototype->setProperty("filter", Value(factory->createJSFunction(Array::filter)));
    prototype->setProperty("reduce", Value(factory->createJSFunction(Array::reduce)));
    prototype->setProperty("indexOf", Value(factory->createJSFunction(Array::indexOf)));
    prototype->setProperty("includes", Value(factory->createJSFunction(Array::includes)));
    prototype->setProperty("slice", Value(factory->createJSFunction(Array::slice)));
    prototype->setProperty("concat", Value(factory->createJSFunction(Array::concat)));
    prototype->setProperty("toString", Value(factory->createJSFunction(Array::toString)));
}

Value Array::constructor(const std::vector<Value>& args) {
    // With CallContext migration, args are the real constructor arguments

    // Create array with proper prototype chain using GC-managed creation
    auto* arrayPrototype = getGlobalPrototype();
    auto* arrayObj = getObjectFactory()->createJSObject(arrayPrototype);

    size_t effectiveArgCount = args.size();

    if(effectiveArgCount == 0) {
        // new Array() - create empty array
        setArrayLength(arrayObj, 0);
    } else if(effectiveArgCount == 1 && args[0].isNumber()) {
        // new Array(length) - create array with specific length
        double length = args[0].toNumber();
        size_t safeLength;
        if(!core::EvaluationUtils::toSafeArrayLength(length, safeLength)) {
            // Invalid length: NaN, Infinity, negative, or > MAX_ARRAY_LENGTH
            // ECMAScript spec requires RangeError for invalid array length
            setArrayLength(arrayObj, 0);
        } else {
            setArrayLength(arrayObj, safeLength);
        }
    } else {
        // new Array(element0, element1, ...) - create array with elements
        for(size_t i = 0; i < effectiveArgCount; ++i) {
            arrayObj->setProperty(std::to_string(i), args[i]);
        }
        setArrayLength(arrayObj, effectiveArgCount);
    }

    return Value(arrayObj);  // arrayObj is now raw pointer
}

Value Array::push(const std::vector<Value>& args) {
    auto* arrayObj = getThisArrayObject(args);
    if(!arrayObj) {
        return Value(std::numeric_limits<double>::quiet_NaN());
    }

    size_t length = getArrayLength(arrayObj);

    // Add all arguments to the end of the array
    for(size_t i = 1; i < args.size(); ++i) {  // Skip first arg (the array itself)
        // Check for overflow before incrementing length
        if(length >= core::EvaluationUtils::MAX_ARRAY_LENGTH) {
            // Cannot push more elements - array at max length
            break;
        }
        arrayObj->setProperty(std::to_string(length), args[i]);
        length++;
    }

    setArrayLength(arrayObj, length);
    return Value(static_cast<double>(length));
}

Value Array::pop(const std::vector<Value>& args) {
    auto* arrayObj = getThisArrayObject(args);
    if(!arrayObj) {
        return Value::undefined();
    }

    size_t length = getArrayLength(arrayObj);

    if(length == 0) {
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

Value Array::shift(const std::vector<Value>& args) {
    auto* arrayObj = getThisArrayObject(args);
    if(!arrayObj) {
        return Value::undefined();
    }

    size_t length = getArrayLength(arrayObj);

    if(length == 0) {
        return Value::undefined();
    }

    // Get the first element
    Value firstElement = arrayObj->getProperty("0");

    // Shift all elements down by one index
    for(size_t i = 1; i < length; ++i) {
        Value element = arrayObj->getProperty(std::to_string(i));
        arrayObj->setProperty(std::to_string(i - 1), element);
    }

    // Remove the last element (now duplicate)
    arrayObj->deleteProperty(std::to_string(length - 1));

    // Update length
    setArrayLength(arrayObj, length - 1);

    return firstElement;
}

Value Array::unshift(const std::vector<Value>& args) {
    auto* arrayObj = getThisArrayObject(args);
    if(!arrayObj) {
        return Value(0.0);
    }

    size_t length = getArrayLength(arrayObj);
    size_t numArgs = args.size() - 1; // Skip first arg (the array itself)

    if(numArgs == 0) {
        return Value(static_cast<double>(length));
    }

    // Shift existing elements to the right by numArgs positions
    for(size_t i = length; i > 0; --i) {
        Value element = arrayObj->getProperty(std::to_string(i - 1));
        arrayObj->setProperty(std::to_string(i - 1 + numArgs), element);
    }

    // Insert new elements at the beginning
    for(size_t i = 0; i < numArgs; ++i) {
        arrayObj->setProperty(std::to_string(i), args[i + 1]);
    }

    // Update length
    size_t newLength = length + numArgs;
    setArrayLength(arrayObj, newLength);

    return Value(static_cast<double>(newLength));
}

Value Array::join(const std::vector<Value>& args) {
    auto* arrayObj = getThisArrayObject(args);
    if(!arrayObj) {
        return Value("");
    }

    size_t length = getArrayLength(arrayObj);

    // Get separator (default is comma)
    std::string separator = ",";
    if(args.size() > 1 && !args[1].isUndefined()) {
        separator = args[1].toString();
    }

    std::string result = "";

    for(size_t i = 0; i < length; ++i) {
        if(i > 0) {
            result += separator;
        }
        
        Value element = arrayObj->getProperty(std::to_string(i));
        if(!element.isUndefined() && !element.isNull()) {
            result += element.toString();
        }
        // null and undefined elements contribute empty string to join
    }

    return Value(result);
}

Value Array::splice(const std::vector<Value>& args) {
    auto* arrayObj = getThisArrayObject(args);
    if(!arrayObj) {
        return Value::undefined();
    }

    size_t length = getArrayLength(arrayObj);
    
    // splice(start, deleteCount, ...itemsToInsert)
    // args[0] = this array, args[1] = start, args[2] = deleteCount, args[3+] = items to insert
    
    // Parse start index
    int start = 0;
    if(args.size() > 1) {
        start = static_cast<int>(args[1].toNumber());
        if(start < 0) {
            start = std::max(0, static_cast<int>(length) + start);
        } else {
            start = std::min(start, static_cast<int>(length));
        }
    }
    
    // Parse deleteCount
    int deleteCount = static_cast<int>(length) - start; // Default: delete to end
    if(args.size() > 2) {
        deleteCount = std::max(0, static_cast<int>(args[2].toNumber()));
        deleteCount = std::min(deleteCount, static_cast<int>(length) - start);
    }
    
    // Collect items to insert
    std::vector<Value> itemsToInsert;
    for(size_t i = 3; i < args.size(); ++i) {
        itemsToInsert.push_back(args[i]);
    }
    
    // Create array for deleted elements
    std::vector<Value> deletedElements;
    for(int i = 0; i < deleteCount; ++i) {
        Value element = arrayObj->getProperty(std::to_string(start + i));
        deletedElements.push_back(element);
    }
    
    // Calculate new length - check for overflow
    // newLength = length - deleteCount + itemsToInsert.size()
    int lengthChange = static_cast<int>(itemsToInsert.size()) - deleteCount;
    size_t newLength;
    
    if(lengthChange >= 0) {
        // Growing or same size - check for overflow
        size_t itemsAdded = static_cast<size_t>(lengthChange);
        if(length > core::EvaluationUtils::MAX_ARRAY_LENGTH - itemsAdded) {
            // Would overflow - limit to MAX_ARRAY_LENGTH
            newLength = core::EvaluationUtils::MAX_ARRAY_LENGTH;
        } else {
            newLength = length + itemsAdded;
        }
    } else {
        // Shrinking
        newLength = length - static_cast<size_t>(-lengthChange);
    }
    
    // If we're inserting more than deleting, shift elements right
    if(static_cast<int>(itemsToInsert.size()) > deleteCount) {
        int shift = static_cast<int>(itemsToInsert.size()) - deleteCount;
        for(int i = static_cast<int>(length) - 1; i >= start + deleteCount; --i) {
            Value element = arrayObj->getProperty(std::to_string(i));
            arrayObj->setProperty(std::to_string(i + shift), element);
        }
    }
    // If we're deleting more than inserting, shift elements left
    else if(static_cast<int>(itemsToInsert.size()) < deleteCount) {
        int shift = deleteCount - static_cast<int>(itemsToInsert.size());
        for(int i = start + deleteCount; i < static_cast<int>(length); ++i) {
            Value element = arrayObj->getProperty(std::to_string(i));
            arrayObj->setProperty(std::to_string(i - shift), element);
        }
        // Clear the end elements
        for(size_t i = newLength; i < length; ++i) {
            arrayObj->setProperty(std::to_string(i), Value::undefined());
        }
    }
    
    // Insert new items
    for(int i = 0; i < static_cast<int>(itemsToInsert.size()); ++i) {
        arrayObj->setProperty(std::to_string(start + i), itemsToInsert[static_cast<size_t>(i)]);
    }
    
    // Update length
    setArrayLength(arrayObj, newLength);
    
    // Return array of deleted elements
    return Value(createArrayObject(getObjectFactory(), deletedElements));
}

Value Array::reverse(const std::vector<Value>& args) {
    auto* arrayObj = getThisArrayObject(args);
    if(!arrayObj) {
        return Value::undefined();
    }

    size_t length = getArrayLength(arrayObj);
    
    // Reverse elements in place
    for(size_t i = 0; i < length / 2; ++i) {
        size_t j = length - 1 - i;
        
        Value temp = arrayObj->getProperty(std::to_string(i));
        Value other = arrayObj->getProperty(std::to_string(j));
        
        arrayObj->setProperty(std::to_string(i), other);
        arrayObj->setProperty(std::to_string(j), temp);
    }
    
    // Return reference to the same array
    return Value(arrayObj);
}

Value Array::sort(const std::vector<Value>& args) {
    auto* arrayObj = getThisArrayObject(args);
    if(!arrayObj) {
        return Value::undefined();
    }

    size_t length = getArrayLength(arrayObj);
    
    if(length <= 1) {
        return Value(arrayObj);
    }
    
    // Collect all elements for sorting
    std::vector<Value> elements;
    for(size_t i = 0; i < length; ++i) {
        Value element = arrayObj->getProperty(std::to_string(i));
        elements.push_back(element);
    }
    
    // Simple bubble sort (can be optimized later)
    // Sort by string comparison (default JavaScript behavior)
    for(size_t i = 0; i < length - 1; ++i) {
        for(size_t j = 0; j < length - 1 - i; ++j) {
            std::string a = elements[j].toString();
            std::string b = elements[j + 1].toString();
            
            if(a > b) {
                Value temp = elements[j];
                elements[j] = elements[j + 1];
                elements[j + 1] = temp;
            }
        }
    }
    
    // Put sorted elements back
    for(size_t i = 0; i < length; ++i) {
        arrayObj->setProperty(std::to_string(i), elements[i]);
    }
    
    // Return reference to the same array
    return Value(arrayObj);
}

Value Array::find(const std::vector<Value>& args) {
    auto* arrayObj = getThisArrayObject(args);
    if(!arrayObj || args.size() < 2) {
        return Value::undefined();
    }

    Value callback = args[1];
    if(!callback.isFunction()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Array.prototype.find callback must be a function"));
    }

    size_t length = getArrayLength(arrayObj);
    
    auto* callbackFn = dynamic_cast<JSFunction*>(callback.getObject());
    if(!callbackFn) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Array.prototype.find callback is not a function"));
    }

    for(size_t i = 0; i < length; ++i) {
        Value element = arrayObj->getProperty(std::to_string(i));
        
        // Call the callback with (element, index, array)
        std::vector<Value> callArgs = {element, Value(static_cast<double>(i)), Value(arrayObj)};
        rift::core::CallContext cbCtx(rift::core::CallType::Function, Value::undefined());
        Value result = callbackFn->call(cbCtx, callArgs);
        
        if(result.toBool()) {
            return element;
        }
    }

    return Value::undefined();
}

Value Array::findIndex(const std::vector<Value>& args) {
    auto* arrayObj = getThisArrayObject(args);
    if(!arrayObj || args.size() < 2) {
        return Value(-1.0);
    }

    Value callback = args[1];
    if(!callback.isFunction()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Array.prototype.findIndex callback must be a function"));
    }

    size_t length = getArrayLength(arrayObj);
    
    auto* callbackFn = dynamic_cast<JSFunction*>(callback.getObject());
    if(!callbackFn) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Array.prototype.findIndex callback is not a function"));
    }

    for(size_t i = 0; i < length; ++i) {
        Value element = arrayObj->getProperty(std::to_string(i));
        
        // Call the callback with (element, index, array)
        std::vector<Value> callArgs = {element, Value(static_cast<double>(i)), Value(arrayObj)};
        rift::core::CallContext cbCtx(rift::core::CallType::Function, Value::undefined());
        Value result = callbackFn->call(cbCtx, callArgs);
        
        if(result.toBool()) {
            return Value(static_cast<double>(i));
        }
    }

    return Value(-1.0);
}

Value Array::every(const std::vector<Value>& args) {
    auto* arrayObj = getThisArrayObject(args);
    if(!arrayObj || args.size() < 2) {
        return Value(true); // Empty array returns true for every()
    }

    Value callback = args[1];
    if(!callback.isFunction()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Array.prototype.every callback must be a function"));
    }

    size_t length = getArrayLength(arrayObj);
    
    // Empty array returns true
    if(length == 0) {
        return Value(true);
    }
    
    auto* callbackFn = dynamic_cast<JSFunction*>(callback.getObject());
    if(!callbackFn) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Array.prototype.every callback is not a function"));
    }

    for(size_t i = 0; i < length; ++i) {
        Value element = arrayObj->getProperty(std::to_string(i));
        
        // Call the callback with (element, index, array)
        std::vector<Value> callArgs = {element, Value(static_cast<double>(i)), Value(arrayObj)};
        rift::core::CallContext cbCtx(rift::core::CallType::Function, Value::undefined());
        Value result = callbackFn->call(cbCtx, callArgs);
        
        if(!result.toBool()) {
            return Value(false);
        }
    }

    return Value(true);
}

Value Array::some(const std::vector<Value>& args) {
    auto* arrayObj = getThisArrayObject(args);
    if(!arrayObj || args.size() < 2) {
        return Value(false); // Empty array returns false for some()
    }

    Value callback = args[1];
    if(!callback.isFunction()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Array.prototype.some callback must be a function"));
    }

    size_t length = getArrayLength(arrayObj);
    
    // Empty array returns false
    if(length == 0) {
        return Value(false);
    }
    
    auto* callbackFn = dynamic_cast<JSFunction*>(callback.getObject());
    if(!callbackFn) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Array.prototype.some callback is not a function"));
    }

    for(size_t i = 0; i < length; ++i) {
        Value element = arrayObj->getProperty(std::to_string(i));
        
        // Call the callback with (element, index, array)
        std::vector<Value> callArgs = {element, Value(static_cast<double>(i)), Value(arrayObj)};
        rift::core::CallContext cbCtx(rift::core::CallType::Function, Value::undefined());
        Value result = callbackFn->call(cbCtx, callArgs);
        
        if(result.toBool()) {
            return Value(true);
        }
    }

    return Value(false);
}

Value Array::lastIndexOf(const std::vector<Value>& args) {
    auto* arrayObj = getThisArrayObject(args);
    if(!arrayObj || args.size() < 2) {
        return Value(-1.0);
    }

    size_t length = getArrayLength(arrayObj);
    if(length == 0) {
        return Value(-1.0);
    }

    Value searchElement = args[1];
    
    // Start from end and search backwards
    for(size_t i = length; i > 0; --i) {
        Value element = arrayObj->getProperty(std::to_string(i - 1));
        
        // Use strict equality comparison
        if(element.strictEquals(searchElement)) {
            return Value(static_cast<double>(i - 1));
        }
    }

    return Value(-1.0);
}

Value Array::reduceRight(const std::vector<Value>& args) {
    auto* arrayObj = getThisArrayObject(args);
    if(!arrayObj || args.size() < 2) {
        return Value::undefined();
    }

    Value callback = args[1];
    if(!callback.isFunction()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Array.prototype.reduceRight callback must be a function"));
    }

    size_t length = getArrayLength(arrayObj);
    if(length == 0 && args.size() < 3) {
        // TODO: Throw TypeError for reduce of empty array with no initial value
        return Value::undefined();
    }

    auto* callbackFn = dynamic_cast<JSFunction*>(callback.getObject());
    if(!callbackFn) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Array.prototype.reduceRight callback is not a function"));
    }

    Value accumulator;
    size_t startIndex;

    // Initialize accumulator and starting index
    if(args.size() >= 3) {
        // Initial value provided
        accumulator = args[2];
        startIndex = length;
    } else {
        // No initial value, use last element as accumulator
        if(length == 0) {
            return Value::undefined();
        }
        accumulator = arrayObj->getProperty(std::to_string(length - 1));
        startIndex = length - 1;
    }

    // Iterate from right to left
    for(size_t i = startIndex; i > 0; --i) {
        Value element = arrayObj->getProperty(std::to_string(i - 1));
        
        // Call callback with (accumulator, currentValue, currentIndex, array)
        std::vector<Value> callArgs = {accumulator, element, Value(static_cast<double>(i - 1)), Value(arrayObj)};
        rift::core::CallContext cbCtx(rift::core::CallType::Function, Value::undefined());
        accumulator = callbackFn->call(cbCtx, callArgs);
    }

    return accumulator;
}

Value Array::flatMap(const std::vector<Value>& args) {
    auto* arrayObj = getThisArrayObject(args);
    if(!arrayObj || args.size() < 2) {
        return Value(createArrayObject(getObjectFactory(), {}));
    }

    Value callback = args[1];
    if(!callback.isFunction()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Array.prototype.flatMap callback must be a function"));
    }

    size_t length = getArrayLength(arrayObj);
    std::vector<Value> result;

    auto* callbackFn = dynamic_cast<JSFunction*>(callback.getObject());
    if(!callbackFn) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Array.prototype.flatMap callback is not a function"));
    }

    for(size_t i = 0; i < length; ++i) {
        Value element = arrayObj->getProperty(std::to_string(i));
        
        // Call the callback
        std::vector<Value> callArgs = {element, Value(static_cast<double>(i)), Value(arrayObj)};
        rift::core::CallContext cbCtx(rift::core::CallType::Function, Value::undefined());
        Value mappedValue = callbackFn->call(cbCtx, callArgs);
        
        // Flatten one level: if result is array, add its elements; otherwise add the value itself
        if(mappedValue.isObject()) {
            auto* mappedObj = mappedValue.getObject();
            // Check if it's an array by looking for length property and numeric indices
            Value lengthVal = mappedObj->getProperty("length");
            if(lengthVal.isNumber()) {
                size_t arrayLength = static_cast<size_t>(lengthVal.toNumber());
                for(size_t j = 0; j < arrayLength; ++j) {
                    Value arrayElement = mappedObj->getProperty(std::to_string(j));
                    result.push_back(arrayElement);
                }
            } else {
                result.push_back(mappedValue);
            }
        } else {
            result.push_back(mappedValue);
        }
    }

    return Value(createArrayObject(getObjectFactory(), result));
}

Value Array::flat(const std::vector<Value>& args) {
    auto* arrayObj = getThisArrayObject(args);
    if(!arrayObj) {
        return Value(createArrayObject(getObjectFactory(), {}));
    }

    // Get depth (default is 1)
    double depth = 1.0;
    if(args.size() > 1 && args[1].isNumber()) {
        depth = args[1].toNumber();
        if(depth < 0) depth = 0;
        if(depth > 100) depth = 100; // Reasonable limit to prevent infinite recursion
    }

    std::vector<Value> result;

    // Helper function to flatten recursively
    std::function<void(JSObject*, double)> flattenArray = [&](JSObject* arr, double currentDepth) {
        if(currentDepth <= 0) {
            // No more flattening, just add all elements
            Value lengthVal = arr->getProperty("length");
            if(lengthVal.isNumber()) {
                size_t arrLength = static_cast<size_t>(lengthVal.toNumber());
                for(size_t i = 0; i < arrLength; ++i) {
                    Value element = arr->getProperty(std::to_string(i));
                    result.push_back(element);
                }
            }
            return;
        }

        Value lengthVal = arr->getProperty("length");
        if(lengthVal.isNumber()) {
            size_t arrLength = static_cast<size_t>(lengthVal.toNumber());
            for(size_t i = 0; i < arrLength; ++i) {
                Value element = arr->getProperty(std::to_string(i));
                
                // Check if element is an array
                if(element.isObject()) {
                    auto* elementObj = element.getObject();
                    Value elementLengthVal = elementObj->getProperty("length");
                    if(elementLengthVal.isNumber()) {
                        // It's an array, flatten it recursively
                        flattenArray(elementObj, currentDepth - 1);
                    } else {
                        // Not an array, just add it
                        result.push_back(element);
                    }
                } else {
                    // Not an object, just add it
                    result.push_back(element);
                }
            }
        }
    };

    flattenArray(arrayObj, depth);
    return Value(createArrayObject(getObjectFactory(), result));
}

Value Array::findLast(const std::vector<Value>& args) {
    auto* arrayObj = getThisArrayObject(args);
    if(!arrayObj || args.size() < 2) {
        return Value::undefined();
    }

    Value callback = args[1];
    if(!callback.isFunction()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Array.prototype.findLast callback must be a function"));
    }

    size_t length = getArrayLength(arrayObj);
    
    auto* callbackFn = dynamic_cast<JSFunction*>(callback.getObject());
    if(!callbackFn) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Array.prototype.findLast callback is not a function"));
    }

    // Search from right to left
    for(size_t i = length; i > 0; --i) {
        Value element = arrayObj->getProperty(std::to_string(i - 1));
        
        // Call the callback with (element, index, array)
        std::vector<Value> callArgs = {element, Value(static_cast<double>(i - 1)), Value(arrayObj)};
        rift::core::CallContext cbCtx(rift::core::CallType::Function, Value::undefined());
        Value result = callbackFn->call(cbCtx, callArgs);
        
        if(result.toBool()) {
            return element;
        }
    }

    return Value::undefined();
}

Value Array::findLastIndex(const std::vector<Value>& args) {
    auto* arrayObj = getThisArrayObject(args);
    if(!arrayObj || args.size() < 2) {
        return Value(-1.0);
    }

    Value callback = args[1];
    if(!callback.isFunction()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Array.prototype.findLastIndex callback must be a function"));
    }

    size_t length = getArrayLength(arrayObj);
    
    auto* callbackFn = dynamic_cast<JSFunction*>(callback.getObject());
    if(!callbackFn) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Array.prototype.findLastIndex callback is not a function"));
    }

    // Search from right to left
    for(size_t i = length; i > 0; --i) {
        Value element = arrayObj->getProperty(std::to_string(i - 1));
        
        // Call the callback with (element, index, array)
        std::vector<Value> callArgs = {element, Value(static_cast<double>(i - 1)), Value(arrayObj)};
        rift::core::CallContext cbCtx(rift::core::CallType::Function, Value::undefined());
        Value result = callbackFn->call(cbCtx, callArgs);
        
        if(result.toBool()) {
            return Value(static_cast<double>(i - 1));
        }
    }

    return Value(-1.0);
}

Value Array::getLength(const std::vector<Value>& args) {
    auto* arrayObj = getThisArrayObject(args);
    if(!arrayObj) {
        return Value(0.0);
    }

    return Value(static_cast<double>(getArrayLength(arrayObj)));
}

Value Array::forEach(const std::vector<Value>& args) {
    auto* arrayObj = getThisArrayObject(args);
    if(!arrayObj || args.size() < 2) {
        return Value::undefined();
    }

    Value callback = args[1];
    if(!callback.isFunction()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Array.prototype.forEach callback must be a function"));
    }

    size_t length = getArrayLength(arrayObj);
    auto* callbackFn =
        dynamic_cast<JSFunction*>(callback.getObject());  // Use dynamic_cast for raw pointers

    if(!callbackFn) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Array.prototype.forEach callback is not a function"));
    }

    for(size_t i = 0; i < length; ++i) {
        Value element = arrayObj->getProperty(std::to_string(i));
        if(!element.isUndefined()) {
            // Call callback(element, index, array)
            std::vector<Value> callArgs = {element, Value(static_cast<double>(i)), Value(arrayObj)};
            rift::core::CallContext cbCtx(rift::core::CallType::Function, Value::undefined());
            callbackFn->call(cbCtx, callArgs);
        }
    }

    return Value::undefined();
}

Value Array::map(const std::vector<Value>& args) {
    auto* arrayObj = getThisArrayObject(args);
    if(!arrayObj || args.size() < 2) {
        return Value(createArrayObject(getObjectFactory(), {}));
    }

    Value callback = args[1];
    if(!callback.isFunction()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Array.prototype.map callback must be a function"));
    }

    size_t length = getArrayLength(arrayObj);
    std::vector<Value> results;
    results.reserve(length);

    auto* callbackFn =
        dynamic_cast<JSFunction*>(callback.getObject());  // Use dynamic_cast for raw pointers
    if(!callbackFn) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Array.prototype.map callback is not a function"));
    }

    for(size_t i = 0; i < length; ++i) {
        Value element = arrayObj->getProperty(std::to_string(i));
        if(!element.isUndefined()) {
            // Call callback(element, index, array) and collect result
            std::vector<Value> callArgs = {element, Value(static_cast<double>(i)), Value(arrayObj)};
            rift::core::CallContext cbCtx(rift::core::CallType::Function, Value::undefined());
            Value result = callbackFn->call(cbCtx, callArgs);
            results.push_back(result);
        } else {
            results.push_back(Value::undefined());
        }
    }

    return Value(createArrayObject(getObjectFactory(), results));
}

Value Array::filter(const std::vector<Value>& args) {
    auto* arrayObj = getThisArrayObject(args);
    if(!arrayObj || args.size() < 2) {
        return Value(createArrayObject(getObjectFactory(), {}));
    }

    Value callback = args[1];
    if(!callback.isFunction()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Array.prototype.filter callback must be a function"));
    }

    size_t length = getArrayLength(arrayObj);
    std::vector<Value> results;

    auto* callbackFn =
        dynamic_cast<JSFunction*>(callback.getObject());  // Use dynamic_cast for raw pointers
    if(!callbackFn) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Array.prototype.filter callback is not a function"));
    }

    for(size_t i = 0; i < length; ++i) {
        Value element = arrayObj->getProperty(std::to_string(i));
        if(!element.isUndefined()) {
            // Call callback(element, index, array)
            std::vector<Value> callArgs = {element, Value(static_cast<double>(i)), Value(arrayObj)};
            rift::core::CallContext cbCtx(rift::core::CallType::Function, Value::undefined());
            Value result = callbackFn->call(cbCtx, callArgs);

            // If callback returns truthy value, include element
            if(result.toBool()) {
                results.push_back(element);
            }
        }
    }

    return Value(createArrayObject(getObjectFactory(), results));
}

Value Array::reduce(const std::vector<Value>& args) {
    auto* arrayObj = getThisArrayObject(args);
    if(!arrayObj || args.size() < 2) {
        return Value::undefined();
    }

    Value callback = args[1];
    if(!callback.isFunction()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Array.prototype.reduce callback must be a function"));
    }

    size_t length = getArrayLength(arrayObj);
    if(length == 0 && args.size() < 3) {
        // Empty array with no initial value
        return Value::undefined();
    }

    auto* callbackFn =
        dynamic_cast<JSFunction*>(callback.getObject());  // Use dynamic_cast for raw pointers
    if(!callbackFn) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Array.prototype.reduce callback is not a function"));
    }

    Value accumulator;
    size_t startIndex = 0;

    if(args.size() >= 3) {
        // Initial value provided
        accumulator = args[2];
    } else {
        // Use first element as initial value
        accumulator = arrayObj->getProperty("0");
        startIndex = 1;
    }

    for(size_t i = startIndex; i < length; ++i) {
        Value element = arrayObj->getProperty(std::to_string(i));
        if(!element.isUndefined()) {
            // Call callback(accumulator, element, index, array)
            std::vector<Value> callArgs = {accumulator, element, Value(static_cast<double>(i)),
                                           Value(arrayObj)};
            rift::core::CallContext cbCtx(rift::core::CallType::Function, Value::undefined());
            accumulator = callbackFn->call(cbCtx, callArgs);
        }
    }

    return accumulator;
}

Value Array::indexOf(const std::vector<Value>& args) {
    auto* arrayObj = getThisArrayObject(args);
    if(!arrayObj || args.size() < 2) {
        return Value(-1.0);
    }

    Value searchElement = args[1];
    size_t fromIndex = 0;

    if(args.size() >= 3) {
        double fromIndexNum = args[2].toNumber();
        if(!std::isnan(fromIndexNum) && fromIndexNum >= 0) {
            fromIndex = static_cast<size_t>(fromIndexNum);
        }
    }

    size_t length = getArrayLength(arrayObj);

    for(size_t i = fromIndex; i < length; ++i) {
        Value element = arrayObj->getProperty(std::to_string(i));
        // Use strict equality comparison
        if(element.toString() == searchElement.toString() &&
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
    auto* arrayObj = getThisArrayObject(args);
    if(!arrayObj) {
        return Value(createArrayObject(getObjectFactory(), {}));
    }

    size_t length = getArrayLength(arrayObj);
    size_t start = 0;
    size_t end = length;

    if(args.size() >= 2) {
        double startNum = args[1].toNumber();
        if(!std::isnan(startNum)) {
            if(startNum < 0) {
                start = static_cast<size_t>(std::max(0.0, static_cast<double>(length) + startNum));
            } else {
                start = std::min(static_cast<size_t>(startNum), length);
            }
        }
    }

    if(args.size() >= 3 && !args[2].isUndefined()) {
        double endNum = args[2].toNumber();
        if(!std::isnan(endNum)) {
            if(endNum < 0) {
                end = static_cast<size_t>(std::max(0.0, static_cast<double>(length) + endNum));
            } else {
                end = std::min(static_cast<size_t>(endNum), length);
            }
        }
    }

    std::vector<Value> sliced;
    for(size_t i = start; i < end; ++i) {
        Value element = arrayObj->getProperty(std::to_string(i));
        sliced.push_back(element);
    }

    return Value(createArrayObject(getObjectFactory(), sliced));
}

Value Array::concat(const std::vector<Value>& args) {
    auto* arrayObj = getThisArrayObject(args);
    if(!arrayObj) {
        return Value(createArrayObject(getObjectFactory(), {}));
    }

    std::vector<Value> result;
    size_t length = getArrayLength(arrayObj);

    // Add elements from the original array
    for(size_t i = 0; i < length; ++i) {
        Value element = arrayObj->getProperty(std::to_string(i));
        result.push_back(element);
    }

    // Add elements from arguments
    for(size_t i = 1; i < args.size(); ++i) {
        if(args[i].isObject()) {
            // If it's an array, add its elements
            auto* otherArray = args[i].getObject();  // getObject() now returns raw pointer
            size_t otherLength = getArrayLength(otherArray);
            for(size_t j = 0; j < otherLength; ++j) {
                Value element = otherArray->getProperty(std::to_string(j));
                result.push_back(element);
            }
        } else {
            // Add the value itself
            result.push_back(args[i]);
        }
    }

    return Value(createArrayObject(getObjectFactory(), result));
}

// Helper methods - now use raw pointers
JSObject* Array::getThisArrayObject(const std::vector<Value>& args) {
    if(args.empty()) {
        return nullptr;
    }

    if(args[0].isObject()) {
        return args[0].getObject();  // getObject() now returns raw pointer
    }

    return nullptr;
}

size_t Array::getArrayLength(JSObject* obj) {  // Now takes raw pointer
    if(!obj) {
        return 0;
    }

    Value lengthValue = obj->getProperty("length");
    if(lengthValue.isNumber()) {
        double length = lengthValue.toNumber();
        if(length >= 0 && !std::isnan(length) && !std::isinf(length)) {
            return static_cast<size_t>(length);
        }
    }

    return 0;
}

void Array::setArrayLength(JSObject* obj, size_t length) {  // Now takes raw pointer
    if(obj) {
        obj->setProperty("length", Value(static_cast<double>(length)));
    }
}

JSObject* Array::createArrayObject(rift::memory::ObjectFactory* factory,
                                   const std::vector<Value>& elements) {  // Now returns raw pointer
    // Create array with proper prototype chain
    auto* arrayPrototype = getGlobalPrototype();

    // Use factory for GC-managed creation
    auto* arrayObj = factory->createJSObject(arrayPrototype);

    // Set up array elements
    for(size_t i = 0; i < elements.size(); ++i) {
        arrayObj->setProperty(std::to_string(i), elements[i]);
    }

    // Set array length
    setArrayLength(arrayObj, elements.size());

    return arrayObj;  // Return raw pointer
}

Value Array::toString(const std::vector<Value>& args) {
    auto* arrayObj = getThisArrayObject(args);
    if(!arrayObj) {
        return Value("");
    }

    size_t length = getArrayLength(arrayObj);
    std::string result = "";

    for(size_t i = 0; i < length; ++i) {
        if(i > 0) {
            result += ",";
        }
        Value element = arrayObj->getProperty(std::to_string(i));
        if(!element.isUndefined() && !element.isNull()) {
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
    if(args.size() < 2) {
        return Value(false);
    }

    Value arg = args[1];  // Use the actual argument, not the 'this' value

    // Non-objects cannot be arrays (check both Object and Function types)
    if(!arg.isObject() && !arg.isFunction()) {
        return Value(false);
    }

    auto* obj = arg.getObject();  // getObject() now returns raw pointer
    if(!obj) {
        return Value(false);
    }

    // Simplified array detection:
    // 1. Must have a numeric 'length' property
    // 2. Must have array methods (push/pop) OR numeric indices
    Value lengthValue = obj->getProperty("length");
    if(!lengthValue.isNumber()) {
        return Value(false);
    }

    double length = lengthValue.toNumber();
    if(length < 0 || std::isnan(length) || std::isinf(length)) {
        return Value(false);
    }

    // Check if it has array methods (most reliable indicator)
    Value pushMethod = obj->getProperty("push");
    if(pushMethod.isFunction()) {
        return Value(true);
    }

    // For empty arrays, just having a length property is sufficient
    if(length == 0) {
        return Value(true);
    }

    // For non-empty arrays, check if it has numeric indices
    size_t arrayLength = static_cast<size_t>(length);
    for(size_t i = 0; i < std::min(arrayLength, static_cast<size_t>(3)); ++i) {
        Value element = obj->getProperty(std::to_string(i));
        if(!element.isUndefined()) {
            return Value(true);
        }
    }

    return Value(false);
}

Value Array::from(const std::vector<Value>& args) {
    // Array.from(arrayLike[, mapFn[, thisArg]])
    // args[0] is the Array constructor (this), args[1] is arrayLike
    if(args.size() < 2) {
        // Return empty array if no arguments
        return Value(createArrayObject(getObjectFactory(), {}));
    }

    Value arrayLike = args[1];
    
    // Handle null/undefined
    if(arrayLike.isNull() || arrayLike.isUndefined()) {
        // TODO: Should throw TypeError, but return empty array for now
        return Value(createArrayObject(getObjectFactory(), {}));
    }

    std::vector<Value> result;

    // If it's already an array, just copy its elements
    if(arrayLike.isObject()) {
        auto* obj = arrayLike.getObject();
        Value lengthVal = obj->getProperty("length");
        
        if(lengthVal.isNumber()) {
            size_t length = static_cast<size_t>(lengthVal.toNumber());
            
            // Copy elements
            for(size_t i = 0; i < length; ++i) {
                Value element = obj->getProperty(std::to_string(i));
                result.push_back(element);
            }
        } else {
            // Not array-like, just add the value itself
            result.push_back(arrayLike);
        }
    } else {
        // Primitive value, add as single element
        result.push_back(arrayLike);
    }

    // Handle optional mapping function
    if(args.size() >= 3 && args[2].isFunction()) {
        auto* mapFn = dynamic_cast<JSFunction*>(args[2].getObject());
        if(!mapFn) {
            throw rift::core::JavaScriptException(
                Value("TypeError: Array.from mapFn is not a function"));
        }
        for(size_t i = 0; i < result.size(); ++i) {
            // Call mapFn(element, index)
            std::vector<Value> callArgs = {result[i], Value(static_cast<double>(i))};
            rift::core::CallContext cbCtx(rift::core::CallType::Function, Value::undefined());
            result[i] = mapFn->call(cbCtx, callArgs);
        }
    }

    return Value(createArrayObject(getObjectFactory(), result));
}

Value Array::of(const std::vector<Value>& args) {
    // Array.of(...elements)
    // args[0] is the Array constructor (this), remaining args are the elements
    std::vector<Value> elements;
    
    // Skip the first argument (the Array constructor)
    for(size_t i = 1; i < args.size(); ++i) {
        elements.push_back(args[i]);
    }

    return Value(createArrayObject(getObjectFactory(), elements));
}

}  // namespace rift::builtins