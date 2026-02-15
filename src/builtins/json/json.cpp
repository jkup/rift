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

// ============================================================================
// ECMA-262 -- The JSON Object
// @spec https://tc39.es/ecma262/#sec-json-object
//
// 25.5 The JSON Object (ES2025, 16th Edition)
//
// The JSON object is a single ordinary object that contains two functions,
// parse and stringify, that are used to parse and construct JSON texts.
// The JSON Data Interchange Format is defined in ECMA-404.
//
// The JSON object is not a function object. It does not have a [[Construct]]
// internal method; it is not possible to use the JSON object as a constructor
// with the new operator. The JSON object does not have a [[Call]] internal
// method; it is not possible to invoke the JSON object as a function.
// ============================================================================

namespace rift::builtins {

using namespace rift::runtime;
using namespace rift::core;

// ----------------------------------------------------------------------------
// 25.5 The JSON Object — Setup
// @spec https://tc39.es/ecma262/#sec-json-object
//
// Registers the JSON global object with its two function properties:
//   - JSON.parse    (25.5.1)
//   - JSON.stringify (25.5.2)
//
// INCOMPLETE: The spec also defines JSON[@@toStringTag] === "JSON" (25.5.3),
// which is not yet registered here.
// ----------------------------------------------------------------------------
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

// ----------------------------------------------------------------------------
// 25.5.1 JSON.parse ( text [ , reviver ] )
// @spec https://tc39.es/ecma262/#sec-json.parse
//
// Spec algorithm:
//   1. Let jsonString be ? ToString(text).
//   2. Parse StringToCodePoints(jsonString) as a JSON text (ECMA-404).
//      Throw a SyntaxError exception if it is not a valid JSON text.
//   3. Let scriptString be the string-concatenation of "(", jsonString, ");".
//   4. Let script be ParseText(scriptString, Script).
//   5. NOTE: The early error rules defined in 13.2.5.1 have special handling
//      for the above invocation of ParseText.
//   6. Assert: script is a Parse Node.
//   7. Let completion be Completion(Evaluation of script).
//   8. NOTE: The PropertyDefinitionEvaluation semantics defined in 13.2.5.5
//      have special handling for the above evaluation.
//   9. Let unfiltered be completion.[[Value]].
//  10. Assert: unfiltered is either a String, Number, Boolean, Null, Object,
//      or Array value.
//  11. If IsCallable(reviver) is true, then
//      a. Let root be OrdinaryObjectCreate(%Object.prototype%).
//      b. Let rootName be the empty String.
//      c. Perform ! CreateDataPropertyOrThrow(root, rootName, unfiltered).
//      d. Return ? InternalizeJSONProperty(root, rootName, reviver).
//  12. Else,
//      a. Return unfiltered.
//
// SIMPLIFIED: This implementation uses a hand-written recursive descent JSON
// parser instead of the spec's approach of embedding in a Script parse.
// The result is equivalent for valid JSON inputs.
//
// INCOMPLETE: The reviver parameter (steps 11a-11d) is not implemented.
// ----------------------------------------------------------------------------
Value JSON::parse(const std::vector<Value>& args, rift::memory::ObjectFactory* factory) {
    if(args.empty()) {
        throw JavaScriptException(Value("SyntaxError: Unexpected end of JSON input"));
    }

    // Step 1: Let jsonString be ? ToString(text).
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

        // Steps 2-10 (SIMPLIFIED): Parse the JSON text using a recursive descent
        // parser. The spec uses script evaluation via ParseText; we parse directly
        // into Values, which is equivalent for conforming JSON inputs.
        size_t pos = 0;
        skipWhitespace(jsonString, pos);
        Value result = parseValue(jsonString, pos, factory);
        skipWhitespace(jsonString, pos);

        // Step 2 (continued): Verify the entire input was consumed; trailing
        // characters after a valid JSON value are a SyntaxError.
        if(pos < jsonString.length()) {
            // Re-enable GC before throwing
            objManager->setGCEnabled(wasGCEnabled);
            throw JavaScriptException(Value("SyntaxError: Unexpected token in JSON"));
        }

        // Re-enable GC after successful parse
        objManager->setGCEnabled(wasGCEnabled);

        // Steps 11-12: INCOMPLETE — reviver is ignored; we always return unfiltered.
        return result;
    } catch(const std::exception& e) {
        // Re-enable GC before throwing
        objManager->setGCEnabled(wasGCEnabled);
        throw JavaScriptException(Value("SyntaxError: " + std::string(e.what())));
    }
}

