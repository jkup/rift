#pragma once

#include <algorithm>
#include <cctype>
#include <regex>
#include <string>
#include <vector>

#include "../builtin_base.h"
#include "../../memory/object_factory.h"
#include "../../runtime/values/object.h"
#include "../../runtime/values/value.h"

namespace rift::builtins {

using namespace rift::runtime;

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
class String : public BuiltinBase<String> {
  public:
    /// Setup methods required by BuiltinBase template
    static void setupStaticMethods(JSObject* constructor, rift::memory::ObjectFactory* factory);
    static void setupPrototypeMethods(JSObject* prototype, rift::memory::ObjectFactory* factory);

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

    /// String prototype methods

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

    /// The `concat()` method concatenates the string arguments to the calling string and returns a new string.
    static Value concat(const std::vector<Value>& args);

    /// The `indexOf()` method, given one argument: a substring to search for, searches the entire
    /// calling string, and returns the index of the first occurrence of the specified substring.
    ///
    /// More information:
    ///  - [ECMAScript reference][spec]
    ///  - [MDN documentation][mdn]
    ///
    /// [spec]: https://tc39.es/ecma262/#sec-string.prototype.indexof
    /// [mdn]:
    /// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/indexOf
    static Value indexOf(const std::vector<Value>& args);

    /// The `lastIndexOf()` method, given one argument: a substring to search for, searches the
    /// entire calling string, and returns the index of the last occurrence of the specified
    /// substring.
    ///
    /// More information:
    ///  - [ECMAScript reference][spec]
    ///  - [MDN documentation][mdn]
    ///
    /// [spec]: https://tc39.es/ecma262/#sec-string.prototype.lastindexof
    /// [mdn]:
    /// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/lastIndexOf
    static Value lastIndexOf(const std::vector<Value>& args);

    /// The `slice()` method extracts a section of a string and returns it as a new string, without
    /// modifying the original string.
    ///
    /// More information:
    ///  - [ECMAScript reference][spec]
    ///  - [MDN documentation][mdn]
    ///
    /// [spec]: https://tc39.es/ecma262/#sec-string.prototype.slice
    /// [mdn]:
    /// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/slice
    static Value slice(const std::vector<Value>& args);

    /// The `substring()` method returns the part of the string from the start index up to and
    /// excluding the end index, or to the end of the string if no end index is supplied.
    ///
    /// More information:
    ///  - [ECMAScript reference][spec]
    ///  - [MDN documentation][mdn]
    ///
    /// [spec]: https://tc39.es/ecma262/#sec-string.prototype.substring
    /// [mdn]:
    /// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/substring
    static Value substring(const std::vector<Value>& args);

    /// The `substr()` method returns a portion of the string, starting at the specified index and
    /// extending for a given number of characters afterwards.
    ///
    /// More information:
    ///  - [ECMAScript reference][spec]
    ///  - [MDN documentation][mdn]
    ///
    /// [spec]: https://tc39.es/ecma262/#sec-string.prototype.substr
    /// [mdn]:
    /// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/substr
    static Value substr(const std::vector<Value>& args);

    /// The `toUpperCase()` method returns the calling string value converted to uppercase (the
    /// value will be converted to a string if it isn't one).
    ///
    /// More information:
    ///  - [ECMAScript reference][spec]
    ///  - [MDN documentation][mdn]
    ///
    /// [spec]: https://tc39.es/ecma262/#sec-string.prototype.touppercase
    /// [mdn]:
    /// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/toUpperCase
    static Value toUpperCase(const std::vector<Value>& args);

    /// The `toLowerCase()` method returns the calling string value converted to lower case (the
    /// value will be converted to a string if it isn't one).
    ///
    /// More information:
    ///  - [ECMAScript reference][spec]
    ///  - [MDN documentation][mdn]
    ///
    /// [spec]: https://tc39.es/ecma262/#sec-string.prototype.tolowercase
    /// [mdn]:
    /// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/toLowerCase
    static Value toLowerCase(const std::vector<Value>& args);

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

    /// The `replace()` method returns a new string with one, some, or all matches of a pattern
    /// replaced by a replacement.
    ///
    /// More information:
    ///  - [ECMAScript reference][spec]
    ///  - [MDN documentation][mdn]
    ///
    /// [spec]: https://tc39.es/ecma262/#sec-string.prototype.replace
    /// [mdn]:
    /// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace
    static Value replace(const std::vector<Value>& args);

    /// The `split()` method takes a pattern and divides a String into an ordered list of
    /// substrings by searching for the pattern, puts these substrings into an array, and returns
    /// the array.
    ///
    /// More information:
    ///  - [ECMAScript reference][spec]
    ///  - [MDN documentation][mdn]
    ///
    /// [spec]: https://tc39.es/ecma262/#sec-string.prototype.split
    /// [mdn]:
    /// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/split
    static Value split(const std::vector<Value>& args);

    /// The `toString()` method returns a string representing the specified object.
    ///
    /// More information:
    ///  - [ECMAScript reference][spec]
    ///  - [MDN documentation][mdn]
    ///
    /// [spec]: https://tc39.es/ecma262/#sec-string.prototype.tostring
    /// [mdn]:
    /// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/toString
    static Value toString(const std::vector<Value>& args);

    /// The `valueOf()` method returns the primitive value of a String object.
    ///
    /// More information:
    ///  - [ECMAScript reference][spec]
    ///  - [MDN documentation][mdn]
    ///
    /// [spec]: https://tc39.es/ecma262/#sec-string.prototype.valueof
    /// [mdn]:
    /// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/valueOf
    static Value valueOf(const std::vector<Value>& args);

  private:
    /// Extracts the string value from the first argument in `args`.
    static std::string getStringValue(const std::vector<Value>& args);
    /// Extracts the string value from the `this` value (typically the receiver object) in `args`.
    static std::string getThisStringValue(const std::vector<Value>& args);

    /// Helper for index validation
    static size_t validateStringIndex(const std::string& str, double index);

    /// Helper to get the global String prototype (for proper prototype chain)
    static JSObject* getGlobalPrototype();
};

}  // namespace rift::builtins