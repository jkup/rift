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
 * %IteratorPrototype%
 *
 * The hidden prototype that all iterators inherit from.
 * According to ECMAScript spec (section 27.1.2), this provides:
 * - [Symbol.iterator]() { return this; }
 *
 * This makes all iterators themselves iterable.
 */
class IteratorPrototype {
  public:
    /**
     * Create the %IteratorPrototype% object.
     * This should be called once during builtin initialization.
     */
    static JSObject* create(rift::memory::ObjectFactory* factory);

    /**
     * [Symbol.iterator]() implementation - returns this.
     * Makes iterators iterable.
     */
    static Value symbolIterator(const CallContext& ctx, const std::vector<Value>& args);
};

}  // namespace rift::builtins
