#include "rift/builtins/temporal/plain_date.h"

#include "temporal_rs/AnyCalendarKind.hpp"
#include "temporal_rs/Calendar.hpp"
#include "temporal_rs/DifferenceSettings.hpp"
#include "temporal_rs/DisplayCalendar.hpp"
#include "temporal_rs/Duration.hpp"
#include "temporal_rs/PartialDate.hpp"
#include "temporal_rs/PlainDate.hpp"

#include "temporal_rs/PlainTime.hpp"
#include "temporal_rs/TimeZone.hpp"

#include "rift/builtins/temporal/duration.h"
#include "rift/builtins/temporal/plain_date_time.h"
#include "rift/builtins/temporal/plain_time.h"
#include "rift/builtins/temporal/zoned_date_time.h"
#include "rift/core/engine/builtin_manager.h"
#include "rift/core/engine/javascript_exception.h"
#include "rift/core/engine/this_helpers.h"
#include "rift/memory/gc_protector.h"

namespace rift::builtins {

using rift::core::extractThisObject;

// ===== PlainDateRegistry =====

std::unordered_map<JSObject*, std::unique_ptr<temporal_rs::PlainDate>>
    PlainDateRegistry::registry_;

void PlainDateRegistry::store(JSObject* obj, std::unique_ptr<temporal_rs::PlainDate> data) {
    registry_[obj] = std::move(data);
}

temporal_rs::PlainDate* PlainDateRegistry::get(JSObject* obj) {
    auto it = registry_.find(obj);
    if(it != registry_.end()) {
        return it->second.get();
    }
    return nullptr;
}

void PlainDateRegistry::remove(JSObject* obj) {
    registry_.erase(obj);
}

void PlainDateRegistry::clear() {
    registry_.clear();
}

// ===== Helper: Get PlainDate data from this =====

static temporal_rs::PlainDate* getPlainDateData(const CallContext& ctx) {
    auto* obj = extractThisObject(ctx);
    if(obj) {
        return PlainDateRegistry::get(obj);
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

// ===== Helper: Parse a PlainDate from a JS Value =====

static std::unique_ptr<temporal_rs::PlainDate> parsePlainDateFromValue(const Value& val) {
    if(val.isObject() || val.isFunction()) {
        auto* data = PlainDateRegistry::get(val.getObject());
        if(data) {
            return data->clone();
        }

        // Property bag
        auto* obj = val.getObject();
        temporal_rs::PartialDate partial{};

        Value y = obj->getProperty("year");
        Value mo = obj->getProperty("month");
        Value mc = obj->getProperty("monthCode");
        Value d = obj->getProperty("day");
        Value e = obj->getProperty("era");
        Value ey = obj->getProperty("eraYear");

        if(!y.isUndefined()) partial.year = static_cast<int32_t>(y.toNumber());
        if(!mo.isUndefined()) partial.month = static_cast<uint8_t>(mo.toNumber());
        if(!d.isUndefined()) partial.day = static_cast<uint8_t>(d.toNumber());
        if(!ey.isUndefined()) partial.era_year = static_cast<int32_t>(ey.toNumber());

        // month_code and era are string_view — keep backing strings alive
        std::string month_code_str;
        std::string era_str;
        if(!mc.isUndefined()) {
            month_code_str = mc.toString();
            partial.month_code = month_code_str;
        }
        if(!e.isUndefined()) {
            era_str = e.toString();
            partial.era = era_str;
        }

        partial.calendar = temporal_rs::AnyCalendarKind::Iso;

        auto result = temporal_rs::PlainDate::from_partial(partial, std::nullopt);
        if(!result.is_ok()) {
            throwTemporalError(std::move(result).err().value());
        }
        return std::move(result).ok().value();
    }

    // String
    std::string str = val.toString();
    auto result = temporal_rs::PlainDate::from_utf8(str);
    if(!result.is_ok()) {
        throwTemporalError(std::move(result).err().value());
    }
    return std::move(result).ok().value();
}

// ===== Helper: Parse a Duration for PlainDate arithmetic =====

static std::unique_ptr<temporal_rs::Duration> parseDurationForDate(const Value& val) {
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

// ===== Helper: Wrap a temporal_rs::PlainDate into a JS object =====

Value TemporalPlainDate::wrapPlainDate(std::unique_ptr<temporal_rs::PlainDate> date) {
    auto* proto = getGlobalPrototype();
    auto* js_obj = getObjectFactory()->createJSObject(proto);
    rift::memory::GCProtector protect(js_obj, getObjectFactory()->getObjectManager());

    PlainDateRegistry::store(js_obj, std::move(date));

    return Value(js_obj);
}

// ===== Setup =====

void TemporalPlainDate::setupStaticMethods(JSObject* constructor,
                                            rift::memory::ObjectFactory* factory) {
    RIFT_STATIC_METHOD(constructor, "from", TemporalPlainDate::from);
    RIFT_STATIC_METHOD(constructor, "compare", TemporalPlainDate::compare);
}

void TemporalPlainDate::setupPrototypeMethods(JSObject* prototype,
                                               rift::memory::ObjectFactory* factory) {
    // Getters
    RIFT_GETTER(prototype, "year", TemporalPlainDate::year);
    RIFT_GETTER(prototype, "month", TemporalPlainDate::month);
    RIFT_GETTER(prototype, "monthCode", TemporalPlainDate::monthCode);
    RIFT_GETTER(prototype, "day", TemporalPlainDate::day);
    RIFT_GETTER(prototype, "dayOfWeek", TemporalPlainDate::dayOfWeek);
    RIFT_GETTER(prototype, "dayOfYear", TemporalPlainDate::dayOfYear);
    RIFT_GETTER(prototype, "weekOfYear", TemporalPlainDate::weekOfYear);
    RIFT_GETTER(prototype, "daysInMonth", TemporalPlainDate::daysInMonth);
    RIFT_GETTER(prototype, "daysInYear", TemporalPlainDate::daysInYear);
    RIFT_GETTER(prototype, "monthsInYear", TemporalPlainDate::monthsInYear);
    RIFT_GETTER(prototype, "inLeapYear", TemporalPlainDate::inLeapYear);
    RIFT_GETTER(prototype, "calendarId", TemporalPlainDate::calendarId);

    // Mutation
    RIFT_METHOD(prototype, "with", TemporalPlainDate::with);

    // Arithmetic
    RIFT_METHOD(prototype, "add", TemporalPlainDate::add);
    RIFT_METHOD(prototype, "subtract", TemporalPlainDate::subtract);

    // Difference
    RIFT_METHOD(prototype, "until", TemporalPlainDate::until);
    RIFT_METHOD(prototype, "since", TemporalPlainDate::since);

    // Comparison
    RIFT_METHOD(prototype, "equals", TemporalPlainDate::equals);

    // Conversion
    RIFT_METHOD(prototype, "toPlainDateTime", TemporalPlainDate::toPlainDateTime);
    RIFT_METHOD(prototype, "toZonedDateTime", TemporalPlainDate::toZonedDateTime);

    // String
    RIFT_METHOD(prototype, "toString", TemporalPlainDate::toString);
    RIFT_METHOD(prototype, "toJSON", TemporalPlainDate::toJSON);
    RIFT_METHOD(prototype, "valueOf", TemporalPlainDate::valueOf);
}

// ===== Constructor =====

Value TemporalPlainDate::constructor(const CallContext& ctx, const std::vector<Value>& args) {
    if(args.size() < 3) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Temporal.PlainDate requires at least year, month, and day"));
    }

    int32_t year_val = static_cast<int32_t>(args[0].toNumber());
    uint8_t month_val = static_cast<uint8_t>(args[1].toNumber());
    uint8_t day_val = static_cast<uint8_t>(args[2].toNumber());

    temporal_rs::AnyCalendarKind calendar = temporal_rs::AnyCalendarKind::Iso;
    if(args.size() > 3 && args[3].isString()) {
        auto cal = temporal_rs::AnyCalendarKind::get_for_str(args[3].getString());
        if(cal.has_value()) {
            calendar = cal.value();
        } else {
            throw rift::core::JavaScriptException(
                Value("RangeError: Invalid calendar: " + args[3].getString()));
        }
    }

    auto result = temporal_rs::PlainDate::try_new(year_val, month_val, day_val, calendar);
    if(!result.is_ok()) {
        throwTemporalError(std::move(result).err().value());
    }

    return wrapPlainDate(std::move(result).ok().value());
}

// ===== Static Methods =====

Value TemporalPlainDate::from(const CallContext& ctx, const std::vector<Value>& args) {
    if(args.empty()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Temporal.PlainDate.from requires an argument"));
    }

    auto date = parsePlainDateFromValue(args[0]);
    return wrapPlainDate(std::move(date));
}

Value TemporalPlainDate::compare(const CallContext& ctx, const std::vector<Value>& args) {
    if(args.size() < 2) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Temporal.PlainDate.compare requires two arguments"));
    }

    auto date_one = parsePlainDateFromValue(args[0]);
    auto date_two = parsePlainDateFromValue(args[1]);

    int8_t cmp = temporal_rs::PlainDate::compare(*date_one, *date_two);
    return Value(static_cast<double>(cmp));
}

// ===== Prototype Getters =====

Value TemporalPlainDate::year(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainDateData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(Value("TypeError: year called on non-PlainDate"));
    }
    return Value(static_cast<double>(data->year()));
}

Value TemporalPlainDate::month(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainDateData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: month called on non-PlainDate"));
    }
    return Value(static_cast<double>(data->month()));
}

