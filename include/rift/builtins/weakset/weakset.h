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
 * WeakSet builtin implementation following ECMAScript specification.
 *
 * WeakSet objects are collections of objects held "weakly" - they do not
 * prevent garbage collection of their members.
 *
 * Key differences from Set:
 * - Only objects can be values (primitives throw TypeError)
 * - No iteration methods (keys, values, entries, forEach, Symbol.iterator)
 * - No size property
 * - Values are held weakly - if no other references exist, they can be GC'd
 *
 * Internal storage uses weak properties to avoid preventing GC of values.
 */
class WeakSet : public BuiltinBase<WeakSet> {
  public:
    // Required by BuiltinBase
    static Value constructor(const CallContext& ctx, const std::vector<Value>& args);
    static void setupStaticMethods(JSObject* constructor, rift::memory::ObjectFactory* factory);
    static void setupPrototypeMethods(JSObject* prototype, rift::memory::ObjectFactory* factory);

    // Instance methods (no iteration methods - WeakSet is not iterable)
    static Value add(const CallContext& ctx, const std::vector<Value>& args);
    static Value has(const CallContext& ctx, const std::vector<Value>& args);
    static Value deleteMethod(const CallContext& ctx, const std::vector<Value>& args);

    // Global prototype access
    static JSObject* getGlobalPrototype();

    // Helper: Convert object to unique string key for internal lookup
    static std::string objectToWeakKey(JSObject* obj);

    // Helper: Check if a value is valid (must be an object)
    static bool isValidWeakValue(const Value& val);

    // Helper: Create initialized WeakSet object
    static JSObject* createWeakSetObject(rift::memory::ObjectFactory* factory);

    // Expose factory
    static rift::memory::ObjectFactory* getFactory() {
        return BuiltinBase<WeakSet>::getObjectFactory();
    }
};

}  // namespace rift::builtins
