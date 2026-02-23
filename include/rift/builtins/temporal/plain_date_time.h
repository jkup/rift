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
class PlainDateTime;
}

namespace rift::builtins {

using namespace rift::runtime;
using rift::core::CallContext;

/// NON-STANDARD: Registry mapping JSObject* to temporal_rs::PlainDateTime ownership.
class PlainDateTimeRegistry {
  private:
    static std::unordered_map<JSObject*, std::unique_ptr<temporal_rs::PlainDateTime>> registry_;

  public:
    static void store(JSObject* obj, std::unique_ptr<temporal_rs::PlainDateTime> data);
    static temporal_rs::PlainDateTime* get(JSObject* obj);
    static void remove(JSObject* obj);
    static void clear();
};

/// 5 Temporal.PlainDateTime Objects
/// @spec https://tc39.es/proposal-temporal/#sec-temporal-plaindatetime-objects
class TemporalPlainDateTime : public BuiltinBase<TemporalPlainDateTime> {
  public:
    static constexpr const char* builtinName = "PlainDateTime";
    static constexpr int builtinLength = 3;

    /// 5.1.1 Temporal.PlainDateTime ( isoYear, isoMonth, isoDay [ , hour [ , minute [ , second [ ,
    /// millisecond [ , microsecond [ , nanosecond [ , calendar ] ] ] ] ] ] ] )
    /// @spec https://tc39.es/proposal-temporal/#sec-temporal.plaindatetime
    static Value constructor(const CallContext& ctx, const std::vector<Value>& args);

    /// 5.2 Properties of the Temporal.PlainDateTime Constructor
    /// @spec
    /// https://tc39.es/proposal-temporal/#sec-properties-of-the-temporal-plaindatetime-constructor
    static void setupStaticMethods(JSObject* constructor, rift::memory::ObjectFactory* factory);

    /// 5.3 Properties of the Temporal.PlainDateTime Prototype Object
    /// @spec
    /// https://tc39.es/proposal-temporal/#sec-properties-of-the-temporal-plaindatetime-prototype-object
    static void setupPrototypeMethods(JSObject* prototype, rift::memory::ObjectFactory* factory);

    /// 5.2.2 Temporal.PlainDateTime.from ( item [ , options ] )
    /// @spec https://tc39.es/proposal-temporal/#sec-temporal.plaindatetime.from
    static Value from(const CallContext& ctx, const std::vector<Value>& args);

    /// 5.2.3 Temporal.PlainDateTime.compare ( one, two )
    /// @spec https://tc39.es/proposal-temporal/#sec-temporal.plaindatetime.compare
    static Value compare(const CallContext& ctx, const std::vector<Value>& args);

    /// 5.3.4 get Temporal.PlainDateTime.prototype.year
    /// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.plaindatetime.prototype.year
    static Value year(const CallContext& ctx, const std::vector<Value>& args);

    /// 5.3.5 get Temporal.PlainDateTime.prototype.month
    /// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.plaindatetime.prototype.month
    static Value month(const CallContext& ctx, const std::vector<Value>& args);

    /// 5.3.6 get Temporal.PlainDateTime.prototype.monthCode
    /// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.plaindatetime.prototype.monthcode
    static Value monthCode(const CallContext& ctx, const std::vector<Value>& args);

    /// 5.3.7 get Temporal.PlainDateTime.prototype.day
    /// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.plaindatetime.prototype.day
    static Value day(const CallContext& ctx, const std::vector<Value>& args);

    /// 5.3.8 get Temporal.PlainDateTime.prototype.dayOfWeek
    /// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.plaindatetime.prototype.dayofweek
    static Value dayOfWeek(const CallContext& ctx, const std::vector<Value>& args);

    /// 5.3.9 get Temporal.PlainDateTime.prototype.dayOfYear
    /// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.plaindatetime.prototype.dayofyear
    static Value dayOfYear(const CallContext& ctx, const std::vector<Value>& args);

