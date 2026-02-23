#include "rift/builtins/temporal/duration.h"

#include "rift/builtins/builtin_manager.h"
#include "rift/interpreter/javascript_exception.h"
#include "rift/interpreter/this_helpers.h"
#include "rift/memory/gc_protector.h"
#include "temporal_rs/Duration.hpp"
#include "temporal_rs/PartialDuration.hpp"
#include "temporal_rs/RelativeTo.hpp"
#include "temporal_rs/RoundingOptions.hpp"
#include "temporal_rs/Sign.hpp"
#include "temporal_rs/ToStringRoundingOptions.hpp"
#include "temporal_rs/Unit.hpp"

// ============================================================================
// Temporal Proposal -- Temporal.Duration Objects (Sections 7.1-7.5)
// @spec https://tc39.es/proposal-temporal/#sec-temporal-duration-objects
//
// Temporal.Duration represents a length of time expressed in calendar and
// clock units (years, months, weeks, days, hours, minutes, seconds,
// milliseconds, microseconds, nanoseconds). Unlike other Temporal types,
// Duration is not tied to a specific point in time or calendar.
//
// DEVIATION: The spec uses internal slots [[Years]], [[Months]], [[Weeks]],
// [[Days]], [[Hours]], [[Minutes]], [[Seconds]], [[Milliseconds]],
// [[Microseconds]], [[Nanoseconds]]. Rift delegates computation to the
// temporal_rs Rust library via FFI and stores internal data in a static
// registry (DurationRegistry) instead of internal slots. The registry
// maps JSObject* -> unique_ptr<Duration>.
// ============================================================================