// ----------------------------------------------------------------------------
// 25.5.2 JSON.stringify ( value [ , replacer [ , space ] ] )
// @spec https://tc39.es/ecma262/#sec-json.stringify
//
// Spec algorithm (abbreviated):
//   1. Let stack be a new empty List.
//   2. Let indent be the empty String.
//   3. Let PropertyList and ReplacerFunction be undefined.
//   4. If replacer is an Object, then
//      a. If IsCallable(replacer) is true, let ReplacerFunction be replacer.
//      b. Else,
//         i.  Let isArray be ? IsArray(replacer).
//         ii. If isArray is true, then build PropertyList from replacer elements.
//   5. If space is an Object, then
//      a. If space has [[NumberData]], let space be ? ToNumber(space).
//      b. If space has [[StringData]], let space be ? ToString(space).
//   6. If space is a Number, then
//      a. Let spaceMV be min(10, floor(space)).
//      b. If spaceMV >= 1, set gap to spaceMV spaces; else set gap to "".
//   7. Else if space is a String, then
//      a. If length of space > 10, set gap to first 10 chars; else set gap to space.
//   8. Else, set gap to the empty String.
//   9. Let wrapper be OrdinaryObjectCreate(%Object.prototype%).
//  10. Perform ! CreateDataPropertyOrThrow(wrapper, "", value).
//  11. Let state be Record { ... }.
//  12. Return ? SerializeJSONProperty(state, "", wrapper).
//
// SIMPLIFIED: The replacer and space parameters are not implemented.
// Only value (the first argument) is processed.
// INCOMPLETE: Steps 4-8 (replacer and space handling) are not implemented.
// ----------------------------------------------------------------------------
Value JSON::stringify(const std::vector<Value>& args) {
    // Step 12: If no value provided, return undefined.
    if(args.empty()) {
        return Value::undefined();
    }

    try {
        // Steps 9-12 (SIMPLIFIED): Directly serialize the value without
        // wrapper object, replacer, or indentation support.
        std::string result = stringifyValue(args[0]);
        return Value(std::move(result));
    } catch(const std::exception& e) {
        // JSON.stringify returns undefined for unstringifiable values
        // (e.g., undefined at top level, functions, symbols)
        return Value::undefined();
    }
}

// ----------------------------------------------------------------------------
// 25.5.1.1 ParseJSON ( text )  (internal helper)
// @spec https://tc39.es/ecma262/#sec-parsejson
//
// This is the top-level JSON value dispatcher. The spec grammar (ECMA-404)
// defines a JSONValue as one of:
//   JSONNullLiteral, JSONBooleanLiteral, JSONObject, JSONArray,
//   JSONString, JSONNumber
//
// This method dispatches to the appropriate sub-parser based on the leading
// character, which corresponds to the JSON grammar productions.
// ----------------------------------------------------------------------------
Value JSON::parseValue(const std::string& json, size_t& pos, rift::memory::ObjectFactory* factory) {
    skipWhitespace(json, pos);

    if(pos >= json.length()) {
        throw std::runtime_error("Unexpected end of input");
    }

    char ch = json[pos];

    switch(ch) {
        case '{':
            // JSONObject production
            return parseObject(json, pos, factory);
        case '[':
            // JSONArray production
            return parseArray(json, pos, factory);
        case '"':
            // JSONString production
            return parseString(json, pos);
        case 't':
            // JSONBooleanLiteral: "true"
            if(pos + 4 <= json.length() && json.substr(pos, 4) == "true") {
                pos += 4;
                return Value(true);
            }
            throw std::runtime_error("Invalid token: expected 'true'");
        case 'f':
            // JSONBooleanLiteral: "false"
            if(pos + 5 <= json.length() && json.substr(pos, 5) == "false") {
                pos += 5;
                return Value(false);
            }
            throw std::runtime_error("Invalid token: expected 'false'");
        case 'n':
            // JSONNullLiteral: "null"
            if(pos + 4 <= json.length() && json.substr(pos, 4) == "null") {
                pos += 4;
                return Value::null();
            }
            throw std::runtime_error("Invalid token: expected 'null'");
        default:
            // JSONNumber production: starts with '-' or a digit
            if(ch == '-' || (ch >= '0' && ch <= '9')) {
                return parseNumber(json, pos);
            }
            std::string error = "Unexpected character: '" + std::string(1, ch) +
                                "' (ASCII: " + std::to_string(static_cast<int>(ch)) + ")";
            throw std::runtime_error(error);
    }
}