Value TemporalPlainDate::monthCode(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainDateData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: monthCode called on non-PlainDate"));
    }
    return Value(data->month_code());
}

Value TemporalPlainDate::day(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainDateData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(Value("TypeError: day called on non-PlainDate"));
    }
    return Value(static_cast<double>(data->day()));
}

Value TemporalPlainDate::dayOfWeek(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainDateData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: dayOfWeek called on non-PlainDate"));
    }
    return Value(static_cast<double>(data->day_of_week()));
}

Value TemporalPlainDate::dayOfYear(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainDateData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: dayOfYear called on non-PlainDate"));
    }
    return Value(static_cast<double>(data->day_of_year()));
}

Value TemporalPlainDate::weekOfYear(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainDateData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: weekOfYear called on non-PlainDate"));
    }
    auto woy = data->week_of_year();
    if(woy.has_value()) {
        return Value(static_cast<double>(woy.value()));
    }
    return Value::undefined();
}

Value TemporalPlainDate::daysInMonth(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainDateData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: daysInMonth called on non-PlainDate"));
    }
    return Value(static_cast<double>(data->days_in_month()));
}

Value TemporalPlainDate::daysInYear(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainDateData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: daysInYear called on non-PlainDate"));
    }
    return Value(static_cast<double>(data->days_in_year()));
}

