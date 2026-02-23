#include "rift/builtins/temporal/plain_date.h"

#include "rift/builtins/builtin_manager.h"
#include "rift/builtins/temporal/duration.h"
#include "rift/builtins/temporal/plain_date_time.h"
#include "rift/builtins/temporal/plain_time.h"
#include "rift/builtins/temporal/zoned_date_time.h"
#include "rift/interpreter/javascript_exception.h"
#include "rift/interpreter/this_helpers.h"
#include "rift/memory/gc_protector.h"
#include "temporal_rs/AnyCalendarKind.hpp"
#include "temporal_rs/Calendar.hpp"
#include "temporal_rs/DifferenceSettings.hpp"
#include "temporal_rs/DisplayCalendar.hpp"
#include "temporal_rs/Duration.hpp"
#include "temporal_rs/PartialDate.hpp"
#include "temporal_rs/PlainDate.hpp"
#include "temporal_rs/PlainTime.hpp"
#include "temporal_rs/TimeZone.hpp"

// ============================================================================
// Temporal Proposal -- Temporal.PlainDate Objects (Sections 3.1-3.5)
// @spec https://tc39.es/proposal-temporal/#sec-temporal-plaindate-objects
//
// Temporal.PlainDate represents a calendar date without time or time zone
// (e.g. 2025-07-04). It holds ISO 8601 year, month, and day fields plus
// a calendar identifier.
//
// DEVIATION: The spec uses [[ISODate]] and [[Calendar]] internal slots.
// Rift delegates to temporal_rs (Rust FFI) and stores internal data in a
// static registry (PlainDateRegistry) mapping JSObject* -> unique_ptr<PlainDate>.
// ============================================================================

namespace rift::builtins {

using rift::core::extractThisObject;

// ============================================================================
// PlainDateRegistry
// NON-STANDARD: Static registry for PlainDate internal data.
// The spec stores data in [[ISODate]] (an ISO Date Record) and [[Calendar]].
// Rift uses a global unordered_map<JSObject*, unique_ptr<PlainDate>>.
// ============================================================================

std::unordered_map<JSObject*, std::unique_ptr<temporal_rs::PlainDate>> PlainDateRegistry::registry_;

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

// NON-STANDARD: Internal helper to extract PlainDate data from the receiver.
static temporal_rs::PlainDate* getPlainDateData(const CallContext& ctx) {
    auto* obj = extractThisObject(ctx);
    if(obj) {
        return PlainDateRegistry::get(obj);
    }
    return nullptr;
}

// NON-STANDARD: Internal helper to convert temporal_rs::TemporalError
// into the appropriate JavaScript exception type.
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

// NON-STANDARD: Parses a PlainDate from a JS value.
// Loosely corresponds to ToTemporalDate (3.5.4).
// @spec https://tc39.es/proposal-temporal/#sec-temporal-totemporaldate
// SIMPLIFIED: Property bag parsing is minimal.
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

        if(!y.isUndefined())
            partial.year = static_cast<int32_t>(y.toNumber());
        if(!mo.isUndefined())
            partial.month = static_cast<uint8_t>(mo.toNumber());
        if(!d.isUndefined())
            partial.day = static_cast<uint8_t>(d.toNumber());
        if(!ey.isUndefined())
            partial.era_year = static_cast<int32_t>(ey.toNumber());

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

// NON-STANDARD: Parses a Duration from a JS value for PlainDate arithmetic.
// Loosely corresponds to ToTemporalDurationRecord.
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

