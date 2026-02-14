#include "rift/builtins/temporal/plain_time.h"

#include "temporal_rs/DifferenceSettings.hpp"
#include "temporal_rs/Duration.hpp"
#include "temporal_rs/PartialTime.hpp"
#include "temporal_rs/PlainTime.hpp"
#include "temporal_rs/Precision.hpp"
#include "temporal_rs/ToStringRoundingOptions.hpp"

#include "rift/builtins/temporal/duration.h"
#include "rift/core/engine/builtin_manager.h"
#include "rift/core/engine/javascript_exception.h"
#include "rift/core/engine/this_helpers.h"
#include "rift/memory/gc_protector.h"

namespace rift::builtins {

using rift::core::extractThisObject;

// ===== PlainTimeRegistry =====

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

// ===== Helper: Get PlainTime data from this =====

static temporal_rs::PlainTime* getPlainTimeData(const CallContext& ctx) {
    auto* obj = extractThisObject(ctx);
    if(obj) {
        return PlainTimeRegistry::get(obj);
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

// ===== Helper: Parse a PlainTime from a JS Value =====

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

        if(!h.isUndefined()) partial.hour = static_cast<uint8_t>(h.toNumber());
        if(!mi.isUndefined()) partial.minute = static_cast<uint8_t>(mi.toNumber());
        if(!s.isUndefined()) partial.second = static_cast<uint8_t>(s.toNumber());
        if(!ms.isUndefined()) partial.millisecond = static_cast<uint16_t>(ms.toNumber());
        if(!us.isUndefined()) partial.microsecond = static_cast<uint16_t>(us.toNumber());
        if(!ns.isUndefined()) partial.nanosecond = static_cast<uint16_t>(ns.toNumber());

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

// ===== Helper: Parse a Duration for PlainTime arithmetic =====

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

// ===== Helper: Wrap a temporal_rs::PlainTime into a JS object =====

Value TemporalPlainTime::wrapPlainTime(std::unique_ptr<temporal_rs::PlainTime> time) {
    auto* proto = getGlobalPrototype();
    auto* js_obj = getObjectFactory()->createJSObject(proto);
    rift::memory::GCProtector protect(js_obj, getObjectFactory()->getObjectManager());

    PlainTimeRegistry::store(js_obj, std::move(time));

    return Value(js_obj);
}

// ===== Setup =====

void TemporalPlainTime::setupStaticMethods(JSObject* constructor,
                                            rift::memory::ObjectFactory* factory) {
    RIFT_STATIC_METHOD(constructor, "from", TemporalPlainTime::from);
    RIFT_STATIC_METHOD(constructor, "compare", TemporalPlainTime::compare);
}

void TemporalPlainTime::setupPrototypeMethods(JSObject* prototype,
                                               rift::memory::ObjectFactory* factory) {
    // Getters
    RIFT_GETTER(prototype, "hour", TemporalPlainTime::hour);
    RIFT_GETTER(prototype, "minute", TemporalPlainTime::minute);
    RIFT_GETTER(prototype, "second", TemporalPlainTime::second);
    RIFT_GETTER(prototype, "millisecond", TemporalPlainTime::millisecond);
    RIFT_GETTER(prototype, "microsecond", TemporalPlainTime::microsecond);
    RIFT_GETTER(prototype, "nanosecond", TemporalPlainTime::nanosecond);

    // Mutation
    RIFT_METHOD(prototype, "with", TemporalPlainTime::with);

    // Arithmetic
    RIFT_METHOD(prototype, "add", TemporalPlainTime::add);
    RIFT_METHOD(prototype, "subtract", TemporalPlainTime::subtract);

    // Difference
    RIFT_METHOD(prototype, "until", TemporalPlainTime::until);
    RIFT_METHOD(prototype, "since", TemporalPlainTime::since);

    // Comparison
    RIFT_METHOD(prototype, "equals", TemporalPlainTime::equals);

    // String
    RIFT_METHOD(prototype, "toString", TemporalPlainTime::toString);
    RIFT_METHOD(prototype, "toJSON", TemporalPlainTime::toJSON);
    RIFT_METHOD(prototype, "valueOf", TemporalPlainTime::valueOf);
}

// ===== Constructor =====

Value TemporalPlainTime::constructor(const CallContext& ctx, const std::vector<Value>& args) {
    uint8_t hour_val = args.size() > 0 ? static_cast<uint8_t>(args[0].toNumber()) : 0;
    uint8_t minute_val = args.size() > 1 ? static_cast<uint8_t>(args[1].toNumber()) : 0;
    uint8_t second_val = args.size() > 2 ? static_cast<uint8_t>(args[2].toNumber()) : 0;
    uint16_t ms_val = args.size() > 3 ? static_cast<uint16_t>(args[3].toNumber()) : 0;
    uint16_t us_val = args.size() > 4 ? static_cast<uint16_t>(args[4].toNumber()) : 0;
    uint16_t ns_val = args.size() > 5 ? static_cast<uint16_t>(args[5].toNumber()) : 0;

    auto result = temporal_rs::PlainTime::try_new(hour_val, minute_val, second_val,
                                                   ms_val, us_val, ns_val);
    if(!result.is_ok()) {
        throwTemporalError(std::move(result).err().value());
    }

    return wrapPlainTime(std::move(result).ok().value());
}

// ===== Static Methods =====

Value TemporalPlainTime::from(const CallContext& ctx, const std::vector<Value>& args) {
    if(args.empty()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Temporal.PlainTime.from requires an argument"));
    }

    auto time = parsePlainTimeFromValue(args[0]);
    return wrapPlainTime(std::move(time));
}

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

// ===== Prototype Getters =====

Value TemporalPlainTime::hour(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(Value("TypeError: hour called on non-PlainTime"));
    }
    return Value(static_cast<double>(data->hour()));
}

Value TemporalPlainTime::minute(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(Value("TypeError: minute called on non-PlainTime"));
    }
    return Value(static_cast<double>(data->minute()));
}

Value TemporalPlainTime::second(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(Value("TypeError: second called on non-PlainTime"));
    }
    return Value(static_cast<double>(data->second()));
}

