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

    /// Temporal.Now.plainDateISO() - returns current PlainDate in ISO calendar
    static Value plainDateISO(const CallContext& ctx, const std::vector<Value>& args);

    /// Temporal.Now.plainTimeISO() - returns current PlainTime in ISO calendar
    static Value plainTimeISO(const CallContext& ctx, const std::vector<Value>& args);

    /// Temporal.Now.plainDateTimeISO() - returns current PlainDateTime in ISO calendar
    static Value plainDateTimeISO(const CallContext& ctx, const std::vector<Value>& args);

  private:
    static rift::memory::ObjectFactory* factory_;
};

}  // namespace rift::builtins
