#pragma once

#include <algorithm>
#include <functional>
#include <memory>
#include <vector>

#include "../../core/engine/call_context.h"
#include "../../memory/object_factory.h"
#include "../../runtime/values/object.h"
#include "../../runtime/values/value.h"
#include "../builtin_base.h"

namespace rift::builtins {

using namespace rift::runtime;
using rift::core::CallContext;

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
class Array : public BuiltinBase<Array> {
  public:
    /// Setup methods required by BuiltinBase template
    static void setupStaticMethods(JSObject* constructor, rift::memory::ObjectFactory* factory);
    static void setupPrototypeMethods(JSObject* prototype, rift::memory::ObjectFactory* factory);

    /// The `Array()` constructor creates Array objects.
    ///
    /// More information:
    ///  - [ECMAScript reference][spec]
    ///  - [MDN documentation][mdn]
    ///
    /// [spec]: https://tc39.es/ecma262/#sec-array-constructor
    /// [mdn]:
    /// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/Array
    static Value constructor(const CallContext& ctx, const std::vector<Value>& args);

    /// Helper to create a new array object with the given elements
    static JSObject* createArrayObject(rift::memory::ObjectFactory* factory,
                                       std::vector<Value> elements);

    /// Helper to get the global Array prototype (for proper prototype chain)
    static JSObject* getGlobalPrototype();

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
    static Value push(const CallContext& ctx, const std::vector<Value>& args);

    /// The `pop()` method removes the last element from an array and returns that element.
    ///
    /// More information:
    ///  - [ECMAScript reference][spec]
    ///  - [MDN documentation][mdn]
    ///
    /// [spec]: https://tc39.es/ecma262/#sec-array.prototype.pop
    /// [mdn]:
    /// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/pop
    static Value pop(const CallContext& ctx, const std::vector<Value>& args);

    /// The `shift()` method removes the first element from an array and returns that element.
    ///
    /// More information:
    ///  - [ECMAScript reference][spec]
    ///  - [MDN documentation][mdn]
    ///
    /// [spec]: https://tc39.es/ecma262/#sec-array.prototype.shift
    /// [mdn]:
    /// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/shift
    static Value shift(const CallContext& ctx, const std::vector<Value>& args);

    /// The `unshift()` method adds one or more elements to the beginning of an array and returns
    /// the new length.
    ///
    /// More information:
    ///  - [ECMAScript reference][spec]
    ///  - [MDN documentation][mdn]
    ///
    /// [spec]: https://tc39.es/ecma262/#sec-array.prototype.unshift
    /// [mdn]:
    /// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/unshift
    static Value unshift(const CallContext& ctx, const std::vector<Value>& args);

    /// The `join()` method creates and returns a new string by concatenating all elements in an
    /// array.
    ///
    /// More information:
    ///  - [ECMAScript reference][spec]
    ///  - [MDN documentation][mdn]
    ///
    /// [spec]: https://tc39.es/ecma262/#sec-array.prototype.join
    /// [mdn]:
    /// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/join
    static Value join(const CallContext& ctx, const std::vector<Value>& args);

    /// The `splice()` method changes the contents of an array by removing or replacing existing
    /// elements and/or adding new elements in place.
    ///
    /// More information:
    ///  - [ECMAScript reference][spec]
    ///  - [MDN documentation][mdn]
    ///
    /// [spec]: https://tc39.es/ecma262/#sec-array.prototype.splice
    /// [mdn]:
    /// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/splice
    static Value splice(const CallContext& ctx, const std::vector<Value>& args);

    /// The `reverse()` method reverses an array in place and returns the reference to the same
    /// array.
    ///
    /// More information:
    ///  - [ECMAScript reference][spec]
    ///  - [MDN documentation][mdn]
    ///
    /// [spec]: https://tc39.es/ecma262/#sec-array.prototype.reverse
    /// [mdn]:
    /// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/reverse
    static Value reverse(const CallContext& ctx, const std::vector<Value>& args);

    /// The `sort()` method sorts the elements of an array in place and returns the reference to the
    /// same array.
    ///
    /// More information:
    ///  - [ECMAScript reference][spec]
    ///  - [MDN documentation][mdn]
    ///
    /// [spec]: https://tc39.es/ecma262/#sec-array.prototype.sort
    /// [mdn]:
    /// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort
    static Value sort(const CallContext& ctx, const std::vector<Value>& args);

