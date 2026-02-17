#include "rift/builtins/temporal/instant.h"

#include "rift/builtins/temporal/duration.h"
#include "rift/core/engine/builtin_manager.h"
#include "rift/core/engine/javascript_exception.h"
#include "rift/core/engine/this_helpers.h"
#include "rift/memory/gc_protector.h"
#include "temporal_rs/DifferenceSettings.hpp"
#include "temporal_rs/Duration.hpp"
#include "temporal_rs/Instant.hpp"

// ============================================================================
// Temporal Proposal -- Temporal.Instant Objects (Section 8)
// @spec https://tc39.es/proposal-temporal/#sec-temporal-instant-objects
//
// Temporal.Instant represents a fixed point in time with nanosecond
// precision, independent of calendar or time zone.
//
// DEVIATION: The spec stores [[EpochNanoseconds]] as a BigInt internal slot.
// Rift delegates to temporal_rs (Rust FFI) and stores internal data in a
// static registry (InstantRegistry) mapping JSObject* -> unique_ptr<Instant>.
// Without BigInt, nanosecond precision is approximated via milliseconds.
// ============================================================================

namespace rift::builtins {

using rift::core::extractThisObject;

// ============================================================================
// InstantRegistry
// NON-STANDARD: Static registry for Instant internal data.
// The spec stores data in the [[EpochNanoseconds]] internal slot.
// Rift uses a global unordered_map<JSObject*, unique_ptr<Instant>>.
// ============================================================================

std::unordered_map<JSObject*, std::unique_ptr<temporal_rs::Instant>> InstantRegistry::registry_;

void InstantRegistry::store(JSObject* obj, std::unique_ptr<temporal_rs::Instant> data) {
    registry_[obj] = std::move(data);
}

temporal_rs::Instant* InstantRegistry::get(JSObject* obj) {
    auto it = registry_.find(obj);
    if(it != registry_.end()) {
        return it->second.get();
    }
    return nullptr;
}

void InstantRegistry::remove(JSObject* obj) {
    registry_.erase(obj);
}

void InstantRegistry::clear() {
    registry_.clear();
}

// NON-STANDARD: Internal helper to extract Instant data from the receiver
// (this value) by looking up the JSObject in the registry.
static temporal_rs::Instant* getInstantData(const CallContext& ctx) {
    auto* obj = extractThisObject(ctx);
    if(obj) {
        return InstantRegistry::get(obj);
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

// NON-STANDARD: Wraps a temporal_rs::Instant in a JS object with prototype chain.
// Corresponds to CreateTemporalInstant in the spec.
// @spec https://tc39.es/proposal-temporal/#sec-temporal-createtemporalinstant
Value TemporalInstant::wrapInstant(std::unique_ptr<temporal_rs::Instant> instant) {
    auto* proto = getGlobalPrototype();
    auto* js_obj = getObjectFactory()->createJSObject(proto);
    rift::memory::GCProtector protect(js_obj, getObjectFactory()->getObjectManager());

    InstantRegistry::store(js_obj, std::move(instant));

    return Value(js_obj);
}

// ============================================================================
// 8.2 Properties of the Temporal.Instant Constructor
// @spec https://tc39.es/proposal-temporal/#sec-properties-of-temporal-instant-constructor
// ============================================================================
void TemporalInstant::setupStaticMethods(JSObject* constructor,
                                         rift::memory::ObjectFactory* factory) {
    RIFT_STATIC_METHOD(constructor, "from", TemporalInstant::from);
    RIFT_STATIC_METHOD(constructor, "fromEpochMilliseconds",
                       TemporalInstant::fromEpochMilliseconds);
    RIFT_STATIC_METHOD(constructor, "fromEpochNanoseconds", TemporalInstant::fromEpochNanoseconds);
    RIFT_STATIC_METHOD(constructor, "compare", TemporalInstant::compare);
}

// 8.3 Properties of the Temporal.Instant Prototype Object
// @spec https://tc39.es/proposal-temporal/#sec-properties-of-temporal-instant-prototype-object
void TemporalInstant::setupPrototypeMethods(JSObject* prototype,
                                            rift::memory::ObjectFactory* factory) {
    RIFT_GETTER(prototype, "epochMilliseconds", TemporalInstant::epochMilliseconds);
    RIFT_GETTER(prototype, "epochNanoseconds", TemporalInstant::epochNanoseconds);
    RIFT_METHOD(prototype, "add", TemporalInstant::add);
    RIFT_METHOD(prototype, "subtract", TemporalInstant::subtract);
    RIFT_METHOD(prototype, "equals", TemporalInstant::equals);
    RIFT_METHOD(prototype, "since", TemporalInstant::since);
    RIFT_METHOD(prototype, "until", TemporalInstant::until);
    RIFT_METHOD(prototype, "toString", TemporalInstant::toString);
    RIFT_METHOD(prototype, "toJSON", TemporalInstant::toJSON);
    RIFT_METHOD(prototype, "valueOf", TemporalInstant::valueOf);
}

// ============================================================================
// 8.1.1 Temporal.Instant ( epochNanoseconds )
// @spec https://tc39.es/proposal-temporal/#sec-temporal.instant
// DEVIATION: Accepts a number instead of BigInt. Converts nanoseconds
// to milliseconds for internal storage.
// ============================================================================
Value TemporalInstant::constructor(const CallContext& ctx, const std::vector<Value>& args) {
    // new Temporal.Instant(epochNanoseconds)
    // epochNanoseconds should be a BigInt, but since rift doesn't have BigInt,
    // accept a number (limited to millisecond precision via Number)
    if(args.empty()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Temporal.Instant requires an argument"));
    }

    double ns_value = args[0].toNumber();
    int64_t ms = static_cast<int64_t>(ns_value / 1e6);

    auto result = temporal_rs::Instant::from_epoch_milliseconds(ms);
    if(!result.is_ok()) {
        auto err = std::move(result).err().value();
        throwTemporalError(err);
    }

    return wrapInstant(std::move(result).ok().value());
}

// 8.2.2 Temporal.Instant.from ( item )
// @spec https://tc39.es/proposal-temporal/#sec-temporal.instant.from
Value TemporalInstant::from(const CallContext& ctx, const std::vector<Value>& args) {
    if(args.empty()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Temporal.Instant.from requires an argument"));
    }

    // If argument is already an Instant, clone it
    if(args[0].isObject()) {
        auto* data = InstantRegistry::get(args[0].getObject());
        if(data) {
            return wrapInstant(data->clone());
        }
    }

    // Otherwise parse from string
    std::string str = args[0].toString();
    auto result = temporal_rs::Instant::from_utf8(str);
    if(!result.is_ok()) {
        auto err = std::move(result).err().value();
        throwTemporalError(err);
    }

    return wrapInstant(std::move(result).ok().value());
}

// 8.2.3 Temporal.Instant.fromEpochMilliseconds ( epochMilliseconds )
// @spec https://tc39.es/proposal-temporal/#sec-temporal.instant.fromepochmilliseconds
Value TemporalInstant::fromEpochMilliseconds(const CallContext& ctx,
                                             const std::vector<Value>& args) {
    if(args.empty()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Temporal.Instant.fromEpochMilliseconds requires an argument"));
    }

    int64_t ms = static_cast<int64_t>(args[0].toNumber());
    auto result = temporal_rs::Instant::from_epoch_milliseconds(ms);
    if(!result.is_ok()) {
        auto err = std::move(result).err().value();
        throwTemporalError(err);
    }

    return wrapInstant(std::move(result).ok().value());
}

// 8.2.4 Temporal.Instant.fromEpochNanoseconds ( epochNanoseconds )
// @spec https://tc39.es/proposal-temporal/#sec-temporal.instant.fromepochnanoseconds
// DEVIATION: Converts nanoseconds to milliseconds since no BigInt support.
Value TemporalInstant::fromEpochNanoseconds(const CallContext& ctx,
                                            const std::vector<Value>& args) {
    // Without BigInt, accept a number (limited precision)
    if(args.empty()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Temporal.Instant.fromEpochNanoseconds requires an argument"));
    }

    // Convert to milliseconds since we can't represent full nanosecond range in double
    double ns_value = args[0].toNumber();
    int64_t ms = static_cast<int64_t>(ns_value / 1e6);
    auto result = temporal_rs::Instant::from_epoch_milliseconds(ms);
    if(!result.is_ok()) {
        auto err = std::move(result).err().value();
        throwTemporalError(err);
    }

    return wrapInstant(std::move(result).ok().value());
}

// 8.2.5 Temporal.Instant.compare ( one, two )
// @spec https://tc39.es/proposal-temporal/#sec-temporal.instant.compare
Value TemporalInstant::compare(const CallContext& ctx, const std::vector<Value>& args) {
    if(args.size() < 2) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Temporal.Instant.compare requires two arguments"));
    }

    temporal_rs::Instant* a = nullptr;
    temporal_rs::Instant* b = nullptr;

    if(args[0].isObject()) {
        a = InstantRegistry::get(args[0].getObject());
    }
    if(args[1].isObject()) {
        b = InstantRegistry::get(args[1].getObject());
    }

    if(!a || !b) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Temporal.Instant.compare requires Instant arguments"));
    }

    int8_t cmp = a->compare(*b);
    return Value(static_cast<double>(cmp));
}

// ============================================================================
// Prototype Getters and Methods
// ============================================================================

// 8.3.3 get Temporal.Instant.prototype.epochMilliseconds
// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.instant.prototype.epochmilliseconds
Value TemporalInstant::epochMilliseconds(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getInstantData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: epochMilliseconds called on non-Instant"));
    }

