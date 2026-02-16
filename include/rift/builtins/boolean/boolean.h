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

/// 20.3 Boolean Objects
/// @spec https://tc39.es/ecma262/#sec-boolean-objects
class Boolean : public BuiltinBase<Boolean> {
  public:
    /// 20.3.1.1 Boolean ( value )
    /// @spec https://tc39.es/ecma262/#sec-boolean-constructor-boolean-value
    static Value constructor(const CallContext& ctx, const std::vector<Value>& args);

    /// 20.3.3.2 Boolean.prototype.toString ( )
    /// @spec https://tc39.es/ecma262/#sec-boolean.prototype.tostring
    static Value toString(const CallContext& ctx, const std::vector<Value>& args);

    /// 20.3.3.3 Boolean.prototype.valueOf ( )
    /// @spec https://tc39.es/ecma262/#sec-boolean.prototype.valueof
    static Value valueOf(const CallContext& ctx, const std::vector<Value>& args);

    /// Setup methods required by BuiltinBase template
    static void setupStaticMethods(JSObject* constructor, rift::memory::ObjectFactory* factory);
    static void setupPrototypeMethods(JSObject* prototype, rift::memory::ObjectFactory* factory);

  private:
    static JSObject* getGlobalPrototype();
};

}  // namespace rift::builtins
