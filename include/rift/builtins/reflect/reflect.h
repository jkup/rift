#pragma once

#include <string>
#include <vector>

#include "../../memory/object_factory.h"
#include "rift/interpreter/call_context.h"
#include "rift/types/object.h"
#include "rift/types/value.h"

namespace rift::builtins {

using namespace rift::runtime;
using rift::core::CallContext;

/// 28.1 The Reflect Object
/// @spec https://tc39.es/ecma262/#sec-reflect-object
/// Reflect is an ordinary object (not a constructor), like Math and JSON.
class Reflect {
  public:
    /// Create the Reflect object with all function properties.
    static JSObject* create(rift::memory::ObjectFactory* factory);

    /// 28.1.1 Reflect.apply ( target, thisArgument, argumentsList )
    /// @spec https://tc39.es/ecma262/#sec-reflect.apply
    static Value apply(const CallContext& ctx, const std::vector<Value>& args);

    /// 28.1.2 Reflect.construct ( target, argumentsList [ , newTarget ] )
    /// @spec https://tc39.es/ecma262/#sec-reflect.construct
    static Value construct(const CallContext& ctx, const std::vector<Value>& args);

    /// 28.1.3 Reflect.defineProperty ( target, propertyKey, attributes )
    /// @spec https://tc39.es/ecma262/#sec-reflect.defineproperty
    static Value defineProperty(const CallContext& ctx, const std::vector<Value>& args);

    /// 28.1.4 Reflect.deleteProperty ( target, propertyKey )
    /// @spec https://tc39.es/ecma262/#sec-reflect.deleteproperty
    static Value deleteProperty(const CallContext& ctx, const std::vector<Value>& args);

    /// 28.1.5 Reflect.get ( target, propertyKey [ , receiver ] )
    /// @spec https://tc39.es/ecma262/#sec-reflect.get
    static Value get(const CallContext& ctx, const std::vector<Value>& args);

    /// 28.1.6 Reflect.getOwnPropertyDescriptor ( target, propertyKey )
    /// @spec https://tc39.es/ecma262/#sec-reflect.getownpropertydescriptor
    static Value getOwnPropertyDescriptor(const CallContext& ctx, const std::vector<Value>& args);

    /// 28.1.7 Reflect.getPrototypeOf ( target )
    /// @spec https://tc39.es/ecma262/#sec-reflect.getprototypeof
    static Value getPrototypeOf(const CallContext& ctx, const std::vector<Value>& args);

    /// 28.1.8 Reflect.has ( target, propertyKey )
    /// @spec https://tc39.es/ecma262/#sec-reflect.has
    static Value has(const CallContext& ctx, const std::vector<Value>& args);

    /// 28.1.9 Reflect.isExtensible ( target )
    /// @spec https://tc39.es/ecma262/#sec-reflect.isextensible
    static Value isExtensible(const CallContext& ctx, const std::vector<Value>& args);

    /// 28.1.10 Reflect.ownKeys ( target )
    /// @spec https://tc39.es/ecma262/#sec-reflect.ownkeys
    static Value ownKeys(const CallContext& ctx, const std::vector<Value>& args);

    /// 28.1.11 Reflect.preventExtensions ( target )
    /// @spec https://tc39.es/ecma262/#sec-reflect.preventextensions
    static Value preventExtensions(const CallContext& ctx, const std::vector<Value>& args);

    /// 28.1.12 Reflect.set ( target, propertyKey, V [ , receiver ] )
    /// @spec https://tc39.es/ecma262/#sec-reflect.set
    static Value set(const CallContext& ctx, const std::vector<Value>& args);

    /// 28.1.13 Reflect.setPrototypeOf ( target, proto )
    /// @spec https://tc39.es/ecma262/#sec-reflect.setprototypeof
    static Value setPrototypeOf(const CallContext& ctx, const std::vector<Value>& args);

    // ------------------------------------------------------------------
    // Shared abstract operations (also used by Proxy and the interpreter)
    // ------------------------------------------------------------------

    /// 7.1.19 ToPropertyKey ( argument ) — returns Rift's internal string key
    /// (symbols become "@@sym:<id>" strings).
    /// @spec https://tc39.es/ecma262/#sec-topropertykey
    static std::string toPropertyKey(const Value& value);

    /// Convert an internal string key back to a JS value (Symbol or String).
    static Value propertyKeyToValue(const std::string& key);

    /// 7.3.2 Get ( O, P ) / OrdinaryGet with Receiver — getter-aware property read.
    /// @spec https://tc39.es/ecma262/#sec-get-o-p
    static Value objectGet(JSObject* obj, const std::string& key, const Value& receiver);

    /// 7.3.4 Set ( O, P, V ) / OrdinarySet with Receiver — setter-aware property write.
    /// Returns false on failure (non-writable, accessor without setter, etc.).
    /// @spec https://tc39.es/ecma262/#sec-set-o-p-v-throw
    static bool objectSet(JSObject* obj, const std::string& key, const Value& value,
                          const Value& receiver);

    /// 7.3.14 Construct ( F, argumentsList [ , newTarget ] )
    /// SIMPLIFIED: newTarget is used only for the instance's [[Prototype]];
    /// it is not observable from inside the constructor (no new.target support).
    /// @spec https://tc39.es/ecma262/#sec-construct
    static Value constructObject(JSFunction* target, const std::vector<Value>& args,
                                 JSFunction* new_target);

    /// 7.3.19 CreateListFromArrayLike ( obj )
    /// @spec https://tc39.es/ecma262/#sec-createlistfromarraylike
    static std::vector<Value> createListFromArrayLike(const Value& array_like);

  private:
    /// Throw a TypeError with a real TypeError object (not a string).
    [[noreturn]] static void throwTypeError(const std::string& message);

    /// Extract the target object from args[0], throwing TypeError if not an object.
    static JSObject* requireObject(const std::vector<Value>& args, const char* method_name);
};

}  // namespace rift::builtins
