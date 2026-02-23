#pragma once

#include <vector>

#include "../../memory/object_factory.h"
#include "../builtin_base.h"
#include "rift/interpreter/call_context.h"
#include "rift/types/object.h"
#include "rift/types/value.h"

namespace rift::builtins {

using namespace rift::runtime;
using rift::core::CallContext;

/// 20.5 Error Objects
/// @spec https://tc39.es/ecma262/#sec-error-objects
class Error : public BuiltinBase<Error> {
  public:
    static constexpr const char* builtinName = "Error";
    static constexpr int builtinLength = 1;

    /// NON-STANDARD: BuiltinBase setup hooks for constructor and prototype registration.
    static void setupStaticMethods(JSObject* constructor, rift::memory::ObjectFactory* factory);
    static void setupPrototypeMethods(JSObject* prototype, rift::memory::ObjectFactory* factory);

    /// 20.5.1.1 Error ( message [ , options ] )
    /// @spec https://tc39.es/ecma262/#sec-error-message
    static Value constructor(const CallContext& ctx, const std::vector<Value>& args);

    /// 20.5.3.4 Error.prototype.toString ( )
    /// @spec https://tc39.es/ecma262/#sec-error.prototype.tostring
    static Value toString(const CallContext& ctx, const std::vector<Value>& args);

  private:
    /// NON-STANDARD: Internal helper to retrieve the Error prototype from BuiltinManager.
    static JSObject* getGlobalPrototype();
};

}  // namespace rift::builtins