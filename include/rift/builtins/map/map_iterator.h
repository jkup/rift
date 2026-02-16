#pragma once

#include <vector>

#include "../../core/engine/call_context.h"
#include "../../memory/object_factory.h"
#include "../../runtime/values/object.h"
#include "../../runtime/values/value.h"

namespace rift::builtins {

using namespace rift::runtime;
using rift::core::CallContext;

/// Iteration kind for Map iterators.
/// Determines what values are returned by next().
enum class MapIterationKind {
    Key,      // keys() - iterate keys only
    Value,    // values() - iterate values only
    KeyValue  // entries() / [Symbol.iterator] - iterate [key, value] pairs
};

/// 24.1.5 Map Iterator Objects
/// @spec https://tc39.es/ecma262/#sec-map-iterator-objects
///
/// Map iterators are used by for-of loops, spread operators, and explicit
/// calls to keys(), values(), and entries().
///
/// Internal slots:
/// - [[IteratedMap]] - the Map being iterated (undefined when exhausted)
/// - [[MapNextIndex]] - the current index in [[MapEntries]]
/// - [[MapIterationKind]] - Key, Value, or KeyValue
class MapIterator {
  public:
    /// 24.1.5.1 CreateMapIterator ( map, kind )
    /// @spec https://tc39.es/ecma262/#sec-createmapiterator
    static JSObject* create(rift::memory::ObjectFactory* factory, JSObject* map,
                            MapIterationKind kind);

    /// 24.1.5.2 The %MapIteratorPrototype% Object - next ( )
    /// @spec https://tc39.es/ecma262/#sec-%mapiteratorprototype%.next
    static Value next(const CallContext& ctx, const std::vector<Value>& args);

    /// 24.1.5.2 The %MapIteratorPrototype% Object
    /// @spec https://tc39.es/ecma262/#sec-%mapiteratorprototype%-object
    static void setupPrototype(rift::memory::ObjectFactory* factory, JSObject* iterator_prototype);

    /// NON-STANDARD: Get the %MapIteratorPrototype% object.
    static JSObject* getPrototype();

    /// NON-STANDARD: Set the object factory for iterator creation.
    static void setObjectFactory(rift::memory::ObjectFactory* factory);

  private:
    static JSObject* prototype_;
    static rift::memory::ObjectFactory* factory_;
};

}  // namespace rift::builtins
