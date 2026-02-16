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

/// 24.3 WeakMap Objects
/// @spec https://tc39.es/ecma262/#sec-weakmap-objects
///
/// WeakMap objects are collections of key-value pairs where keys must be objects.
/// Keys are held "weakly" - they do not prevent garbage collection.
///
/// Key differences from Map:
/// - Only objects can be keys (primitives throw TypeError)
/// - No iteration methods (keys, values, entries, forEach, Symbol.iterator)
/// - No size property
/// - Keys are held weakly - if no other references exist, they can be GC'd
///
/// Internal storage uses weak properties to avoid preventing GC of keys.
class WeakMap : public BuiltinBase<WeakMap> {
  public:
    /// 24.3.1.1 WeakMap ( [ iterable ] )
    /// @spec https://tc39.es/ecma262/#sec-weakmap-iterable
    static Value constructor(const CallContext& ctx, const std::vector<Value>& args);

    /// 24.3.2 Properties of the WeakMap Constructor
    /// @spec https://tc39.es/ecma262/#sec-properties-of-the-weakmap-constructor
    static void setupStaticMethods(JSObject* constructor, rift::memory::ObjectFactory* factory);

    /// 24.3.3 Properties of the WeakMap Prototype Object
    /// @spec https://tc39.es/ecma262/#sec-properties-of-the-weakmap-prototype-object
    static void setupPrototypeMethods(JSObject* prototype, rift::memory::ObjectFactory* factory);

    /// 24.3.3.3 WeakMap.prototype.get ( key )
    /// @spec https://tc39.es/ecma262/#sec-weakmap.prototype.get
    static Value get(const CallContext& ctx, const std::vector<Value>& args);

    /// 24.3.3.5 WeakMap.prototype.set ( key, value )
    /// @spec https://tc39.es/ecma262/#sec-weakmap.prototype.set
    static Value set(const CallContext& ctx, const std::vector<Value>& args);

    /// 24.3.3.4 WeakMap.prototype.has ( key )
    /// @spec https://tc39.es/ecma262/#sec-weakmap.prototype.has
    static Value has(const CallContext& ctx, const std::vector<Value>& args);

    /// 24.3.3.2 WeakMap.prototype.delete ( key )
    /// @spec https://tc39.es/ecma262/#sec-weakmap.prototype.delete
    static Value deleteMethod(const CallContext& ctx, const std::vector<Value>& args);

    /// NON-STANDARD: Global prototype access for internal use.
    static JSObject* getGlobalPrototype();

    /// NON-STANDARD: Convert object key to unique string for internal lookup.
    static std::string objectToWeakKey(JSObject* obj);

    /// 7.2.7 CanBeHeldWeakly ( v )
    /// @spec https://tc39.es/ecma262/#sec-canbeheldweakly
    static bool isValidWeakKey(const Value& key);

    /// NON-STANDARD: Create initialized WeakMap object with internal slots.
    static JSObject* createWeakMapObject(rift::memory::ObjectFactory* factory);

    /// NON-STANDARD: Expose factory for internal use.
    static rift::memory::ObjectFactory* getFactory() {
        return BuiltinBase<WeakMap>::getObjectFactory();
    }
};

}  // namespace rift::builtins