    return Value(static_cast<double>(data->epoch_milliseconds()));
}

// 8.3.4 get Temporal.Instant.prototype.epochNanoseconds
// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.instant.prototype.epochnanoseconds
// DEVIATION: Returns ms * 1e6 approximation; spec returns a BigInt.
Value TemporalInstant::epochNanoseconds(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getInstantData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: epochNanoseconds called on non-Instant"));
    }

    // Return as number (loses precision for very large values, but no BigInt support)
    // Approximate as milliseconds * 1e6 since we can't represent full nanosecond range in double
    return Value(static_cast<double>(data->epoch_milliseconds()) * 1e6);
}

// 8.3.5 Temporal.Instant.prototype.add ( temporalDurationLike )
// @spec https://tc39.es/proposal-temporal/#sec-temporal.instant.prototype.add
// SIMPLIFIED: Reads duration properties directly from the argument instead
// of calling ToTemporalDurationRecord. Only time-based fields supported.
Value TemporalInstant::add(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getInstantData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(Value("TypeError: add called on non-Instant"));
    }

    if(args.empty() || !args[0].isObject()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Temporal.Instant.add requires a Duration-like argument"));
    }

    // Try to create a Duration from the argument's properties
    auto* obj = args[0].getObject();

    // Extract duration components from property bag
    double hours = 0;
    double minutes = 0;
    double seconds = 0;
    double milliseconds = 0;
    double microseconds = 0;
    double nanoseconds = 0;

    Value h = obj->getProperty("hours");
    Value m = obj->getProperty("minutes");
    Value s = obj->getProperty("seconds");
    Value ms_val = obj->getProperty("milliseconds");
    Value us = obj->getProperty("microseconds");
    Value ns_val = obj->getProperty("nanoseconds");

    if(!h.isUndefined())
        hours = h.toNumber();
    if(!m.isUndefined())
        minutes = m.toNumber();
    if(!s.isUndefined())
        seconds = s.toNumber();
    if(!ms_val.isUndefined())
        milliseconds = ms_val.toNumber();
    if(!us.isUndefined())
        microseconds = us.toNumber();
    if(!ns_val.isUndefined())
        nanoseconds = ns_val.toNumber();

    auto dur_result = temporal_rs::Duration::create(
        0, 0, 0, 0, static_cast<int64_t>(hours), static_cast<int64_t>(minutes),
        static_cast<int64_t>(seconds), static_cast<int64_t>(milliseconds), microseconds,
        nanoseconds);
    if(!dur_result.is_ok()) {
        auto err = std::move(dur_result).err().value();
        throwTemporalError(err);
    }
    auto dur = std::move(dur_result).ok().value();

    auto result = data->add(*dur);
    if(!result.is_ok()) {
        auto err = std::move(result).err().value();
        throwTemporalError(err);
    }

    return wrapInstant(std::move(result).ok().value());
}