    /// The `find()` method returns the first element in the array that satisfies the provided
    /// testing function.
    ///
    /// More information:
    ///  - [ECMAScript reference][spec]
    ///  - [MDN documentation][mdn]
    ///
    /// [spec]: https://tc39.es/ecma262/#sec-array.prototype.find
    /// [mdn]:
    /// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/find
    static Value find(const CallContext& ctx, const std::vector<Value>& args);

    /// The `findIndex()` method returns the index of the first element in the array that satisfies
    /// the provided testing function.
    ///
    /// More information:
    ///  - [ECMAScript reference][spec]
    ///  - [MDN documentation][mdn]
    ///
    /// [spec]: https://tc39.es/ecma262/#sec-array.prototype.findindex
    /// [mdn]:
    /// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/findIndex
    static Value findIndex(const CallContext& ctx, const std::vector<Value>& args);

    /// The `every()` method tests whether all elements in the array pass the test implemented by
    /// the provided function.
    ///
    /// More information:
    ///  - [ECMAScript reference][spec]
    ///  - [MDN documentation][mdn]
    ///
    /// [spec]: https://tc39.es/ecma262/#sec-array.prototype.every
    /// [mdn]:
    /// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/every
    static Value every(const CallContext& ctx, const std::vector<Value>& args);

    /// The `some()` method tests whether at least one element in the array passes the test
    /// implemented by the provided function.
    ///
    /// More information:
    ///  - [ECMAScript reference][spec]
    ///  - [MDN documentation][mdn]
    ///
    /// [spec]: https://tc39.es/ecma262/#sec-array.prototype.some
    /// [mdn]:
    /// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/some
    static Value some(const CallContext& ctx, const std::vector<Value>& args);

    /// The `lastIndexOf()` method returns the last index at which a given element can be found in
    /// the array.
    ///
    /// More information:
    ///  - [ECMAScript reference][spec]
    ///  - [MDN documentation][mdn]
    ///
    /// [spec]: https://tc39.es/ecma262/#sec-array.prototype.lastindexof
    /// [mdn]:
    /// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/lastIndexOf
    static Value lastIndexOf(const CallContext& ctx, const std::vector<Value>& args);

    /// The `reduceRight()` method applies a function against an accumulator and each value of the
    /// array (from right-to-left) to reduce it to a single value.
    ///
    /// More information:
    ///  - [ECMAScript reference][spec]
    ///  - [MDN documentation][mdn]
    ///
    /// [spec]: https://tc39.es/ecma262/#sec-array.prototype.reduceright
    /// [mdn]:
    /// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/reduceRight
    static Value reduceRight(const CallContext& ctx, const std::vector<Value>& args);

    /// The `flatMap()` method returns a new array formed by applying a given callback function to
    /// each element of the array, and then flattening the result by one level.
    ///
    /// More information:
    ///  - [ECMAScript reference][spec]
    ///  - [MDN documentation][mdn]
    ///
    /// [spec]: https://tc39.es/ecma262/#sec-array.prototype.flatmap
    /// [mdn]:
    /// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/flatMap
    static Value flatMap(const CallContext& ctx, const std::vector<Value>& args);

    /// The `flat()` method creates a new array with all sub-array elements concatenated into it
    /// recursively up to the specified depth.
    ///
    /// More information:
    ///  - [ECMAScript reference][spec]
    ///  - [MDN documentation][mdn]
    ///
    /// [spec]: https://tc39.es/ecma262/#sec-array.prototype.flat
    /// [mdn]:
    /// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/flat
    static Value flat(const CallContext& ctx, const std::vector<Value>& args);

    /// The `findLast()` method returns the last element in the array that satisfies the provided
    /// testing function.
    ///
    /// More information:
    ///  - [ECMAScript reference][spec]
    ///  - [MDN documentation][mdn]
    ///
    /// [spec]: https://tc39.es/ecma262/#sec-array.prototype.findlast
    /// [mdn]:
    /// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/findLast
    static Value findLast(const CallContext& ctx, const std::vector<Value>& args);

    /// The `findLastIndex()` method returns the index of the last element in the array that
    /// satisfies the provided testing function.
    ///
    /// More information:
    ///  - [ECMAScript reference][spec]
    ///  - [MDN documentation][mdn]
    ///
    /// [spec]: https://tc39.es/ecma262/#sec-array.prototype.findlastindex
    /// [mdn]:
    /// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/findLastIndex
    static Value findLastIndex(const CallContext& ctx, const std::vector<Value>& args);

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
    static Value getLength(const CallContext& ctx, const std::vector<Value>& args);