// ----------------------------------------------------------------------------
// JSONObject production (part of ParseJSON / 25.5.1.1)
// @spec https://tc39.es/ecma262/#sec-parsejson
//
// JSON grammar (ECMA-404):
//   JSONObject :
//     { }
//     { JSONMemberList }
//   JSONMemberList :
//     JSONMember
//     JSONMemberList , JSONMember
//   JSONMember :
//     JSONString : JSONValue
//
// Parses a JSON object literal into a JSObject with data properties.
// Each member becomes a data property with value, writable, enumerable,
// and configurable all set to true (via setProperty default behavior).
// ----------------------------------------------------------------------------
Value JSON::parseObject(const std::string& json, size_t& pos,
                        rift::memory::ObjectFactory* factory) {
    // Use GC-managed object creation - object is immediately tracked by GC
    auto* object = factory->createJSObject();

    pos++;  // Skip '{'
    skipWhitespace(json, pos);

    // Handle empty object: { }
    if(pos < json.length() && json[pos] == '}') {
        pos++;
        return Value(object);
    }

    // Parse JSONMemberList: one or more JSONMember separated by commas
    while(pos < json.length()) {
        // Parse key (JSONString)
        skipWhitespace(json, pos);
        if(pos >= json.length() || json[pos] != '"') {
            throw std::runtime_error("Expected property name");
        }

        Value keyValue = parseString(json, pos);
        std::string key = keyValue.toString();

        // Expect colon separator between key and value
        skipWhitespace(json, pos);
        if(pos >= json.length() || json[pos] != ':') {
            throw std::runtime_error("Expected ':'");
        }
        pos++;  // Skip ':'

        // Parse value (JSONValue)
        skipWhitespace(json, pos);
        Value value = parseValue(json, pos, factory);

        // Set property on the result object
        object->setProperty(key, value);

        // Check for continuation (comma) or end (closing brace)
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

// ----------------------------------------------------------------------------
// JSONArray production (part of ParseJSON / 25.5.1.1)
// @spec https://tc39.es/ecma262/#sec-parsejson
//
// JSON grammar (ECMA-404):
//   JSONArray :
//     [ ]
//     [ JSONElementList ]
//   JSONElementList :
//     JSONValue
//     JSONElementList , JSONValue
//
// Parses a JSON array literal into a JSObject with numeric index properties
// and a "length" property.
//
// DEVIATION: The spec creates an actual Array exotic object via ArrayCreate.
// This implementation creates a plain JSObject with numeric string keys and
// a "length" property, which lacks Array.prototype methods.
// ----------------------------------------------------------------------------
Value JSON::parseArray(const std::string& json, size_t& pos, rift::memory::ObjectFactory* factory) {
    // Use GC-managed object creation - object is immediately tracked by GC
    auto* array = factory->createJSObject();

    pos++;  // Skip '['
    skipWhitespace(json, pos);

    // Handle empty array: [ ]
    if(pos < json.length() && json[pos] == ']') {
        pos++;
        // Set length property
        array->setProperty("length", Value(0.0));
        return Value(array);
    }

    double index = 0;

    // Parse JSONElementList: one or more JSONValue separated by commas
    while(pos < json.length()) {
        // Parse value (JSONValue)
        skipWhitespace(json, pos);
        Value value = parseValue(json, pos, factory);

        // Set array element at the current index (ToString of index as key)
        array->setProperty(std::to_string(static_cast<int>(index)), value);
        index++;

        // Check for continuation (comma) or end (closing bracket)
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

// ----------------------------------------------------------------------------
// JSONString production (part of ParseJSON / 25.5.1.1)
// @spec https://tc39.es/ecma262/#sec-parsejson
//
// JSON grammar (ECMA-404):
//   JSONString :
//     " JSONStringCharacters_opt "
//   JSONStringCharacter :
//     SourceCharacter but not one of " or \ or U+0000 through U+001F
//     \ JSONEscapeSequence
//   JSONEscapeSequence :
//     JSONSingleEscapeCharacter
//     u HexDigit HexDigit HexDigit HexDigit
//   JSONSingleEscapeCharacter : one of
//     " / \ b f n r t
//
// INCOMPLETE: Unicode escape sequences (\uXXXX) are preserved literally
// instead of being decoded to the corresponding code point. The spec requires
// decoding \uXXXX to UTF-16 code units (and handling surrogate pairs for
// supplementary characters).
// ----------------------------------------------------------------------------
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
            return Value(std::move(result));
        } else if(ch == '\\') {
            // JSONEscapeSequence
            pos++;
            if(pos >= json.length()) {
                throw std::runtime_error("JSON: Unterminated escape sequence in string");
            }

            char escaped = json[pos];
            switch(escaped) {
                // JSONSingleEscapeCharacter mappings
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
                    // Unicode escape: \u HexDigit HexDigit HexDigit HexDigit
                    // Validate we have 4 hex digits available after current position
                    if(pos + 4 > json.length()) {
                        throw std::runtime_error("JSON: Incomplete unicode escape sequence");
                    }

                    // INCOMPLETE: Preserves the escape sequence literally instead of
                    // decoding to the actual Unicode code point. Full spec compliance
                    // requires UTF-16 decoding and surrogate pair handling.
                    result += "\\u";
                    for(size_t i = 1; i <= 4; i++) {
                        char hexChar = json[pos + i];
                        if(!std::isxdigit(hexChar)) {
                            throw std::runtime_error(
                                "JSON: Invalid unicode escape sequence (non-hex digit)");
                        }
                        result += hexChar;
                    }
                    pos += 4;  // Skip the 4 hex digits (pos++ happens below)
                    break;
                }
                default:
                    // Only the above escape characters are valid in JSON
                    throw std::runtime_error("JSON: Invalid escape sequence '\\" +
                                             std::string(1, escaped) + "'");
            }
            pos++;
        } else if(ch < 0x20) {
            // Control characters (U+0000 through U+001F) must be escaped in JSON
            throw std::runtime_error("JSON: Unescaped control character in string (char code " +
                                     std::to_string(static_cast<int>(ch)) + ")");
        } else {
            // SourceCharacter (not " or \ or control)
            result += ch;
            pos++;
        }
    }

    throw std::runtime_error("JSON: Unterminated string");
}

