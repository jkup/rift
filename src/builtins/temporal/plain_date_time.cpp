#include "rift/builtins/temporal/plain_date_time.h"

#include "rift/builtins/temporal/duration.h"
#include "rift/builtins/temporal/plain_date.h"
#include "rift/builtins/temporal/plain_time.h"
#include "rift/core/engine/builtin_manager.h"
#include "rift/core/engine/javascript_exception.h"
#include "rift/core/engine/this_helpers.h"
#include "rift/memory/gc_protector.h"
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

// ============================================================================
// Temporal Proposal -- Temporal.PlainDateTime Objects (Sections 5.1-5.5)
// @spec https://tc39.es/proposal-temporal/#sec-temporal-plaindatetime-objects
//
// Temporal.PlainDateTime represents a calendar date and wall-clock time
// without a time zone. It combines the functionality of PlainDate and
// PlainTime into a single object.
//
// DEVIATION: The spec uses [[ISODateTime]] and [[Calendar]] internal slots.
// Rift delegates computation to the temporal_rs Rust library via FFI and
// stores internal data in a static registry (PlainDateTimeRegistry) instead
// of internal slots. The registry maps JSObject* -> unique_ptr<PlainDateTime>.
// ============================================================================

namespace rift::builtins {

using rift::core::extractThisObject;

// ============================================================================
// PlainDateTimeRegistry
// NON-STANDARD: Static registry for PlainDateTime internal data.
// The spec stores data in [[ISODateTime]] and [[Calendar]] internal slots.
// Rift uses a global unordered_map<JSObject*, unique_ptr<PlainDateTime>>
// as a substitute for internal slots.
// ============================================================================

std::unordered_map<JSObject*, std::unique_ptr<temporal_rs::PlainDateTime>>
    PlainDateTimeRegistry::registry_;

void PlainDateTimeRegistry::store(JSObject* obj, std::unique_ptr<temporal_rs::PlainDateTime> data) {
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

// NON-STANDARD: Internal helper to extract PlainDateTime data from the
// receiver (this value) by looking up the JSObject in the registry.
static temporal_rs::PlainDateTime* getPlainDateTimeData(const CallContext& ctx) {
    auto* obj = extractThisObject(ctx);
    if(obj) {
        return PlainDateTimeRegistry::get(obj);
    }
    return nullptr;
}

// NON-STANDARD: Internal helper to convert temporal_rs::TemporalError
// into the appropriate JavaScript exception type (TypeError, RangeError,
// or SyntaxError) based on the error kind.
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

// ----------------------------------------------------------------------------
// NON-STANDARD: Internal helper to parse a PlainDateTime from a JS Value.
// Handles three cases:
//   1. Value is already a Temporal.PlainDateTime object (clone it)
//   2. Value is a property bag object (extract date/time fields)
//   3. Value is a string (parse as ISO 8601)
//
// This implements parts of:
//   5.5.3 ToTemporalDateTime ( item [ , options ] )
//   @spec https://tc39.es/proposal-temporal/#sec-temporal-totemporaldatetime
//
// SIMPLIFIED: Option bag parsing (overflow, calendar) is not fully handled.
// SIMPLIFIED: Calendar reconciliation between input and property bag is
// not implemented — defaults to ISO calendar.
// ----------------------------------------------------------------------------
static std::unique_ptr<temporal_rs::PlainDateTime> parsePlainDateTimeFromValue(const Value& val) {
    if(val.isObject() || val.isFunction()) {
        // Step: If item has [[ISODateTime]] internal slot, return a copy.
        auto* data = PlainDateTimeRegistry::get(val.getObject());
        if(data) {
            return data->clone();
        }

        // Step: Otherwise, treat as a property bag.
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

        if(!y.isUndefined())
            partial_date.year = static_cast<int32_t>(y.toNumber());
        if(!mo.isUndefined())
            partial_date.month = static_cast<uint8_t>(mo.toNumber());
        if(!d.isUndefined())
            partial_date.day = static_cast<uint8_t>(d.toNumber());
        if(!ey.isUndefined())
            partial_date.era_year = static_cast<int32_t>(ey.toNumber());

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

        if(!h.isUndefined())
            partial_time.hour = static_cast<uint8_t>(h.toNumber());
        if(!mi.isUndefined())
            partial_time.minute = static_cast<uint8_t>(mi.toNumber());
        if(!s.isUndefined())
            partial_time.second = static_cast<uint8_t>(s.toNumber());
        if(!ms.isUndefined())
            partial_time.millisecond = static_cast<uint16_t>(ms.toNumber());
        if(!us.isUndefined())
            partial_time.microsecond = static_cast<uint16_t>(us.toNumber());
        if(!ns.isUndefined())
            partial_time.nanosecond = static_cast<uint16_t>(ns.toNumber());

        temporal_rs::PartialDateTime partial{partial_date, partial_time};

        auto result = temporal_rs::PlainDateTime::from_partial(partial, std::nullopt);
        if(!result.is_ok()) {
            throwTemporalError(std::move(result).err().value());
        }
        return std::move(result).ok().value();
    }

    // Step: If item is a string, parse it.
    std::string str = val.toString();
    auto result = temporal_rs::PlainDateTime::from_utf8(str);
    if(!result.is_ok()) {
        throwTemporalError(std::move(result).err().value());
    }
    return std::move(result).ok().value();
}

// ----------------------------------------------------------------------------
// NON-STANDARD: Internal helper to parse a Duration from a JS Value for
// PlainDateTime arithmetic (add/subtract). Handles Duration objects,
// property bags, and ISO 8601 duration strings.
//
// Implements parts of:
//   7.5.15 ToTemporalDuration ( item )
//   @spec https://tc39.es/proposal-temporal/#sec-temporal-totemporalduration
//
// SIMPLIFIED: Does not perform full ToTemporalDuration validation steps.
// ----------------------------------------------------------------------------
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

// NON-STANDARD: Internal helper to wrap a temporal_rs::PlainDateTime into
// a JS object with the PlainDateTime prototype and register it.
Value TemporalPlainDateTime::wrapPlainDateTime(std::unique_ptr<temporal_rs::PlainDateTime> dt) {
    auto* proto = getGlobalPrototype();
    auto* js_obj = getObjectFactory()->createJSObject(proto);
    rift::memory::GCProtector protect(js_obj, getObjectFactory()->getObjectManager());

    PlainDateTimeRegistry::store(js_obj, std::move(dt));

    return Value(js_obj);
}

// ============================================================================
// Setup Methods
// ============================================================================

// ----------------------------------------------------------------------------
// 5.2 Properties of the Temporal.PlainDateTime Constructor
// @spec https://tc39.es/proposal-temporal/#sec-properties-of-the-temporal-plaindatetime-constructor
// ----------------------------------------------------------------------------
void TemporalPlainDateTime::setupStaticMethods(JSObject* constructor,
                                               rift::memory::ObjectFactory* factory) {
    // 5.2.2 Temporal.PlainDateTime.from ( item [ , options ] )
    RIFT_STATIC_METHOD(constructor, "from", TemporalPlainDateTime::from);
    // 5.2.3 Temporal.PlainDateTime.compare ( one, two )
    RIFT_STATIC_METHOD(constructor, "compare", TemporalPlainDateTime::compare);
}

// ----------------------------------------------------------------------------
// 5.3 Properties of the Temporal.PlainDateTime Prototype Object
// @spec
// https://tc39.es/proposal-temporal/#sec-properties-of-the-temporal-plaindatetime-prototype-object
// ----------------------------------------------------------------------------
void TemporalPlainDateTime::setupPrototypeMethods(JSObject* prototype,
                                                  rift::memory::ObjectFactory* factory) {
    // 5.3.3-5.3.14 Date getters
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

    // 5.3.15-5.3.20 Time getters
    RIFT_GETTER(prototype, "hour", TemporalPlainDateTime::hour);
    RIFT_GETTER(prototype, "minute", TemporalPlainDateTime::minute);
    RIFT_GETTER(prototype, "second", TemporalPlainDateTime::second);
    RIFT_GETTER(prototype, "millisecond", TemporalPlainDateTime::millisecond);
    RIFT_GETTER(prototype, "microsecond", TemporalPlainDateTime::microsecond);
    RIFT_GETTER(prototype, "nanosecond", TemporalPlainDateTime::nanosecond);

    // 5.3.21 Temporal.PlainDateTime.prototype.with ( temporalDateTimeLike [ , options ] )
    RIFT_METHOD(prototype, "with", TemporalPlainDateTime::with);
    // 5.3.23 Temporal.PlainDateTime.prototype.withPlainTime ( [ plainTimeLike ] )
    RIFT_METHOD(prototype, "withTime", TemporalPlainDateTime::withTime);

    // 5.3.24 Temporal.PlainDateTime.prototype.add ( temporalDurationLike [ , options ] )
    RIFT_METHOD(prototype, "add", TemporalPlainDateTime::add);
    // 5.3.25 Temporal.PlainDateTime.prototype.subtract ( temporalDurationLike [ , options ] )
    RIFT_METHOD(prototype, "subtract", TemporalPlainDateTime::subtract);

    // 5.3.26 Temporal.PlainDateTime.prototype.until ( other [ , options ] )
    RIFT_METHOD(prototype, "until", TemporalPlainDateTime::until);
    // 5.3.27 Temporal.PlainDateTime.prototype.since ( other [ , options ] )
    RIFT_METHOD(prototype, "since", TemporalPlainDateTime::since);

    // 5.3.29 Temporal.PlainDateTime.prototype.equals ( other )
    RIFT_METHOD(prototype, "equals", TemporalPlainDateTime::equals);

    // 5.3.31 Temporal.PlainDateTime.prototype.toPlainDate ( )
    RIFT_METHOD(prototype, "toPlainDate", TemporalPlainDateTime::toPlainDate);
    // 5.3.32 Temporal.PlainDateTime.prototype.toPlainTime ( )
    RIFT_METHOD(prototype, "toPlainTime", TemporalPlainDateTime::toPlainTime);

    // 5.3.30 Temporal.PlainDateTime.prototype.toString ( [ options ] )
    RIFT_METHOD(prototype, "toString", TemporalPlainDateTime::toString);
    // 5.3.33 Temporal.PlainDateTime.prototype.toJSON ( )
    RIFT_METHOD(prototype, "toJSON", TemporalPlainDateTime::toJSON);
    // 5.3.34 Temporal.PlainDateTime.prototype.valueOf ( )
    RIFT_METHOD(prototype, "valueOf", TemporalPlainDateTime::valueOf);
}

// ============================================================================
// Constructor
// ============================================================================

// ----------------------------------------------------------------------------
// 5.1.1 Temporal.PlainDateTime ( isoYear, isoMonth, isoDay
//          [ , hour [ , minute [ , second [ , millisecond
//          [ , microsecond [ , nanosecond [ , calendar ] ] ] ] ] ] ] )
// @spec https://tc39.es/proposal-temporal/#sec-temporal.plaindatetime
//
// INCOMPLETE: Step 1 (NewTarget check) not enforced — Rift does not yet
// distinguish [[Construct]] from [[Call]] for built-in constructors.
// SIMPLIFIED: Calendar argument is accepted as a string only, not as a
// calendar object.
// ----------------------------------------------------------------------------
Value TemporalPlainDateTime::constructor(const CallContext& ctx, const std::vector<Value>& args) {
    // Step 1: If NewTarget is undefined, throw a TypeError. (INCOMPLETE)
    // Step 2: If isoYear, isoMonth, or isoDay is not provided, throw a TypeError.
    if(args.size() < 3) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Temporal.PlainDateTime requires at least year, month, and day"));
    }

    // Steps 3-11: Convert arguments to integer values, defaulting optional ones to 0.
    int32_t year_val = static_cast<int32_t>(args[0].toNumber());
    uint8_t month_val = static_cast<uint8_t>(args[1].toNumber());
    uint8_t day_val = static_cast<uint8_t>(args[2].toNumber());
    uint8_t hour_val = args.size() > 3 ? static_cast<uint8_t>(args[3].toNumber()) : 0;
    uint8_t minute_val = args.size() > 4 ? static_cast<uint8_t>(args[4].toNumber()) : 0;
    uint8_t second_val = args.size() > 5 ? static_cast<uint8_t>(args[5].toNumber()) : 0;
    uint16_t ms_val = args.size() > 6 ? static_cast<uint16_t>(args[6].toNumber()) : 0;
    uint16_t us_val = args.size() > 7 ? static_cast<uint16_t>(args[7].toNumber()) : 0;
    uint16_t ns_val = args.size() > 8 ? static_cast<uint16_t>(args[8].toNumber()) : 0;

    // Step 12: If calendar is not undefined, set calendar to
    // ? ToTemporalCalendarIdentifier(calendar).
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

    // Step 13: Return ? CreateTemporalDateTime(isoYear, isoMonth, isoDay,
    //          hour, minute, second, millisecond, microsecond, nanosecond,
    //          calendar, NewTarget).
    // DEVIATION: Delegates to temporal_rs::PlainDateTime::try_new via FFI.
    auto result =
        temporal_rs::PlainDateTime::try_new(year_val, month_val, day_val, hour_val, minute_val,
                                            second_val, ms_val, us_val, ns_val, calendar);
    if(!result.is_ok()) {
        throwTemporalError(std::move(result).err().value());
    }

    return wrapPlainDateTime(std::move(result).ok().value());
}

// ============================================================================
// Static Methods
// ============================================================================

// ----------------------------------------------------------------------------
// 5.2.2 Temporal.PlainDateTime.from ( item [ , options ] )
// @spec https://tc39.es/proposal-temporal/#sec-temporal.plaindatetime.from
//
// SIMPLIFIED: The options argument (overflow handling) is not parsed.
// Delegates to parsePlainDateTimeFromValue which implements
// ToTemporalDateTime (5.5.3).
// ----------------------------------------------------------------------------
Value TemporalPlainDateTime::from(const CallContext& ctx, const std::vector<Value>& args) {
    if(args.empty()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Temporal.PlainDateTime.from requires an argument"));
    }

    auto dt = parsePlainDateTimeFromValue(args[0]);
    return wrapPlainDateTime(std::move(dt));
}

// ----------------------------------------------------------------------------
// 5.2.3 Temporal.PlainDateTime.compare ( one, two )
// @spec https://tc39.es/proposal-temporal/#sec-temporal.plaindatetime.compare
//
// Returns -1, 0, or 1 by comparing the ISO date-time fields of the
// two PlainDateTime arguments.
// ----------------------------------------------------------------------------
Value TemporalPlainDateTime::compare(const CallContext& ctx, const std::vector<Value>& args) {
    if(args.size() < 2) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Temporal.PlainDateTime.compare requires two arguments"));
    }