Value TemporalPlainDate::monthsInYear(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainDateData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: monthsInYear called on non-PlainDate"));
    }
    return Value(static_cast<double>(data->months_in_year()));
}

Value TemporalPlainDate::inLeapYear(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainDateData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: inLeapYear called on non-PlainDate"));
    }
    return Value(data->in_leap_year());
}

Value TemporalPlainDate::calendarId(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainDateData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: calendarId called on non-PlainDate"));
    }
    return Value(std::string(data->calendar().identifier()));
}

// ===== Mutation =====

Value TemporalPlainDate::with(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainDateData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(Value("TypeError: with called on non-PlainDate"));
    }

    if(args.empty() || (!args[0].isObject() && !args[0].isFunction())) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Temporal.PlainDate.prototype.with requires an object argument"));
    }

    auto* obj = args[0].getObject();
    temporal_rs::PartialDate partial{};

    Value y = obj->getProperty("year");
    Value mo = obj->getProperty("month");
    Value mc = obj->getProperty("monthCode");
    Value d = obj->getProperty("day");

    if(!y.isUndefined()) partial.year = static_cast<int32_t>(y.toNumber());
    if(!mo.isUndefined()) partial.month = static_cast<uint8_t>(mo.toNumber());
    if(!d.isUndefined()) partial.day = static_cast<uint8_t>(d.toNumber());

    std::string month_code_str;
    if(!mc.isUndefined()) {
        month_code_str = mc.toString();
        partial.month_code = month_code_str;
    }

    partial.calendar = data->calendar().kind();

    auto result = data->with(partial, std::nullopt);
    if(!result.is_ok()) {
        throwTemporalError(std::move(result).err().value());
    }

    return wrapPlainDate(std::move(result).ok().value());
}

// ===== Arithmetic =====

Value TemporalPlainDate::add(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainDateData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(Value("TypeError: add called on non-PlainDate"));
    }

    if(args.empty()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Temporal.PlainDate.prototype.add requires an argument"));
    }

    auto dur = parseDurationForDate(args[0]);
    auto result = data->add(*dur, std::nullopt);
    if(!result.is_ok()) {
        throwTemporalError(std::move(result).err().value());
    }

    return wrapPlainDate(std::move(result).ok().value());
}

Value TemporalPlainDate::subtract(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainDateData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: subtract called on non-PlainDate"));
    }

    if(args.empty()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Temporal.PlainDate.prototype.subtract requires an argument"));
    }

    auto dur = parseDurationForDate(args[0]);
    auto result = data->subtract(*dur, std::nullopt);
    if(!result.is_ok()) {
        throwTemporalError(std::move(result).err().value());
    }

    return wrapPlainDate(std::move(result).ok().value());
}

// ===== Difference =====

