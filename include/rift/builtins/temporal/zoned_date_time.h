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
class ZonedDateTime;
}

namespace rift::builtins {

using namespace rift::runtime;
using rift::core::CallContext;

/// NON-STANDARD: Registry mapping JSObject* to temporal_rs::ZonedDateTime ownership.
class ZonedDateTimeRegistry {
  private:
    static std::unordered_map<JSObject*, std::unique_ptr<temporal_rs::ZonedDateTime>> registry_;

  public:
    static void store(JSObject* obj, std::unique_ptr<temporal_rs::ZonedDateTime> data);
    static temporal_rs::ZonedDateTime* get(JSObject* obj);
    static void remove(JSObject* obj);
    static void clear();
};

/// 6 Temporal.ZonedDateTime Objects
/// @spec https://tc39.es/proposal-temporal/#sec-temporal-zoneddatetime-objects
class TemporalZonedDateTime : public BuiltinBase<TemporalZonedDateTime> {
  public:
    static constexpr const char* builtinName = "ZonedDateTime";
    static constexpr int builtinLength = 2;

    /// 6.1.1 Temporal.ZonedDateTime ( epochNanoseconds, timeZoneLike [ , calendarLike ] )
    /// @spec https://tc39.es/proposal-temporal/#sec-temporal.zoneddatetime
    static Value constructor(const CallContext& ctx, const std::vector<Value>& args);

    /// 6.2 Properties of the Temporal.ZonedDateTime Constructor
    /// @spec
    /// https://tc39.es/proposal-temporal/#sec-properties-of-the-temporal-zoneddatetime-constructor
    static void setupStaticMethods(JSObject* constructor, rift::memory::ObjectFactory* factory);

    /// 6.3 Properties of the Temporal.ZonedDateTime Prototype Object
    /// @spec
    /// https://tc39.es/proposal-temporal/#sec-properties-of-the-temporal-zoneddatetime-prototype-object
    static void setupPrototypeMethods(JSObject* prototype, rift::memory::ObjectFactory* factory);

    /// 6.2.2 Temporal.ZonedDateTime.from ( item [ , options ] )
    /// @spec https://tc39.es/proposal-temporal/#sec-temporal.zoneddatetime.from
    static Value from(const CallContext& ctx, const std::vector<Value>& args);

    /// 6.2.3 Temporal.ZonedDateTime.compare ( one, two )
    /// @spec https://tc39.es/proposal-temporal/#sec-temporal.zoneddatetime.compare
    static Value compare(const CallContext& ctx, const std::vector<Value>& args);

    /// 6.3.6 get Temporal.ZonedDateTime.prototype.year
    /// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.zoneddatetime.prototype.year
    static Value year(const CallContext& ctx, const std::vector<Value>& args);

    /// 6.3.7 get Temporal.ZonedDateTime.prototype.month
    /// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.zoneddatetime.prototype.month
    static Value month(const CallContext& ctx, const std::vector<Value>& args);

    /// 6.3.8 get Temporal.ZonedDateTime.prototype.monthCode
    /// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.zoneddatetime.prototype.monthcode
    static Value monthCode(const CallContext& ctx, const std::vector<Value>& args);

    /// 6.3.9 get Temporal.ZonedDateTime.prototype.day
    /// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.zoneddatetime.prototype.day
    static Value day(const CallContext& ctx, const std::vector<Value>& args);

    /// 6.3.10 get Temporal.ZonedDateTime.prototype.dayOfWeek
    /// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.zoneddatetime.prototype.dayofweek
    static Value dayOfWeek(const CallContext& ctx, const std::vector<Value>& args);

    /// 6.3.11 get Temporal.ZonedDateTime.prototype.dayOfYear
    /// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.zoneddatetime.prototype.dayofyear
    static Value dayOfYear(const CallContext& ctx, const std::vector<Value>& args);

    /// 6.3.12 get Temporal.ZonedDateTime.prototype.weekOfYear
    /// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.zoneddatetime.prototype.weekofyear
    static Value weekOfYear(const CallContext& ctx, const std::vector<Value>& args);

