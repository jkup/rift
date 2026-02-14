#include "rift/builtins/temporal/plain_date_time.h"

#include "temporal_rs/AnyCalendarKind.hpp"
#include "temporal_rs/Calendar.hpp"
#include "temporal_rs/DifferenceSettings.hpp"
#include "temporal_rs/DisplayCalendar.hpp"
#include "temporal_rs/Duration.hpp"
#include "temporal_rs/PartialDate.hpp"
#include "temporal_rs/PartialDateTime.hpp"
#include "temporal_rs/PartialTime.hpp"
#include "temporal_rs/PlainDateTime.hpp"
#include "temporal_rs/Precision.hpp"
#include "temporal_rs/ToStringRoundingOptions.hpp"

#include "rift/builtins/temporal/duration.h"
#include "rift/builtins/temporal/plain_date.h"
#include "rift/builtins/temporal/plain_time.h"
#include "rift/core/engine/builtin_manager.h"
#include "rift/core/engine/javascript_exception.h"
#include "rift/core/engine/this_helpers.h"
#include "rift/memory/gc_protector.h"

namespace rift::builtins {

using rift::core::extractThisObject;

// ===== PlainDateTimeRegistry =====

std::unordered_map<JSObject*, std::unique_ptr<temporal_rs::PlainDateTime>>
    PlainDateTimeRegistry::registry_;

void PlainDateTimeRegistry::store(JSObject* obj,
                                   std::unique_ptr<temporal_rs::PlainDateTime> data) {
    registry_[obj] = std::move(data);
}

temporal_rs::PlainDateTime* PlainDateTimeRegistry::get(JSObject* obj) {
    auto it = registry_.find(obj);
    if(it != registry_.end()) {
        return it->second.get();
    }
    return nullptr;
}

void PlainDateTimeRegistry::remove(JSObject* obj) {
    registry_.erase(obj);
}

void PlainDateTimeRegistry::clear() {
    registry_.clear();
}

// ===== Helper: Get PlainDateTime data from this =====

static temporal_rs::PlainDateTime* getPlainDateTimeData(const CallContext& ctx) {
    auto* obj = extractThisObject(ctx);
    if(obj) {
        return PlainDateTimeRegistry::get(obj);
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

// ===== Helper: Parse a PlainDateTime from a JS Value =====

static std::unique_ptr<temporal_rs::PlainDateTime> parsePlainDateTimeFromValue(const Value& val) {
    if(val.isObject() || val.isFunction()) {
        auto* data = PlainDateTimeRegistry::get(val.getObject());
        if(data) {
            return data->clone();
        }

        // Property bag
        auto* obj = val.getObject();
        temporal_rs::PartialDate partial_date{};
        temporal_rs::PartialTime partial_time{};

        // Date fields
        Value y = obj->getProperty("year");
        Value mo = obj->getProperty("month");
        Value mc = obj->getProperty("monthCode");
        Value d = obj->getProperty("day");
        Value e = obj->getProperty("era");
        Value ey = obj->getProperty("eraYear");

        if(!y.isUndefined()) partial_date.year = static_cast<int32_t>(y.toNumber());
        if(!mo.isUndefined()) partial_date.month = static_cast<uint8_t>(mo.toNumber());
        if(!d.isUndefined()) partial_date.day = static_cast<uint8_t>(d.toNumber());
        if(!ey.isUndefined()) partial_date.era_year = static_cast<int32_t>(ey.toNumber());

        std::string month_code_str;
        std::string era_str;
        if(!mc.isUndefined()) {
            month_code_str = mc.toString();
            partial_date.month_code = month_code_str;
        }
        if(!e.isUndefined()) {
            era_str = e.toString();
            partial_date.era = era_str;
        }

        partial_date.calendar = temporal_rs::AnyCalendarKind::Iso;

        // Time fields
        Value h = obj->getProperty("hour");
        Value mi = obj->getProperty("minute");
        Value s = obj->getProperty("second");
        Value ms = obj->getProperty("millisecond");
        Value us = obj->getProperty("microsecond");
        Value ns = obj->getProperty("nanosecond");

        if(!h.isUndefined()) partial_time.hour = static_cast<uint8_t>(h.toNumber());
        if(!mi.isUndefined()) partial_time.minute = static_cast<uint8_t>(mi.toNumber());
        if(!s.isUndefined()) partial_time.second = static_cast<uint8_t>(s.toNumber());
        if(!ms.isUndefined()) partial_time.millisecond = static_cast<uint16_t>(ms.toNumber());
        if(!us.isUndefined()) partial_time.microsecond = static_cast<uint16_t>(us.toNumber());
        if(!ns.isUndefined()) partial_time.nanosecond = static_cast<uint16_t>(ns.toNumber());

        temporal_rs::PartialDateTime partial{partial_date, partial_time};

        auto result = temporal_rs::PlainDateTime::from_partial(partial, std::nullopt);
        if(!result.is_ok()) {
            throwTemporalError(std::move(result).err().value());
        }
        return std::move(result).ok().value();
    }

    // String
    std::string str = val.toString();
    auto result = temporal_rs::PlainDateTime::from_utf8(str);
    if(!result.is_ok()) {
        throwTemporalError(std::move(result).err().value());
    }
    return std::move(result).ok().value();
}

// ===== Helper: Parse a Duration for PlainDateTime arithmetic =====

static std::unique_ptr<temporal_rs::Duration> parseDurationForDateTime(const Value& val) {
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

// ===== Helper: Wrap a temporal_rs::PlainDateTime into a JS object =====

Value TemporalPlainDateTime::wrapPlainDateTime(std::unique_ptr<temporal_rs::PlainDateTime> dt) {
    auto* proto = getGlobalPrototype();
    auto* js_obj = getObjectFactory()->createJSObject(proto);
    rift::memory::GCProtector protect(js_obj, getObjectFactory()->getObjectManager());

    PlainDateTimeRegistry::store(js_obj, std::move(dt));

    return Value(js_obj);
}

// ===== Setup =====

void TemporalPlainDateTime::setupStaticMethods(JSObject* constructor,
                                                rift::memory::ObjectFactory* factory) {
    RIFT_STATIC_METHOD(constructor, "from", TemporalPlainDateTime::from);
    RIFT_STATIC_METHOD(constructor, "compare", TemporalPlainDateTime::compare);
}

void TemporalPlainDateTime::setupPrototypeMethods(JSObject* prototype,
                                                    rift::memory::ObjectFactory* factory) {
    // Date getters
    RIFT_GETTER(prototype, "year", TemporalPlainDateTime::year);
    RIFT_GETTER(prototype, "month", TemporalPlainDateTime::month);
    RIFT_GETTER(prototype, "monthCode", TemporalPlainDateTime::monthCode);
    RIFT_GETTER(prototype, "day", TemporalPlainDateTime::day);
    RIFT_GETTER(prototype, "dayOfWeek", TemporalPlainDateTime::dayOfWeek);
    RIFT_GETTER(prototype, "dayOfYear", TemporalPlainDateTime::dayOfYear);
    RIFT_GETTER(prototype, "weekOfYear", TemporalPlainDateTime::weekOfYear);
    RIFT_GETTER(prototype, "daysInMonth", TemporalPlainDateTime::daysInMonth);
    RIFT_GETTER(prototype, "daysInYear", TemporalPlainDateTime::daysInYear);
    RIFT_GETTER(prototype, "monthsInYear", TemporalPlainDateTime::monthsInYear);
    RIFT_GETTER(prototype, "inLeapYear", TemporalPlainDateTime::inLeapYear);
    RIFT_GETTER(prototype, "calendarId", TemporalPlainDateTime::calendarId);

    // Time getters
    RIFT_GETTER(prototype, "hour", TemporalPlainDateTime::hour);
    RIFT_GETTER(prototype, "minute", TemporalPlainDateTime::minute);
    RIFT_GETTER(prototype, "second", TemporalPlainDateTime::second);
    RIFT_GETTER(prototype, "millisecond", TemporalPlainDateTime::millisecond);
    RIFT_GETTER(prototype, "microsecond", TemporalPlainDateTime::microsecond);
    RIFT_GETTER(prototype, "nanosecond", TemporalPlainDateTime::nanosecond);

    // Mutation
    RIFT_METHOD(prototype, "with", TemporalPlainDateTime::with);
    RIFT_METHOD(prototype, "withTime", TemporalPlainDateTime::withTime);

    // Arithmetic
    RIFT_METHOD(prototype, "add", TemporalPlainDateTime::add);
    RIFT_METHOD(prototype, "subtract", TemporalPlainDateTime::subtract);

    // Difference
    RIFT_METHOD(prototype, "until", TemporalPlainDateTime::until);
    RIFT_METHOD(prototype, "since", TemporalPlainDateTime::since);

    // Comparison
    RIFT_METHOD(prototype, "equals", TemporalPlainDateTime::equals);

    // Conversion
    RIFT_METHOD(prototype, "toPlainDate", TemporalPlainDateTime::toPlainDate);
    RIFT_METHOD(prototype, "toPlainTime", TemporalPlainDateTime::toPlainTime);

    // String
    RIFT_METHOD(prototype, "toString", TemporalPlainDateTime::toString);
    RIFT_METHOD(prototype, "toJSON", TemporalPlainDateTime::toJSON);
    RIFT_METHOD(prototype, "valueOf", TemporalPlainDateTime::valueOf);
}

// ===== Constructor =====

Value TemporalPlainDateTime::constructor(const CallContext& ctx, const std::vector<Value>& args) {
    if(args.size() < 3) {
        throw rift::core::JavaScriptException(Value(
            "TypeError: Temporal.PlainDateTime requires at least year, month, and day"));
    }

    int32_t year_val = static_cast<int32_t>(args[0].toNumber());
    uint8_t month_val = static_cast<uint8_t>(args[1].toNumber());
    uint8_t day_val = static_cast<uint8_t>(args[2].toNumber());
    uint8_t hour_val = args.size() > 3 ? static_cast<uint8_t>(args[3].toNumber()) : 0;
    uint8_t minute_val = args.size() > 4 ? static_cast<uint8_t>(args[4].toNumber()) : 0;
    uint8_t second_val = args.size() > 5 ? static_cast<uint8_t>(args[5].toNumber()) : 0;
    uint16_t ms_val = args.size() > 6 ? static_cast<uint16_t>(args[6].toNumber()) : 0;
    uint16_t us_val = args.size() > 7 ? static_cast<uint16_t>(args[7].toNumber()) : 0;
    uint16_t ns_val = args.size() > 8 ? static_cast<uint16_t>(args[8].toNumber()) : 0;

    temporal_rs::AnyCalendarKind calendar = temporal_rs::AnyCalendarKind::Iso;
    if(args.size() > 9 && args[9].isString()) {
        auto cal = temporal_rs::AnyCalendarKind::get_for_str(args[9].getString());
        if(cal.has_value()) {
            calendar = cal.value();
        } else {
            throw rift::core::JavaScriptException(
                Value("RangeError: Invalid calendar: " + args[9].getString()));
        }
    }

    auto result = temporal_rs::PlainDateTime::try_new(year_val, month_val, day_val,
                                                       hour_val, minute_val, second_val,
                                                       ms_val, us_val, ns_val, calendar);
    if(!result.is_ok()) {
        throwTemporalError(std::move(result).err().value());
    }

    return wrapPlainDateTime(std::move(result).ok().value());
}

// ===== Static Methods =====

Value TemporalPlainDateTime::from(const CallContext& ctx, const std::vector<Value>& args) {
    if(args.empty()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Temporal.PlainDateTime.from requires an argument"));
    }

    auto dt = parsePlainDateTimeFromValue(args[0]);
    return wrapPlainDateTime(std::move(dt));
}

Value TemporalPlainDateTime::compare(const CallContext& ctx, const std::vector<Value>& args) {
    if(args.size() < 2) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Temporal.PlainDateTime.compare requires two arguments"));
    }

    auto dt_one = parsePlainDateTimeFromValue(args[0]);
    auto dt_two = parsePlainDateTimeFromValue(args[1]);

    int8_t cmp = temporal_rs::PlainDateTime::compare(*dt_one, *dt_two);
    return Value(static_cast<double>(cmp));
}

// ===== Date Getters =====

Value TemporalPlainDateTime::year(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainDateTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: year called on non-PlainDateTime"));
    }
    return Value(static_cast<double>(data->year()));
}

Value TemporalPlainDateTime::month(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainDateTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: month called on non-PlainDateTime"));
    }
    return Value(static_cast<double>(data->month()));
}

Value TemporalPlainDateTime::monthCode(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainDateTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: monthCode called on non-PlainDateTime"));
    }
    return Value(data->month_code());
}

