#include "rift/builtins/temporal/plain_time.h"

#include "rift/builtins/builtin_manager.h"
#include "rift/builtins/temporal/duration.h"
#include "rift/interpreter/javascript_exception.h"
#include "rift/interpreter/this_helpers.h"
#include "rift/memory/gc_protector.h"
#include "temporal_rs/DifferenceSettings.hpp"
#include "temporal_rs/Duration.hpp"
#include "temporal_rs/PartialTime.hpp"
#include "temporal_rs/PlainTime.hpp"
#include "temporal_rs/Precision.hpp"
#include "temporal_rs/ToStringRoundingOptions.hpp"

// ============================================================================
// Temporal Proposal -- Temporal.PlainTime Objects (Sections 4.1-4.5)
// @spec https://tc39.es/proposal-temporal/#sec-temporal-plaintime-objects
//
// A Temporal.PlainTime represents a wall-clock time without a date or time
// zone. The spec uses a [[Time]] internal slot (a Time Record with fields
// hour, minute, second, millisecond, microsecond, nanosecond).
//
// DEVIATION: Instead of a [[Time]] internal slot, this implementation stores
// data in a static PlainTimeRegistry (a map from JSObject* to a
// temporal_rs::PlainTime struct). The temporal_rs library handles validation
// and time arithmetic via FFI.
// ============================================================================