    /// 6.3.15 get Temporal.ZonedDateTime.prototype.daysInMonth
    /// @spec
    /// https://tc39.es/proposal-temporal/#sec-get-temporal.zoneddatetime.prototype.daysinmonth
    static Value daysInMonth(const CallContext& ctx, const std::vector<Value>& args);

    /// 6.3.16 get Temporal.ZonedDateTime.prototype.daysInYear
    /// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.zoneddatetime.prototype.daysinyear
    static Value daysInYear(const CallContext& ctx, const std::vector<Value>& args);

    /// 6.3.17 get Temporal.ZonedDateTime.prototype.monthsInYear
    /// @spec
    /// https://tc39.es/proposal-temporal/#sec-get-temporal.zoneddatetime.prototype.monthsinyear
    static Value monthsInYear(const CallContext& ctx, const std::vector<Value>& args);

    /// 6.3.18 get Temporal.ZonedDateTime.prototype.inLeapYear
    /// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.zoneddatetime.prototype.inleapyear
    static Value inLeapYear(const CallContext& ctx, const std::vector<Value>& args);

    /// 6.3.5 get Temporal.ZonedDateTime.prototype.calendarId
    /// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.zoneddatetime.prototype.calendarid
    static Value calendarId(const CallContext& ctx, const std::vector<Value>& args);

    /// 6.3.15 get Temporal.ZonedDateTime.prototype.hour
    /// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.zoneddatetime.prototype.hour
    static Value hour(const CallContext& ctx, const std::vector<Value>& args);

    /// 6.3.16 get Temporal.ZonedDateTime.prototype.minute
    /// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.zoneddatetime.prototype.minute
    static Value minute(const CallContext& ctx, const std::vector<Value>& args);

    /// 6.3.17 get Temporal.ZonedDateTime.prototype.second
    /// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.zoneddatetime.prototype.second
    static Value second(const CallContext& ctx, const std::vector<Value>& args);

    /// 6.3.18 get Temporal.ZonedDateTime.prototype.millisecond
    /// @spec
    /// https://tc39.es/proposal-temporal/#sec-get-temporal.zoneddatetime.prototype.millisecond
    static Value millisecond(const CallContext& ctx, const std::vector<Value>& args);

    /// 6.3.19 get Temporal.ZonedDateTime.prototype.microsecond
    /// @spec
    /// https://tc39.es/proposal-temporal/#sec-get-temporal.zoneddatetime.prototype.microsecond
    static Value microsecond(const CallContext& ctx, const std::vector<Value>& args);

    /// 6.3.20 get Temporal.ZonedDateTime.prototype.nanosecond
    /// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.zoneddatetime.prototype.nanosecond
    static Value nanosecond(const CallContext& ctx, const std::vector<Value>& args);

    /// 6.3.4 get Temporal.ZonedDateTime.prototype.timeZoneId
    /// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.zoneddatetime.prototype.timezoneid
    static Value timeZoneId(const CallContext& ctx, const std::vector<Value>& args);

    /// 6.3.23 get Temporal.ZonedDateTime.prototype.offset
    /// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.zoneddatetime.prototype.offset
    static Value offset(const CallContext& ctx, const std::vector<Value>& args);

    /// 6.3.22 get Temporal.ZonedDateTime.prototype.offsetNanoseconds
    /// @spec
    /// https://tc39.es/proposal-temporal/#sec-get-temporal.zoneddatetime.prototype.offsetnanoseconds
    static Value offsetNanoseconds(const CallContext& ctx, const std::vector<Value>& args);

    /// 6.3.20 get Temporal.ZonedDateTime.prototype.epochMilliseconds
    /// @spec
    /// https://tc39.es/proposal-temporal/#sec-get-temporal.zoneddatetime.prototype.epochmilliseconds
    static Value epochMilliseconds(const CallContext& ctx, const std::vector<Value>& args);

    /// 6.3.21 get Temporal.ZonedDateTime.prototype.epochNanoseconds
    /// @spec
    /// https://tc39.es/proposal-temporal/#sec-get-temporal.zoneddatetime.prototype.epochnanoseconds
    static Value epochNanoseconds(const CallContext& ctx, const std::vector<Value>& args);

