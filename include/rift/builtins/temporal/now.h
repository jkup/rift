#pragma once

#include "../../core/engine/call_context.h"
#include "../../memory/object_factory.h"
#include "../../runtime/values/object.h"
#include "../../runtime/values/value.h"

namespace rift::builtins {

using namespace rift::runtime;
using rift::core::CallContext;

/// The `Temporal.Now` namespace object.
class TemporalNow {
  public:
    /// Creates the Temporal.Now namespace object.
    static JSObject* create(rift::memory::ObjectFactory* factory);

    /// Temporal.Now.instant() - returns current Instant
    static Value instant(const CallContext& ctx, const std::vector<Value>& args);

    /// Temporal.Now.timeZoneId() - returns system timezone string
    static Value timeZoneId(const CallContext& ctx, const std::vector<Value>& args);

  private:
    static rift::memory::ObjectFactory* factory_;
};

}  // namespace rift::builtins