Value TemporalPlainDateTime::day(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainDateTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: day called on non-PlainDateTime"));
    }
    return Value(static_cast<double>(data->day()));
}

Value TemporalPlainDateTime::dayOfWeek(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainDateTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: dayOfWeek called on non-PlainDateTime"));
    }
    return Value(static_cast<double>(data->day_of_week()));
}

Value TemporalPlainDateTime::dayOfYear(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainDateTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: dayOfYear called on non-PlainDateTime"));
    }
    return Value(static_cast<double>(data->day_of_year()));
}

Value TemporalPlainDateTime::weekOfYear(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainDateTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: weekOfYear called on non-PlainDateTime"));
    }
    auto woy = data->week_of_year();
    if(woy.has_value()) {
        return Value(static_cast<double>(woy.value()));
    }
    return Value::undefined();
}

Value TemporalPlainDateTime::daysInMonth(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainDateTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: daysInMonth called on non-PlainDateTime"));
    }
    return Value(static_cast<double>(data->days_in_month()));
}

Value TemporalPlainDateTime::daysInYear(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainDateTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: daysInYear called on non-PlainDateTime"));
    }
    return Value(static_cast<double>(data->days_in_year()));
}

Value TemporalPlainDateTime::monthsInYear(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainDateTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: monthsInYear called on non-PlainDateTime"));
    }
    return Value(static_cast<double>(data->months_in_year()));
}

