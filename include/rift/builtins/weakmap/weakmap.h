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
 * WeakMap builtin implementation following ECMAScript specification.
 *
 * WeakMap objects are collections of key-value pairs where keys must be objects.
 * Keys are held "weakly" - they do not prevent garbage collection.
 *
 * Key differences from Map:
 * - Only objects can be keys (primitives throw TypeError)
 * - No iteration methods (keys, values, entries, forEach, Symbol.iterator)
 * - No size property
 * - Keys are held weakly - if no other references exist, they can be GC'd
 *
 * Internal storage uses weak properties to avoid preventing GC of keys.
 */
class WeakMap : public BuiltinBase<WeakMap> {
  public:
    // Required by BuiltinBase
    static Value constructor(const CallContext& ctx, const std::vector<Value>& args);
    static void setupStaticMethods(JSObject* constructor, rift::memory::ObjectFactory* factory);
    static void setupPrototypeMethods(JSObject* prototype, rift::memory::ObjectFactory* factory);

    // Instance methods (no iteration methods - WeakMap is not iterable)
    static Value get(const CallContext& ctx, const std::vector<Value>& args);
    static Value set(const CallContext& ctx, const std::vector<Value>& args);
    static Value has(const CallContext& ctx, const std::vector<Value>& args);
    static Value deleteMethod(const CallContext& ctx, const std::vector<Value>& args);

    // Global prototype access
    static JSObject* getGlobalPrototype();

    // Helper: Convert object key to unique string for internal lookup
    static std::string objectToWeakKey(JSObject* obj);

    // Helper: Check if a key is valid (must be an object)
    static bool isValidWeakKey(const Value& key);

    // Helper: Create initialized WeakMap object
    static JSObject* createWeakMapObject(rift::memory::ObjectFactory* factory);

    // Expose factory
    static rift::memory::ObjectFactory* getFactory() {
        return BuiltinBase<WeakMap>::getObjectFactory();
    }
};

}  // namespace rift::builtins
