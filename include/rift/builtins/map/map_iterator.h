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
 * Iteration kind for Map iterators.
 * Determines what values are returned by next().
 */
enum class MapIterationKind {
    Key,      // keys() - iterate keys only
    Value,    // values() - iterate values only
    KeyValue  // entries() / [Symbol.iterator] - iterate [key, value] pairs
};

/**
 * MapIterator
 *
 * Implements %MapIteratorPrototype% from ECMAScript spec.
 * Map iterators are used by for-of loops, spread operators, and explicit
 * calls to keys(), values(), and entries().
 *
 * Internal slots:
 * - [[IteratedMap]] - the Map being iterated (undefined when exhausted)
 * - [[MapNextIndex]] - the current index in [[MapEntries]]
 * - [[MapIterationKind]] - Key, Value, or KeyValue
 */
class MapIterator {
  public:
    /**
     * Create a MapIterator for the given Map with specified kind.
     * @param factory Object factory for GC-managed creation
     * @param map The Map object to iterate over
     * @param kind What values to yield (Key, Value, or KeyValue)
     * @return A new MapIterator object
     */
    static JSObject* create(rift::memory::ObjectFactory* factory, JSObject* map,
                            MapIterationKind kind);

    /**
     * The next() method implementation.
     * Returns {done: boolean, value: any}.
     */
    static Value next(const CallContext& ctx, const std::vector<Value>& args);

    /**
     * Set up the %MapIteratorPrototype% object.
     * Should be called once during builtin initialization.
     * @param factory Object factory for GC-managed creation
     * @param iterator_prototype The %IteratorPrototype% to inherit from
     */
    static void setupPrototype(rift::memory::ObjectFactory* factory, JSObject* iterator_prototype);

    /**
     * Get the %MapIteratorPrototype% object.
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
