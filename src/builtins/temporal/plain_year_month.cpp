#include "rift/builtins/temporal/plain_year_month.h"

#include "rift/builtins/builtin_manager.h"
#include "rift/builtins/temporal/duration.h"
#include "rift/builtins/temporal/plain_date.h"
#include "rift/interpreter/javascript_exception.h"
#include "rift/interpreter/this_helpers.h"
#include "rift/memory/gc_protector.h"
#include "temporal_rs/AnyCalendarKind.hpp"
#include "temporal_rs/ArithmeticOverflow.hpp"
#include "temporal_rs/DifferenceSettings.hpp"
#include "temporal_rs/DisplayCalendar.hpp"
#include "temporal_rs/Duration.hpp"
#include "temporal_rs/PartialDate.hpp"
#include "temporal_rs/PlainDate.hpp"
#include "temporal_rs/PlainYearMonth.hpp"

// ============================================================================
// Temporal Proposal -- Temporal.PlainYearMonth Objects (Sections 9.1-9.5)
// @spec https://tc39.es/proposal-temporal/#sec-temporal-plainyearmonth-objects
//
// Temporal.PlainYearMonth represents a year and month in a particular
// calendar system, without a day or time component. Useful for
// representing concepts like "March 2024" without specifying a day.
//
// DEVIATION: The spec uses [[ISODate]] and [[Calendar]] internal slots.
// Rift delegates computation to the temporal_rs Rust library via FFI and
// stores internal data in a static registry (PlainYearMonthRegistry)
// instead of internal slots. The registry maps
// JSObject* -> unique_ptr<PlainYearMonth>.
// ============================================================================

