#include "rift/builtins/temporal/zoned_date_time.h"

#include "temporal_rs/AnyCalendarKind.hpp"
#include "temporal_rs/ArithmeticOverflow.hpp"
#include "temporal_rs/DifferenceSettings.hpp"
#include "temporal_rs/Disambiguation.hpp"
#include "temporal_rs/DisplayCalendar.hpp"
#include "temporal_rs/DisplayOffset.hpp"
#include "temporal_rs/DisplayTimeZone.hpp"
#include "temporal_rs/Duration.hpp"
#include "temporal_rs/Instant.hpp"
#include "temporal_rs/OffsetDisambiguation.hpp"
#include "temporal_rs/PartialDate.hpp"
#include "temporal_rs/PartialTime.hpp"
#include "temporal_rs/PartialZonedDateTime.hpp"
#include "temporal_rs/PlainDate.hpp"
#include "temporal_rs/PlainDateTime.hpp"
#include "temporal_rs/PlainTime.hpp"
#include "temporal_rs/Precision.hpp"
#include "temporal_rs/TimeZone.hpp"
#include "temporal_rs/ToStringRoundingOptions.hpp"
#include "temporal_rs/ZonedDateTime.hpp"

#include "rift/builtins/temporal/duration.h"
#include "rift/builtins/temporal/instant.h"
#include "rift/builtins/temporal/plain_date.h"
#include "rift/builtins/temporal/plain_date_time.h"
#include "rift/builtins/temporal/plain_time.h"
#include "rift/core/engine/builtin_manager.h"
#include "rift/core/engine/javascript_exception.h"
#include "rift/core/engine/this_helpers.h"
#include "rift/memory/gc_protector.h"

