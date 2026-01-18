#include "rift/builtins/array/array.h"

#include <cmath>
#include <functional>
#include <iostream>
#include <limits>

#include "rift/core/engine/builtin_manager.h"
#include "rift/core/engine/call_context.h"
#include "rift/core/engine/evaluation_utils.h"
#include "rift/core/engine/javascript_exception.h"
#include "rift/memory/gc_protector.h"

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

Value Array::constructor(const CallContext& ctx, const std::vector<Value>& args) {
    // Create array with proper prototype chain using GC-managed creation
    auto* arrayPrototype = getGlobalPrototype();
    auto* arrayObj = getObjectFactory()->createJSObject(arrayPrototype);

    // CRITICAL: Protect arrayObj from GC collection during initialization
    rift::memory::GCProtector protect(arrayObj, getObjectFactory()->getObjectManager());

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

    return Value(arrayObj);
}

Value Array::push(const CallContext& ctx, const std::vector<Value>& args) {
    auto* arrayObj = getThisObject(ctx);
    if(!arrayObj) {
        return Value(std::numeric_limits<double>::quiet_NaN());
    }

    size_t length = getArrayLength(arrayObj);

    // Add all arguments to the end of the array
    for(size_t i = 0; i < args.size(); ++i) {
        if(length >= core::EvaluationUtils::MAX_ARRAY_LENGTH) {
            break;
        }
        arrayObj->setProperty(std::to_string(length), args[i]);
        length++;
    }

    setArrayLength(arrayObj, length);
    return Value(static_cast<double>(length));
}

Value Array::pop(const CallContext& ctx, const std::vector<Value>& args) {
    auto* arrayObj = getThisObject(ctx);
    if(!arrayObj) {
        return Value::undefined();
    }

    size_t length = getArrayLength(arrayObj);

    if(length == 0) {
        return Value::undefined();
    }

    Value lastElement = arrayObj->getProperty(std::to_string(length - 1));
    arrayObj->setProperty(std::to_string(length - 1), Value::undefined());
    setArrayLength(arrayObj, length - 1);

    return lastElement;
}

Value Array::shift(const CallContext& ctx, const std::vector<Value>& args) {
    auto* arrayObj = getThisObject(ctx);
    if(!arrayObj) {
        return Value::undefined();
    }

    size_t length = getArrayLength(arrayObj);

    if(length == 0) {
        return Value::undefined();
    }

    Value firstElement = arrayObj->getProperty("0");

    for(size_t i = 1; i < length; ++i) {
        Value element = arrayObj->getProperty(std::to_string(i));
        arrayObj->setProperty(std::to_string(i - 1), element);
    }

    arrayObj->deleteProperty(std::to_string(length - 1));
    setArrayLength(arrayObj, length - 1);

    return firstElement;
}

Value Array::unshift(const CallContext& ctx, const std::vector<Value>& args) {
    auto* arrayObj = getThisObject(ctx);
    if(!arrayObj) {
        return Value(0.0);
    }

    size_t length = getArrayLength(arrayObj);
    size_t numArgs = args.size();

    if(numArgs == 0) {
        return Value(static_cast<double>(length));
    }

    // Shift existing elements to the right
    for(size_t i = length; i > 0; --i) {
        Value element = arrayObj->getProperty(std::to_string(i - 1));
        arrayObj->setProperty(std::to_string(i - 1 + numArgs), element);
    }

    // Insert new elements at the beginning
    for(size_t i = 0; i < numArgs; ++i) {
        arrayObj->setProperty(std::to_string(i), args[i]);
    }

    size_t newLength = length + numArgs;
    setArrayLength(arrayObj, newLength);

    return Value(static_cast<double>(newLength));
}

Value Array::join(const CallContext& ctx, const std::vector<Value>& args) {
    auto* arrayObj = getThisObject(ctx);
    if(!arrayObj) {
        return Value("");
    }

    size_t length = getArrayLength(arrayObj);

    std::string separator = ",";
    if(!args.empty() && !args[0].isUndefined()) {
        separator = args[0].toString();
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
    }

    return Value(result);
}