namespace rift::builtins {

using rift::core::extractThisObject;

// ============================================================================
// PlainYearMonthRegistry
// NON-STANDARD: Static registry for PlainYearMonth internal data.
// The spec stores data in [[ISODate]] and [[Calendar]] internal slots.
// Rift uses a global unordered_map<JSObject*, unique_ptr<PlainYearMonth>>
// as a substitute for internal slots.
// ============================================================================

std::unordered_map<JSObject*, std::unique_ptr<temporal_rs::PlainYearMonth>>
    PlainYearMonthRegistry::registry_;

void PlainYearMonthRegistry::store(JSObject* obj,
                                   std::unique_ptr<temporal_rs::PlainYearMonth> data) {
    registry_[obj] = std::move(data);
}

temporal_rs::PlainYearMonth* PlainYearMonthRegistry::get(JSObject* obj) {
    auto it = registry_.find(obj);
    if(it != registry_.end()) {
        return it->second.get();
    }
    return nullptr;
}

void PlainYearMonthRegistry::remove(JSObject* obj) {
    registry_.erase(obj);
}

void PlainYearMonthRegistry::clear() {
    registry_.clear();
}

// NON-STANDARD: Internal helper to extract PlainYearMonth data from the
// receiver (this value) by looking up the JSObject in the registry.
static temporal_rs::PlainYearMonth* getPlainYearMonthData(const CallContext& ctx) {
    auto* obj = extractThisObject(ctx);
    if(obj) {
        return PlainYearMonthRegistry::get(obj);
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

// ----------------------------------------------------------------------------
// NON-STANDARD: Internal helper to parse a PlainYearMonth from a JS Value.
// Handles three cases:
//   1. Value is already a Temporal.PlainYearMonth object (clone it)
//   2. Value is a property bag object (extract year/month fields)
//   3. Value is a string (parse as ISO 8601)
//
// This implements parts of:
//   9.5.3 ToTemporalYearMonth ( item [ , options ] )
//   @spec https://tc39.es/proposal-temporal/#sec-temporal-totemporalyearmonth
//
// SIMPLIFIED: Option bag parsing (overflow) is not fully handled.
// SIMPLIFIED: Calendar reconciliation is not implemented.
// ----------------------------------------------------------------------------
static std::unique_ptr<temporal_rs::PlainYearMonth> parsePlainYearMonthFromValue(const Value& val) {
    if(val.isObject() || val.isFunction()) {
        // Step: If item has [[ISODate]] internal slot, return a copy.
        auto* data = PlainYearMonthRegistry::get(val.getObject());
        if(data) {
            return data->clone();
        }

        // Step: Otherwise, treat as a property bag.
        auto* obj = val.getObject();
        temporal_rs::PartialDate partial{};

        Value y = obj->getProperty("year");
        Value mo = obj->getProperty("month");
        Value mc = obj->getProperty("monthCode");
        Value e = obj->getProperty("era");
        Value ey = obj->getProperty("eraYear");

        if(!y.isUndefined())
            partial.year = static_cast<int32_t>(y.toNumber());
        if(!mo.isUndefined())
            partial.month = static_cast<uint8_t>(mo.toNumber());
        if(!ey.isUndefined())
            partial.era_year = static_cast<int32_t>(ey.toNumber());

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

        auto result = temporal_rs::PlainYearMonth::from_partial(partial, std::nullopt);
        if(!result.is_ok()) {
            throwTemporalError(std::move(result).err().value());
        }
        return std::move(result).ok().value();
    }

    // Step: If item is a string, parse it.
    std::string str = val.toString();
    auto result = temporal_rs::PlainYearMonth::from_utf8(str);
    if(!result.is_ok()) {
        throwTemporalError(std::move(result).err().value());
    }
    return std::move(result).ok().value();
}

// ----------------------------------------------------------------------------
// NON-STANDARD: Internal helper to parse a Duration from a JS Value for
// PlainYearMonth arithmetic (add/subtract).
//
// Implements parts of:
//   7.5.15 ToTemporalDuration ( item )
//   @spec https://tc39.es/proposal-temporal/#sec-temporal-totemporalduration
// ----------------------------------------------------------------------------
static std::unique_ptr<temporal_rs::Duration> parseDurationForYearMonth(const Value& val) {
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

// NON-STANDARD: Internal helper to wrap a temporal_rs::PlainYearMonth into
// a JS object with the PlainYearMonth prototype and register it.
Value TemporalPlainYearMonth::wrapPlainYearMonth(std::unique_ptr<temporal_rs::PlainYearMonth> ym) {
    auto* proto = getGlobalPrototype();
    auto* js_obj = getObjectFactory()->createJSObject(proto);
    rift::memory::GCProtector protect(js_obj, getObjectFactory()->getObjectManager());

    PlainYearMonthRegistry::store(js_obj, std::move(ym));

    return Value(js_obj);
}

// ============================================================================
// Setup Methods
// ============================================================================

// ----------------------------------------------------------------------------
// 9.2 Properties of the Temporal.PlainYearMonth Constructor
// @spec
// https://tc39.es/proposal-temporal/#sec-properties-of-the-temporal-plainyearmonth-constructor
// ----------------------------------------------------------------------------
void TemporalPlainYearMonth::setupStaticMethods(JSObject* constructor,
                                                rift::memory::ObjectFactory* factory) {
    // 9.2.2 Temporal.PlainYearMonth.from ( item [ , options ] )
    RIFT_STATIC_METHOD(constructor, "from", 1, TemporalPlainYearMonth::from);
    // 9.2.3 Temporal.PlainYearMonth.compare ( one, two )
    RIFT_STATIC_METHOD(constructor, "compare", 2, TemporalPlainYearMonth::compare);
}

// ----------------------------------------------------------------------------
// 9.3 Properties of the Temporal.PlainYearMonth Prototype Object
// @spec
// https://tc39.es/proposal-temporal/#sec-properties-of-the-temporal-plainyearmonth-prototype-object
// ----------------------------------------------------------------------------
void TemporalPlainYearMonth::setupPrototypeMethods(JSObject* prototype,
                                                   rift::memory::ObjectFactory* factory) {
    // 9.3.3-9.3.10 Getters
    RIFT_GETTER(prototype, "year", TemporalPlainYearMonth::year);
    RIFT_GETTER(prototype, "month", TemporalPlainYearMonth::month);
    RIFT_GETTER(prototype, "monthCode", TemporalPlainYearMonth::monthCode);
    RIFT_GETTER(prototype, "daysInMonth", TemporalPlainYearMonth::daysInMonth);
    RIFT_GETTER(prototype, "daysInYear", TemporalPlainYearMonth::daysInYear);
    RIFT_GETTER(prototype, "monthsInYear", TemporalPlainYearMonth::monthsInYear);
    RIFT_GETTER(prototype, "inLeapYear", TemporalPlainYearMonth::inLeapYear);
    RIFT_GETTER(prototype, "calendarId", TemporalPlainYearMonth::calendarId);
    RIFT_GETTER(prototype, "era", TemporalPlainYearMonth::era);
    RIFT_GETTER(prototype, "eraYear", TemporalPlainYearMonth::eraYear);

    // 9.3.11 Temporal.PlainYearMonth.prototype.with ( temporalYearMonthLike [ , options ] )
    RIFT_METHOD(prototype, "with", 1, TemporalPlainYearMonth::with);

    // 9.3.12 Temporal.PlainYearMonth.prototype.add ( temporalDurationLike [ , options ] )
    RIFT_METHOD(prototype, "add", 1, TemporalPlainYearMonth::add);
    // 9.3.13 Temporal.PlainYearMonth.prototype.subtract ( temporalDurationLike [ , options ] )
    RIFT_METHOD(prototype, "subtract", 1, TemporalPlainYearMonth::subtract);

    // 9.3.14 Temporal.PlainYearMonth.prototype.until ( other [ , options ] )
    RIFT_METHOD(prototype, "until", 1, TemporalPlainYearMonth::until);
    // 9.3.15 Temporal.PlainYearMonth.prototype.since ( other [ , options ] )
    RIFT_METHOD(prototype, "since", 1, TemporalPlainYearMonth::since);

    // 9.3.16 Temporal.PlainYearMonth.prototype.equals ( other )
    RIFT_METHOD(prototype, "equals", 1, TemporalPlainYearMonth::equals);

    // 9.3.18 Temporal.PlainYearMonth.prototype.toPlainDate ( item )
    RIFT_METHOD(prototype, "toPlainDate", 1, TemporalPlainYearMonth::toPlainDate);

    // 9.3.17 Temporal.PlainYearMonth.prototype.toString ( [ options ] )
    RIFT_METHOD(prototype, "toString", 0, TemporalPlainYearMonth::toString);
    // 9.3.21 Temporal.PlainYearMonth.prototype.toLocaleString ( [ locales [ , options ] ] )
    RIFT_METHOD(prototype, "toLocaleString", 0, TemporalPlainYearMonth::toLocaleString);
    // 9.3.19 Temporal.PlainYearMonth.prototype.toJSON ( )
    RIFT_METHOD(prototype, "toJSON", 0, TemporalPlainYearMonth::toJSON);
    // 9.3.20 Temporal.PlainYearMonth.prototype.valueOf ( )
    RIFT_METHOD(prototype, "valueOf", 0, TemporalPlainYearMonth::valueOf);
}

// ============================================================================
// Constructor
// ============================================================================

// ----------------------------------------------------------------------------
// 9.1.1 Temporal.PlainYearMonth ( isoYear, isoMonth [ , calendar [ , referenceISODay ] ] )
// @spec https://tc39.es/proposal-temporal/#sec-temporal.plainyearmonth
//
// INCOMPLETE: Step 1 (NewTarget check) not enforced.
// SIMPLIFIED: Calendar argument is accepted as a string only, not as a
// calendar object. The referenceISODay argument is passed through to
// temporal_rs for ISO day validation.
// ----------------------------------------------------------------------------
Value TemporalPlainYearMonth::constructor(const CallContext& ctx, const std::vector<Value>& args) {
    // Step 1: If NewTarget is undefined, throw a TypeError. (INCOMPLETE)
    // Step 2: If isoYear or isoMonth is not provided, throw a TypeError.
    if(args.size() < 2) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Temporal.PlainYearMonth requires at least year and month"));
    }

    // Steps 3-4: Let y be ? ToIntegerWithTruncation(isoYear), m be ?
    // ToIntegerWithTruncation(isoMonth).
    int32_t year_val = static_cast<int32_t>(args[0].toNumber());
    uint8_t month_val = static_cast<uint8_t>(args[1].toNumber());

    // Step 5: If calendar is not undefined, set calendar to ?
    // ToTemporalCalendarIdentifier(calendar).
    temporal_rs::AnyCalendarKind calendar = temporal_rs::AnyCalendarKind::Iso;
    std::optional<uint8_t> ref_day = std::nullopt;

    if(args.size() > 2 && args[2].isString()) {
        auto cal = temporal_rs::AnyCalendarKind::get_for_str(args[2].getString());
        if(cal.has_value()) {
            calendar = cal.value();
        } else {
            throw rift::core::JavaScriptException(
                Value("RangeError: Invalid calendar: " + args[2].getString()));
        }
    }

    // Step 6: If referenceISODay is not undefined, let ref be ?
    // ToIntegerWithTruncation(referenceISODay).
    if(args.size() > 3 && !args[3].isUndefined()) {
        ref_day = static_cast<uint8_t>(args[3].toNumber());
    }

    // Step 7: Return ? CreateTemporalYearMonth(y, m, calendar, ref, NewTarget).
    auto result = temporal_rs::PlainYearMonth::try_new_with_overflow(
        year_val, month_val, ref_day, calendar, temporal_rs::ArithmeticOverflow::Constrain);
    if(!result.is_ok()) {
        throwTemporalError(std::move(result).err().value());
    }

    return wrapPlainYearMonth(std::move(result).ok().value());
}

// ============================================================================
// Static Methods
// ============================================================================

// ----------------------------------------------------------------------------
// 9.2.2 Temporal.PlainYearMonth.from ( item [ , options ] )
// @spec https://tc39.es/proposal-temporal/#sec-temporal.plainyearmonth.from
//
// SIMPLIFIED: The options argument (overflow handling) is not parsed.
// ----------------------------------------------------------------------------
Value TemporalPlainYearMonth::from(const CallContext& ctx, const std::vector<Value>& args) {
    if(args.empty()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Temporal.PlainYearMonth.from requires an argument"));
    }

    auto ym = parsePlainYearMonthFromValue(args[0]);
    return wrapPlainYearMonth(std::move(ym));
}

// ----------------------------------------------------------------------------
// 9.2.3 Temporal.PlainYearMonth.compare ( one, two )
// @spec https://tc39.es/proposal-temporal/#sec-temporal.plainyearmonth.compare
//
// Returns -1, 0, or 1 by comparing the ISO date fields of the two
// PlainYearMonth arguments.
// ----------------------------------------------------------------------------
Value TemporalPlainYearMonth::compare(const CallContext& ctx, const std::vector<Value>& args) {
    if(args.size() < 2) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Temporal.PlainYearMonth.compare requires two arguments"));
    }

    // Step 1: Set one to ? ToTemporalYearMonth(one).
    auto ym_one = parsePlainYearMonthFromValue(args[0]);
    // Step 2: Set two to ? ToTemporalYearMonth(two).
    auto ym_two = parsePlainYearMonthFromValue(args[1]);

    // Step 3: Return CompareISODate(one.[[ISODate]], two.[[ISODate]]).
    int8_t cmp = temporal_rs::PlainYearMonth::compare(*ym_one, *ym_two);
    return Value(static_cast<double>(cmp));
}

// ============================================================================
// Prototype Getters
// @spec
// https://tc39.es/proposal-temporal/#sec-properties-of-the-temporal-plainyearmonth-prototype-object
//
// Each getter calls the corresponding calendar operation on the
// PlainYearMonth's [[ISODate]] and [[Calendar]] internal slots.
// DEVIATION: Rift delegates all calendar computation to temporal_rs via FFI.
// ============================================================================

// 9.3.3 get Temporal.PlainYearMonth.prototype.calendarId
// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.plainyearmonth.prototype.calendarid
Value TemporalPlainYearMonth::calendarId(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainYearMonthData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: calendarId called on non-PlainYearMonth"));
    }
    return Value(std::string(data->calendar().identifier()));
}

// 9.3.4 get Temporal.PlainYearMonth.prototype.year
// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.plainyearmonth.prototype.year
Value TemporalPlainYearMonth::year(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainYearMonthData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: year called on non-PlainYearMonth"));
    }
    return Value(static_cast<double>(data->year()));
}

