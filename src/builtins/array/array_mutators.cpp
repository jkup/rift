// Array mutator methods - methods that modify the array in place
// Part of the Array builtin split for better code organization

#include <algorithm>
#include <cmath>
#include <limits>

#include "rift/builtins/array/array.h"
#include "rift/core/engine/evaluation_utils.h"
#include "rift/core/engine/this_helpers.h"

namespace rift::builtins {

using rift::core::extractThisObject;

Value Array::push(const CallContext& ctx, const std::vector<Value>& args) {
    auto* arrayObj = extractThisObject(ctx);
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
    auto* arrayObj = extractThisObject(ctx);
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
    auto* arrayObj = extractThisObject(ctx);
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
    auto* arrayObj = extractThisObject(ctx);
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

Value Array::splice(const CallContext& ctx, const std::vector<Value>& args) {
    auto* arrayObj = extractThisObject(ctx);
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
    auto* arrayObj = extractThisObject(ctx);
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
    auto* arrayObj = extractThisObject(ctx);
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

}  // namespace rift::builtins