Value Array::splice(const CallContext& ctx, const std::vector<Value>& args) {
    auto* arrayObj = getThisObject(ctx);
    if(!arrayObj) {
        return Value::undefined();
    }

    size_t length = getArrayLength(arrayObj);

    // splice(start, deleteCount, ...itemsToInsert)
    int start = 0;
    if(!args.empty()) {
        start = static_cast<int>(args[0].toNumber());
        if(start < 0) {
            start = std::max(0, static_cast<int>(length) + start);
        } else {
            start = std::min(start, static_cast<int>(length));
        }
    }

    int deleteCount = static_cast<int>(length) - start;
    if(args.size() > 1) {
        deleteCount = std::max(0, static_cast<int>(args[1].toNumber()));
        deleteCount = std::min(deleteCount, static_cast<int>(length) - start);
    }

    std::vector<Value> itemsToInsert;
    for(size_t i = 2; i < args.size(); ++i) {
        itemsToInsert.push_back(args[i]);
    }

    std::vector<Value> deletedElements;
    for(int i = 0; i < deleteCount; ++i) {
        Value element = arrayObj->getProperty(std::to_string(start + i));
        deletedElements.push_back(element);
    }

    int lengthChange = static_cast<int>(itemsToInsert.size()) - deleteCount;
    size_t newLength;

    if(lengthChange >= 0) {
        size_t itemsAdded = static_cast<size_t>(lengthChange);
        if(length > core::EvaluationUtils::MAX_ARRAY_LENGTH - itemsAdded) {
            newLength = core::EvaluationUtils::MAX_ARRAY_LENGTH;
        } else {
            newLength = length + itemsAdded;
        }
    } else {
        newLength = length - static_cast<size_t>(-lengthChange);
    }

    if(static_cast<int>(itemsToInsert.size()) > deleteCount) {
        int shift = static_cast<int>(itemsToInsert.size()) - deleteCount;
        for(int i = static_cast<int>(length) - 1; i >= start + deleteCount; --i) {
            Value element = arrayObj->getProperty(std::to_string(i));
            arrayObj->setProperty(std::to_string(i + shift), element);
        }
    } else if(static_cast<int>(itemsToInsert.size()) < deleteCount) {
        int shift = deleteCount - static_cast<int>(itemsToInsert.size());
        for(int i = start + deleteCount; i < static_cast<int>(length); ++i) {
            Value element = arrayObj->getProperty(std::to_string(i));
            arrayObj->setProperty(std::to_string(i - shift), element);
        }
        for(size_t i = newLength; i < length; ++i) {
            arrayObj->setProperty(std::to_string(i), Value::undefined());
        }
    }

    for(int i = 0; i < static_cast<int>(itemsToInsert.size()); ++i) {
        arrayObj->setProperty(std::to_string(start + i), itemsToInsert[static_cast<size_t>(i)]);
    }

    setArrayLength(arrayObj, newLength);

    return Value(createArrayObject(getObjectFactory(), deletedElements));
}

Value Array::reverse(const CallContext& ctx, const std::vector<Value>& args) {
    auto* arrayObj = getThisObject(ctx);
    if(!arrayObj) {
        return Value::undefined();
    }

    size_t length = getArrayLength(arrayObj);

    for(size_t i = 0; i < length / 2; ++i) {
        size_t j = length - 1 - i;

        Value temp = arrayObj->getProperty(std::to_string(i));
        Value other = arrayObj->getProperty(std::to_string(j));

        arrayObj->setProperty(std::to_string(i), other);
        arrayObj->setProperty(std::to_string(j), temp);
    }

    return Value(arrayObj);
}