Value TemporalPlainDate::until(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainDateData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: until called on non-PlainDate"));
    }

    if(args.empty()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Temporal.PlainDate.prototype.until requires an argument"));
    }

    auto other = parsePlainDateFromValue(args[0]);
    temporal_rs::DifferenceSettings settings{std::nullopt, std::nullopt, std::nullopt,
                                              std::nullopt};

    auto result = data->until(*other, settings);
    if(!result.is_ok()) {
        throwTemporalError(std::move(result).err().value());
    }

    return TemporalDuration::wrapDuration(std::move(result).ok().value());
}

Value TemporalPlainDate::since(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainDateData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: since called on non-PlainDate"));
    }

    if(args.empty()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Temporal.PlainDate.prototype.since requires an argument"));
    }

    auto other = parsePlainDateFromValue(args[0]);
    temporal_rs::DifferenceSettings settings{std::nullopt, std::nullopt, std::nullopt,
                                              std::nullopt};

    auto result = data->since(*other, settings);
    if(!result.is_ok()) {
        throwTemporalError(std::move(result).err().value());
    }

    return TemporalDuration::wrapDuration(std::move(result).ok().value());
}

// ===== Comparison =====

Value TemporalPlainDate::equals(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainDateData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: equals called on non-PlainDate"));
    }

    if(args.empty() || (!args[0].isObject() && !args[0].isFunction())) {
        return Value(false);
    }

    auto* other = PlainDateRegistry::get(args[0].getObject());
    if(!other) {
        return Value(false);
    }

    return Value(data->equals(*other));
}

// ===== Conversion =====

Value TemporalPlainDate::toPlainDateTime(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainDateData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: toPlainDateTime called on non-PlainDate"));
    }

    // Optional PlainTime argument (defaults to midnight if not provided)
    temporal_rs::PlainTime* time_ptr = nullptr;
    if(!args.empty() && (args[0].isObject() || args[0].isFunction())) {
        time_ptr = PlainTimeRegistry::get(args[0].getObject());
    }

    auto result = data->to_plain_date_time(time_ptr);
    if(!result.is_ok()) {
        throwTemporalError(std::move(result).err().value());
    }

    return TemporalPlainDateTime::wrapPlainDateTime(std::move(result).ok().value());
}

Value TemporalPlainDate::toZonedDateTime(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainDateData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: toZonedDateTime called on non-PlainDate"));
    }

    if(args.empty()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: toZonedDateTime requires a timezone argument"));
    }

    // Parse timezone string from the argument
    std::string tz_str;
    temporal_rs::PlainTime* time_ptr = nullptr;

    if(args[0].isString()) {
        // Simple string: timezone identifier
        tz_str = args[0].getString();
    } else if(args[0].isObject() || args[0].isFunction()) {
        // Object with timeZone property and optional plainTime
        auto* obj = args[0].getObject();
        Value tz_val = obj->getProperty("timeZone");
        if(!tz_val.isUndefined()) {
            tz_str = tz_val.toString();
        } else {
            throw rift::core::JavaScriptException(
                Value("TypeError: toZonedDateTime requires a timeZone property"));
        }

        Value time_val = obj->getProperty("plainTime");
        if(!time_val.isUndefined() && (time_val.isObject() || time_val.isFunction())) {
            time_ptr = PlainTimeRegistry::get(time_val.getObject());
        }
    } else {
        tz_str = args[0].toString();
    }

    auto tz_result = temporal_rs::TimeZone::try_from_str(tz_str);
    if(!tz_result.is_ok()) {
        throw rift::core::JavaScriptException(
            Value("RangeError: Invalid timezone: " + tz_str));
    }
    auto tz = std::move(tz_result).ok().value();

    auto result = data->to_zoned_date_time(tz, time_ptr);
    if(!result.is_ok()) {
        throwTemporalError(std::move(result).err().value());
    }

    return TemporalZonedDateTime::wrapZonedDateTime(std::move(result).ok().value());
}

// ===== String =====

Value TemporalPlainDate::toString(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainDateData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: toString called on non-PlainDate"));
    }

    return Value(data->to_ixdtf_string(temporal_rs::DisplayCalendar::Auto));
}

Value TemporalPlainDate::toJSON(const CallContext& ctx, const std::vector<Value>& args) {
    return toString(ctx, args);
}

Value TemporalPlainDate::valueOf(const CallContext& ctx, const std::vector<Value>& args) {
    throw rift::core::JavaScriptException(
        Value("TypeError: Cannot convert a Temporal.PlainDate to a primitive value"));
}

// ===== Private =====

JSObject* TemporalPlainDate::getGlobalPrototype() {
    return rift::core::BuiltinManager::getPlainDatePrototype();
}

}  // namespace rift::builtins
