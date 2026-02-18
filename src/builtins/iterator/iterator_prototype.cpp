#include "rift/builtins/iterator/iterator_prototype.h"

#include "rift/builtins/symbol/symbol.h"
#include "rift/interpreter/evaluation_utils.h"

// ============================================================================
// ECMA-262 -- The %IteratorPrototype% Object (27.1.2)
// @spec https://tc39.es/ecma262/#sec-%iteratorprototype%-object
//
// The %IteratorPrototype% object:
//   - is an ordinary object
//   - has a [[Prototype]] internal slot whose value is %Object.prototype%
//   - All objects defined in the spec that implement the Iterator interface
//     also inherit from %IteratorPrototype%.
//
// This object exists so that all built-in iterators (Array iterators, Map
// iterators, Set iterators, String iterators, etc.) share a common prototype
// chain: iteratorInstance -> %XIteratorPrototype% -> %IteratorPrototype%
// -> %Object.prototype% -> null. The @@iterator method on this object makes
// every iterator itself iterable (usable in for-of, spread, etc.).
// ============================================================================

namespace rift::builtins {

// 27.1.2 The %IteratorPrototype% Object
// @spec https://tc39.es/ecma262/#sec-%iteratorprototype%-object
//
// Creates the %IteratorPrototype% intrinsic object and installs the
// @@iterator method on it.
JSObject* IteratorPrototype::create(rift::memory::ObjectFactory* factory) {
    // Create the prototype object (%IteratorPrototype%)
    auto* prototype = factory->createJSObject();

    // 27.1.2.1 %IteratorPrototype% [ @@iterator ] ( )
    // @spec https://tc39.es/ecma262/#sec-%iteratorprototype%-@@iterator
    // Install the [Symbol.iterator] method that returns this.
    std::string iterator_key =
        rift::core::EvaluationUtils::symbolToPropertyKey(Symbol::getIteratorId());
    auto* iterator_func = factory->createJSFunction(IteratorPrototype::symbolIterator);
    prototype->setProperty(iterator_key, Value(iterator_func));

    return prototype;
}

// 27.1.2.1 %IteratorPrototype% [ @@iterator ] ( )
// @spec https://tc39.es/ecma262/#sec-%iteratorprototype%-@@iterator
//
// Spec algorithm:
//   1. Return the this value.
//
// This method exists to make iterator objects themselves iterable. When an
// iterator is passed to a for-of loop or spread operator, the engine calls
// [Symbol.iterator]() on it, and this method returns the iterator itself.
Value IteratorPrototype::symbolIterator(const CallContext& ctx, const std::vector<Value>& args) {
    // Step 1: Return the this value.
    return ctx.thisValue;
}

}  // namespace rift::builtins