namespace rift::builtins {

using rift::core::extractThisObject;

// ============================================================================
// DurationRegistry
// NON-STANDARD: Static registry for Duration internal data.
// The spec stores data in ten internal slots ([[Years]] through
// [[Nanoseconds]]). Rift uses a global
// unordered_map<JSObject*, unique_ptr<Duration>> as a substitute.
// ============================================================================

std::unordered_map<JSObject*, std::unique_ptr<temporal_rs::Duration>> DurationRegistry::registry_;

void DurationRegistry::store(JSObject* obj, std::unique_ptr<temporal_rs::Duration> data) {
    registry_[obj] = std::move(data);
}

temporal_rs::Duration* DurationRegistry::get(JSObject* obj) {
    auto it = registry_.find(obj);
    if(it != registry_.end()) {
        return it->second.get();
    }
    return nullptr;
}

void DurationRegistry::remove(JSObject* obj) {
    registry_.erase(obj);
}

void DurationRegistry::clear() {
    registry_.clear();
}

// NON-STANDARD: Internal helper to extract Duration data from the
// receiver (this value) by looking up the JSObject in the registry.
static temporal_rs::Duration* getDurationData(const CallContext& ctx) {
    auto* obj = extractThisObject(ctx);
    if(obj) {
        return DurationRegistry::get(obj);
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
// NON-STANDARD: Internal helper to parse a Duration from a JS Value.
// Handles three cases:
//   1. Value is already a Temporal.Duration object (clone it)
//   2. Value is a property bag object (extract duration fields)
//   3. Value is a string (parse as ISO 8601 duration)
//
// This implements parts of:
//   7.5.15 ToTemporalDuration ( item )
//   @spec https://tc39.es/proposal-temporal/#sec-temporal-totemporalduration
//
// SIMPLIFIED: Does not perform full ToTemporalDuration validation
// (e.g., mixed-sign checking is delegated to temporal_rs).
// ----------------------------------------------------------------------------
static std::unique_ptr<temporal_rs::Duration> parseDurationFromValue(const Value& val) {
    // If it's an object in the DurationRegistry, clone it
    if(val.isObject() || val.isFunction()) {
        // Step: If item has duration internal slots, return a copy.
        auto* data = DurationRegistry::get(val.getObject());
        if(data) {
            return data->clone();
        }

        // Step: Otherwise, treat as a property bag.
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

    // Step: If item is a string, parse it.
    std::string str = val.toString();
    auto result = temporal_rs::Duration::from_utf8(str);
    if(!result.is_ok()) {
        throwTemporalError(std::move(result).err().value());
    }
    return std::move(result).ok().value();
}

// NON-STANDARD: Internal helper to wrap a temporal_rs::Duration into a
// JS object with the Duration prototype and register it.
Value TemporalDuration::wrapDuration(std::unique_ptr<temporal_rs::Duration> dur) {
    auto* proto = getGlobalPrototype();
    auto* js_obj = getObjectFactory()->createJSObject(proto);
    rift::memory::GCProtector protect(js_obj, getObjectFactory()->getObjectManager());

    DurationRegistry::store(js_obj, std::move(dur));

    return Value(js_obj);
}

// ============================================================================
// Setup Methods
// ============================================================================

// ----------------------------------------------------------------------------
// 7.2 Properties of the Temporal.Duration Constructor
// @spec https://tc39.es/proposal-temporal/#sec-properties-of-the-temporal-duration-constructor
// ----------------------------------------------------------------------------
void TemporalDuration::setupStaticMethods(JSObject* constructor,
                                          rift::memory::ObjectFactory* factory) {
    // 7.2.2 Temporal.Duration.from ( item )
    RIFT_STATIC_METHOD(constructor, "from", 1, TemporalDuration::from);
    // 7.2.3 Temporal.Duration.compare ( one, two [ , options ] )
    RIFT_STATIC_METHOD(constructor, "compare", 2, TemporalDuration::compare);
}

// ----------------------------------------------------------------------------
// 7.3 Properties of the Temporal.Duration Prototype Object
// @spec https://tc39.es/proposal-temporal/#sec-properties-of-the-temporal-duration-prototype-object
// ----------------------------------------------------------------------------
void TemporalDuration::setupPrototypeMethods(JSObject* prototype,
                                             rift::memory::ObjectFactory* factory) {
    // 7.3.3-7.3.14 Getters
    RIFT_GETTER(prototype, "years", TemporalDuration::years);
    RIFT_GETTER(prototype, "months", TemporalDuration::months);
    RIFT_GETTER(prototype, "weeks", TemporalDuration::weeks);
    RIFT_GETTER(prototype, "days", TemporalDuration::days);
    RIFT_GETTER(prototype, "hours", TemporalDuration::hours);
    RIFT_GETTER(prototype, "minutes", TemporalDuration::minutes);
    RIFT_GETTER(prototype, "seconds", TemporalDuration::seconds);
    RIFT_GETTER(prototype, "milliseconds", TemporalDuration::milliseconds);
    RIFT_GETTER(prototype, "microseconds", TemporalDuration::microseconds);
    RIFT_GETTER(prototype, "nanoseconds", TemporalDuration::nanoseconds);
    // 7.3.13 get Temporal.Duration.prototype.sign
    RIFT_GETTER(prototype, "sign", TemporalDuration::sign);
    // 7.3.14 get Temporal.Duration.prototype.blank
    RIFT_GETTER(prototype, "blank", TemporalDuration::blank);

    // 7.3.17 Temporal.Duration.prototype.abs ( )
    RIFT_METHOD(prototype, "abs", 0, TemporalDuration::abs);
    // 7.3.16 Temporal.Duration.prototype.negated ( )
    RIFT_METHOD(prototype, "negated", 0, TemporalDuration::negated);
    // 7.3.18 Temporal.Duration.prototype.add ( other [ , options ] )
    RIFT_METHOD(prototype, "add", 1, TemporalDuration::add);
    // 7.3.19 Temporal.Duration.prototype.subtract ( other [ , options ] )
    RIFT_METHOD(prototype, "subtract", 1, TemporalDuration::subtract);

    // 7.3.20 Temporal.Duration.prototype.round ( roundTo )
    RIFT_METHOD(prototype, "round", 1, TemporalDuration::round);
    // 7.3.21 Temporal.Duration.prototype.total ( totalOf )
    RIFT_METHOD(prototype, "total", 1, TemporalDuration::total);

    // 7.3.22 Temporal.Duration.prototype.toString ( [ options ] )
    RIFT_METHOD(prototype, "toString", 0, TemporalDuration::toString);
    // 7.3.25 Temporal.Duration.prototype.toLocaleString ( [ locales [ , options ] ] )
    RIFT_METHOD(prototype, "toLocaleString", 0, TemporalDuration::toLocaleString);
    // 7.3.23 Temporal.Duration.prototype.toJSON ( )
    RIFT_METHOD(prototype, "toJSON", 0, TemporalDuration::toJSON);
    // 7.3.24 Temporal.Duration.prototype.valueOf ( )
    RIFT_METHOD(prototype, "valueOf", 0, TemporalDuration::valueOf);
}

// ============================================================================
// Constructor
// ============================================================================

// ----------------------------------------------------------------------------
// 7.1.1 Temporal.Duration ( [ years [ , months [ , weeks [ , days
//          [ , hours [ , minutes [ , seconds [ , milliseconds
//          [ , microseconds [ , nanoseconds ] ] ] ] ] ] ] ] ] ] )
// @spec https://tc39.es/proposal-temporal/#sec-temporal.duration
//
// All ten arguments are optional and default to 0.
// INCOMPLETE: Step 1 (NewTarget check) not enforced.
// DEVIATION: Delegates validation and creation to temporal_rs::Duration::create
// via FFI rather than implementing IsValidDuration inline.
// ----------------------------------------------------------------------------
Value TemporalDuration::constructor(const CallContext& ctx, const std::vector<Value>& args) {
    // Steps 2-11: Let years/months/.../nanoseconds be ? ToIntegerIfIntegral(arg) or 0.
    int64_t years_val = args.size() > 0 ? static_cast<int64_t>(args[0].toNumber()) : 0;
    int64_t months_val = args.size() > 1 ? static_cast<int64_t>(args[1].toNumber()) : 0;
    int64_t weeks_val = args.size() > 2 ? static_cast<int64_t>(args[2].toNumber()) : 0;
    int64_t days_val = args.size() > 3 ? static_cast<int64_t>(args[3].toNumber()) : 0;
    int64_t hours_val = args.size() > 4 ? static_cast<int64_t>(args[4].toNumber()) : 0;
    int64_t minutes_val = args.size() > 5 ? static_cast<int64_t>(args[5].toNumber()) : 0;
    int64_t seconds_val = args.size() > 6 ? static_cast<int64_t>(args[6].toNumber()) : 0;
    int64_t milliseconds_val = args.size() > 7 ? static_cast<int64_t>(args[7].toNumber()) : 0;
    double microseconds_val = args.size() > 8 ? args[8].toNumber() : 0.0;
    double nanoseconds_val = args.size() > 9 ? args[9].toNumber() : 0.0;

    // Step 12: Return ? CreateTemporalDuration(years, months, weeks, days,
    //          hours, minutes, seconds, milliseconds, microseconds, nanoseconds, NewTarget).
    auto result = temporal_rs::Duration::create(
        years_val, months_val, weeks_val, days_val, hours_val, minutes_val, seconds_val,
        milliseconds_val, microseconds_val, nanoseconds_val);
    if(!result.is_ok()) {
        throwTemporalError(std::move(result).err().value());
    }

    return wrapDuration(std::move(result).ok().value());
}

// ============================================================================
// Static Methods
// ============================================================================

// ----------------------------------------------------------------------------
// 7.2.2 Temporal.Duration.from ( item )
// @spec https://tc39.es/proposal-temporal/#sec-temporal.duration.from
//
// Creates a Duration from a string or property bag. If item is already a
// Duration, returns a copy (not the same object).
// ----------------------------------------------------------------------------
Value TemporalDuration::from(const CallContext& ctx, const std::vector<Value>& args) {
    if(args.empty()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Temporal.Duration.from requires an argument"));
    }

    auto dur = parseDurationFromValue(args[0]);
    return wrapDuration(std::move(dur));
}

// ----------------------------------------------------------------------------
// 7.2.3 Temporal.Duration.compare ( one, two [ , options ] )
// @spec https://tc39.es/proposal-temporal/#sec-temporal.duration.compare
//
// Returns -1, 0, or 1. For durations containing calendar units (years,
// months, weeks), a relativeTo is needed; without it, only time-based
// durations can be compared.
// SIMPLIFIED: The options argument (relativeTo) is not parsed — an
// empty RelativeTo is passed, which means comparison of calendar-unit
// durations will error.
// ----------------------------------------------------------------------------
Value TemporalDuration::compare(const CallContext& ctx, const std::vector<Value>& args) {
    if(args.size() < 2) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Temporal.Duration.compare requires two arguments"));
    }

    // Step 1: Set one to ? ToTemporalDuration(one).
    auto dur_one = parseDurationFromValue(args[0]);
    // Step 2: Set two to ? ToTemporalDuration(two).
    auto dur_two = parseDurationFromValue(args[1]);

    // Steps 3-5: Get relativeTo from options and compare.
    temporal_rs::RelativeTo relative_to{nullptr, nullptr};
    auto result = dur_one->compare(*dur_two, relative_to);
    if(!result.is_ok()) {
        throwTemporalError(std::move(result).err().value());
    }

    return Value(static_cast<double>(std::move(result).ok().value()));
}

// ============================================================================
// Prototype Getters
// @spec https://tc39.es/proposal-temporal/#sec-properties-of-the-temporal-duration-prototype-object
//
// Each getter returns the value of the corresponding internal slot.
// DEVIATION: Rift reads from the temporal_rs::Duration object in the
// registry rather than from internal slots on the JS object.
// ============================================================================

// 7.3.3 get Temporal.Duration.prototype.years
// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.duration.prototype.years
Value TemporalDuration::years(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getDurationData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(Value("TypeError: years called on non-Duration"));
    }
    return Value(static_cast<double>(data->years()));
}

// 7.3.4 get Temporal.Duration.prototype.months
// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.duration.prototype.months
Value TemporalDuration::months(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getDurationData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(Value("TypeError: months called on non-Duration"));
    }
    return Value(static_cast<double>(data->months()));
}

// 7.3.5 get Temporal.Duration.prototype.weeks
// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.duration.prototype.weeks
Value TemporalDuration::weeks(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getDurationData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(Value("TypeError: weeks called on non-Duration"));
    }
    return Value(static_cast<double>(data->weeks()));
}

