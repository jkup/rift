#pragma once

#include <algorithm>
#include <vector>

#include "../../runtime/values/object.h"
#include "../../runtime/values/value.h"

namespace rift::builtins {

using namespace rift::runtime;

/// The `Array` builtin object and constructor.
///
/// The Array object is used to represent and manipulate ordered collections of values.
/// It provides methods for working with arrays and serves as the constructor for array objects.
///
/// More information:
///  - [ECMAScript reference][spec]
///  - [MDN documentation][mdn]
///
/// [spec]: https://tc39.es/ecma262/#sec-array-objects
/// [mdn]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array
class Array {
   public:
    /// Create the Array constructor object with all properties and methods.
    static std::shared_ptr<JSObject> create();

    /// Create the Array.prototype object with all instance methods.
    static std::shared_ptr<JSObject> createPrototype();

    /// Helper to create a new array object with the given elements
    static std::shared_ptr<JSObject> createArrayObject(const std::vector<Value>& elements);

   private:
    // Array constructor function
    /// The `Array()` constructor creates Array objects.
    ///
    /// More information:
    ///  - [ECMAScript reference][spec]
    ///  - [MDN documentation][mdn]
    ///
    /// [spec]: https://tc39.es/ecma262/#sec-array-constructor
    /// [mdn]:
    /// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/Array
    static Value constructor(const std::vector<Value>& args);

    // Array prototype methods

    /// The `push()` method adds one or more elements to the end of an array and returns the new
    /// length.
    ///
    /// More information:
    ///  - [ECMAScript reference][spec]
    ///  - [MDN documentation][mdn]
    ///
    /// [spec]: https://tc39.es/ecma262/#sec-array.prototype.push
    /// [mdn]:
    /// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/push
    static Value push(const std::vector<Value>& args);

    /// The `pop()` method removes the last element from an array and returns that element.
    ///
    /// More information:
    ///  - [ECMAScript reference][spec]
    ///  - [MDN documentation][mdn]
    ///
    /// [spec]: https://tc39.es/ecma262/#sec-array.prototype.pop
    /// [mdn]:
    /// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/pop
    static Value pop(const std::vector<Value>& args);

    /// The `length` property of an Array instance is an integer with a positive sign and a
    /// magnitude less than 2^32 that specifies the number of elements in the array.
    ///
    /// More information:
    ///  - [ECMAScript reference][spec]
    ///  - [MDN documentation][mdn]
    ///
    /// [spec]: https://tc39.es/ecma262/#sec-properties-of-array-instances-length
    /// [mdn]:
    /// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/length
    static Value getLength(const std::vector<Value>& args);

    /// The `forEach()` method executes a provided function once for each array element.
    ///
    /// More information:
    ///  - [ECMAScript reference][spec]
    ///  - [MDN documentation][mdn]
    ///
    /// [spec]: https://tc39.es/ecma262/#sec-array.prototype.foreach
    /// [mdn]:
    /// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/forEach
    static Value forEach(const std::vector<Value>& args);

    /// The `map()` method creates a new array populated with the results of calling a provided
    /// function on every element.
    ///
    /// More information:
    ///  - [ECMAScript reference][spec]
    ///  - [MDN documentation][mdn]
    ///
    /// [spec]: https://tc39.es/ecma262/#sec-array.prototype.map
    /// [mdn]:
    /// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/map
    static Value map(const std::vector<Value>& args);

    /// The `filter()` method creates a shallow copy of a portion of a given array, filtered down to
    /// just the elements from the given array that pass the test implemented by the provided
    /// function.
    ///
    /// More information:
    ///  - [ECMAScript reference][spec]
    ///  - [MDN documentation][mdn]
    ///
    /// [spec]: https://tc39.es/ecma262/#sec-array.prototype.filter
    /// [mdn]:
    /// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/filter
    static Value filter(const std::vector<Value>& args);

    /// The `reduce()` method executes a user-supplied "reducer" callback function on each element
    /// of the array, in order, passing in the return value from the calculation on the preceding
    /// element.
    ///
    /// More information:
    ///  - [ECMAScript reference][spec]
    ///  - [MDN documentation][mdn]
    ///
    /// [spec]: https://tc39.es/ecma262/#sec-array.prototype.reduce
    /// [mdn]:
    /// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/reduce
    static Value reduce(const std::vector<Value>& args);

    /// The `indexOf()` method returns the first index at which a given element can be found in the
    /// array, or -1 if it is not present.
    ///
    /// More information:
    ///  - [ECMAScript reference][spec]
    ///  - [MDN documentation][mdn]
    ///
    /// [spec]: https://tc39.es/ecma262/#sec-array.prototype.indexof
    /// [mdn]:
    /// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/indexOf
    static Value indexOf(const std::vector<Value>& args);

    /// The `includes()` method determines whether an array includes a certain value among its
    /// entries.
    ///
    /// More information:
    ///  - [ECMAScript reference][spec]
    ///  - [MDN documentation][mdn]
    ///
    /// [spec]: https://tc39.es/ecma262/#sec-array.prototype.includes
    /// [mdn]:
    /// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/includes
    static Value includes(const std::vector<Value>& args);

    /// The `slice()` method returns a shallow copy of a portion of an array into a new array
    /// object.
    ///
    /// More information:
    ///  - [ECMAScript reference][spec]
    ///  - [MDN documentation][mdn]
    ///
    /// [spec]: https://tc39.es/ecma262/#sec-array.prototype.slice
    /// [mdn]:
    /// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/slice
    static Value slice(const std::vector<Value>& args);

    /// The `concat()` method is used to merge two or more arrays.
    ///
    /// More information:
    ///  - [ECMAScript reference][spec]
    ///  - [MDN documentation][mdn]
    ///
    /// [spec]: https://tc39.es/ecma262/#sec-array.prototype.concat
    /// [mdn]:
    /// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/concat
    static Value concat(const std::vector<Value>& args);

    // Helper methods
    /// Helper to get the array object from the 'this' binding in prototype methods
    static std::shared_ptr<JSObject> getThisArrayObject(const std::vector<Value>& args);

    /// Helper to get the length of an array-like object
    static size_t getArrayLength(std::shared_ptr<JSObject> obj);

    /// Helper to set the length of an array-like object
    static void setArrayLength(std::shared_ptr<JSObject> obj, size_t length);
};

}  // namespace rift::builtins