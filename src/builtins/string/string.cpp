#include "rift/builtins/string/string.h"

#include <absl/strings/string_view.h>

#include <algorithm>
#include <cctype>
#include <cmath>
#include <limits>
#include <sstream>

#include "rift/builtins/array/array.h"
#include "rift/builtins/regexp/regexp.h"
#include "rift/builtins/string/string_iterator.h"
#include "rift/builtins/symbol/symbol.h"
#include "rift/interpreter/call_context.h"
#include "rift/interpreter/evaluation_utils.h"
#include "rift/interpreter/javascript_exception.h"
#include "rift/interpreter/this_helpers.h"
#include "rift/memory/gc_protector.h"

// ============================================================================
// ECMA-262 -- String Objects (22.1)
// @spec https://tc39.es/ecma262/#sec-string-objects
//
// This file implements the String constructor, static methods (fromCharCode),
// and prototype methods (charAt, charCodeAt, concat, indexOf, lastIndexOf,
// slice, split, substring, toLowerCase, toUpperCase, trim, trimStart, trimEnd,
// toString, valueOf, match, search, replace, replaceAll, matchAll, startsWith,
// endsWith, includes, repeat, padStart, padEnd, at, normalize, @@iterator).
// ============================================================================

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
    RIFT_METHOD(prototype, "match", String::match);
    RIFT_METHOD(prototype, "search", String::search);
    RIFT_METHOD(prototype, "replace", String::replace);
    RIFT_METHOD(prototype, "startsWith", String::startsWith);
    RIFT_METHOD(prototype, "endsWith", String::endsWith);
    RIFT_METHOD(prototype, "includes", String::includes);
    RIFT_METHOD(prototype, "repeat", String::repeat);
    RIFT_METHOD(prototype, "padStart", String::padStart);
    RIFT_METHOD(prototype, "padEnd", String::padEnd);
    RIFT_METHOD(prototype, "trimStart", String::trimStart);
    RIFT_METHOD(prototype, "trimEnd", String::trimEnd);
    RIFT_METHOD(prototype, "at", String::at);
    RIFT_METHOD(prototype, "replaceAll", String::replaceAll);
    RIFT_METHOD(prototype, "matchAll", String::matchAll);
    RIFT_METHOD(prototype, "normalize", String::normalize);

    // Annex B aliases
    RIFT_METHOD(prototype, "trimLeft", String::trimStart);
    RIFT_METHOD(prototype, "trimRight", String::trimEnd);

    // 22.1.3.36 String.prototype [ @@iterator ] ( )
    // @spec https://tc39.es/ecma262/#sec-string.prototype-%symbol.iterator%
    std::string iterator_key = core::EvaluationUtils::symbolToPropertyKey(Symbol::getIteratorId());
    auto* iterator_func = factory->createJSFunction(String::symbolIterator);
    prototype->setProperty(iterator_key, Value(iterator_func));
}

// 22.1.1.1 String ( value )
// @spec https://tc39.es/ecma262/#sec-string-constructor-string-value
Value String::constructor(const CallContext& ctx, const std::vector<Value>& args) {
    // 1. If value is not present, then
    //   a. Let s be the empty String.
    if(args.empty()) {
        return Value("");
    }

    // 2. Else,
    //   a. If NewTarget is undefined and value is a Symbol, return SymbolDescriptiveString(value).
    //   b. Let s be ? ToString(value).
    // INCOMPLETE: Step 2a (Symbol special case) not implemented.

    // 3. If NewTarget is undefined, return s.
    // SIMPLIFIED: Rift always returns a primitive string; String object wrapping
    // (step 4: StringCreate) is not yet implemented.
    return Value(args[0].toString());
}

// 22.1.2.1 String.fromCharCode ( ...codeUnits )
// @spec https://tc39.es/ecma262/#sec-string.fromcharcode
Value String::fromCharCode(const CallContext& ctx, const std::vector<Value>& args) {
    // 1. Let result be the empty String.
    std::string result;
    result.reserve(args.size());

    // 2. For each element next of codeUnits, do
    for(const auto& arg : args) {
        //   a. Let nextCU be the code unit whose numeric value is R(? ToUint16(next)).
        double num = arg.toNumber();
        if(!std::isnan(num) && std::isfinite(num)) {
            int charCode = static_cast<int>(num) & 0xFFFF;  // Take lower 16 bits
            // SIMPLIFIED: Only ASCII range (0-127) is supported; non-ASCII code units
            // are replaced with '?'. Full UTF-16 support is not yet implemented.
            if(charCode >= 0 && charCode <= 127) {  // Basic ASCII range
                result += static_cast<char>(charCode);
            } else {
                result += '?';  // Placeholder for non-ASCII characters
            }
        }
        //   b. Set result to the string-concatenation of result and nextCU.
    }

    // 3. Return result.
    return Value(std::move(result));
}

// 22.1.3.2 String.prototype.charAt ( pos )
// @spec https://tc39.es/ecma262/#sec-string.prototype.charat
Value String::charAt(const CallContext& ctx, const std::vector<Value>& args) {
    // 1. Let O be the this value.
    // 2. Perform ? RequireObjectCoercible(O).
    // 3. Let S be ? ToString(O).
    // SIMPLIFIED: Rift uses extractThisString which combines steps 1-3.
    std::string str = extractThisString(ctx);

    // 4. Let position be ? ToIntegerOrInfinity(pos).
    double index = 0;
    if(!args.empty()) {
        index = args[0].toNumber();
    }

    // 5. Let size be the length of S.
    // 6. If position < 0 or position >= size, return the empty String.
    if(std::isnan(index) || index < 0 || index >= static_cast<double>(str.length())) {
        return Value("");
    }

    // 7. Return the substring of S from position to position + 1.
    size_t idx = static_cast<size_t>(index);
    return Value(std::string(1, str[idx]));
}

// 22.1.3.3 String.prototype.charCodeAt ( pos )
// @spec https://tc39.es/ecma262/#sec-string.prototype.charcodeat
Value String::charCodeAt(const CallContext& ctx, const std::vector<Value>& args) {
    // 1. Let O be the this value.
    // 2. Perform ? RequireObjectCoercible(O).
    // 3. Let S be ? ToString(O).
    std::string str = extractThisString(ctx);

    // 4. Let position be ? ToIntegerOrInfinity(pos).
    double index = 0;
    if(!args.empty()) {
        index = args[0].toNumber();
    }

    // 5. Let size be the length of S.
    // 6. If position < 0 or position >= size, return NaN.
    if(std::isnan(index) || index < 0 || index >= static_cast<double>(str.length())) {
        return Value(std::numeric_limits<double>::quiet_NaN());
    }

    // 7. Return the Number value for the numeric value of the code unit at index
    //    position within the String S.
    size_t idx = static_cast<size_t>(index);
    return Value(static_cast<double>(static_cast<unsigned char>(str[idx])));
}

// 22.1.3.5 String.prototype.concat ( ...args )
// @spec https://tc39.es/ecma262/#sec-string.prototype.concat
Value String::concat(const CallContext& ctx, const std::vector<Value>& args) {
    // 1. Let O be the this value.
    // 2. Perform ? RequireObjectCoercible(O).
    // 3. Let S be ? ToString(O).
    // 4. Let R be S.
    std::string str = extractThisString(ctx);

    // 5. For each element next of args, do
    //   a. Let nextString be ? ToString(next).
    //   b. Set R to the string-concatenation of R and nextString.
    for(size_t i = 0; i < args.size(); ++i) {
        str += args[i].toString();
    }

    // 6. Return R.
    return Value(std::move(str));
}

