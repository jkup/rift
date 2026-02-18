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
class PlainMonthDay;
}

namespace rift::builtins {

using namespace rift::runtime;
using rift::core::CallContext;

/// NON-STANDARD: Registry mapping JSObject* to temporal_rs::PlainMonthDay ownership.
class PlainMonthDayRegistry {
  private:
    static std::unordered_map<JSObject*, std::unique_ptr<temporal_rs::PlainMonthDay>> registry_;

  public:
    static void store(JSObject* obj, std::unique_ptr<temporal_rs::PlainMonthDay> data);
    static temporal_rs::PlainMonthDay* get(JSObject* obj);
    static void remove(JSObject* obj);
    static void clear();
};

/// 10 Temporal.PlainMonthDay Objects
/// @spec https://tc39.es/proposal-temporal/#sec-temporal-plainmonthday-objects
class TemporalPlainMonthDay : public BuiltinBase<TemporalPlainMonthDay> {
  public:
    /// 10.1.1 Temporal.PlainMonthDay ( isoMonth, isoDay [ , calendar [ , referenceISOYear ] ] )
    /// @spec https://tc39.es/proposal-temporal/#sec-temporal.plainmonthday
    static Value constructor(const CallContext& ctx, const std::vector<Value>& args);

    /// 10.2 Properties of the Temporal.PlainMonthDay Constructor
    /// @spec
    /// https://tc39.es/proposal-temporal/#sec-properties-of-temporal-plainmonthday-constructor
    static void setupStaticMethods(JSObject* constructor, rift::memory::ObjectFactory* factory);

    /// 10.3 Properties of the Temporal.PlainMonthDay Prototype Object
    /// @spec
    /// https://tc39.es/proposal-temporal/#sec-properties-of-temporal-plainmonthday-prototype-object
    static void setupPrototypeMethods(JSObject* prototype, rift::memory::ObjectFactory* factory);

    /// 10.2.2 Temporal.PlainMonthDay.from ( item [ , options ] )
    /// @spec https://tc39.es/proposal-temporal/#sec-temporal.plainmonthday.from
    static Value from(const CallContext& ctx, const std::vector<Value>& args);

    /// 10.3.5 get Temporal.PlainMonthDay.prototype.day
    /// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.plainmonthday.prototype.day
    static Value day(const CallContext& ctx, const std::vector<Value>& args);

    /// 10.3.4 get Temporal.PlainMonthDay.prototype.monthCode
    /// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.plainmonthday.prototype.monthcode
    static Value monthCode(const CallContext& ctx, const std::vector<Value>& args);

    /// 10.3.3 get Temporal.PlainMonthDay.prototype.calendarId
    /// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.plainmonthday.prototype.calendarid
    static Value calendarId(const CallContext& ctx, const std::vector<Value>& args);

    /// 10.3.6 Temporal.PlainMonthDay.prototype.with ( temporalMonthDayLike [ , options ] )
    /// @spec https://tc39.es/proposal-temporal/#sec-temporal.plainmonthday.prototype.with
    static Value with(const CallContext& ctx, const std::vector<Value>& args);

    /// 10.3.7 Temporal.PlainMonthDay.prototype.equals ( other )
    /// @spec https://tc39.es/proposal-temporal/#sec-temporal.plainmonthday.prototype.equals
    static Value equals(const CallContext& ctx, const std::vector<Value>& args);

    /// 10.3.8 Temporal.PlainMonthDay.prototype.toPlainDate ( item )
    /// @spec https://tc39.es/proposal-temporal/#sec-temporal.plainmonthday.prototype.toplaindate
    static Value toPlainDate(const CallContext& ctx, const std::vector<Value>& args);

    /// 10.3.9 Temporal.PlainMonthDay.prototype.toString ( [ options ] )
    /// @spec https://tc39.es/proposal-temporal/#sec-temporal.plainmonthday.prototype.tostring
    static Value toString(const CallContext& ctx, const std::vector<Value>& args);

    /// 10.3.10 Temporal.PlainMonthDay.prototype.toJSON ( )
    /// @spec https://tc39.es/proposal-temporal/#sec-temporal.plainmonthday.prototype.tojson
    static Value toJSON(const CallContext& ctx, const std::vector<Value>& args);

    /// 10.3.11 Temporal.PlainMonthDay.prototype.valueOf ( )
    /// @spec https://tc39.es/proposal-temporal/#sec-temporal.plainmonthday.prototype.valueof
    static Value valueOf(const CallContext& ctx, const std::vector<Value>& args);

    /// NON-STANDARD: Helper to create a JS PlainMonthDay object from a temporal_rs::PlainMonthDay.
    static Value wrapPlainMonthDay(std::unique_ptr<temporal_rs::PlainMonthDay> md);

  private:
    static JSObject* getGlobalPrototype();
};

}  // namespace rift::builtins
