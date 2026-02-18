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
class PlainDate;
}

namespace rift::builtins {

using namespace rift::runtime;
using rift::core::CallContext;

/// NON-STANDARD: Registry mapping JSObject* to temporal_rs::PlainDate ownership.
class PlainDateRegistry {
  private:
    static std::unordered_map<JSObject*, std::unique_ptr<temporal_rs::PlainDate>> registry_;

  public:
    static void store(JSObject* obj, std::unique_ptr<temporal_rs::PlainDate> data);
    static temporal_rs::PlainDate* get(JSObject* obj);
    static void remove(JSObject* obj);
    static void clear();
};

/// 3 Temporal.PlainDate Objects
/// @spec https://tc39.es/proposal-temporal/#sec-temporal-plaindate-objects
class TemporalPlainDate : public BuiltinBase<TemporalPlainDate> {
  public:
    /// 3.1.1 Temporal.PlainDate ( isoYear, isoMonth, isoDay [ , calendar ] )
    /// @spec https://tc39.es/proposal-temporal/#sec-temporal.plaindate
    static Value constructor(const CallContext& ctx, const std::vector<Value>& args);

    /// 3.2 Properties of the Temporal.PlainDate Constructor
    /// @spec https://tc39.es/proposal-temporal/#sec-properties-of-temporal-plaindate-constructor
    static void setupStaticMethods(JSObject* constructor, rift::memory::ObjectFactory* factory);

    /// 3.3 Properties of the Temporal.PlainDate Prototype Object
    /// @spec
    /// https://tc39.es/proposal-temporal/#sec-properties-of-temporal-plaindate-prototype-object
    static void setupPrototypeMethods(JSObject* prototype, rift::memory::ObjectFactory* factory);

    /// 3.2.2 Temporal.PlainDate.from ( item [ , options ] )
    /// @spec https://tc39.es/proposal-temporal/#sec-temporal.plaindate.from
    static Value from(const CallContext& ctx, const std::vector<Value>& args);

    /// 3.2.3 Temporal.PlainDate.compare ( one, two )
    /// @spec https://tc39.es/proposal-temporal/#sec-temporal.plaindate.compare
    static Value compare(const CallContext& ctx, const std::vector<Value>& args);

    /// 3.3.4 get Temporal.PlainDate.prototype.year
    /// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.plaindate.prototype.year
    static Value year(const CallContext& ctx, const std::vector<Value>& args);

    /// 3.3.5 get Temporal.PlainDate.prototype.month
    /// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.plaindate.prototype.month
    static Value month(const CallContext& ctx, const std::vector<Value>& args);

    /// 3.3.6 get Temporal.PlainDate.prototype.monthCode
    /// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.plaindate.prototype.monthcode
    static Value monthCode(const CallContext& ctx, const std::vector<Value>& args);

    /// 3.3.7 get Temporal.PlainDate.prototype.day
    /// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.plaindate.prototype.day
    static Value day(const CallContext& ctx, const std::vector<Value>& args);

    /// 3.3.8 get Temporal.PlainDate.prototype.dayOfWeek
    /// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.plaindate.prototype.dayofweek
    static Value dayOfWeek(const CallContext& ctx, const std::vector<Value>& args);

    /// 3.3.9 get Temporal.PlainDate.prototype.dayOfYear
    /// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.plaindate.prototype.dayofyear
    static Value dayOfYear(const CallContext& ctx, const std::vector<Value>& args);

    /// 3.3.10 get Temporal.PlainDate.prototype.weekOfYear
    /// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.plaindate.prototype.weekofyear
    static Value weekOfYear(const CallContext& ctx, const std::vector<Value>& args);

    /// 3.3.12 get Temporal.PlainDate.prototype.daysInMonth
    /// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.plaindate.prototype.daysinmonth
    static Value daysInMonth(const CallContext& ctx, const std::vector<Value>& args);

    /// 3.3.13 get Temporal.PlainDate.prototype.daysInYear
    /// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.plaindate.prototype.daysinyear
    static Value daysInYear(const CallContext& ctx, const std::vector<Value>& args);