namespace rift::builtins {

using rift::core::extractThisObject;

// ===== ZonedDateTimeRegistry =====

std::unordered_map<JSObject*, std::unique_ptr<temporal_rs::ZonedDateTime>>
    ZonedDateTimeRegistry::registry_;

void ZonedDateTimeRegistry::store(JSObject* obj,
                                  std::unique_ptr<temporal_rs::ZonedDateTime> data) {
    registry_[obj] = std::move(data);
}

temporal_rs::ZonedDateTime* ZonedDateTimeRegistry::get(JSObject* obj) {
    auto it = registry_.find(obj);
    if(it != registry_.end()) {
        return it->second.get();
    }
    return nullptr;
}

void ZonedDateTimeRegistry::remove(JSObject* obj) {
    registry_.erase(obj);
}

void ZonedDateTimeRegistry::clear() {
    registry_.clear();
}

// ===== Helper: Get ZonedDateTime data from this =====

static temporal_rs::ZonedDateTime* getZonedDateTimeData(const CallContext& ctx) {
    auto* obj = extractThisObject(ctx);
    if(obj) {
        return ZonedDateTimeRegistry::get(obj);
    }
    return nullptr;
}

// ===== Helper: Throw TemporalError as JavaScriptException =====

static void throwTemporalError(const temporal_rs::TemporalError& err) {
    std::string msg = "Temporal error";
    if(err.msg.has_value()) {
        msg = std::string(err.msg.value());
    }

    switch(static_cast<int>(err.kind)) {
        case 1:  // Type
            throw rift::core::JavaScriptException(Value("TypeError: " + msg));
        case 2:  // Range
            throw rift::core::JavaScriptException(Value("RangeError: " + msg));
        case 3:  // Syntax
            throw rift::core::JavaScriptException(Value("SyntaxError: " + msg));
        default:
            throw rift::core::JavaScriptException(Value("Error: " + msg));
    }
}

// ===== Helper: Parse a ZonedDateTime from a JS Value =====

static std::unique_ptr<temporal_rs::ZonedDateTime> parseZonedDateTimeFromValue(const Value& val) {
    if(val.isObject() || val.isFunction()) {
        auto* data = ZonedDateTimeRegistry::get(val.getObject());
        if(data) {
            return data->clone();
        }

        // Property bag
        auto* obj = val.getObject();
        temporal_rs::PartialDate date_partial{};
        temporal_rs::PartialTime time_partial{};

        Value y = obj->getProperty("year");
        Value mo = obj->getProperty("month");
        Value mc = obj->getProperty("monthCode");
        Value d = obj->getProperty("day");

        if(!y.isUndefined()) date_partial.year = static_cast<int32_t>(y.toNumber());
        if(!mo.isUndefined()) date_partial.month = static_cast<uint8_t>(mo.toNumber());
        if(!d.isUndefined()) date_partial.day = static_cast<uint8_t>(d.toNumber());

        std::string month_code_str;
        if(!mc.isUndefined()) {
            month_code_str = mc.toString();
            date_partial.month_code = month_code_str;
        }

        date_partial.calendar = temporal_rs::AnyCalendarKind::Iso;

        Value h = obj->getProperty("hour");
        Value mi = obj->getProperty("minute");
        Value s = obj->getProperty("second");
        Value ms = obj->getProperty("millisecond");
        Value us = obj->getProperty("microsecond");
        Value ns = obj->getProperty("nanosecond");

        if(!h.isUndefined()) time_partial.hour = static_cast<uint8_t>(h.toNumber());
        if(!mi.isUndefined()) time_partial.minute = static_cast<uint8_t>(mi.toNumber());
        if(!s.isUndefined()) time_partial.second = static_cast<uint8_t>(s.toNumber());
        if(!ms.isUndefined()) time_partial.millisecond = static_cast<uint16_t>(ms.toNumber());
        if(!us.isUndefined()) time_partial.microsecond = static_cast<uint16_t>(us.toNumber());
        if(!ns.isUndefined()) time_partial.nanosecond = static_cast<uint16_t>(ns.toNumber());

        Value tz_val = obj->getProperty("timeZone");
        std::optional<temporal_rs::TimeZone> timezone = std::nullopt;
        if(!tz_val.isUndefined()) {
            std::string tz_str = tz_val.toString();
            auto tz_result = temporal_rs::TimeZone::try_from_str(tz_str);
            if(tz_result.is_ok()) {
                timezone = std::move(tz_result).ok().value();
            }
        }

        temporal_rs::PartialZonedDateTime partial{date_partial, time_partial, std::nullopt,
                                                   timezone};

        auto result = temporal_rs::ZonedDateTime::from_partial(partial, std::nullopt,
                                                                std::nullopt, std::nullopt);
        if(!result.is_ok()) {
            throwTemporalError(std::move(result).err().value());
        }
        return std::move(result).ok().value();
    }

    // String
    std::string str = val.toString();
    auto result = temporal_rs::ZonedDateTime::from_utf8(
        str, temporal_rs::Disambiguation::Compatible,
        temporal_rs::OffsetDisambiguation::Reject);
    if(!result.is_ok()) {
        throwTemporalError(std::move(result).err().value());
    }
    return std::move(result).ok().value();
}

// ===== Helper: Parse a Duration for arithmetic =====

static std::unique_ptr<temporal_rs::Duration> parseDurationForZonedDateTime(const Value& val) {
    if(val.isObject() || val.isFunction()) {
        auto* data = DurationRegistry::get(val.getObject());
        if(data) {
            return data->clone();
        }

        // Property bag
        auto* obj = val.getObject();
        temporal_rs::PartialDuration partial{};

        Value y = obj->getProperty("years");
        Value mo = obj->getProperty("months");
        Value w = obj->getProperty("weeks");
        Value d = obj->getProperty("days");
        Value h = obj->getProperty("hours");
        Value mi = obj->getProperty("minutes");
        Value s = obj->getProperty("seconds");
        Value ms = obj->getProperty("milliseconds");
        Value us = obj->getProperty("microseconds");
        Value ns = obj->getProperty("nanoseconds");

        if(!y.isUndefined()) partial.years = static_cast<int64_t>(y.toNumber());
        if(!mo.isUndefined()) partial.months = static_cast<int64_t>(mo.toNumber());
        if(!w.isUndefined()) partial.weeks = static_cast<int64_t>(w.toNumber());
        if(!d.isUndefined()) partial.days = static_cast<int64_t>(d.toNumber());
        if(!h.isUndefined()) partial.hours = static_cast<int64_t>(h.toNumber());
        if(!mi.isUndefined()) partial.minutes = static_cast<int64_t>(mi.toNumber());
        if(!s.isUndefined()) partial.seconds = static_cast<int64_t>(s.toNumber());
        if(!ms.isUndefined()) partial.milliseconds = static_cast<int64_t>(ms.toNumber());
        if(!us.isUndefined()) partial.microseconds = us.toNumber();
        if(!ns.isUndefined()) partial.nanoseconds = ns.toNumber();

        auto result = temporal_rs::Duration::from_partial_duration(partial);
        if(!result.is_ok()) {
            throwTemporalError(std::move(result).err().value());
        }
        return std::move(result).ok().value();
    }

    // String
    std::string str = val.toString();
    auto result = temporal_rs::Duration::from_utf8(str);
    if(!result.is_ok()) {
        throwTemporalError(std::move(result).err().value());
    }
    return std::move(result).ok().value();
}

// ===== Helper: Wrap a temporal_rs::ZonedDateTime into a JS object =====

Value TemporalZonedDateTime::wrapZonedDateTime(
    std::unique_ptr<temporal_rs::ZonedDateTime> zdt) {
    auto* proto = getGlobalPrototype();
    auto* js_obj = getObjectFactory()->createJSObject(proto);
    rift::memory::GCProtector protect(js_obj, getObjectFactory()->getObjectManager());

    ZonedDateTimeRegistry::store(js_obj, std::move(zdt));

    return Value(js_obj);
}

// ===== Setup =====

void TemporalZonedDateTime::setupStaticMethods(JSObject* constructor,
                                                rift::memory::ObjectFactory* factory) {
    RIFT_STATIC_METHOD(constructor, "from", TemporalZonedDateTime::from);
    RIFT_STATIC_METHOD(constructor, "compare", TemporalZonedDateTime::compare);
}

void TemporalZonedDateTime::setupPrototypeMethods(JSObject* prototype,
                                                    rift::memory::ObjectFactory* factory) {
    // Date getters
    RIFT_GETTER(prototype, "year", TemporalZonedDateTime::year);
    RIFT_GETTER(prototype, "month", TemporalZonedDateTime::month);
    RIFT_GETTER(prototype, "monthCode", TemporalZonedDateTime::monthCode);
    RIFT_GETTER(prototype, "day", TemporalZonedDateTime::day);
    RIFT_GETTER(prototype, "dayOfWeek", TemporalZonedDateTime::dayOfWeek);
    RIFT_GETTER(prototype, "dayOfYear", TemporalZonedDateTime::dayOfYear);
    RIFT_GETTER(prototype, "weekOfYear", TemporalZonedDateTime::weekOfYear);
    RIFT_GETTER(prototype, "daysInMonth", TemporalZonedDateTime::daysInMonth);
    RIFT_GETTER(prototype, "daysInYear", TemporalZonedDateTime::daysInYear);
    RIFT_GETTER(prototype, "monthsInYear", TemporalZonedDateTime::monthsInYear);
    RIFT_GETTER(prototype, "inLeapYear", TemporalZonedDateTime::inLeapYear);
    RIFT_GETTER(prototype, "calendarId", TemporalZonedDateTime::calendarId);

    // Time getters
    RIFT_GETTER(prototype, "hour", TemporalZonedDateTime::hour);
    RIFT_GETTER(prototype, "minute", TemporalZonedDateTime::minute);
    RIFT_GETTER(prototype, "second", TemporalZonedDateTime::second);
    RIFT_GETTER(prototype, "millisecond", TemporalZonedDateTime::millisecond);
    RIFT_GETTER(prototype, "microsecond", TemporalZonedDateTime::microsecond);
    RIFT_GETTER(prototype, "nanosecond", TemporalZonedDateTime::nanosecond);

    // Timezone getters
    RIFT_GETTER(prototype, "timeZoneId", TemporalZonedDateTime::timeZoneId);
    RIFT_GETTER(prototype, "offset", TemporalZonedDateTime::offset);
    RIFT_GETTER(prototype, "offsetNanoseconds", TemporalZonedDateTime::offsetNanoseconds);
    RIFT_GETTER(prototype, "epochMilliseconds", TemporalZonedDateTime::epochMilliseconds);
    RIFT_GETTER(prototype, "epochNanoseconds", TemporalZonedDateTime::epochNanoseconds);

    // Mutation
    RIFT_METHOD(prototype, "with", TemporalZonedDateTime::with);
    RIFT_METHOD(prototype, "withTimeZone", TemporalZonedDateTime::withTimeZone);
    RIFT_METHOD(prototype, "withCalendar", TemporalZonedDateTime::withCalendar);
    RIFT_METHOD(prototype, "withPlainTime", TemporalZonedDateTime::withPlainTime);

    // Arithmetic
    RIFT_METHOD(prototype, "add", TemporalZonedDateTime::add);
    RIFT_METHOD(prototype, "subtract", TemporalZonedDateTime::subtract);

    // Difference
    RIFT_METHOD(prototype, "until", TemporalZonedDateTime::until);
    RIFT_METHOD(prototype, "since", TemporalZonedDateTime::since);

    // Comparison
    RIFT_METHOD(prototype, "equals", TemporalZonedDateTime::equals);

    // Conversion
    RIFT_METHOD(prototype, "toInstant", TemporalZonedDateTime::toInstant);
    RIFT_METHOD(prototype, "toPlainDate", TemporalZonedDateTime::toPlainDate);
    RIFT_METHOD(prototype, "toPlainTime", TemporalZonedDateTime::toPlainTime);
    RIFT_METHOD(prototype, "toPlainDateTime", TemporalZonedDateTime::toPlainDateTime);

    // Special
    RIFT_METHOD(prototype, "startOfDay", TemporalZonedDateTime::startOfDay);
    RIFT_METHOD(prototype, "hoursInDay", TemporalZonedDateTime::hoursInDay);

    // String
    RIFT_METHOD(prototype, "toString", TemporalZonedDateTime::toString);
    RIFT_METHOD(prototype, "toJSON", TemporalZonedDateTime::toJSON);
    RIFT_METHOD(prototype, "valueOf", TemporalZonedDateTime::valueOf);
}

// ===== Constructor =====

Value TemporalZonedDateTime::constructor(const CallContext& ctx, const std::vector<Value>& args) {
    if(args.size() < 2) {
        throw rift::core::JavaScriptException(Value(
            "TypeError: Temporal.ZonedDateTime requires epochNanoseconds and timeZone"));
    }

    // First arg: epoch nanoseconds (as a number, ms precision without BigInt)
    // Convert nanoseconds to milliseconds since we use from_epoch_milliseconds
    double epoch_ns_value = args[0].toNumber();
    int64_t epoch_ms = static_cast<int64_t>(epoch_ns_value / 1e6);

    // Second arg: timezone string
    std::string tz_str = args[1].toString();
    auto tz_result = temporal_rs::TimeZone::try_from_str(tz_str);
    if(!tz_result.is_ok()) {
        throwTemporalError(std::move(tz_result).err().value());
    }
    auto timezone = std::move(tz_result).ok().value();

    // Third arg: optional calendar
    temporal_rs::AnyCalendarKind calendar = temporal_rs::AnyCalendarKind::Iso;
    if(args.size() > 2 && args[2].isString()) {
        auto cal = temporal_rs::AnyCalendarKind::get_for_str(args[2].getString());
        if(cal.has_value()) {
            calendar = cal.value();
        } else {
            throw rift::core::JavaScriptException(
                Value("RangeError: Invalid calendar: " + args[2].getString()));
        }
    }

    auto result = temporal_rs::ZonedDateTime::from_epoch_milliseconds(epoch_ms, timezone);
    if(!result.is_ok()) {
        throwTemporalError(std::move(result).err().value());
    }

    // If a non-default calendar was specified, apply it
    if(calendar != temporal_rs::AnyCalendarKind::Iso) {
        auto zdt = std::move(result).ok().value();
        auto zdt_with_cal = zdt->with_calendar(calendar);
        return wrapZonedDateTime(std::move(zdt_with_cal));
    }

    return wrapZonedDateTime(std::move(result).ok().value());
}

// ===== Static Methods =====

Value TemporalZonedDateTime::from(const CallContext& ctx, const std::vector<Value>& args) {
    if(args.empty()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Temporal.ZonedDateTime.from requires an argument"));
    }

    auto zdt = parseZonedDateTimeFromValue(args[0]);
    return wrapZonedDateTime(std::move(zdt));
}

Value TemporalZonedDateTime::compare(const CallContext& ctx, const std::vector<Value>& args) {
    if(args.size() < 2) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Temporal.ZonedDateTime.compare requires two arguments"));
    }

