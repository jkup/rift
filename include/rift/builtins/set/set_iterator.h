#pragma once

#include <vector>

#include "../../memory/object_factory.h"
#include "rift/interpreter/call_context.h"
#include "rift/types/object.h"
#include "rift/types/value.h"

namespace rift::builtins {

using namespace rift::runtime;
using rift::core::CallContext;

/// Iteration kind for Set iterators.
/// Determines what values are returned by next().
enum class SetIterationKind {
    Value,    // values() / keys() / [Symbol.iterator] - iterate values
    KeyValue  // entries() - iterate [value, value] pairs
};

/// 24.2.5 Set Iterator Objects
/// @spec https://tc39.es/ecma262/#sec-set-iterator-objects
///
/// Set iterators are used by for-of loops, spread operators, and explicit
/// calls to keys(), values(), and entries().
///
/// Internal slots:
/// - [[IteratedSet]] - the Set being iterated (undefined when exhausted)
/// - [[SetNextIndex]] - the current index in [[SetEntries]]
/// - [[SetIterationKind]] - Value or KeyValue
class SetIterator {
  public:
    /// 24.2.5.1 CreateSetIterator ( set, kind )
    /// @spec https://tc39.es/ecma262/#sec-createsetiterator
    static JSObject* create(rift::memory::ObjectFactory* factory, JSObject* set,
                            SetIterationKind kind);

    /// 24.2.5.2 The %SetIteratorPrototype% Object - next ( )
    /// @spec https://tc39.es/ecma262/#sec-%setiteratorprototype%.next
    static Value next(const CallContext& ctx, const std::vector<Value>& args);

    /// 24.2.5.2 The %SetIteratorPrototype% Object
    /// @spec https://tc39.es/ecma262/#sec-%setiteratorprototype%-object
    static void setupPrototype(rift::memory::ObjectFactory* factory, JSObject* iterator_prototype);

    /// NON-STANDARD: Get the %SetIteratorPrototype% object.
    static JSObject* getPrototype();

    /// NON-STANDARD: Set the object factory for iterator creation.
    static void setObjectFactory(rift::memory::ObjectFactory* factory);

  private:
    static JSObject* prototype_;
    static rift::memory::ObjectFactory* factory_;
};

}  // namespace rift::builtins