    /// 5.3.10 get Temporal.PlainDateTime.prototype.weekOfYear
    /// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.plaindatetime.prototype.weekofyear
    static Value weekOfYear(const CallContext& ctx, const std::vector<Value>& args);

    /// 5.3.12 get Temporal.PlainDateTime.prototype.daysInMonth
    /// @spec
    /// https://tc39.es/proposal-temporal/#sec-get-temporal.plaindatetime.prototype.daysinmonth
    static Value daysInMonth(const CallContext& ctx, const std::vector<Value>& args);

    /// 5.3.13 get Temporal.PlainDateTime.prototype.daysInYear
    /// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.plaindatetime.prototype.daysinyear
    static Value daysInYear(const CallContext& ctx, const std::vector<Value>& args);

    /// 5.3.14 get Temporal.PlainDateTime.prototype.monthsInYear
    /// @spec
    /// https://tc39.es/proposal-temporal/#sec-get-temporal.plaindatetime.prototype.monthsinyear
    static Value monthsInYear(const CallContext& ctx, const std::vector<Value>& args);

    /// 5.3.15 get Temporal.PlainDateTime.prototype.inLeapYear
    /// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.plaindatetime.prototype.inleapyear
    static Value inLeapYear(const CallContext& ctx, const std::vector<Value>& args);

    /// 5.3.3 get Temporal.PlainDateTime.prototype.calendarId
    /// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.plaindatetime.prototype.calendarid
    static Value calendarId(const CallContext& ctx, const std::vector<Value>& args);

    /// 5.3.16 get Temporal.PlainDateTime.prototype.hour
    /// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.plaindatetime.prototype.hour
    static Value hour(const CallContext& ctx, const std::vector<Value>& args);

    /// 5.3.17 get Temporal.PlainDateTime.prototype.minute
    /// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.plaindatetime.prototype.minute
    static Value minute(const CallContext& ctx, const std::vector<Value>& args);

    /// 5.3.18 get Temporal.PlainDateTime.prototype.second
    /// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.plaindatetime.prototype.second
    static Value second(const CallContext& ctx, const std::vector<Value>& args);

    /// 5.3.19 get Temporal.PlainDateTime.prototype.millisecond
    /// @spec
    /// https://tc39.es/proposal-temporal/#sec-get-temporal.plaindatetime.prototype.millisecond
    static Value millisecond(const CallContext& ctx, const std::vector<Value>& args);

    /// 5.3.20 get Temporal.PlainDateTime.prototype.microsecond
    /// @spec
    /// https://tc39.es/proposal-temporal/#sec-get-temporal.plaindatetime.prototype.microsecond
    static Value microsecond(const CallContext& ctx, const std::vector<Value>& args);

    /// 5.3.21 get Temporal.PlainDateTime.prototype.nanosecond
    /// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.plaindatetime.prototype.nanosecond
    static Value nanosecond(const CallContext& ctx, const std::vector<Value>& args);

    /// 5.3.22 Temporal.PlainDateTime.prototype.with ( temporalDateTimeLike [ , options ] )
    /// @spec https://tc39.es/proposal-temporal/#sec-temporal.plaindatetime.prototype.with
    static Value with(const CallContext& ctx, const std::vector<Value>& args);

    /// 5.3.23 Temporal.PlainDateTime.prototype.withPlainTime ( [ plainTimeLike ] )
    /// @spec https://tc39.es/proposal-temporal/#sec-temporal.plaindatetime.prototype.withplaintime
    static Value withTime(const CallContext& ctx, const std::vector<Value>& args);

    /// 5.3.24 Temporal.PlainDateTime.prototype.add ( temporalDurationLike [ , options ] )
    /// @spec https://tc39.es/proposal-temporal/#sec-temporal.plaindatetime.prototype.add
    static Value add(const CallContext& ctx, const std::vector<Value>& args);

    /// 5.3.25 Temporal.PlainDateTime.prototype.subtract ( temporalDurationLike [ , options ] )
    /// @spec https://tc39.es/proposal-temporal/#sec-temporal.plaindatetime.prototype.subtract
    static Value subtract(const CallContext& ctx, const std::vector<Value>& args);

