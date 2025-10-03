#include "rift/builtins/json/json.h"

#include <cctype>
#include <cmath>
#include <iomanip>
#include <sstream>
#include <stdexcept>

#include "rift/core/engine/engine.h"
#include "rift/core/engine/javascript_exception.h"
#include "rift/core/runtime_limits.h"
#include "rift/memory/object_factory.h"
#include "rift/runtime/environment/environment.h"
#include "rift/runtime/values/object.h"

namespace rift::builtins {

using namespace rift::runtime;
using namespace rift::core;

void JSON::setup(std::shared_ptr<Environment> env, rift::core::Rift* engine) {
    // Get ObjectFactory for GC-managed object creation
    auto* factory = engine->getObjectFactory();

    // Create JSON object using GC-managed allocation
    auto* jsonObject = factory->createJSObject();

    // Add parse method using GC-managed allocation
    // Capture engine pointer to access ObjectFactory during parse
    auto* parseFunc = factory->createJSFunction(
        [engine](const rift::core::CallContext& /*ctx*/, const std::vector<Value>& args) -> Value {
            return JSON::parse(args, engine->getObjectFactory());
        });
    jsonObject->setProperty("parse", Value(parseFunc));

    // Add stringify method using GC-managed allocation
    auto* stringifyFunc = factory->createJSFunction(
        [](const rift::core::CallContext& /*ctx*/, const std::vector<Value>& args) -> Value {
            return JSON::stringify(args);
        });
    jsonObject->setProperty("stringify", Value(stringifyFunc));

    // Add to global environment
    env->define("JSON", Value(jsonObject));
}

Value JSON::parse(const std::vector<Value>& args, rift::memory::ObjectFactory* factory) {
    if(args.empty()) {
        throw JavaScriptException(Value("SyntaxError: Unexpected end of JSON input"));
    }

    // Convert argument to string (JavaScript JSON.parse converts any argument)
    std::string jsonString = args[0].toString();

    // WORKAROUND: If we got "[object Object]", there's an issue with argument passing
    // For now, let's handle some basic cases directly
    if(jsonString == "[object Object]") {
        // This shouldn't happen in a proper implementation, but let's provide a meaningful error
        throw JavaScriptException(
            Value("SyntaxError: Invalid JSON input - received object instead of string"));
    }
    
    // Get the ObjectManager to temporarily disable GC during parsing
    // This prevents premature collection of intermediate objects that aren't yet rooted
    auto* objManager = factory->getObjectManager();
    bool wasGCEnabled = objManager->isGCEnabled();
    
    try {
        // Disable GC during parsing to prevent collection of intermediate objects
        objManager->setGCEnabled(false);
        
        size_t pos = 0;
        skipWhitespace(jsonString, pos);
        Value result = parseValue(jsonString, pos, factory);
        skipWhitespace(jsonString, pos);

        // Check if we consumed the entire string
        if(pos < jsonString.length()) {
            // Re-enable GC before throwing
            objManager->setGCEnabled(wasGCEnabled);
            throw JavaScriptException(Value("SyntaxError: Unexpected token in JSON"));
        }

        // Re-enable GC after successful parse
        objManager->setGCEnabled(wasGCEnabled);
        return result;
    } catch(const std::exception& e) {
        // Re-enable GC before throwing
        objManager->setGCEnabled(wasGCEnabled);
        throw JavaScriptException(Value("SyntaxError: " + std::string(e.what())));
    }
}

Value JSON::stringify(const std::vector<Value>& args) {
    if(args.empty()) {
        return Value::undefined();
    }

    try {
        std::string result = stringifyValue(args[0]);
        return Value(result);
    } catch(const std::exception& e) {
        // JSON.stringify returns undefined for unstringifiable values
        return Value::undefined();
    }
}

Value JSON::parseValue(const std::string& json, size_t& pos, rift::memory::ObjectFactory* factory) {
    skipWhitespace(json, pos);

    if(pos >= json.length()) {
        throw std::runtime_error("Unexpected end of input");
    }

    char ch = json[pos];

    switch(ch) {
        case '{':
            return parseObject(json, pos, factory);
        case '[':
            return parseArray(json, pos, factory);
        case '"':
            return parseString(json, pos);
        case 't':
            // Check for "true"
            if(pos + 4 <= json.length() && json.substr(pos, 4) == "true") {
                pos += 4;
                return Value(true);
            }
            throw std::runtime_error("Invalid token: expected 'true'");
        case 'f':
            // Check for "false"
            if(pos + 5 <= json.length() && json.substr(pos, 5) == "false") {
                pos += 5;
                return Value(false);
            }
            throw std::runtime_error("Invalid token: expected 'false'");
        case 'n':
            // Check for "null"
            if(pos + 4 <= json.length() && json.substr(pos, 4) == "null") {
                pos += 4;
                return Value::null();
            }
            throw std::runtime_error("Invalid token: expected 'null'");
        default:
            if(ch == '-' || (ch >= '0' && ch <= '9')) {
                return parseNumber(json, pos);
            }
            std::string error = "Unexpected character: '" + std::string(1, ch) +
                                "' (ASCII: " + std::to_string(static_cast<int>(ch)) + ")";
            throw std::runtime_error(error);
    }
}

Value JSON::parseObject(const std::string& json, size_t& pos, rift::memory::ObjectFactory* factory) {
    // Use GC-managed object creation - object is immediately tracked by GC
    auto* object = factory->createJSObject();

    pos++;  // Skip '{'
    skipWhitespace(json, pos);

    // Handle empty object
    if(pos < json.length() && json[pos] == '}') {
        pos++;
        return Value(object);
    }

    while(pos < json.length()) {
        // Parse key
        skipWhitespace(json, pos);
        if(pos >= json.length() || json[pos] != '"') {
            throw std::runtime_error("Expected property name");
        }

        Value keyValue = parseString(json, pos);
        std::string key = keyValue.toString();

        // Expect colon
        skipWhitespace(json, pos);
        if(pos >= json.length() || json[pos] != ':') {
            throw std::runtime_error("Expected ':'");
        }
        pos++;  // Skip ':'

        // Parse value
        skipWhitespace(json, pos);
        Value value = parseValue(json, pos, factory);

        // Set property
        object->setProperty(key, value);

        // Check for continuation
        skipWhitespace(json, pos);
        if(pos >= json.length()) {
            throw std::runtime_error("Expected '}'");
        }

        if(json[pos] == '}') {
            pos++;
            break;
        } else if(json[pos] == ',') {
            pos++;
            continue;
        } else {
            throw std::runtime_error("Expected ',' or '}'");
        }
    }

    return Value(object);
}

Value JSON::parseArray(const std::string& json, size_t& pos, rift::memory::ObjectFactory* factory) {
    // Use GC-managed object creation - object is immediately tracked by GC
    auto* array = factory->createJSObject();

    pos++;  // Skip '['
    skipWhitespace(json, pos);

    // Handle empty array
    if(pos < json.length() && json[pos] == ']') {
        pos++;
        // Set length property
        array->setProperty("length", Value(0.0));
        return Value(array);
    }

    double index = 0;

    while(pos < json.length()) {
        // Parse value
        skipWhitespace(json, pos);
        Value value = parseValue(json, pos, factory);

        // Set array element
        array->setProperty(std::to_string(static_cast<int>(index)), value);
        index++;

        // Check for continuation
        skipWhitespace(json, pos);
        if(pos >= json.length()) {
            throw std::runtime_error("Expected ']'");
        }

        if(json[pos] == ']') {
            pos++;
            break;
        } else if(json[pos] == ',') {
            pos++;
            continue;
        } else {
            throw std::runtime_error("Expected ',' or ']'");
        }
    }

    // Set length property
    array->setProperty("length", Value(index));
    return Value(array);
}

Value JSON::parseString(const std::string& json, size_t& pos) {
    pos++;  // Skip opening quote
    std::string result;
    result.reserve(256);  // Reserve some space to reduce allocations

    while(pos < json.length()) {
        // Check string length limit (prevent DoS via huge JSON strings)
        if(result.length() >= rift::core::RuntimeLimits::MAX_STRING_LENGTH) {
            throw std::runtime_error("JSON string exceeds maximum length (" +
                                     std::to_string(rift::core::RuntimeLimits::MAX_STRING_LENGTH) +
                                     " characters)");
        }

        char ch = json[pos];

        if(ch == '"') {
            pos++;  // Skip closing quote
            return Value(result);
        } else if(ch == '\\') {
            pos++;
            if(pos >= json.length()) {
                throw std::runtime_error("JSON: Unterminated escape sequence in string");
            }

            char escaped = json[pos];
            switch(escaped) {
                case '"':
                    result += '"';
                    break;
                case '\\':
                    result += '\\';
                    break;
                case '/':
                    result += '/';
                    break;
                case 'b':
                    result += '\b';
                    break;
                case 'f':
                    result += '\f';
                    break;
                case 'n':
                    result += '\n';
                    break;
                case 'r':
                    result += '\r';
                    break;
                case 't':
                    result += '\t';
                    break;
                case 'u': {
                    // Unicode escape sequence \uXXXX
                    // Validate we have 4 hex digits available after current position
                    if(pos + 4 > json.length()) {
                        throw std::runtime_error("JSON: Incomplete unicode escape sequence");
                    }
                    
                    // For now, just preserve the escape sequence literally
                    // Full unicode support would require proper UTF-8 encoding
                    result += "\\u";
                    for(size_t i = 1; i <= 4; i++) {
                        char hexChar = json[pos + i];
                        if(!std::isxdigit(hexChar)) {
                            throw std::runtime_error("JSON: Invalid unicode escape sequence (non-hex digit)");
                        }
                        result += hexChar;
                    }
                    pos += 4;  // Skip the 4 hex digits (pos++ happens below)
                    break;
                }
                default:
                    throw std::runtime_error("JSON: Invalid escape sequence '\\" + std::string(1, escaped) + "'");
            }
            pos++;
        } else if(ch < 0x20) {
            // Control characters must be escaped in JSON
            throw std::runtime_error("JSON: Unescaped control character in string (char code " +
                                     std::to_string(static_cast<int>(ch)) + ")");
        } else {
            result += ch;
            pos++;
        }
    }

    throw std::runtime_error("JSON: Unterminated string");
}

Value JSON::parseNumber(const std::string& json, size_t& pos) {
    size_t start = pos;

    // Handle negative sign
    if(pos < json.length() && json[pos] == '-') {
        pos++;
    }

    // Parse integer part
    if(pos >= json.length() || !std::isdigit(json[pos])) {
        throw std::runtime_error("Invalid number");
    }

    if(json[pos] == '0') {
        pos++;
    } else {
        while(pos < json.length() && std::isdigit(json[pos])) {
            pos++;
        }
    }

    // Parse fractional part
    if(pos < json.length() && json[pos] == '.') {
        pos++;
        if(pos >= json.length() || !std::isdigit(json[pos])) {
            throw std::runtime_error("Invalid number");
        }
        while(pos < json.length() && std::isdigit(json[pos])) {
            pos++;
        }
    }

    // Parse exponent part
    if(pos < json.length() && (json[pos] == 'e' || json[pos] == 'E')) {
        pos++;
        if(pos < json.length() && (json[pos] == '+' || json[pos] == '-')) {
            pos++;
        }
        if(pos >= json.length() || !std::isdigit(json[pos])) {
            throw std::runtime_error("Invalid number");
        }
        while(pos < json.length() && std::isdigit(json[pos])) {
            pos++;
        }
    }

    std::string numberStr = json.substr(start, pos - start);
    double value = std::stod(numberStr);
    return Value(value);
}

void JSON::skipWhitespace(const std::string& json, size_t& pos) {
    while(pos < json.length() &&
          (json[pos] == ' ' || json[pos] == '\t' || json[pos] == '\n' || json[pos] == '\r')) {
        pos++;
    }
}

std::string JSON::stringifyValue(const Value& value) {
    if(value.isUndefined()) {
        throw std::runtime_error("Cannot stringify undefined");
    } else if(value.isNull()) {
        return "null";
    } else if(value.isBoolean()) {
        return value.toBool() ? "true" : "false";
    } else if(value.isNumber()) {
        double num = value.toNumber();
        // Handle special number values
        if(std::isnan(num) || std::isinf(num)) {
            return "null";
        }
        // Check if it's an integer
        if(num == std::floor(num)) {
            return std::to_string(static_cast<long long>(num));
        } else {
            return std::to_string(num);
        }
    } else if(value.isString()) {
        return "\"" + escapeString(value.toString()) + "\"";
    } else if(value.isObject()) {
        JSObject* obj = value.getObject();

        // Check if it's an array (has numeric indices and length property)
        if(obj->hasProperty("length")) {
            // Stringify as array
            std::stringstream ss;
            ss << "[";

            Value lengthVal = obj->getProperty("length");
            if(lengthVal.isNumber()) {
                int length = static_cast<int>(lengthVal.toNumber());
                for(int i = 0; i < length; i++) {
                    if(i > 0)
                        ss << ",";

                    if(obj->hasProperty(std::to_string(i))) {
                        Value element = obj->getProperty(std::to_string(i));
                        ss << stringifyValue(element);
                    } else {
                        ss << "null";
                    }
                }
            }

            ss << "]";
            return ss.str();
        } else {
            // Stringify as object
            std::stringstream ss;
            ss << "{";

            bool first = true;
            std::vector<std::string> propNames = obj->getOwnPropertyNames();
            for(const std::string& key : propNames) {
                Value val = obj->getProperty(key);

                // Skip undefined values and function properties
                if(val.isUndefined() || val.isFunction()) {
                    continue;
                }

                if(!first)
                    ss << ",";
                first = false;

                ss << "\"" << escapeString(key) << "\":" << stringifyValue(val);
            }

            ss << "}";
            return ss.str();
        }
    }

    throw std::runtime_error("Cannot stringify value");
}

std::string JSON::escapeString(const std::string& str) {
    std::string result;
    for(char ch : str) {
        switch(ch) {
            case '"':
                result += "\\\"";
                break;
            case '\\':
                result += "\\\\";
                break;
            case '\b':
                result += "\\b";
                break;
            case '\f':
                result += "\\f";
                break;
            case '\n':
                result += "\\n";
                break;
            case '\r':
                result += "\\r";
                break;
            case '\t':
                result += "\\t";
                break;
            default:
                if(ch < 32) {
                    // Control characters
                    std::stringstream ss;
                    ss << "\\u" << std::hex << std::setw(4) << std::setfill('0')
                       << static_cast<int>(ch);
                    result += ss.str();
                } else {
                    result += ch;
                }
                break;
        }
    }
    return result;
}

}  // namespace rift::builtins