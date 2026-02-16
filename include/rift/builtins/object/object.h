#pragma once

#include <vector>

#include "../../core/engine/call_context.h"
#include "../../memory/object_factory.h"
#include "../../runtime/values/object.h"
#include "../../runtime/values/value.h"
#include "../builtin_base.h"

namespace rift::builtins {

using namespace rift::runtime;
using rift::core::CallContext;

/// 20.1 Object Objects
/// @spec https://tc39.es/ecma262/#sec-object-objects
class Object : public BuiltinBase<Object> {
  public:
    /// Setup methods required by BuiltinBase template
    static void setupStaticMethods(JSObject* constructor, rift::memory::ObjectFactory* factory);
    static void setupPrototypeMethods(JSObject* prototype, rift::memory::ObjectFactory* factory);

    /// 20.1.1.1 Object ( [ value ] )
    /// @spec https://tc39.es/ecma262/#sec-object-value
    static Value constructor(const CallContext& ctx, const std::vector<Value>& args);

    // ===== Static Methods (20.1.2 Properties of the Object Constructor) =====

    /// 20.1.2.18 Object.keys ( O )
    /// @spec https://tc39.es/ecma262/#sec-object.keys
    static Value keys(const CallContext& ctx, const std::vector<Value>& args);

    /// 20.1.2.23 Object.values ( O )
    /// @spec https://tc39.es/ecma262/#sec-object.values
    static Value values(const CallContext& ctx, const std::vector<Value>& args);

    /// 20.1.2.5 Object.entries ( O )
    /// @spec https://tc39.es/ecma262/#sec-object.entries
    static Value entries(const CallContext& ctx, const std::vector<Value>& args);

    /// 20.1.2.4 Object.defineProperty ( O, P, Attributes )
    /// @spec https://tc39.es/ecma262/#sec-object.defineproperty
    static Value defineProperty(const CallContext& ctx, const std::vector<Value>& args);

    /// 20.1.2.3 Object.defineProperties ( O, Properties )
    /// @spec https://tc39.es/ecma262/#sec-object.defineproperties
    static Value defineProperties(const CallContext& ctx, const std::vector<Value>& args);

    /// 20.1.2.8 Object.getOwnPropertyDescriptor ( O, P )
    /// @spec https://tc39.es/ecma262/#sec-object.getownpropertydescriptor
    static Value getOwnPropertyDescriptor(const CallContext& ctx, const std::vector<Value>& args);

    /// 20.1.2.2 Object.create ( O, Properties )
    /// @spec https://tc39.es/ecma262/#sec-object.create
    static Value jsCreate(const CallContext& ctx, const std::vector<Value>& args);

    /// 20.1.2.12 Object.getPrototypeOf ( O )
    /// @spec https://tc39.es/ecma262/#sec-object.getprototypeof
    static Value getPrototypeOf(const CallContext& ctx, const std::vector<Value>& args);

    /// 20.1.2.22 Object.setPrototypeOf ( O, proto )
    /// @spec https://tc39.es/ecma262/#sec-object.setprototypeof
    static Value setPrototypeOf(const CallContext& ctx, const std::vector<Value>& args);

    /// 20.1.2.10 Object.getOwnPropertyNames ( O )
    /// @spec https://tc39.es/ecma262/#sec-object.getownpropertynames
    static Value getOwnPropertyNames(const CallContext& ctx, const std::vector<Value>& args);

    /// 20.1.2.11 Object.getOwnPropertySymbols ( O )
    /// @spec https://tc39.es/ecma262/#sec-object.getownpropertysymbols
    static Value getOwnPropertySymbols(const CallContext& ctx, const std::vector<Value>& args);

    /// 20.1.2.1 Object.assign ( target, ...sources )
    /// @spec https://tc39.es/ecma262/#sec-object.assign
    static Value assign(const CallContext& ctx, const std::vector<Value>& args);

    /// 20.1.2.19 Object.preventExtensions ( O )
    /// @spec https://tc39.es/ecma262/#sec-object.preventextensions
    static Value preventExtensions(const CallContext& ctx, const std::vector<Value>& args);

    /// 20.1.2.15 Object.isExtensible ( O )
    /// @spec https://tc39.es/ecma262/#sec-object.isextensible
    static Value isExtensible(const CallContext& ctx, const std::vector<Value>& args);

    /// 20.1.2.21 Object.seal ( O )
    /// @spec https://tc39.es/ecma262/#sec-object.seal
    static Value seal(const CallContext& ctx, const std::vector<Value>& args);

    /// 20.1.2.17 Object.isSealed ( O )
    /// @spec https://tc39.es/ecma262/#sec-object.issealed
    static Value isSealed(const CallContext& ctx, const std::vector<Value>& args);

    /// 20.1.2.6 Object.freeze ( O )
    /// @spec https://tc39.es/ecma262/#sec-object.freeze
    static Value freeze(const CallContext& ctx, const std::vector<Value>& args);

    /// 20.1.2.16 Object.isFrozen ( O )
    /// @spec https://tc39.es/ecma262/#sec-object.isfrozen
    static Value isFrozen(const CallContext& ctx, const std::vector<Value>& args);

    /// 20.1.2.14 Object.is ( value1, value2 )
    /// @spec https://tc39.es/ecma262/#sec-object.is
    static Value is(const CallContext& ctx, const std::vector<Value>& args);

    /// 20.1.2.13 Object.hasOwn ( O, P )
    /// @spec https://tc39.es/ecma262/#sec-object.hasown
    static Value hasOwn(const CallContext& ctx, const std::vector<Value>& args);

    /// 20.1.2.7 Object.fromEntries ( iterable )
    /// @spec https://tc39.es/ecma262/#sec-object.fromentries
    static Value fromEntries(const CallContext& ctx, const std::vector<Value>& args);

    /// 20.1.2.9 Object.getOwnPropertyDescriptors ( O )
    /// @spec https://tc39.es/ecma262/#sec-object.getownpropertydescriptors
    static Value getOwnPropertyDescriptors(const CallContext& ctx, const std::vector<Value>& args);

    // ===== Prototype Methods (20.1.3 Properties of the Object Prototype Object) =====

    /// 20.1.3.6 Object.prototype.toString ( )
    /// @spec https://tc39.es/ecma262/#sec-object.prototype.tostring
    static Value toString(const CallContext& ctx, const std::vector<Value>& args);

    /// 20.1.3.7 Object.prototype.valueOf ( )
    /// @spec https://tc39.es/ecma262/#sec-object.prototype.valueof
    static Value valueOf(const CallContext& ctx, const std::vector<Value>& args);

    /// 20.1.3.2 Object.prototype.hasOwnProperty ( V )
    /// @spec https://tc39.es/ecma262/#sec-object.prototype.hasownproperty
    static Value hasOwnProperty(const CallContext& ctx, const std::vector<Value>& args);

    /// 20.1.3.4 Object.prototype.propertyIsEnumerable ( V )
    /// @spec https://tc39.es/ecma262/#sec-object.prototype.propertyisenumerable
    static Value propertyIsEnumerable(const CallContext& ctx, const std::vector<Value>& args);

    /// 20.1.3.3 Object.prototype.isPrototypeOf ( V )
    /// @spec https://tc39.es/ecma262/#sec-object.prototype.isprototypeof
    static Value isPrototypeOf(const CallContext& ctx, const std::vector<Value>& args);

  private:
    // Static factory storage is now handled by BuiltinBase template
};

}  // namespace rift::builtins
