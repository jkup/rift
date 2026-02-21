#pragma once

#include <algorithm>
#include <functional>
#include <memory>
#include <vector>

#include "../../memory/object_factory.h"
#include "../builtin_base.h"
#include "rift/interpreter/call_context.h"
#include "rift/types/object.h"
#include "rift/types/value.h"

namespace rift::builtins {

using namespace rift::runtime;
using rift::core::CallContext;

/// 23.1 Array Objects
/// @spec https://tc39.es/ecma262/#sec-array-objects
class Array : public BuiltinBase<Array> {
  public:
    /// Setup methods required by BuiltinBase template
    static void setupStaticMethods(JSObject* constructor, rift::memory::ObjectFactory* factory);
    static void setupPrototypeMethods(JSObject* prototype, rift::memory::ObjectFactory* factory);

    /// 23.1.1.1 Array ( ...values )
    /// @spec https://tc39.es/ecma262/#sec-array-constructor
    static Value constructor(const CallContext& ctx, const std::vector<Value>& args);

    /// NON-STANDARD: Helper to create a new array object with the given elements
    static JSObject* createArrayObject(rift::memory::ObjectFactory* factory,
                                       std::vector<Value> elements);

    /// NON-STANDARD: Helper to get the global Array prototype (for proper prototype chain)
    static JSObject* getGlobalPrototype();

    /// 23.1.3.1 Array.prototype.at ( index )
    /// @spec https://tc39.es/ecma262/#sec-array.prototype.at
    static Value at(const CallContext& ctx, const std::vector<Value>& args);

    /// 23.1.3.21 Array.prototype.push ( ...items )
    /// @spec https://tc39.es/ecma262/#sec-array.prototype.push
    static Value push(const CallContext& ctx, const std::vector<Value>& args);

    /// 23.1.3.20 Array.prototype.pop ( )
    /// @spec https://tc39.es/ecma262/#sec-array.prototype.pop
    static Value pop(const CallContext& ctx, const std::vector<Value>& args);

    /// 23.1.3.24 Array.prototype.shift ( )
    /// @spec https://tc39.es/ecma262/#sec-array.prototype.shift
    static Value shift(const CallContext& ctx, const std::vector<Value>& args);

    /// 23.1.3.33 Array.prototype.unshift ( ...items )
    /// @spec https://tc39.es/ecma262/#sec-array.prototype.unshift
    static Value unshift(const CallContext& ctx, const std::vector<Value>& args);

    /// 23.1.3.16 Array.prototype.join ( separator )
    /// @spec https://tc39.es/ecma262/#sec-array.prototype.join
    static Value join(const CallContext& ctx, const std::vector<Value>& args);

    /// 23.1.3.28 Array.prototype.splice ( start, deleteCount, ...items )
    /// @spec https://tc39.es/ecma262/#sec-array.prototype.splice
    static Value splice(const CallContext& ctx, const std::vector<Value>& args);

    /// 23.1.3.22 Array.prototype.reverse ( )
    /// @spec https://tc39.es/ecma262/#sec-array.prototype.reverse
    static Value reverse(const CallContext& ctx, const std::vector<Value>& args);

    /// 23.1.3.27 Array.prototype.sort ( comparefn )
    /// @spec https://tc39.es/ecma262/#sec-array.prototype.sort
    static Value sort(const CallContext& ctx, const std::vector<Value>& args);

    /// 23.1.3.7 Array.prototype.fill ( value [ , start [ , end ] ] )
    /// @spec https://tc39.es/ecma262/#sec-array.prototype.fill
    static Value fill(const CallContext& ctx, const std::vector<Value>& args);

    /// 23.1.3.4 Array.prototype.copyWithin ( target, start [ , end ] )
    /// @spec https://tc39.es/ecma262/#sec-array.prototype.copywithin
    static Value copyWithin(const CallContext& ctx, const std::vector<Value>& args);