// ----------------------------------------------------------------------------
// JSONNumber production (part of ParseJSON / 25.5.1.1)
// @spec https://tc39.es/ecma262/#sec-parsejson
//
// JSON grammar (ECMA-404):
//   JSONNumber :
//     -_opt DecimalIntegerLiteral JSONFraction_opt ExponentPart_opt
//   DecimalIntegerLiteral :
//     0
//     NonZeroDigit DecimalDigits_opt
//   JSONFraction :
//     . DecimalDigits
//   ExponentPart :
//     ExponentIndicator SignedInteger
//   ExponentIndicator : one of
//     e E
//   SignedInteger :
//     DecimalDigits
//     + DecimalDigits
//     - DecimalDigits
//
// Note: JSON numbers do not include Infinity, NaN, hex, octal, or binary
// literals. Leading zeros (except for "0" itself) are not allowed.
// The result is converted to an IEEE 754 double via std::stod.
// ----------------------------------------------------------------------------
Value JSON::parseNumber(const std::string& json, size_t& pos) {
    size_t start = pos;

    // Optional negative sign: -_opt
    if(pos < json.length() && json[pos] == '-') {
        pos++;
    }

    // DecimalIntegerLiteral: 0 | NonZeroDigit DecimalDigits_opt
    if(pos >= json.length() || !std::isdigit(json[pos])) {
        throw std::runtime_error("Invalid number");
    }

    if(json[pos] == '0') {
        // Just "0" — no leading zeros allowed in JSON numbers
        pos++;
    } else {
        // NonZeroDigit followed by optional DecimalDigits
        while(pos < json.length() && std::isdigit(json[pos])) {
            pos++;
        }
    }

    // JSONFraction: . DecimalDigits
    if(pos < json.length() && json[pos] == '.') {
        pos++;
        if(pos >= json.length() || !std::isdigit(json[pos])) {
            throw std::runtime_error("Invalid number");
        }
        while(pos < json.length() && std::isdigit(json[pos])) {
            pos++;
        }
    }

    // ExponentPart: ExponentIndicator SignedInteger
    if(pos < json.length() && (json[pos] == 'e' || json[pos] == 'E')) {
        pos++;
        // Optional sign
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

    // Convert the matched text to a Number value (IEEE 754 double)
    std::string numberStr = json.substr(start, pos - start);
    double value = std::stod(numberStr);
    return Value(value);
}

// ----------------------------------------------------------------------------
// JSON whitespace skipping
// @spec https://tc39.es/ecma262/#sec-parsejson
//
// JSON grammar (ECMA-404) defines insignificant whitespace as:
//   JSONWhitespace :
//     <TAB>   U+0009
//     <LF>    U+000A
//     <CR>    U+000D
//     <SP>    U+0020
//
// Note: Unlike ECMAScript source text, JSON does not allow other Unicode
// whitespace characters (e.g., U+00A0 NBSP, U+FEFF BOM) as insignificant
// whitespace.
// ----------------------------------------------------------------------------
void JSON::skipWhitespace(const std::string& json, size_t& pos) {
    while(pos < json.length() &&
          (json[pos] == ' ' || json[pos] == '\t' || json[pos] == '\n' || json[pos] == '\r')) {
        pos++;
    }
}

// ----------------------------------------------------------------------------
// 25.5.2.1 SerializeJSONProperty ( state, key, holder )
// @spec https://tc39.es/ecma262/#sec-serializejsonproperty
//
// Spec algorithm (abbreviated):
//   1. Let value be ? Get(holder, key).
//   2. If value is an Object or BigInt, then
//      a. Let toJSON be ? GetV(value, "toJSON").
//      b. If IsCallable(toJSON) is true, then
//         i. Set value to ? Call(toJSON, value, << key >>).
//   3. If state.[[ReplacerFunction]] is not undefined, then
//      a. Set value to ? Call(state.[[ReplacerFunction]], holder,
//         << key, value >>).
//   4. If value is an Object, then
//      a. If value has [[NumberData]], set value to ? ToNumber(value).
//      b. If value has [[StringData]], set value to ? ToString(value).
//      c. If value has [[BooleanData]], set value to value.[[BooleanData]].
//      d. If value has [[BigIntData]], set value to value.[[BigIntData]].
//   5. If value is null, return "null".
//   6. If value is true, return "true".
//   7. If value is false, return "false".
//   8. If value is a String, return QuoteJSONString(value).
//   9. If value is a Number, then
//      a. If value is finite, return ! ToString(value).
//      b. Return "null".
//  10. If value is a BigInt, throw a TypeError exception.
//  11. If value is an Object and IsCallable(value) is false, then
//      a. Let isArray be ? IsArray(value).
//      b. If isArray is true, return ? SerializeJSONArray(state, value).
//      c. Return ? SerializeJSONObject(state, value).
//  12. Return undefined.
//
// SIMPLIFIED: Steps 2-4 (toJSON, ReplacerFunction, wrapper unwrapping)
// are not implemented. The function dispatches directly on the Value type.
//
// INCOMPLETE: toJSON() method calls, replacer function, BigInt handling,
// Number/String/Boolean wrapper object unwrapping are not implemented.
// ----------------------------------------------------------------------------
std::string JSON::stringifyValue(const Value& value) {
    // Step 12 / top-level: undefined at top level causes stringify to throw
    // (the caller catches and returns undefined)
    if(value.isUndefined()) {
        throw std::runtime_error("Cannot stringify undefined");
    }

    // Step 5: If value is null, return "null".
    if(value.isNull()) {
        return "null";
    }

    // Steps 6-7: If value is true, return "true"; if false, return "false".
    if(value.isBoolean()) {
        return value.toBool() ? "true" : "false";
    }

    // Step 9: If value is a Number, then
    if(value.isNumber()) {
        double num = value.toNumber();
        // Step 9a: If value is finite, return ! ToString(value).
        // Step 9b: (NaN or Infinity) Return "null".
        if(std::isnan(num) || std::isinf(num)) {
            return "null";
        }
        // Check if it's an integer for cleaner output
        if(num == std::floor(num)) {
            return std::to_string(static_cast<long long>(num));
        } else {
            return std::to_string(num);
        }
    }

    // Step 8: If value is a String, return QuoteJSONString(value).
    if(value.isString()) {
        return "\"" + escapeString(value.toString()) + "\"";
    }

    // Step 11: If value is an Object and IsCallable(value) is false, then
    if(value.isObject()) {
        JSObject* obj = value.getObject();

        // Step 11a-b: Let isArray be ? IsArray(value).
        // If isArray is true, return ? SerializeJSONArray(state, value).
        // SIMPLIFIED: Uses "length" property heuristic instead of IsArray.
        if(obj->hasProperty("length")) {
            // SerializeJSONArray (25.5.2.5)
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
                        // Holes in the array serialize as "null"
                        ss << "null";
                    }
                }
            }

            ss << "]";
            return ss.str();
        } else {
            // Step 11c: Return ? SerializeJSONObject(state, value).
            // SerializeJSONObject (25.5.2.4)
            std::stringstream ss;
            ss << "{";

            bool first = true;
            std::vector<std::string> propNames = obj->getOwnPropertyNames();
            for(const std::string& key : propNames) {
                Value val = obj->getProperty(key);

                // Skip undefined values and function properties
                // (per step 12 of SerializeJSONProperty: these return undefined,
                // and SerializeJSONObject omits properties whose serialization
                // is undefined)
                if(val.isUndefined() || val.isFunction()) {
                    continue;
                }

                if(!first)
                    ss << ",";
                first = false;

                // Each member is: QuoteJSONString(key) + ":" + serialized value
                ss << "\"" << escapeString(key) << "\":" << stringifyValue(val);
            }

            ss << "}";
            return ss.str();
        }
    }

    throw std::runtime_error("Cannot stringify value");
}