namespace rift::builtins {

using rift::core::extractThisObject;

// ============================================================================
// PlainTimeRegistry -- Internal Storage
// NON-STANDARD: The spec uses a [[Time]] internal slot (a Time Record).
// This implementation uses a static registry mapping JSObject pointers to
// temporal_rs::PlainTime values.
// ============================================================================

std::unordered_map<JSObject*, std::unique_ptr<temporal_rs::PlainTime>> PlainTimeRegistry::registry_;

void PlainTimeRegistry::store(JSObject* obj, std::unique_ptr<temporal_rs::PlainTime> data) {
    registry_[obj] = std::move(data);
}

temporal_rs::PlainTime* PlainTimeRegistry::get(JSObject* obj) {
    auto it = registry_.find(obj);
    if(it != registry_.end()) {
        return it->second.get();
    }
    return nullptr;
}

void PlainTimeRegistry::remove(JSObject* obj) {
    registry_.erase(obj);
}

void PlainTimeRegistry::clear() {
    registry_.clear();
}

// NON-STANDARD: Internal helper to retrieve the PlainTime data for a `this` value.
// The spec would access the [[Time]] internal slot directly.

static temporal_rs::PlainTime* getPlainTimeData(const CallContext& ctx) {
    auto* obj = extractThisObject(ctx);
    if(obj) {
        return PlainTimeRegistry::get(obj);
    }
    return nullptr;
}

// NON-STANDARD: Internal helper to convert temporal_rs error codes to
// JavaScript exception types (TypeError, RangeError, SyntaxError).

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

// NON-STANDARD: Parse a PlainTime from a JS Value.
// Loosely implements ToTemporalTime (spec section 4.5.3).
// Handles: (1) existing PlainTime objects (clone), (2) plain objects with
// time component properties, (3) ISO 8601 strings.
// @spec https://tc39.es/proposal-temporal/#sec-temporal-totemporaltime

static std::unique_ptr<temporal_rs::PlainTime> parsePlainTimeFromValue(const Value& val) {
    if(val.isObject() || val.isFunction()) {
        auto* data = PlainTimeRegistry::get(val.getObject());
        if(data) {
            return data->clone();
        }

        // Property bag
        auto* obj = val.getObject();
        temporal_rs::PartialTime partial{};

        Value h = obj->getProperty("hour");
        Value mi = obj->getProperty("minute");
        Value s = obj->getProperty("second");
        Value ms = obj->getProperty("millisecond");
        Value us = obj->getProperty("microsecond");
        Value ns = obj->getProperty("nanosecond");

        if(!h.isUndefined())
            partial.hour = static_cast<uint8_t>(h.toNumber());
        if(!mi.isUndefined())
            partial.minute = static_cast<uint8_t>(mi.toNumber());
        if(!s.isUndefined())
            partial.second = static_cast<uint8_t>(s.toNumber());
        if(!ms.isUndefined())
            partial.millisecond = static_cast<uint16_t>(ms.toNumber());
        if(!us.isUndefined())
            partial.microsecond = static_cast<uint16_t>(us.toNumber());
        if(!ns.isUndefined())
            partial.nanosecond = static_cast<uint16_t>(ns.toNumber());

        auto result = temporal_rs::PlainTime::from_partial(partial, std::nullopt);
        if(!result.is_ok()) {
            throwTemporalError(std::move(result).err().value());
        }
        return std::move(result).ok().value();
    }

    // String
    std::string str = val.toString();
    auto result = temporal_rs::PlainTime::from_utf8(str);
    if(!result.is_ok()) {
        throwTemporalError(std::move(result).err().value());
    }
    return std::move(result).ok().value();
}

// NON-STANDARD: Internal helper to parse a Duration from a JS Value for
// PlainTime arithmetic (add/subtract). Handles Duration objects, property
// bags, and ISO 8601 duration strings.

static std::unique_ptr<temporal_rs::Duration> parseDurationForTime(const Value& val) {
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

// NON-STANDARD: Wraps a temporal_rs::PlainTime into a JS object.
// Corresponds to CreateTemporalTime in the spec.
// @spec https://tc39.es/proposal-temporal/#sec-temporal-createtemporaltime

Value TemporalPlainTime::wrapPlainTime(std::unique_ptr<temporal_rs::PlainTime> time) {
    auto* proto = getGlobalPrototype();
    auto* js_obj = getObjectFactory()->createJSObject(proto);
    rift::memory::GCProtector protect(js_obj, getObjectFactory()->getObjectManager());

    PlainTimeRegistry::store(js_obj, std::move(time));

    return Value(js_obj);
}

// ============================================================================
// 4.2 Properties of the Temporal.PlainTime Constructor
// @spec https://tc39.es/proposal-temporal/#sec-properties-of-temporal-plaintime-constructor
// ============================================================================

void TemporalPlainTime::setupStaticMethods(JSObject* constructor,
                                           rift::memory::ObjectFactory* factory) {
    // 4.2.2 Temporal.PlainTime.from ( item [ , options ] )
    RIFT_STATIC_METHOD(constructor, "from", TemporalPlainTime::from);
    // 4.2.3 Temporal.PlainTime.compare ( one, two )
    RIFT_STATIC_METHOD(constructor, "compare", TemporalPlainTime::compare);
}

// ----------------------------------------------------------------------------
// 4.3 Properties of the Temporal.PlainTime Prototype Object
// @spec https://tc39.es/proposal-temporal/#sec-properties-of-temporal-plaintime-prototype-object
// ----------------------------------------------------------------------------

void TemporalPlainTime::setupPrototypeMethods(JSObject* prototype,
                                              rift::memory::ObjectFactory* factory) {
    // 4.3.4-4.3.9: Time component getters
    RIFT_GETTER(prototype, "hour", TemporalPlainTime::hour);                // 4.3.4
    RIFT_GETTER(prototype, "minute", TemporalPlainTime::minute);            // 4.3.5
    RIFT_GETTER(prototype, "second", TemporalPlainTime::second);            // 4.3.6
    RIFT_GETTER(prototype, "millisecond", TemporalPlainTime::millisecond);  // 4.3.7
    RIFT_GETTER(prototype, "microsecond", TemporalPlainTime::microsecond);  // 4.3.8
    RIFT_GETTER(prototype, "nanosecond", TemporalPlainTime::nanosecond);    // 4.3.9

    // 4.3.10 Temporal.PlainTime.prototype.with ( temporalTimeLike [ , options ] )
    RIFT_METHOD(prototype, "with", TemporalPlainTime::with);

    // 4.3.11 Temporal.PlainTime.prototype.add ( temporalDurationLike )
    RIFT_METHOD(prototype, "add", TemporalPlainTime::add);
    // 4.3.12 Temporal.PlainTime.prototype.subtract ( temporalDurationLike )
    RIFT_METHOD(prototype, "subtract", TemporalPlainTime::subtract);

    // 4.3.13 Temporal.PlainTime.prototype.until ( other [ , options ] )
    RIFT_METHOD(prototype, "until", TemporalPlainTime::until);
    // 4.3.14 Temporal.PlainTime.prototype.since ( other [ , options ] )
    RIFT_METHOD(prototype, "since", TemporalPlainTime::since);

    // 4.3.15 Temporal.PlainTime.prototype.round ( roundTo )
    // INCOMPLETE: round() is not implemented.

    // 4.3.16 Temporal.PlainTime.prototype.equals ( other )
    RIFT_METHOD(prototype, "equals", TemporalPlainTime::equals);

    // 4.3.17 Temporal.PlainTime.prototype.toString ( [ options ] )
    RIFT_METHOD(prototype, "toString", TemporalPlainTime::toString);
    // 4.3.18 Temporal.PlainTime.prototype.toLocaleString ( [ locales [ , options ] ] )
    // INCOMPLETE: toLocaleString is not implemented.
    // 4.3.19 Temporal.PlainTime.prototype.toJSON ( )
    RIFT_METHOD(prototype, "toJSON", TemporalPlainTime::toJSON);
    // 4.3.20 Temporal.PlainTime.prototype.valueOf ( )
    RIFT_METHOD(prototype, "valueOf", TemporalPlainTime::valueOf);

    // 4.3.21 Temporal.PlainTime.prototype.toPlainDateTime ( temporalDate )
    // INCOMPLETE: toPlainDateTime is not implemented.
    // 4.3.22 Temporal.PlainTime.prototype.toZonedDateTime ( item )
    // INCOMPLETE: toZonedDateTime is not implemented.
}

// ============================================================================
// 4.1.1 Temporal.PlainTime ( [ hour [ , minute [ , second [ , millisecond
//        [ , microsecond [ , nanosecond ] ] ] ] ] ] )
// @spec https://tc39.es/proposal-temporal/#sec-temporal.plaintime
//
// All parameters default to 0 if not provided.
// DEVIATION: Validation delegated to temporal_rs::PlainTime::try_new.
// ============================================================================

Value TemporalPlainTime::constructor(const CallContext& ctx, const std::vector<Value>& args) {
    uint8_t hour_val = args.size() > 0 ? static_cast<uint8_t>(args[0].toNumber()) : 0;
    uint8_t minute_val = args.size() > 1 ? static_cast<uint8_t>(args[1].toNumber()) : 0;
    uint8_t second_val = args.size() > 2 ? static_cast<uint8_t>(args[2].toNumber()) : 0;
    uint16_t ms_val = args.size() > 3 ? static_cast<uint16_t>(args[3].toNumber()) : 0;
    uint16_t us_val = args.size() > 4 ? static_cast<uint16_t>(args[4].toNumber()) : 0;
    uint16_t ns_val = args.size() > 5 ? static_cast<uint16_t>(args[5].toNumber()) : 0;

    auto result =
        temporal_rs::PlainTime::try_new(hour_val, minute_val, second_val, ms_val, us_val, ns_val);
    if(!result.is_ok()) {
        throwTemporalError(std::move(result).err().value());
    }

    return wrapPlainTime(std::move(result).ok().value());
}

// ============================================================================
// Static Methods
// ============================================================================

// 4.2.2 Temporal.PlainTime.from ( item [ , options ] )
// @spec https://tc39.es/proposal-temporal/#sec-temporal.plaintime.from
//
// INCOMPLETE: The options parameter (overflow) is not processed.
Value TemporalPlainTime::from(const CallContext& ctx, const std::vector<Value>& args) {
    if(args.empty()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Temporal.PlainTime.from requires an argument"));
    }

    auto time = parsePlainTimeFromValue(args[0]);
    return wrapPlainTime(std::move(time));
}

// 4.2.3 Temporal.PlainTime.compare ( one, two )
// @spec https://tc39.es/proposal-temporal/#sec-temporal.plaintime.compare
Value TemporalPlainTime::compare(const CallContext& ctx, const std::vector<Value>& args) {
    if(args.size() < 2) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Temporal.PlainTime.compare requires two arguments"));
    }

    auto time_one = parsePlainTimeFromValue(args[0]);
    auto time_two = parsePlainTimeFromValue(args[1]);

    int8_t cmp = temporal_rs::PlainTime::compare(*time_one, *time_two);
    return Value(static_cast<double>(cmp));
}

// ============================================================================
// 4.3.4-4.3.9 Temporal.PlainTime Prototype Getters
// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.plaintime.prototype.hour
//
// Each getter retrieves the corresponding component from the [[Time]] record.
// DEVIATION: Uses PlainTimeRegistry lookup instead of [[Time]] internal slot.
// ============================================================================

// 4.3.4 get Temporal.PlainTime.prototype.hour
Value TemporalPlainTime::hour(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(Value("TypeError: hour called on non-PlainTime"));
    }
    return Value(static_cast<double>(data->hour()));
}