Value Array::sort(const CallContext& ctx, const std::vector<Value>& args) {
    auto* arrayObj = getThisObject(ctx);
    if(!arrayObj) {
        return Value::undefined();
    }

    size_t length = getArrayLength(arrayObj);

    if(length <= 1) {
        return Value(arrayObj);
    }

    std::vector<Value> elements;
    for(size_t i = 0; i < length; ++i) {
        Value element = arrayObj->getProperty(std::to_string(i));
        elements.push_back(element);
    }

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

    for(size_t i = 0; i < length; ++i) {
        arrayObj->setProperty(std::to_string(i), elements[i]);
    }

    return Value(arrayObj);
}

Value Array::find(const CallContext& ctx, const std::vector<Value>& args) {
    auto* arrayObj = getThisObject(ctx);
    if(!arrayObj || args.empty()) {
        return Value::undefined();
    }

    Value callback = args[0];
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

        std::vector<Value> callArgs = {element, Value(static_cast<double>(i)), Value(arrayObj)};
        rift::core::CallContext cbCtx(rift::core::CallType::Function, Value::undefined());
        Value result = callbackFn->call(cbCtx, callArgs);

        if(result.toBool()) {
            return element;
        }
    }

    return Value::undefined();
}

Value Array::findIndex(const CallContext& ctx, const std::vector<Value>& args) {
    auto* arrayObj = getThisObject(ctx);
    if(!arrayObj || args.empty()) {
        return Value(-1.0);
    }

    Value callback = args[0];
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

        std::vector<Value> callArgs = {element, Value(static_cast<double>(i)), Value(arrayObj)};
        rift::core::CallContext cbCtx(rift::core::CallType::Function, Value::undefined());
        Value result = callbackFn->call(cbCtx, callArgs);

        if(result.toBool()) {
            return Value(static_cast<double>(i));
        }
    }

    return Value(-1.0);
}

Value Array::every(const CallContext& ctx, const std::vector<Value>& args) {
    auto* arrayObj = getThisObject(ctx);
    if(!arrayObj || args.empty()) {
        return Value(true);
    }

    Value callback = args[0];
    if(!callback.isFunction()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Array.prototype.every callback must be a function"));
    }

    size_t length = getArrayLength(arrayObj);

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

        std::vector<Value> callArgs = {element, Value(static_cast<double>(i)), Value(arrayObj)};
        rift::core::CallContext cbCtx(rift::core::CallType::Function, Value::undefined());
        Value result = callbackFn->call(cbCtx, callArgs);

        if(!result.toBool()) {
            return Value(false);
        }
    }

    return Value(true);
}

Value Array::some(const CallContext& ctx, const std::vector<Value>& args) {
    auto* arrayObj = getThisObject(ctx);
    if(!arrayObj || args.empty()) {
        return Value(false);
    }

    Value callback = args[0];
    if(!callback.isFunction()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Array.prototype.some callback must be a function"));
    }

    size_t length = getArrayLength(arrayObj);

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

        std::vector<Value> callArgs = {element, Value(static_cast<double>(i)), Value(arrayObj)};
        rift::core::CallContext cbCtx(rift::core::CallType::Function, Value::undefined());
        Value result = callbackFn->call(cbCtx, callArgs);

        if(result.toBool()) {
            return Value(true);
        }
    }

    return Value(false);
}

Value Array::lastIndexOf(const CallContext& ctx, const std::vector<Value>& args) {
    auto* arrayObj = getThisObject(ctx);
    if(!arrayObj || args.empty()) {
        return Value(-1.0);
    }

    size_t length = getArrayLength(arrayObj);
    if(length == 0) {
        return Value(-1.0);
    }

    Value searchElement = args[0];

    for(size_t i = length; i > 0; --i) {
        Value element = arrayObj->getProperty(std::to_string(i - 1));

        if(element.strictEquals(searchElement)) {
            return Value(static_cast<double>(i - 1));
        }
    }

    return Value(-1.0);
}

