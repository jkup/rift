#include "rift/builtins/temporal/zoned_date_time.h"

#include "rift/builtins/builtin_manager.h"
#include "rift/builtins/temporal/duration.h"
#include "rift/builtins/temporal/instant.h"
#include "rift/builtins/temporal/plain_date.h"
#include "rift/builtins/temporal/plain_date_time.h"
#include "rift/builtins/temporal/plain_time.h"
#include "rift/interpreter/javascript_exception.h"
#include "rift/interpreter/this_helpers.h"
#include "rift/memory/gc_protector.h"
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
#include "temporal_rs/RoundingOptions.hpp"
#include "temporal_rs/TimeZone.hpp"
#include "temporal_rs/ToStringRoundingOptions.hpp"
#include "temporal_rs/TransitionDirection.hpp"
#include "temporal_rs/Unit.hpp"
#include "temporal_rs/ZonedDateTime.hpp"

// ============================================================================
// Temporal Proposal -- Temporal.ZonedDateTime Objects (Sections 6.1-6.5)
// @spec https://tc39.es/proposal-temporal/#sec-temporal-zoneddatetime-objects
//
// Temporal.ZonedDateTime represents an exact date and time in a particular
// time zone. It combines an Instant (exact time), a TimeZone, and a
// Calendar, making it the most comprehensive Temporal type for
// representing a moment in time as humans experience it.
//
// DEVIATION: The spec uses [[EpochNanoseconds]], [[TimeZone]], and
// [[Calendar]] internal slots. Rift delegates computation to the
// temporal_rs Rust library via FFI and stores internal data in a static
// registry (ZonedDateTimeRegistry) instead of internal slots. The
// registry maps JSObject* -> unique_ptr<ZonedDateTime>.
//
// DEVIATION: Without BigInt support, epochNanoseconds is approximated
// from epochMilliseconds * 1e6 rather than stored as an exact value.
// ============================================================================