    /// 6.3.24 Temporal.ZonedDateTime.prototype.with ( temporalZonedDateTimeLike [ , options ] )
    /// @spec https://tc39.es/proposal-temporal/#sec-temporal.zoneddatetime.prototype.with
    static Value with(const CallContext& ctx, const std::vector<Value>& args);

    /// 6.3.26 Temporal.ZonedDateTime.prototype.withTimeZone ( timeZoneLike )
    /// @spec https://tc39.es/proposal-temporal/#sec-temporal.zoneddatetime.prototype.withtimezone
    static Value withTimeZone(const CallContext& ctx, const std::vector<Value>& args);

    /// 6.3.25 Temporal.ZonedDateTime.prototype.withCalendar ( calendarLike )
    /// @spec https://tc39.es/proposal-temporal/#sec-temporal.zoneddatetime.prototype.withcalendar
    static Value withCalendar(const CallContext& ctx, const std::vector<Value>& args);

    /// 6.3.27 Temporal.ZonedDateTime.prototype.withPlainTime ( [ plainTimeLike ] )
    /// @spec https://tc39.es/proposal-temporal/#sec-temporal.zoneddatetime.prototype.withplaintime
    static Value withPlainTime(const CallContext& ctx, const std::vector<Value>& args);

    /// 6.3.28 Temporal.ZonedDateTime.prototype.add ( temporalDurationLike [ , options ] )
    /// @spec https://tc39.es/proposal-temporal/#sec-temporal.zoneddatetime.prototype.add
    static Value add(const CallContext& ctx, const std::vector<Value>& args);

    /// 6.3.29 Temporal.ZonedDateTime.prototype.subtract ( temporalDurationLike [ , options ] )
    /// @spec https://tc39.es/proposal-temporal/#sec-temporal.zoneddatetime.prototype.subtract
    static Value subtract(const CallContext& ctx, const std::vector<Value>& args);

    /// 6.3.30 Temporal.ZonedDateTime.prototype.until ( other [ , options ] )
    /// @spec https://tc39.es/proposal-temporal/#sec-temporal.zoneddatetime.prototype.until
    static Value until(const CallContext& ctx, const std::vector<Value>& args);

    /// 6.3.31 Temporal.ZonedDateTime.prototype.since ( other [ , options ] )
    /// @spec https://tc39.es/proposal-temporal/#sec-temporal.zoneddatetime.prototype.since
    static Value since(const CallContext& ctx, const std::vector<Value>& args);

    /// 6.3.33 Temporal.ZonedDateTime.prototype.equals ( other )
    /// @spec https://tc39.es/proposal-temporal/#sec-temporal.zoneddatetime.prototype.equals
    static Value equals(const CallContext& ctx, const std::vector<Value>& args);

    /// 6.3.36 Temporal.ZonedDateTime.prototype.toInstant ( )
    /// @spec https://tc39.es/proposal-temporal/#sec-temporal.zoneddatetime.prototype.toinstant
    static Value toInstant(const CallContext& ctx, const std::vector<Value>& args);

    /// 6.3.37 Temporal.ZonedDateTime.prototype.toPlainDate ( )
    /// @spec https://tc39.es/proposal-temporal/#sec-temporal.zoneddatetime.prototype.toplaindate
    static Value toPlainDate(const CallContext& ctx, const std::vector<Value>& args);

    /// 6.3.38 Temporal.ZonedDateTime.prototype.toPlainTime ( )
    /// @spec https://tc39.es/proposal-temporal/#sec-temporal.zoneddatetime.prototype.toplaintime
    static Value toPlainTime(const CallContext& ctx, const std::vector<Value>& args);

    /// 6.3.39 Temporal.ZonedDateTime.prototype.toPlainDateTime ( )
    /// @spec
    /// https://tc39.es/proposal-temporal/#sec-temporal.zoneddatetime.prototype.toplaindatetime
    static Value toPlainDateTime(const CallContext& ctx, const std::vector<Value>& args);

