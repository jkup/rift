#include "rift/builtins/array/array.h"

#include <cmath>
#include <iostream>
#include <limits>

#include "rift/core/engine/builtin_manager.h"
#include "rift/core/engine/evaluation_utils.h"
#include "rift/core/engine/call_context.h"

namespace rift::builtins {

void Array::setupStaticMethods(JSObject* constructor, rift::memory::ObjectFactory* factory) {
    // Add Array static methods
    constructor->setProperty("isArray", Value(factory->createJSFunction(Array::isArray)));
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
        if(length < 0 || std::isnan(length) || std::isinf(length)) {
            // In a real implementation, this would throw a RangeError
            setArrayLength(arrayObj, 0);
        } else {
            setArrayLength(arrayObj, static_cast<size_t>(length));
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
    int deleteCount = length - start; // Default: delete to end
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
    
    // Calculate new length
    size_t newLength = length - deleteCount + itemsToInsert.size();
    
    // If we're inserting more than deleting, shift elements right
    if(itemsToInsert.size() > static_cast<size_t>(deleteCount)) {
        int shift = itemsToInsert.size() - deleteCount;
        for(int i = length - 1; i >= start + deleteCount; --i) {
            Value element = arrayObj->getProperty(std::to_string(i));
            arrayObj->setProperty(std::to_string(i + shift), element);
        }
    }
    // If we're deleting more than inserting, shift elements left
    else if(itemsToInsert.size() < static_cast<size_t>(deleteCount)) {
        int shift = deleteCount - itemsToInsert.size();
        for(size_t i = start + deleteCount; i < length; ++i) {
            Value element = arrayObj->getProperty(std::to_string(i));
            arrayObj->setProperty(std::to_string(i - shift), element);
        }
        // Clear the end elements
        for(size_t i = newLength; i < length; ++i) {
            arrayObj->setProperty(std::to_string(i), Value::undefined());
        }
    }
    
    // Insert new items
    for(size_t i = 0; i < itemsToInsert.size(); ++i) {
        arrayObj->setProperty(std::to_string(start + i), itemsToInsert[i]);
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
        return Value::undefined();
    }

    size_t length = getArrayLength(arrayObj);
    
    auto* callbackFn = dynamic_cast<JSFunction*>(callback.getObject());
    if(!callbackFn) {
        return Value::undefined();
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
        return Value(-1.0);
    }

    size_t length = getArrayLength(arrayObj);
    
    auto* callbackFn = dynamic_cast<JSFunction*>(callback.getObject());
    if(!callbackFn) {
        return Value(-1.0);
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
        return Value(false);
    }

    size_t length = getArrayLength(arrayObj);
    
    // Empty array returns true
    if(length == 0) {
        return Value(true);
    }
    
    auto* callbackFn = dynamic_cast<JSFunction*>(callback.getObject());
    if(!callbackFn) {
        return Value(false);
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
        return Value(false);
    }

    size_t length = getArrayLength(arrayObj);
    
    // Empty array returns false
    if(length == 0) {
        return Value(false);
    }
    
    auto* callbackFn = dynamic_cast<JSFunction*>(callback.getObject());
    if(!callbackFn) {
        return Value(false);
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
        return Value::undefined();
    }

    size_t length = getArrayLength(arrayObj);
    auto* callbackFn =
        dynamic_cast<JSFunction*>(callback.getObject());  // Use dynamic_cast for raw pointers

    if(!callbackFn) {
        return Value::undefined();
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
        return Value(createArrayObject(getObjectFactory(), {}));
    }

    size_t length = getArrayLength(arrayObj);
    std::vector<Value> results;
    results.reserve(length);

    auto* callbackFn =
        dynamic_cast<JSFunction*>(callback.getObject());  // Use dynamic_cast for raw pointers
    if(!callbackFn) {
        return Value(createArrayObject(getObjectFactory(), {}));
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
        return Value(createArrayObject(getObjectFactory(), {}));
    }

    size_t length = getArrayLength(arrayObj);
    std::vector<Value> results;

    auto* callbackFn =
        dynamic_cast<JSFunction*>(callback.getObject());  // Use dynamic_cast for raw pointers
    if(!callbackFn) {
        return Value(createArrayObject(getObjectFactory(), {}));
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
        return Value::undefined();
    }

    size_t length = getArrayLength(arrayObj);
    if(length == 0 && args.size() < 3) {
        // Empty array with no initial value
        return Value::undefined();
    }

    auto* callbackFn =
        dynamic_cast<JSFunction*>(callback.getObject());  // Use dynamic_cast for raw pointers
    if(!callbackFn) {
        return Value::undefined();
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

}  // namespace rift::builtins