    // Step 1: Set one to ? ToTemporalDateTime(one).
    auto dt_one = parsePlainDateTimeFromValue(args[0]);
    // Step 2: Set two to ? ToTemporalDateTime(two).
    auto dt_two = parsePlainDateTimeFromValue(args[1]);

    // Step 3: Return CompareISODateTime(one.[[ISODateTime]], two.[[ISODateTime]]).
    int8_t cmp = temporal_rs::PlainDateTime::compare(*dt_one, *dt_two);
    return Value(static_cast<double>(cmp));
}

// ============================================================================
// Prototype Getters -- Date Fields
// @spec
// https://tc39.es/proposal-temporal/#sec-properties-of-the-temporal-plaindatetime-prototype-object
//
// Each date getter calls the corresponding calendar operation on the
// PlainDateTime's [[ISODateTime]] and [[Calendar]] internal slots.
// DEVIATION: Rift delegates all calendar computation to temporal_rs via FFI
// rather than implementing the calendar protocol in C++.
// ============================================================================

// 5.3.3 get Temporal.PlainDateTime.prototype.calendarId
// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.plaindatetime.prototype.calendarid
Value TemporalPlainDateTime::calendarId(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainDateTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: calendarId called on non-PlainDateTime"));
    }
    return Value(std::string(data->calendar().identifier()));
}

