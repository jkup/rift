#include "rift/builtins/temporal/plain_year_month.h"

#include "temporal_rs/AnyCalendarKind.hpp"
#include "temporal_rs/ArithmeticOverflow.hpp"
#include "temporal_rs/DifferenceSettings.hpp"
#include "temporal_rs/DisplayCalendar.hpp"
#include "temporal_rs/Duration.hpp"
#include "temporal_rs/PartialDate.hpp"
#include "temporal_rs/PlainDate.hpp"
#include "temporal_rs/PlainYearMonth.hpp"

#include "rift/builtins/temporal/duration.h"
#include "rift/builtins/temporal/plain_date.h"
#include "rift/core/engine/builtin_manager.h"
#include "rift/core/engine/javascript_exception.h"
#include "rift/core/engine/this_helpers.h"
#include "rift/memory/gc_protector.h"

namespace rift::builtins {

using rift::core::extractThisObject;

// ===== PlainYearMonthRegistry =====

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

// ===== Helper: Get PlainYearMonth data from this =====

static temporal_rs::PlainYearMonth* getPlainYearMonthData(const CallContext& ctx) {
    auto* obj = extractThisObject(ctx);
    if(obj) {
        return PlainYearMonthRegistry::get(obj);
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

// ===== Helper: Parse a PlainYearMonth from a JS Value =====

static std::unique_ptr<temporal_rs::PlainYearMonth> parsePlainYearMonthFromValue(
    const Value& val) {
    if(val.isObject() || val.isFunction()) {
        auto* data = PlainYearMonthRegistry::get(val.getObject());
        if(data) {
            return data->clone();
        }

        // Property bag
        auto* obj = val.getObject();
        temporal_rs::PartialDate partial{};

        Value y = obj->getProperty("year");
        Value mo = obj->getProperty("month");
        Value mc = obj->getProperty("monthCode");
        Value e = obj->getProperty("era");
        Value ey = obj->getProperty("eraYear");

        if(!y.isUndefined()) partial.year = static_cast<int32_t>(y.toNumber());
        if(!mo.isUndefined()) partial.month = static_cast<uint8_t>(mo.toNumber());
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

        auto result = temporal_rs::PlainYearMonth::from_partial(partial, std::nullopt);
        if(!result.is_ok()) {
            throwTemporalError(std::move(result).err().value());
        }
        return std::move(result).ok().value();
    }

    // String
    std::string str = val.toString();
    auto result = temporal_rs::PlainYearMonth::from_utf8(str);
    if(!result.is_ok()) {
        throwTemporalError(std::move(result).err().value());
    }
    return std::move(result).ok().value();
}

// ===== Helper: Parse a Duration for arithmetic =====

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

// ===== Helper: Wrap a temporal_rs::PlainYearMonth into a JS object =====

Value TemporalPlainYearMonth::wrapPlainYearMonth(
    std::unique_ptr<temporal_rs::PlainYearMonth> ym) {
    auto* proto = getGlobalPrototype();
    auto* js_obj = getObjectFactory()->createJSObject(proto);
    rift::memory::GCProtector protect(js_obj, getObjectFactory()->getObjectManager());

    PlainYearMonthRegistry::store(js_obj, std::move(ym));

    return Value(js_obj);
}

// ===== Setup =====

void TemporalPlainYearMonth::setupStaticMethods(JSObject* constructor,
                                                  rift::memory::ObjectFactory* factory) {
    RIFT_STATIC_METHOD(constructor, "from", TemporalPlainYearMonth::from);
    RIFT_STATIC_METHOD(constructor, "compare", TemporalPlainYearMonth::compare);
}

void TemporalPlainYearMonth::setupPrototypeMethods(JSObject* prototype,
                                                     rift::memory::ObjectFactory* factory) {
    // Getters
    RIFT_METHOD(prototype, "year", TemporalPlainYearMonth::year);
    RIFT_METHOD(prototype, "month", TemporalPlainYearMonth::month);
    RIFT_METHOD(prototype, "monthCode", TemporalPlainYearMonth::monthCode);
    RIFT_METHOD(prototype, "daysInMonth", TemporalPlainYearMonth::daysInMonth);
    RIFT_METHOD(prototype, "daysInYear", TemporalPlainYearMonth::daysInYear);
    RIFT_METHOD(prototype, "monthsInYear", TemporalPlainYearMonth::monthsInYear);
    RIFT_METHOD(prototype, "inLeapYear", TemporalPlainYearMonth::inLeapYear);
    RIFT_METHOD(prototype, "calendarId", TemporalPlainYearMonth::calendarId);

    // Mutation
    RIFT_METHOD(prototype, "with", TemporalPlainYearMonth::with);

    // Arithmetic
    RIFT_METHOD(prototype, "add", TemporalPlainYearMonth::add);
    RIFT_METHOD(prototype, "subtract", TemporalPlainYearMonth::subtract);

    // Difference
    RIFT_METHOD(prototype, "until", TemporalPlainYearMonth::until);
    RIFT_METHOD(prototype, "since", TemporalPlainYearMonth::since);

    // Comparison
    RIFT_METHOD(prototype, "equals", TemporalPlainYearMonth::equals);

    // Conversion
    RIFT_METHOD(prototype, "toPlainDate", TemporalPlainYearMonth::toPlainDate);

    // String
    RIFT_METHOD(prototype, "toString", TemporalPlainYearMonth::toString);
    RIFT_METHOD(prototype, "toJSON", TemporalPlainYearMonth::toJSON);
    RIFT_METHOD(prototype, "valueOf", TemporalPlainYearMonth::valueOf);
}

// ===== Constructor =====

Value TemporalPlainYearMonth::constructor(const CallContext& ctx, const std::vector<Value>& args) {
    if(args.size() < 2) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Temporal.PlainYearMonth requires at least year and month"));
    }

    int32_t year_val = static_cast<int32_t>(args[0].toNumber());
    uint8_t month_val = static_cast<uint8_t>(args[1].toNumber());

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

    if(args.size() > 3 && !args[3].isUndefined()) {
        ref_day = static_cast<uint8_t>(args[3].toNumber());
    }

    auto result = temporal_rs::PlainYearMonth::try_new_with_overflow(
        year_val, month_val, ref_day, calendar, temporal_rs::ArithmeticOverflow::Constrain);
    if(!result.is_ok()) {
        throwTemporalError(std::move(result).err().value());
    }

    return wrapPlainYearMonth(std::move(result).ok().value());
}

// ===== Static Methods =====

Value TemporalPlainYearMonth::from(const CallContext& ctx, const std::vector<Value>& args) {
    if(args.empty()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Temporal.PlainYearMonth.from requires an argument"));
    }

    auto ym = parsePlainYearMonthFromValue(args[0]);
    return wrapPlainYearMonth(std::move(ym));
}

Value TemporalPlainYearMonth::compare(const CallContext& ctx, const std::vector<Value>& args) {
    if(args.size() < 2) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Temporal.PlainYearMonth.compare requires two arguments"));
    }

    auto ym_one = parsePlainYearMonthFromValue(args[0]);
    auto ym_two = parsePlainYearMonthFromValue(args[1]);

    int8_t cmp = temporal_rs::PlainYearMonth::compare(*ym_one, *ym_two);
    return Value(static_cast<double>(cmp));
}

// ===== Prototype Getters =====

Value TemporalPlainYearMonth::year(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainYearMonthData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: year called on non-PlainYearMonth"));
    }
    return Value(static_cast<double>(data->year()));
}