        if(!y.isUndefined())
            partial.years = static_cast<int64_t>(y.toNumber());
        if(!mo.isUndefined())
            partial.months = static_cast<int64_t>(mo.toNumber());
        if(!w.isUndefined())
            partial.weeks = static_cast<int64_t>(w.toNumber());
        if(!d.isUndefined())
            partial.days = static_cast<int64_t>(d.toNumber());
        if(!h.isUndefined())
            partial.hours = static_cast<int64_t>(h.toNumber());
        if(!mi.isUndefined())
            partial.minutes = static_cast<int64_t>(mi.toNumber());
        if(!s.isUndefined())
            partial.seconds = static_cast<int64_t>(s.toNumber());
        if(!ms.isUndefined())
            partial.milliseconds = static_cast<int64_t>(ms.toNumber());
        if(!us.isUndefined())
            partial.microseconds = us.toNumber();
        if(!ns.isUndefined())
            partial.nanoseconds = ns.toNumber();

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

// NON-STANDARD: Wraps a temporal_rs::PlainDate in a JS object with prototype chain.
// Corresponds to CreateTemporalDate in the spec.
// @spec https://tc39.es/proposal-temporal/#sec-temporal-createtemporaldate
Value TemporalPlainDate::wrapPlainDate(std::unique_ptr<temporal_rs::PlainDate> date) {
    auto* proto = getGlobalPrototype();
    auto* js_obj = getObjectFactory()->createJSObject(proto);
    rift::memory::GCProtector protect(js_obj, getObjectFactory()->getObjectManager());

    PlainDateRegistry::store(js_obj, std::move(date));

    return Value(js_obj);
}

// 3.2 Properties of the Temporal.PlainDate Constructor
// @spec https://tc39.es/proposal-temporal/#sec-properties-of-temporal-plaindate-constructor
void TemporalPlainDate::setupStaticMethods(JSObject* constructor,
                                           rift::memory::ObjectFactory* factory) {
    RIFT_STATIC_METHOD(constructor, "from", 1, TemporalPlainDate::from);
    RIFT_STATIC_METHOD(constructor, "compare", 2, TemporalPlainDate::compare);
}

// 3.3 Properties of the Temporal.PlainDate Prototype Object
// @spec https://tc39.es/proposal-temporal/#sec-properties-of-temporal-plaindate-prototype-object
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
    RIFT_METHOD(prototype, "with", 1, TemporalPlainDate::with);
    RIFT_METHOD(prototype, "withCalendar", 1, TemporalPlainDate::withCalendar);

    // Arithmetic
    RIFT_METHOD(prototype, "add", 1, TemporalPlainDate::add);
    RIFT_METHOD(prototype, "subtract", 1, TemporalPlainDate::subtract);

    // Difference
    RIFT_METHOD(prototype, "until", 1, TemporalPlainDate::until);
    RIFT_METHOD(prototype, "since", 1, TemporalPlainDate::since);

    // Comparison
    RIFT_METHOD(prototype, "equals", 1, TemporalPlainDate::equals);

    // Conversion
    RIFT_METHOD(prototype, "toPlainDateTime", 0, TemporalPlainDate::toPlainDateTime);
    RIFT_METHOD(prototype, "toZonedDateTime", 1, TemporalPlainDate::toZonedDateTime);

    // String
    RIFT_METHOD(prototype, "toString", 0, TemporalPlainDate::toString);
    RIFT_METHOD(prototype, "toLocaleString", 0, TemporalPlainDate::toLocaleString);
    RIFT_METHOD(prototype, "toJSON", 0, TemporalPlainDate::toJSON);
    RIFT_METHOD(prototype, "valueOf", 0, TemporalPlainDate::valueOf);
}

// 3.1.1 Temporal.PlainDate ( isoYear, isoMonth, isoDay [ , calendar ] )
// @spec https://tc39.es/proposal-temporal/#sec-temporal.plaindate
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

// 3.2.2 Temporal.PlainDate.from ( item [ , options ] )
// @spec https://tc39.es/proposal-temporal/#sec-temporal.plaindate.from
Value TemporalPlainDate::from(const CallContext& ctx, const std::vector<Value>& args) {
    if(args.empty()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Temporal.PlainDate.from requires an argument"));
    }

    auto date = parsePlainDateFromValue(args[0]);
    return wrapPlainDate(std::move(date));
}

// 3.2.3 Temporal.PlainDate.compare ( one, two )
// @spec https://tc39.es/proposal-temporal/#sec-temporal.plaindate.compare
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

// ============================================================================
// Prototype Getters (3.3.3-3.3.15)
// DEVIATION: All getters delegate to temporal_rs library for field access.
// ============================================================================

// 3.3.4 get Temporal.PlainDate.prototype.year
// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.plaindate.prototype.year
Value TemporalPlainDate::year(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainDateData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(Value("TypeError: year called on non-PlainDate"));
    }
    return Value(static_cast<double>(data->year()));
}

// 3.3.5 get Temporal.PlainDate.prototype.month
// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.plaindate.prototype.month
Value TemporalPlainDate::month(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainDateData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(Value("TypeError: month called on non-PlainDate"));
    }
    return Value(static_cast<double>(data->month()));
}