// 5.3.4 get Temporal.PlainDateTime.prototype.year
// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.plaindatetime.prototype.year
Value TemporalPlainDateTime::year(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainDateTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(Value("TypeError: year called on non-PlainDateTime"));
    }
    return Value(static_cast<double>(data->year()));
}

// 5.3.5 get Temporal.PlainDateTime.prototype.month
// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.plaindatetime.prototype.month
Value TemporalPlainDateTime::month(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainDateTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: month called on non-PlainDateTime"));
    }
    return Value(static_cast<double>(data->month()));
}

// 5.3.6 get Temporal.PlainDateTime.prototype.monthCode
// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.plaindatetime.prototype.monthcode
Value TemporalPlainDateTime::monthCode(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainDateTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: monthCode called on non-PlainDateTime"));
    }
    return Value(data->month_code());
}

// 5.3.7 get Temporal.PlainDateTime.prototype.day
// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.plaindatetime.prototype.day
Value TemporalPlainDateTime::day(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainDateTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(Value("TypeError: day called on non-PlainDateTime"));
    }
    return Value(static_cast<double>(data->day()));
}

// 5.3.8 get Temporal.PlainDateTime.prototype.dayOfWeek
// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.plaindatetime.prototype.dayofweek
Value TemporalPlainDateTime::dayOfWeek(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainDateTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: dayOfWeek called on non-PlainDateTime"));
    }
    return Value(static_cast<double>(data->day_of_week()));
}