// 7.3.6 get Temporal.Duration.prototype.days
// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.duration.prototype.days
Value TemporalDuration::days(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getDurationData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(Value("TypeError: days called on non-Duration"));
    }
    return Value(static_cast<double>(data->days()));
}

// 7.3.7 get Temporal.Duration.prototype.hours
// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.duration.prototype.hours
Value TemporalDuration::hours(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getDurationData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(Value("TypeError: hours called on non-Duration"));
    }
    return Value(static_cast<double>(data->hours()));
}

// 7.3.8 get Temporal.Duration.prototype.minutes
// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.duration.prototype.minutes
Value TemporalDuration::minutes(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getDurationData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(Value("TypeError: minutes called on non-Duration"));
    }
    return Value(static_cast<double>(data->minutes()));
}

// 7.3.9 get Temporal.Duration.prototype.seconds
// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.duration.prototype.seconds
Value TemporalDuration::seconds(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getDurationData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(Value("TypeError: seconds called on non-Duration"));
    }
    return Value(static_cast<double>(data->seconds()));
}

// 7.3.10 get Temporal.Duration.prototype.milliseconds
// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.duration.prototype.milliseconds
Value TemporalDuration::milliseconds(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getDurationData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: milliseconds called on non-Duration"));
    }
    return Value(static_cast<double>(data->milliseconds()));
}

