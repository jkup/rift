#include "rift/builtins/temporal/plain_month_day.h"

#include "rift/builtins/builtin_manager.h"
#include "rift/builtins/temporal/plain_date.h"
#include "rift/interpreter/javascript_exception.h"
#include "rift/interpreter/this_helpers.h"
#include "rift/memory/gc_protector.h"
#include "temporal_rs/AnyCalendarKind.hpp"
#include "temporal_rs/ArithmeticOverflow.hpp"
#include "temporal_rs/DisplayCalendar.hpp"
#include "temporal_rs/PartialDate.hpp"
#include "temporal_rs/PlainDate.hpp"
#include "temporal_rs/PlainMonthDay.hpp"

// ============================================================================
// Temporal Proposal -- Temporal.PlainMonthDay Objects (Sections 10.1-10.5)
// @spec https://tc39.es/proposal-temporal/#sec-temporal-plainmonthday-objects
//
// Temporal.PlainMonthDay represents a recurring month-day combination
// (e.g. December 25th), independent of any particular year.
//
// DEVIATION: The spec uses [[ISODate]] and [[Calendar]] internal slots.
// Rift delegates to temporal_rs (Rust FFI) and stores internal data in a
// static registry (PlainMonthDayRegistry) mapping JSObject* ->
// unique_ptr<PlainMonthDay>.
// ============================================================================

namespace rift::builtins {

using rift::core::extractThisObject;

// ============================================================================
// PlainMonthDayRegistry
// NON-STANDARD: Static registry for PlainMonthDay internal data.
// The spec stores data in [[ISODate]] and [[Calendar]] internal slots.
// Rift uses a global unordered_map<JSObject*, unique_ptr<PlainMonthDay>>.
// ============================================================================

std::unordered_map<JSObject*, std::unique_ptr<temporal_rs::PlainMonthDay>>
    PlainMonthDayRegistry::registry_;

void PlainMonthDayRegistry::store(JSObject* obj, std::unique_ptr<temporal_rs::PlainMonthDay> data) {
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

// NON-STANDARD: Internal helper to extract PlainMonthDay data from the receiver.
static temporal_rs::PlainMonthDay* getPlainMonthDayData(const CallContext& ctx) {
    auto* obj = extractThisObject(ctx);
    if(obj) {
        return PlainMonthDayRegistry::get(obj);
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

// NON-STANDARD: Parses a PlainMonthDay from a JS value.
// Loosely corresponds to ToTemporalMonthDay (10.5.3).
// @spec https://tc39.es/proposal-temporal/#sec-temporal-totemporalmonthday
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

        if(!mo.isUndefined())
            partial.month = static_cast<uint8_t>(mo.toNumber());
        if(!d.isUndefined())
            partial.day = static_cast<uint8_t>(d.toNumber());
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

// NON-STANDARD: Wraps a temporal_rs::PlainMonthDay in a JS object with prototype chain.
// Corresponds to CreateTemporalMonthDay in the spec.
// @spec https://tc39.es/proposal-temporal/#sec-temporal-createtemporalmonthday
Value TemporalPlainMonthDay::wrapPlainMonthDay(std::unique_ptr<temporal_rs::PlainMonthDay> md) {
    auto* proto = getGlobalPrototype();
    auto* js_obj = getObjectFactory()->createJSObject(proto);
    rift::memory::GCProtector protect(js_obj, getObjectFactory()->getObjectManager());

    PlainMonthDayRegistry::store(js_obj, std::move(md));

    return Value(js_obj);
}

// 10.2 Properties of the Temporal.PlainMonthDay Constructor
// @spec https://tc39.es/proposal-temporal/#sec-properties-of-temporal-plainmonthday-constructor
void TemporalPlainMonthDay::setupStaticMethods(JSObject* constructor,
                                               rift::memory::ObjectFactory* factory) {
    RIFT_STATIC_METHOD(constructor, "from", TemporalPlainMonthDay::from);
}

// 10.3 Properties of the Temporal.PlainMonthDay Prototype Object
// @spec
// https://tc39.es/proposal-temporal/#sec-properties-of-temporal-plainmonthday-prototype-object
void TemporalPlainMonthDay::setupPrototypeMethods(JSObject* prototype,
                                                  rift::memory::ObjectFactory* factory) {
    // Getters
    RIFT_GETTER(prototype, "day", TemporalPlainMonthDay::day);
    RIFT_GETTER(prototype, "monthCode", TemporalPlainMonthDay::monthCode);
    RIFT_GETTER(prototype, "calendarId", TemporalPlainMonthDay::calendarId);

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

// 10.1.1 Temporal.PlainMonthDay ( isoMonth, isoDay [ , calendar [ , referenceISOYear ] ] )
// @spec https://tc39.es/proposal-temporal/#sec-temporal.plainmonthday
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

// 10.2.2 Temporal.PlainMonthDay.from ( item [ , options ] )
// @spec https://tc39.es/proposal-temporal/#sec-temporal.plainmonthday.from
Value TemporalPlainMonthDay::from(const CallContext& ctx, const std::vector<Value>& args) {
    if(args.empty()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Temporal.PlainMonthDay.from requires an argument"));
    }

    auto md = parsePlainMonthDayFromValue(args[0]);
    return wrapPlainMonthDay(std::move(md));
}

// 10.3.5 get Temporal.PlainMonthDay.prototype.day
// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.plainmonthday.prototype.day
Value TemporalPlainMonthDay::day(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainMonthDayData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(Value("TypeError: day called on non-PlainMonthDay"));
    }
    return Value(static_cast<double>(data->day()));
}

// 10.3.4 get Temporal.PlainMonthDay.prototype.monthCode
// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.plainmonthday.prototype.monthcode
Value TemporalPlainMonthDay::monthCode(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainMonthDayData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: monthCode called on non-PlainMonthDay"));
    }
    return Value(data->month_code());
}

// 10.3.3 get Temporal.PlainMonthDay.prototype.calendarId
// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.plainmonthday.prototype.calendarid
Value TemporalPlainMonthDay::calendarId(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainMonthDayData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: calendarId called on non-PlainMonthDay"));
    }
    return Value(std::string(data->calendar().identifier()));
}

// 10.3.6 Temporal.PlainMonthDay.prototype.with ( temporalMonthDayLike [ , options ] )
// @spec https://tc39.es/proposal-temporal/#sec-temporal.plainmonthday.prototype.with
Value TemporalPlainMonthDay::with(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainMonthDayData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(Value("TypeError: with called on non-PlainMonthDay"));
    }

    if(args.empty() || (!args[0].isObject() && !args[0].isFunction())) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Temporal.PlainMonthDay.prototype.with requires an object argument"));
    }