Value TemporalPlainYearMonth::month(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainYearMonthData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: month called on non-PlainYearMonth"));
    }
    return Value(static_cast<double>(data->month()));
}

Value TemporalPlainYearMonth::monthCode(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainYearMonthData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: monthCode called on non-PlainYearMonth"));
    }
    return Value(data->month_code());
}

Value TemporalPlainYearMonth::daysInMonth(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainYearMonthData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: daysInMonth called on non-PlainYearMonth"));
    }
    return Value(static_cast<double>(data->days_in_month()));
}

Value TemporalPlainYearMonth::daysInYear(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainYearMonthData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: daysInYear called on non-PlainYearMonth"));
    }
    return Value(static_cast<double>(data->days_in_year()));
}

Value TemporalPlainYearMonth::monthsInYear(const CallContext& ctx,
                                            const std::vector<Value>& args) {
    auto* data = getPlainYearMonthData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: monthsInYear called on non-PlainYearMonth"));
    }
    return Value(static_cast<double>(data->months_in_year()));
}

Value TemporalPlainYearMonth::inLeapYear(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainYearMonthData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: inLeapYear called on non-PlainYearMonth"));
    }
    return Value(data->in_leap_year());
}

Value TemporalPlainYearMonth::calendarId(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainYearMonthData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: calendarId called on non-PlainYearMonth"));
    }
    return Value(std::string(data->calendar().identifier()));
}