namespace rift::builtins {

using rift::core::extractThisObject;

// ============================================================================
// ZonedDateTimeRegistry
// NON-STANDARD: Static registry for ZonedDateTime internal data.
// The spec stores data in [[EpochNanoseconds]], [[TimeZone]], and
// [[Calendar]] internal slots. Rift uses a global
// unordered_map<JSObject*, unique_ptr<ZonedDateTime>> as a substitute.
// ============================================================================

std::unordered_map<JSObject*, std::unique_ptr<temporal_rs::ZonedDateTime>>
    ZonedDateTimeRegistry::registry_;

void ZonedDateTimeRegistry::store(JSObject* obj, std::unique_ptr<temporal_rs::ZonedDateTime> data) {
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

// NON-STANDARD: Internal helper to extract ZonedDateTime data from the
// receiver (this value) by looking up the JSObject in the registry.
static temporal_rs::ZonedDateTime* getZonedDateTimeData(const CallContext& ctx) {
    auto* obj = extractThisObject(ctx);
    if(obj) {
        return ZonedDateTimeRegistry::get(obj);
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

// NON-STANDARD: Helper to parse a string unit name to temporal_rs::Unit.
static temporal_rs::Unit parseUnit(const std::string& str) {
    if(str == "year" || str == "years")
        return temporal_rs::Unit::Year;
    if(str == "month" || str == "months")
        return temporal_rs::Unit::Month;
    if(str == "week" || str == "weeks")
        return temporal_rs::Unit::Week;
    if(str == "day" || str == "days")
        return temporal_rs::Unit::Day;
    if(str == "hour" || str == "hours")
        return temporal_rs::Unit::Hour;
    if(str == "minute" || str == "minutes")
        return temporal_rs::Unit::Minute;
    if(str == "second" || str == "seconds")
        return temporal_rs::Unit::Second;
    if(str == "millisecond" || str == "milliseconds")
        return temporal_rs::Unit::Millisecond;
    if(str == "microsecond" || str == "microseconds")
        return temporal_rs::Unit::Microsecond;
    if(str == "nanosecond" || str == "nanoseconds")
        return temporal_rs::Unit::Nanosecond;
    throw rift::core::JavaScriptException(Value("RangeError: Invalid unit: " + str));
}

// ----------------------------------------------------------------------------
// NON-STANDARD: Internal helper to parse a ZonedDateTime from a JS Value.
// Handles three cases:
//   1. Value is already a Temporal.ZonedDateTime object (clone it)
//   2. Value is a property bag object (extract date/time/timezone fields)
//   3. Value is a string (parse as IXDTF string with timezone annotation)
//
// This implements parts of:
//   6.5.2 ToTemporalZonedDateTime ( item [ , options ] )
//   @spec https://tc39.es/proposal-temporal/#sec-temporal-totemporalzoneddatetime
//
// SIMPLIFIED: Option bag parsing (disambiguation, offset, overflow) is
// not fully handled.
// SIMPLIFIED: Calendar reconciliation is not implemented — defaults to
// ISO calendar.
// SIMPLIFIED: String parsing uses fixed Disambiguation::Compatible and
// OffsetDisambiguation::Reject rather than reading from options.
// ----------------------------------------------------------------------------
static std::unique_ptr<temporal_rs::ZonedDateTime> parseZonedDateTimeFromValue(const Value& val) {
    if(val.isObject() || val.isFunction()) {
        // Step: If item has [[EpochNanoseconds]] internal slot, return a copy.
        auto* data = ZonedDateTimeRegistry::get(val.getObject());
        if(data) {
            return data->clone();
        }

        // Step: Otherwise, treat as a property bag.
        auto* obj = val.getObject();
        temporal_rs::PartialDate date_partial{};
        temporal_rs::PartialTime time_partial{};

        Value y = obj->getProperty("year");
        Value mo = obj->getProperty("month");
        Value mc = obj->getProperty("monthCode");
        Value d = obj->getProperty("day");

        if(!y.isUndefined())
            date_partial.year = static_cast<int32_t>(y.toNumber());
        if(!mo.isUndefined())
            date_partial.month = static_cast<uint8_t>(mo.toNumber());
        if(!d.isUndefined())
            date_partial.day = static_cast<uint8_t>(d.toNumber());

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

        if(!h.isUndefined())
            time_partial.hour = static_cast<uint8_t>(h.toNumber());
        if(!mi.isUndefined())
            time_partial.minute = static_cast<uint8_t>(mi.toNumber());
        if(!s.isUndefined())
            time_partial.second = static_cast<uint8_t>(s.toNumber());
        if(!ms.isUndefined())
            time_partial.millisecond = static_cast<uint16_t>(ms.toNumber());
        if(!us.isUndefined())
            time_partial.microsecond = static_cast<uint16_t>(us.toNumber());
        if(!ns.isUndefined())
            time_partial.nanosecond = static_cast<uint16_t>(ns.toNumber());

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

        auto result = temporal_rs::ZonedDateTime::from_partial(partial, std::nullopt, std::nullopt,
                                                               std::nullopt);
        if(!result.is_ok()) {
            throwTemporalError(std::move(result).err().value());
        }
        return std::move(result).ok().value();
    }

    // Step: If item is a string, parse it.
    std::string str = val.toString();
    auto result = temporal_rs::ZonedDateTime::from_utf8(
        str, temporal_rs::Disambiguation::Compatible, temporal_rs::OffsetDisambiguation::Reject);
    if(!result.is_ok()) {
        throwTemporalError(std::move(result).err().value());
    }
    return std::move(result).ok().value();
}

// ----------------------------------------------------------------------------
// NON-STANDARD: Internal helper to parse a Duration from a JS Value for
// ZonedDateTime arithmetic (add/subtract).
//
// Implements parts of:
//   7.5.15 ToTemporalDuration ( item )
//   @spec https://tc39.es/proposal-temporal/#sec-temporal-totemporalduration
// ----------------------------------------------------------------------------
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

// NON-STANDARD: Internal helper to wrap a temporal_rs::ZonedDateTime into
// a JS object with the ZonedDateTime prototype and register it.
Value TemporalZonedDateTime::wrapZonedDateTime(std::unique_ptr<temporal_rs::ZonedDateTime> zdt) {
    auto* proto = getGlobalPrototype();
    auto* js_obj = getObjectFactory()->createJSObject(proto);
    rift::memory::GCProtector protect(js_obj, getObjectFactory()->getObjectManager());

    ZonedDateTimeRegistry::store(js_obj, std::move(zdt));

    return Value(js_obj);
}

// ============================================================================
// Setup Methods
// ============================================================================

// ----------------------------------------------------------------------------
// 6.2 Properties of the Temporal.ZonedDateTime Constructor
// @spec https://tc39.es/proposal-temporal/#sec-properties-of-the-temporal-zoneddatetime-constructor
// ----------------------------------------------------------------------------
void TemporalZonedDateTime::setupStaticMethods(JSObject* constructor,
                                               rift::memory::ObjectFactory* factory) {
    // 6.2.2 Temporal.ZonedDateTime.from ( item [ , options ] )
    RIFT_STATIC_METHOD(constructor, "from", 1, TemporalZonedDateTime::from);
    // 6.2.3 Temporal.ZonedDateTime.compare ( one, two )
    RIFT_STATIC_METHOD(constructor, "compare", 2, TemporalZonedDateTime::compare);
}

// ----------------------------------------------------------------------------
// 6.3 Properties of the Temporal.ZonedDateTime Prototype Object
// @spec
// https://tc39.es/proposal-temporal/#sec-properties-of-the-temporal-zoneddatetime-prototype-object
// ----------------------------------------------------------------------------
void TemporalZonedDateTime::setupPrototypeMethods(JSObject* prototype,
                                                  rift::memory::ObjectFactory* factory) {
    // 6.3.3-6.3.14 Date getters
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

    // 6.3.15-6.3.20 Time getters
    RIFT_GETTER(prototype, "hour", TemporalZonedDateTime::hour);
    RIFT_GETTER(prototype, "minute", TemporalZonedDateTime::minute);
    RIFT_GETTER(prototype, "second", TemporalZonedDateTime::second);
    RIFT_GETTER(prototype, "millisecond", TemporalZonedDateTime::millisecond);
    RIFT_GETTER(prototype, "microsecond", TemporalZonedDateTime::microsecond);
    RIFT_GETTER(prototype, "nanosecond", TemporalZonedDateTime::nanosecond);

    // 6.3.4 get Temporal.ZonedDateTime.prototype.timeZoneId
    RIFT_GETTER(prototype, "timeZoneId", TemporalZonedDateTime::timeZoneId);
    // 6.3.23 get Temporal.ZonedDateTime.prototype.offset
    RIFT_GETTER(prototype, "offset", TemporalZonedDateTime::offset);
    // 6.3.22 get Temporal.ZonedDateTime.prototype.offsetNanoseconds
    RIFT_GETTER(prototype, "offsetNanoseconds", TemporalZonedDateTime::offsetNanoseconds);
    // 6.3.20 get Temporal.ZonedDateTime.prototype.epochMilliseconds
    RIFT_GETTER(prototype, "epochMilliseconds", TemporalZonedDateTime::epochMilliseconds);
    // 6.3.21 get Temporal.ZonedDateTime.prototype.epochNanoseconds
    RIFT_GETTER(prototype, "epochNanoseconds", TemporalZonedDateTime::epochNanoseconds);

    // 6.3.24 Temporal.ZonedDateTime.prototype.with ( temporalZonedDateTimeLike [ , options ] )
    RIFT_METHOD(prototype, "with", 1, TemporalZonedDateTime::with);
    // 6.3.26 Temporal.ZonedDateTime.prototype.withTimeZone ( timeZoneLike )
    RIFT_METHOD(prototype, "withTimeZone", 1, TemporalZonedDateTime::withTimeZone);
    // 6.3.25 Temporal.ZonedDateTime.prototype.withCalendar ( calendarLike )
    RIFT_METHOD(prototype, "withCalendar", 1, TemporalZonedDateTime::withCalendar);
    // 6.3.27 Temporal.ZonedDateTime.prototype.withPlainTime ( [ plainTimeLike ] )
    RIFT_METHOD(prototype, "withPlainTime", 0, TemporalZonedDateTime::withPlainTime);

    // 6.3.28 Temporal.ZonedDateTime.prototype.add ( temporalDurationLike [ , options ] )
    RIFT_METHOD(prototype, "add", 1, TemporalZonedDateTime::add);
    // 6.3.29 Temporal.ZonedDateTime.prototype.subtract ( temporalDurationLike [ , options ] )
    RIFT_METHOD(prototype, "subtract", 1, TemporalZonedDateTime::subtract);

    // 6.3.30 Temporal.ZonedDateTime.prototype.until ( other [ , options ] )
    RIFT_METHOD(prototype, "until", 1, TemporalZonedDateTime::until);
    // 6.3.31 Temporal.ZonedDateTime.prototype.since ( other [ , options ] )
    RIFT_METHOD(prototype, "since", 1, TemporalZonedDateTime::since);

    // 6.3.32 Temporal.ZonedDateTime.prototype.round ( roundTo )
    RIFT_METHOD(prototype, "round", 1, TemporalZonedDateTime::round);

    // 6.3.33 Temporal.ZonedDateTime.prototype.equals ( other )
    RIFT_METHOD(prototype, "equals", 1, TemporalZonedDateTime::equals);

    // 6.3.35 Temporal.ZonedDateTime.prototype.getTimeZoneTransition ( direction )
    RIFT_METHOD(prototype, "getTimeZoneTransition", 1,
                TemporalZonedDateTime::getTimeZoneTransition);

    // 6.3.36 Temporal.ZonedDateTime.prototype.toInstant ( )
    RIFT_METHOD(prototype, "toInstant", 0, TemporalZonedDateTime::toInstant);
    // 6.3.37 Temporal.ZonedDateTime.prototype.toPlainDate ( )
    RIFT_METHOD(prototype, "toPlainDate", 0, TemporalZonedDateTime::toPlainDate);
    // 6.3.38 Temporal.ZonedDateTime.prototype.toPlainTime ( )
    RIFT_METHOD(prototype, "toPlainTime", 0, TemporalZonedDateTime::toPlainTime);
    // 6.3.39 Temporal.ZonedDateTime.prototype.toPlainDateTime ( )
    RIFT_METHOD(prototype, "toPlainDateTime", 0, TemporalZonedDateTime::toPlainDateTime);

    // 6.3.34 Temporal.ZonedDateTime.prototype.startOfDay ( )
    RIFT_METHOD(prototype, "startOfDay", 0, TemporalZonedDateTime::startOfDay);
    // 6.3.19 get Temporal.ZonedDateTime.prototype.hoursInDay
    RIFT_METHOD(prototype, "hoursInDay", 0, TemporalZonedDateTime::hoursInDay);

    // 6.3.35 Temporal.ZonedDateTime.prototype.toString ( [ options ] )
    RIFT_METHOD(prototype, "toString", 0, TemporalZonedDateTime::toString);
    // 6.3.42 Temporal.ZonedDateTime.prototype.toLocaleString ( [ locales [ , options ] ] )
    RIFT_METHOD(prototype, "toLocaleString", 0, TemporalZonedDateTime::toLocaleString);
    // 6.3.40 Temporal.ZonedDateTime.prototype.toJSON ( )
    RIFT_METHOD(prototype, "toJSON", 0, TemporalZonedDateTime::toJSON);
    // 6.3.41 Temporal.ZonedDateTime.prototype.valueOf ( )
    RIFT_METHOD(prototype, "valueOf", 0, TemporalZonedDateTime::valueOf);
}

// ============================================================================
// Constructor
// ============================================================================

// ----------------------------------------------------------------------------
// 6.1.1 Temporal.ZonedDateTime ( epochNanoseconds, timeZoneLike [ , calendarLike ] )
// @spec https://tc39.es/proposal-temporal/#sec-temporal.zoneddatetime
//
// INCOMPLETE: Step 1 (NewTarget check) not enforced.
// DEVIATION: The spec takes epochNanoseconds as a BigInt. Rift takes it
// as a Number and converts nanoseconds to milliseconds (dividing by 1e6)
// since BigInt is not yet supported. This loses sub-millisecond precision.
// SIMPLIFIED: Calendar argument is accepted as a string only.
// DEVIATION: Uses from_epoch_milliseconds instead of storing the raw
// epochNanoseconds BigInt, then applies calendar separately if non-ISO.
// ----------------------------------------------------------------------------
Value TemporalZonedDateTime::constructor(const CallContext& ctx, const std::vector<Value>& args) {
    // Step 1: If NewTarget is undefined, throw a TypeError. (INCOMPLETE)
    // Step 2: Set epochNanoseconds to ? ToBigInt(epochNanoseconds).
    if(args.size() < 2) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Temporal.ZonedDateTime requires epochNanoseconds and timeZone"));
    }

    // DEVIATION: Convert nanoseconds Number to milliseconds (no BigInt).
    double epoch_ns_value = args[0].toNumber();
    int64_t epoch_ms = static_cast<int64_t>(epoch_ns_value / 1e6);

    // Step 3: Let timeZone be ? ToTemporalTimeZoneIdentifier(timeZoneLike).
    std::string tz_str = args[1].toString();
    auto tz_result = temporal_rs::TimeZone::try_from_str(tz_str);
    if(!tz_result.is_ok()) {
        throwTemporalError(std::move(tz_result).err().value());
    }
    auto timezone = std::move(tz_result).ok().value();

    // Step 4: If calendarLike is not undefined, let calendar be
    // ? ToTemporalCalendarIdentifier(calendarLike).
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

    // Step 5: Return ? CreateTemporalZonedDateTime(epochNanoseconds, timeZone, calendar).
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

// ============================================================================
// Static Methods
// ============================================================================

// ----------------------------------------------------------------------------
// 6.2.2 Temporal.ZonedDateTime.from ( item [ , options ] )
// @spec https://tc39.es/proposal-temporal/#sec-temporal.zoneddatetime.from
//
// SIMPLIFIED: The options argument (disambiguation, offset, overflow)
// is not parsed.
// ----------------------------------------------------------------------------
Value TemporalZonedDateTime::from(const CallContext& ctx, const std::vector<Value>& args) {
    if(args.empty()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Temporal.ZonedDateTime.from requires an argument"));
    }

    auto zdt = parseZonedDateTimeFromValue(args[0]);
    return wrapZonedDateTime(std::move(zdt));
}

// ----------------------------------------------------------------------------
// 6.2.3 Temporal.ZonedDateTime.compare ( one, two )
// @spec https://tc39.es/proposal-temporal/#sec-temporal.zoneddatetime.compare
//
// Compares the exact instants (epochNanoseconds) of two ZonedDateTimes.
// Does not consider time zone or calendar differences.
// ----------------------------------------------------------------------------
Value TemporalZonedDateTime::compare(const CallContext& ctx, const std::vector<Value>& args) {
    if(args.size() < 2) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Temporal.ZonedDateTime.compare requires two arguments"));
    }

    // Step 1: Set one to ? ToTemporalZonedDateTime(one).
    auto zdt_one = parseZonedDateTimeFromValue(args[0]);
    // Step 2: Set two to ? ToTemporalZonedDateTime(two).
    auto zdt_two = parseZonedDateTimeFromValue(args[1]);

    // Step 3: Return CompareEpochNanoseconds(one.[[EpochNanoseconds]], two.[[EpochNanoseconds]]).
    int8_t cmp = zdt_one->compare_instant(*zdt_two);
    return Value(static_cast<double>(cmp));
}

// ============================================================================
// Prototype Getters -- Date Fields
// @spec
// https://tc39.es/proposal-temporal/#sec-properties-of-the-temporal-zoneddatetime-prototype-object
//
// Each date getter first computes the wall-clock PlainDateTime from the
// instant + timezone, then calls the corresponding calendar operation.
// DEVIATION: Rift delegates all computation to temporal_rs via FFI.
// ============================================================================

// 6.3.5 get Temporal.ZonedDateTime.prototype.calendarId
// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.zoneddatetime.prototype.calendarid
Value TemporalZonedDateTime::calendarId(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getZonedDateTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: calendarId called on non-ZonedDateTime"));
    }
    return Value(std::string(data->calendar().identifier()));
}

// 6.3.6 get Temporal.ZonedDateTime.prototype.year
// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.zoneddatetime.prototype.year
Value TemporalZonedDateTime::year(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getZonedDateTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(Value("TypeError: year called on non-ZonedDateTime"));
    }
    return Value(static_cast<double>(data->year()));
}

// 6.3.7 get Temporal.ZonedDateTime.prototype.month
// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.zoneddatetime.prototype.month
Value TemporalZonedDateTime::month(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getZonedDateTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: month called on non-ZonedDateTime"));
    }
    return Value(static_cast<double>(data->month()));
}

