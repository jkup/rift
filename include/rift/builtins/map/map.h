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

/// 24.1 Map Objects
/// @spec https://tc39.es/ecma262/#sec-map-objects
///
/// Map objects are collections of key-value pairs where both keys and values
/// can be any ECMAScript language value. Key equality is based on SameValueZero.
///
/// Internal slots (stored as properties):
/// - [[MapEntries]]: JSObject with indexed properties storing entry objects {key, value}
/// - [[MapKeys]]: JSObject with value-derived keys for O(1) lookup
/// - [[MapSize]]: Count of non-deleted entries
/// - [[MapNextIndex]]: Next index for insertion (maintains insertion order)
class Map : public BuiltinBase<Map> {
  public:
    /// 24.1.1.1 Map ( [ iterable ] )
    /// @spec https://tc39.es/ecma262/#sec-map-iterable
    static Value constructor(const CallContext& ctx, const std::vector<Value>& args);

    /// 24.1.2 Properties of the Map Constructor
    /// @spec https://tc39.es/ecma262/#sec-properties-of-the-map-constructor
    static void setupStaticMethods(JSObject* constructor, rift::memory::ObjectFactory* factory);

    /// 24.1.3 Properties of the Map Prototype Object
    /// @spec https://tc39.es/ecma262/#sec-properties-of-the-map-prototype-object
    static void setupPrototypeMethods(JSObject* prototype, rift::memory::ObjectFactory* factory);

    /// 24.1.3.6 Map.prototype.get ( key )
    /// @spec https://tc39.es/ecma262/#sec-map.prototype.get
    static Value get(const CallContext& ctx, const std::vector<Value>& args);

    /// 24.1.3.9 Map.prototype.set ( key, value )
    /// @spec https://tc39.es/ecma262/#sec-map.prototype.set
    static Value set(const CallContext& ctx, const std::vector<Value>& args);

    /// 24.1.3.7 Map.prototype.has ( key )
    /// @spec https://tc39.es/ecma262/#sec-map.prototype.has
    static Value has(const CallContext& ctx, const std::vector<Value>& args);

    /// 24.1.3.3 Map.prototype.delete ( key )
    /// @spec https://tc39.es/ecma262/#sec-map.prototype.delete
    static Value deleteMethod(const CallContext& ctx, const std::vector<Value>& args);

    /// 24.1.3.1 Map.prototype.clear ( )
    /// @spec https://tc39.es/ecma262/#sec-map.prototype.clear
    static Value clear(const CallContext& ctx, const std::vector<Value>& args);

    /// 24.1.3.5 Map.prototype.forEach ( callbackfn [ , thisArg ] )
    /// @spec https://tc39.es/ecma262/#sec-map.prototype.foreach
    static Value forEach(const CallContext& ctx, const std::vector<Value>& args);

    /// 24.1.3.8 Map.prototype.keys ( )
    /// @spec https://tc39.es/ecma262/#sec-map.prototype.keys
    static Value keys(const CallContext& ctx, const std::vector<Value>& args);

    /// 24.1.3.11 Map.prototype.values ( )
    /// @spec https://tc39.es/ecma262/#sec-map.prototype.values
    static Value values(const CallContext& ctx, const std::vector<Value>& args);

    /// 24.1.3.4 Map.prototype.entries ( )
    /// @spec https://tc39.es/ecma262/#sec-map.prototype.entries
    static Value entries(const CallContext& ctx, const std::vector<Value>& args);

    /// 24.1.3.10 get Map.prototype.size
    /// @spec https://tc39.es/ecma262/#sec-get-map.prototype.size
    static Value sizeGetter(const CallContext& ctx, const std::vector<Value>& args);

    /// NON-STANDARD: Global prototype access for internal use.
    static JSObject* getGlobalPrototype();

    /// 7.2.12 SameValueZero ( x, y )
    /// @spec https://tc39.es/ecma262/#sec-samevaluezero
    static bool sameValueZero(const Value& a, const Value& b);

    /// NON-STANDARD: Convert value to unique string key for internal lookup.
    static std::string valueToMapKey(const Value& v);

    /// NON-STANDARD: Create initialized Map object with internal slots.
    static JSObject* createMapObject(rift::memory::ObjectFactory* factory);

    /// NON-STANDARD: Expose factory for MapIterator.
    static rift::memory::ObjectFactory* getFactory() {
        return BuiltinBase<Map>::getObjectFactory();
    }
};

}  // namespace rift::builtins