// 7.3.11 get Temporal.Duration.prototype.microseconds
// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.duration.prototype.microseconds
Value TemporalDuration::microseconds(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getDurationData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: microseconds called on non-Duration"));
    }
    return Value(data->microseconds());
}

// 7.3.12 get Temporal.Duration.prototype.nanoseconds
// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.duration.prototype.nanoseconds
Value TemporalDuration::nanoseconds(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getDurationData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: nanoseconds called on non-Duration"));
    }
    return Value(data->nanoseconds());
}

// 7.3.13 get Temporal.Duration.prototype.sign
// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.duration.prototype.sign
//
// Returns 1 if the duration is positive, -1 if negative, 0 if zero.
Value TemporalDuration::sign(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getDurationData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(Value("TypeError: sign called on non-Duration"));
    }
    return Value(static_cast<double>(data->sign()));
}

// 7.3.14 get Temporal.Duration.prototype.blank
// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.duration.prototype.blank
//
// Returns true if all duration fields are zero, false otherwise.
Value TemporalDuration::blank(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getDurationData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(Value("TypeError: blank called on non-Duration"));
    }
    return Value(data->is_zero());
}

// ============================================================================
// Arithmetic Methods
// ============================================================================

// ----------------------------------------------------------------------------
// 7.3.17 Temporal.Duration.prototype.abs ( )
// @spec https://tc39.es/proposal-temporal/#sec-temporal.duration.prototype.abs
//
// Returns a new Duration with all fields as their absolute values.
// ----------------------------------------------------------------------------
Value TemporalDuration::abs(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getDurationData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(Value("TypeError: abs called on non-Duration"));
    }
    return wrapDuration(data->abs());
}

// ----------------------------------------------------------------------------
// 7.3.16 Temporal.Duration.prototype.negated ( )
// @spec https://tc39.es/proposal-temporal/#sec-temporal.duration.prototype.negated
//
// Returns a new Duration with all fields negated.
// ----------------------------------------------------------------------------
Value TemporalDuration::negated(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getDurationData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(Value("TypeError: negated called on non-Duration"));
    }
    return wrapDuration(data->negated());
}