Value TemporalPlainDateTime::inLeapYear(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainDateTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: inLeapYear called on non-PlainDateTime"));
    }
    return Value(data->in_leap_year());
}

Value TemporalPlainDateTime::calendarId(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainDateTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: calendarId called on non-PlainDateTime"));
    }
    return Value(std::string(data->calendar().identifier()));
}

// ===== Time Getters =====

Value TemporalPlainDateTime::hour(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainDateTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: hour called on non-PlainDateTime"));
    }
    return Value(static_cast<double>(data->hour()));
}

Value TemporalPlainDateTime::minute(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainDateTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: minute called on non-PlainDateTime"));
    }
    return Value(static_cast<double>(data->minute()));
}

Value TemporalPlainDateTime::second(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainDateTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: second called on non-PlainDateTime"));
    }
    return Value(static_cast<double>(data->second()));
}

Value TemporalPlainDateTime::millisecond(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainDateTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: millisecond called on non-PlainDateTime"));
    }
    return Value(static_cast<double>(data->millisecond()));
}

Value TemporalPlainDateTime::microsecond(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainDateTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: microsecond called on non-PlainDateTime"));
    }
    return Value(static_cast<double>(data->microsecond()));
}

Value TemporalPlainDateTime::nanosecond(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainDateTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: nanosecond called on non-PlainDateTime"));
    }
    return Value(static_cast<double>(data->nanosecond()));
}

