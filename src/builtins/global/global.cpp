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

    // Annex B legacy functions (B.2.1, B.2.2)
    auto* escape_fn = factory->createJSFunction(escape);
    escape_fn->defineProperty("name", PropertyDescriptor(Value("escape"), false, false, true));
    escape_fn->defineProperty("length", PropertyDescriptor(Value(1.0), false, false, true));
    global_env->define("escape", Value(escape_fn));

    auto* unescape_fn = factory->createJSFunction(unescape);
    unescape_fn->defineProperty("name", PropertyDescriptor(Value("unescape"), false, false, true));
    unescape_fn->defineProperty("length", PropertyDescriptor(Value(1.0), false, false, true));
    global_env->define("unescape", Value(unescape_fn));

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

// ============================================================================
// Annex B Legacy Functions (B.2.1, B.2.2)
// @spec https://tc39.es/ecma262/#sec-additional-built-in-properties
// ============================================================================

/// B.2.1 escape ( string )
/// @spec https://tc39.es/ecma262/#sec-escape-string
/// @spec-steps
/// 1. Set string to ? ToString(string).
/// 2. Let length be the length of string.
/// 3. Let R be the empty String.
/// 4. Let unescapedSet be the string-concatenation of the ASCII word characters and "@*+-./".
/// 5. Let k be 0.
/// 6. Repeat, while k < length,
///   a. Let char be the code unit at index k within string.
///   b. If unescapedSet contains char, then
///     i. Let S be char.
///   c. Else if char < 256, then
///     i. Let S be the string-concatenation of "%" and the String representation of char as
///        a two-digit uppercase hexadecimal number.
///   d. Else,
///     i. Let S be the string-concatenation of "%u" and the String representation of char as
///        a four-digit uppercase hexadecimal number.
///   e. Set R to the string-concatenation of R and S.
///   f. Set k to k + 1.
/// 7. Return R.
Value Global::escape(const std::vector<Value>& args) {
    std::string str = args.empty() ? "undefined" : args[0].toString();

    // Characters that are NOT escaped
    static const std::string unescaped =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@*_+-./";

    static const char hex_chars[] = "0123456789ABCDEF";

    std::string result;
    result.reserve(str.size());

    // escape() works on UTF-16 code units, so we need to convert UTF-8 to code points
    // and then to UTF-16 code units
    size_t i = 0;
    while(i < str.size()) {
        unsigned char c = static_cast<unsigned char>(str[i]);

        // Decode UTF-8 to a code point
        uint32_t code_point = 0;
        size_t byte_count = 1;

        if(c <= 0x7F) {
            code_point = c;
        } else if((c & 0xE0) == 0xC0) {
            byte_count = 2;
            code_point = c & 0x1F;
        } else if((c & 0xF0) == 0xE0) {
            byte_count = 3;
            code_point = c & 0x0F;
        } else if((c & 0xF8) == 0xF0) {
            byte_count = 4;
            code_point = c & 0x07;
        } else {
            // Raw byte (e.g., from \xHH escape above 0x7F stored as Latin-1)
            code_point = c;
        }

        for(size_t j = 1; j < byte_count; j++) {
            if(i + j < str.size()) {
                code_point = (code_point << 6) | (static_cast<unsigned char>(str[i + j]) & 0x3F);
            }
        }
        i += byte_count;

        // Convert code point to UTF-16 code unit(s) and escape each
        if(code_point <= 0xFFFF) {
            // Single UTF-16 code unit (BMP character)
            char16_t cu = static_cast<char16_t>(code_point);
            if(cu <= 0x7F && unescaped.find(static_cast<char>(cu)) != std::string::npos) {
                result += static_cast<char>(cu);
            } else if(cu < 256) {
                result += '%';
                result += hex_chars[(cu >> 4) & 0x0F];
                result += hex_chars[cu & 0x0F];
            } else {
                result += '%';
                result += 'u';
                result += hex_chars[(cu >> 12) & 0x0F];
                result += hex_chars[(cu >> 8) & 0x0F];
                result += hex_chars[(cu >> 4) & 0x0F];
                result += hex_chars[cu & 0x0F];
            }
        } else {
            // Supplementary character — encode as surrogate pair
            uint32_t adjusted = code_point - 0x10000;
            char16_t high = static_cast<char16_t>(0xD800 + (adjusted >> 10));
            char16_t low = static_cast<char16_t>(0xDC00 + (adjusted & 0x3FF));

            // Surrogates are always >= 0xD800, so always %uXXXX
            result += '%';
            result += 'u';
            result += hex_chars[(high >> 12) & 0x0F];
            result += hex_chars[(high >> 8) & 0x0F];
            result += hex_chars[(high >> 4) & 0x0F];
            result += hex_chars[high & 0x0F];

            result += '%';
            result += 'u';
            result += hex_chars[(low >> 12) & 0x0F];
            result += hex_chars[(low >> 8) & 0x0F];
            result += hex_chars[(low >> 4) & 0x0F];
            result += hex_chars[low & 0x0F];
        }
    }

    return Value(result);
}