    /// 23.1.3.9 Array.prototype.find ( predicate [ , thisArg ] )
    /// @spec https://tc39.es/ecma262/#sec-array.prototype.find
    static Value find(const CallContext& ctx, const std::vector<Value>& args);

    /// 23.1.3.10 Array.prototype.findIndex ( predicate [ , thisArg ] )
    /// @spec https://tc39.es/ecma262/#sec-array.prototype.findindex
    static Value findIndex(const CallContext& ctx, const std::vector<Value>& args);

    /// 23.1.3.6 Array.prototype.every ( callbackfn [ , thisArg ] )
    /// @spec https://tc39.es/ecma262/#sec-array.prototype.every
    static Value every(const CallContext& ctx, const std::vector<Value>& args);

    /// 23.1.3.29 Array.prototype.some ( callbackfn [ , thisArg ] )
    /// @spec https://tc39.es/ecma262/#sec-array.prototype.some
    static Value some(const CallContext& ctx, const std::vector<Value>& args);

    /// 23.1.3.17 Array.prototype.lastIndexOf ( searchElement [ , fromIndex ] )
    /// @spec https://tc39.es/ecma262/#sec-array.prototype.lastindexof
    static Value lastIndexOf(const CallContext& ctx, const std::vector<Value>& args);

    /// 23.1.3.25 Array.prototype.reduceRight ( callbackfn [ , initialValue ] )
    /// @spec https://tc39.es/ecma262/#sec-array.prototype.reduceright
    static Value reduceRight(const CallContext& ctx, const std::vector<Value>& args);

    /// 23.1.3.14 Array.prototype.flatMap ( mapperFunction [ , thisArg ] )
    /// @spec https://tc39.es/ecma262/#sec-array.prototype.flatmap
    static Value flatMap(const CallContext& ctx, const std::vector<Value>& args);

    /// 23.1.3.13 Array.prototype.flat ( [ depth ] )
    /// @spec https://tc39.es/ecma262/#sec-array.prototype.flat
    static Value flat(const CallContext& ctx, const std::vector<Value>& args);

    /// 23.1.3.11 Array.prototype.findLast ( predicate [ , thisArg ] )
    /// @spec https://tc39.es/ecma262/#sec-array.prototype.findlast
    static Value findLast(const CallContext& ctx, const std::vector<Value>& args);

    /// 23.1.3.12 Array.prototype.findLastIndex ( predicate [ , thisArg ] )
    /// @spec https://tc39.es/ecma262/#sec-array.prototype.findlastindex
    static Value findLastIndex(const CallContext& ctx, const std::vector<Value>& args);

    /// 23.1.3.32 Array.prototype.toReversed ( )
    /// @spec https://tc39.es/ecma262/#sec-array.prototype.toreversed
    static Value toReversed(const CallContext& ctx, const std::vector<Value>& args);

    /// 23.1.3.33 Array.prototype.toSorted ( comparefn )
    /// @spec https://tc39.es/ecma262/#sec-array.prototype.tosorted
    static Value toSorted(const CallContext& ctx, const std::vector<Value>& args);

    /// 23.1.3.34 Array.prototype.toSpliced ( start, skipCount, ...items )
    /// @spec https://tc39.es/ecma262/#sec-array.prototype.tospliced
    static Value toSpliced(const CallContext& ctx, const std::vector<Value>& args);

    /// 23.1.3.37 Array.prototype.with ( index, value )
    /// @spec https://tc39.es/ecma262/#sec-array.prototype.with
    static Value with(const CallContext& ctx, const std::vector<Value>& args);

    /// NON-STANDARD: Internal helper for the "length" data property (23.1.4.1)
    /// @spec https://tc39.es/ecma262/#sec-properties-of-array-instances-length
    static Value getLength(const CallContext& ctx, const std::vector<Value>& args);

    /// 23.1.3.15 Array.prototype.forEach ( callbackfn [ , thisArg ] )
    /// @spec https://tc39.es/ecma262/#sec-array.prototype.foreach
    static Value forEach(const CallContext& ctx, const std::vector<Value>& args);