    /// 6.3.34 Temporal.ZonedDateTime.prototype.startOfDay ( )
    /// @spec https://tc39.es/proposal-temporal/#sec-temporal.zoneddatetime.prototype.startofday
    static Value startOfDay(const CallContext& ctx, const std::vector<Value>& args);

    /// 6.3.19 get Temporal.ZonedDateTime.prototype.hoursInDay
    /// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.zoneddatetime.prototype.hoursinday
    static Value hoursInDay(const CallContext& ctx, const std::vector<Value>& args);

    /// 6.3.35 Temporal.ZonedDateTime.prototype.toString ( [ options ] )
    /// @spec https://tc39.es/proposal-temporal/#sec-temporal.zoneddatetime.prototype.tostring
    static Value toString(const CallContext& ctx, const std::vector<Value>& args);

    /// 6.3.40 Temporal.ZonedDateTime.prototype.toJSON ( )
    /// @spec https://tc39.es/proposal-temporal/#sec-temporal.zoneddatetime.prototype.tojson
    static Value toJSON(const CallContext& ctx, const std::vector<Value>& args);

    /// 6.3.41 Temporal.ZonedDateTime.prototype.valueOf ( )
    /// @spec https://tc39.es/proposal-temporal/#sec-temporal.zoneddatetime.prototype.valueof
    static Value valueOf(const CallContext& ctx, const std::vector<Value>& args);

    /// 6.3.32 Temporal.ZonedDateTime.prototype.round ( roundTo )
    /// @spec https://tc39.es/proposal-temporal/#sec-temporal.zoneddatetime.prototype.round
    static Value round(const CallContext& ctx, const std::vector<Value>& args);

    /// 6.3.35 Temporal.ZonedDateTime.prototype.getTimeZoneTransition ( direction )
    /// @spec
    /// https://tc39.es/proposal-temporal/#sec-temporal.zoneddatetime.prototype.gettimezonetransition
    static Value getTimeZoneTransition(const CallContext& ctx, const std::vector<Value>& args);

    /// 6.3.?? get Temporal.ZonedDateTime.prototype.yearOfWeek
    /// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.zoneddatetime.prototype.yearofweek
    static Value yearOfWeek(const CallContext& ctx, const std::vector<Value>& args);

    /// 6.3.?? get Temporal.ZonedDateTime.prototype.era
    /// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.zoneddatetime.prototype.era
    static Value era(const CallContext& ctx, const std::vector<Value>& args);

    /// 6.3.?? get Temporal.ZonedDateTime.prototype.eraYear
    /// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.zoneddatetime.prototype.erayear
    static Value eraYear(const CallContext& ctx, const std::vector<Value>& args);

    /// 6.3.?? Temporal.ZonedDateTime.prototype.toPlainYearMonth ( )
    /// @spec
    /// https://tc39.es/proposal-temporal/#sec-temporal.zoneddatetime.prototype.toplainyearmonth
    static Value toPlainYearMonth(const CallContext& ctx, const std::vector<Value>& args);

    /// 6.3.?? Temporal.ZonedDateTime.prototype.toPlainMonthDay ( )
    /// @spec
    /// https://tc39.es/proposal-temporal/#sec-temporal.zoneddatetime.prototype.toplainmonthday
    static Value toPlainMonthDay(const CallContext& ctx, const std::vector<Value>& args);

    /// 6.3.42 Temporal.ZonedDateTime.prototype.toLocaleString ( [ locales [ , options ] ] )
    /// @spec https://tc39.es/proposal-temporal/#sec-temporal.zoneddatetime.prototype.tolocalestring
    static Value toLocaleString(const CallContext& ctx, const std::vector<Value>& args);

    /// NON-STANDARD: Helper to create a JS ZonedDateTime object from a temporal_rs::ZonedDateTime.
    static Value wrapZonedDateTime(std::unique_ptr<temporal_rs::ZonedDateTime> zdt);

  private:
    static JSObject* getGlobalPrototype();
};

}  // namespace rift::builtins