// 4.3.5 get Temporal.PlainTime.prototype.minute
Value TemporalPlainTime::minute(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(Value("TypeError: minute called on non-PlainTime"));
    }
    return Value(static_cast<double>(data->minute()));
}

// 4.3.6 get Temporal.PlainTime.prototype.second
Value TemporalPlainTime::second(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(Value("TypeError: second called on non-PlainTime"));
    }
    return Value(static_cast<double>(data->second()));
}

// 4.3.7 get Temporal.PlainTime.prototype.millisecond
Value TemporalPlainTime::millisecond(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: millisecond called on non-PlainTime"));
    }
    return Value(static_cast<double>(data->millisecond()));
}

// 4.3.8 get Temporal.PlainTime.prototype.microsecond
Value TemporalPlainTime::microsecond(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: microsecond called on non-PlainTime"));
    }
    return Value(static_cast<double>(data->microsecond()));
}

// 4.3.9 get Temporal.PlainTime.prototype.nanosecond
Value TemporalPlainTime::nanosecond(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: nanosecond called on non-PlainTime"));
    }
    return Value(static_cast<double>(data->nanosecond()));
}

// ============================================================================
// 4.3.10 Temporal.PlainTime.prototype.with ( temporalTimeLike [ , options ] )
// @spec https://tc39.es/proposal-temporal/#sec-temporal.plaintime.prototype.with
//
// INCOMPLETE: The options parameter (overflow) is not processed.
// ============================================================================

