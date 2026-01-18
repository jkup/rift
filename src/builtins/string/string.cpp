#include "rift/builtins/string/string.h"

#include <algorithm>
#include <cctype>
#include <cmath>
#include <limits>
#include <sstream>

#include "rift/builtins/array/array.h"
#include "rift/core/engine/call_context.h"
#include "rift/core/engine/this_helpers.h"

namespace rift::builtins {

using rift::core::extractThisString;

void String::setupStaticMethods(JSObject* constructor, rift::memory::ObjectFactory* factory) {
    // Add String static methods
    constructor->setProperty("fromCharCode",
                             Value(factory->createJSFunction(String::fromCharCode)));
}

void String::setupPrototypeMethods(JSObject* prototype, rift::memory::ObjectFactory* factory) {
    // Add String.prototype methods using GC-managed function creation
    prototype->setProperty("charAt", Value(factory->createJSFunction(String::charAt)));
    prototype->setProperty("charCodeAt", Value(factory->createJSFunction(String::charCodeAt)));
    prototype->setProperty("concat", Value(factory->createJSFunction(String::concat)));
    prototype->setProperty("indexOf", Value(factory->createJSFunction(String::indexOf)));
    prototype->setProperty("lastIndexOf", Value(factory->createJSFunction(String::lastIndexOf)));
    prototype->setProperty("slice", Value(factory->createJSFunction(String::slice)));
    prototype->setProperty("split", Value(factory->createJSFunction(String::split)));
    prototype->setProperty("substring", Value(factory->createJSFunction(String::substring)));
    prototype->setProperty("toLowerCase", Value(factory->createJSFunction(String::toLowerCase)));
    prototype->setProperty("toUpperCase", Value(factory->createJSFunction(String::toUpperCase)));
    prototype->setProperty("toString", Value(factory->createJSFunction(String::toString)));
    prototype->setProperty("trim", Value(factory->createJSFunction(String::trim)));
    prototype->setProperty("valueOf", Value(factory->createJSFunction(String::valueOf)));
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

    return Value(result);
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

    return Value(str);
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

    return Value(str);
}

Value String::toUpperCase(const CallContext& ctx, const std::vector<Value>& args) {
    std::string str = extractThisString(ctx);

    std::transform(str.begin(), str.end(), str.begin(),
                   [](unsigned char c) { return std::toupper(c); });

    return Value(str);
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
        elements.push_back(Value(str));
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
    return Value(Array::createArrayObject(getObjectFactory(), elements));
}

Value String::toString(const CallContext& ctx, const std::vector<Value>& args) {
    // Get the string value from 'this'
    std::string str = extractThisString(ctx);
    return Value(str);
}

Value String::valueOf(const CallContext& ctx, const std::vector<Value>& args) {
    // Get the string value from 'this'
    std::string str = extractThisString(ctx);
    return Value(str);
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

}  // namespace rift::builtins
