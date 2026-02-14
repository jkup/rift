#include "rift/builtins/temporal/now.h"

#include <chrono>

#include "rift/builtins/builtin_base.h"
#include "rift/builtins/temporal/instant.h"
#include "rift/core/engine/javascript_exception.h"

#include "temporal_rs/Instant.hpp"

namespace rift::builtins {

rift::memory::ObjectFactory* TemporalNow::factory_ = nullptr;

JSObject* TemporalNow::create(rift::memory::ObjectFactory* factory) {
    factory_ = factory;
    auto* now = factory->createJSObject();

    RIFT_METHOD(now, "instant", TemporalNow::instant);
    RIFT_METHOD(now, "timeZoneId", TemporalNow::timeZoneId);

    return now;
}

Value TemporalNow::instant(const CallContext& ctx, const std::vector<Value>& args) {
    // Get current time as epoch milliseconds
    auto now = std::chrono::system_clock::now();
    auto epoch_ms =
        std::chrono::duration_cast<std::chrono::milliseconds>(now.time_since_epoch()).count();

    auto result = temporal_rs::Instant::from_epoch_milliseconds(static_cast<int64_t>(epoch_ms));
    if(!result.is_ok()) {
        throw rift::core::JavaScriptException(Value("Error: Failed to create current Instant"));
    }

    return TemporalInstant::wrapInstant(std::move(result).ok().value());
}

Value TemporalNow::timeZoneId(const CallContext& ctx, const std::vector<Value>& args) {
    // Get system timezone
    // On POSIX systems, check TZ env var or read /etc/localtime
    const char* tz = std::getenv("TZ");
    if(tz && tz[0] != '\0') {
        return Value(std::string(tz));
    }

    // Default to UTC if we can't determine
    return Value(std::string("UTC"));
}

}  // namespace rift::builtins
