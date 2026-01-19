// Array iterator methods - methods that use callbacks to iterate over elements
// Part of the Array builtin split for better code organization

#include "rift/builtins/array/array.h"

#include <cmath>
#include <functional>

#include "rift/core/engine/call_context.h"
#include "rift/core/engine/javascript_exception.h"
#include "rift/core/engine/this_helpers.h"

namespace rift::builtins {

using rift::core::extractThisObject;

Value Array::forEach(const CallContext& ctx, const std::vector<Value>& args) {
    auto* arrayObj = extractThisObject(ctx);
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
    auto* arrayObj = extractThisObject(ctx);
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

    return Value(createArrayObject(getObjectFactory(), std::move(results)));
}

Value Array::filter(const CallContext& ctx, const std::vector<Value>& args) {
    auto* arrayObj = extractThisObject(ctx);
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

    return Value(createArrayObject(getObjectFactory(), std::move(results)));
}

Value Array::reduce(const CallContext& ctx, const std::vector<Value>& args) {
    auto* arrayObj = extractThisObject(ctx);
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

Value Array::reduceRight(const CallContext& ctx, const std::vector<Value>& args) {
    auto* arrayObj = extractThisObject(ctx);
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

Value Array::find(const CallContext& ctx, const std::vector<Value>& args) {
    auto* arrayObj = extractThisObject(ctx);
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
    auto* arrayObj = extractThisObject(ctx);
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

Value Array::findLast(const CallContext& ctx, const std::vector<Value>& args) {
    auto* arrayObj = extractThisObject(ctx);
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
    auto* arrayObj = extractThisObject(ctx);
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

Value Array::every(const CallContext& ctx, const std::vector<Value>& args) {
    auto* arrayObj = extractThisObject(ctx);
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
    auto* arrayObj = extractThisObject(ctx);
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

Value Array::flat(const CallContext& ctx, const std::vector<Value>& args) {
    auto* arrayObj = extractThisObject(ctx);
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
    return Value(createArrayObject(getObjectFactory(), std::move(result)));
}

Value Array::flatMap(const CallContext& ctx, const std::vector<Value>& args) {
    auto* arrayObj = extractThisObject(ctx);
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

    return Value(createArrayObject(getObjectFactory(), std::move(result)));
}

}  // namespace rift::builtins
