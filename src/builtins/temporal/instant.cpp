#include "rift/builtins/temporal/instant.h"

#include "temporal_rs/DifferenceSettings.hpp"
#include "temporal_rs/Duration.hpp"
#include "temporal_rs/Instant.hpp"

#include "rift/builtins/temporal/duration.h"
#include "rift/core/engine/builtin_manager.h"
#include "rift/core/engine/javascript_exception.h"
#include "rift/core/engine/this_helpers.h"
#include "rift/memory/gc_protector.h"

namespace rift::builtins {

using rift::core::extractThisObject;

// ===== InstantRegistry =====

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

// ===== Helper: Get Instant data from this =====

static temporal_rs::Instant* getInstantData(const CallContext& ctx) {
    auto* obj = extractThisObject(ctx);
    if(obj) {
        return InstantRegistry::get(obj);
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

// ===== Helper: Wrap a temporal_rs::Instant into a JS object =====

Value TemporalInstant::wrapInstant(std::unique_ptr<temporal_rs::Instant> instant) {
    auto* proto = getGlobalPrototype();
    auto* js_obj = getObjectFactory()->createJSObject(proto);
    rift::memory::GCProtector protect(js_obj, getObjectFactory()->getObjectManager());

    InstantRegistry::store(js_obj, std::move(instant));

    return Value(js_obj);
}

// ===== Setup =====

void TemporalInstant::setupStaticMethods(JSObject* constructor,
                                         rift::memory::ObjectFactory* factory) {
    RIFT_STATIC_METHOD(constructor, "from", TemporalInstant::from);
    RIFT_STATIC_METHOD(constructor, "fromEpochMilliseconds",
                       TemporalInstant::fromEpochMilliseconds);
    RIFT_STATIC_METHOD(constructor, "fromEpochNanoseconds",
                       TemporalInstant::fromEpochNanoseconds);
    RIFT_STATIC_METHOD(constructor, "compare", TemporalInstant::compare);
}

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

// ===== Constructor =====

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

// ===== Static Methods =====

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

// ===== Prototype Methods =====

Value TemporalInstant::epochMilliseconds(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getInstantData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: epochMilliseconds called on non-Instant"));
    }

    return Value(static_cast<double>(data->epoch_milliseconds()));
}

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

    if(!h.isUndefined()) hours = h.toNumber();
    if(!m.isUndefined()) minutes = m.toNumber();
    if(!s.isUndefined()) seconds = s.toNumber();
    if(!ms_val.isUndefined()) milliseconds = ms_val.toNumber();
    if(!us.isUndefined()) microseconds = us.toNumber();
    if(!ns_val.isUndefined()) nanoseconds = ns_val.toNumber();

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

Value TemporalInstant::subtract(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getInstantData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: subtract called on non-Instant"));
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

    if(!h.isUndefined()) hours = h.toNumber();
    if(!m.isUndefined()) minutes = m.toNumber();
    if(!s.isUndefined()) seconds = s.toNumber();
    if(!ms_val.isUndefined()) milliseconds = ms_val.toNumber();
    if(!us.isUndefined()) microseconds = us.toNumber();
    if(!ns_val.isUndefined()) nanoseconds = ns_val.toNumber();

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

Value TemporalInstant::equals(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getInstantData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: equals called on non-Instant"));
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

Value TemporalInstant::toString(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getInstantData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: toString called on non-Instant"));
    }

    // Default options: auto precision, no specific smallest unit or rounding
    temporal_rs::ToStringRoundingOptions options{
        temporal_rs::Precision{false, std::nullopt},  // auto precision
        std::nullopt,                                  // no smallest_unit
        std::nullopt                                   // no rounding_mode
    };

    auto result = data->to_ixdtf_string_with_compiled_data(std::nullopt, options);
    if(!result.is_ok()) {
        auto err = std::move(result).err().value();
        throwTemporalError(err);
    }

    return Value(std::move(result).ok().value());
}

Value TemporalInstant::toJSON(const CallContext& ctx, const std::vector<Value>& args) {
    // toJSON() returns the same as toString()
    return toString(ctx, args);
}

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