// 22.1.3.9 String.prototype.indexOf ( searchString [ , position ] )
// @spec https://tc39.es/ecma262/#sec-string.prototype.indexof
Value String::indexOf(const CallContext& ctx, const std::vector<Value>& args) {
    // 1. Let O be the this value.
    // 2. Perform ? RequireObjectCoercible(O).
    // 3. Let S be ? ToString(O).
    std::string str = extractThisString(ctx);

    if(args.empty()) {
        return Value(-1.0);
    }

    // 4. Let searchStr be ? ToString(searchString).
    std::string searchString = args[0].toString();

    // 5. Let pos be ? ToIntegerOrInfinity(position).
    // 6. Assert: If position is undefined, then pos is 0.
    // 7. Let len be the length of S.
    // 8. Let start be the result of clamping pos between 0 and len.
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

    // 9. Let result be StringIndexOf(S, searchStr, start).
    size_t pos = str.find(searchString, fromIndex);

    // 10. If result is not-found, return -1.
    if(pos == std::string::npos) {
        return Value(-1.0);
    }

    // 11. Return F(result).
    return Value(static_cast<double>(pos));
}

// 22.1.3.11 String.prototype.lastIndexOf ( searchString [ , position ] )
// @spec https://tc39.es/ecma262/#sec-string.prototype.lastindexof
Value String::lastIndexOf(const CallContext& ctx, const std::vector<Value>& args) {
    // 1. Let O be the this value.
    // 2. Perform ? RequireObjectCoercible(O).
    // 3. Let S be ? ToString(O).
    std::string str = extractThisString(ctx);

    if(args.empty()) {
        return Value(-1.0);
    }

    // 4. Let searchStr be ? ToString(searchString).
    std::string searchString = args[0].toString();

    // 5. Let numPos be ? ToNumber(position).
    // 6. Assert: If position is undefined, then numPos is NaN.
    // 7. If numPos is NaN, let pos be +inf; otherwise let pos be ! ToIntegerOrInfinity(numPos).
    // 8. Let len be the length of S.
    // 9. Let searchLen be the length of searchStr.
    // 10. If len < searchLen, return -1.
    // 11. Let start be the result of clamping pos between 0 and len - searchLen.
    size_t fromIndex = str.length();
    if(args.size() >= 2) {
        double fromIndexNum = args[1].toNumber();
        if(std::isnan(fromIndexNum)) {
            fromIndex = str.length();
        } else if(fromIndexNum < 0) {
            fromIndex = 0;
        } else if(fromIndexNum >= static_cast<double>(str.length())) {
            fromIndex = str.length();
        } else {
            fromIndex = static_cast<size_t>(fromIndexNum);
        }
    }

    // 12. Let result be StringLastIndexOf(S, searchStr, start).
    // SIMPLIFIED: Rift performs a manual backward search instead of calling
    // the abstract StringLastIndexOf operation.
    for(size_t i = fromIndex; i != SIZE_MAX; --i) {
        if(i + searchString.length() <= str.length() &&
           str.substr(i, searchString.length()) == searchString) {
            // 14. Return F(result).
            return Value(static_cast<double>(i));
        }
    }

    // 13. If result is not-found, return -1.
    return Value(-1.0);
}

// 22.1.3.22 String.prototype.slice ( start, end )
// @spec https://tc39.es/ecma262/#sec-string.prototype.slice
Value String::slice(const CallContext& ctx, const std::vector<Value>& args) {
    // 1. Let O be the this value.
    // 2. Perform ? RequireObjectCoercible(O).
    // 3. Let S be ? ToString(O).
    std::string str = extractThisString(ctx);

    // 4. Let len be the length of S.
    size_t length = str.length();

    // 5. Let intStart be ? ToIntegerOrInfinity(start).
    double startNum = 0;
    double endNum = static_cast<double>(length);

    if(!args.empty()) {
        startNum = args[0].toNumber();
    }

    // 9. If end is undefined, let intEnd be len; else let intEnd be ? ToIntegerOrInfinity(end).
    if(args.size() >= 2 && !args[1].isUndefined()) {
        endNum = args[1].toNumber();
    }

    // 6. If intStart = -inf, let from be 0.
    // 7. Else if intStart < 0, let from be max(len + intStart, 0).
    // 8. Else, let from be min(intStart, len).
    if(startNum < 0) {
        startNum = std::max(0.0, static_cast<double>(length) + startNum);
    }
    // 10. If intEnd = -inf, let to be 0.
    // 11. Else if intEnd < 0, let to be max(len + intEnd, 0).
    // 12. Else, let to be min(intEnd, len).
    if(endNum < 0) {
        endNum = std::max(0.0, static_cast<double>(length) + endNum);
    }

    size_t start =
        static_cast<size_t>(std::max(0.0, std::min(startNum, static_cast<double>(length))));
    size_t end = static_cast<size_t>(std::max(0.0, std::min(endNum, static_cast<double>(length))));

    // 13. If from >= to, return the empty String.
    if(start >= end) {
        return Value("");
    }

    // 14. Return the substring of S from from to to.
    return Value(str.substr(start, end - start));
}

// 22.1.3.25 String.prototype.substring ( start, end )
// @spec https://tc39.es/ecma262/#sec-string.prototype.substring
Value String::substring(const CallContext& ctx, const std::vector<Value>& args) {
    // 1. Let O be the this value.
    // 2. Perform ? RequireObjectCoercible(O).
    // 3. Let S be ? ToString(O).
    std::string str = extractThisString(ctx);

    // 4. Let len be the length of S.
    size_t length = str.length();

    // 5. Let intStart be ? ToIntegerOrInfinity(start).
    double startNum = 0;
    double endNum = static_cast<double>(length);

    if(!args.empty()) {
        startNum = args[0].toNumber();
    }

    // 6. If end is undefined, let intEnd be len; else let intEnd be ? ToIntegerOrInfinity(end).
    if(args.size() >= 2 && !args[1].isUndefined()) {
        endNum = args[1].toNumber();
    }

    // 7. Let finalStart be the result of clamping intStart between 0 and len.
    startNum = std::max(0.0, startNum);
    endNum = std::max(0.0, endNum);

    // 8. Let finalEnd be the result of clamping intEnd between 0 and len.
    // 9. Let from be min(finalStart, finalEnd).
    // 10. Let to be max(finalStart, finalEnd).
    if(startNum > endNum) {
        std::swap(startNum, endNum);
    }

    size_t start = static_cast<size_t>(std::min(startNum, static_cast<double>(length)));
    size_t end = static_cast<size_t>(std::min(endNum, static_cast<double>(length)));

    // 11. Return the substring of S from from to to.
    return Value(str.substr(start, end - start));
}

// 22.1.3.28 String.prototype.toLowerCase ( )
// @spec https://tc39.es/ecma262/#sec-string.prototype.tolowercase
Value String::toLowerCase(const CallContext& ctx, const std::vector<Value>& args) {
    // 1. Let O be the this value.
    // 2. Perform ? RequireObjectCoercible(O).
    // 3. Let S be ? ToString(O).
    std::string str = extractThisString(ctx);

    // 4. Let sText be StringToCodePoints(S).
    // 5. Let lowerText be toLowercase(sText), according to the Unicode Default
    //    Case Conversion algorithm.
    // 6. Let L be CodePointsToString(lowerText).
    // SIMPLIFIED: Rift uses C locale std::tolower on individual bytes instead of
    // full Unicode case mapping via StringToCodePoints/CodePointsToString.
    std::transform(str.begin(), str.end(), str.begin(),
                   [](unsigned char c) { return std::tolower(c); });

    // 7. Return L.
    return Value(std::move(str));
}

// 22.1.3.30 String.prototype.toUpperCase ( )
// @spec https://tc39.es/ecma262/#sec-string.prototype.touppercase
Value String::toUpperCase(const CallContext& ctx, const std::vector<Value>& args) {
    // Behaves in exactly the same way as String.prototype.toLowerCase, except
    // that the String is mapped using the toUppercase algorithm of the Unicode
    // Default Case Conversion.
    // SIMPLIFIED: Rift uses C locale std::toupper on individual bytes instead of
    // full Unicode case mapping.
    std::string str = extractThisString(ctx);

    std::transform(str.begin(), str.end(), str.begin(),
                   [](unsigned char c) { return std::toupper(c); });

    return Value(std::move(str));
}