    auto zdt_one = parseZonedDateTimeFromValue(args[0]);
    auto zdt_two = parseZonedDateTimeFromValue(args[1]);

    int8_t cmp = zdt_one->compare_instant(*zdt_two);
    return Value(static_cast<double>(cmp));
}

// ===== Date Getters =====

Value TemporalZonedDateTime::year(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getZonedDateTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: year called on non-ZonedDateTime"));
    }
    return Value(static_cast<double>(data->year()));
}

Value TemporalZonedDateTime::month(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getZonedDateTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: month called on non-ZonedDateTime"));
    }
    return Value(static_cast<double>(data->month()));
}

Value TemporalZonedDateTime::monthCode(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getZonedDateTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: monthCode called on non-ZonedDateTime"));
    }
    return Value(data->month_code());
}

Value TemporalZonedDateTime::day(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getZonedDateTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: day called on non-ZonedDateTime"));
    }
    return Value(static_cast<double>(data->day()));
}

Value TemporalZonedDateTime::dayOfWeek(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getZonedDateTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: dayOfWeek called on non-ZonedDateTime"));
    }
    return Value(static_cast<double>(data->day_of_week()));
}

Value TemporalZonedDateTime::dayOfYear(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getZonedDateTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: dayOfYear called on non-ZonedDateTime"));
    }
    return Value(static_cast<double>(data->day_of_year()));
}