// 6.3.8 get Temporal.ZonedDateTime.prototype.monthCode
// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.zoneddatetime.prototype.monthcode
Value TemporalZonedDateTime::monthCode(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getZonedDateTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: monthCode called on non-ZonedDateTime"));
    }
    return Value(data->month_code());
}

// 6.3.9 get Temporal.ZonedDateTime.prototype.day
// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.zoneddatetime.prototype.day
Value TemporalZonedDateTime::day(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getZonedDateTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(Value("TypeError: day called on non-ZonedDateTime"));
    }
    return Value(static_cast<double>(data->day()));
}

// 6.3.10 get Temporal.ZonedDateTime.prototype.dayOfWeek
// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.zoneddatetime.prototype.dayofweek
Value TemporalZonedDateTime::dayOfWeek(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getZonedDateTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: dayOfWeek called on non-ZonedDateTime"));
    }
    return Value(static_cast<double>(data->day_of_week()));
}

// 6.3.11 get Temporal.ZonedDateTime.prototype.dayOfYear
// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.zoneddatetime.prototype.dayofyear
Value TemporalZonedDateTime::dayOfYear(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getZonedDateTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: dayOfYear called on non-ZonedDateTime"));
    }
    return Value(static_cast<double>(data->day_of_year()));
}

// 6.3.12 get Temporal.ZonedDateTime.prototype.weekOfYear
// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.zoneddatetime.prototype.weekofyear
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

