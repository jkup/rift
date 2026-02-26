#include "rift/builtins/global/global.h"

#include <cctype>
#include <cmath>
#include <cstdint>
#include <limits>
#include <string>

#include "rift/execution/environment.h"
#include "rift/interpreter/javascript_exception.h"
#include "rift/types/object.h"

namespace rift::builtins {

void Global::setupGlobalFunctions(std::shared_ptr<Environment> global_env,
                                  rift::memory::ObjectFactory* factory) {
    // Add global functions using GC-managed creation
    global_env->define("parseInt", Value(factory->createJSFunction(parseInt)));
    global_env->define("parseFloat", Value(factory->createJSFunction(parseFloat)));
    global_env->define("isNaN", Value(factory->createJSFunction(isNaN)));
    global_env->define("isFinite", Value(factory->createJSFunction(isFinite)));

    // URI handling functions (19.2.6)
    auto* encode_uri_fn = factory->createJSFunction(encodeURI);
    encode_uri_fn->setProperty("name", Value("encodeURI"));
    encode_uri_fn->setProperty("length", Value(1.0));
    global_env->define("encodeURI", Value(encode_uri_fn));

    auto* encode_uri_comp_fn = factory->createJSFunction(encodeURIComponent);
    encode_uri_comp_fn->setProperty("name", Value("encodeURIComponent"));
    encode_uri_comp_fn->setProperty("length", Value(1.0));
    global_env->define("encodeURIComponent", Value(encode_uri_comp_fn));

    auto* decode_uri_fn = factory->createJSFunction(decodeURI);
    decode_uri_fn->setProperty("name", Value("decodeURI"));
    decode_uri_fn->setProperty("length", Value(1.0));
    global_env->define("decodeURI", Value(decode_uri_fn));

    auto* decode_uri_comp_fn = factory->createJSFunction(decodeURIComponent);
    decode_uri_comp_fn->setProperty("name", Value("decodeURIComponent"));
    decode_uri_comp_fn->setProperty("length", Value(1.0));
    global_env->define("decodeURIComponent", Value(decode_uri_comp_fn));

    // Add array creation helper
    global_env->define("createArray", Value(factory->createJSFunction(createArray)));

    // Add global constants
    global_env->define("undefined", Value::undefined());
    global_env->define("NaN", Value(std::numeric_limits<double>::quiet_NaN()));
    global_env->define("Infinity", Value(std::numeric_limits<double>::infinity()));
}

Value Global::parseInt(const std::vector<Value>& args) {
    if(args.empty()) {
        return Value(std::numeric_limits<double>::quiet_NaN());
    }

    std::string str = args[0].toString();
    int radix = 10;

    if(args.size() >= 2) {
        double radixNum = args[1].toNumber();
        if(!std::isnan(radixNum)) {
            radix = static_cast<int>(radixNum);
        }
    }

    // Radix must be between 2 and 36
    if(radix < 2 || radix > 36) {
        return Value(std::numeric_limits<double>::quiet_NaN());
    }

    // Skip whitespace
    size_t i = 0;
    while(i < str.length() && std::isspace(str[i])) {
        i++;
    }

    if(i >= str.length()) {
        return Value(std::numeric_limits<double>::quiet_NaN());
    }

    // Handle sign
    bool negative = false;
    if(str[i] == '-') {
        negative = true;
        i++;
    } else if(str[i] == '+') {
        i++;
    }

    // Handle hex prefix for radix 16
    if(radix == 16 && i + 1 < str.length() && str[i] == '0' &&
       (str[i + 1] == 'x' || str[i + 1] == 'X')) {
        i += 2;
    }

    // Parse digits
    double result = 0;
    bool foundValidDigit = false;

    while(i < str.length()) {
        char c = str[i];
        if(!isValidDigit(c, radix)) {
            break;
        }

        foundValidDigit = true;
        result = result * radix + getDigitValue(c);
        i++;
    }

    if(!foundValidDigit) {
        return Value(std::numeric_limits<double>::quiet_NaN());
    }

    return Value(negative ? -result : result);
}

Value Global::parseFloat(const std::vector<Value>& args) {
    if(args.empty()) {
        return Value(std::numeric_limits<double>::quiet_NaN());
    }

    std::string str = args[0].toString();

    // Skip leading whitespace
    size_t i = 0;
    while(i < str.length() && std::isspace(str[i])) {
        i++;
    }

    if(i >= str.length()) {
        return Value(std::numeric_limits<double>::quiet_NaN());
    }

    // Handle infinity
    if(str.substr(i, 8) == "Infinity") {
        return Value(std::numeric_limits<double>::infinity());
    }
    if(str.substr(i, 9) == "-Infinity") {
        return Value(-std::numeric_limits<double>::infinity());
    }
    if(str.substr(i, 9) == "+Infinity") {
        return Value(std::numeric_limits<double>::infinity());
    }

    // Parse using standard library
    try {
        size_t endPos;
        double result = std::stod(str.substr(i), &endPos);
        return Value(result);
    } catch(const std::invalid_argument&) {
        // String is not a valid number
        return Value(std::numeric_limits<double>::quiet_NaN());
    } catch(const std::out_of_range&) {
        // Number out of range - return infinity with appropriate sign
        return Value(str[0] == '-' ? -std::numeric_limits<double>::infinity()
                                   : std::numeric_limits<double>::infinity());
    }
}

Value Global::isNaN(const std::vector<Value>& args) {
    if(args.empty()) {
        return Value(true);  // isNaN(undefined) is true
    }

    double num = args[0].toNumber();
    return Value(std::isnan(num));
}

Value Global::isFinite(const std::vector<Value>& args) {
    if(args.empty()) {
        return Value(false);  // isFinite(undefined) is false
    }

    double num = args[0].toNumber();
    return Value(std::isfinite(num));
}

Value Global::createArray(const std::vector<Value>& args) {
    // TODO: Placeholder implementation. This should create and return a new array using the
    // ObjectFactory. Currently returns undefined because the factory is not available in this
    // context. To implement, refactor to provide access to the factory or pass it as an argument.
    return Value::undefined();
}

bool Global::isValidDigit(char c, int radix) {
    if(radix <= 10) {
        return c >= '0' && c < ('0' + radix);
    } else {
        return (c >= '0' && c <= '9') || (c >= 'a' && c < ('a' + radix - 10)) ||
               (c >= 'A' && c < ('A' + radix - 10));
    }
}

int Global::getDigitValue(char c) {
    if(c >= '0' && c <= '9') {
        return c - '0';
    } else if(c >= 'a' && c <= 'z') {
        return c - 'a' + 10;
    } else if(c >= 'A' && c <= 'Z') {
        return c - 'A' + 10;
    }
    return 0;
}

// ============================================================================
// URI Encoding/Decoding (ECMA-262 §19.2.6)
// @spec https://tc39.es/ecma262/#sec-uri-handling-functions
// ============================================================================

int Global::hexDigitValue(char c) {
    if(c >= '0' && c <= '9')
        return c - '0';
    if(c >= 'a' && c <= 'f')
        return c - 'a' + 10;
    if(c >= 'A' && c <= 'F')
        return c - 'A' + 10;
    return -1;
}

/// @spec https://tc39.es/ecma262/#sec-encode
/// Encode performs %-encoding on a UTF-8 string, leaving characters in
/// `unescaped` unencoded. All other characters are UTF-8 encoded and each
/// byte is written as %XX.
std::string Global::encodeHelper(const std::string& str, const std::string& unescaped) {
    // 1. Convert the input string to UTF-16 code units (we work with UTF-8 bytes,
    //    but must validate surrogate pairs per the spec).
    std::string result;
    result.reserve(str.size());

    size_t i = 0;
    while(i < str.size()) {
        // Get the current byte
        unsigned char c = static_cast<unsigned char>(str[i]);

        // For ASCII characters, check if they're in the unescaped set
        if(c <= 0x7F) {
            char ch = static_cast<char>(c);
            if(unescaped.find(ch) != std::string::npos) {
                result += ch;
            } else {
                // Percent-encode this byte
                static const char hex_chars[] = "0123456789ABCDEF";
                result += '%';
                result += hex_chars[(c >> 4) & 0x0F];
                result += hex_chars[c & 0x0F];
            }
            i++;
        } else {
            // Multi-byte UTF-8 sequence — determine length
            size_t byte_count = 0;
            if((c & 0xE0) == 0xC0) {
                byte_count = 2;
            } else if((c & 0xF0) == 0xE0) {
                byte_count = 3;
            } else if((c & 0xF8) == 0xF0) {
                byte_count = 4;
            } else {
                throw rift::core::JavaScriptException(Value("URIError: URI malformed"));
            }

            // Validate we have enough continuation bytes
            if(i + byte_count > str.size()) {
                throw rift::core::JavaScriptException(Value("URIError: URI malformed"));
            }

            // Validate the full code point
            uint32_t code_point = 0;
            if(byte_count == 2) {
                code_point = c & 0x1F;
            } else if(byte_count == 3) {
                code_point = c & 0x0F;
            } else {
                code_point = c & 0x07;
            }

            for(size_t j = 1; j < byte_count; j++) {
                unsigned char cont = static_cast<unsigned char>(str[i + j]);
                if((cont & 0xC0) != 0x80) {
                    throw rift::core::JavaScriptException(Value("URIError: URI malformed"));
                }
                code_point = (code_point << 6) | (cont & 0x3F);
            }

            // Check for lone surrogates (U+D800..U+DFFF) — these are invalid
            if(code_point >= 0xD800 && code_point <= 0xDFFF) {
                throw rift::core::JavaScriptException(Value("URIError: URI malformed"));
            }

            // Percent-encode each byte of the UTF-8 sequence
            static const char hex_chars[] = "0123456789ABCDEF";
            for(size_t j = 0; j < byte_count; j++) {
                unsigned char b = static_cast<unsigned char>(str[i + j]);
                result += '%';
                result += hex_chars[(b >> 4) & 0x0F];
                result += hex_chars[b & 0x0F];
            }
            i += byte_count;
        }
    }

    return result;
}

/// @spec https://tc39.es/ecma262/#sec-decode
/// Decode replaces %-encoded sequences with their UTF-8 decoded characters,
/// except for sequences that decode to characters in `reserved_set` — those
/// are left as literal %XX sequences.
std::string Global::decodeHelper(const std::string& str, const std::string& reserved_set) {
    std::string result;
    result.reserve(str.size());

    size_t i = 0;
    while(i < str.size()) {
        if(str[i] != '%') {
            result += str[i];
            i++;
            continue;
        }

        // We have a '%' — decode the percent-encoded byte(s)
        if(i + 2 >= str.size()) {
            throw rift::core::JavaScriptException(Value("URIError: URI malformed"));
        }

        int hi = hexDigitValue(str[i + 1]);
        int lo = hexDigitValue(str[i + 2]);
        if(hi < 0 || lo < 0) {
            throw rift::core::JavaScriptException(Value("URIError: URI malformed"));
        }

        unsigned char first_byte = static_cast<unsigned char>((hi << 4) | lo);

        if(first_byte <= 0x7F) {
            // Single-byte character (ASCII)
            char ch = static_cast<char>(first_byte);
            if(reserved_set.find(ch) != std::string::npos) {
                // Leave the %XX as-is for reserved characters
                result += str[i];
                result += str[i + 1];
                result += str[i + 2];
            } else {
                result += ch;
            }
            i += 3;
        } else {
            // Multi-byte UTF-8 — determine expected byte count from first byte
            size_t byte_count = 0;
            if((first_byte & 0xE0) == 0xC0) {
                byte_count = 2;
            } else if((first_byte & 0xF0) == 0xE0) {
                byte_count = 3;
            } else if((first_byte & 0xF8) == 0xF0) {
                byte_count = 4;
            } else {
                throw rift::core::JavaScriptException(Value("URIError: URI malformed"));
            }

            // Collect all the bytes
            std::string utf8_bytes;
            utf8_bytes += static_cast<char>(first_byte);
            size_t pos = i + 3;

            for(size_t j = 1; j < byte_count; j++) {
                if(pos >= str.size() || str[pos] != '%') {
                    throw rift::core::JavaScriptException(Value("URIError: URI malformed"));
                }
                if(pos + 2 >= str.size()) {
                    throw rift::core::JavaScriptException(Value("URIError: URI malformed"));
                }
                int h = hexDigitValue(str[pos + 1]);
                int l = hexDigitValue(str[pos + 2]);
                if(h < 0 || l < 0) {
                    throw rift::core::JavaScriptException(Value("URIError: URI malformed"));
                }
                auto cont_byte = static_cast<unsigned char>((h << 4) | l);
                if((cont_byte & 0xC0) != 0x80) {
                    throw rift::core::JavaScriptException(Value("URIError: URI malformed"));
                }
                utf8_bytes += static_cast<char>(cont_byte);
                pos += 3;
            }

            // Decode the UTF-8 code point to validate it
            uint32_t code_point = 0;
            if(byte_count == 2) {
                code_point = first_byte & 0x1F;
            } else if(byte_count == 3) {
                code_point = first_byte & 0x0F;
            } else {
                code_point = first_byte & 0x07;
            }
            for(size_t j = 1; j < byte_count; j++) {
                code_point = (code_point << 6) | (static_cast<unsigned char>(utf8_bytes[j]) & 0x3F);
            }

            // Reject lone surrogates
            if(code_point >= 0xD800 && code_point <= 0xDFFF) {
                throw rift::core::JavaScriptException(Value("URIError: URI malformed"));
            }

            result += utf8_bytes;
            i = pos;
        }
    }

    return result;
}

/// 19.2.6.1 encodeURI ( uri )
/// @spec https://tc39.es/ecma262/#sec-encodeuri-uri
/// @spec-steps
/// 1. Let uriString be ? ToString(uri).
/// 2. Let unescapedURISet be a String containing one instance of each code unit valid in
///    uriReserved and uriUnescaped plus "#".
/// 3. Return ? Encode(uriString, unescapedURISet).
Value Global::encodeURI(const std::vector<Value>& args) {
    std::string uri = args.empty() ? "undefined" : args[0].toString();

    // uriReserved: ; / ? : @ & = + $ ,
    // uriUnescaped: A-Z a-z 0-9 - _ . ! ~ * ' ( )
    // Plus "#"
    static const std::string unescaped =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
        "-_.!~*'()"
        ";/?:@&=+$,#";

    return Value(encodeHelper(uri, unescaped));
}

/// 19.2.6.2 encodeURIComponent ( uriComponent )
/// @spec https://tc39.es/ecma262/#sec-encodeuricomponent-uricomponent
/// @spec-steps
/// 1. Let componentString be ? ToString(uriComponent).
/// 2. Let unescapedURIComponentSet be a String containing one instance of each code unit valid
///    in uriUnescaped.
/// 3. Return ? Encode(componentString, unescapedURIComponentSet).
Value Global::encodeURIComponent(const std::vector<Value>& args) {
    std::string component = args.empty() ? "undefined" : args[0].toString();

    // uriUnescaped: A-Z a-z 0-9 - _ . ! ~ * ' ( )
    static const std::string unescaped =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
        "-_.!~*'()";

    return Value(encodeHelper(component, unescaped));
}

/// 19.2.6.3 decodeURI ( encodedURI )
/// @spec https://tc39.es/ecma262/#sec-decodeuri-encodeduri
/// @spec-steps
/// 1. Let uriString be ? ToString(encodedURI).
/// 2. Let reservedURISet be a String containing one instance of each code unit valid in
///    uriReserved plus "#".
/// 3. Return ? Decode(uriString, reservedURISet).
Value Global::decodeURI(const std::vector<Value>& args) {
    std::string encoded_uri = args.empty() ? "undefined" : args[0].toString();

    // Characters in uriReserved plus "#" are left as %XX
    static const std::string reserved = ";/?:@&=+$,#";

    return Value(decodeHelper(encoded_uri, reserved));
}

/// 19.2.6.4 decodeURIComponent ( encodedURIComponent )
/// @spec https://tc39.es/ecma262/#sec-decodeuricomponent-encodeduricomponent
/// @spec-steps
/// 1. Let componentString be ? ToString(encodedURIComponent).
/// 2. Let reservedURIComponentSet be the empty String.
/// 3. Return ? Decode(componentString, reservedURIComponentSet).
Value Global::decodeURIComponent(const std::vector<Value>& args) {
    std::string encoded_component = args.empty() ? "undefined" : args[0].toString();

    // No reserved set — decode everything
    return Value(decodeHelper(encoded_component, ""));
}

}  // namespace rift::builtins