// ===== Mutation =====

Value TemporalPlainYearMonth::with(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainYearMonthData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: with called on non-PlainYearMonth"));
    }

    if(args.empty() || (!args[0].isObject() && !args[0].isFunction())) {
        throw rift::core::JavaScriptException(Value(
            "TypeError: Temporal.PlainYearMonth.prototype.with requires an object argument"));
    }

    auto* obj = args[0].getObject();
    temporal_rs::PartialDate partial{};

    Value y = obj->getProperty("year");
    Value mo = obj->getProperty("month");
    Value mc = obj->getProperty("monthCode");

    if(!y.isUndefined()) partial.year = static_cast<int32_t>(y.toNumber());
    if(!mo.isUndefined()) partial.month = static_cast<uint8_t>(mo.toNumber());

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

// ===== Arithmetic =====

Value TemporalPlainYearMonth::add(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainYearMonthData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: add called on non-PlainYearMonth"));
    }

    if(args.empty()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Temporal.PlainYearMonth.prototype.add requires an argument"));
    }

    auto dur = parseDurationForYearMonth(args[0]);
    auto result = data->add(*dur, temporal_rs::ArithmeticOverflow::Constrain);
    if(!result.is_ok()) {
        throwTemporalError(std::move(result).err().value());
    }

    return wrapPlainYearMonth(std::move(result).ok().value());
}

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

    auto dur = parseDurationForYearMonth(args[0]);
    auto result = data->subtract(*dur, temporal_rs::ArithmeticOverflow::Constrain);
    if(!result.is_ok()) {
        throwTemporalError(std::move(result).err().value());
    }

    return wrapPlainYearMonth(std::move(result).ok().value());
}

// ===== Difference =====

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

    auto other = parsePlainYearMonthFromValue(args[0]);
    temporal_rs::DifferenceSettings settings{std::nullopt, std::nullopt, std::nullopt,
                                              std::nullopt};

    auto result = data->until(*other, settings);
    if(!result.is_ok()) {
        throwTemporalError(std::move(result).err().value());
    }

    return TemporalDuration::wrapDuration(std::move(result).ok().value());
}

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

    auto other = parsePlainYearMonthFromValue(args[0]);
    temporal_rs::DifferenceSettings settings{std::nullopt, std::nullopt, std::nullopt,
                                              std::nullopt};

    auto result = data->since(*other, settings);
    if(!result.is_ok()) {
        throwTemporalError(std::move(result).err().value());
    }

    return TemporalDuration::wrapDuration(std::move(result).ok().value());
}

// ===== Comparison =====

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

// ===== Conversion =====

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

// ===== String =====

Value TemporalPlainYearMonth::toString(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainYearMonthData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: toString called on non-PlainYearMonth"));
    }

    return Value(data->to_ixdtf_string(temporal_rs::DisplayCalendar::Auto));
}

Value TemporalPlainYearMonth::toJSON(const CallContext& ctx, const std::vector<Value>& args) {
    return toString(ctx, args);
}

Value TemporalPlainYearMonth::valueOf(const CallContext& ctx, const std::vector<Value>& args) {
    throw rift::core::JavaScriptException(
        Value("TypeError: Cannot convert a Temporal.PlainYearMonth to a primitive value"));
}

// ===== Private =====

JSObject* TemporalPlainYearMonth::getGlobalPrototype() {
    return rift::core::BuiltinManager::getPlainYearMonthPrototype();
}

}  // namespace rift::builtins