Value TemporalZonedDateTime::weekOfYear(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getZonedDateTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: weekOfYear called on non-ZonedDateTime"));
    }
    auto woy = data->week_of_year();
    if(woy.has_value()) {
        return Value(static_cast<double>(woy.value()));
    }
    return Value::undefined();
}

Value TemporalZonedDateTime::daysInMonth(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getZonedDateTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: daysInMonth called on non-ZonedDateTime"));
    }
    return Value(static_cast<double>(data->days_in_month()));
}

Value TemporalZonedDateTime::daysInYear(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getZonedDateTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: daysInYear called on non-ZonedDateTime"));
    }
    return Value(static_cast<double>(data->days_in_year()));
}

Value TemporalZonedDateTime::monthsInYear(const CallContext& ctx,
                                           const std::vector<Value>& args) {
    auto* data = getZonedDateTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: monthsInYear called on non-ZonedDateTime"));
    }
    return Value(static_cast<double>(data->months_in_year()));
}

Value TemporalZonedDateTime::inLeapYear(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getZonedDateTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: inLeapYear called on non-ZonedDateTime"));
    }
    return Value(data->in_leap_year());
}

Value TemporalZonedDateTime::calendarId(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getZonedDateTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: calendarId called on non-ZonedDateTime"));
    }
    return Value(std::string(data->calendar().identifier()));
}

