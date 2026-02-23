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

/// 24.2 Set Objects
/// @spec https://tc39.es/ecma262/#sec-set-objects
///
/// Implements ECMAScript Set object with full spec compliance including:
/// - SameValueZero equality semantics (NaN === NaN, +0 === -0)
/// - Insertion order preservation for iteration
/// - Iterator support (values, keys, entries, Symbol.iterator)
///
/// Internal slots (stored as properties):
/// - [[SetEntries]] - JSObject with indexed properties for insertion order
/// - [[SetKeys]] - JSObject with value-derived keys for O(1) lookup
/// - [[SetSize]] - Count of non-deleted entries
/// - [[SetNextIndex]] - Next index for insertion
class Set : public BuiltinBase<Set> {
  public:
    static constexpr const char* builtinName = "Set";
    static constexpr int builtinLength = 0;

    /// 24.2.1.1 Set ( [ iterable ] )
    /// @spec https://tc39.es/ecma262/#sec-set-iterable
    static Value constructor(const CallContext& ctx, const std::vector<Value>& args);

    /// 24.2.2 Properties of the Set Constructor
    /// @spec https://tc39.es/ecma262/#sec-properties-of-the-set-constructor
    static void setupStaticMethods(JSObject* constructor, rift::memory::ObjectFactory* factory);

    /// 24.2.3 Properties of the Set Prototype Object
    /// @spec https://tc39.es/ecma262/#sec-properties-of-the-set-prototype-object
    static void setupPrototypeMethods(JSObject* prototype, rift::memory::ObjectFactory* factory);

    /// 24.2.3.1 Set.prototype.add ( value )
    /// @spec https://tc39.es/ecma262/#sec-set.prototype.add
    static Value add(const CallContext& ctx, const std::vector<Value>& args);

    /// 24.2.3.7 Set.prototype.has ( value )
    /// @spec https://tc39.es/ecma262/#sec-set.prototype.has
    static Value has(const CallContext& ctx, const std::vector<Value>& args);

    /// 24.2.3.4 Set.prototype.delete ( value )
    /// @spec https://tc39.es/ecma262/#sec-set.prototype.delete
    static Value deleteMethod(const CallContext& ctx, const std::vector<Value>& args);

    /// 24.2.3.2 Set.prototype.clear ( )
    /// @spec https://tc39.es/ecma262/#sec-set.prototype.clear
    static Value clear(const CallContext& ctx, const std::vector<Value>& args);

    /// 24.2.3.6 Set.prototype.forEach ( callbackfn [ , thisArg ] )
    /// @spec https://tc39.es/ecma262/#sec-set.prototype.foreach
    static Value forEach(const CallContext& ctx, const std::vector<Value>& args);

    /// 24.2.3.10 Set.prototype.values ( )
    /// @spec https://tc39.es/ecma262/#sec-set.prototype.values
    static Value values(const CallContext& ctx, const std::vector<Value>& args);

    /// 24.2.3.8 Set.prototype.keys ( )
    /// @spec https://tc39.es/ecma262/#sec-set.prototype.keys
    static Value keys(const CallContext& ctx, const std::vector<Value>& args);

    /// 24.2.3.5 Set.prototype.entries ( )
    /// @spec https://tc39.es/ecma262/#sec-set.prototype.entries
    static Value entries(const CallContext& ctx, const std::vector<Value>& args);

    /// 24.2.3.9 get Set.prototype.size
    /// @spec https://tc39.es/ecma262/#sec-get-set.prototype.size
    static Value sizeGetter(const CallContext& ctx, const std::vector<Value>& args);

    /// NON-STANDARD: Global prototype access for internal use.
    static JSObject* getGlobalPrototype();

    /// 7.2.12 SameValueZero ( x, y )
    /// @spec https://tc39.es/ecma262/#sec-samevaluezero
    static bool sameValueZero(const Value& a, const Value& b);

    /// NON-STANDARD: Convert value to unique string key for internal lookup.
    static std::string valueToSetKey(const Value& v);

    /// NON-STANDARD: Create initialized Set object with internal slots.
    static JSObject* createSetObject(rift::memory::ObjectFactory* factory, JSObject* prototype);

    /// NON-STANDARD: Expose factory for SetIterator.
    static rift::memory::ObjectFactory* getFactory() {
        return BuiltinBase<Set>::getObjectFactory();
    }
};

}  // namespace rift::builtins