// 8.3.6 Temporal.Instant.prototype.subtract ( temporalDurationLike )
// @spec https://tc39.es/proposal-temporal/#sec-temporal.instant.prototype.subtract
// SIMPLIFIED: Same approach as add — reads properties directly.
Value TemporalInstant::subtract(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getInstantData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(Value("TypeError: subtract called on non-Instant"));
    }

    if(args.empty() || !args[0].isObject()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Temporal.Instant.subtract requires a Duration-like argument"));
    }

    auto* obj = args[0].getObject();

    double hours = 0;
    double minutes = 0;
    double seconds = 0;
    double milliseconds = 0;
    double microseconds = 0;
    double nanoseconds = 0;

    Value h = obj->getProperty("hours");
    Value m = obj->getProperty("minutes");
    Value s = obj->getProperty("seconds");
    Value ms_val = obj->getProperty("milliseconds");
    Value us = obj->getProperty("microseconds");
    Value ns_val = obj->getProperty("nanoseconds");

    if(!h.isUndefined())
        hours = h.toNumber();
    if(!m.isUndefined())
        minutes = m.toNumber();
    if(!s.isUndefined())
        seconds = s.toNumber();
    if(!ms_val.isUndefined())
        milliseconds = ms_val.toNumber();
    if(!us.isUndefined())
        microseconds = us.toNumber();
    if(!ns_val.isUndefined())
        nanoseconds = ns_val.toNumber();

    auto dur_result = temporal_rs::Duration::create(
        0, 0, 0, 0, static_cast<int64_t>(hours), static_cast<int64_t>(minutes),
        static_cast<int64_t>(seconds), static_cast<int64_t>(milliseconds), microseconds,
        nanoseconds);
    if(!dur_result.is_ok()) {
        auto err = std::move(dur_result).err().value();
        throwTemporalError(err);
    }
    auto dur = std::move(dur_result).ok().value();

    auto result = data->subtract(*dur);
    if(!result.is_ok()) {
        auto err = std::move(result).err().value();
        throwTemporalError(err);
    }

    return wrapInstant(std::move(result).ok().value());
}

