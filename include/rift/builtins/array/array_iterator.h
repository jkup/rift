#pragma once

#include <vector>

#include "../../core/engine/call_context.h"
#include "../../memory/object_factory.h"
#include "../../runtime/values/object.h"
#include "../../runtime/values/value.h"

namespace rift::builtins {

using namespace rift::runtime;
using rift::core::CallContext;

/**
 * Iteration kind for Array iterators.
 * Determines what values are returned by next().
 */
enum class ArrayIterationKind {
    Key,      // keys() - iterate indices
    Value,    // values() / [Symbol.iterator] - iterate values
    KeyValue  // entries() - iterate [index, value] pairs
};

/**
 * ArrayIterator
 *
 * Implements %ArrayIteratorPrototype% from ECMAScript spec (section 23.1.5.1).
 * Array iterators are used by for-of loops, spread operators, and explicit
 * calls to keys(), values(), and entries().
 *
 * Internal slots:
 * - [[IteratedArrayLike]] - the array being iterated
 * - [[ArrayLikeNextIndex]] - the current index
 * - [[ArrayLikeIterationKind]] - Key, Value, or KeyValue
 */
class ArrayIterator {
  public:
    /**
     * Create an ArrayIterator for the given array with specified kind.
     * @param factory Object factory for GC-managed creation
     * @param array The array to iterate over
     * @param kind What values to yield (Key, Value, or KeyValue)
     * @return A new ArrayIterator object
     */
    static JSObject* create(rift::memory::ObjectFactory* factory, JSObject* array,
                            ArrayIterationKind kind);

    /**
     * The next() method implementation.
     * Returns {done: boolean, value: any}.
     */
    static Value next(const CallContext& ctx, const std::vector<Value>& args);

    /**
     * Set up the %ArrayIteratorPrototype% object.
     * Should be called once during builtin initialization.
     * @param factory Object factory for GC-managed creation
     * @param iterator_prototype The %IteratorPrototype% to inherit from
     */
    static void setupPrototype(rift::memory::ObjectFactory* factory, JSObject* iterator_prototype);

    /**
     * Get the %ArrayIteratorPrototype% object.
     */
    static JSObject* getPrototype();

  private:
    static JSObject* prototype_;
};

}  // namespace rift::builtins