// ===== Time Getters =====

Value TemporalZonedDateTime::hour(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getZonedDateTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: hour called on non-ZonedDateTime"));
    }
    return Value(static_cast<double>(data->hour()));
}

Value TemporalZonedDateTime::minute(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getZonedDateTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: minute called on non-ZonedDateTime"));
    }
    return Value(static_cast<double>(data->minute()));
}

Value TemporalZonedDateTime::second(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getZonedDateTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: second called on non-ZonedDateTime"));
    }
    return Value(static_cast<double>(data->second()));
}

Value TemporalZonedDateTime::millisecond(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getZonedDateTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: millisecond called on non-ZonedDateTime"));
    }
    return Value(static_cast<double>(data->millisecond()));
}

Value TemporalZonedDateTime::microsecond(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getZonedDateTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: microsecond called on non-ZonedDateTime"));
    }
    return Value(static_cast<double>(data->microsecond()));
}

Value TemporalZonedDateTime::nanosecond(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getZonedDateTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: nanosecond called on non-ZonedDateTime"));
    }
    return Value(static_cast<double>(data->nanosecond()));
}

// ===== Timezone Getters =====

Value TemporalZonedDateTime::timeZoneId(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getZonedDateTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: timeZoneId called on non-ZonedDateTime"));
    }
    return Value(data->timezone().identifier());
}