// 3.3.6 get Temporal.PlainDate.prototype.monthCode
// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.plaindate.prototype.monthcode
Value TemporalPlainDate::monthCode(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainDateData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: monthCode called on non-PlainDate"));
    }
    return Value(data->month_code());
}

// 3.3.7 get Temporal.PlainDate.prototype.day
// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.plaindate.prototype.day
Value TemporalPlainDate::day(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainDateData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(Value("TypeError: day called on non-PlainDate"));
    }
    return Value(static_cast<double>(data->day()));
}

// 3.3.8 get Temporal.PlainDate.prototype.dayOfWeek
// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.plaindate.prototype.dayofweek
Value TemporalPlainDate::dayOfWeek(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainDateData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: dayOfWeek called on non-PlainDate"));
    }
    return Value(static_cast<double>(data->day_of_week()));
}

// 3.3.9 get Temporal.PlainDate.prototype.dayOfYear
// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.plaindate.prototype.dayofyear
Value TemporalPlainDate::dayOfYear(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainDateData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: dayOfYear called on non-PlainDate"));
    }
    return Value(static_cast<double>(data->day_of_year()));
}

// 3.3.10 get Temporal.PlainDate.prototype.weekOfYear
// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.plaindate.prototype.weekofyear
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

// 3.3.12 get Temporal.PlainDate.prototype.daysInMonth
// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.plaindate.prototype.daysinmonth
Value TemporalPlainDate::daysInMonth(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainDateData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: daysInMonth called on non-PlainDate"));
    }
    return Value(static_cast<double>(data->days_in_month()));
}

// 3.3.13 get Temporal.PlainDate.prototype.daysInYear
// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.plaindate.prototype.daysinyear
Value TemporalPlainDate::daysInYear(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainDateData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: daysInYear called on non-PlainDate"));
    }
    return Value(static_cast<double>(data->days_in_year()));
}

// 3.3.14 get Temporal.PlainDate.prototype.monthsInYear
// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.plaindate.prototype.monthsinyear
Value TemporalPlainDate::monthsInYear(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainDateData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: monthsInYear called on non-PlainDate"));
    }
    return Value(static_cast<double>(data->months_in_year()));
}

// 3.3.15 get Temporal.PlainDate.prototype.inLeapYear
// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.plaindate.prototype.inleapyear
Value TemporalPlainDate::inLeapYear(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainDateData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: inLeapYear called on non-PlainDate"));
    }
    return Value(data->in_leap_year());
}

// 3.3.3 get Temporal.PlainDate.prototype.calendarId
// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.plaindate.prototype.calendarid
Value TemporalPlainDate::calendarId(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainDateData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: calendarId called on non-PlainDate"));
    }
    return Value(std::string(data->calendar().identifier()));
}

// 3.3.16 Temporal.PlainDate.prototype.with ( temporalDateLike [ , options ] )
// @spec https://tc39.es/proposal-temporal/#sec-temporal.plaindate.prototype.with
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

    if(!y.isUndefined())
        partial.year = static_cast<int32_t>(y.toNumber());
    if(!mo.isUndefined())
        partial.month = static_cast<uint8_t>(mo.toNumber());
    if(!d.isUndefined())
        partial.day = static_cast<uint8_t>(d.toNumber());

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

// 3.3.18 Temporal.PlainDate.prototype.add ( temporalDurationLike [ , options ] )
// @spec https://tc39.es/proposal-temporal/#sec-temporal.plaindate.prototype.add
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

