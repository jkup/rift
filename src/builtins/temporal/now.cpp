#include "rift/builtins/temporal/now.h"

#include <chrono>

#include "rift/builtins/builtin_base.h"
#include "rift/builtins/temporal/instant.h"
#include "rift/builtins/temporal/plain_date.h"
#include "rift/builtins/temporal/plain_date_time.h"
#include "rift/builtins/temporal/plain_time.h"
#include "rift/core/engine/javascript_exception.h"

#include "temporal_rs/Instant.hpp"
#include "temporal_rs/PlainDate.hpp"
#include "temporal_rs/PlainDateTime.hpp"
#include "temporal_rs/PlainTime.hpp"
#include "temporal_rs/TimeZone.hpp"

// ============================================================================
// Temporal Proposal -- Temporal.Now Object (Section 2)
// @spec https://tc39.es/proposal-temporal/#sec-temporal-now-object
//
// Temporal.Now provides methods that return Temporal objects representing
// the current date, time, or instant.
//
// DEVIATION: All methods use millisecond precision (no BigInt) and
// SIMPLIFIED: Always uses UTC instead of the system timezone for
// PlainDate/PlainTime/PlainDateTime conversions.
// ============================================================================

namespace rift::builtins {

rift::memory::ObjectFactory* TemporalNow::factory_ = nullptr;

// 2.3 Properties of the Temporal.Now Object
// @spec https://tc39.es/proposal-temporal/#sec-properties-of-temporal-now-object
JSObject* TemporalNow::create(rift::memory::ObjectFactory* factory) {
    factory_ = factory;
    auto* now = factory->createJSObject();

    RIFT_METHOD(now, "instant", TemporalNow::instant);
    RIFT_METHOD(now, "timeZoneId", TemporalNow::timeZoneId);
    RIFT_METHOD(now, "plainDateISO", TemporalNow::plainDateISO);
    RIFT_METHOD(now, "plainTimeISO", TemporalNow::plainTimeISO);
    RIFT_METHOD(now, "plainDateTimeISO", TemporalNow::plainDateTimeISO);

    return now;
}

// 2.3.2 Temporal.Now.instant ()
// @spec https://tc39.es/proposal-temporal/#sec-temporal.now.instant
// DEVIATION: Uses millisecond precision (no BigInt for nanoseconds).
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

// 2.3.1 Temporal.Now.timeZoneId ()
// @spec https://tc39.es/proposal-temporal/#sec-temporal.now.timezoneid
// SIMPLIFIED: Only checks TZ env var; falls back to "UTC" instead of
// reading the system timezone database.
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

// 2.3.4 Temporal.Now.plainDateISO ( [ temporalTimeZoneLike ] )
// @spec https://tc39.es/proposal-temporal/#sec-temporal.now.plaindateiso
// SIMPLIFIED: Always uses UTC; ignores timezone argument.
Value TemporalNow::plainDateISO(const CallContext& ctx, const std::vector<Value>& args) {
    auto now = std::chrono::system_clock::now();
    auto epoch_ms =
        std::chrono::duration_cast<std::chrono::milliseconds>(now.time_since_epoch()).count();

    auto tz = temporal_rs::TimeZone::utc();
    auto result = temporal_rs::PlainDate::from_epoch_milliseconds(static_cast<int64_t>(epoch_ms), tz);
    if(!result.is_ok()) {
        throw rift::core::JavaScriptException(
            Value("Error: Failed to create current PlainDate"));
    }

    return TemporalPlainDate::wrapPlainDate(std::move(result).ok().value());
}

// 2.3.5 Temporal.Now.plainTimeISO ( [ temporalTimeZoneLike ] )
// @spec https://tc39.es/proposal-temporal/#sec-temporal.now.plaintimeiso
// SIMPLIFIED: Always uses UTC; ignores timezone argument.
Value TemporalNow::plainTimeISO(const CallContext& ctx, const std::vector<Value>& args) {
    auto now = std::chrono::system_clock::now();
    auto epoch_ms =
        std::chrono::duration_cast<std::chrono::milliseconds>(now.time_since_epoch()).count();

    auto tz = temporal_rs::TimeZone::utc();
    auto result = temporal_rs::PlainTime::from_epoch_milliseconds(static_cast<int64_t>(epoch_ms), tz);
    if(!result.is_ok()) {
        throw rift::core::JavaScriptException(
            Value("Error: Failed to create current PlainTime"));
    }

    return TemporalPlainTime::wrapPlainTime(std::move(result).ok().value());
}

// 2.3.3 Temporal.Now.plainDateTimeISO ( [ temporalTimeZoneLike ] )
// @spec https://tc39.es/proposal-temporal/#sec-temporal.now.plaindatetimeiso
// SIMPLIFIED: Always uses UTC; ignores timezone argument.
Value TemporalNow::plainDateTimeISO(const CallContext& ctx, const std::vector<Value>& args) {
    auto now = std::chrono::system_clock::now();
    auto epoch_ms =
        std::chrono::duration_cast<std::chrono::milliseconds>(now.time_since_epoch()).count();

    auto tz = temporal_rs::TimeZone::utc();
    auto date_result =
        temporal_rs::PlainDate::from_epoch_milliseconds(static_cast<int64_t>(epoch_ms), tz);
    if(!date_result.is_ok()) {
        throw rift::core::JavaScriptException(
            Value("Error: Failed to create current PlainDateTime"));
    }

    auto date = std::move(date_result).ok().value();
    // Convert PlainDate to PlainDateTime with the current time
    auto tz2 = temporal_rs::TimeZone::utc();
    auto time_result =
        temporal_rs::PlainTime::from_epoch_milliseconds(static_cast<int64_t>(epoch_ms), tz2);
    if(!time_result.is_ok()) {
        throw rift::core::JavaScriptException(
            Value("Error: Failed to create current PlainDateTime"));
    }

    auto time = std::move(time_result).ok().value();
    auto dt_result = date->to_plain_date_time(time.get());
    if(!dt_result.is_ok()) {
        throw rift::core::JavaScriptException(
            Value("Error: Failed to create current PlainDateTime"));
    }

    return TemporalPlainDateTime::wrapPlainDateTime(std::move(dt_result).ok().value());
}

}  // namespace rift::builtins
