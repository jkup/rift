#include "rift/builtins/string/string.h"

#include <cmath>
#include <limits>
#include <sstream>
#include <algorithm>
#include <cctype>

namespace rift::builtins {

// Static factory storage
rift::memory::ObjectFactory* String::object_factory_ = nullptr;

void String::setObjectFactory(rift::memory::ObjectFactory* factory) {
    object_factory_ = factory;
}

JSObject* String::create(rift::memory::ObjectFactory* factory) {
    // Store factory for use in other methods
    setObjectFactory(factory);
    
    // Create String constructor using GC-managed creation
    auto *string = factory->createJSFunction(String::constructor);

    // Create and set prototype
    auto *prototype = createPrototype(factory);
    string->setProperty("prototype", Value(prototype));  // prototype is now raw pointer

    return string;  // Return raw pointer
}

JSObject* String::createPrototype(rift::memory::ObjectFactory* factory) {
    // Create String.prototype using GC-managed creation
    auto *prototype = factory->createJSObject();

    // Add prototype methods using GC-managed function creation
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

    return prototype;  // Return raw pointer
}

Value String::constructor(const std::vector<Value>& args) {
    // If called with new, create a String object
    // If called without new, return a primitive string
    if (args.empty()) {
        return Value("");
    }

    return Value(args[0].toString());
}

Value String::fromCharCode(const std::vector<Value>& args) {
    std::string result;
    result.reserve(args.size());

    for (const auto& arg : args) {
        double num = arg.toNumber();
        if (!std::isnan(num) && std::isfinite(num)) {
            int charCode = static_cast<int>(num) & 0xFFFF;  // Take lower 16 bits
            if (charCode >= 0 && charCode <= 127) {         // Basic ASCII range
                result += static_cast<char>(charCode);
            } else {
                result += '?';  // Placeholder for non-ASCII characters
            }
        }
    }

    return Value(result);
}

Value String::charAt(const std::vector<Value>& args) {
    std::string str = getStringValue(args);

    double index = 0;
    if (args.size() >= 2) {          // Fixed: should check for second argument (index 1)
        index = args[1].toNumber();  // Fixed: use args[1] since args[0] is the string
    }

    if (std::isnan(index) || index < 0 || index >= static_cast<double>(str.length())) {
        return Value("");
    }

    size_t idx = static_cast<size_t>(index);
    return Value(std::string(1, str[idx]));
}

Value String::charCodeAt(const std::vector<Value>& args) {
    std::string str = getStringValue(args);

    double index = 0;
    if (args.size() >= 2) {
        index = args[1].toNumber();
    }

    if (std::isnan(index) || index < 0 || index >= static_cast<double>(str.length())) {
        return Value(std::numeric_limits<double>::quiet_NaN());
    }

    size_t idx = static_cast<size_t>(index);
    return Value(static_cast<double>(static_cast<unsigned char>(str[idx])));
}

Value String::concat(const std::vector<Value>& args) {
    std::string str = getStringValue(args);

    // Skip the first argument (the string itself) and concat the rest
    for (size_t i = 1; i < args.size(); ++i) {
        str += args[i].toString();
    }

    return Value(str);
}

Value String::indexOf(const std::vector<Value>& args) {
    std::string str = getStringValue(args);

    if (args.size() < 2) {
        return Value(-1.0);
    }

    std::string searchString = args[1].toString();
    size_t fromIndex = 0;

    if (args.size() >= 3) {
        double fromIndexNum = args[2].toNumber();
        if (!std::isnan(fromIndexNum) && fromIndexNum >= 0) {
            fromIndex = static_cast<size_t>(fromIndexNum);
        }
    }

    if (fromIndex >= str.length()) {
        return Value(-1.0);
    }

    size_t pos = str.find(searchString, fromIndex);
    if (pos == std::string::npos) {
        return Value(-1.0);
    }

    return Value(static_cast<double>(pos));
}

Value String::lastIndexOf(const std::vector<Value>& args) {
    std::string str = getStringValue(args);

    if (args.size() < 2) {
        return Value(-1.0);
    }

    std::string searchString = args[1].toString();
    size_t fromIndex = str.length();

    if (args.size() >= 3) {
        double fromIndexNum = args[2].toNumber();
        if (!std::isnan(fromIndexNum) && fromIndexNum >= 0) {
            fromIndex = std::min(static_cast<size_t>(fromIndexNum), str.length());
        }
    }

    // Search backwards from fromIndex
    for (size_t i = fromIndex; i != SIZE_MAX; --i) {
        if (i + searchString.length() <= str.length() &&
            str.substr(i, searchString.length()) == searchString) {
            return Value(static_cast<double>(i));
        }
    }

    return Value(-1.0);
}

Value String::slice(const std::vector<Value>& args) {
    std::string str = getStringValue(args);

    size_t length = str.length();
    double startNum = 0;
    double endNum = static_cast<double>(length);

    if (args.size() >= 2) {
        startNum = args[1].toNumber();
    }

    if (args.size() >= 3 && !args[2].isUndefined()) {
        endNum = args[2].toNumber();
    }

    // Handle negative indices
    if (startNum < 0) {
        startNum = std::max(0.0, static_cast<double>(length) + startNum);
    }
    if (endNum < 0) {
        endNum = std::max(0.0, static_cast<double>(length) + endNum);
    }

    size_t start =
        static_cast<size_t>(std::max(0.0, std::min(startNum, static_cast<double>(length))));
    size_t end = static_cast<size_t>(std::max(0.0, std::min(endNum, static_cast<double>(length))));

    if (start >= end) {
        return Value("");
    }

    return Value(str.substr(start, end - start));
}

Value String::substring(const std::vector<Value>& args) {
    std::string str = getStringValue(args);

    size_t length = str.length();
    double startNum = 0;
    double endNum = static_cast<double>(length);

    if (args.size() >= 2) {
        startNum = args[1].toNumber();
    }

    if (args.size() >= 3 && !args[2].isUndefined()) {
        endNum = args[2].toNumber();
    }

    // Convert negative values to 0
    startNum = std::max(0.0, startNum);
    endNum = std::max(0.0, endNum);

    // Swap if start > end
    if (startNum > endNum) {
        std::swap(startNum, endNum);
    }

    size_t start = static_cast<size_t>(std::min(startNum, static_cast<double>(length)));
    size_t end = static_cast<size_t>(std::min(endNum, static_cast<double>(length)));

    return Value(str.substr(start, end - start));
}

Value String::toLowerCase(const std::vector<Value>& args) {
    std::string str = getStringValue(args);

    std::transform(str.begin(), str.end(), str.begin(),
                   [](unsigned char c) { return std::tolower(c); });

    return Value(str);
}

Value String::toUpperCase(const std::vector<Value>& args) {
    std::string str = getStringValue(args);

    std::transform(str.begin(), str.end(), str.begin(),
                   [](unsigned char c) { return std::toupper(c); });

    return Value(str);
}

Value String::trim(const std::vector<Value>& args) {
    std::string str = getStringValue(args);

    // Trim leading whitespace
    size_t start = 0;
    while (start < str.length() && std::isspace(static_cast<unsigned char>(str[start]))) {
        start++;
    }

    // Trim trailing whitespace
    size_t end = str.length();
    while (end > start && std::isspace(static_cast<unsigned char>(str[end - 1]))) {
        end--;
    }

    return Value(str.substr(start, end - start));
}

Value String::split(const std::vector<Value>& args) {
    std::string str = getStringValue(args);

    // Create an array to hold the results using GC-managed creation
    auto *result = object_factory_->createJSObject();  // Use factory instead of std::make_shared
    std::vector<Value> elements;

    if (args.size() < 2 || args[1].isUndefined()) {
        // No separator - return array with original string
        elements.push_back(Value(str));
    } else {
        std::string separator = args[1].toString();

        if (separator.empty()) {
            // Empty separator - split into individual characters
            for (size_t i = 0; i < str.length(); ++i) {
                elements.push_back(Value(std::string(1, str[i])));
            }
        } else {
            // Split by separator
            size_t start = 0;
            size_t pos = 0;

            while ((pos = str.find(separator, start)) != std::string::npos) {
                elements.push_back(Value(str.substr(start, pos - start)));
                start = pos + separator.length();
            }

            // Add the remaining part
            elements.push_back(Value(str.substr(start)));
        }
    }

    // Set array properties (simplified array-like object)
    for (size_t i = 0; i < elements.size(); ++i) {
        result->setProperty(std::to_string(i), elements[i]);
    }
    result->setProperty("length", Value(static_cast<double>(elements.size())));

    return Value(result);  // result is now raw pointer
}

Value String::toString(const std::vector<Value>& args) {
    // Get the string value from 'this'
    std::string str = getStringValue(args);
    return Value(str);
}

Value String::valueOf(const std::vector<Value>& args) {
    // Get the string value from 'this'
    std::string str = getStringValue(args);
    return Value(str);
}

std::string String::getStringValue(const std::vector<Value>& args) {
    // In a full implementation, this would extract the 'this' value
    // For now, we'll use the first argument as a placeholder
    if (!args.empty()) {
        return args[0].toString();
    }
    return "";
}

size_t String::validateStringIndex(const std::string& str, double index) {
    if (std::isnan(index) || index < 0) {
        return 0;
    }

    size_t maxIndex = str.length();
    if (index >= static_cast<double>(maxIndex)) {
        return maxIndex;
    }

    return static_cast<size_t>(index);
}

}  // namespace rift::builtins