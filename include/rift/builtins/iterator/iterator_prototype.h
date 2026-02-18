#pragma once

#include <vector>

#include "../../memory/object_factory.h"
#include "rift/interpreter/call_context.h"
#include "rift/types/object.h"
#include "rift/types/value.h"

namespace rift::builtins {

using namespace rift::runtime;
using rift::core::CallContext;

/// 27.1.2 The %IteratorPrototype% Object
/// @spec https://tc39.es/ecma262/#sec-%iteratorprototype%-object
class IteratorPrototype {
  public:
    /// NON-STANDARD: Creates the %IteratorPrototype% intrinsic and installs @@iterator.
    static JSObject* create(rift::memory::ObjectFactory* factory);

    /// 27.1.2.1 %IteratorPrototype% [ @@iterator ] ( )
    /// @spec https://tc39.es/ecma262/#sec-%iteratorprototype%-@@iterator
    static Value symbolIterator(const CallContext& ctx, const std::vector<Value>& args);
};

}  // namespace rift::builtins