// ===== Mutation =====

Value TemporalPlainDateTime::with(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainDateTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: with called on non-PlainDateTime"));
    }

    if(args.empty() || (!args[0].isObject() && !args[0].isFunction())) {
        throw rift::core::JavaScriptException(Value(
            "TypeError: Temporal.PlainDateTime.prototype.with requires an object argument"));
    }

    auto* obj = args[0].getObject();

    temporal_rs::PartialDate partial_date{};
    temporal_rs::PartialTime partial_time{};

    // Date fields
    Value y = obj->getProperty("year");
    Value mo = obj->getProperty("month");
    Value mc = obj->getProperty("monthCode");
    Value d = obj->getProperty("day");

    if(!y.isUndefined()) partial_date.year = static_cast<int32_t>(y.toNumber());
    if(!mo.isUndefined()) partial_date.month = static_cast<uint8_t>(mo.toNumber());
    if(!d.isUndefined()) partial_date.day = static_cast<uint8_t>(d.toNumber());

    std::string month_code_str;
    if(!mc.isUndefined()) {
        month_code_str = mc.toString();
        partial_date.month_code = month_code_str;
    }

    partial_date.calendar = data->calendar().kind();

    // Time fields
    Value h = obj->getProperty("hour");
    Value mi = obj->getProperty("minute");
    Value s = obj->getProperty("second");
    Value ms = obj->getProperty("millisecond");
    Value us = obj->getProperty("microsecond");
    Value ns = obj->getProperty("nanosecond");

    if(!h.isUndefined()) partial_time.hour = static_cast<uint8_t>(h.toNumber());
    if(!mi.isUndefined()) partial_time.minute = static_cast<uint8_t>(mi.toNumber());
    if(!s.isUndefined()) partial_time.second = static_cast<uint8_t>(s.toNumber());
    if(!ms.isUndefined()) partial_time.millisecond = static_cast<uint16_t>(ms.toNumber());
    if(!us.isUndefined()) partial_time.microsecond = static_cast<uint16_t>(us.toNumber());
    if(!ns.isUndefined()) partial_time.nanosecond = static_cast<uint16_t>(ns.toNumber());

    temporal_rs::PartialDateTime partial{partial_date, partial_time};

    auto result = data->with(partial, std::nullopt);
    if(!result.is_ok()) {
        throwTemporalError(std::move(result).err().value());
    }

    return wrapPlainDateTime(std::move(result).ok().value());
}

