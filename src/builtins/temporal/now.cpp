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

namespace rift::builtins {

rift::memory::ObjectFactory* TemporalNow::factory_ = nullptr;

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