Value TemporalZonedDateTime::offset(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getZonedDateTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: offset called on non-ZonedDateTime"));
    }
    auto result = data->offset();
    if(!result.is_ok()) {
        throwTemporalError(std::move(result).err().value());
    }
    return Value(std::move(result).ok().value());
}

Value TemporalZonedDateTime::offsetNanoseconds(const CallContext& ctx,
                                                const std::vector<Value>& args) {
    auto* data = getZonedDateTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: offsetNanoseconds called on non-ZonedDateTime"));
    }
    return Value(static_cast<double>(data->offset_nanoseconds()));
}

Value TemporalZonedDateTime::epochMilliseconds(const CallContext& ctx,
                                                const std::vector<Value>& args) {
    auto* data = getZonedDateTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: epochMilliseconds called on non-ZonedDateTime"));
    }
    return Value(static_cast<double>(data->epoch_milliseconds()));
}

Value TemporalZonedDateTime::epochNanoseconds(const CallContext& ctx,
                                               const std::vector<Value>& args) {
    auto* data = getZonedDateTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: epochNanoseconds called on non-ZonedDateTime"));
    }
    // Without BigInt, approximate from epoch_milliseconds * 1e6
    return Value(static_cast<double>(data->epoch_milliseconds()) * 1e6);
}

// ===== Mutation =====

Value TemporalZonedDateTime::with(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getZonedDateTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: with called on non-ZonedDateTime"));
    }

    if(args.empty() || (!args[0].isObject() && !args[0].isFunction())) {
        throw rift::core::JavaScriptException(Value(
            "TypeError: Temporal.ZonedDateTime.prototype.with requires an object argument"));
    }

    auto* obj = args[0].getObject();
    temporal_rs::PartialDate date_partial{};
    temporal_rs::PartialTime time_partial{};

    Value y = obj->getProperty("year");
    Value mo = obj->getProperty("month");
    Value mc = obj->getProperty("monthCode");
    Value d = obj->getProperty("day");

    if(!y.isUndefined()) date_partial.year = static_cast<int32_t>(y.toNumber());
    if(!mo.isUndefined()) date_partial.month = static_cast<uint8_t>(mo.toNumber());
    if(!d.isUndefined()) date_partial.day = static_cast<uint8_t>(d.toNumber());

    std::string month_code_str;
    if(!mc.isUndefined()) {
        month_code_str = mc.toString();
        date_partial.month_code = month_code_str;
    }

    date_partial.calendar = data->calendar().kind();

    Value h = obj->getProperty("hour");
    Value mi = obj->getProperty("minute");
    Value s = obj->getProperty("second");
    Value ms = obj->getProperty("millisecond");
    Value us = obj->getProperty("microsecond");
    Value ns = obj->getProperty("nanosecond");

    if(!h.isUndefined()) time_partial.hour = static_cast<uint8_t>(h.toNumber());
    if(!mi.isUndefined()) time_partial.minute = static_cast<uint8_t>(mi.toNumber());
    if(!s.isUndefined()) time_partial.second = static_cast<uint8_t>(s.toNumber());
    if(!ms.isUndefined()) time_partial.millisecond = static_cast<uint16_t>(ms.toNumber());
    if(!us.isUndefined()) time_partial.microsecond = static_cast<uint16_t>(us.toNumber());
    if(!ns.isUndefined()) time_partial.nanosecond = static_cast<uint16_t>(ns.toNumber());

    temporal_rs::PartialZonedDateTime partial{date_partial, time_partial, std::nullopt,
                                               std::nullopt};

    auto result = data->with(partial, std::nullopt, std::nullopt, std::nullopt);
    if(!result.is_ok()) {
        throwTemporalError(std::move(result).err().value());
    }

    return wrapZonedDateTime(std::move(result).ok().value());
}