// 5.3.9 get Temporal.PlainDateTime.prototype.dayOfYear
// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.plaindatetime.prototype.dayofyear
Value TemporalPlainDateTime::dayOfYear(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainDateTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: dayOfYear called on non-PlainDateTime"));
    }
    return Value(static_cast<double>(data->day_of_year()));
}

// 5.3.10 get Temporal.PlainDateTime.prototype.weekOfYear
// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.plaindatetime.prototype.weekofyear
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

// 5.3.12 get Temporal.PlainDateTime.prototype.daysInMonth
// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.plaindatetime.prototype.daysinmonth
Value TemporalPlainDateTime::daysInMonth(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainDateTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: daysInMonth called on non-PlainDateTime"));
    }
    return Value(static_cast<double>(data->days_in_month()));
}

// 5.3.13 get Temporal.PlainDateTime.prototype.daysInYear
// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.plaindatetime.prototype.daysinyear
Value TemporalPlainDateTime::daysInYear(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainDateTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: daysInYear called on non-PlainDateTime"));
    }
    return Value(static_cast<double>(data->days_in_year()));
}

// 5.3.14 get Temporal.PlainDateTime.prototype.monthsInYear
// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.plaindatetime.prototype.monthsinyear
Value TemporalPlainDateTime::monthsInYear(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainDateTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: monthsInYear called on non-PlainDateTime"));
    }
    return Value(static_cast<double>(data->months_in_year()));
}