// 9.3.5 get Temporal.PlainYearMonth.prototype.month
// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.plainyearmonth.prototype.month
Value TemporalPlainYearMonth::month(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainYearMonthData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: month called on non-PlainYearMonth"));
    }
    return Value(static_cast<double>(data->month()));
}

// 9.3.6 get Temporal.PlainYearMonth.prototype.monthCode
// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.plainyearmonth.prototype.monthcode
Value TemporalPlainYearMonth::monthCode(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainYearMonthData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: monthCode called on non-PlainYearMonth"));
    }
    return Value(data->month_code());
}

// 9.3.7 get Temporal.PlainYearMonth.prototype.daysInMonth
// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.plainyearmonth.prototype.daysinmonth
Value TemporalPlainYearMonth::daysInMonth(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainYearMonthData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: daysInMonth called on non-PlainYearMonth"));
    }
    return Value(static_cast<double>(data->days_in_month()));
}

// 9.3.8 get Temporal.PlainYearMonth.prototype.daysInYear
// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.plainyearmonth.prototype.daysinyear
Value TemporalPlainYearMonth::daysInYear(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainYearMonthData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: daysInYear called on non-PlainYearMonth"));
    }
    return Value(static_cast<double>(data->days_in_year()));
}

// 9.3.9 get Temporal.PlainYearMonth.prototype.monthsInYear
// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.plainyearmonth.prototype.monthsinyear
Value TemporalPlainYearMonth::monthsInYear(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainYearMonthData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: monthsInYear called on non-PlainYearMonth"));
    }
    return Value(static_cast<double>(data->months_in_year()));
}