// ----------------------------------------------------------------------------
// 7.3.18 Temporal.Duration.prototype.add ( other [ , options ] )
// @spec https://tc39.es/proposal-temporal/#sec-temporal.duration.prototype.add
//
// Adds another duration to this one. For durations with calendar units,
// a relativeTo option is needed.
// SIMPLIFIED: The options argument (relativeTo) is not parsed.
// ----------------------------------------------------------------------------
Value TemporalDuration::add(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getDurationData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(Value("TypeError: add called on non-Duration"));
    }

    if(args.empty()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Temporal.Duration.prototype.add requires an argument"));
    }

    // Step 1: Let other be ? ToTemporalDuration(other).
    auto other = parseDurationFromValue(args[0]);
    // Steps 2-4: Perform AddDurations and return the result.
    auto result = data->add(*other);
    if(!result.is_ok()) {
        throwTemporalError(std::move(result).err().value());
    }

    return wrapDuration(std::move(result).ok().value());
}

// ----------------------------------------------------------------------------
// 7.3.19 Temporal.Duration.prototype.subtract ( other [ , options ] )
// @spec https://tc39.es/proposal-temporal/#sec-temporal.duration.prototype.subtract
//
// Subtracts another duration from this one.
// SIMPLIFIED: The options argument (relativeTo) is not parsed.
// ----------------------------------------------------------------------------
Value TemporalDuration::subtract(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getDurationData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(Value("TypeError: subtract called on non-Duration"));
    }

    if(args.empty()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Temporal.Duration.prototype.subtract requires an argument"));
    }

    // Step 1: Let other be ? ToTemporalDuration(other).
    auto other = parseDurationFromValue(args[0]);
    // Steps 2-4: Negate other and perform AddDurations, return the result.
    auto result = data->subtract(*other);
    if(!result.is_ok()) {
        throwTemporalError(std::move(result).err().value());
    }

    return wrapDuration(std::move(result).ok().value());
}

// ============================================================================
// Helper: Parse a Unit string
// NON-STANDARD: Internal helper to convert a JavaScript unit string
// (e.g., "hours", "day") to a temporal_rs::Unit enum value.
// Accepts both singular and plural forms as the spec requires.
// Related spec section:
//   13.17 ToTemporalRoundingUnit
//   @spec https://tc39.es/proposal-temporal/#sec-temporal-totemporalroundingunit
// ============================================================================

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

// ============================================================================
// Rounding Methods
// ============================================================================

// ----------------------------------------------------------------------------
// 7.3.20 Temporal.Duration.prototype.round ( roundTo )
// @spec https://tc39.es/proposal-temporal/#sec-temporal.duration.prototype.round
//
// Rounds the duration according to the roundTo options. The argument can
// be a string (shorthand for smallestUnit) or an options object with
// smallestUnit, largestUnit, roundingIncrement, and roundingMode.
//
// SIMPLIFIED: The relativeTo option is not parsed — an empty RelativeTo
// is passed, so rounding calendar-unit durations will error.
// SIMPLIFIED: The roundingMode option is not parsed — defaults to
// temporal_rs internal default.
// ----------------------------------------------------------------------------
Value TemporalDuration::round(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getDurationData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(Value("TypeError: round called on non-Duration"));
    }

    if(args.empty()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Temporal.Duration.prototype.round requires an argument"));
    }

    temporal_rs::RoundingOptions options{std::nullopt, std::nullopt, std::nullopt, std::nullopt};

    if(args[0].isString()) {
        // Step: If roundTo is a String, let smallestUnit be roundTo.
        options.smallest_unit = parseUnit(args[0].getString());
    } else if(args[0].isObject() || args[0].isFunction()) {
        // Step: Otherwise, parse roundTo as an options object.
        auto* obj = args[0].getObject();
        Value smallest = obj->getProperty("smallestUnit");
        Value largest = obj->getProperty("largestUnit");
        Value mode = obj->getProperty("roundingMode");
        Value inc = obj->getProperty("roundingIncrement");

        if(!smallest.isUndefined())
            options.smallest_unit = parseUnit(smallest.toString());
        if(!largest.isUndefined())
            options.largest_unit = parseUnit(largest.toString());
        if(!inc.isUndefined())
            options.increment = static_cast<uint32_t>(inc.toNumber());
    }

    temporal_rs::RelativeTo relative_to{nullptr, nullptr};
    auto result = data->round(options, relative_to);
    if(!result.is_ok()) {
        throwTemporalError(std::move(result).err().value());
    }

    return wrapDuration(std::move(result).ok().value());
}