Value Array::reduceRight(const CallContext& ctx, const std::vector<Value>& args) {
    auto* arrayObj = getThisObject(ctx);
    if(!arrayObj || args.empty()) {
        return Value::undefined();
    }

    Value callback = args[0];
    if(!callback.isFunction()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Array.prototype.reduceRight callback must be a function"));
    }

    size_t length = getArrayLength(arrayObj);
    if(length == 0 && args.size() < 2) {
        return Value::undefined();
    }

    auto* callbackFn = dynamic_cast<JSFunction*>(callback.getObject());
    if(!callbackFn) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Array.prototype.reduceRight callback is not a function"));
    }

    Value accumulator;
    size_t startIndex;

    if(args.size() >= 2) {
        accumulator = args[1];
        startIndex = length;
    } else {
        if(length == 0) {
            return Value::undefined();
        }
        accumulator = arrayObj->getProperty(std::to_string(length - 1));
        startIndex = length - 1;
    }

    for(size_t i = startIndex; i > 0; --i) {
        Value element = arrayObj->getProperty(std::to_string(i - 1));

        std::vector<Value> callArgs = {accumulator, element, Value(static_cast<double>(i - 1)), Value(arrayObj)};
        rift::core::CallContext cbCtx(rift::core::CallType::Function, Value::undefined());
        accumulator = callbackFn->call(cbCtx, callArgs);
    }

    return accumulator;
}

Value Array::flatMap(const CallContext& ctx, const std::vector<Value>& args) {
    auto* arrayObj = getThisObject(ctx);
    if(!arrayObj || args.empty()) {
        return Value(createArrayObject(getObjectFactory(), {}));
    }

    Value callback = args[0];
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

        std::vector<Value> callArgs = {element, Value(static_cast<double>(i)), Value(arrayObj)};
        rift::core::CallContext cbCtx(rift::core::CallType::Function, Value::undefined());
        Value mappedValue = callbackFn->call(cbCtx, callArgs);

        if(mappedValue.isObject()) {
            auto* mappedObj = mappedValue.getObject();
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

Value Array::flat(const CallContext& ctx, const std::vector<Value>& args) {
    auto* arrayObj = getThisObject(ctx);
    if(!arrayObj) {
        return Value(createArrayObject(getObjectFactory(), {}));
    }

    double depth = 1.0;
    if(!args.empty() && args[0].isNumber()) {
        depth = args[0].toNumber();
        if(depth < 0) depth = 0;
        if(depth > 100) depth = 100;
    }

    std::vector<Value> result;

    std::function<void(JSObject*, double)> flattenArray = [&](JSObject* arr, double currentDepth) {
        if(currentDepth <= 0) {
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

                if(element.isObject()) {
                    auto* elementObj = element.getObject();
                    Value elementLengthVal = elementObj->getProperty("length");
                    if(elementLengthVal.isNumber()) {
                        flattenArray(elementObj, currentDepth - 1);
                    } else {
                        result.push_back(element);
                    }
                } else {
                    result.push_back(element);
                }
            }
        }
    };

    flattenArray(arrayObj, depth);
    return Value(createArrayObject(getObjectFactory(), result));
}

Value Array::findLast(const CallContext& ctx, const std::vector<Value>& args) {
    auto* arrayObj = getThisObject(ctx);
    if(!arrayObj || args.empty()) {
        return Value::undefined();
    }

    Value callback = args[0];
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

    for(size_t i = length; i > 0; --i) {
        Value element = arrayObj->getProperty(std::to_string(i - 1));

        std::vector<Value> callArgs = {element, Value(static_cast<double>(i - 1)), Value(arrayObj)};
        rift::core::CallContext cbCtx(rift::core::CallType::Function, Value::undefined());
        Value result = callbackFn->call(cbCtx, callArgs);

        if(result.toBool()) {
            return element;
        }
    }

    return Value::undefined();
}

Value Array::findLastIndex(const CallContext& ctx, const std::vector<Value>& args) {
    auto* arrayObj = getThisObject(ctx);
    if(!arrayObj || args.empty()) {
        return Value(-1.0);
    }

    Value callback = args[0];
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

    for(size_t i = length; i > 0; --i) {
        Value element = arrayObj->getProperty(std::to_string(i - 1));

        std::vector<Value> callArgs = {element, Value(static_cast<double>(i - 1)), Value(arrayObj)};
        rift::core::CallContext cbCtx(rift::core::CallType::Function, Value::undefined());
        Value result = callbackFn->call(cbCtx, callArgs);

        if(result.toBool()) {
            return Value(static_cast<double>(i - 1));
        }
    }

    return Value(-1.0);
}

Value Array::getLength(const CallContext& ctx, const std::vector<Value>& args) {
    auto* arrayObj = getThisObject(ctx);
    if(!arrayObj) {
        return Value(0.0);
    }

    return Value(static_cast<double>(getArrayLength(arrayObj)));
}

Value Array::forEach(const CallContext& ctx, const std::vector<Value>& args) {
    auto* arrayObj = getThisObject(ctx);
    if(!arrayObj || args.empty()) {
        return Value::undefined();
    }

    Value callback = args[0];
    if(!callback.isFunction()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Array.prototype.forEach callback must be a function"));
    }

    size_t length = getArrayLength(arrayObj);
    auto* callbackFn = dynamic_cast<JSFunction*>(callback.getObject());

    if(!callbackFn) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Array.prototype.forEach callback is not a function"));
    }

    for(size_t i = 0; i < length; ++i) {
        Value element = arrayObj->getProperty(std::to_string(i));
        if(!element.isUndefined()) {
            std::vector<Value> callArgs = {element, Value(static_cast<double>(i)), Value(arrayObj)};
            rift::core::CallContext cbCtx(rift::core::CallType::Function, Value::undefined());
            callbackFn->call(cbCtx, callArgs);
        }
    }

    return Value::undefined();
}