// 9.3.10 get Temporal.PlainYearMonth.prototype.inLeapYear
// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.plainyearmonth.prototype.inleapyear
Value TemporalPlainYearMonth::inLeapYear(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainYearMonthData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: inLeapYear called on non-PlainYearMonth"));
    }
    return Value(data->in_leap_year());
}

// ============================================================================
// Mutation Methods
// ============================================================================

// ----------------------------------------------------------------------------
// 9.3.11 Temporal.PlainYearMonth.prototype.with ( temporalYearMonthLike [ , options ] )
// @spec https://tc39.es/proposal-temporal/#sec-temporal.plainyearmonth.prototype.with
//
// Returns a new PlainYearMonth with the fields from temporalYearMonthLike
// merged into this PlainYearMonth.
//
// SIMPLIFIED: The options argument (overflow handling) is not parsed.
// SIMPLIFIED: The spec performs PrepareCalendarFields and
// CalendarMergeFields steps; Rift extracts fields directly and delegates
// merging to temporal_rs.
// ----------------------------------------------------------------------------
Value TemporalPlainYearMonth::with(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainYearMonthData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: with called on non-PlainYearMonth"));
    }

    if(args.empty() || (!args[0].isObject() && !args[0].isFunction())) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Temporal.PlainYearMonth.prototype.with requires an object argument"));
    }

    auto* obj = args[0].getObject();
    temporal_rs::PartialDate partial{};

    Value y = obj->getProperty("year");
    Value mo = obj->getProperty("month");
    Value mc = obj->getProperty("monthCode");

    if(!y.isUndefined())
        partial.year = static_cast<int32_t>(y.toNumber());
    if(!mo.isUndefined())
        partial.month = static_cast<uint8_t>(mo.toNumber());

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

    return wrapPlainYearMonth(std::move(result).ok().value());
}