// 6.3.15 get Temporal.ZonedDateTime.prototype.daysInMonth
// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.zoneddatetime.prototype.daysinmonth
Value TemporalZonedDateTime::daysInMonth(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getZonedDateTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: daysInMonth called on non-ZonedDateTime"));
    }
    return Value(static_cast<double>(data->days_in_month()));
}

// 6.3.16 get Temporal.ZonedDateTime.prototype.daysInYear
// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.zoneddatetime.prototype.daysinyear
Value TemporalZonedDateTime::daysInYear(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getZonedDateTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: daysInYear called on non-ZonedDateTime"));
    }
    return Value(static_cast<double>(data->days_in_year()));
}

// 6.3.17 get Temporal.ZonedDateTime.prototype.monthsInYear
// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.zoneddatetime.prototype.monthsinyear
Value TemporalZonedDateTime::monthsInYear(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getZonedDateTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: monthsInYear called on non-ZonedDateTime"));
    }
    return Value(static_cast<double>(data->months_in_year()));
}

// 6.3.18 get Temporal.ZonedDateTime.prototype.inLeapYear
// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.zoneddatetime.prototype.inleapyear
Value TemporalZonedDateTime::inLeapYear(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getZonedDateTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: inLeapYear called on non-ZonedDateTime"));
    }
    return Value(data->in_leap_year());
}

// ============================================================================
// Prototype Getters -- Time Fields
// @spec
// https://tc39.es/proposal-temporal/#sec-properties-of-the-temporal-zoneddatetime-prototype-object
//
// Each time getter computes the wall-clock time from the instant + timezone.
// ============================================================================