    /// 3.3.14 get Temporal.PlainDate.prototype.monthsInYear
    /// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.plaindate.prototype.monthsinyear
    static Value monthsInYear(const CallContext& ctx, const std::vector<Value>& args);

    /// 3.3.15 get Temporal.PlainDate.prototype.inLeapYear
    /// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.plaindate.prototype.inleapyear
    static Value inLeapYear(const CallContext& ctx, const std::vector<Value>& args);

    /// 3.3.3 get Temporal.PlainDate.prototype.calendarId
    /// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.plaindate.prototype.calendarid
    static Value calendarId(const CallContext& ctx, const std::vector<Value>& args);

    /// 3.3.16 Temporal.PlainDate.prototype.with ( temporalDateLike [ , options ] )
    /// @spec https://tc39.es/proposal-temporal/#sec-temporal.plaindate.prototype.with
    static Value with(const CallContext& ctx, const std::vector<Value>& args);

    /// 3.3.18 Temporal.PlainDate.prototype.add ( temporalDurationLike [ , options ] )
    /// @spec https://tc39.es/proposal-temporal/#sec-temporal.plaindate.prototype.add
    static Value add(const CallContext& ctx, const std::vector<Value>& args);

    /// 3.3.19 Temporal.PlainDate.prototype.subtract ( temporalDurationLike [ , options ] )
    /// @spec https://tc39.es/proposal-temporal/#sec-temporal.plaindate.prototype.subtract
    static Value subtract(const CallContext& ctx, const std::vector<Value>& args);

    /// 3.3.20 Temporal.PlainDate.prototype.until ( other [ , options ] )
    /// @spec https://tc39.es/proposal-temporal/#sec-temporal.plaindate.prototype.until
    static Value until(const CallContext& ctx, const std::vector<Value>& args);

    /// 3.3.21 Temporal.PlainDate.prototype.since ( other [ , options ] )
    /// @spec https://tc39.es/proposal-temporal/#sec-temporal.plaindate.prototype.since
    static Value since(const CallContext& ctx, const std::vector<Value>& args);

    /// 3.3.22 Temporal.PlainDate.prototype.equals ( other )
    /// @spec https://tc39.es/proposal-temporal/#sec-temporal.plaindate.prototype.equals
    static Value equals(const CallContext& ctx, const std::vector<Value>& args);

    /// 3.3.23 Temporal.PlainDate.prototype.toPlainDateTime ( [ temporalTime ] )
    /// @spec https://tc39.es/proposal-temporal/#sec-temporal.plaindate.prototype.toplaindatetime
    static Value toPlainDateTime(const CallContext& ctx, const std::vector<Value>& args);

    /// 3.3.24 Temporal.PlainDate.prototype.toZonedDateTime ( item )
    /// @spec https://tc39.es/proposal-temporal/#sec-temporal.plaindate.prototype.tozoneddatetime
    static Value toZonedDateTime(const CallContext& ctx, const std::vector<Value>& args);

    /// 3.3.26 Temporal.PlainDate.prototype.toString ( [ options ] )
    /// @spec https://tc39.es/proposal-temporal/#sec-temporal.plaindate.prototype.tostring
    static Value toString(const CallContext& ctx, const std::vector<Value>& args);

    /// 3.3.27 Temporal.PlainDate.prototype.toJSON ( )
    /// @spec https://tc39.es/proposal-temporal/#sec-temporal.plaindate.prototype.tojson
    static Value toJSON(const CallContext& ctx, const std::vector<Value>& args);

    /// 3.3.28 Temporal.PlainDate.prototype.valueOf ( )
    /// @spec https://tc39.es/proposal-temporal/#sec-temporal.plaindate.prototype.valueof
    static Value valueOf(const CallContext& ctx, const std::vector<Value>& args);

    /// NON-STANDARD: Helper to create a JS PlainDate object from a temporal_rs::PlainDate.
    static Value wrapPlainDate(std::unique_ptr<temporal_rs::PlainDate> date);

  private:
    static JSObject* getGlobalPrototype();
};

}  // namespace rift::builtins