Value TemporalZonedDateTime::withTimeZone(const CallContext& ctx,
                                           const std::vector<Value>& args) {
    auto* data = getZonedDateTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: withTimeZone called on non-ZonedDateTime"));
    }

    if(args.empty()) {
        throw rift::core::JavaScriptException(Value(
            "TypeError: Temporal.ZonedDateTime.prototype.withTimeZone requires an argument"));
    }

    std::string tz_str = args[0].toString();
    auto tz_result = temporal_rs::TimeZone::try_from_str(tz_str);
    if(!tz_result.is_ok()) {
        throwTemporalError(std::move(tz_result).err().value());
    }

    auto result = data->with_timezone(std::move(tz_result).ok().value());
    if(!result.is_ok()) {
        throwTemporalError(std::move(result).err().value());
    }

    return wrapZonedDateTime(std::move(result).ok().value());
}

Value TemporalZonedDateTime::withCalendar(const CallContext& ctx,
                                           const std::vector<Value>& args) {
    auto* data = getZonedDateTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: withCalendar called on non-ZonedDateTime"));
    }

    if(args.empty() || !args[0].isString()) {
        throw rift::core::JavaScriptException(Value(
            "TypeError: Temporal.ZonedDateTime.prototype.withCalendar requires a string"));
    }

    auto cal = temporal_rs::AnyCalendarKind::get_for_str(args[0].getString());
    if(!cal.has_value()) {
        throw rift::core::JavaScriptException(
            Value("RangeError: Invalid calendar: " + args[0].getString()));
    }

    auto zdt = data->with_calendar(cal.value());
    return wrapZonedDateTime(std::move(zdt));
}

Value TemporalZonedDateTime::withPlainTime(const CallContext& ctx,
                                            const std::vector<Value>& args) {
    auto* data = getZonedDateTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: withPlainTime called on non-ZonedDateTime"));
    }

    const temporal_rs::PlainTime* time_ptr = nullptr;
    if(!args.empty() && (args[0].isObject() || args[0].isFunction())) {
        time_ptr = PlainTimeRegistry::get(args[0].getObject());
    }

    auto result = data->with_plain_time(time_ptr);
    if(!result.is_ok()) {
        throwTemporalError(std::move(result).err().value());
    }

    return wrapZonedDateTime(std::move(result).ok().value());
}

// ===== Arithmetic =====

Value TemporalZonedDateTime::add(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getZonedDateTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: add called on non-ZonedDateTime"));
    }

    if(args.empty()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Temporal.ZonedDateTime.prototype.add requires an argument"));
    }

    auto dur = parseDurationForZonedDateTime(args[0]);
    auto result = data->add(*dur, std::nullopt);
    if(!result.is_ok()) {
        throwTemporalError(std::move(result).err().value());
    }

    return wrapZonedDateTime(std::move(result).ok().value());
}

Value TemporalZonedDateTime::subtract(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getZonedDateTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: subtract called on non-ZonedDateTime"));
    }

    if(args.empty()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Temporal.ZonedDateTime.prototype.subtract requires an argument"));
    }

    auto dur = parseDurationForZonedDateTime(args[0]);
    auto result = data->subtract(*dur, std::nullopt);
    if(!result.is_ok()) {
        throwTemporalError(std::move(result).err().value());
    }

    return wrapZonedDateTime(std::move(result).ok().value());
}

// ===== Difference =====

Value TemporalZonedDateTime::until(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getZonedDateTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: until called on non-ZonedDateTime"));
    }

    if(args.empty()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Temporal.ZonedDateTime.prototype.until requires an argument"));
    }

    auto other = parseZonedDateTimeFromValue(args[0]);
    temporal_rs::DifferenceSettings settings{std::nullopt, std::nullopt, std::nullopt,
                                              std::nullopt};

    auto result = data->until(*other, settings);
    if(!result.is_ok()) {
        throwTemporalError(std::move(result).err().value());
    }

    return TemporalDuration::wrapDuration(std::move(result).ok().value());
}