// 6.3.15 get Temporal.ZonedDateTime.prototype.hour
// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.zoneddatetime.prototype.hour
Value TemporalZonedDateTime::hour(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getZonedDateTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(Value("TypeError: hour called on non-ZonedDateTime"));
    }
    return Value(static_cast<double>(data->hour()));
}

// 6.3.16 get Temporal.ZonedDateTime.prototype.minute
// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.zoneddatetime.prototype.minute
Value TemporalZonedDateTime::minute(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getZonedDateTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: minute called on non-ZonedDateTime"));
    }
    return Value(static_cast<double>(data->minute()));
}

// 6.3.17 get Temporal.ZonedDateTime.prototype.second
// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.zoneddatetime.prototype.second
Value TemporalZonedDateTime::second(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getZonedDateTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: second called on non-ZonedDateTime"));
    }
    return Value(static_cast<double>(data->second()));
}

// 6.3.18 get Temporal.ZonedDateTime.prototype.millisecond
// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.zoneddatetime.prototype.millisecond
Value TemporalZonedDateTime::millisecond(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getZonedDateTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: millisecond called on non-ZonedDateTime"));
    }
    return Value(static_cast<double>(data->millisecond()));
}

// 6.3.19 get Temporal.ZonedDateTime.prototype.microsecond
// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.zoneddatetime.prototype.microsecond
Value TemporalZonedDateTime::microsecond(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getZonedDateTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: microsecond called on non-ZonedDateTime"));
    }
    return Value(static_cast<double>(data->microsecond()));
}

// 6.3.20 get Temporal.ZonedDateTime.prototype.nanosecond
// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.zoneddatetime.prototype.nanosecond
Value TemporalZonedDateTime::nanosecond(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getZonedDateTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: nanosecond called on non-ZonedDateTime"));
    }
    return Value(static_cast<double>(data->nanosecond()));
}

// ============================================================================
// Prototype Getters -- Timezone and Epoch Fields
// ============================================================================

// 6.3.4 get Temporal.ZonedDateTime.prototype.timeZoneId
// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.zoneddatetime.prototype.timezoneid
Value TemporalZonedDateTime::timeZoneId(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getZonedDateTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: timeZoneId called on non-ZonedDateTime"));
    }
    return Value(data->timezone().identifier());
}

// 6.3.23 get Temporal.ZonedDateTime.prototype.offset
// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.zoneddatetime.prototype.offset
//
// Returns the UTC offset string (e.g., "+05:30", "-08:00") for this
// ZonedDateTime's instant and timezone.
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

// 6.3.22 get Temporal.ZonedDateTime.prototype.offsetNanoseconds
// @spec
// https://tc39.es/proposal-temporal/#sec-get-temporal.zoneddatetime.prototype.offsetnanoseconds
//
// Returns the UTC offset as a number of nanoseconds.
Value TemporalZonedDateTime::offsetNanoseconds(const CallContext& ctx,
                                               const std::vector<Value>& args) {
    auto* data = getZonedDateTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: offsetNanoseconds called on non-ZonedDateTime"));
    }
    return Value(static_cast<double>(data->offset_nanoseconds()));
}

// 6.3.20 get Temporal.ZonedDateTime.prototype.epochMilliseconds
// @spec
// https://tc39.es/proposal-temporal/#sec-get-temporal.zoneddatetime.prototype.epochmilliseconds
//
// Returns the number of milliseconds since Unix epoch (1970-01-01T00:00Z).
Value TemporalZonedDateTime::epochMilliseconds(const CallContext& ctx,
                                               const std::vector<Value>& args) {
    auto* data = getZonedDateTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: epochMilliseconds called on non-ZonedDateTime"));
    }
    return Value(static_cast<double>(data->epoch_milliseconds()));
}

// 6.3.21 get Temporal.ZonedDateTime.prototype.epochNanoseconds
// @spec
// https://tc39.es/proposal-temporal/#sec-get-temporal.zoneddatetime.prototype.epochnanoseconds
//
// Returns the number of nanoseconds since Unix epoch as a BigInt.
// DEVIATION: Without BigInt support, Rift approximates this by
// multiplying epochMilliseconds by 1e6. This loses sub-millisecond
// precision and returns a Number instead of BigInt.
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

// ============================================================================
// Mutation Methods
// ============================================================================

// ----------------------------------------------------------------------------
// 6.3.24 Temporal.ZonedDateTime.prototype.with ( temporalZonedDateTimeLike [ , options ] )
// @spec https://tc39.es/proposal-temporal/#sec-temporal.zoneddatetime.prototype.with
//
// Returns a new ZonedDateTime with the fields from temporalZonedDateTimeLike
// merged into this ZonedDateTime, interpreting the result in the same
// time zone.
//
// SIMPLIFIED: The options argument (disambiguation, offset, overflow) is
// not parsed.
// SIMPLIFIED: The spec performs PrepareCalendarFields, CalendarMergeFields,
// and InterpretTemporalDateTimeFields steps; Rift extracts fields directly
// and delegates to temporal_rs.
// ----------------------------------------------------------------------------
Value TemporalZonedDateTime::with(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getZonedDateTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(Value("TypeError: with called on non-ZonedDateTime"));
    }

    if(args.empty() || (!args[0].isObject() && !args[0].isFunction())) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Temporal.ZonedDateTime.prototype.with requires an object argument"));
    }

    auto* obj = args[0].getObject();
    temporal_rs::PartialDate date_partial{};
    temporal_rs::PartialTime time_partial{};

    Value y = obj->getProperty("year");
    Value mo = obj->getProperty("month");
    Value mc = obj->getProperty("monthCode");
    Value d = obj->getProperty("day");

    if(!y.isUndefined())
        date_partial.year = static_cast<int32_t>(y.toNumber());
    if(!mo.isUndefined())
        date_partial.month = static_cast<uint8_t>(mo.toNumber());
    if(!d.isUndefined())
        date_partial.day = static_cast<uint8_t>(d.toNumber());

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

    if(!h.isUndefined())
        time_partial.hour = static_cast<uint8_t>(h.toNumber());
    if(!mi.isUndefined())
        time_partial.minute = static_cast<uint8_t>(mi.toNumber());
    if(!s.isUndefined())
        time_partial.second = static_cast<uint8_t>(s.toNumber());
    if(!ms.isUndefined())
        time_partial.millisecond = static_cast<uint16_t>(ms.toNumber());
    if(!us.isUndefined())
        time_partial.microsecond = static_cast<uint16_t>(us.toNumber());
    if(!ns.isUndefined())
        time_partial.nanosecond = static_cast<uint16_t>(ns.toNumber());

    temporal_rs::PartialZonedDateTime partial{date_partial, time_partial, std::nullopt,
                                              std::nullopt};

    auto result = data->with(partial, std::nullopt, std::nullopt, std::nullopt);
    if(!result.is_ok()) {
        throwTemporalError(std::move(result).err().value());
    }

    return wrapZonedDateTime(std::move(result).ok().value());
}