Value Array::map(const CallContext& ctx, const std::vector<Value>& args) {
    auto* arrayObj = getThisObject(ctx);
    if(!arrayObj || args.empty()) {
        return Value(createArrayObject(getObjectFactory(), {}));
    }

    Value callback = args[0];
    if(!callback.isFunction()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Array.prototype.map callback must be a function"));
    }

    size_t length = getArrayLength(arrayObj);
    std::vector<Value> results;
    results.reserve(length);

    auto* callbackFn = dynamic_cast<JSFunction*>(callback.getObject());
    if(!callbackFn) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Array.prototype.map callback is not a function"));
    }

    for(size_t i = 0; i < length; ++i) {
        Value element = arrayObj->getProperty(std::to_string(i));
        if(!element.isUndefined()) {
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

Value Array::filter(const CallContext& ctx, const std::vector<Value>& args) {
    auto* arrayObj = getThisObject(ctx);
    if(!arrayObj || args.empty()) {
        return Value(createArrayObject(getObjectFactory(), {}));
    }

    Value callback = args[0];
    if(!callback.isFunction()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Array.prototype.filter callback must be a function"));
    }

    size_t length = getArrayLength(arrayObj);
    std::vector<Value> results;

    auto* callbackFn = dynamic_cast<JSFunction*>(callback.getObject());
    if(!callbackFn) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Array.prototype.filter callback is not a function"));
    }

    for(size_t i = 0; i < length; ++i) {
        Value element = arrayObj->getProperty(std::to_string(i));
        if(!element.isUndefined()) {
            std::vector<Value> callArgs = {element, Value(static_cast<double>(i)), Value(arrayObj)};
            rift::core::CallContext cbCtx(rift::core::CallType::Function, Value::undefined());
            Value result = callbackFn->call(cbCtx, callArgs);

            if(result.toBool()) {
                results.push_back(element);
            }
        }
    }

    return Value(createArrayObject(getObjectFactory(), results));
}

Value Array::reduce(const CallContext& ctx, const std::vector<Value>& args) {
    auto* arrayObj = getThisObject(ctx);
    if(!arrayObj || args.empty()) {
        return Value::undefined();
    }

    Value callback = args[0];
    if(!callback.isFunction()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Array.prototype.reduce callback must be a function"));
    }

    size_t length = getArrayLength(arrayObj);
    if(length == 0 && args.size() < 2) {
        return Value::undefined();
    }

    auto* callbackFn = dynamic_cast<JSFunction*>(callback.getObject());
    if(!callbackFn) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Array.prototype.reduce callback is not a function"));
    }

    Value accumulator;
    size_t startIndex = 0;

    if(args.size() >= 2) {
        accumulator = args[1];
    } else {
        accumulator = arrayObj->getProperty("0");
        startIndex = 1;
    }

    for(size_t i = startIndex; i < length; ++i) {
        Value element = arrayObj->getProperty(std::to_string(i));
        if(!element.isUndefined()) {
            std::vector<Value> callArgs = {accumulator, element, Value(static_cast<double>(i)),
                                           Value(arrayObj)};
            rift::core::CallContext cbCtx(rift::core::CallType::Function, Value::undefined());
            accumulator = callbackFn->call(cbCtx, callArgs);
        }
    }

    return accumulator;
}

