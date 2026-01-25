#include "rift/builtins/string/string.h"

#include <algorithm>
#include <cctype>
#include <cmath>
#include <limits>
#include <sstream>

#include "rift/builtins/array/array.h"
#include "rift/builtins/string/string_iterator.h"
#include "rift/builtins/symbol/symbol.h"
#include "rift/core/engine/call_context.h"
#include "rift/core/engine/evaluation_utils.h"
#include "rift/core/engine/this_helpers.h"

namespace rift::builtins {

using rift::core::extractThisString;

void String::setupStaticMethods(JSObject* constructor, rift::memory::ObjectFactory* factory) {
    RIFT_STATIC_METHOD(constructor, "fromCharCode", String::fromCharCode);
}

void String::setupPrototypeMethods(JSObject* prototype, rift::memory::ObjectFactory* factory) {
    RIFT_METHOD(prototype, "charAt", String::charAt);
    RIFT_METHOD(prototype, "charCodeAt", String::charCodeAt);
    RIFT_METHOD(prototype, "concat", String::concat);
    RIFT_METHOD(prototype, "indexOf", String::indexOf);
    RIFT_METHOD(prototype, "lastIndexOf", String::lastIndexOf);
    RIFT_METHOD(prototype, "slice", String::slice);
    RIFT_METHOD(prototype, "split", String::split);
    RIFT_METHOD(prototype, "substring", String::substring);
    RIFT_METHOD(prototype, "toLowerCase", String::toLowerCase);
    RIFT_METHOD(prototype, "toUpperCase", String::toUpperCase);
    RIFT_METHOD(prototype, "toString", String::toString);
    RIFT_METHOD(prototype, "trim", String::trim);
    RIFT_METHOD(prototype, "valueOf", String::valueOf);

    // Symbol.iterator - for for-of loop support
    std::string iterator_key = core::EvaluationUtils::symbolToPropertyKey(Symbol::getIteratorId());
    auto* iterator_func = factory->createJSFunction(String::symbolIterator);
    prototype->setProperty(iterator_key, Value(iterator_func));
}

Value String::constructor(const CallContext& ctx, const std::vector<Value>& args) {
    // If called with new, create a String object
    // If called without new, return a primitive string
    if(args.empty()) {
        return Value("");
    }

    return Value(args[0].toString());
}

Value String::fromCharCode(const CallContext& ctx, const std::vector<Value>& args) {
    std::string result;
    result.reserve(args.size());

    for(const auto& arg : args) {
        double num = arg.toNumber();
        if(!std::isnan(num) && std::isfinite(num)) {
            int charCode = static_cast<int>(num) & 0xFFFF;  // Take lower 16 bits
            if(charCode >= 0 && charCode <= 127) {          // Basic ASCII range
                result += static_cast<char>(charCode);
            } else {
                result += '?';  // Placeholder for non-ASCII characters
            }
        }
    }

    return Value(std::move(result));
}

Value String::charAt(const CallContext& ctx, const std::vector<Value>& args) {
    std::string str = extractThisString(ctx);

    double index = 0;
    if(!args.empty()) {
        index = args[0].toNumber();
    }

    if(std::isnan(index) || index < 0 || index >= static_cast<double>(str.length())) {
        return Value("");
    }

    size_t idx = static_cast<size_t>(index);
    return Value(std::string(1, str[idx]));
}

Value String::charCodeAt(const CallContext& ctx, const std::vector<Value>& args) {
    std::string str = extractThisString(ctx);

    double index = 0;
    if(!args.empty()) {
        index = args[0].toNumber();
    }

    if(std::isnan(index) || index < 0 || index >= static_cast<double>(str.length())) {
        return Value(std::numeric_limits<double>::quiet_NaN());
    }

    size_t idx = static_cast<size_t>(index);
    return Value(static_cast<double>(static_cast<unsigned char>(str[idx])));
}

Value String::concat(const CallContext& ctx, const std::vector<Value>& args) {
    std::string str = extractThisString(ctx);

    // Concat all arguments
    for(size_t i = 0; i < args.size(); ++i) {
        str += args[i].toString();
    }

    return Value(std::move(str));
}

Value String::indexOf(const CallContext& ctx, const std::vector<Value>& args) {
    std::string str = extractThisString(ctx);

    if(args.empty()) {
        return Value(-1.0);
    }

    std::string searchString = args[0].toString();
    size_t fromIndex = 0;

    if(args.size() >= 2) {
        double fromIndexNum = args[1].toNumber();
        if(!std::isnan(fromIndexNum) && fromIndexNum >= 0) {
            fromIndex = static_cast<size_t>(fromIndexNum);
        }
    }

    if(fromIndex >= str.length()) {
        return Value(-1.0);
    }

    size_t pos = str.find(searchString, fromIndex);
    if(pos == std::string::npos) {
        return Value(-1.0);
    }

    return Value(static_cast<double>(pos));
}

Value String::lastIndexOf(const CallContext& ctx, const std::vector<Value>& args) {
    std::string str = extractThisString(ctx);

    if(args.empty()) {
        return Value(-1.0);
    }

    std::string searchString = args[0].toString();
    size_t fromIndex = str.length();

    if(args.size() >= 2) {
        double fromIndexNum = args[1].toNumber();
        if(!std::isnan(fromIndexNum) && fromIndexNum >= 0) {
            fromIndex = std::min(static_cast<size_t>(fromIndexNum), str.length());
        }
    }

    // Search backwards from fromIndex
    for(size_t i = fromIndex; i != SIZE_MAX; --i) {
        if(i + searchString.length() <= str.length() &&
           str.substr(i, searchString.length()) == searchString) {
            return Value(static_cast<double>(i));
        }
    }

    return Value(-1.0);
}

Value String::slice(const CallContext& ctx, const std::vector<Value>& args) {
    std::string str = extractThisString(ctx);

    size_t length = str.length();
    double startNum = 0;
    double endNum = static_cast<double>(length);

    if(!args.empty()) {
        startNum = args[0].toNumber();
    }

    if(args.size() >= 2 && !args[1].isUndefined()) {
        endNum = args[1].toNumber();
    }

    // Handle negative indices
    if(startNum < 0) {
        startNum = std::max(0.0, static_cast<double>(length) + startNum);
    }
    if(endNum < 0) {
        endNum = std::max(0.0, static_cast<double>(length) + endNum);
    }

    size_t start =
        static_cast<size_t>(std::max(0.0, std::min(startNum, static_cast<double>(length))));
    size_t end = static_cast<size_t>(std::max(0.0, std::min(endNum, static_cast<double>(length))));

    if(start >= end) {
        return Value("");
    }

    return Value(str.substr(start, end - start));
}

Value String::substring(const CallContext& ctx, const std::vector<Value>& args) {
    std::string str = extractThisString(ctx);

    size_t length = str.length();
    double startNum = 0;
    double endNum = static_cast<double>(length);

    if(!args.empty()) {
        startNum = args[0].toNumber();
    }

    if(args.size() >= 2 && !args[1].isUndefined()) {
        endNum = args[1].toNumber();
    }

    // Convert negative values to 0
    startNum = std::max(0.0, startNum);
    endNum = std::max(0.0, endNum);

    // Swap if start > end
    if(startNum > endNum) {
        std::swap(startNum, endNum);
    }

    size_t start = static_cast<size_t>(std::min(startNum, static_cast<double>(length)));
    size_t end = static_cast<size_t>(std::min(endNum, static_cast<double>(length)));

    return Value(str.substr(start, end - start));
}

Value String::toLowerCase(const CallContext& ctx, const std::vector<Value>& args) {
    std::string str = extractThisString(ctx);

    std::transform(str.begin(), str.end(), str.begin(),
                   [](unsigned char c) { return std::tolower(c); });

    return Value(std::move(str));
}

Value String::toUpperCase(const CallContext& ctx, const std::vector<Value>& args) {
    std::string str = extractThisString(ctx);

    std::transform(str.begin(), str.end(), str.begin(),
                   [](unsigned char c) { return std::toupper(c); });

    return Value(std::move(str));
}

Value String::trim(const CallContext& ctx, const std::vector<Value>& args) {
    std::string str = extractThisString(ctx);

    // Trim leading whitespace
    size_t start = 0;
    while(start < str.length() && std::isspace(static_cast<unsigned char>(str[start]))) {
        start++;
    }

    // Trim trailing whitespace
    size_t end = str.length();
    while(end > start && std::isspace(static_cast<unsigned char>(str[end - 1]))) {
        end--;
    }

    return Value(str.substr(start, end - start));
}

Value String::split(const CallContext& ctx, const std::vector<Value>& args) {
    std::string str = extractThisString(ctx);

    // Create an array to hold the results using GC-managed creation
    std::vector<Value> elements;

    if(args.empty() || args[0].isUndefined()) {
        // No separator - return array with original string
        elements.push_back(Value(std::move(str)));
    } else {
        std::string separator = args[0].toString();

        if(separator.empty()) {
            // Empty separator - split into individual characters
            for(size_t i = 0; i < str.length(); ++i) {
                elements.push_back(Value(std::string(1, str[i])));
            }
        } else {
            // Split by separator
            size_t start = 0;
            size_t pos = 0;

            while((pos = str.find(separator, start)) != std::string::npos) {
                elements.push_back(Value(str.substr(start, pos - start)));
                start = pos + separator.length();
            }

            // Add the remaining part
            elements.push_back(Value(str.substr(start)));
        }
    }

    // Build a proper Array instance using Array helper
    return Value(Array::createArrayObject(getObjectFactory(), std::move(elements)));
}

Value String::toString(const CallContext& ctx, const std::vector<Value>& args) {
    // Get the string value from 'this'
    std::string str = extractThisString(ctx);
    return Value(std::move(str));
}

Value String::valueOf(const CallContext& ctx, const std::vector<Value>& args) {
    // Get the string value from 'this'
    std::string str = extractThisString(ctx);
    return Value(std::move(str));
}

size_t String::validateStringIndex(const std::string& str, double index) {
    if(std::isnan(index) || index < 0) {
        return 0;
    }

    size_t maxIndex = str.length();
    if(index >= static_cast<double>(maxIndex)) {
        return maxIndex;
    }

    return static_cast<size_t>(index);
}

Value String::symbolIterator(const CallContext& ctx, const std::vector<Value>& /* args */) {
    // Get the string value from 'this'
    std::string str = extractThisString(ctx);
    return Value(StringIterator::create(getObjectFactory(), str));
}

}  // namespace rift::builtins