    /// The `forEach()` method executes a provided function once for each array element.
    ///
    /// More information:
    ///  - [ECMAScript reference][spec]
    ///  - [MDN documentation][mdn]
    ///
    /// [spec]: https://tc39.es/ecma262/#sec-array.prototype.foreach
    /// [mdn]:
    /// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/forEach
    static Value forEach(const CallContext& ctx, const std::vector<Value>& args);

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
    static Value map(const CallContext& ctx, const std::vector<Value>& args);

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
    static Value filter(const CallContext& ctx, const std::vector<Value>& args);

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
    static Value reduce(const CallContext& ctx, const std::vector<Value>& args);

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
    static Value indexOf(const CallContext& ctx, const std::vector<Value>& args);

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
    static Value includes(const CallContext& ctx, const std::vector<Value>& args);

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
    static Value slice(const CallContext& ctx, const std::vector<Value>& args);

    /// The `concat()` method is used to merge two or more arrays.
    ///
    /// More information:
    ///  - [ECMAScript reference][spec]
    ///  - [MDN documentation][mdn]
    ///
    /// [spec]: https://tc39.es/ecma262/#sec-array.prototype.concat
    /// [mdn]:
    /// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/concat
    static Value concat(const CallContext& ctx, const std::vector<Value>& args);

    /// The `toString()` method returns a string representing the array.
    static Value toString(const CallContext& ctx, const std::vector<Value>& args);

    /// The `keys()` method returns a new Array Iterator object that contains the keys for each
    /// index in the array.
    ///
    /// More information:
    ///  - [ECMAScript reference][spec]
    ///  - [MDN documentation][mdn]
    ///
    /// [spec]: https://tc39.es/ecma262/#sec-array.prototype.keys
    /// [mdn]:
    /// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/keys
    static Value keys(const CallContext& ctx, const std::vector<Value>& args);

    /// The `values()` method returns a new Array Iterator object that contains the values for each
    /// index in the array.
    ///
    /// More information:
    ///  - [ECMAScript reference][spec]
    ///  - [MDN documentation][mdn]
    ///
    /// [spec]: https://tc39.es/ecma262/#sec-array.prototype.values
    /// [mdn]:
    /// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/values
    static Value values(const CallContext& ctx, const std::vector<Value>& args);

    /// The `entries()` method returns a new Array Iterator object that contains the key/value pairs
    /// for each index in the array.
    ///
    /// More information:
    ///  - [ECMAScript reference][spec]
    ///  - [MDN documentation][mdn]
    ///
    /// [spec]: https://tc39.es/ecma262/#sec-array.prototype.entries
    /// [mdn]:
    /// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/entries
    static Value entries(const CallContext& ctx, const std::vector<Value>& args);

    // Helper methods
    /// Helper to get the length of an array-like object
    static size_t getArrayLength(JSObject* obj);

    /// Helper to set the length of an array-like object
    static void setArrayLength(JSObject* obj, size_t length);

    // Array static methods

    /// The `Array.isArray()` static method determines whether the passed value is an Array.
    ///
    /// More information:
    ///  - [ECMAScript reference][spec]
    ///  - [MDN documentation][mdn]
    ///
    /// [spec]: https://tc39.es/ecma262/#sec-array.isarray
    /// [mdn]:
    /// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/isArray
    static Value isArray(const CallContext& ctx, const std::vector<Value>& args);

    /// The `Array.from()` method creates a new, shallow-copied Array instance from an iterable or
    /// array-like object.
    ///
    /// More information:
    ///  - [ECMAScript reference][spec]
    ///  - [MDN documentation][mdn]
    ///
    /// [spec]: https://tc39.es/ecma262/#sec-array.from
    /// [mdn]:
    /// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/from
    static Value from(const CallContext& ctx, const std::vector<Value>& args);

    /// The `Array.of()` method creates a new Array instance from a variable number of arguments.
    ///
    /// More information:
    ///  - [ECMAScript reference][spec]
    ///  - [MDN documentation][mdn]
    ///
    /// [spec]: https://tc39.es/ecma262/#sec-array.of
    /// [mdn]:
    /// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/of
    static Value of(const CallContext& ctx, const std::vector<Value>& args);

    /// Get the object factory (needed by ArrayIterator)
    static rift::memory::ObjectFactory* getObjectFactory() {
        return BuiltinBase<Array>::getObjectFactory();
    }

  private:
    // Static factory storage is now handled by BuiltinBase template
};

}  // namespace rift::builtins
