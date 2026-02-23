#pragma once

#include <memory>
#include <unordered_map>

#include "../../memory/object_factory.h"
#include "../builtin_base.h"
#include "rift/interpreter/call_context.h"
#include "rift/types/object.h"
#include "rift/types/value.h"

// Forward declare temporal_rs types
namespace temporal_rs {
class PlainYearMonth;
}

namespace rift::builtins {

using namespace rift::runtime;
using rift::core::CallContext;

/// NON-STANDARD: Registry mapping JSObject* to temporal_rs::PlainYearMonth ownership.
class PlainYearMonthRegistry {
  private:
    static std::unordered_map<JSObject*, std::unique_ptr<temporal_rs::PlainYearMonth>> registry_;

  public:
    static void store(JSObject* obj, std::unique_ptr<temporal_rs::PlainYearMonth> data);
    static temporal_rs::PlainYearMonth* get(JSObject* obj);
    static void remove(JSObject* obj);
    static void clear();
};

/// 9 Temporal.PlainYearMonth Objects
/// @spec https://tc39.es/proposal-temporal/#sec-temporal-plainyearmonth-objects
class TemporalPlainYearMonth : public BuiltinBase<TemporalPlainYearMonth> {
  public:
    static constexpr const char* builtinName = "PlainYearMonth";
    static constexpr int builtinLength = 2;

    /// 9.1.1 Temporal.PlainYearMonth ( isoYear, isoMonth [ , calendar [ , referenceISODay ] ] )
    /// @spec https://tc39.es/proposal-temporal/#sec-temporal.plainyearmonth
    static Value constructor(const CallContext& ctx, const std::vector<Value>& args);

    /// 9.2 Properties of the Temporal.PlainYearMonth Constructor
    /// @spec
    /// https://tc39.es/proposal-temporal/#sec-properties-of-the-temporal-plainyearmonth-constructor
    static void setupStaticMethods(JSObject* constructor, rift::memory::ObjectFactory* factory);

    /// 9.3 Properties of the Temporal.PlainYearMonth Prototype Object
    /// @spec
    /// https://tc39.es/proposal-temporal/#sec-properties-of-the-temporal-plainyearmonth-prototype-object
    static void setupPrototypeMethods(JSObject* prototype, rift::memory::ObjectFactory* factory);

    /// 9.2.2 Temporal.PlainYearMonth.from ( item [ , options ] )
    /// @spec https://tc39.es/proposal-temporal/#sec-temporal.plainyearmonth.from
    static Value from(const CallContext& ctx, const std::vector<Value>& args);

    /// 9.2.3 Temporal.PlainYearMonth.compare ( one, two )
    /// @spec https://tc39.es/proposal-temporal/#sec-temporal.plainyearmonth.compare
    static Value compare(const CallContext& ctx, const std::vector<Value>& args);

    /// 9.3.4 get Temporal.PlainYearMonth.prototype.year
    /// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.plainyearmonth.prototype.year
    static Value year(const CallContext& ctx, const std::vector<Value>& args);

    /// 9.3.5 get Temporal.PlainYearMonth.prototype.month
    /// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.plainyearmonth.prototype.month
    static Value month(const CallContext& ctx, const std::vector<Value>& args);

    /// 9.3.6 get Temporal.PlainYearMonth.prototype.monthCode
    /// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.plainyearmonth.prototype.monthcode
    static Value monthCode(const CallContext& ctx, const std::vector<Value>& args);

    /// 9.3.7 get Temporal.PlainYearMonth.prototype.daysInMonth
    /// @spec
    /// https://tc39.es/proposal-temporal/#sec-get-temporal.plainyearmonth.prototype.daysinmonth
    static Value daysInMonth(const CallContext& ctx, const std::vector<Value>& args);

    /// 9.3.8 get Temporal.PlainYearMonth.prototype.daysInYear
    /// @spec
    /// https://tc39.es/proposal-temporal/#sec-get-temporal.plainyearmonth.prototype.daysinyear
    static Value daysInYear(const CallContext& ctx, const std::vector<Value>& args);

    /// 9.3.9 get Temporal.PlainYearMonth.prototype.monthsInYear
    /// @spec
    /// https://tc39.es/proposal-temporal/#sec-get-temporal.plainyearmonth.prototype.monthsinyear
    static Value monthsInYear(const CallContext& ctx, const std::vector<Value>& args);

