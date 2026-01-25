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
 * Map builtin implementation following ECMAScript specification.
 *
 * Map objects are collections of key-value pairs where both keys and values
 * can be any ECMAScript language value. Key equality is based on SameValueZero.
 *
 * Internal slots (stored as properties):
 * - [[MapEntries]]: JSObject with indexed properties storing entry objects {key, value}
 * - [[MapKeys]]: JSObject with value-derived keys for O(1) lookup
 * - [[MapSize]]: Count of non-deleted entries
 * - [[MapNextIndex]]: Next index for insertion (maintains insertion order)
 */
class Map : public BuiltinBase<Map> {
  public:
    // Required by BuiltinBase
    static Value constructor(const CallContext& ctx, const std::vector<Value>& args);
    static void setupStaticMethods(JSObject* constructor, rift::memory::ObjectFactory* factory);
    static void setupPrototypeMethods(JSObject* prototype, rift::memory::ObjectFactory* factory);

    // Instance methods
    static Value get(const CallContext& ctx, const std::vector<Value>& args);
    static Value set(const CallContext& ctx, const std::vector<Value>& args);
    static Value has(const CallContext& ctx, const std::vector<Value>& args);
    static Value deleteMethod(const CallContext& ctx, const std::vector<Value>& args);
    static Value clear(const CallContext& ctx, const std::vector<Value>& args);
    static Value forEach(const CallContext& ctx, const std::vector<Value>& args);
    static Value keys(const CallContext& ctx, const std::vector<Value>& args);
    static Value values(const CallContext& ctx, const std::vector<Value>& args);
    static Value entries(const CallContext& ctx, const std::vector<Value>& args);
    static Value sizeGetter(const CallContext& ctx, const std::vector<Value>& args);

    // Global prototype access
    static JSObject* getGlobalPrototype();

    // Helper: SameValueZero comparison per ECMAScript spec
    static bool sameValueZero(const Value& a, const Value& b);

    // Helper: Convert value to unique string key for internal lookup
    static std::string valueToMapKey(const Value& v);

    // Helper: Create initialized Map object
    static JSObject* createMapObject(rift::memory::ObjectFactory* factory);

    // Expose factory for MapIterator
    static rift::memory::ObjectFactory* getFactory() {
        return BuiltinBase<Map>::getObjectFactory();
    }
};

}  // namespace rift::builtins