// ----------------------------------------------------------------------------
// 7.3.21 Temporal.Duration.prototype.total ( totalOf )
// @spec https://tc39.es/proposal-temporal/#sec-temporal.duration.prototype.total
//
// Returns the total duration value expressed in the given unit as a
// floating-point number. The argument can be a string (the unit) or an
// options object with a "unit" property.
//
// SIMPLIFIED: The relativeTo option is not parsed.
// ----------------------------------------------------------------------------
Value TemporalDuration::total(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getDurationData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(Value("TypeError: total called on non-Duration"));
    }

    if(args.empty()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Temporal.Duration.prototype.total requires an argument"));
    }

    temporal_rs::Unit unit = temporal_rs::Unit::Nanosecond;

    if(args[0].isString()) {
        // Step: If totalOf is a String, let unit be totalOf.
        unit = parseUnit(args[0].getString());
    } else if(args[0].isObject() || args[0].isFunction()) {
        // Step: Otherwise, parse totalOf as an options object.
        auto* obj = args[0].getObject();
        Value unit_val = obj->getProperty("unit");
        if(!unit_val.isUndefined()) {
            unit = parseUnit(unit_val.toString());
        }
    }

    temporal_rs::RelativeTo relative_to{nullptr, nullptr};
    auto result = data->total(unit, relative_to);
    if(!result.is_ok()) {
        throwTemporalError(std::move(result).err().value());
    }

    return Value(std::move(result).ok().value());
}

// ============================================================================
// String Conversion Methods
// ============================================================================

// ----------------------------------------------------------------------------
// 7.3.22 Temporal.Duration.prototype.toString ( [ options ] )
// @spec https://tc39.es/proposal-temporal/#sec-temporal.duration.prototype.tostring
//
// Returns an ISO 8601 duration string (e.g., "P1Y2M3DT4H5M6S").
// SIMPLIFIED: The options argument (fractionalSecondDigits, smallestUnit,
// roundingMode) is not parsed — uses auto precision.
// ----------------------------------------------------------------------------
Value TemporalDuration::toString(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getDurationData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(Value("TypeError: toString called on non-Duration"));
    }

    temporal_rs::ToStringRoundingOptions options{
        temporal_rs::Precision{false, std::nullopt},  // auto precision
        std::nullopt,                                 // no smallest_unit
        std::nullopt                                  // no rounding_mode
    };

    auto result = data->to_string(options);
    if(!result.is_ok()) {
        throwTemporalError(std::move(result).err().value());
    }

    return Value(std::move(result).ok().value());
}

// ----------------------------------------------------------------------------
// 7.3.23 Temporal.Duration.prototype.toJSON ( )
// @spec https://tc39.es/proposal-temporal/#sec-temporal.duration.prototype.tojson
//
// Equivalent to toString with no options.
// ----------------------------------------------------------------------------
Value TemporalDuration::toJSON(const CallContext& ctx, const std::vector<Value>& args) {
    return toString(ctx, args);
}

// ----------------------------------------------------------------------------
// 7.3.24 Temporal.Duration.prototype.valueOf ( )
// @spec https://tc39.es/proposal-temporal/#sec-temporal.duration.prototype.valueof
//
// Always throws TypeError — Temporal types are not comparable with < or >.
// ----------------------------------------------------------------------------
Value TemporalDuration::valueOf(const CallContext& ctx, const std::vector<Value>& args) {
    throw rift::core::JavaScriptException(
        Value("TypeError: Cannot convert a Temporal.Duration to a primitive value"));
}

// ============================================================================
// Private
// ============================================================================

JSObject* TemporalDuration::getGlobalPrototype() {
    return rift::core::BuiltinManager::getDurationPrototype();
}

// ----------------------------------------------------------------------------
// 7.3.25 Temporal.Duration.prototype.toLocaleString ( [ locales [ , options ] ] )
// @spec https://tc39.es/proposal-temporal/#sec-temporal.duration.prototype.tolocalestring
//
// SIMPLIFIED: No Intl support — delegates to toString().
// ----------------------------------------------------------------------------
Value TemporalDuration::toLocaleString(const CallContext& ctx, const std::vector<Value>& args) {
    return toString(ctx, args);
}

}  // namespace rift::builtins
