#pragma once

#include <algorithm>
#include <cctype>
#include <regex>
#include <string>

#include "../../runtime/values/object.h"
#include "../../runtime/values/value.h"

namespace jsruntime::builtins {

using namespace jsruntime::runtime;

/// The `String` builtin object and constructor.
///
/// The String object is used to represent and manipulate a sequence of characters.
/// It provides methods for working with strings and serves as the constructor for string objects.
///
/// More information:
///  - [ECMAScript reference][spec]
///  - [MDN documentation][mdn]
///
/// [spec]: https://tc39.es/ecma262/#sec-string-objects
/// [mdn]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String
class String {
   public:
    /// Create the String constructor object with all properties and methods.
    static std::shared_ptr<JSObject> create();

    /// Create the String.prototype object with all instance methods.
    static std::shared_ptr<JSObject> createPrototype();

   private:
    // String constructor function
    /// The `String()` constructor creates String objects or primitive strings.
    ///
    /// More information:
    ///  - [ECMAScript reference][spec]
    ///  - [MDN documentation][mdn]
    ///
    /// [spec]: https://tc39.es/ecma262/#sec-string-constructor
    /// [mdn]:
    /// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/String
    static Value constructor(const std::vector<Value>& args);

    // String static methods

    /// The `String.fromCharCode()` static method returns a string created from the specified
    /// sequence of UTF-16 code units.
    ///
    /// More information:
    ///  - [ECMAScript reference][spec]
    ///  - [MDN documentation][mdn]
    ///
    /// [spec]: https://tc39.es/ecma262/#sec-string.fromcharcode
    /// [mdn]:
    /// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/fromCharCode
    static Value fromCharCode(const std::vector<Value>& args);

    // String prototype methods

    /// The `charAt()` method returns a new string consisting of the single UTF-16 code unit
    /// located at the specified offset into the string.
    ///
    /// More information:
    ///  - [ECMAScript reference][spec]
    ///  - [MDN documentation][mdn]
    ///
    /// [spec]: https://tc39.es/ecma262/#sec-string.prototype.charat
    /// [mdn]:
    /// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/charAt
    static Value charAt(const std::vector<Value>& args);

    /// The `charCodeAt()` method returns an integer between 0 and 65535 representing the UTF-16
    /// code unit at the given index.
    ///
    /// More information:
    ///  - [ECMAScript reference][spec]
    ///  - [MDN documentation][mdn]
    ///
    /// [spec]: https://tc39.es/ecma262/#sec-string.prototype.charcodeat
    /// [mdn]:
    /// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/charCodeAt
    static Value charCodeAt(const std::vector<Value>& args);

    /// The `concat()` method concatenates the string arguments to the calling string and
    /// returns a new string.
    ///
    /// More information:
    ///  - [ECMAScript reference][spec]
    ///  - [MDN documentation][mdn]
    ///
    /// [spec]: https://tc39.es/ecma262/#sec-string.prototype.concat
    /// [mdn]:
    /// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/concat
    static Value concat(const std::vector<Value>& args);

    /// The `indexOf()` method returns the index of the first occurrence of the specified
    /// substring, or -1 if it is not found.
    ///
    /// More information:
    ///  - [ECMAScript reference][spec]
    ///  - [MDN documentation][mdn]
    ///
    /// [spec]: https://tc39.es/ecma262/#sec-string.prototype.indexof
    /// [mdn]:
    /// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/indexOf
    static Value indexOf(const std::vector<Value>& args);

    /// The `lastIndexOf()` method returns the index of the last occurrence of the specified
    /// substring, or -1 if it is not found.
    ///
    /// More information:
    ///  - [ECMAScript reference][spec]
    ///  - [MDN documentation][mdn]
    ///
    /// [spec]: https://tc39.es/ecma262/#sec-string.prototype.lastindexof
    /// [mdn]:
    /// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/lastIndexOf
    static Value lastIndexOf(const std::vector<Value>& args);

    /// The `slice()` method extracts a section of a string and returns it as a new string,
    /// without modifying the original string.
    ///
    /// More information:
    ///  - [ECMAScript reference][spec]
    ///  - [MDN documentation][mdn]
    ///
    /// [spec]: https://tc39.es/ecma262/#sec-string.prototype.slice
    /// [mdn]:
    /// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/slice
    static Value slice(const std::vector<Value>& args);

    /// The `substring()` method returns the part of the string between the start and end indexes,
    /// or to the end of the string.
    ///
    /// More information:
    ///  - [ECMAScript reference][spec]
    ///  - [MDN documentation][mdn]
    ///
    /// [spec]: https://tc39.es/ecma262/#sec-string.prototype.substring
    /// [mdn]:
    /// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/substring
    static Value substring(const std::vector<Value>& args);

    /// The `toLowerCase()` method returns the calling string value converted to lower case.
    ///
    /// More information:
    ///  - [ECMAScript reference][spec]
    ///  - [MDN documentation][mdn]
    ///
    /// [spec]: https://tc39.es/ecma262/#sec-string.prototype.tolowercase
    /// [mdn]:
    /// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/toLowerCase
    static Value toLowerCase(const std::vector<Value>& args);

    /// The `toUpperCase()` method returns the calling string value converted to upper case.
    ///
    /// More information:
    ///  - [ECMAScript reference][spec]
    ///  - [MDN documentation][mdn]
    ///
    /// [spec]: https://tc39.es/ecma262/#sec-string.prototype.touppercase
    /// [mdn]:
    /// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/toUpperCase
    static Value toUpperCase(const std::vector<Value>& args);

    /// The `trim()` method removes whitespace from both ends of a string and returns a new string,
    /// without modifying the original string.
    ///
    /// More information:
    ///  - [ECMAScript reference][spec]
    ///  - [MDN documentation][mdn]
    ///
    /// [spec]: https://tc39.es/ecma262/#sec-string.prototype.trim
    /// [mdn]:
    /// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/trim
    static Value trim(const std::vector<Value>& args);

    /// The `split()` method divides a String into an ordered list of substrings, puts these
    /// substrings into an array, and returns the array.
    ///
    /// More information:
    ///  - [ECMAScript reference][spec]
    ///  - [MDN documentation][mdn]
    ///
    /// [spec]: https://tc39.es/ecma262/#sec-string.prototype.split
    /// [mdn]:
    /// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/split
    static Value split(const std::vector<Value>& args);

    // Helper methods
    /// Helper to get the string value from the 'this' binding in prototype methods
    static std::string getThisStringValue(const std::vector<Value>& args);

    /// Helper to validate and get a string index, handling negative indices
    static size_t validateStringIndex(const std::string& str, double index);
};

}  // namespace jsruntime::builtins