    /// 9.3.10 get Temporal.PlainYearMonth.prototype.inLeapYear
    /// @spec
    /// https://tc39.es/proposal-temporal/#sec-get-temporal.plainyearmonth.prototype.inleapyear
    static Value inLeapYear(const CallContext& ctx, const std::vector<Value>& args);

    /// 9.3.3 get Temporal.PlainYearMonth.prototype.calendarId
    /// @spec
    /// https://tc39.es/proposal-temporal/#sec-get-temporal.plainyearmonth.prototype.calendarid
    static Value calendarId(const CallContext& ctx, const std::vector<Value>& args);

    /// 9.3.11 Temporal.PlainYearMonth.prototype.with ( temporalYearMonthLike [ , options ] )
    /// @spec https://tc39.es/proposal-temporal/#sec-temporal.plainyearmonth.prototype.with
    static Value with(const CallContext& ctx, const std::vector<Value>& args);

    /// 9.3.12 Temporal.PlainYearMonth.prototype.add ( temporalDurationLike [ , options ] )
    /// @spec https://tc39.es/proposal-temporal/#sec-temporal.plainyearmonth.prototype.add
    static Value add(const CallContext& ctx, const std::vector<Value>& args);

    /// 9.3.13 Temporal.PlainYearMonth.prototype.subtract ( temporalDurationLike [ , options ] )
    /// @spec https://tc39.es/proposal-temporal/#sec-temporal.plainyearmonth.prototype.subtract
    static Value subtract(const CallContext& ctx, const std::vector<Value>& args);

    /// 9.3.14 Temporal.PlainYearMonth.prototype.until ( other [ , options ] )
    /// @spec https://tc39.es/proposal-temporal/#sec-temporal.plainyearmonth.prototype.until
    static Value until(const CallContext& ctx, const std::vector<Value>& args);

    /// 9.3.15 Temporal.PlainYearMonth.prototype.since ( other [ , options ] )
    /// @spec https://tc39.es/proposal-temporal/#sec-temporal.plainyearmonth.prototype.since
    static Value since(const CallContext& ctx, const std::vector<Value>& args);

    /// 9.3.16 Temporal.PlainYearMonth.prototype.equals ( other )
    /// @spec https://tc39.es/proposal-temporal/#sec-temporal.plainyearmonth.prototype.equals
    static Value equals(const CallContext& ctx, const std::vector<Value>& args);

    /// 9.3.18 Temporal.PlainYearMonth.prototype.toPlainDate ( item )
    /// @spec https://tc39.es/proposal-temporal/#sec-temporal.plainyearmonth.prototype.toplaindate
    static Value toPlainDate(const CallContext& ctx, const std::vector<Value>& args);

    /// 9.3.17 Temporal.PlainYearMonth.prototype.toString ( [ options ] )
    /// @spec https://tc39.es/proposal-temporal/#sec-temporal.plainyearmonth.prototype.tostring
    static Value toString(const CallContext& ctx, const std::vector<Value>& args);

    /// 9.3.19 Temporal.PlainYearMonth.prototype.toJSON ( )
    /// @spec https://tc39.es/proposal-temporal/#sec-temporal.plainyearmonth.prototype.tojson
    static Value toJSON(const CallContext& ctx, const std::vector<Value>& args);

    /// 9.3.20 Temporal.PlainYearMonth.prototype.valueOf ( )
    /// @spec https://tc39.es/proposal-temporal/#sec-temporal.plainyearmonth.prototype.valueof
    static Value valueOf(const CallContext& ctx, const std::vector<Value>& args);

    /// 9.3.21 Temporal.PlainYearMonth.prototype.toLocaleString ( [ locales [ , options ] ] )
    /// @spec
    /// https://tc39.es/proposal-temporal/#sec-temporal.plainyearmonth.prototype.tolocalestring
    static Value toLocaleString(const CallContext& ctx, const std::vector<Value>& args);

    /// NON-STANDARD: Helper to create a JS PlainYearMonth object from a
    /// temporal_rs::PlainYearMonth.
    static Value wrapPlainYearMonth(std::unique_ptr<temporal_rs::PlainYearMonth> ym);

  private:
    static JSObject* getGlobalPrototype();
};

}  // namespace rift::builtins