Value TemporalPlainDateTime::withTime(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainDateTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: withTime called on non-PlainDateTime"));
    }

    if(args.empty() || (!args[0].isObject() && !args[0].isFunction())) {
        // No argument or not a PlainTime => replace time with midnight
        auto result = data->with_time(nullptr);
        if(!result.is_ok()) {
            throwTemporalError(std::move(result).err().value());
        }
        return wrapPlainDateTime(std::move(result).ok().value());
    }

    auto* time_data = PlainTimeRegistry::get(args[0].getObject());
    if(!time_data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: withTime requires a Temporal.PlainTime argument"));
    }

    auto result = data->with_time(time_data);
    if(!result.is_ok()) {
        throwTemporalError(std::move(result).err().value());
    }

    return wrapPlainDateTime(std::move(result).ok().value());
}

// ===== Arithmetic =====

Value TemporalPlainDateTime::add(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainDateTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: add called on non-PlainDateTime"));
    }

    if(args.empty()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Temporal.PlainDateTime.prototype.add requires an argument"));
    }

    auto dur = parseDurationForDateTime(args[0]);
    auto result = data->add(*dur, std::nullopt);
    if(!result.is_ok()) {
        throwTemporalError(std::move(result).err().value());
    }

    return wrapPlainDateTime(std::move(result).ok().value());
}

