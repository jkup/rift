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

/// The `Object` builtin object and constructor.
class Object : public BuiltinBase<Object> {
  public:
    /// Setup methods required by BuiltinBase template
    static void setupStaticMethods(JSObject* constructor, rift::memory::ObjectFactory* factory);
    static void setupPrototypeMethods(JSObject* prototype, rift::memory::ObjectFactory* factory);

    /// Object constructor
    static Value constructor(const CallContext& ctx, const std::vector<Value>& args);

    /// Static methods
    static Value keys(const CallContext& ctx, const std::vector<Value>& args);
    static Value values(const CallContext& ctx, const std::vector<Value>& args);
    static Value entries(const CallContext& ctx, const std::vector<Value>& args);
    static Value defineProperty(const CallContext& ctx, const std::vector<Value>& args);
    static Value getOwnPropertyDescriptor(const CallContext& ctx, const std::vector<Value>& args);

    /// Prototype methods
    static Value toString(const CallContext& ctx, const std::vector<Value>& args);
    static Value valueOf(const CallContext& ctx, const std::vector<Value>& args);
    static Value hasOwnProperty(const CallContext& ctx, const std::vector<Value>& args);

  private:
    // Static factory storage is now handled by BuiltinBase template
};

}  // namespace rift::builtins