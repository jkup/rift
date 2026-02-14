#include "rift/builtins/temporal/plain_month_day.h"

#include "temporal_rs/AnyCalendarKind.hpp"
#include "temporal_rs/ArithmeticOverflow.hpp"
#include "temporal_rs/DisplayCalendar.hpp"
#include "temporal_rs/PartialDate.hpp"
#include "temporal_rs/PlainDate.hpp"
#include "temporal_rs/PlainMonthDay.hpp"

#include "rift/builtins/temporal/plain_date.h"
#include "rift/core/engine/builtin_manager.h"
#include "rift/core/engine/javascript_exception.h"
#include "rift/core/engine/this_helpers.h"
#include "rift/memory/gc_protector.h"

namespace rift::builtins {

using rift::core::extractThisObject;

// ===== PlainMonthDayRegistry =====

std::unordered_map<JSObject*, std::unique_ptr<temporal_rs::PlainMonthDay>>
    PlainMonthDayRegistry::registry_;

void PlainMonthDayRegistry::store(JSObject* obj,
                                  std::unique_ptr<temporal_rs::PlainMonthDay> data) {
    registry_[obj] = std::move(data);
}

temporal_rs::PlainMonthDay* PlainMonthDayRegistry::get(JSObject* obj) {
    auto it = registry_.find(obj);
    if(it != registry_.end()) {
        return it->second.get();
    }
    return nullptr;
}

void PlainMonthDayRegistry::remove(JSObject* obj) {
    registry_.erase(obj);
}

void PlainMonthDayRegistry::clear() {
    registry_.clear();
}

// ===== Helper: Get PlainMonthDay data from this =====

static temporal_rs::PlainMonthDay* getPlainMonthDayData(const CallContext& ctx) {
    auto* obj = extractThisObject(ctx);
    if(obj) {
        return PlainMonthDayRegistry::get(obj);
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

// ===== Helper: Parse a PlainMonthDay from a JS Value =====

static std::unique_ptr<temporal_rs::PlainMonthDay> parsePlainMonthDayFromValue(const Value& val) {
    if(val.isObject() || val.isFunction()) {
        auto* data = PlainMonthDayRegistry::get(val.getObject());
        if(data) {
            return data->clone();
        }

        // Property bag
        auto* obj = val.getObject();
        temporal_rs::PartialDate partial{};

        Value mo = obj->getProperty("month");
        Value mc = obj->getProperty("monthCode");
        Value d = obj->getProperty("day");
        Value e = obj->getProperty("era");
        Value ey = obj->getProperty("eraYear");

        if(!mo.isUndefined()) partial.month = static_cast<uint8_t>(mo.toNumber());
        if(!d.isUndefined()) partial.day = static_cast<uint8_t>(d.toNumber());
        if(!ey.isUndefined()) partial.era_year = static_cast<int32_t>(ey.toNumber());

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

        auto result = temporal_rs::PlainMonthDay::from_partial(partial, std::nullopt);
        if(!result.is_ok()) {
            throwTemporalError(std::move(result).err().value());
        }
        return std::move(result).ok().value();
    }

    // String
    std::string str = val.toString();
    auto result = temporal_rs::PlainMonthDay::from_utf8(str);
    if(!result.is_ok()) {
        throwTemporalError(std::move(result).err().value());
    }
    return std::move(result).ok().value();
}

// ===== Helper: Wrap a temporal_rs::PlainMonthDay into a JS object =====

Value TemporalPlainMonthDay::wrapPlainMonthDay(std::unique_ptr<temporal_rs::PlainMonthDay> md) {
    auto* proto = getGlobalPrototype();
    auto* js_obj = getObjectFactory()->createJSObject(proto);
    rift::memory::GCProtector protect(js_obj, getObjectFactory()->getObjectManager());

    PlainMonthDayRegistry::store(js_obj, std::move(md));

    return Value(js_obj);
}

// ===== Setup =====

void TemporalPlainMonthDay::setupStaticMethods(JSObject* constructor,
                                                rift::memory::ObjectFactory* factory) {
    RIFT_STATIC_METHOD(constructor, "from", TemporalPlainMonthDay::from);
}

void TemporalPlainMonthDay::setupPrototypeMethods(JSObject* prototype,
                                                    rift::memory::ObjectFactory* factory) {
    // Getters
    RIFT_METHOD(prototype, "day", TemporalPlainMonthDay::day);
    RIFT_METHOD(prototype, "monthCode", TemporalPlainMonthDay::monthCode);
    RIFT_METHOD(prototype, "calendarId", TemporalPlainMonthDay::calendarId);

    // Mutation
    RIFT_METHOD(prototype, "with", TemporalPlainMonthDay::with);

    // Comparison
    RIFT_METHOD(prototype, "equals", TemporalPlainMonthDay::equals);

    // Conversion
    RIFT_METHOD(prototype, "toPlainDate", TemporalPlainMonthDay::toPlainDate);

    // String
    RIFT_METHOD(prototype, "toString", TemporalPlainMonthDay::toString);
    RIFT_METHOD(prototype, "toJSON", TemporalPlainMonthDay::toJSON);
    RIFT_METHOD(prototype, "valueOf", TemporalPlainMonthDay::valueOf);
}

// ===== Constructor =====

Value TemporalPlainMonthDay::constructor(const CallContext& ctx, const std::vector<Value>& args) {
    if(args.size() < 2) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Temporal.PlainMonthDay requires at least month and day"));
    }

    uint8_t month_val = static_cast<uint8_t>(args[0].toNumber());
    uint8_t day_val = static_cast<uint8_t>(args[1].toNumber());

    temporal_rs::AnyCalendarKind calendar = temporal_rs::AnyCalendarKind::Iso;
    std::optional<int32_t> ref_year = std::nullopt;

    if(args.size() > 2 && args[2].isString()) {
        auto cal = temporal_rs::AnyCalendarKind::get_for_str(args[2].getString());
        if(cal.has_value()) {
            calendar = cal.value();
        } else {
            throw rift::core::JavaScriptException(
                Value("RangeError: Invalid calendar: " + args[2].getString()));
        }
    }

    if(args.size() > 3 && !args[3].isUndefined()) {
        ref_year = static_cast<int32_t>(args[3].toNumber());
    }

    auto result = temporal_rs::PlainMonthDay::try_new_with_overflow(
        month_val, day_val, calendar, temporal_rs::ArithmeticOverflow::Constrain, ref_year);
    if(!result.is_ok()) {
        throwTemporalError(std::move(result).err().value());
    }

    return wrapPlainMonthDay(std::move(result).ok().value());
}

// ===== Static Methods =====

Value TemporalPlainMonthDay::from(const CallContext& ctx, const std::vector<Value>& args) {
    if(args.empty()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Temporal.PlainMonthDay.from requires an argument"));
    }

    auto md = parsePlainMonthDayFromValue(args[0]);
    return wrapPlainMonthDay(std::move(md));
}

// ===== Prototype Getters =====

Value TemporalPlainMonthDay::day(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainMonthDayData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: day called on non-PlainMonthDay"));
    }
    return Value(static_cast<double>(data->day()));
}

Value TemporalPlainMonthDay::monthCode(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainMonthDayData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: monthCode called on non-PlainMonthDay"));
    }
    return Value(data->month_code());
}