// 5.3.15 get Temporal.PlainDateTime.prototype.inLeapYear
// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.plaindatetime.prototype.inleapyear
Value TemporalPlainDateTime::inLeapYear(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainDateTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: inLeapYear called on non-PlainDateTime"));
    }
    return Value(data->in_leap_year());
}

// ============================================================================
// Prototype Getters -- Time Fields
// @spec
// https://tc39.es/proposal-temporal/#sec-properties-of-the-temporal-plaindatetime-prototype-object
//
// Each time getter returns the corresponding component from the
// PlainDateTime's [[ISODateTime]] internal slot.
// ============================================================================

// 5.3.16 get Temporal.PlainDateTime.prototype.hour
// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.plaindatetime.prototype.hour
Value TemporalPlainDateTime::hour(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainDateTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(Value("TypeError: hour called on non-PlainDateTime"));
    }
    return Value(static_cast<double>(data->hour()));
}

// 5.3.17 get Temporal.PlainDateTime.prototype.minute
// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.plaindatetime.prototype.minute
Value TemporalPlainDateTime::minute(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainDateTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: minute called on non-PlainDateTime"));
    }
    return Value(static_cast<double>(data->minute()));
}

// 5.3.18 get Temporal.PlainDateTime.prototype.second
// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.plaindatetime.prototype.second
Value TemporalPlainDateTime::second(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainDateTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: second called on non-PlainDateTime"));
    }
    return Value(static_cast<double>(data->second()));
}

