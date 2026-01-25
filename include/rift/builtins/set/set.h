#pragma once

#include <string>
#include <vector>

#include "../../core/engine/call_context.h"
#include "../../memory/object_factory.h"
#include "../../runtime/values/object.h"
#include "../../runtime/values/value.h"
#include "../builtin_base.h"

namespace rift::builtins {

using namespace rift::runtime;
using rift::core::CallContext;

/**
 * Set builtin implementation.
 *
 * Implements ECMAScript Set object with full spec compliance including:
 * - SameValueZero equality semantics (NaN === NaN, +0 === -0)
 * - Insertion order preservation for iteration
 * - Iterator support (values, keys, entries, Symbol.iterator)
 *
 * Internal slots (stored as properties):
 * - [[SetEntries]] - JSObject with indexed properties for insertion order
 * - [[SetKeys]] - JSObject with value-derived keys for O(1) lookup
 * - [[SetSize]] - Count of non-deleted entries
 * - [[SetNextIndex]] - Next index for insertion
 */
class Set : public BuiltinBase<Set> {
  public:
    // Required by BuiltinBase
    static Value constructor(const CallContext& ctx, const std::vector<Value>& args);
    static void setupStaticMethods(JSObject* constructor, rift::memory::ObjectFactory* factory);
    static void setupPrototypeMethods(JSObject* prototype, rift::memory::ObjectFactory* factory);

    // Instance methods
    static Value add(const CallContext& ctx, const std::vector<Value>& args);
    static Value has(const CallContext& ctx, const std::vector<Value>& args);
    static Value deleteMethod(const CallContext& ctx, const std::vector<Value>& args);
    static Value clear(const CallContext& ctx, const std::vector<Value>& args);
    static Value forEach(const CallContext& ctx, const std::vector<Value>& args);
    static Value values(const CallContext& ctx, const std::vector<Value>& args);
    static Value keys(const CallContext& ctx, const std::vector<Value>& args);
    static Value entries(const CallContext& ctx, const std::vector<Value>& args);
    static Value sizeGetter(const CallContext& ctx, const std::vector<Value>& args);

    // Global prototype access
    static JSObject* getGlobalPrototype();

    // Helper: SameValueZero comparison per ECMAScript spec
    static bool sameValueZero(const Value& a, const Value& b);

    // Helper: Convert value to unique string key for internal lookup
    static std::string valueToSetKey(const Value& v);

    // Helper: Create initialized Set object
    static JSObject* createSetObject(rift::memory::ObjectFactory* factory, JSObject* prototype);

    // Expose factory for SetIterator
    static rift::memory::ObjectFactory* getFactory() {
        return BuiltinBase<Set>::getObjectFactory();
    }
};

}  // namespace rift::builtins