// ============================================================================
// Arithmetic Methods
// ============================================================================

// ----------------------------------------------------------------------------
// 9.3.12 Temporal.PlainYearMonth.prototype.add ( temporalDurationLike [ , options ] )
// @spec https://tc39.es/proposal-temporal/#sec-temporal.plainyearmonth.prototype.add
//
// SIMPLIFIED: The options argument (overflow handling) defaults to
// "constrain" rather than being parsed from the options bag.
// ----------------------------------------------------------------------------
Value TemporalPlainYearMonth::add(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainYearMonthData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(Value("TypeError: add called on non-PlainYearMonth"));
    }

    if(args.empty()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Temporal.PlainYearMonth.prototype.add requires an argument"));
    }

    // Step 1: Let duration be ? ToTemporalDuration(temporalDurationLike).
    auto dur = parseDurationForYearMonth(args[0]);
    // Steps 2-4: Perform AddDurationToYearMonth and return the result.
    auto result = data->add(*dur, temporal_rs::ArithmeticOverflow::Constrain);
    if(!result.is_ok()) {
        throwTemporalError(std::move(result).err().value());
    }

    return wrapPlainYearMonth(std::move(result).ok().value());
}

// ----------------------------------------------------------------------------
// 9.3.13 Temporal.PlainYearMonth.prototype.subtract ( temporalDurationLike [ , options ] )
// @spec https://tc39.es/proposal-temporal/#sec-temporal.plainyearmonth.prototype.subtract
//
// SIMPLIFIED: The options argument defaults to "constrain".
// ----------------------------------------------------------------------------
Value TemporalPlainYearMonth::subtract(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainYearMonthData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: subtract called on non-PlainYearMonth"));
    }

    if(args.empty()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Temporal.PlainYearMonth.prototype.subtract requires an argument"));
    }

    // Step 1: Let duration be ? ToTemporalDuration(temporalDurationLike).
    auto dur = parseDurationForYearMonth(args[0]);
    // Steps 2-4: Negate and perform AddDurationToYearMonth, return the result.
    auto result = data->subtract(*dur, temporal_rs::ArithmeticOverflow::Constrain);
    if(!result.is_ok()) {
        throwTemporalError(std::move(result).err().value());
    }

    return wrapPlainYearMonth(std::move(result).ok().value());
}