// 5.3.19 get Temporal.PlainDateTime.prototype.millisecond
// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.plaindatetime.prototype.millisecond
Value TemporalPlainDateTime::millisecond(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainDateTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: millisecond called on non-PlainDateTime"));
    }
    return Value(static_cast<double>(data->millisecond()));
}

// 5.3.20 get Temporal.PlainDateTime.prototype.microsecond
// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.plaindatetime.prototype.microsecond
Value TemporalPlainDateTime::microsecond(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainDateTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: microsecond called on non-PlainDateTime"));
    }
    return Value(static_cast<double>(data->microsecond()));
}

// 5.3.21 get Temporal.PlainDateTime.prototype.nanosecond
// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.plaindatetime.prototype.nanosecond
Value TemporalPlainDateTime::nanosecond(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainDateTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: nanosecond called on non-PlainDateTime"));
    }
    return Value(static_cast<double>(data->nanosecond()));
}

// ============================================================================
// Mutation Methods
// ============================================================================

// ----------------------------------------------------------------------------
// 5.3.22 Temporal.PlainDateTime.prototype.with ( temporalDateTimeLike [ , options ] )
// @spec https://tc39.es/proposal-temporal/#sec-temporal.plaindatetime.prototype.with
//
// Returns a new PlainDateTime with the fields from temporalDateTimeLike
// merged into this PlainDateTime.
//
// SIMPLIFIED: The options argument (overflow handling) is not parsed.
// SIMPLIFIED: The spec performs PrepareCalendarFields and
// CalendarMergeFields steps; Rift extracts fields directly from the
// property bag and delegates merging to temporal_rs.
// ----------------------------------------------------------------------------
Value TemporalPlainDateTime::with(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainDateTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(Value("TypeError: with called on non-PlainDateTime"));
    }

    if(args.empty() || (!args[0].isObject() && !args[0].isFunction())) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Temporal.PlainDateTime.prototype.with requires an object argument"));
    }

    auto* obj = args[0].getObject();

    temporal_rs::PartialDate partial_date{};
    temporal_rs::PartialTime partial_time{};

    // Date fields
    Value y = obj->getProperty("year");
    Value mo = obj->getProperty("month");
    Value mc = obj->getProperty("monthCode");
    Value d = obj->getProperty("day");

    if(!y.isUndefined())
        partial_date.year = static_cast<int32_t>(y.toNumber());
    if(!mo.isUndefined())
        partial_date.month = static_cast<uint8_t>(mo.toNumber());
    if(!d.isUndefined())
        partial_date.day = static_cast<uint8_t>(d.toNumber());

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

    if(!h.isUndefined())
        partial_time.hour = static_cast<uint8_t>(h.toNumber());
    if(!mi.isUndefined())
        partial_time.minute = static_cast<uint8_t>(mi.toNumber());
    if(!s.isUndefined())
        partial_time.second = static_cast<uint8_t>(s.toNumber());
    if(!ms.isUndefined())
        partial_time.millisecond = static_cast<uint16_t>(ms.toNumber());
    if(!us.isUndefined())
        partial_time.microsecond = static_cast<uint16_t>(us.toNumber());
    if(!ns.isUndefined())
        partial_time.nanosecond = static_cast<uint16_t>(ns.toNumber());

    temporal_rs::PartialDateTime partial{partial_date, partial_time};

    auto result = data->with(partial, std::nullopt);
    if(!result.is_ok()) {
        throwTemporalError(std::move(result).err().value());
    }

    return wrapPlainDateTime(std::move(result).ok().value());
}

// ----------------------------------------------------------------------------
// 5.3.23 Temporal.PlainDateTime.prototype.withPlainTime ( [ plainTimeLike ] )
// @spec https://tc39.es/proposal-temporal/#sec-temporal.plaindatetime.prototype.withplaintime
//
// Returns a new PlainDateTime with the time portion replaced. If no
// argument is provided, the time is set to midnight (00:00:00).
// DEVIATION: Rift names this method "withTime" instead of "withPlainTime"
// in the C++ implementation, but it is registered as "withPlainTime" on
// the prototype... actually registered as "withTime" — this may be a
// naming mismatch vs the spec.
// ----------------------------------------------------------------------------
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