// 22.1.3.32 String.prototype.trim ( )
// @spec https://tc39.es/ecma262/#sec-string.prototype.trim
Value String::trim(const CallContext& ctx, const std::vector<Value>& args) {
    // 1. Let S be the this value.
    // 2. Return ? TrimString(S, start+end).
    //
    // TrimString ( string, where ) -- 22.1.3.32.1
    // @spec https://tc39.es/ecma262/#sec-trimstring
    // 1. Perform ? RequireObjectCoercible(string).
    // 2. Let S be ? ToString(string).
    std::string str = extractThisString(ctx);

    // 3-5. (where is start+end)
    //   Let T be the String value that is a copy of S with both leading and
    //   trailing white space removed.
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

    // 6. Return T.
    return Value(str.substr(start, end - start));
}

// 22.1.3.23 String.prototype.split ( separator, limit )
// @spec https://tc39.es/ecma262/#sec-string.prototype.split
Value String::split(const CallContext& ctx, const std::vector<Value>& args) {
    // 1. Let O be the this value.
    // 2. Perform ? RequireObjectCoercible(O).
    // INCOMPLETE: Step 3 (Symbol.split dispatch for RegExp objects) not implemented.
    // 4. Let S be ? ToString(O).
    std::string str = extractThisString(ctx);

    // Create an array to hold the results using GC-managed creation
    std::vector<Value> elements;

    // 5. If limit is undefined, let lim be 2^32 - 1; else let lim be R(? ToUint32(limit)).
    // INCOMPLETE: The limit parameter is not yet handled.

    // 8. If separator is undefined, then
    //   a. Return CreateArrayFromList(<<S>>).
    if(args.empty() || args[0].isUndefined()) {
        elements.push_back(Value(std::move(str)));
    } else {
        // 6. Let R be ? ToString(separator).
        std::string separator = args[0].toString();

        // 10. If separatorLength = 0, then
        //   a-d. Split into individual code units.
        if(separator.empty()) {
            for(size_t i = 0; i < str.length(); ++i) {
                elements.push_back(Value(std::string(1, str[i])));
            }
        } else {
            // 11. If S is the empty String, return CreateArrayFromList(<<S>>).
            // 12-16. Split by separator using StringIndexOf.
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

// 22.1.3.29 String.prototype.toString ( )
// @spec https://tc39.es/ecma262/#sec-string.prototype.tostring
Value String::toString(const CallContext& ctx, const std::vector<Value>& args) {
    // 1. Return ? ThisStringValue(this value).
    std::string str = extractThisString(ctx);
    return Value(std::move(str));
}

// 22.1.3.35 String.prototype.valueOf ( )
// @spec https://tc39.es/ecma262/#sec-string.prototype.valueof
Value String::valueOf(const CallContext& ctx, const std::vector<Value>& args) {
    // 1. Return ? ThisStringValue(this value).
    std::string str = extractThisString(ctx);
    return Value(std::move(str));
}

// NON-STANDARD: Internal helper for index validation, not part of ECMA-262.
// Used to clamp/validate string indices for various methods.
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

// 22.1.3.21 String.prototype.search ( regexp )
// @spec https://tc39.es/ecma262/#sec-string.prototype.search
Value String::search(const CallContext& ctx, const std::vector<Value>& args) {
    // 1. Let O be the this value.
    // 2. Perform ? RequireObjectCoercible(O).
    std::string str = extractThisString(ctx);

    if(args.empty() || args[0].isUndefined()) {
        // search(undefined) matches the empty string at position 0
        return Value(0.0);
    }

    // 3. If regexp is an Object, then
    //   a. Let searcher be ? GetMethod(regexp, %Symbol.search%).
    //   b. If searcher is not undefined, then
    //     i. Return ? Call(searcher, regexp, <<O>>).
    // DEVIATION: Rift does not dispatch through Symbol.search. Instead, it
    // directly checks if the argument is a RegExp and performs the search inline.

    // Check if argument is a RegExp
    RegExpData* data = nullptr;
    std::unique_ptr<RE2> temp_regex;

    if(args[0].isObject()) {
        data = RegExpRegistry::get(args[0].getObject());
    }

    // 4. Let string be ? ToString(O).
    // 5. Let rx be ? RegExpCreate(regexp, undefined).
    // 6. Return ? Invoke(rx, %Symbol.search%, <<string>>).
    // SIMPLIFIED: Instead of creating a new RegExp and invoking Symbol.search,
    // Rift creates a temporary RE2 regex and matches directly.
    RE2* regex_ptr = nullptr;
    if(data) {
        regex_ptr = data->regex.get();
    } else {
        // Convert to string and create a temporary regex
        std::string pattern = args[0].toString();
        RE2::Options opts;
        opts.set_log_errors(false);
        temp_regex = std::make_unique<RE2>(pattern, opts);
        regex_ptr = temp_regex.get();
    }

    if(!regex_ptr || !regex_ptr->ok()) {
        return Value(-1.0);
    }

    absl::string_view text(str);
    absl::string_view submatch;
    if(regex_ptr->Match(text, 0, static_cast<int>(str.size()), RE2::UNANCHORED, &submatch, 1)) {
        size_t index = submatch.data() - str.data();
        return Value(static_cast<double>(index));
    }

    return Value(-1.0);
}

// 22.1.3.13 String.prototype.match ( regexp )
// @spec https://tc39.es/ecma262/#sec-string.prototype.match
Value String::match(const CallContext& ctx, const std::vector<Value>& args) {
    // 1. Let O be the this value.
    // 2. Perform ? RequireObjectCoercible(O).
    std::string str = extractThisString(ctx);

    if(args.empty() || args[0].isUndefined()) {
        // match(undefined) returns [""]
        std::vector<Value> elements;
        elements.emplace_back(std::string(""));
        auto* result = Array::createArrayObject(getObjectFactory(), std::move(elements));
        result->setProperty("index", Value(0.0));
        result->setProperty("input", Value(str));
        return Value(result);
    }

    // 3. If regexp is an Object, then
    //   a. Let matcher be ? GetMethod(regexp, %Symbol.match%).
    //   b. If matcher is not undefined, then
    //     i. Return ? Call(matcher, regexp, <<O>>).
    // DEVIATION: Rift does not dispatch through Symbol.match. Instead, it
    // directly checks if the argument is a RegExp and performs matching inline.

    // Check if argument is a RegExp
    RegExpData* data = nullptr;
    std::unique_ptr<RE2> temp_regex;
    bool is_global = false;

    if(args[0].isObject()) {
        data = RegExpRegistry::get(args[0].getObject());
    }

    // 4. Let S be ? ToString(O).
    // 5. Let rx be ? RegExpCreate(regexp, undefined).
    // 6. Return ? Invoke(rx, %Symbol.match%, <<S>>).
    // SIMPLIFIED: Instead of creating a new RegExp and invoking Symbol.match,
    // Rift creates a temporary RE2 regex and matches directly.
    RE2* regex_ptr = nullptr;
    if(data) {
        regex_ptr = data->regex.get();
        is_global = data->global;
    } else {
        // Convert to string and create a temporary regex
        std::string pattern = args[0].toString();
        RE2::Options opts;
        opts.set_log_errors(false);
        temp_regex = std::make_unique<RE2>(pattern, opts);
        regex_ptr = temp_regex.get();
    }

    if(!regex_ptr || !regex_ptr->ok()) {
        return Value::null();
    }

    absl::string_view text(str);

    if(!is_global) {
        // Non-global: return single match with groups, index, input (like exec)
        // This follows the RegExp.prototype[@@match] behavior for non-global regexps,
        // which delegates to RegExpExec (22.2.7.1).
        int num_groups = regex_ptr->NumberOfCapturingGroups();
        int num_submatch = 1 + num_groups;
        std::vector<absl::string_view> submatch(num_submatch);

        if(!regex_ptr->Match(text, 0, static_cast<int>(str.size()), RE2::UNANCHORED,
                             submatch.data(), num_submatch)) {
            return Value::null();
        }

        size_t match_index = submatch[0].data() - str.data();

        std::vector<Value> elements;
        elements.emplace_back(std::string(submatch[0]));
        for(int i = 1; i < num_submatch; ++i) {
            if(submatch[i].data() == nullptr) {
                elements.push_back(Value::undefined());
            } else {
                elements.emplace_back(std::string(submatch[i]));
            }
        }

        auto* result = Array::createArrayObject(getObjectFactory(), std::move(elements));
        result->setProperty("index", Value(static_cast<double>(match_index)));
        result->setProperty("input", Value(str));
        return Value(result);
    }

    // Global: return array of all matched strings
    // This follows the RegExp.prototype[@@match] behavior for global regexps,
    // which collects all match strings into an array.
    std::vector<Value> matches;
    absl::string_view submatch;
    size_t start_pos = 0;

    while(start_pos <= str.size()) {
        if(!regex_ptr->Match(text, static_cast<int>(start_pos), static_cast<int>(str.size()),
                             RE2::UNANCHORED, &submatch, 1)) {
            break;
        }

        matches.emplace_back(std::string(submatch));

        size_t match_end = (submatch.data() - str.data()) + submatch.size();
        if(match_end == start_pos) {
            // Avoid infinite loop on zero-length match
            start_pos++;
        } else {
            start_pos = match_end;
        }
    }

    if(matches.empty()) {
        return Value::null();
    }

    // Reset lastIndex for global regexp
    if(data) {
        data->lastIndex = 0;
        if(args[0].isObject()) {
            args[0].getObject()->setProperty("lastIndex", Value(0.0));
        }
    }

    return Value(Array::createArrayObject(getObjectFactory(), std::move(matches)));
}

// 22.1.3.19 String.prototype.replace ( searchValue, replaceValue )
// @spec https://tc39.es/ecma262/#sec-string.prototype.replace

// Helper: convert JS replacement pattern ($1, $&, etc.) to RE2 format (\1, \0, etc.)
// Implements a subset of GetSubstitution (22.1.3.19.1)
// @spec https://tc39.es/ecma262/#sec-getsubstitution
// INCOMPLETE: $` (prefix) and $' (suffix) substitution patterns are not yet supported.
static std::string convertReplacementPattern(const std::string& js_replacement,
                                             const std::string& full_match) {
    std::string result;
    result.reserve(js_replacement.size());

    for(size_t i = 0; i < js_replacement.size(); ++i) {
        if(js_replacement[i] == '$' && i + 1 < js_replacement.size()) {
            char next = js_replacement[i + 1];
            if(next == '&') {
                // $& -> full match
                result += full_match;
                ++i;
            } else if(next == '$') {
                // $$ -> literal $
                result += '$';
                ++i;
            } else if(next == '`') {
                // $` -> not supported yet, skip
                ++i;
            } else if(next == '\'') {
                // $' -> not supported yet, skip
                ++i;
            } else if(next >= '0' && next <= '9') {
                // $1-$9 -> \1-\9 (RE2 backreference)
                result += '\\';
                result += next;
                ++i;
                // Handle $10-$99
                if(i + 1 < js_replacement.size() && js_replacement[i + 1] >= '0' &&
                   js_replacement[i + 1] <= '9') {
                    result += js_replacement[i + 1];
                    ++i;
                }
            } else {
                result += '$';
            }
        } else {
            result += js_replacement[i];
        }
    }

    return result;
}

// 22.1.3.19 String.prototype.replace ( searchValue, replaceValue )
// @spec https://tc39.es/ecma262/#sec-string.prototype.replace
//
// The spec algorithm (for string searchValue, steps 4-17):
//   1. Let O be the this value.
//   2. Perform ? RequireObjectCoercible(O).
//   3. If searchValue is an Object, then
//     a. Let replacer be ? GetMethod(searchValue, %Symbol.replace%).
//     b. If replacer is not undefined, then
//       i. Return ? Call(replacer, searchValue, <<O, replaceValue>>).
//   4. Let string be ? ToString(O).
//   5. Let searchString be ? ToString(searchValue).
//   6. Let functionalReplace be IsCallable(replaceValue).
//   7. If functionalReplace is false, then
//     a. Set replaceValue to ? ToString(replaceValue).
//   8. Let searchLength be the length of searchString.
//   9. Let position be StringIndexOf(string, searchString, 0).
//  10. If position is not-found, return string.
//  11. Let preceding be the substring of string from 0 to position.
//  12. Let following be the substring of string from position + searchLength.
//  13. If functionalReplace is true, then
//     a. Let replacement be ? ToString(? Call(replaceValue, undefined,
//        <<searchString, F(position), string>>)).
//  14. Else,
//     a. Assert: replaceValue is a String.
//     b. Let captures be a new empty List.
//     c. Let replacement be ! GetSubstitution(...).
//  15. Return the string-concatenation of preceding, replacement, and following.
//
// DEVIATION: When searchValue is a RegExp, Rift handles matching inline using
// RE2 instead of dispatching through Symbol.replace. This supports both global
// and non-global replacement, with string and function replacers.
Value String::replace(const CallContext& ctx, const std::vector<Value>& args) {
    // 1. Let O be the this value.
    // 2. Perform ? RequireObjectCoercible(O).
    std::string str = extractThisString(ctx);

    if(args.empty()) {
        return Value(std::move(str));
    }

    Value search_value = args[0];
    Value replace_value = args.size() > 1 ? args[1] : Value::undefined();

    // 3. If searchValue is an Object, then
    //   a. Let replacer be ? GetMethod(searchValue, %Symbol.replace%).
    //   b. If replacer is not undefined, then
    //     i. Return ? Call(replacer, searchValue, <<O, replaceValue>>).
    // DEVIATION: Rift checks directly for RegExp instead of using Symbol.replace.
    RegExpData* data = nullptr;
    if(search_value.isObject()) {
        data = RegExpRegistry::get(search_value.getObject());
    }

    if(data) {
        // RegExp replacement path -- implements RegExp.prototype[@@replace] behavior
        // @spec https://tc39.es/ecma262/#sec-regexp.prototype-%symbol.replace%
        bool is_function = replace_value.isFunction();
        std::string replace_str = is_function ? "" : replace_value.toString();

        if(!is_function) {
            // String replacement with regex
            std::string result = str;

            if(data->global) {
                // Global replace: find all matches manually to support $& properly
                std::string output;
                absl::string_view text(str);
                size_t start_pos = 0;

                int num_groups = data->regex->NumberOfCapturingGroups();
                int num_submatch = 1 + num_groups;
                std::vector<absl::string_view> submatch(num_submatch);

                while(start_pos <= str.size()) {
                    if(!data->regex->Match(text, static_cast<int>(start_pos),
                                           static_cast<int>(str.size()), RE2::UNANCHORED,
                                           submatch.data(), num_submatch)) {
                        break;
                    }

                    size_t match_start = submatch[0].data() - str.data();
                    output += str.substr(start_pos, match_start - start_pos);

                    // Build replacement string with backreference support
                    // (partial GetSubstitution implementation)
                    std::string replacement =
                        convertReplacementPattern(replace_str, std::string(submatch[0]));
                    // Resolve \1, \2 etc. backreferences manually
                    std::string resolved;
                    for(size_t i = 0; i < replacement.size(); ++i) {
                        if(replacement[i] == '\\' && i + 1 < replacement.size() &&
                           replacement[i + 1] >= '0' && replacement[i + 1] <= '9') {
                            int group = replacement[i + 1] - '0';
                            // Check for two-digit group
                            if(i + 2 < replacement.size() && replacement[i + 2] >= '0' &&
                               replacement[i + 2] <= '9') {
                                int two_digit = group * 10 + (replacement[i + 2] - '0');
                                if(two_digit < num_submatch) {
                                    group = two_digit;
                                    ++i;  // skip extra digit
                                }
                            }
                            if(group < num_submatch && submatch[group].data() != nullptr) {
                                resolved += std::string(submatch[group]);
                            }
                            ++i;  // skip the digit
                        } else {
                            resolved += replacement[i];
                        }
                    }
                    output += resolved;

                    size_t match_end = match_start + submatch[0].size();
                    if(match_end == start_pos) {
                        if(start_pos < str.size()) {
                            output += str[start_pos];
                        }
                        start_pos++;
                    } else {
                        start_pos = match_end;
                    }
                }

                output += str.substr(start_pos);
                return Value(std::move(output));
            }

            // Non-global: replace first match only
            int num_groups = data->regex->NumberOfCapturingGroups();
            int num_submatch = 1 + num_groups;
            std::vector<absl::string_view> submatch(num_submatch);
            absl::string_view text(str);

            if(data->regex->Match(text, 0, static_cast<int>(str.size()), RE2::UNANCHORED,
                                  submatch.data(), num_submatch)) {
                size_t match_start = submatch[0].data() - str.data();
                std::string replacement =
                    convertReplacementPattern(replace_str, std::string(submatch[0]));
                // Resolve backreferences
                std::string resolved;
                for(size_t i = 0; i < replacement.size(); ++i) {
                    if(replacement[i] == '\\' && i + 1 < replacement.size() &&
                       replacement[i + 1] >= '0' && replacement[i + 1] <= '9') {
                        int group = replacement[i + 1] - '0';
                        if(i + 2 < replacement.size() && replacement[i + 2] >= '0' &&
                           replacement[i + 2] <= '9') {
                            int two_digit = group * 10 + (replacement[i + 2] - '0');
                            if(two_digit < num_submatch) {
                                group = two_digit;
                                ++i;
                            }
                        }
                        if(group < num_submatch && submatch[group].data() != nullptr) {
                            resolved += std::string(submatch[group]);
                        }
                        ++i;
                    } else {
                        resolved += replacement[i];
                    }
                }
                result = str.substr(0, match_start) + resolved +
                         str.substr(match_start + submatch[0].size());
            }

            return Value(std::move(result));
        }

        // Function replacement with regex
        auto* func = dynamic_cast<JSFunction*>(replace_value.getObject());
        if(!func) {
            return Value(std::move(str));
        }

        int num_groups = data->regex->NumberOfCapturingGroups();
        int num_submatch = 1 + num_groups;
        std::vector<absl::string_view> submatch(num_submatch);
        absl::string_view text(str);

        if(!data->global) {
            // Non-global function replacement: replace first match
            if(data->regex->Match(text, 0, static_cast<int>(str.size()), RE2::UNANCHORED,
                                  submatch.data(), num_submatch)) {
                size_t match_start = submatch[0].data() - str.data();

                // 13a. Let replacement be ? ToString(? Call(replaceValue, undefined,
                //      <<searchString, F(position), string>>)).
                std::vector<Value> call_args;
                call_args.emplace_back(std::string(submatch[0]));
                for(int i = 1; i < num_submatch; ++i) {
                    if(submatch[i].data() == nullptr) {
                        call_args.push_back(Value::undefined());
                    } else {
                        call_args.emplace_back(std::string(submatch[i]));
                    }
                }
                call_args.emplace_back(static_cast<double>(match_start));
                call_args.emplace_back(str);

                rift::core::CallContext cb_ctx(rift::core::CallType::Function, Value::undefined());
                Value replacement = func->call(cb_ctx, call_args);

                // 15. Return the string-concatenation of preceding, replacement, and following.
                return Value(str.substr(0, match_start) + replacement.toString() +
                             str.substr(match_start + submatch[0].size()));
            }
            return Value(std::move(str));
        }

        // Global function replacement
        std::string output;
        size_t start_pos = 0;

        while(start_pos <= str.size()) {
            if(!data->regex->Match(text, static_cast<int>(start_pos), static_cast<int>(str.size()),
                                   RE2::UNANCHORED, submatch.data(), num_submatch)) {
                break;
            }

            size_t match_start = submatch[0].data() - str.data();
            output += str.substr(start_pos, match_start - start_pos);

            std::vector<Value> call_args;
            call_args.emplace_back(std::string(submatch[0]));
            for(int i = 1; i < num_submatch; ++i) {
                if(submatch[i].data() == nullptr) {
                    call_args.push_back(Value::undefined());
                } else {
                    call_args.emplace_back(std::string(submatch[i]));
                }
            }
            call_args.emplace_back(static_cast<double>(match_start));
            call_args.emplace_back(str);

            rift::core::CallContext cb_ctx(rift::core::CallType::Function, Value::undefined());
            Value replacement = func->call(cb_ctx, call_args);
            output += replacement.toString();

            size_t match_end = match_start + submatch[0].size();
            if(match_end == start_pos) {
                if(start_pos < str.size()) {
                    output += str[start_pos];
                }
                start_pos++;
            } else {
                start_pos = match_end;
            }
        }

        output += str.substr(start_pos);
        return Value(std::move(output));
    }

    // String search (not RegExp) -- spec steps 4-15
    // 4. Let string be ? ToString(O).
    // 5. Let searchString be ? ToString(searchValue).
    std::string search_str = search_value.toString();

    // 9. Let position be StringIndexOf(string, searchString, 0).
    size_t pos = str.find(search_str);

    // 10. If position is not-found, return string.
    if(pos == std::string::npos) {
        return Value(std::move(str));
    }

    // 6. Let functionalReplace be IsCallable(replaceValue).
    if(replace_value.isFunction()) {
        // 13. If functionalReplace is true, then
        //   a. Let replacement be ? ToString(? Call(replaceValue, undefined,
        //      <<searchString, F(position), string>>)).
        auto* func = dynamic_cast<JSFunction*>(replace_value.getObject());
        if(!func) {
            return Value(std::move(str));
        }

        std::vector<Value> call_args;
        call_args.emplace_back(search_str);
        call_args.emplace_back(static_cast<double>(pos));
        call_args.emplace_back(str);

        rift::core::CallContext cb_ctx(rift::core::CallType::Function, Value::undefined());
        Value replacement = func->call(cb_ctx, call_args);

        // 15. Return the string-concatenation of preceding, replacement, and following.
        return Value(str.substr(0, pos) + replacement.toString() +
                     str.substr(pos + search_str.size()));
    }

    // 14. Else,
    //   a. Assert: replaceValue is a String.
    //   b. Let captures be a new empty List.
    //   c. Let replacement be ! GetSubstitution(searchString, string, position,
    //      captures, undefined, replaceValue).
    // Simple string replacement (first occurrence only)
    // Process $$ -> $ and $& -> matched substring (partial GetSubstitution)
    std::string raw_replace = replace_value.toString();
    std::string replace_str;
    replace_str.reserve(raw_replace.size());
    for(size_t i = 0; i < raw_replace.size(); ++i) {
        if(raw_replace[i] == '$' && i + 1 < raw_replace.size()) {
            if(raw_replace[i + 1] == '$') {
                replace_str += '$';
                ++i;
            } else if(raw_replace[i + 1] == '&') {
                replace_str += search_str;
                ++i;
            } else {
                replace_str += '$';
            }
        } else {
            replace_str += raw_replace[i];
        }
    }
    // 15. Return the string-concatenation of preceding, replacement, and following.
    return Value(str.substr(0, pos) + replace_str + str.substr(pos + search_str.size()));
}

// 22.1.3.24 String.prototype.startsWith ( searchString [ , position ] )
// @spec https://tc39.es/ecma262/#sec-string.prototype.startswith
Value String::startsWith(const CallContext& ctx, const std::vector<Value>& args) {
    // 1. Let O be the this value.
    // 2. Perform ? RequireObjectCoercible(O).
    // 3. Let S be ? ToString(O).
    std::string str = extractThisString(ctx);

    // 4. Let isRegExp be ? IsRegExp(searchString).
    // 5. If isRegExp is true, throw a TypeError exception.
    if(!args.empty() && args[0].isObject()) {
        RegExpData* data = RegExpRegistry::get(args[0].getObject());
        if(data) {
            throw rift::core::JavaScriptException(
                Value("TypeError: First argument to String.prototype.startsWith must not be a "
                      "regular expression"),
                0, 0);
        }
    }

    // 6. Let searchStr be ? ToString(searchString).
    std::string search_str = args.empty() ? "undefined" : args[0].toString();

    // 7. Let len be the length of S.
    size_t len = str.length();

    // 8. If position is undefined, let pos be 0; else let pos be
    //    ? ToIntegerOrInfinity(position).
    // 9. Let start be the result of clamping pos between 0 and len.
    size_t start = 0;
    if(args.size() >= 2 && !args[1].isUndefined()) {
        double pos = args[1].toNumber();
        if(std::isnan(pos) || pos < 0) {
            start = 0;
        } else if(pos >= static_cast<double>(len)) {
            start = len;
        } else {
            start = static_cast<size_t>(pos);
        }
    }

    // 10. Let searchLength be the length of searchStr.
    size_t search_len = search_str.length();

    // 11. If searchLength + start > len, return false.
    if(search_len + start > len) {
        return Value(false);
    }

    // 12. For each integer i such that 0 <= i < searchLength, do
    //   a. If the code unit at index start + i within S is different from the
    //      code unit at index i within searchStr, return false.
    // 13. Return true.
    return Value(str.compare(start, search_len, search_str) == 0);
}

// 22.1.3.7 String.prototype.endsWith ( searchString [ , endPosition ] )
// @spec https://tc39.es/ecma262/#sec-string.prototype.endswith
Value String::endsWith(const CallContext& ctx, const std::vector<Value>& args) {
    // 1. Let O be the this value.
    // 2. Perform ? RequireObjectCoercible(O).
    // 3. Let S be ? ToString(O).
    std::string str = extractThisString(ctx);

    // 4. Let isRegExp be ? IsRegExp(searchString).
    // 5. If isRegExp is true, throw a TypeError exception.
    if(!args.empty() && args[0].isObject()) {
        RegExpData* data = RegExpRegistry::get(args[0].getObject());
        if(data) {
            throw rift::core::JavaScriptException(
                Value("TypeError: First argument to String.prototype.endsWith must not be a "
                      "regular expression"),
                0, 0);
        }
    }

    // 6. Let searchStr be ? ToString(searchString).
    std::string search_str = args.empty() ? "undefined" : args[0].toString();

    // 7. Let len be the length of S.
    size_t len = str.length();

    // 8. If endPosition is undefined, let pos be len; else let pos be
    //    ? ToIntegerOrInfinity(endPosition).
    // 9. Let end be the result of clamping pos between 0 and len.
    size_t end = len;
    if(args.size() >= 2 && !args[1].isUndefined()) {
        double pos = args[1].toNumber();
        if(std::isnan(pos) || pos < 0) {
            end = 0;
        } else if(pos >= static_cast<double>(len)) {
            end = len;
        } else {
            end = static_cast<size_t>(pos);
        }
    }

    // 10. Let searchLength be the length of searchStr.
    size_t search_len = search_str.length();

    // 11. If searchLength > end, return false.
    if(search_len > end) {
        return Value(false);
    }

    // 12. Let start be end - searchLength.
    size_t start = end - search_len;

    // 13-14. Compare and return.
    return Value(str.compare(start, search_len, search_str) == 0);
}

// 22.1.3.8 String.prototype.includes ( searchString [ , position ] )
// @spec https://tc39.es/ecma262/#sec-string.prototype.includes
Value String::includes(const CallContext& ctx, const std::vector<Value>& args) {
    // 1. Let O be the this value.
    // 2. Perform ? RequireObjectCoercible(O).
    // 3. Let S be ? ToString(O).
    std::string str = extractThisString(ctx);

    // 4. Let isRegExp be ? IsRegExp(searchString).
    // 5. If isRegExp is true, throw a TypeError exception.
    if(!args.empty() && args[0].isObject()) {
        RegExpData* data = RegExpRegistry::get(args[0].getObject());
        if(data) {
            throw rift::core::JavaScriptException(
                Value("TypeError: First argument to String.prototype.includes must not be a "
                      "regular expression"),
                0, 0);
        }
    }

    // 6. Let searchStr be ? ToString(searchString).
    std::string search_str = args.empty() ? "undefined" : args[0].toString();

    // 7. Let pos be ? ToIntegerOrInfinity(position).
    // 8. Assert: If position is undefined, then pos is 0.
    // 9. Let len be the length of S.
    // 10. Let start be the result of clamping pos between 0 and len.
    size_t start = 0;
    if(args.size() >= 2 && !args[1].isUndefined()) {
        double pos = args[1].toNumber();
        if(!std::isnan(pos) && pos > 0) {
            start = static_cast<size_t>(std::min(pos, static_cast<double>(str.length())));
        }
    }

    // 11. Let index be StringIndexOf(S, searchStr, start).
    // 12. If index is not -1, return true.
    // 13. Return false.
    return Value(str.find(search_str, start) != std::string::npos);
}

// 22.1.3.18 String.prototype.repeat ( count )
// @spec https://tc39.es/ecma262/#sec-string.prototype.repeat
Value String::repeat(const CallContext& ctx, const std::vector<Value>& args) {
    // 1. Let O be the this value.
    // 2. Perform ? RequireObjectCoercible(O).
    // 3. Let S be ? ToString(O).
    std::string str = extractThisString(ctx);

    // 4. Let n be ? ToIntegerOrInfinity(count).
    double n = args.empty() ? 0.0 : args[0].toNumber();

    // 5. If n < 0 or n = +inf, throw a RangeError exception.
    if(n < 0 || std::isinf(n)) {
        throw rift::core::JavaScriptException(
            Value("RangeError: Invalid count value: " + std::to_string(n)), 0, 0);
    }

    // 6. If n = 0, return the empty String.
    if(std::isnan(n) || n == 0 || str.empty()) {
        return Value(std::string(""));
    }

    size_t count = static_cast<size_t>(n);

    // Guard against excessive memory allocation
    if(count > 0 && str.length() > 1000000 / count) {
        throw rift::core::JavaScriptException(Value("RangeError: Invalid string length"), 0, 0);
    }

    // 7. Return the String value that is made from n copies of S appended together.
    std::string result;
    result.reserve(str.length() * count);
    for(size_t i = 0; i < count; ++i) {
        result += str;
    }

    return Value(std::move(result));
}

// 22.1.3.16 String.prototype.padStart ( maxLength [ , fillString ] )
// @spec https://tc39.es/ecma262/#sec-string.prototype.padstart
Value String::padStart(const CallContext& ctx, const std::vector<Value>& args) {
    // 1. Let O be the this value.
    // 2. Perform ? RequireObjectCoercible(O).
    // 3. Return ? StringPad(O, maxLength, fillString, start).
    //
    // StringPad ( O, maxLength, fillString, placement )
    // @spec https://tc39.es/ecma262/#sec-stringpad
    // 1. Let S be ? ToString(O).
    std::string str = extractThisString(ctx);

    // 2. Let intMaxLength be R(? ToLength(maxLength)).
    double max_len = args.empty() ? 0.0 : args[0].toNumber();
    if(std::isnan(max_len) || max_len < 0) {
        max_len = 0;
    }
    size_t target_len = static_cast<size_t>(max_len);

    // 3. Let stringLength be the length of S.
    size_t str_len = str.length();

    // 4. If intMaxLength <= stringLength, return S.
    if(target_len <= str_len) {
        return Value(std::move(str));
    }

    // 5. If fillString is undefined, set fillString to the String value
    //    consisting solely of a code unit 0x0020 (SPACE).
    // 6. Else, set fillString to ? ToString(fillString).
    std::string fill_str = " ";
    if(args.size() >= 2 && !args[1].isUndefined()) {
        fill_str = args[1].toString();
    }

    // 7. If fillString is the empty String, return S.
    if(fill_str.empty()) {
        return Value(std::move(str));
    }

    // 8. Let fillLen be intMaxLength - stringLength.
    size_t fill_len = target_len - str_len;

    // 9. Let truncatedStringFiller be the String value consisting of repeated
    //    concatenations of fillString truncated to length fillLen.
    std::string padding;
    padding.reserve(fill_len);
    while(padding.length() < fill_len) {
        padding += fill_str;
    }
    padding = padding.substr(0, fill_len);

    // 10. If placement is start, return the string-concatenation of
    //     truncatedStringFiller and S.
    return Value(padding + str);
}

// 22.1.3.15 String.prototype.padEnd ( maxLength [ , fillString ] )
// @spec https://tc39.es/ecma262/#sec-string.prototype.padend
Value String::padEnd(const CallContext& ctx, const std::vector<Value>& args) {
    // 1. Let O be the this value.
    // 2. Perform ? RequireObjectCoercible(O).
    // 3. Return ? StringPad(O, maxLength, fillString, end).
    //
    // StringPad ( O, maxLength, fillString, placement )
    // @spec https://tc39.es/ecma262/#sec-stringpad
    // 1. Let S be ? ToString(O).
    std::string str = extractThisString(ctx);

    // 2. Let intMaxLength be R(? ToLength(maxLength)).
    double max_len = args.empty() ? 0.0 : args[0].toNumber();
    if(std::isnan(max_len) || max_len < 0) {
        max_len = 0;
    }
    size_t target_len = static_cast<size_t>(max_len);

    // 3. Let stringLength be the length of S.
    size_t str_len = str.length();

    // 4. If intMaxLength <= stringLength, return S.
    if(target_len <= str_len) {
        return Value(std::move(str));
    }

    // 5-7. (same as padStart)
    std::string fill_str = " ";
    if(args.size() >= 2 && !args[1].isUndefined()) {
        fill_str = args[1].toString();
    }

    if(fill_str.empty()) {
        return Value(std::move(str));
    }

    // 8. Let fillLen be intMaxLength - stringLength.
    size_t fill_len = target_len - str_len;

    // 9. Let truncatedStringFiller be the String value consisting of repeated
    //    concatenations of fillString truncated to length fillLen.
    std::string padding;
    padding.reserve(fill_len);
    while(padding.length() < fill_len) {
        padding += fill_str;
    }
    padding = padding.substr(0, fill_len);

    // 11. If placement is end, return the string-concatenation of S and
    //     truncatedStringFiller.
    return Value(str + padding);
}

// 22.1.3.33 String.prototype.trimStart ( )
// @spec https://tc39.es/ecma262/#sec-string.prototype.trimstart
Value String::trimStart(const CallContext& ctx, const std::vector<Value>& args) {
    // 1. Let S be the this value.
    // 2. Return ? TrimString(S, start).
    //
    // TrimString ( string, where ) -- 22.1.3.32.1
    // @spec https://tc39.es/ecma262/#sec-trimstring
    std::string str = extractThisString(ctx);

    // Trim leading whitespace only
    size_t start = 0;
    while(start < str.length() && std::isspace(static_cast<unsigned char>(str[start]))) {
        start++;
    }

    return Value(str.substr(start));
}

// 22.1.3.34 String.prototype.trimEnd ( )
// @spec https://tc39.es/ecma262/#sec-string.prototype.trimend
Value String::trimEnd(const CallContext& ctx, const std::vector<Value>& args) {
    // 1. Let S be the this value.
    // 2. Return ? TrimString(S, end).
    //
    // TrimString ( string, where ) -- 22.1.3.32.1
    // @spec https://tc39.es/ecma262/#sec-trimstring
    std::string str = extractThisString(ctx);

    // Trim trailing whitespace only
    size_t end = str.length();
    while(end > 0 && std::isspace(static_cast<unsigned char>(str[end - 1]))) {
        end--;
    }

    return Value(str.substr(0, end));
}

// 22.1.3.1 String.prototype.at ( index )
// @spec https://tc39.es/ecma262/#sec-string.prototype.at
Value String::at(const CallContext& ctx, const std::vector<Value>& args) {
    // 1. Let O be the this value.
    // 2. Perform ? RequireObjectCoercible(O).
    // 3. Let S be ? ToString(O).
    std::string str = extractThisString(ctx);

    // 4. Let len be the length of S.
    int64_t len = static_cast<int64_t>(str.length());

    // 5. Let relativeIndex be ? ToIntegerOrInfinity(index).
    double relative_index = args.empty() ? 0.0 : args[0].toNumber();
    if(std::isnan(relative_index)) {
        relative_index = 0.0;
    }
    int64_t idx = static_cast<int64_t>(relative_index);

    // 6. If relativeIndex >= 0, then let k be relativeIndex.
    // 7. Else, let k be len + relativeIndex.
    int64_t k;
    if(idx >= 0) {
        k = idx;
    } else {
        k = len + idx;
    }

    // 8. If k < 0 or k >= len, return undefined.
    if(k < 0 || k >= len) {
        return Value::undefined();
    }

    // 9. Return the substring of S from k to k + 1.
    return Value(std::string(1, str[static_cast<size_t>(k)]));
}

// 22.1.3.20 String.prototype.replaceAll ( searchValue, replaceValue )
// @spec https://tc39.es/ecma262/#sec-string.prototype.replaceall
Value String::replaceAll(const CallContext& ctx, const std::vector<Value>& args) {
    // 1. Let O be the this value.
    // 2. Perform ? RequireObjectCoercible(O).
    std::string str = extractThisString(ctx);

    if(args.empty()) {
        return Value(std::move(str));
    }

    Value search_value = args[0];
    Value replace_value = args.size() > 1 ? args[1] : Value::undefined();

    // 3. If searchValue is not undefined or null, then
    //   a. Let isRegExp be ? IsRegExp(searchValue).
    //   b. If isRegExp is true, then
    //     i. Let flags be ? Get(searchValue, "flags").
    //     ii. Perform ? RequireObjectCoercible(flags).
    //     iii. If flags does not contain "g", throw a TypeError exception.
    if(search_value.isObject()) {
        RegExpData* data = RegExpRegistry::get(search_value.getObject());
        if(data) {
            if(!data->global) {
                throw rift::core::JavaScriptException(
                    Value("TypeError: String.prototype.replaceAll called with a non-global "
                          "RegExp argument"),
                    0, 0);
            }
            // Delegate to replace for global RegExp
            return replace(ctx, args);
        }
    }

    // 4. Let string be ? ToString(O).
    // 5. Let searchString be ? ToString(searchValue).
    std::string search_str = search_value.toString();

    // 6. Let functionalReplace be IsCallable(replaceValue).
    bool is_function = replace_value.isFunction();
    std::string replace_str = is_function ? "" : replace_value.toString();

    // Build result by replacing all occurrences
    std::string result;
    size_t start = 0;

    if(search_str.empty()) {
        // Empty search string: insert replacement before each char and at end
        for(size_t i = 0; i < str.length(); ++i) {
            if(is_function) {
                auto* func = dynamic_cast<JSFunction*>(replace_value.getObject());
                if(func) {
                    std::vector<Value> call_args;
                    call_args.emplace_back(std::string(""));
                    call_args.emplace_back(static_cast<double>(i));
                    call_args.emplace_back(str);
                    rift::core::CallContext cb_ctx(rift::core::CallType::Function,
                                                   Value::undefined());
                    Value repl = func->call(cb_ctx, call_args);
                    result += repl.toString();
                }
            } else {
                result += replace_str;
            }
            result += str[i];
        }
        // Final insertion after last char
        if(is_function) {
            auto* func = dynamic_cast<JSFunction*>(replace_value.getObject());
            if(func) {
                std::vector<Value> call_args;
                call_args.emplace_back(std::string(""));
                call_args.emplace_back(static_cast<double>(str.length()));
                call_args.emplace_back(str);
                rift::core::CallContext cb_ctx(rift::core::CallType::Function, Value::undefined());
                Value repl = func->call(cb_ctx, call_args);
                result += repl.toString();
            }
        } else {
            result += replace_str;
        }
        return Value(std::move(result));
    }

    // Non-empty search string: find and replace all occurrences
    size_t pos;
    while((pos = str.find(search_str, start)) != std::string::npos) {
        result += str.substr(start, pos - start);

        if(is_function) {
            auto* func = dynamic_cast<JSFunction*>(replace_value.getObject());
            if(func) {
                std::vector<Value> call_args;
                call_args.emplace_back(search_str);
                call_args.emplace_back(static_cast<double>(pos));
                call_args.emplace_back(str);
                rift::core::CallContext cb_ctx(rift::core::CallType::Function, Value::undefined());
                Value repl = func->call(cb_ctx, call_args);
                result += repl.toString();
            }
        } else {
            // Process $$ -> $ and $& -> matched substring (GetSubstitution)
            for(size_t i = 0; i < replace_str.size(); ++i) {
                if(replace_str[i] == '$' && i + 1 < replace_str.size()) {
                    if(replace_str[i + 1] == '$') {
                        result += '$';
                        ++i;
                    } else if(replace_str[i + 1] == '&') {
                        result += search_str;
                        ++i;
                    } else {
                        result += '$';
                    }
                } else {
                    result += replace_str[i];
                }
            }
        }

        start = pos + search_str.length();
    }

    result += str.substr(start);
    return Value(std::move(result));
}

// 22.1.3.14 String.prototype.matchAll ( regexp )
// @spec https://tc39.es/ecma262/#sec-string.prototype.matchall
Value String::matchAll(const CallContext& ctx, const std::vector<Value>& args) {
    // 1. Let O be the this value.
    // 2. Perform ? RequireObjectCoercible(O).
    std::string str = extractThisString(ctx);

    // 3. If regexp is not undefined or null, then
    //   a. Let isRegExp be ? IsRegExp(regexp).
    //   b. If isRegExp is true, then
    //     i. Let flags be ? Get(regexp, "flags").
    //     ii. Perform ? RequireObjectCoercible(flags).
    //     iii. If flags does not contain "g", throw a TypeError exception.
    RegExpData* data = nullptr;
    std::unique_ptr<RE2> temp_regex;
    int num_groups = 0;

    if(!args.empty() && args[0].isObject()) {
        data = RegExpRegistry::get(args[0].getObject());
        if(data) {
            if(!data->global) {
                throw rift::core::JavaScriptException(
                    Value("TypeError: String.prototype.matchAll called with a non-global RegExp "
                          "argument"),
                    0, 0);
            }
        }
    }

    // Build a regex from the argument
    RE2* regex_ptr = nullptr;
    if(data) {
        regex_ptr = data->regex.get();
        num_groups = regex_ptr->NumberOfCapturingGroups();
    } else {
        std::string pattern = args.empty() ? "" : args[0].toString();
        RE2::Options opts;
        opts.set_log_errors(false);
        temp_regex = std::make_unique<RE2>(pattern, opts);
        regex_ptr = temp_regex.get();
        if(regex_ptr->ok()) {
            num_groups = regex_ptr->NumberOfCapturingGroups();
        }
    }

    // Collect all matches into an array of match result arrays
    // SIMPLIFIED: Instead of returning a proper RegExpStringIterator, we collect
    // all matches eagerly into an array and return an array iterator. This is
    // not fully spec-compliant but passes most test262 tests.
    std::vector<Value> all_matches;

    if(regex_ptr && regex_ptr->ok()) {
        int num_submatch = 1 + num_groups;
        std::vector<absl::string_view> submatch(num_submatch);
        size_t start_pos = 0;

        while(start_pos <= str.size()) {
            absl::string_view text(str);
            if(!regex_ptr->Match(text, static_cast<int>(start_pos), static_cast<int>(str.size()),
                                 RE2::UNANCHORED, submatch.data(), num_submatch)) {
                break;
            }

            size_t match_index = submatch[0].data() - str.data();

            std::vector<Value> elements;
            elements.emplace_back(std::string(submatch[0]));
            for(int i = 1; i < num_submatch; ++i) {
                if(submatch[i].data() == nullptr) {
                    elements.push_back(Value::undefined());
                } else {
                    elements.emplace_back(std::string(submatch[i]));
                }
            }

            auto* match_result = Array::createArrayObject(getObjectFactory(), std::move(elements));
            match_result->setProperty("index", Value(static_cast<double>(match_index)));
            match_result->setProperty("input", Value(str));
            all_matches.push_back(Value(match_result));

            size_t match_end = match_index + submatch[0].size();
            if(match_end == start_pos) {
                start_pos++;
            } else {
                start_pos = match_end;
            }
        }
    }

    // Return an array with an iterator
    auto* result_array = Array::createArrayObject(getObjectFactory(), std::move(all_matches));

    // Create an iterator for the result array using Symbol.iterator
    // The array already has Symbol.iterator from its prototype, so matchAll
    // should return an iterator (not the array itself).
    // We need to call the array's @@iterator method.
    std::string iterator_key = core::EvaluationUtils::symbolToPropertyKey(Symbol::getIteratorId());
    Value iter_func = result_array->getProperty(iterator_key);
    if(iter_func.isFunction()) {
        auto* func = dynamic_cast<JSFunction*>(iter_func.getObject());
        if(func) {
            rift::core::CallContext iter_ctx(rift::core::CallType::Function, Value(result_array));
            std::vector<Value> no_args;
            return func->call(iter_ctx, no_args);
        }
    }

    return Value(result_array);
}

// 22.1.3.15 String.prototype.normalize ( [ form ] )
// @spec https://tc39.es/ecma262/#sec-string.prototype.normalize
Value String::normalize(const CallContext& ctx, const std::vector<Value>& args) {
    // 1. Let O be the this value.
    // 2. Perform ? RequireObjectCoercible(O).
    // 3. Let S be ? ToString(O).
    std::string str = extractThisString(ctx);

    // 4. If form is undefined, let f be "NFC".
    // 5. Else, let f be ? ToString(form).
    std::string form = "NFC";
    if(!args.empty() && !args[0].isUndefined()) {
        form = args[0].toString();
    }

    // 6. If f is not one of "NFC", "NFD", "NFKC", or "NFKD", throw a RangeError exception.
    if(form != "NFC" && form != "NFD" && form != "NFKC" && form != "NFKD") {
        throw rift::core::JavaScriptException(
            Value("RangeError: The normalization form should be one of NFC, NFD, NFKC, NFKD"), 0,
            0);
    }

    // 7. Let ns be the String value that is the result of normalizing S into
    //    the normalization form named by f.
    // SIMPLIFIED: Rift does not perform actual Unicode normalization. ASCII strings
    // are already in all normalized forms, so we return S as-is. This is correct
    // for ASCII-only content, which covers most test262 test cases.
    // 8. Return ns.
    return Value(std::move(str));
}

// 22.1.3.36 String.prototype [ @@iterator ] ( )
// @spec https://tc39.es/ecma262/#sec-string.prototype-%symbol.iterator%
Value String::symbolIterator(const CallContext& ctx, const std::vector<Value>& /* args */) {
    // 1. Let O be the this value.
    // 2. Perform ? RequireObjectCoercible(O).
    // 3. Let s be ? ToString(O).
    std::string str = extractThisString(ctx);

    // 4. Let closure be a new Abstract Closure ... that iterates over code points.
    // 5. Return CreateIteratorFromClosure(closure, "%StringIteratorPrototype%", ...).
    // SIMPLIFIED: Rift delegates to StringIterator::create which handles the
    // iterator creation. The iterator yields individual characters (code units)
    // rather than full Unicode code points.
    return Value(StringIterator::create(getObjectFactory(), str));
}

}  // namespace rift::builtins
