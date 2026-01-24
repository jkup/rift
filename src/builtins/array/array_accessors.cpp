// Array accessor methods - methods that access, search, or copy array elements
// Part of the Array builtin split for better code organization

#include <cmath>

#include "rift/builtins/array/array.h"
#include "rift/core/engine/this_helpers.h"

namespace rift::builtins {

using rift::core::extractThisObject;

Value Array::getLength(const CallContext& ctx, const std::vector<Value>& args) {
    auto* arrayObj = extractThisObject(ctx);
    if(!arrayObj) {
        return Value(0.0);
    }

    return Value(static_cast<double>(getArrayLength(arrayObj)));
}

Value Array::indexOf(const CallContext& ctx, const std::vector<Value>& args) {
    auto* arrayObj = extractThisObject(ctx);
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

Value Array::lastIndexOf(const CallContext& ctx, const std::vector<Value>& args) {
    auto* arrayObj = extractThisObject(ctx);
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

Value Array::includes(const CallContext& ctx, const std::vector<Value>& args) {
    Value indexResult = indexOf(ctx, args);
    return Value(indexResult.toNumber() >= 0);
}

Value Array::slice(const CallContext& ctx, const std::vector<Value>& args) {
    auto* arrayObj = extractThisObject(ctx);
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

    return Value(createArrayObject(getObjectFactory(), std::move(sliced)));
}

Value Array::concat(const CallContext& ctx, const std::vector<Value>& args) {
    auto* arrayObj = extractThisObject(ctx);
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

    return Value(createArrayObject(getObjectFactory(), std::move(result)));
}

Value Array::join(const CallContext& ctx, const std::vector<Value>& args) {
    auto* arrayObj = extractThisObject(ctx);
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

    return Value(std::move(result));
}

Value Array::toString(const CallContext& ctx, const std::vector<Value>& args) {
    auto* arrayObj = extractThisObject(ctx);
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

    return Value(std::move(result));
}

}  // namespace rift::builtins