// ----------------------------------------------------------------------------
// 6.3.26 Temporal.ZonedDateTime.prototype.withTimeZone ( timeZoneLike )
// @spec https://tc39.es/proposal-temporal/#sec-temporal.zoneddatetime.prototype.withtimezone
//
// Returns a new ZonedDateTime with the same instant but in a different
// time zone. The wall-clock time will differ but the exact moment is preserved.
// ----------------------------------------------------------------------------
Value TemporalZonedDateTime::withTimeZone(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getZonedDateTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: withTimeZone called on non-ZonedDateTime"));
    }

    if(args.empty()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Temporal.ZonedDateTime.prototype.withTimeZone requires an argument"));
    }

    // Step 1: Let timeZone be ? ToTemporalTimeZoneIdentifier(timeZoneLike).
    std::string tz_str = args[0].toString();
    auto tz_result = temporal_rs::TimeZone::try_from_str(tz_str);
    if(!tz_result.is_ok()) {
        throwTemporalError(std::move(tz_result).err().value());
    }

    // Step 2: Return ! CreateTemporalZonedDateTime(this.[[EpochNanoseconds]], timeZone,
    // this.[[Calendar]]).
    auto result = data->with_timezone(std::move(tz_result).ok().value());
    if(!result.is_ok()) {
        throwTemporalError(std::move(result).err().value());
    }

    return wrapZonedDateTime(std::move(result).ok().value());
}

// ----------------------------------------------------------------------------
// 6.3.25 Temporal.ZonedDateTime.prototype.withCalendar ( calendarLike )
// @spec https://tc39.es/proposal-temporal/#sec-temporal.zoneddatetime.prototype.withcalendar
//
// Returns a new ZonedDateTime with the same instant and time zone but
// a different calendar. The wall-clock date fields may differ.
// ----------------------------------------------------------------------------
Value TemporalZonedDateTime::withCalendar(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getZonedDateTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: withCalendar called on non-ZonedDateTime"));
    }

    if(args.empty() || !args[0].isString()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Temporal.ZonedDateTime.prototype.withCalendar requires a string"));
    }

    // Step 1: Let calendar be ? ToTemporalCalendarIdentifier(calendarLike).
    auto cal = temporal_rs::AnyCalendarKind::get_for_str(args[0].getString());
    if(!cal.has_value()) {
        throw rift::core::JavaScriptException(
            Value("RangeError: Invalid calendar: " + args[0].getString()));
    }

    // Step 2: Return ! CreateTemporalZonedDateTime(this.[[EpochNanoseconds]], this.[[TimeZone]],
    // calendar).
    auto zdt = data->with_calendar(cal.value());
    return wrapZonedDateTime(std::move(zdt));
}

// ----------------------------------------------------------------------------
// 6.3.27 Temporal.ZonedDateTime.prototype.withPlainTime ( [ plainTimeLike ] )
// @spec https://tc39.es/proposal-temporal/#sec-temporal.zoneddatetime.prototype.withplaintime
//
// Returns a new ZonedDateTime with the time portion replaced. If no
// argument is provided, the time is set to midnight (00:00:00).
// ----------------------------------------------------------------------------
Value TemporalZonedDateTime::withPlainTime(const CallContext& ctx, const std::vector<Value>& args) {
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

// ============================================================================
// Arithmetic Methods
// ============================================================================

// ----------------------------------------------------------------------------
// 6.3.28 Temporal.ZonedDateTime.prototype.add ( temporalDurationLike [ , options ] )
// @spec https://tc39.es/proposal-temporal/#sec-temporal.zoneddatetime.prototype.add
//
// SIMPLIFIED: The options argument (overflow handling) is not parsed.
// ----------------------------------------------------------------------------
Value TemporalZonedDateTime::add(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getZonedDateTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(Value("TypeError: add called on non-ZonedDateTime"));
    }

    if(args.empty()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Temporal.ZonedDateTime.prototype.add requires an argument"));
    }

    // Step 1: Let duration be ? ToTemporalDuration(temporalDurationLike).
    auto dur = parseDurationForZonedDateTime(args[0]);
    // Steps 2-3: Perform AddDurationToZonedDateTime and return the result.
    auto result = data->add(*dur, std::nullopt);
    if(!result.is_ok()) {
        throwTemporalError(std::move(result).err().value());
    }

    return wrapZonedDateTime(std::move(result).ok().value());
}

// ----------------------------------------------------------------------------
// 6.3.29 Temporal.ZonedDateTime.prototype.subtract ( temporalDurationLike [ , options ] )
// @spec https://tc39.es/proposal-temporal/#sec-temporal.zoneddatetime.prototype.subtract
//
// SIMPLIFIED: The options argument is not parsed.
// ----------------------------------------------------------------------------
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

    // Step 1: Let duration be ? ToTemporalDuration(temporalDurationLike).
    auto dur = parseDurationForZonedDateTime(args[0]);
    // Steps 2-3: Negate and perform AddDurationToZonedDateTime, return the result.
    auto result = data->subtract(*dur, std::nullopt);
    if(!result.is_ok()) {
        throwTemporalError(std::move(result).err().value());
    }

    return wrapZonedDateTime(std::move(result).ok().value());
}