// ----------------------------------------------------------------------------
// 25.5.2.2 QuoteJSONString ( value )
// @spec https://tc39.es/ecma262/#sec-quotejsonstring
//
// Spec algorithm:
//   1. Let product be the String value consisting solely of the code unit
//      0x0022 (QUOTATION MARK).
//   2. For each code point C of StringToCodePoints(value), do
//      a. If C is listed in the "Code Point" column of Table 73, then
//         i. Set product to the string-concatenation of product and the
//            escape sequence for C as specified in the "Escape Sequence"
//            column of the corresponding row.
//      b. Else if C has a numeric value less than 0x0020 (SPACE), then
//         i. Set product to the string-concatenation of product and
//            UnicodeEscape(C).
//      c. Else,
//         i. Set product to the string-concatenation of product and
//            UTF16EncodeCodePoint(C).
//   3. Set product to the string-concatenation of product and the code unit
//      0x0022 (QUOTATION MARK).
//   4. Return product.
//
// Table 73 — JSON Single Character Escape Sequences:
//   U+0008 (BS)  -> \b
//   U+0009 (TAB) -> \t
//   U+000A (LF)  -> \n
//   U+000C (FF)  -> \f
//   U+000D (CR)  -> \r
//   U+0022 (")   -> \"
//   U+005C (\)   -> \\
//
// Note: The wrapping quotes are added by the caller (stringifyValue), not here.
//
// DEVIATION: The spec includes U+005C (\) -> \\ and U+0022 (") -> \" in
// Table 73. The '/' solidus is NOT escaped by the spec, but this
// implementation also does not escape it, which is correct.
// ----------------------------------------------------------------------------
std::string JSON::escapeString(const std::string& str) {
    std::string result;
    for(char ch : str) {
        switch(ch) {
            // Table 73 — JSON Single Character Escape Sequences
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
                    // Step 2b: Control characters with numeric value < 0x0020
                    // are escaped via UnicodeEscape (25.5.2.3)
                    std::stringstream ss;
                    ss << "\\u" << std::hex << std::setw(4) << std::setfill('0')
                       << static_cast<int>(ch);
                    result += ss.str();
                } else {
                    // Step 2c: All other characters are included literally
                    result += ch;
                }
                break;
        }
    }
    return result;
}

}  // namespace rift::builtins