/// B.2.2 unescape ( string )
/// @spec https://tc39.es/ecma262/#sec-unescape-string
/// @spec-steps
/// 1. Set string to ? ToString(string).
/// 2. Let length be the length of string.
/// 3. Let R be the empty String.
/// 4. Let k be 0.
/// 5. Repeat, while k < length,
///   a. Let c be the code unit at index k within string.
///   b. If c is the code unit 0x0025 (PERCENT SIGN), then
///     i. If k + 5 < length and the code unit at index k + 1 is 0x0075 (LATIN SMALL LETTER U),
///        let the next four chars be hex digits, decode as %uXXXX.
///     ii. Else if k + 2 < length and the next two chars are hex digits, decode as %XX.
///   c. Else, append c.
///   d. Set k to k + 1.
/// 6. Return R.
Value Global::unescape(const std::vector<Value>& args) {
    std::string str = args.empty() ? "undefined" : args[0].toString();

    std::string result;
    result.reserve(str.size());

    size_t k = 0;
    size_t length = str.size();

    while(k < length) {
        char c = str[k];

        if(c == '%') {
            // Try %uXXXX first
            if(k + 5 < length && str[k + 1] == 'u') {
                int d1 = hexDigitValue(str[k + 2]);
                int d2 = hexDigitValue(str[k + 3]);
                int d3 = hexDigitValue(str[k + 4]);
                int d4 = hexDigitValue(str[k + 5]);
                if(d1 >= 0 && d2 >= 0 && d3 >= 0 && d4 >= 0) {
                    uint32_t code_point =
                        static_cast<uint32_t>((d1 << 12) | (d2 << 8) | (d3 << 4) | d4);
                    // Encode the code point to match internal string representation
                    if(code_point <= 0x7F) {
                        result += static_cast<char>(code_point);
                    } else if(code_point <= 0xFF) {
                        // Latin-1 range: store as raw byte (matches lexer \xHH storage)
                        result += static_cast<char>(code_point);
                    } else if(code_point <= 0x7FF) {
                        result += static_cast<char>(0xC0 | (code_point >> 6));
                        result += static_cast<char>(0x80 | (code_point & 0x3F));
                    } else {
                        result += static_cast<char>(0xE0 | (code_point >> 12));
                        result += static_cast<char>(0x80 | ((code_point >> 6) & 0x3F));
                        result += static_cast<char>(0x80 | (code_point & 0x3F));
                    }
                    k += 6;
                    continue;
                }
            }

            // Try %XX
            if(k + 2 < length) {
                int d1 = hexDigitValue(str[k + 1]);
                int d2 = hexDigitValue(str[k + 2]);
                if(d1 >= 0 && d2 >= 0) {
                    unsigned char byte_val = static_cast<unsigned char>((d1 << 4) | d2);
                    // Output the raw byte — matches how the lexer stores \xHH escapes
                    result += static_cast<char>(byte_val);
                    k += 3;
                    continue;
                }
            }
        }

        result += c;
        k++;
    }

    return Value(result);
}

}  // namespace rift::builtins