// ============================================================================
// Difference Methods
// ============================================================================

// ----------------------------------------------------------------------------
// 9.3.14 Temporal.PlainYearMonth.prototype.until ( other [ , options ] )
// @spec https://tc39.es/proposal-temporal/#sec-temporal.plainyearmonth.prototype.until
//
// Returns a Duration representing the time from this to other.
// SIMPLIFIED: The options argument (smallestUnit, largestUnit,
// roundingIncrement, roundingMode) is not parsed — uses defaults.
// ----------------------------------------------------------------------------
Value TemporalPlainYearMonth::until(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainYearMonthData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: until called on non-PlainYearMonth"));
    }

    if(args.empty()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Temporal.PlainYearMonth.prototype.until requires an argument"));
    }

    // Step 1: Set other to ? ToTemporalYearMonth(other).
    auto other = parsePlainYearMonthFromValue(args[0]);
    temporal_rs::DifferenceSettings settings{std::nullopt, std::nullopt, std::nullopt,
                                             std::nullopt};

    auto result = data->until(*other, settings);
    if(!result.is_ok()) {
        throwTemporalError(std::move(result).err().value());
    }

    return TemporalDuration::wrapDuration(std::move(result).ok().value());
}

// ----------------------------------------------------------------------------
// 9.3.15 Temporal.PlainYearMonth.prototype.since ( other [ , options ] )
// @spec https://tc39.es/proposal-temporal/#sec-temporal.plainyearmonth.prototype.since
//
// Returns a Duration representing the time from other to this.
// SIMPLIFIED: The options argument is not parsed — uses defaults.
// ----------------------------------------------------------------------------
Value TemporalPlainYearMonth::since(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainYearMonthData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: since called on non-PlainYearMonth"));
    }

    if(args.empty()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Temporal.PlainYearMonth.prototype.since requires an argument"));
    }

    // Step 1: Set other to ? ToTemporalYearMonth(other).
    auto other = parsePlainYearMonthFromValue(args[0]);
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
// 9.3.16 Temporal.PlainYearMonth.prototype.equals ( other )
// @spec https://tc39.es/proposal-temporal/#sec-temporal.plainyearmonth.prototype.equals
//
// Returns true if this and other represent the same year-month and calendar.
// ----------------------------------------------------------------------------
Value TemporalPlainYearMonth::equals(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainYearMonthData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: equals called on non-PlainYearMonth"));
    }

    if(args.empty() || (!args[0].isObject() && !args[0].isFunction())) {
        return Value(false);
    }

    auto* other = PlainYearMonthRegistry::get(args[0].getObject());
    if(!other) {
        return Value(false);
    }

    return Value(data->equals(*other));
}

// ============================================================================
// Conversion Methods
// ============================================================================