// ============================================================================
// Arithmetic Methods
// ============================================================================

// ----------------------------------------------------------------------------
// 5.3.24 Temporal.PlainDateTime.prototype.add ( temporalDurationLike [ , options ] )
// @spec https://tc39.es/proposal-temporal/#sec-temporal.plaindatetime.prototype.add
//
// SIMPLIFIED: The options argument (overflow handling) is not parsed —
// defaults to "constrain" via temporal_rs.
// ----------------------------------------------------------------------------
Value TemporalPlainDateTime::add(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainDateTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(Value("TypeError: add called on non-PlainDateTime"));
    }

    if(args.empty()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Temporal.PlainDateTime.prototype.add requires an argument"));
    }

    // Step 1: Let duration be ? ToTemporalDuration(temporalDurationLike).
    auto dur = parseDurationForDateTime(args[0]);
    // Step 2-3: Perform AddDateTime and return the result.
    auto result = data->add(*dur, std::nullopt);
    if(!result.is_ok()) {
        throwTemporalError(std::move(result).err().value());
    }

    return wrapPlainDateTime(std::move(result).ok().value());
}

// ----------------------------------------------------------------------------
// 5.3.25 Temporal.PlainDateTime.prototype.subtract ( temporalDurationLike [ , options ] )
// @spec https://tc39.es/proposal-temporal/#sec-temporal.plaindatetime.prototype.subtract
//
// SIMPLIFIED: The options argument (overflow handling) is not parsed.
// ----------------------------------------------------------------------------
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

    // Step 1: Let duration be ? ToTemporalDuration(temporalDurationLike).
    auto dur = parseDurationForDateTime(args[0]);
    // Step 2-3: Negate and perform AddDateTime, return the result.
    auto result = data->subtract(*dur, std::nullopt);
    if(!result.is_ok()) {
        throwTemporalError(std::move(result).err().value());
    }

    return wrapPlainDateTime(std::move(result).ok().value());
}

// ============================================================================
// Difference Methods
// ============================================================================

// ----------------------------------------------------------------------------
// 5.3.26 Temporal.PlainDateTime.prototype.until ( other [ , options ] )
// @spec https://tc39.es/proposal-temporal/#sec-temporal.plaindatetime.prototype.until
//
// Returns a Duration representing the time from this to other.
// SIMPLIFIED: The options argument (smallestUnit, largestUnit,
// roundingIncrement, roundingMode) is not parsed — uses defaults.
// ----------------------------------------------------------------------------
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

    // Step 1: Set other to ? ToTemporalDateTime(other).
    auto other = parsePlainDateTimeFromValue(args[0]);
    // Step 2-5: Get options and perform DifferenceTemporalPlainDateTime.
    temporal_rs::DifferenceSettings settings{std::nullopt, std::nullopt, std::nullopt,
                                             std::nullopt};

    auto result = data->until(*other, settings);
    if(!result.is_ok()) {
        throwTemporalError(std::move(result).err().value());
    }

    return TemporalDuration::wrapDuration(std::move(result).ok().value());
}

// ----------------------------------------------------------------------------
// 5.3.27 Temporal.PlainDateTime.prototype.since ( other [ , options ] )
// @spec https://tc39.es/proposal-temporal/#sec-temporal.plaindatetime.prototype.since
//
// Returns a Duration representing the time from other to this (opposite
// direction of until).
// SIMPLIFIED: The options argument is not parsed — uses defaults.
// ----------------------------------------------------------------------------
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

    // Step 1: Set other to ? ToTemporalDateTime(other).
    auto other = parsePlainDateTimeFromValue(args[0]);
    // Step 2-5: Get options and perform DifferenceTemporalPlainDateTime (negated).
    temporal_rs::DifferenceSettings settings{std::nullopt, std::nullopt, std::nullopt,
                                             std::nullopt};

    auto result = data->since(*other, settings);
    if(!result.is_ok()) {
        throwTemporalError(std::move(result).err().value());
    }

    return TemporalDuration::wrapDuration(std::move(result).ok().value());
}

