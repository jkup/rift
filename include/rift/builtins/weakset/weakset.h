#pragma once

#include <string>
#include <vector>

#include "../../memory/object_factory.h"
#include "../builtin_base.h"
#include "rift/interpreter/call_context.h"
#include "rift/types/object.h"
#include "rift/types/value.h"

namespace rift::builtins {

using namespace rift::runtime;
using rift::core::CallContext;

/// 24.4 WeakSet Objects
/// @spec https://tc39.es/ecma262/#sec-weakset-objects
///
/// WeakSet objects are collections of objects held "weakly" - they do not
/// prevent garbage collection of their members.
///
/// Key differences from Set:
/// - Only objects can be values (primitives throw TypeError)
/// - No iteration methods (keys, values, entries, forEach, Symbol.iterator)
/// - No size property
/// - Values are held weakly - if no other references exist, they can be GC'd
///
/// Internal storage uses weak properties to avoid preventing GC of values.
class WeakSet : public BuiltinBase<WeakSet> {
  public:
    /// 24.4.1.1 WeakSet ( [ iterable ] )
    /// @spec https://tc39.es/ecma262/#sec-weakset-iterable
    static Value constructor(const CallContext& ctx, const std::vector<Value>& args);

    /// 24.4.2 Properties of the WeakSet Constructor
    /// @spec https://tc39.es/ecma262/#sec-properties-of-the-weakset-constructor
    static void setupStaticMethods(JSObject* constructor, rift::memory::ObjectFactory* factory);

    /// 24.4.3 Properties of the WeakSet Prototype Object
    /// @spec https://tc39.es/ecma262/#sec-properties-of-the-weakset-prototype-object
    static void setupPrototypeMethods(JSObject* prototype, rift::memory::ObjectFactory* factory);

    /// 24.4.3.1 WeakSet.prototype.add ( value )
    /// @spec https://tc39.es/ecma262/#sec-weakset.prototype.add
    static Value add(const CallContext& ctx, const std::vector<Value>& args);

    /// 24.4.3.4 WeakSet.prototype.has ( value )
    /// @spec https://tc39.es/ecma262/#sec-weakset.prototype.has
    static Value has(const CallContext& ctx, const std::vector<Value>& args);

    /// 24.4.3.3 WeakSet.prototype.delete ( value )
    /// @spec https://tc39.es/ecma262/#sec-weakset.prototype.delete
    static Value deleteMethod(const CallContext& ctx, const std::vector<Value>& args);

    /// NON-STANDARD: Global prototype access for internal use.
    static JSObject* getGlobalPrototype();

    /// NON-STANDARD: Convert object to unique string key for internal lookup.
    static std::string objectToWeakKey(JSObject* obj);

    /// 7.2.7 CanBeHeldWeakly ( v )
    /// @spec https://tc39.es/ecma262/#sec-canbeheldweakly
    static bool isValidWeakValue(const Value& val);

    /// NON-STANDARD: Create initialized WeakSet object with internal slots.
    static JSObject* createWeakSetObject(rift::memory::ObjectFactory* factory);

    /// NON-STANDARD: Expose factory for internal use.
    static rift::memory::ObjectFactory* getFactory() {
        return BuiltinBase<WeakSet>::getObjectFactory();
    }
};

}  // namespace rift::builtins