    auto* obj = args[0].getObject();
    temporal_rs::PartialDate partial{};

    Value mc = obj->getProperty("monthCode");
    Value d = obj->getProperty("day");

    if(!d.isUndefined())
        partial.day = static_cast<uint8_t>(d.toNumber());

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

// 10.3.7 Temporal.PlainMonthDay.prototype.equals ( other )
// @spec https://tc39.es/proposal-temporal/#sec-temporal.plainmonthday.prototype.equals
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

// 10.3.8 Temporal.PlainMonthDay.prototype.toPlainDate ( item )
// @spec https://tc39.es/proposal-temporal/#sec-temporal.plainmonthday.prototype.toplaindate
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

// 10.3.9 Temporal.PlainMonthDay.prototype.toString ( [ options ] )
// @spec https://tc39.es/proposal-temporal/#sec-temporal.plainmonthday.prototype.tostring
Value TemporalPlainMonthDay::toString(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getPlainMonthDayData(ctx);
    if(!data) {
        throw rift::core::JavaScriptException(
            Value("TypeError: toString called on non-PlainMonthDay"));
    }

    return Value(data->to_ixdtf_string(temporal_rs::DisplayCalendar::Auto));
}

// 10.3.10 Temporal.PlainMonthDay.prototype.toJSON ()
// @spec https://tc39.es/proposal-temporal/#sec-temporal.plainmonthday.prototype.tojson
Value TemporalPlainMonthDay::toJSON(const CallContext& ctx, const std::vector<Value>& args) {
    return toString(ctx, args);
}

// 10.3.11 Temporal.PlainMonthDay.prototype.valueOf ()
// @spec https://tc39.es/proposal-temporal/#sec-temporal.plainmonthday.prototype.valueof
// Always throws TypeError — Temporal types are not convertible to primitives.
Value TemporalPlainMonthDay::valueOf(const CallContext& ctx, const std::vector<Value>& args) {
    throw rift::core::JavaScriptException(
        Value("TypeError: Cannot convert a Temporal.PlainMonthDay to a primitive value"));
}

JSObject* TemporalPlainMonthDay::getGlobalPrototype() {
    return rift::core::BuiltinManager::getPlainMonthDayPrototype();
}

}  // namespace rift::builtins