Value TemporalZonedDateTime::since(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getZonedDateTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: since called on non-ZonedDateTime"));
    }

    if(args.empty()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Temporal.ZonedDateTime.prototype.since requires an argument"));
    }

    auto other = parseZonedDateTimeFromValue(args[0]);
    temporal_rs::DifferenceSettings settings{std::nullopt, std::nullopt, std::nullopt,
                                              std::nullopt};

    auto result = data->since(*other, settings);
    if(!result.is_ok()) {
        throwTemporalError(std::move(result).err().value());
    }

    return TemporalDuration::wrapDuration(std::move(result).ok().value());
}

// ===== Comparison =====

Value TemporalZonedDateTime::equals(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getZonedDateTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: equals called on non-ZonedDateTime"));
    }

    if(args.empty() || (!args[0].isObject() && !args[0].isFunction())) {
        return Value(false);
    }

    auto* other = ZonedDateTimeRegistry::get(args[0].getObject());
    if(!other) {
        return Value(false);
    }

    return Value(data->equals(*other));
}

// ===== Conversion =====

Value TemporalZonedDateTime::toInstant(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getZonedDateTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: toInstant called on non-ZonedDateTime"));
    }

    return TemporalInstant::wrapInstant(data->to_instant());
}

Value TemporalZonedDateTime::toPlainDate(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getZonedDateTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: toPlainDate called on non-ZonedDateTime"));
    }

    return TemporalPlainDate::wrapPlainDate(data->to_plain_date());
}

Value TemporalZonedDateTime::toPlainTime(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getZonedDateTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: toPlainTime called on non-ZonedDateTime"));
    }

    return TemporalPlainTime::wrapPlainTime(data->to_plain_time());
}

Value TemporalZonedDateTime::toPlainDateTime(const CallContext& ctx,
                                              const std::vector<Value>& args) {
    auto* data = getZonedDateTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: toPlainDateTime called on non-ZonedDateTime"));
    }

    return TemporalPlainDateTime::wrapPlainDateTime(data->to_plain_datetime());
}

// ===== Special =====

Value TemporalZonedDateTime::startOfDay(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getZonedDateTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: startOfDay called on non-ZonedDateTime"));
    }

    auto result = data->start_of_day();
    if(!result.is_ok()) {
        throwTemporalError(std::move(result).err().value());
    }

    return wrapZonedDateTime(std::move(result).ok().value());
}

Value TemporalZonedDateTime::hoursInDay(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getZonedDateTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: hoursInDay called on non-ZonedDateTime"));
    }

    auto result = data->hours_in_day();
    if(!result.is_ok()) {
        throwTemporalError(std::move(result).err().value());
    }

    return Value(std::move(result).ok().value());
}

// ===== String =====

Value TemporalZonedDateTime::toString(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getZonedDateTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: toString called on non-ZonedDateTime"));
    }

    temporal_rs::Precision precision{false, std::nullopt};
    temporal_rs::ToStringRoundingOptions rounding_opts{precision, std::nullopt, std::nullopt};

    auto result = data->to_ixdtf_string(
        temporal_rs::DisplayOffset::Auto, temporal_rs::DisplayTimeZone::Auto,
        temporal_rs::DisplayCalendar::Auto, rounding_opts);
    if(!result.is_ok()) {
        throwTemporalError(std::move(result).err().value());
    }

    return Value(std::move(result).ok().value());
}

Value TemporalZonedDateTime::toJSON(const CallContext& ctx, const std::vector<Value>& args) {
    return toString(ctx, args);
}

Value TemporalZonedDateTime::valueOf(const CallContext& ctx, const std::vector<Value>& args) {
    throw rift::core::JavaScriptException(
        Value("TypeError: Cannot convert a Temporal.ZonedDateTime to a primitive value"));
}

// ===== Private =====

JSObject* TemporalZonedDateTime::getGlobalPrototype() {
    return rift::core::BuiltinManager::getZonedDateTimePrototype();
}

}  // namespace rift::builtins
