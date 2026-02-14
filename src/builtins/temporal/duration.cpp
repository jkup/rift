#include "rift/builtins/temporal/duration.h"

#include "temporal_rs/Duration.hpp"
#include "temporal_rs/PartialDuration.hpp"
#include "temporal_rs/RelativeTo.hpp"
#include "temporal_rs/RoundingOptions.hpp"
#include "temporal_rs/Sign.hpp"
#include "temporal_rs/ToStringRoundingOptions.hpp"
#include "temporal_rs/Unit.hpp"

#include "rift/core/engine/builtin_manager.h"
#include "rift/core/engine/javascript_exception.h"
#include "rift/core/engine/this_helpers.h"
#include "rift/memory/gc_protector.h"

namespace rift::builtins {

using rift::core::extractThisObject;

// ===== DurationRegistry =====

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

// ===== Helper: Get Duration data from this =====

static temporal_rs::Duration* getDurationData(const CallContext& ctx) {
    auto* obj = extractThisObject(ctx);
    if(obj) {
        return DurationRegistry::get(obj);
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

// ===== Helper: Parse a Duration from a JS Value =====

static std::unique_ptr<temporal_rs::Duration> parseDurationFromValue(const Value& val) {
    // If it's an object in the DurationRegistry, clone it
    if(val.isObject() || val.isFunction()) {
        auto* data = DurationRegistry::get(val.getObject());
        if(data) {
            return data->clone();
        }

        // Property bag: extract fields
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

// ===== Helper: Wrap a temporal_rs::Duration into a JS object =====

Value TemporalDuration::wrapDuration(std::unique_ptr<temporal_rs::Duration> dur) {
    auto* proto = getGlobalPrototype();
    auto* js_obj = getObjectFactory()->createJSObject(proto);
    rift::memory::GCProtector protect(js_obj, getObjectFactory()->getObjectManager());

    DurationRegistry::store(js_obj, std::move(dur));

    return Value(js_obj);
}

// ===== Setup =====

void TemporalDuration::setupStaticMethods(JSObject* constructor,
                                           rift::memory::ObjectFactory* factory) {
    RIFT_STATIC_METHOD(constructor, "from", TemporalDuration::from);
    RIFT_STATIC_METHOD(constructor, "compare", TemporalDuration::compare);
}

void TemporalDuration::setupPrototypeMethods(JSObject* prototype,
                                              rift::memory::ObjectFactory* factory) {
    // Getters
    RIFT_METHOD(prototype, "years", TemporalDuration::years);
    RIFT_METHOD(prototype, "months", TemporalDuration::months);
    RIFT_METHOD(prototype, "weeks", TemporalDuration::weeks);
    RIFT_METHOD(prototype, "days", TemporalDuration::days);
    RIFT_METHOD(prototype, "hours", TemporalDuration::hours);
    RIFT_METHOD(prototype, "minutes", TemporalDuration::minutes);
    RIFT_METHOD(prototype, "seconds", TemporalDuration::seconds);
    RIFT_METHOD(prototype, "milliseconds", TemporalDuration::milliseconds);
    RIFT_METHOD(prototype, "microseconds", TemporalDuration::microseconds);
    RIFT_METHOD(prototype, "nanoseconds", TemporalDuration::nanoseconds);
    RIFT_METHOD(prototype, "sign", TemporalDuration::sign);
    RIFT_METHOD(prototype, "blank", TemporalDuration::blank);

    // Arithmetic
    RIFT_METHOD(prototype, "abs", TemporalDuration::abs);
    RIFT_METHOD(prototype, "negated", TemporalDuration::negated);
    RIFT_METHOD(prototype, "add", TemporalDuration::add);
    RIFT_METHOD(prototype, "subtract", TemporalDuration::subtract);

    // Rounding
    RIFT_METHOD(prototype, "round", TemporalDuration::round);
    RIFT_METHOD(prototype, "total", TemporalDuration::total);

    // String
    RIFT_METHOD(prototype, "toString", TemporalDuration::toString);
    RIFT_METHOD(prototype, "toJSON", TemporalDuration::toJSON);
    RIFT_METHOD(prototype, "valueOf", TemporalDuration::valueOf);
}

// ===== Constructor =====

Value TemporalDuration::constructor(const CallContext& ctx, const std::vector<Value>& args) {
    // new Temporal.Duration(years, months, weeks, days, hours, minutes, seconds,
    //                       milliseconds, microseconds, nanoseconds)
    // All arguments default to 0
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

    auto result = temporal_rs::Duration::create(years_val, months_val, weeks_val, days_val,
                                                hours_val, minutes_val, seconds_val,
                                                milliseconds_val, microseconds_val,
                                                nanoseconds_val);
    if(!result.is_ok()) {
        throwTemporalError(std::move(result).err().value());
    }

    return wrapDuration(std::move(result).ok().value());
}

// ===== Static Methods =====

Value TemporalDuration::from(const CallContext& ctx, const std::vector<Value>& args) {
    if(args.empty()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Temporal.Duration.from requires an argument"));
    }

    auto dur = parseDurationFromValue(args[0]);
    return wrapDuration(std::move(dur));
}

Value TemporalDuration::compare(const CallContext& ctx, const std::vector<Value>& args) {
    if(args.size() < 2) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Temporal.Duration.compare requires two arguments"));
    }

    auto dur_one = parseDurationFromValue(args[0]);
    auto dur_two = parseDurationFromValue(args[1]);

    temporal_rs::RelativeTo relative_to{nullptr, nullptr};
    auto result = dur_one->compare(*dur_two, relative_to);
    if(!result.is_ok()) {
        throwTemporalError(std::move(result).err().value());
    }

    return Value(static_cast<double>(std::move(result).ok().value()));
}

// ===== Prototype Getters =====

Value TemporalDuration::years(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getDurationData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(Value("TypeError: years called on non-Duration"));
    }
    return Value(static_cast<double>(data->years()));
}

Value TemporalDuration::months(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getDurationData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(Value("TypeError: months called on non-Duration"));
    }
    return Value(static_cast<double>(data->months()));
}

Value TemporalDuration::weeks(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getDurationData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(Value("TypeError: weeks called on non-Duration"));
    }
    return Value(static_cast<double>(data->weeks()));
}

Value TemporalDuration::days(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getDurationData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(Value("TypeError: days called on non-Duration"));
    }
    return Value(static_cast<double>(data->days()));
}

