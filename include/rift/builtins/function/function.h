#pragma once

#include "../../core/engine/call_context.h"
#include "../../memory/object_factory.h"
#include "../../runtime/values/object.h"
#include "../../runtime/values/value.h"
#include "../builtin_base.h"

namespace rift::builtins {

using namespace rift::runtime;
using rift::core::CallContext;

class Function : public BuiltinBase<Function> {
  public:
    static void setupStaticMethods(JSObject* constructor, rift::memory::ObjectFactory* factory);
    static void setupPrototypeMethods(JSObject* prototype, rift::memory::ObjectFactory* factory);
    static Value constructor(const CallContext& ctx, const std::vector<Value>& args);

    // Prototype methods
    static Value call(const CallContext& ctx, const std::vector<Value>& args);
    static Value apply(const CallContext& ctx, const std::vector<Value>& args);
    static Value bind(const CallContext& ctx, const std::vector<Value>& args);
    static Value toString(const CallContext& ctx, const std::vector<Value>& args);

  private:
    static JSObject* getGlobalPrototype();
};

}  // namespace rift::builtins