    /// 5.3.26 Temporal.PlainDateTime.prototype.until ( other [ , options ] )
    /// @spec https://tc39.es/proposal-temporal/#sec-temporal.plaindatetime.prototype.until
    static Value until(const CallContext& ctx, const std::vector<Value>& args);

    /// 5.3.27 Temporal.PlainDateTime.prototype.since ( other [ , options ] )
    /// @spec https://tc39.es/proposal-temporal/#sec-temporal.plaindatetime.prototype.since
    static Value since(const CallContext& ctx, const std::vector<Value>& args);

    /// 5.3.29 Temporal.PlainDateTime.prototype.equals ( other )
    /// @spec https://tc39.es/proposal-temporal/#sec-temporal.plaindatetime.prototype.equals
    static Value equals(const CallContext& ctx, const std::vector<Value>& args);

    /// 5.3.31 Temporal.PlainDateTime.prototype.toPlainDate ( )
    /// @spec https://tc39.es/proposal-temporal/#sec-temporal.plaindatetime.prototype.toplaindate
    static Value toPlainDate(const CallContext& ctx, const std::vector<Value>& args);

    /// 5.3.32 Temporal.PlainDateTime.prototype.toPlainTime ( )
    /// @spec https://tc39.es/proposal-temporal/#sec-temporal.plaindatetime.prototype.toplaintime
    static Value toPlainTime(const CallContext& ctx, const std::vector<Value>& args);

    /// 5.3.30 Temporal.PlainDateTime.prototype.toString ( [ options ] )
    /// @spec https://tc39.es/proposal-temporal/#sec-temporal.plaindatetime.prototype.tostring
    static Value toString(const CallContext& ctx, const std::vector<Value>& args);

    /// 5.3.33 Temporal.PlainDateTime.prototype.toJSON ( )
    /// @spec https://tc39.es/proposal-temporal/#sec-temporal.plaindatetime.prototype.tojson
    static Value toJSON(const CallContext& ctx, const std::vector<Value>& args);

    /// 5.3.34 Temporal.PlainDateTime.prototype.valueOf ( )
    /// @spec https://tc39.es/proposal-temporal/#sec-temporal.plaindatetime.prototype.valueof
    static Value valueOf(const CallContext& ctx, const std::vector<Value>& args);

    /// 5.3.28 Temporal.PlainDateTime.prototype.round ( roundTo )
    /// @spec https://tc39.es/proposal-temporal/#sec-temporal.plaindatetime.prototype.round
    static Value round(const CallContext& ctx, const std::vector<Value>& args);

    /// 5.3.22 Temporal.PlainDateTime.prototype.withCalendar ( calendarLike )
    /// @spec https://tc39.es/proposal-temporal/#sec-temporal.plaindatetime.prototype.withcalendar
    static Value withCalendar(const CallContext& ctx, const std::vector<Value>& args);

    /// 5.3.29 Temporal.PlainDateTime.prototype.toZonedDateTime ( timeZone [ , options ] )
    /// @spec
    /// https://tc39.es/proposal-temporal/#sec-temporal.plaindatetime.prototype.tozoneddatetime
    static Value toZonedDateTime(const CallContext& ctx, const std::vector<Value>& args);

    /// 5.3.35 Temporal.PlainDateTime.prototype.toLocaleString ( [ locales [ , options ] ] )
    /// @spec https://tc39.es/proposal-temporal/#sec-temporal.plaindatetime.prototype.tolocalestring
    static Value toLocaleString(const CallContext& ctx, const std::vector<Value>& args);

    /// NON-STANDARD: Helper to create a JS PlainDateTime object from a temporal_rs::PlainDateTime.
    static Value wrapPlainDateTime(std::unique_ptr<temporal_rs::PlainDateTime> dt);

  private:
    static JSObject* getGlobalPrototype();
};

}  // namespace rift::builtins