// ============================================================================
// Difference Methods
// ============================================================================

// ----------------------------------------------------------------------------
// 6.3.30 Temporal.ZonedDateTime.prototype.until ( other [ , options ] )
// @spec https://tc39.es/proposal-temporal/#sec-temporal.zoneddatetime.prototype.until
//
// Returns a Duration representing the time from this to other.
// SIMPLIFIED: The options argument (smallestUnit, largestUnit,
// roundingIncrement, roundingMode) is not parsed — uses defaults.
// ----------------------------------------------------------------------------
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

    // Step 1: Set other to ? ToTemporalZonedDateTime(other).
    auto other = parseZonedDateTimeFromValue(args[0]);
    temporal_rs::DifferenceSettings settings{std::nullopt, std::nullopt, std::nullopt,
                                             std::nullopt};

    auto result = data->until(*other, settings);
    if(!result.is_ok()) {
        throwTemporalError(std::move(result).err().value());
    }

    return TemporalDuration::wrapDuration(std::move(result).ok().value());
}

// ----------------------------------------------------------------------------
// 6.3.31 Temporal.ZonedDateTime.prototype.since ( other [ , options ] )
// @spec https://tc39.es/proposal-temporal/#sec-temporal.zoneddatetime.prototype.since
//
// Returns a Duration representing the time from other to this.
// SIMPLIFIED: The options argument is not parsed — uses defaults.
// ----------------------------------------------------------------------------
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

    // Step 1: Set other to ? ToTemporalZonedDateTime(other).
    auto other = parseZonedDateTimeFromValue(args[0]);
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
// 6.3.33 Temporal.ZonedDateTime.prototype.equals ( other )
// @spec https://tc39.es/proposal-temporal/#sec-temporal.zoneddatetime.prototype.equals
//
// Returns true if this and other have the same epochNanoseconds, timezone,
// and calendar.
// ----------------------------------------------------------------------------
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

// ============================================================================
// Conversion Methods
// ============================================================================

// ----------------------------------------------------------------------------
// 6.3.36 Temporal.ZonedDateTime.prototype.toInstant ( )
// @spec https://tc39.es/proposal-temporal/#sec-temporal.zoneddatetime.prototype.toinstant
//
// Returns a Temporal.Instant representing the same exact moment.
// ----------------------------------------------------------------------------
Value TemporalZonedDateTime::toInstant(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getZonedDateTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: toInstant called on non-ZonedDateTime"));
    }

    return TemporalInstant::wrapInstant(data->to_instant());
}

// ----------------------------------------------------------------------------
// 6.3.37 Temporal.ZonedDateTime.prototype.toPlainDate ( )
// @spec https://tc39.es/proposal-temporal/#sec-temporal.zoneddatetime.prototype.toplaindate
//
// Returns a PlainDate with the same date fields and calendar.
// ----------------------------------------------------------------------------
Value TemporalZonedDateTime::toPlainDate(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getZonedDateTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: toPlainDate called on non-ZonedDateTime"));
    }

    return TemporalPlainDate::wrapPlainDate(data->to_plain_date());
}

// ----------------------------------------------------------------------------
// 6.3.38 Temporal.ZonedDateTime.prototype.toPlainTime ( )
// @spec https://tc39.es/proposal-temporal/#sec-temporal.zoneddatetime.prototype.toplaintime
//
// Returns a PlainTime with the same time fields.
// ----------------------------------------------------------------------------
Value TemporalZonedDateTime::toPlainTime(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getZonedDateTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: toPlainTime called on non-ZonedDateTime"));
    }

    return TemporalPlainTime::wrapPlainTime(data->to_plain_time());
}

// ----------------------------------------------------------------------------
// 6.3.39 Temporal.ZonedDateTime.prototype.toPlainDateTime ( )
// @spec https://tc39.es/proposal-temporal/#sec-temporal.zoneddatetime.prototype.toplaindatetime
//
// Returns a PlainDateTime with the same date/time fields and calendar.
// The time zone information is discarded.
// ----------------------------------------------------------------------------
Value TemporalZonedDateTime::toPlainDateTime(const CallContext& ctx,
                                             const std::vector<Value>& args) {
    auto* data = getZonedDateTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: toPlainDateTime called on non-ZonedDateTime"));
    }

    return TemporalPlainDateTime::wrapPlainDateTime(data->to_plain_datetime());
}

// ============================================================================
// Special Methods
// ============================================================================

// ----------------------------------------------------------------------------
// 6.3.34 Temporal.ZonedDateTime.prototype.startOfDay ( )
// @spec https://tc39.es/proposal-temporal/#sec-temporal.zoneddatetime.prototype.startofday
//
// Returns a ZonedDateTime representing the start of the day (which may
// not be midnight in timezones with DST transitions at midnight).
// ----------------------------------------------------------------------------
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

// ----------------------------------------------------------------------------
// 6.3.19 get Temporal.ZonedDateTime.prototype.hoursInDay
// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.zoneddatetime.prototype.hoursinday
//
// Returns the number of real-world hours in this ZonedDateTime's day,
// accounting for DST transitions (e.g., 23 or 25 hours on DST change days).
// DEVIATION: Registered as a method rather than a getter.
// ----------------------------------------------------------------------------
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

// ============================================================================
// String Conversion Methods
// ============================================================================

// ----------------------------------------------------------------------------
// 6.3.35 Temporal.ZonedDateTime.prototype.toString ( [ options ] )
// @spec https://tc39.es/proposal-temporal/#sec-temporal.zoneddatetime.prototype.tostring
//
// Returns an IXDTF string representation including timezone annotation
// (e.g., "2024-03-15T10:30:00+05:30[Asia/Kolkata]").
// SIMPLIFIED: The options argument (fractionalSecondDigits, smallestUnit,
// roundingMode, calendarName, timeZoneName, offset) is not parsed —
// uses auto display for all components.
// ----------------------------------------------------------------------------
Value TemporalZonedDateTime::toString(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getZonedDateTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: toString called on non-ZonedDateTime"));
    }

    temporal_rs::Precision precision{false, std::nullopt};
    temporal_rs::ToStringRoundingOptions rounding_opts{precision, std::nullopt, std::nullopt};

    auto result =
        data->to_ixdtf_string(temporal_rs::DisplayOffset::Auto, temporal_rs::DisplayTimeZone::Auto,
                              temporal_rs::DisplayCalendar::Auto, rounding_opts);
    if(!result.is_ok()) {
        throwTemporalError(std::move(result).err().value());
    }

    return Value(std::move(result).ok().value());
}