Value TemporalPlainMonthDay::calendarId(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainMonthDayData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: calendarId called on non-PlainMonthDay"));
    }
    return Value(std::string(data->calendar().identifier()));
}

// ===== Mutation =====

Value TemporalPlainMonthDay::with(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainMonthDayData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: with called on non-PlainMonthDay"));
    }

    if(args.empty() || (!args[0].isObject() && !args[0].isFunction())) {
        throw rift::core::JavaScriptException(Value(
            "TypeError: Temporal.PlainMonthDay.prototype.with requires an object argument"));
    }

    auto* obj = args[0].getObject();
    temporal_rs::PartialDate partial{};

    Value mc = obj->getProperty("monthCode");
    Value d = obj->getProperty("day");

    if(!d.isUndefined()) partial.day = static_cast<uint8_t>(d.toNumber());

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

    return wrapPlainMonthDay(std::move(result).ok().value());
}

// ===== Comparison =====

Value TemporalPlainMonthDay::equals(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainMonthDayData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: equals called on non-PlainMonthDay"));
    }

    if(args.empty() || (!args[0].isObject() && !args[0].isFunction())) {
        return Value(false);
    }

    auto* other = PlainMonthDayRegistry::get(args[0].getObject());
    if(!other) {
        return Value(false);
    }

    return Value(data->equals(*other));
}

// ===== Conversion =====

Value TemporalPlainMonthDay::toPlainDate(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainMonthDayData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: toPlainDate called on non-PlainMonthDay"));
    }

    if(args.empty() || (!args[0].isObject() && !args[0].isFunction())) {
        throw rift::core::JavaScriptException(Value(
            "TypeError: Temporal.PlainMonthDay.prototype.toPlainDate requires a {year} object"));
    }

    auto* obj = args[0].getObject();
    Value year_val = obj->getProperty("year");
    if(year_val.isUndefined()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: toPlainDate requires a 'year' property"));
    }

    temporal_rs::PartialDate partial{};
    partial.year = static_cast<int32_t>(year_val.toNumber());
    partial.calendar = data->calendar().kind();

    auto result = data->to_plain_date(partial);
    if(!result.is_ok()) {
        throwTemporalError(std::move(result).err().value());
    }

    return TemporalPlainDate::wrapPlainDate(std::move(result).ok().value());
}

// ===== String =====

Value TemporalPlainMonthDay::toString(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainMonthDayData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: toString called on non-PlainMonthDay"));
    }

    return Value(data->to_ixdtf_string(temporal_rs::DisplayCalendar::Auto));
}

Value TemporalPlainMonthDay::toJSON(const CallContext& ctx, const std::vector<Value>& args) {
    return toString(ctx, args);
}

Value TemporalPlainMonthDay::valueOf(const CallContext& ctx, const std::vector<Value>& args) {
    throw rift::core::JavaScriptException(
        Value("TypeError: Cannot convert a Temporal.PlainMonthDay to a primitive value"));
}

// ===== Private =====

JSObject* TemporalPlainMonthDay::getGlobalPrototype() {
    return rift::core::BuiltinManager::getPlainMonthDayPrototype();
}

}  // namespace rift::builtins