Value TemporalPlainTime::millisecond(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: millisecond called on non-PlainTime"));
    }
    return Value(static_cast<double>(data->millisecond()));
}

Value TemporalPlainTime::microsecond(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: microsecond called on non-PlainTime"));
    }
    return Value(static_cast<double>(data->microsecond()));
}

Value TemporalPlainTime::nanosecond(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: nanosecond called on non-PlainTime"));
    }
    return Value(static_cast<double>(data->nanosecond()));
}

// ===== Mutation =====

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

    if(!h.isUndefined()) partial.hour = static_cast<uint8_t>(h.toNumber());
    if(!mi.isUndefined()) partial.minute = static_cast<uint8_t>(mi.toNumber());
    if(!s.isUndefined()) partial.second = static_cast<uint8_t>(s.toNumber());
    if(!ms.isUndefined()) partial.millisecond = static_cast<uint16_t>(ms.toNumber());
    if(!us.isUndefined()) partial.microsecond = static_cast<uint16_t>(us.toNumber());
    if(!ns.isUndefined()) partial.nanosecond = static_cast<uint16_t>(ns.toNumber());

    auto result = data->with(partial, std::nullopt);
    if(!result.is_ok()) {
        throwTemporalError(std::move(result).err().value());
    }

    return wrapPlainTime(std::move(result).ok().value());
}

// ===== Arithmetic =====

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

Value TemporalPlainTime::subtract(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: subtract called on non-PlainTime"));
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

// ===== Difference =====

Value TemporalPlainTime::until(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: until called on non-PlainTime"));
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

Value TemporalPlainTime::since(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: since called on non-PlainTime"));
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

// ===== Comparison =====

Value TemporalPlainTime::equals(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: equals called on non-PlainTime"));
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

// ===== String =====

Value TemporalPlainTime::toString(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainTimeData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: toString called on non-PlainTime"));
    }

    temporal_rs::ToStringRoundingOptions options{
        temporal_rs::Precision{false, std::nullopt}, std::nullopt, std::nullopt};

    auto result = data->to_ixdtf_string(options);
    if(!result.is_ok()) {
        throwTemporalError(std::move(result).err().value());
    }

    return Value(std::move(result).ok().value());
}

Value TemporalPlainTime::toJSON(const CallContext& ctx, const std::vector<Value>& args) {
    return toString(ctx, args);
}

Value TemporalPlainTime::valueOf(const CallContext& ctx, const std::vector<Value>& args) {
    throw rift::core::JavaScriptException(
        Value("TypeError: Cannot convert a Temporal.PlainTime to a primitive value"));
}

// ===== Private =====

JSObject* TemporalPlainTime::getGlobalPrototype() {
    return rift::core::BuiltinManager::getPlainTimePrototype();
}

}  // namespace rift::builtins