// ----------------------------------------------------------------------------
// 6.3.40 Temporal.ZonedDateTime.prototype.toJSON ( )
// @spec https://tc39.es/proposal-temporal/#sec-temporal.zoneddatetime.prototype.tojson
//
// Equivalent to toString with no options.
// ----------------------------------------------------------------------------
Value TemporalZonedDateTime::toJSON(const CallContext& ctx, const std::vector<Value>& args) {
    return toString(ctx, args);
}

// ----------------------------------------------------------------------------
// 6.3.41 Temporal.ZonedDateTime.prototype.valueOf ( )
// @spec https://tc39.es/proposal-temporal/#sec-temporal.zoneddatetime.prototype.valueof
//
// Always throws TypeError — Temporal types are not comparable with < or >.
// ----------------------------------------------------------------------------
Value TemporalZonedDateTime::valueOf(const CallContext& ctx, const std::vector<Value>& args) {
    throw rift::core::JavaScriptException(
        Value("TypeError: Cannot convert a Temporal.ZonedDateTime to a primitive value"));
}

// ----------------------------------------------------------------------------
// 6.3.32 Temporal.ZonedDateTime.prototype.round ( roundTo )
// @spec https://tc39.es/proposal-temporal/#sec-temporal.zoneddatetime.prototype.round
//
// Rounds the zoned date-time to the given smallest unit.
// SIMPLIFIED: The roundingMode option is not parsed.
// ----------------------------------------------------------------------------
Value TemporalZonedDateTime::round(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getZonedDateTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: round called on non-ZonedDateTime"));
    }

    if(args.empty()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Temporal.ZonedDateTime.prototype.round requires an argument"));
    }

    temporal_rs::RoundingOptions options{std::nullopt, std::nullopt, std::nullopt, std::nullopt};

    if(args[0].isString()) {
        options.smallest_unit = parseUnit(args[0].getString());
    } else if(args[0].isObject() || args[0].isFunction()) {
        auto* obj = args[0].getObject();
        Value smallest = obj->getProperty("smallestUnit");
        Value largest = obj->getProperty("largestUnit");
        Value inc = obj->getProperty("roundingIncrement");

        if(!smallest.isUndefined())
            options.smallest_unit = parseUnit(smallest.toString());
        if(!largest.isUndefined())
            options.largest_unit = parseUnit(largest.toString());
        if(!inc.isUndefined())
            options.increment = static_cast<uint32_t>(inc.toNumber());
    }

    auto result = data->round(options);
    if(!result.is_ok()) {
        throwTemporalError(std::move(result).err().value());
    }

    return wrapZonedDateTime(std::move(result).ok().value());
}

// ----------------------------------------------------------------------------
// 6.3.35 Temporal.ZonedDateTime.prototype.getTimeZoneTransition ( direction )
// @spec
// https://tc39.es/proposal-temporal/#sec-temporal.zoneddatetime.prototype.gettimezonetransition
//
// Returns the next or previous time zone transition as a ZonedDateTime,
// or null if there is no such transition.
// ----------------------------------------------------------------------------
Value TemporalZonedDateTime::getTimeZoneTransition(const CallContext& ctx,
                                                   const std::vector<Value>& args) {
    auto* data = getZonedDateTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: getTimeZoneTransition called on non-ZonedDateTime"));
    }

    if(args.empty()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Temporal.ZonedDateTime.prototype.getTimeZoneTransition requires an "
                  "argument"));
    }

    temporal_rs::TransitionDirection dir = temporal_rs::TransitionDirection::Next;
    if(args[0].isString()) {
        std::string dir_str = args[0].getString();
        if(dir_str == "next") {
            dir = temporal_rs::TransitionDirection::Next;
        } else if(dir_str == "previous") {
            dir = temporal_rs::TransitionDirection::Previous;
        } else {
            throw rift::core::JavaScriptException(
                Value("RangeError: Invalid direction: " + dir_str));
        }
    } else if(args[0].isObject() || args[0].isFunction()) {
        auto* obj = args[0].getObject();
        Value dir_val = obj->getProperty("direction");
        if(!dir_val.isUndefined()) {
            std::string dir_str = dir_val.toString();
            if(dir_str == "next") {
                dir = temporal_rs::TransitionDirection::Next;
            } else if(dir_str == "previous") {
                dir = temporal_rs::TransitionDirection::Previous;
            } else {
                throw rift::core::JavaScriptException(
                    Value("RangeError: Invalid direction: " + dir_str));
            }
        }
    }

    auto result = data->get_time_zone_transition(dir);
    if(!result.is_ok()) {
        // If the error indicates no transition, return null
        return Value();  // null
    }

    return wrapZonedDateTime(std::move(result).ok().value());
}

// ----------------------------------------------------------------------------
// 6.3.42 Temporal.ZonedDateTime.prototype.toLocaleString ( [ locales [ , options ] ] )
// @spec https://tc39.es/proposal-temporal/#sec-temporal.zoneddatetime.prototype.tolocalestring
//
// SIMPLIFIED: No Intl support — delegates to toString().
// ----------------------------------------------------------------------------
Value TemporalZonedDateTime::toLocaleString(const CallContext& ctx,
                                            const std::vector<Value>& args) {
    return toString(ctx, args);
}

// ============================================================================
// Private
// ============================================================================

JSObject* TemporalZonedDateTime::getGlobalPrototype() {
    return rift::core::BuiltinManager::getZonedDateTimePrototype();
}

}  // namespace rift::builtins