Value TemporalDuration::hours(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getDurationData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(Value("TypeError: hours called on non-Duration"));
    }
    return Value(static_cast<double>(data->hours()));
}

Value TemporalDuration::minutes(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getDurationData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: minutes called on non-Duration"));
    }
    return Value(static_cast<double>(data->minutes()));
}

Value TemporalDuration::seconds(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getDurationData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: seconds called on non-Duration"));
    }
    return Value(static_cast<double>(data->seconds()));
}

Value TemporalDuration::milliseconds(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getDurationData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: milliseconds called on non-Duration"));
    }
    return Value(static_cast<double>(data->milliseconds()));
}

Value TemporalDuration::microseconds(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getDurationData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: microseconds called on non-Duration"));
    }
    return Value(data->microseconds());
}

Value TemporalDuration::nanoseconds(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getDurationData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: nanoseconds called on non-Duration"));
    }
    return Value(data->nanoseconds());
}

Value TemporalDuration::sign(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getDurationData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(Value("TypeError: sign called on non-Duration"));
    }
    return Value(static_cast<double>(data->sign()));
}

Value TemporalDuration::blank(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getDurationData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(Value("TypeError: blank called on non-Duration"));
    }
    return Value(data->is_zero());
}

// ===== Arithmetic =====

Value TemporalDuration::abs(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getDurationData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(Value("TypeError: abs called on non-Duration"));
    }
    return wrapDuration(data->abs());
}

Value TemporalDuration::negated(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getDurationData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: negated called on non-Duration"));
    }
    return wrapDuration(data->negated());
}

