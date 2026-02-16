#pragma once

#include "../../core/engine/call_context.h"
#include "../../memory/object_factory.h"
#include "../../runtime/values/object.h"
#include "../../runtime/values/value.h"
#include "../builtin_base.h"

// Forward declaration
namespace rift::core {
class Rift;
}

namespace rift::builtins {

using namespace rift::runtime;
using rift::core::CallContext;

/// 20.2 Function Objects
/// @spec https://tc39.es/ecma262/#sec-function-objects
class Function : public BuiltinBase<Function> {
  public:
    static void setupStaticMethods(JSObject* constructor, rift::memory::ObjectFactory* factory);
    static void setupPrototypeMethods(JSObject* prototype, rift::memory::ObjectFactory* factory);

    /// 20.2.1.1 Function ( ...parameterArgs, bodyArg )
    /// @spec https://tc39.es/ecma262/#sec-function-p1-p2-pn-body
    static Value constructor(const CallContext& ctx, const std::vector<Value>& args);

    // ===== Prototype Methods (20.2.3 Properties of the Function Prototype Object) =====

    /// 20.2.3.3 Function.prototype.call ( thisArg, ...args )
    /// @spec https://tc39.es/ecma262/#sec-function.prototype.call
    static Value call(const CallContext& ctx, const std::vector<Value>& args);

    /// 20.2.3.1 Function.prototype.apply ( thisArg, argArray )
    /// @spec https://tc39.es/ecma262/#sec-function.prototype.apply
    static Value apply(const CallContext& ctx, const std::vector<Value>& args);

    /// 20.2.3.2 Function.prototype.bind ( thisArg, ...args )
    /// @spec https://tc39.es/ecma262/#sec-function.prototype.bind
    static Value bind(const CallContext& ctx, const std::vector<Value>& args);

    /// 20.2.3.5 Function.prototype.toString ( )
    /// @spec https://tc39.es/ecma262/#sec-function.prototype.tostring
    static Value toString(const CallContext& ctx, const std::vector<Value>& args);

    /// NON-STANDARD: Engine access for parsing function bodies in Function constructor
    static void setEngine(rift::core::Rift* engine) {
        engine_ = engine;
    }
    static rift::core::Rift* getEngine() {
        return engine_;
    }

  private:
    static JSObject* getGlobalPrototype();
    static rift::core::Rift* engine_;
};

}  // namespace rift::builtins
