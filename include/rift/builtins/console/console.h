#pragma once

#include <iostream>
#include <vector>

#include "../../core/engine/call_context.h"
#include "../../memory/object_factory.h"
#include "../../runtime/values/object.h"
#include "../../runtime/values/value.h"

namespace rift::builtins {

using namespace rift::runtime;
using rift::core::CallContext;

// Console built-in
class Console {
  public:
    // Updated to return raw pointer for GC-managed creation
    static JSObject* create(rift::memory::ObjectFactory* factory);

    // Console methods
    static Value log(const CallContext& ctx, const std::vector<Value>& args);
    static Value error(const CallContext& ctx, const std::vector<Value>& args);
    static Value warn(const CallContext& ctx, const std::vector<Value>& args);
    static Value info(const CallContext& ctx, const std::vector<Value>& args);

  private:
    // Helper for output
    static void printValues(const std::vector<Value>& args, std::ostream& stream);
};

}  // namespace rift::builtins