// 3.3.19 Temporal.PlainDate.prototype.subtract ( temporalDurationLike [ , options ] )
// @spec https://tc39.es/proposal-temporal/#sec-temporal.plaindate.prototype.subtract
Value TemporalPlainDate::subtract(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainDateData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(Value("TypeError: subtract called on non-PlainDate"));
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

// 3.3.20 Temporal.PlainDate.prototype.until ( other [ , options ] )
// @spec https://tc39.es/proposal-temporal/#sec-temporal.plaindate.prototype.until
// INCOMPLETE: options parameter not processed.
Value TemporalPlainDate::until(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainDateData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(Value("TypeError: until called on non-PlainDate"));
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

// 3.3.21 Temporal.PlainDate.prototype.since ( other [ , options ] )
// @spec https://tc39.es/proposal-temporal/#sec-temporal.plaindate.prototype.since
// INCOMPLETE: options parameter not processed.
Value TemporalPlainDate::since(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainDateData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(Value("TypeError: since called on non-PlainDate"));
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

// 3.3.22 Temporal.PlainDate.prototype.equals ( other )
// @spec https://tc39.es/proposal-temporal/#sec-temporal.plaindate.prototype.equals
Value TemporalPlainDate::equals(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainDateData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(Value("TypeError: equals called on non-PlainDate"));
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

// 3.3.23 Temporal.PlainDate.prototype.toPlainDateTime ( [ temporalTime ] )
// @spec https://tc39.es/proposal-temporal/#sec-temporal.plaindate.prototype.toplaindatetime
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

// 3.3.24 Temporal.PlainDate.prototype.toZonedDateTime ( item )
// @spec https://tc39.es/proposal-temporal/#sec-temporal.plaindate.prototype.tozoneddatetime
// SIMPLIFIED: Limited timezone parsing.
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
        throw rift::core::JavaScriptException(Value("RangeError: Invalid timezone: " + tz_str));
    }
    auto tz = std::move(tz_result).ok().value();

    auto result = data->to_zoned_date_time(tz, time_ptr);
    if(!result.is_ok()) {
        throwTemporalError(std::move(result).err().value());
    }

    return TemporalZonedDateTime::wrapZonedDateTime(std::move(result).ok().value());
}

// 3.3.26 Temporal.PlainDate.prototype.toString ( [ options ] )
// @spec https://tc39.es/proposal-temporal/#sec-temporal.plaindate.prototype.tostring
Value TemporalPlainDate::toString(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainDateData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(Value("TypeError: toString called on non-PlainDate"));
    }

    return Value(data->to_ixdtf_string(temporal_rs::DisplayCalendar::Auto));
}

// 3.3.27 Temporal.PlainDate.prototype.toJSON ()
// @spec https://tc39.es/proposal-temporal/#sec-temporal.plaindate.prototype.tojson
Value TemporalPlainDate::toJSON(const CallContext& ctx, const std::vector<Value>& args) {
    return toString(ctx, args);
}

// 3.3.28 Temporal.PlainDate.prototype.valueOf ()
// @spec https://tc39.es/proposal-temporal/#sec-temporal.plaindate.prototype.valueof
// Always throws TypeError — Temporal types are not convertible to primitives.
Value TemporalPlainDate::valueOf(const CallContext& ctx, const std::vector<Value>& args) {
    throw rift::core::JavaScriptException(
        Value("TypeError: Cannot convert a Temporal.PlainDate to a primitive value"));
}

// ----------------------------------------------------------------------------
// 3.3.17 Temporal.PlainDate.prototype.withCalendar ( calendarLike )
// @spec https://tc39.es/proposal-temporal/#sec-temporal.plaindate.prototype.withcalendar
//
// Returns a new PlainDate with the same ISO date but a different calendar.
// ----------------------------------------------------------------------------
Value TemporalPlainDate::withCalendar(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainDateData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: withCalendar called on non-PlainDate"));
    }

    if(args.empty() || !args[0].isString()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Temporal.PlainDate.prototype.withCalendar requires a string"));
    }

    auto cal = temporal_rs::AnyCalendarKind::get_for_str(args[0].getString());
    if(!cal.has_value()) {
        throw rift::core::JavaScriptException(
            Value("RangeError: Invalid calendar: " + args[0].getString()));
    }

    auto pd = data->with_calendar(cal.value());
    return wrapPlainDate(std::move(pd));
}

// ----------------------------------------------------------------------------
// 3.3.25 Temporal.PlainDate.prototype.toLocaleString ( [ locales [ , options ] ] )
// @spec https://tc39.es/proposal-temporal/#sec-temporal.plaindate.prototype.tolocalestring
//
// SIMPLIFIED: No Intl support — delegates to toString().
// ----------------------------------------------------------------------------
Value TemporalPlainDate::toLocaleString(const CallContext& ctx, const std::vector<Value>& args) {
    return toString(ctx, args);
}

JSObject* TemporalPlainDate::getGlobalPrototype() {
    return rift::core::BuiltinManager::getPlainDatePrototype();
}

}  // namespace rift::builtins
