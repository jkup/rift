#pragma once

#include <iostream>
#include <vector>

#include "rift/interpreter/call_context.h"
#include "rift/memory/object_factory.h"
#include "rift/types/object.h"
#include "rift/types/value.h"

namespace rift::builtins {

using namespace rift::runtime;
using rift::core::CallContext;

/// Console API (NOT part of ECMA-262; defined by WHATWG)
/// @spec https://console.spec.whatwg.org/
class Console {
  public:
    /// NON-STANDARD: Creates the console object and registers all methods.
    static JSObject* create(rift::memory::ObjectFactory* factory);

    /// 1.3.3 log ( ...data )
    /// @spec https://console.spec.whatwg.org/#log
    static Value log(const CallContext& ctx, const std::vector<Value>& args);

    /// 1.3.1 error ( ...data )
    /// @spec https://console.spec.whatwg.org/#error
    static Value error(const CallContext& ctx, const std::vector<Value>& args);

    /// 1.3.8 warn ( ...data )
    /// @spec https://console.spec.whatwg.org/#warn
    static Value warn(const CallContext& ctx, const std::vector<Value>& args);

    /// 1.3.4 info ( ...data )
    /// @spec https://console.spec.whatwg.org/#info
    static Value info(const CallContext& ctx, const std::vector<Value>& args);

  private:
    /// NON-STANDARD: Internal helper for formatted output to a stream.
    static void printValues(const std::vector<Value>& args, std::ostream& stream);
};

}  // namespace rift::builtins