// 8.3.11 Temporal.Instant.prototype.equals ( other )
// @spec https://tc39.es/proposal-temporal/#sec-temporal.instant.prototype.equals
Value TemporalInstant::equals(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getInstantData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(Value("TypeError: equals called on non-Instant"));
    }

    if(args.empty() || !args[0].isObject()) {
        return Value(false);
    }

    auto* other = InstantRegistry::get(args[0].getObject());
    if(!other) {
        return Value(false);
    }

    return Value(data->equals(*other));
}

// 8.3.10 Temporal.Instant.prototype.since ( other [ , options ] )
// @spec https://tc39.es/proposal-temporal/#sec-temporal.instant.prototype.since
// INCOMPLETE: options parameter not processed.
Value TemporalInstant::since(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getInstantData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(Value("TypeError: since called on non-Instant"));
    }

    if(args.empty() || !args[0].isObject()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Temporal.Instant.prototype.since requires an Instant argument"));
    }

    auto* other = InstantRegistry::get(args[0].getObject());
    if(!other) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Temporal.Instant.prototype.since requires an Instant argument"));
    }

    temporal_rs::DifferenceSettings settings{std::nullopt, std::nullopt, std::nullopt,
                                             std::nullopt};

    auto result = data->since(*other, settings);
    if(!result.is_ok()) {
        throwTemporalError(std::move(result).err().value());
    }

    return TemporalDuration::wrapDuration(std::move(result).ok().value());
}

// 8.3.9 Temporal.Instant.prototype.until ( other [ , options ] )
// @spec https://tc39.es/proposal-temporal/#sec-temporal.instant.prototype.until
// INCOMPLETE: options parameter not processed.
Value TemporalInstant::until(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getInstantData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(Value("TypeError: until called on non-Instant"));
    }

    if(args.empty() || !args[0].isObject()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Temporal.Instant.prototype.until requires an Instant argument"));
    }

    auto* other = InstantRegistry::get(args[0].getObject());
    if(!other) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Temporal.Instant.prototype.until requires an Instant argument"));
    }

    temporal_rs::DifferenceSettings settings{std::nullopt, std::nullopt, std::nullopt,
                                             std::nullopt};

    auto result = data->until(*other, settings);
    if(!result.is_ok()) {
        throwTemporalError(std::move(result).err().value());
    }

    return TemporalDuration::wrapDuration(std::move(result).ok().value());
}

// 8.3.12 Temporal.Instant.prototype.toString ( [ options ] )
// @spec https://tc39.es/proposal-temporal/#sec-temporal.instant.prototype.tostring
Value TemporalInstant::toString(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getInstantData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(Value("TypeError: toString called on non-Instant"));
    }

    // Default options: auto precision, no specific smallest unit or rounding
    temporal_rs::ToStringRoundingOptions options{
        temporal_rs::Precision{false, std::nullopt},  // auto precision
        std::nullopt,                                 // no smallest_unit
        std::nullopt                                  // no rounding_mode
    };

    auto result = data->to_ixdtf_string_with_compiled_data(std::nullopt, options);
    if(!result.is_ok()) {
        auto err = std::move(result).err().value();
        throwTemporalError(err);
    }

    return Value(std::move(result).ok().value());
}

// 8.3.13 Temporal.Instant.prototype.toJSON ()
// @spec https://tc39.es/proposal-temporal/#sec-temporal.instant.prototype.tojson
Value TemporalInstant::toJSON(const CallContext& ctx, const std::vector<Value>& args) {
    // toJSON() returns the same as toString()
    return toString(ctx, args);
}

// 8.3.14 Temporal.Instant.prototype.valueOf ()
// @spec https://tc39.es/proposal-temporal/#sec-temporal.instant.prototype.valueof
// Always throws TypeError — Temporal types are not convertible to primitives.
Value TemporalInstant::valueOf(const CallContext& ctx, const std::vector<Value>& args) {
    // Per spec, Temporal.Instant.prototype.valueOf always throws TypeError
    throw rift::core::JavaScriptException(
        Value("TypeError: Cannot convert a Temporal.Instant to a primitive value"));
}

// ===== Private =====

JSObject* TemporalInstant::getGlobalPrototype() {
    return rift::core::BuiltinManager::getInstantPrototype();
}

}  // namespace rift::builtins