// ----------------------------------------------------------------------------
// 9.3.18 Temporal.PlainYearMonth.prototype.toPlainDate ( item )
// @spec https://tc39.es/proposal-temporal/#sec-temporal.plainyearmonth.prototype.toplaindate
//
// Returns a PlainDate by merging this PlainYearMonth with a day from
// the item argument (which must be an object with a "day" property).
// SIMPLIFIED: The spec performs full CalendarMergeFields and
// CalendarDateFromFields steps; Rift extracts the day directly and
// delegates to temporal_rs.
// ----------------------------------------------------------------------------
Value TemporalPlainYearMonth::toPlainDate(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainYearMonthData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: toPlainDate called on non-PlainYearMonth"));
    }

    if(args.empty() || (!args[0].isObject() && !args[0].isFunction())) {
        throw rift::core::JavaScriptException(Value(
            "TypeError: Temporal.PlainYearMonth.prototype.toPlainDate requires a {day} object"));
    }

    auto* obj = args[0].getObject();
    Value day_val = obj->getProperty("day");
    if(day_val.isUndefined()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: toPlainDate requires a 'day' property"));
    }

    temporal_rs::PartialDate partial{};
    partial.day = static_cast<uint8_t>(day_val.toNumber());
    partial.calendar = data->calendar().kind();

    auto result = data->to_plain_date(partial);
    if(!result.is_ok()) {
        throwTemporalError(std::move(result).err().value());
    }

    return TemporalPlainDate::wrapPlainDate(std::move(result).ok().value());
}

// ============================================================================
// String Conversion Methods
// ============================================================================

// ----------------------------------------------------------------------------
// 9.3.17 Temporal.PlainYearMonth.prototype.toString ( [ options ] )
// @spec https://tc39.es/proposal-temporal/#sec-temporal.plainyearmonth.prototype.tostring
//
// Returns an ISO 8601 / IXDTF string representation.
// SIMPLIFIED: The options argument (calendarName) is not parsed —
// uses auto calendar display.
// ----------------------------------------------------------------------------
Value TemporalPlainYearMonth::toString(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainYearMonthData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: toString called on non-PlainYearMonth"));
    }

    return Value(data->to_ixdtf_string(temporal_rs::DisplayCalendar::Auto));
}

// ----------------------------------------------------------------------------
// 9.3.19 Temporal.PlainYearMonth.prototype.toJSON ( )
// @spec https://tc39.es/proposal-temporal/#sec-temporal.plainyearmonth.prototype.tojson
//
// Equivalent to toString with no options.
// ----------------------------------------------------------------------------
Value TemporalPlainYearMonth::toJSON(const CallContext& ctx, const std::vector<Value>& args) {
    return toString(ctx, args);
}

// ----------------------------------------------------------------------------
// 9.3.20 Temporal.PlainYearMonth.prototype.valueOf ( )
// @spec https://tc39.es/proposal-temporal/#sec-temporal.plainyearmonth.prototype.valueof
//
// Always throws TypeError — Temporal types are not comparable with < or >.
// ----------------------------------------------------------------------------
Value TemporalPlainYearMonth::valueOf(const CallContext& ctx, const std::vector<Value>& args) {
    throw rift::core::JavaScriptException(
        Value("TypeError: Cannot convert a Temporal.PlainYearMonth to a primitive value"));
}

// ============================================================================
// Private
// ============================================================================

JSObject* TemporalPlainYearMonth::getGlobalPrototype() {
    return rift::core::BuiltinManager::getPlainYearMonthPrototype();
}

// ----------------------------------------------------------------------------
// get Temporal.PlainYearMonth.prototype.era
Value TemporalPlainYearMonth::era(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainYearMonthData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(Value("TypeError: era called on non-PlainYearMonth"));
    }
    std::string era_str = data->era();
    if(era_str.empty()) {
        return Value::undefined();
    }
    return Value(era_str);
}

// get Temporal.PlainYearMonth.prototype.eraYear
Value TemporalPlainYearMonth::eraYear(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainYearMonthData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: eraYear called on non-PlainYearMonth"));
    }
    auto ey = data->era_year();
    if(ey.has_value()) {
        return Value(static_cast<double>(ey.value()));
    }
    return Value::undefined();
}

// 9.3.21 Temporal.PlainYearMonth.prototype.toLocaleString ( [ locales [ , options ] ] )
// @spec https://tc39.es/proposal-temporal/#sec-temporal.plainyearmonth.prototype.tolocalestring
//
// SIMPLIFIED: No Intl support — delegates to toString().
// ----------------------------------------------------------------------------
Value TemporalPlainYearMonth::toLocaleString(const CallContext& ctx,
                                             const std::vector<Value>& args) {
    return toString(ctx, args);
}

}  // namespace rift::builtins