Value TemporalPlainTime::with(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(Value("TypeError: with called on non-PlainTime"));
    }

    if(args.empty() || (!args[0].isObject() && !args[0].isFunction())) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Temporal.PlainTime.prototype.with requires an object argument"));
    }

    auto* obj = args[0].getObject();
    temporal_rs::PartialTime partial{};

    Value h = obj->getProperty("hour");
    Value mi = obj->getProperty("minute");
    Value s = obj->getProperty("second");
    Value ms = obj->getProperty("millisecond");
    Value us = obj->getProperty("microsecond");
    Value ns = obj->getProperty("nanosecond");

    if(!h.isUndefined())
        partial.hour = static_cast<uint8_t>(h.toNumber());
    if(!mi.isUndefined())
        partial.minute = static_cast<uint8_t>(mi.toNumber());
    if(!s.isUndefined())
        partial.second = static_cast<uint8_t>(s.toNumber());
    if(!ms.isUndefined())
        partial.millisecond = static_cast<uint16_t>(ms.toNumber());
    if(!us.isUndefined())
        partial.microsecond = static_cast<uint16_t>(us.toNumber());
    if(!ns.isUndefined())
        partial.nanosecond = static_cast<uint16_t>(ns.toNumber());

    auto result = data->with(partial, std::nullopt);
    if(!result.is_ok()) {
        throwTemporalError(std::move(result).err().value());
    }

    return wrapPlainTime(std::move(result).ok().value());
}

// ============================================================================
// Arithmetic Methods
// ============================================================================

// 4.3.11 Temporal.PlainTime.prototype.add ( temporalDurationLike )
// @spec https://tc39.es/proposal-temporal/#sec-temporal.plaintime.prototype.add
//
// DEVIATION: Delegated to temporal_rs::PlainTime::add. Wraps around midnight.
Value TemporalPlainTime::add(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(Value("TypeError: add called on non-PlainTime"));
    }

    if(args.empty()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Temporal.PlainTime.prototype.add requires an argument"));
    }

    auto dur = parseDurationForTime(args[0]);
    auto result = data->add(*dur);
    if(!result.is_ok()) {
        throwTemporalError(std::move(result).err().value());
    }

    return wrapPlainTime(std::move(result).ok().value());
}

// 4.3.12 Temporal.PlainTime.prototype.subtract ( temporalDurationLike )
// @spec https://tc39.es/proposal-temporal/#sec-temporal.plaintime.prototype.subtract
Value TemporalPlainTime::subtract(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(Value("TypeError: subtract called on non-PlainTime"));
    }

    if(args.empty()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Temporal.PlainTime.prototype.subtract requires an argument"));
    }

    auto dur = parseDurationForTime(args[0]);
    auto result = data->subtract(*dur);
    if(!result.is_ok()) {
        throwTemporalError(std::move(result).err().value());
    }

    return wrapPlainTime(std::move(result).ok().value());
}