Value TemporalDuration::add(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getDurationData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(Value("TypeError: add called on non-Duration"));
    }

    if(args.empty()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Temporal.Duration.prototype.add requires an argument"));
    }

    auto other = parseDurationFromValue(args[0]);
    auto result = data->add(*other);
    if(!result.is_ok()) {
        throwTemporalError(std::move(result).err().value());
    }

    return wrapDuration(std::move(result).ok().value());
}

Value TemporalDuration::subtract(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getDurationData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: subtract called on non-Duration"));
    }

    if(args.empty()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Temporal.Duration.prototype.subtract requires an argument"));
    }

    auto other = parseDurationFromValue(args[0]);
    auto result = data->subtract(*other);
    if(!result.is_ok()) {
        throwTemporalError(std::move(result).err().value());
    }

    return wrapDuration(std::move(result).ok().value());
}

// ===== Helper: Parse a Unit string =====

static temporal_rs::Unit parseUnit(const std::string& str) {
    if(str == "year" || str == "years") return temporal_rs::Unit::Year;
    if(str == "month" || str == "months") return temporal_rs::Unit::Month;
    if(str == "week" || str == "weeks") return temporal_rs::Unit::Week;
    if(str == "day" || str == "days") return temporal_rs::Unit::Day;
    if(str == "hour" || str == "hours") return temporal_rs::Unit::Hour;
    if(str == "minute" || str == "minutes") return temporal_rs::Unit::Minute;
    if(str == "second" || str == "seconds") return temporal_rs::Unit::Second;
    if(str == "millisecond" || str == "milliseconds") return temporal_rs::Unit::Millisecond;
    if(str == "microsecond" || str == "microseconds") return temporal_rs::Unit::Microsecond;
    if(str == "nanosecond" || str == "nanoseconds") return temporal_rs::Unit::Nanosecond;
    throw rift::core::JavaScriptException(Value("RangeError: Invalid unit: " + str));
}

// ===== Rounding =====

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
        // String shorthand: the argument is the smallestUnit
        options.smallest_unit = parseUnit(args[0].getString());
    } else if(args[0].isObject() || args[0].isFunction()) {
        auto* obj = args[0].getObject();
        Value smallest = obj->getProperty("smallestUnit");
        Value largest = obj->getProperty("largestUnit");
        Value mode = obj->getProperty("roundingMode");
        Value inc = obj->getProperty("roundingIncrement");

        if(!smallest.isUndefined()) options.smallest_unit = parseUnit(smallest.toString());
        if(!largest.isUndefined()) options.largest_unit = parseUnit(largest.toString());
        if(!inc.isUndefined()) options.increment = static_cast<uint32_t>(inc.toNumber());
    }

    temporal_rs::RelativeTo relative_to{nullptr, nullptr};
    auto result = data->round(options, relative_to);
    if(!result.is_ok()) {
        throwTemporalError(std::move(result).err().value());
    }

    return wrapDuration(std::move(result).ok().value());
}

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
        unit = parseUnit(args[0].getString());
    } else if(args[0].isObject() || args[0].isFunction()) {
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

// ===== String =====

Value TemporalDuration::toString(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getDurationData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: toString called on non-Duration"));
    }

    temporal_rs::ToStringRoundingOptions options{
        temporal_rs::Precision{false, std::nullopt},  // auto precision
        std::nullopt,                                  // no smallest_unit
        std::nullopt                                   // no rounding_mode
    };

    auto result = data->to_string(options);
    if(!result.is_ok()) {
        throwTemporalError(std::move(result).err().value());
    }

    return Value(std::move(result).ok().value());
}

Value TemporalDuration::toJSON(const CallContext& ctx, const std::vector<Value>& args) {
    return toString(ctx, args);
}

Value TemporalDuration::valueOf(const CallContext& ctx, const std::vector<Value>& args) {
    throw rift::core::JavaScriptException(
        Value("TypeError: Cannot convert a Temporal.Duration to a primitive value"));
}

// ===== Private =====

JSObject* TemporalDuration::getGlobalPrototype() {
    return rift::core::BuiltinManager::getDurationPrototype();
}

}  // namespace rift::builtins
