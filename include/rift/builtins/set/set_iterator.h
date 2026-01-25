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
 * Iteration kind for Set iterators.
 * Determines what values are returned by next().
 */
enum class SetIterationKind {
    Value,    // values() / keys() / [Symbol.iterator] - iterate values
    KeyValue  // entries() - iterate [value, value] pairs
};

/**
 * SetIterator
 *
 * Implements %SetIteratorPrototype% from ECMAScript spec.
 * Set iterators are used by for-of loops, spread operators, and explicit
 * calls to keys(), values(), and entries().
 *
 * Internal slots:
 * - [[IteratedSet]] - the Set being iterated (undefined when exhausted)
 * - [[SetNextIndex]] - the current index in [[SetEntries]]
 * - [[SetIterationKind]] - Value or KeyValue
 */
class SetIterator {
  public:
    /**
     * Create a SetIterator for the given Set with specified kind.
     * @param factory Object factory for GC-managed creation
     * @param set The Set object to iterate over
     * @param kind What values to yield (Value or KeyValue)
     * @return A new SetIterator object
     */
    static JSObject* create(rift::memory::ObjectFactory* factory, JSObject* set,
                            SetIterationKind kind);

    /**
     * The next() method implementation.
     * Returns {done: boolean, value: any}.
     */
    static Value next(const CallContext& ctx, const std::vector<Value>& args);

    /**
     * Set up the %SetIteratorPrototype% object.
     * Should be called once during builtin initialization.
     * @param factory Object factory for GC-managed creation
     * @param iterator_prototype The %IteratorPrototype% to inherit from
     */
    static void setupPrototype(rift::memory::ObjectFactory* factory, JSObject* iterator_prototype);

    /**
     * Get the %SetIteratorPrototype% object.
     */
    static JSObject* getPrototype();

    /**
     * Set the object factory for iterator creation.
     */
    static void setObjectFactory(rift::memory::ObjectFactory* factory);

  private:
    static JSObject* prototype_;
    static rift::memory::ObjectFactory* factory_;
};

}  // namespace rift::builtins
