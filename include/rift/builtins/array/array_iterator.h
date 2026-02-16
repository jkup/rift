#pragma once

#include <vector>

#include "../../core/engine/call_context.h"
#include "../../memory/object_factory.h"
#include "../../runtime/values/object.h"
#include "../../runtime/values/value.h"

namespace rift::builtins {

using namespace rift::runtime;
using rift::core::CallContext;

/// Iteration kind for Array iterators.
/// Determines what values are returned by next().
enum class ArrayIterationKind {
    Key,      // keys() - iterate indices
    Value,    // values() / [Symbol.iterator] - iterate values
    KeyValue  // entries() - iterate [index, value] pairs
};

/// 23.1.5 Array Iterator Objects
/// @spec https://tc39.es/ecma262/#sec-array-iterator-objects
class ArrayIterator {
  public:
    /// 23.1.5.1 CreateArrayIterator ( array, kind )
    /// @spec https://tc39.es/ecma262/#sec-createarrayiterator
    static JSObject* create(rift::memory::ObjectFactory* factory, JSObject* array,
                            ArrayIterationKind kind);

    /// 23.1.5.2.1 %ArrayIteratorPrototype%.next ( )
    /// @spec https://tc39.es/ecma262/#sec-%arrayiteratorprototype%.next
    static Value next(const CallContext& ctx, const std::vector<Value>& args);

    /// Setup the %ArrayIteratorPrototype% object.
    static void setupPrototype(rift::memory::ObjectFactory* factory, JSObject* iterator_prototype);

    /// Get the %ArrayIteratorPrototype% object.
    static JSObject* getPrototype();

  private:
    static JSObject* prototype_;
};

}  // namespace rift::builtins