    /// 23.1.3.21 Array.prototype.map ( callbackfn [ , thisArg ] )
    /// @spec https://tc39.es/ecma262/#sec-array.prototype.map
    static Value map(const CallContext& ctx, const std::vector<Value>& args);

    /// 23.1.3.8 Array.prototype.filter ( callbackfn [ , thisArg ] )
    /// @spec https://tc39.es/ecma262/#sec-array.prototype.filter
    static Value filter(const CallContext& ctx, const std::vector<Value>& args);

    /// 23.1.3.24 Array.prototype.reduce ( callbackfn [ , initialValue ] )
    /// @spec https://tc39.es/ecma262/#sec-array.prototype.reduce
    static Value reduce(const CallContext& ctx, const std::vector<Value>& args);

    /// 23.1.3.14 Array.prototype.indexOf ( searchElement [ , fromIndex ] )
    /// @spec https://tc39.es/ecma262/#sec-array.prototype.indexof
    static Value indexOf(const CallContext& ctx, const std::vector<Value>& args);

    /// 23.1.3.15 Array.prototype.includes ( searchElement [ , fromIndex ] )
    /// @spec https://tc39.es/ecma262/#sec-array.prototype.includes
    static Value includes(const CallContext& ctx, const std::vector<Value>& args);

    /// 23.1.3.25 Array.prototype.slice ( start, end )
    /// @spec https://tc39.es/ecma262/#sec-array.prototype.slice
    static Value slice(const CallContext& ctx, const std::vector<Value>& args);

    /// 23.1.3.1 Array.prototype.concat ( ...items )
    /// @spec https://tc39.es/ecma262/#sec-array.prototype.concat
    static Value concat(const CallContext& ctx, const std::vector<Value>& args);

    /// 23.1.3.30 Array.prototype.toString ( )
    /// @spec https://tc39.es/ecma262/#sec-array.prototype.tostring
    static Value toString(const CallContext& ctx, const std::vector<Value>& args);

    /// 23.1.3.16 Array.prototype.keys ( )
    /// @spec https://tc39.es/ecma262/#sec-array.prototype.keys
    static Value keys(const CallContext& ctx, const std::vector<Value>& args);

    /// 23.1.3.32 Array.prototype.values ( )
    /// @spec https://tc39.es/ecma262/#sec-array.prototype.values
    static Value values(const CallContext& ctx, const std::vector<Value>& args);

    /// 23.1.3.5 Array.prototype.entries ( )
    /// @spec https://tc39.es/ecma262/#sec-array.prototype.entries
    static Value entries(const CallContext& ctx, const std::vector<Value>& args);

    // Helper methods

    /// NON-STANDARD: Helper to get the length of an array-like object
    static size_t getArrayLength(JSObject* obj);

    /// NON-STANDARD: Get the raw numeric length for validation purposes
    static double getRawLength(JSObject* obj);

    /// NON-STANDARD: Helper to set the length of an array-like object
    static void setArrayLength(JSObject* obj, size_t length);

    // Array static methods

    /// 23.1.2.2 Array.isArray ( arg )
    /// @spec https://tc39.es/ecma262/#sec-array.isarray
    static Value isArray(const CallContext& ctx, const std::vector<Value>& args);

    /// 23.1.2.1 Array.from ( items [ , mapfn [ , thisArg ] ] )
    /// @spec https://tc39.es/ecma262/#sec-array.from
    static Value from(const CallContext& ctx, const std::vector<Value>& args);

    /// 23.1.2.5 Array.of ( ...items )
    /// @spec https://tc39.es/ecma262/#sec-array.of
    static Value of(const CallContext& ctx, const std::vector<Value>& args);

    /// Get the object factory (needed by ArrayIterator)
    static rift::memory::ObjectFactory* getObjectFactory() {
        return BuiltinBase<Array>::getObjectFactory();
    }

  private:
    // Static factory storage is now handled by BuiltinBase template
};

}  // namespace rift::builtins