Value Array::indexOf(const CallContext& ctx, const std::vector<Value>& args) {
    auto* arrayObj = getThisObject(ctx);
    if(!arrayObj || args.empty()) {
        return Value(-1.0);
    }

    Value searchElement = args[0];
    size_t fromIndex = 0;

    if(args.size() >= 2) {
        double fromIndexNum = args[1].toNumber();
        if(!std::isnan(fromIndexNum) && fromIndexNum >= 0) {
            fromIndex = static_cast<size_t>(fromIndexNum);
        }
    }

    size_t length = getArrayLength(arrayObj);

    for(size_t i = fromIndex; i < length; ++i) {
        Value element = arrayObj->getProperty(std::to_string(i));
        if(element.toString() == searchElement.toString() &&
           element.getType() == searchElement.getType()) {
            return Value(static_cast<double>(i));
        }
    }

    return Value(-1.0);
}

Value Array::includes(const CallContext& ctx, const std::vector<Value>& args) {
    Value indexResult = indexOf(ctx, args);
    return Value(indexResult.toNumber() >= 0);
}

Value Array::slice(const CallContext& ctx, const std::vector<Value>& args) {
    auto* arrayObj = getThisObject(ctx);
    if(!arrayObj) {
        return Value(createArrayObject(getObjectFactory(), {}));
    }

    size_t length = getArrayLength(arrayObj);
    size_t start = 0;
    size_t end = length;

    if(!args.empty()) {
        double startNum = args[0].toNumber();
        if(!std::isnan(startNum)) {
            if(startNum < 0) {
                start = static_cast<size_t>(std::max(0.0, static_cast<double>(length) + startNum));
            } else {
                start = std::min(static_cast<size_t>(startNum), length);
            }
        }
    }

    if(args.size() >= 2 && !args[1].isUndefined()) {
        double endNum = args[1].toNumber();
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

Value Array::concat(const CallContext& ctx, const std::vector<Value>& args) {
    auto* arrayObj = getThisObject(ctx);
    if(!arrayObj) {
        return Value(createArrayObject(getObjectFactory(), {}));
    }

    std::vector<Value> result;
    size_t length = getArrayLength(arrayObj);

    for(size_t i = 0; i < length; ++i) {
        Value element = arrayObj->getProperty(std::to_string(i));
        result.push_back(element);
    }

    for(size_t i = 0; i < args.size(); ++i) {
        if(args[i].isObject()) {
            auto* otherArray = args[i].getObject();
            size_t otherLength = getArrayLength(otherArray);
            for(size_t j = 0; j < otherLength; ++j) {
                Value element = otherArray->getProperty(std::to_string(j));
                result.push_back(element);
            }
        } else {
            result.push_back(args[i]);
        }
    }

    return Value(createArrayObject(getObjectFactory(), result));
}

// Helper to get this object from CallContext
JSObject* Array::getThisObject(const CallContext& ctx) {
    if(ctx.thisValue.isObject()) {
        return ctx.thisValue.getObject();
    }
    return nullptr;
}

size_t Array::getArrayLength(JSObject* obj) {
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

void Array::setArrayLength(JSObject* obj, size_t length) {
    if(obj) {
        obj->setProperty("length", Value(static_cast<double>(length)));
    }
}

JSObject* Array::createArrayObject(rift::memory::ObjectFactory* factory,
                                   const std::vector<Value>& elements) {
    auto* arrayPrototype = getGlobalPrototype();
    auto* arrayObj = factory->createJSObject(arrayPrototype);

    rift::memory::GCProtector protect(arrayObj, factory->getObjectManager());

    for(size_t i = 0; i < elements.size(); ++i) {
        arrayObj->setProperty(std::to_string(i), elements[i]);
    }

    setArrayLength(arrayObj, elements.size());

    return arrayObj;
}

Value Array::toString(const CallContext& ctx, const std::vector<Value>& args) {
    auto* arrayObj = getThisObject(ctx);
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

JSObject* Array::getGlobalPrototype() {
    return rift::core::BuiltinManager::getArrayPrototype();
}

// Array static methods
Value Array::isArray(const CallContext& ctx, const std::vector<Value>& args) {
    if(args.empty()) {
        return Value(false);
    }

    Value arg = args[0];

    if(!arg.isObject() && !arg.isFunction()) {
        return Value(false);
    }

    auto* obj = arg.getObject();
    if(!obj) {
        return Value(false);
    }

    Value lengthValue = obj->getProperty("length");
    if(!lengthValue.isNumber()) {
        return Value(false);
    }

    double length = lengthValue.toNumber();
    if(length < 0 || std::isnan(length) || std::isinf(length)) {
        return Value(false);
    }

    Value pushMethod = obj->getProperty("push");
    if(pushMethod.isFunction()) {
        return Value(true);
    }

    if(length == 0) {
        return Value(true);
    }

    size_t arrayLength = static_cast<size_t>(length);
    for(size_t i = 0; i < std::min(arrayLength, static_cast<size_t>(3)); ++i) {
        Value element = obj->getProperty(std::to_string(i));
        if(!element.isUndefined()) {
            return Value(true);
        }
    }

    return Value(false);
}

Value Array::from(const CallContext& ctx, const std::vector<Value>& args) {
    if(args.empty()) {
        return Value(createArrayObject(getObjectFactory(), {}));
    }

    Value arrayLike = args[0];

    if(arrayLike.isNull() || arrayLike.isUndefined()) {
        return Value(createArrayObject(getObjectFactory(), {}));
    }

    std::vector<Value> result;

    if(arrayLike.isObject()) {
        auto* obj = arrayLike.getObject();
        Value lengthVal = obj->getProperty("length");

        if(lengthVal.isNumber()) {
            size_t length = static_cast<size_t>(lengthVal.toNumber());

            for(size_t i = 0; i < length; ++i) {
                Value element = obj->getProperty(std::to_string(i));
                result.push_back(element);
            }
        } else {
            result.push_back(arrayLike);
        }
    } else {
        result.push_back(arrayLike);
    }

    if(args.size() >= 2 && args[1].isFunction()) {
        auto* mapFn = dynamic_cast<JSFunction*>(args[1].getObject());
        if(!mapFn) {
            throw rift::core::JavaScriptException(
                Value("TypeError: Array.from mapFn is not a function"));
        }
        for(size_t i = 0; i < result.size(); ++i) {
            std::vector<Value> callArgs = {result[i], Value(static_cast<double>(i))};
            rift::core::CallContext cbCtx(rift::core::CallType::Function, Value::undefined());
            result[i] = mapFn->call(cbCtx, callArgs);
        }
    }

    return Value(createArrayObject(getObjectFactory(), result));
}

Value Array::of(const CallContext& ctx, const std::vector<Value>& args) {
    std::vector<Value> elements;

    for(size_t i = 0; i < args.size(); ++i) {
        elements.push_back(args[i]);
    }

    return Value(createArrayObject(getObjectFactory(), elements));
}

}  // namespace rift::builtins