Value TemporalPlainDateTime::subtract(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainDateTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: subtract called on non-PlainDateTime"));
    }

    if(args.empty()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Temporal.PlainDateTime.prototype.subtract requires an argument"));
    }

    auto dur = parseDurationForDateTime(args[0]);
    auto result = data->subtract(*dur, std::nullopt);
    if(!result.is_ok()) {
        throwTemporalError(std::move(result).err().value());
    }

    return wrapPlainDateTime(std::move(result).ok().value());
}

// ===== Difference =====

Value TemporalPlainDateTime::until(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainDateTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: until called on non-PlainDateTime"));
    }

    if(args.empty()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Temporal.PlainDateTime.prototype.until requires an argument"));
    }

    auto other = parsePlainDateTimeFromValue(args[0]);
    temporal_rs::DifferenceSettings settings{std::nullopt, std::nullopt, std::nullopt,
                                              std::nullopt};

    auto result = data->until(*other, settings);
    if(!result.is_ok()) {
        throwTemporalError(std::move(result).err().value());
    }

    return TemporalDuration::wrapDuration(std::move(result).ok().value());
}

Value TemporalPlainDateTime::since(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainDateTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: since called on non-PlainDateTime"));
    }

    if(args.empty()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Temporal.PlainDateTime.prototype.since requires an argument"));
    }

    auto other = parsePlainDateTimeFromValue(args[0]);
    temporal_rs::DifferenceSettings settings{std::nullopt, std::nullopt, std::nullopt,
                                              std::nullopt};

    auto result = data->since(*other, settings);
    if(!result.is_ok()) {
        throwTemporalError(std::move(result).err().value());
    }

    return TemporalDuration::wrapDuration(std::move(result).ok().value());
}

// ===== Comparison =====

Value TemporalPlainDateTime::equals(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainDateTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: equals called on non-PlainDateTime"));
    }

    if(args.empty() || (!args[0].isObject() && !args[0].isFunction())) {
        return Value(false);
    }

    auto* other = PlainDateTimeRegistry::get(args[0].getObject());
    if(!other) {
        return Value(false);
    }

    return Value(data->equals(*other));
}

// ===== Conversion =====

Value TemporalPlainDateTime::toPlainDate(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainDateTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: toPlainDate called on non-PlainDateTime"));
    }

    return TemporalPlainDate::wrapPlainDate(data->to_plain_date());
}

Value TemporalPlainDateTime::toPlainTime(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainDateTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: toPlainTime called on non-PlainDateTime"));
    }

    return TemporalPlainTime::wrapPlainTime(data->to_plain_time());
}

// ===== String =====

Value TemporalPlainDateTime::toString(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainDateTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: toString called on non-PlainDateTime"));
    }

    temporal_rs::ToStringRoundingOptions options{
        temporal_rs::Precision{false, std::nullopt}, std::nullopt, std::nullopt};

    auto result = data->to_ixdtf_string(options, temporal_rs::DisplayCalendar::Auto);
    if(!result.is_ok()) {
        throwTemporalError(std::move(result).err().value());
    }

    return Value(std::move(result).ok().value());
}

Value TemporalPlainDateTime::toJSON(const CallContext& ctx, const std::vector<Value>& args) {
    return toString(ctx, args);
}

Value TemporalPlainDateTime::valueOf(const CallContext& ctx, const std::vector<Value>& args) {
    throw rift::core::JavaScriptException(
        Value("TypeError: Cannot convert a Temporal.PlainDateTime to a primitive value"));
}

// ===== Private =====

JSObject* TemporalPlainDateTime::getGlobalPrototype() {
    return rift::core::BuiltinManager::getPlainDateTimePrototype();
}

}  // namespace rift::builtins
