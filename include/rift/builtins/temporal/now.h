#pragma once

#include "../../core/engine/call_context.h"
#include "../../memory/object_factory.h"
#include "../../runtime/values/object.h"
#include "../../runtime/values/value.h"

namespace rift::builtins {

using namespace rift::runtime;
using rift::core::CallContext;

/// 2.3 Temporal.Now Object
/// @spec https://tc39.es/proposal-temporal/#sec-temporal-now-object
class TemporalNow {
  public:
    /// Creates the Temporal.Now namespace object.
    static JSObject* create(rift::memory::ObjectFactory* factory);

    /// 2.3.2 Temporal.Now.instant ( )
    /// @spec https://tc39.es/proposal-temporal/#sec-temporal.now.instant
    static Value instant(const CallContext& ctx, const std::vector<Value>& args);

    /// 2.3.1 Temporal.Now.timeZoneId ( )
    /// @spec https://tc39.es/proposal-temporal/#sec-temporal.now.timezoneid
    static Value timeZoneId(const CallContext& ctx, const std::vector<Value>& args);

    /// 2.3.4 Temporal.Now.plainDateISO ( [ temporalTimeZoneLike ] )
    /// @spec https://tc39.es/proposal-temporal/#sec-temporal.now.plaindateiso
    static Value plainDateISO(const CallContext& ctx, const std::vector<Value>& args);

    /// 2.3.5 Temporal.Now.plainTimeISO ( [ temporalTimeZoneLike ] )
    /// @spec https://tc39.es/proposal-temporal/#sec-temporal.now.plaintimeiso
    static Value plainTimeISO(const CallContext& ctx, const std::vector<Value>& args);

    /// 2.3.3 Temporal.Now.plainDateTimeISO ( [ temporalTimeZoneLike ] )
    /// @spec https://tc39.es/proposal-temporal/#sec-temporal.now.plaindatetimeiso
    static Value plainDateTimeISO(const CallContext& ctx, const std::vector<Value>& args);

  private:
    static rift::memory::ObjectFactory* factory_;
};

}  // namespace rift::builtins