// ============================================================================
// Difference Methods
// ============================================================================

// 4.3.13 Temporal.PlainTime.prototype.until ( other [ , options ] )
// @spec https://tc39.es/proposal-temporal/#sec-temporal.plaintime.prototype.until
//
// INCOMPLETE: The options parameter (smallestUnit, largestUnit, roundingMode,
// roundingIncrement) is not processed.
Value TemporalPlainTime::until(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(Value("TypeError: until called on non-PlainTime"));
    }

    if(args.empty()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Temporal.PlainTime.prototype.until requires an argument"));
    }

    auto other = parsePlainTimeFromValue(args[0]);
    temporal_rs::DifferenceSettings settings{std::nullopt, std::nullopt, std::nullopt,
                                             std::nullopt};

    auto result = data->until(*other, settings);
    if(!result.is_ok()) {
        throwTemporalError(std::move(result).err().value());
    }

    return TemporalDuration::wrapDuration(std::move(result).ok().value());
}

// 4.3.14 Temporal.PlainTime.prototype.since ( other [ , options ] )
// @spec https://tc39.es/proposal-temporal/#sec-temporal.plaintime.prototype.since
//
// INCOMPLETE: The options parameter is not processed.
Value TemporalPlainTime::since(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(Value("TypeError: since called on non-PlainTime"));
    }

    if(args.empty()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Temporal.PlainTime.prototype.since requires an argument"));
    }

    auto other = parsePlainTimeFromValue(args[0]);
    temporal_rs::DifferenceSettings settings{std::nullopt, std::nullopt, std::nullopt,
                                             std::nullopt};

    auto result = data->since(*other, settings);
    if(!result.is_ok()) {
        throwTemporalError(std::move(result).err().value());
    }

    return TemporalDuration::wrapDuration(std::move(result).ok().value());
}

// 4.3.16 Temporal.PlainTime.prototype.equals ( other )
// @spec https://tc39.es/proposal-temporal/#sec-temporal.plaintime.prototype.equals
Value TemporalPlainTime::equals(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(Value("TypeError: equals called on non-PlainTime"));
    }

    if(args.empty() || (!args[0].isObject() && !args[0].isFunction())) {
        return Value(false);
    }

    auto* other = PlainTimeRegistry::get(args[0].getObject());
    if(!other) {
        return Value(false);
    }

    return Value(data->equals(*other));
}

// ============================================================================
// String Conversion Methods
// ============================================================================

// 4.3.17 Temporal.PlainTime.prototype.toString ( [ options ] )
// @spec https://tc39.es/proposal-temporal/#sec-temporal.plaintime.prototype.tostring
//
// INCOMPLETE: The options parameter (fractionalSecondDigits, smallestUnit,
// roundingMode) is not processed.
Value TemporalPlainTime::toString(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(Value("TypeError: toString called on non-PlainTime"));
    }

    temporal_rs::ToStringRoundingOptions options{temporal_rs::Precision{false, std::nullopt},
                                                 std::nullopt, std::nullopt};

    auto result = data->to_ixdtf_string(options);
    if(!result.is_ok()) {
        throwTemporalError(std::move(result).err().value());
    }

    return Value(std::move(result).ok().value());
}

// 4.3.19 Temporal.PlainTime.prototype.toJSON ( )
// @spec https://tc39.es/proposal-temporal/#sec-temporal.plaintime.prototype.tojson
Value TemporalPlainTime::toJSON(const CallContext& ctx, const std::vector<Value>& args) {
    return toString(ctx, args);
}

// 4.3.20 Temporal.PlainTime.prototype.valueOf ( )
// @spec https://tc39.es/proposal-temporal/#sec-temporal.plaintime.prototype.valueof
//
// Always throws TypeError. Temporal types do not support implicit conversion.
Value TemporalPlainTime::valueOf(const CallContext& ctx, const std::vector<Value>& args) {
    throw rift::core::JavaScriptException(
        Value("TypeError: Cannot convert a Temporal.PlainTime to a primitive value"));
}

// ============================================================================
// Private
// ============================================================================

JSObject* TemporalPlainTime::getGlobalPrototype() {
    return rift::core::BuiltinManager::getPlainTimePrototype();
}

}  // namespace rift::builtins