// ============================================================================
// Comparison Methods
// ============================================================================

// ----------------------------------------------------------------------------
// 5.3.29 Temporal.PlainDateTime.prototype.equals ( other )
// @spec https://tc39.es/proposal-temporal/#sec-temporal.plaindatetime.prototype.equals
//
// Returns true if this and other represent the same date-time and calendar.
// ----------------------------------------------------------------------------
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

// ============================================================================
// Conversion Methods
// ============================================================================

// ----------------------------------------------------------------------------
// 5.3.31 Temporal.PlainDateTime.prototype.toPlainDate ( )
// @spec https://tc39.es/proposal-temporal/#sec-temporal.plaindatetime.prototype.toplaindate
//
// Returns a PlainDate with the same date fields and calendar.
// ----------------------------------------------------------------------------
Value TemporalPlainDateTime::toPlainDate(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainDateTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: toPlainDate called on non-PlainDateTime"));
    }

    return TemporalPlainDate::wrapPlainDate(data->to_plain_date());
}

// ----------------------------------------------------------------------------
// 5.3.32 Temporal.PlainDateTime.prototype.toPlainTime ( )
// @spec https://tc39.es/proposal-temporal/#sec-temporal.plaindatetime.prototype.toplaintime
//
// Returns a PlainTime with the same time fields.
// ----------------------------------------------------------------------------
Value TemporalPlainDateTime::toPlainTime(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainDateTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: toPlainTime called on non-PlainDateTime"));
    }

    return TemporalPlainTime::wrapPlainTime(data->to_plain_time());
}

// ============================================================================
// String Conversion Methods
// ============================================================================

// ----------------------------------------------------------------------------
// 5.3.30 Temporal.PlainDateTime.prototype.toString ( [ options ] )
// @spec https://tc39.es/proposal-temporal/#sec-temporal.plaindatetime.prototype.tostring
//
// Returns an ISO 8601 / IXDTF string representation of the PlainDateTime.
// SIMPLIFIED: The options argument (fractionalSecondDigits, smallestUnit,
// roundingMode, calendarName) is not parsed — uses auto precision and
// auto calendar display.
// ----------------------------------------------------------------------------
Value TemporalPlainDateTime::toString(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainDateTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: toString called on non-PlainDateTime"));
    }

    temporal_rs::ToStringRoundingOptions options{temporal_rs::Precision{false, std::nullopt},
                                                 std::nullopt, std::nullopt};

    auto result = data->to_ixdtf_string(options, temporal_rs::DisplayCalendar::Auto);
    if(!result.is_ok()) {
        throwTemporalError(std::move(result).err().value());
    }

    return Value(std::move(result).ok().value());
}

// ----------------------------------------------------------------------------
// 5.3.33 Temporal.PlainDateTime.prototype.toJSON ( )
// @spec https://tc39.es/proposal-temporal/#sec-temporal.plaindatetime.prototype.tojson
//
// Equivalent to toString with no options.
// ----------------------------------------------------------------------------
Value TemporalPlainDateTime::toJSON(const CallContext& ctx, const std::vector<Value>& args) {
    return toString(ctx, args);
}

// ----------------------------------------------------------------------------
// 5.3.34 Temporal.PlainDateTime.prototype.valueOf ( )
// @spec https://tc39.es/proposal-temporal/#sec-temporal.plaindatetime.prototype.valueof
//
// Always throws TypeError — Temporal types are not comparable with < or >.
// ----------------------------------------------------------------------------
Value TemporalPlainDateTime::valueOf(const CallContext& ctx, const std::vector<Value>& args) {
    throw rift::core::JavaScriptException(
        Value("TypeError: Cannot convert a Temporal.PlainDateTime to a primitive value"));
}

// ============================================================================
// Private
// ============================================================================

JSObject* TemporalPlainDateTime::getGlobalPrototype() {
    return rift::core::BuiltinManager::getPlainDateTimePrototype();
}

}  // namespace rift::builtins
