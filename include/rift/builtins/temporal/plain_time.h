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
class PlainTime;
}

namespace rift::builtins {

using namespace rift::runtime;
using rift::core::CallContext;

/// NON-STANDARD: Registry mapping JSObject* to temporal_rs::PlainTime ownership.
class PlainTimeRegistry {
  private:
    static std::unordered_map<JSObject*, std::unique_ptr<temporal_rs::PlainTime>> registry_;

  public:
    static void store(JSObject* obj, std::unique_ptr<temporal_rs::PlainTime> data);
    static temporal_rs::PlainTime* get(JSObject* obj);
    static void remove(JSObject* obj);
    static void clear();
};

/// 4 Temporal.PlainTime Objects
/// @spec https://tc39.es/proposal-temporal/#sec-temporal-plaintime-objects
class TemporalPlainTime : public BuiltinBase<TemporalPlainTime> {
  public:
    /// 4.1.1 Temporal.PlainTime ( [ hour [ , minute [ , second [ , millisecond [ , microsecond [ ,
    /// nanosecond ] ] ] ] ] ] )
    /// @spec https://tc39.es/proposal-temporal/#sec-temporal.plaintime
    static Value constructor(const CallContext& ctx, const std::vector<Value>& args);

    /// 4.2 Properties of the Temporal.PlainTime Constructor
    /// @spec https://tc39.es/proposal-temporal/#sec-properties-of-temporal-plaintime-constructor
    static void setupStaticMethods(JSObject* constructor, rift::memory::ObjectFactory* factory);

    /// 4.3 Properties of the Temporal.PlainTime Prototype Object
    /// @spec
    /// https://tc39.es/proposal-temporal/#sec-properties-of-temporal-plaintime-prototype-object
    static void setupPrototypeMethods(JSObject* prototype, rift::memory::ObjectFactory* factory);

    /// 4.2.2 Temporal.PlainTime.from ( item [ , options ] )
    /// @spec https://tc39.es/proposal-temporal/#sec-temporal.plaintime.from
    static Value from(const CallContext& ctx, const std::vector<Value>& args);

    /// 4.2.3 Temporal.PlainTime.compare ( one, two )
    /// @spec https://tc39.es/proposal-temporal/#sec-temporal.plaintime.compare
    static Value compare(const CallContext& ctx, const std::vector<Value>& args);

    /// 4.3.4 get Temporal.PlainTime.prototype.hour
    /// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.plaintime.prototype.hour
    static Value hour(const CallContext& ctx, const std::vector<Value>& args);

    /// 4.3.5 get Temporal.PlainTime.prototype.minute
    /// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.plaintime.prototype.minute
    static Value minute(const CallContext& ctx, const std::vector<Value>& args);

    /// 4.3.6 get Temporal.PlainTime.prototype.second
    /// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.plaintime.prototype.second
    static Value second(const CallContext& ctx, const std::vector<Value>& args);

    /// 4.3.7 get Temporal.PlainTime.prototype.millisecond
    /// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.plaintime.prototype.millisecond
    static Value millisecond(const CallContext& ctx, const std::vector<Value>& args);

    /// 4.3.8 get Temporal.PlainTime.prototype.microsecond
    /// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.plaintime.prototype.microsecond
    static Value microsecond(const CallContext& ctx, const std::vector<Value>& args);

    /// 4.3.9 get Temporal.PlainTime.prototype.nanosecond
    /// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.plaintime.prototype.nanosecond
    static Value nanosecond(const CallContext& ctx, const std::vector<Value>& args);

    /// 4.3.10 Temporal.PlainTime.prototype.with ( temporalTimeLike [ , options ] )
    /// @spec https://tc39.es/proposal-temporal/#sec-temporal.plaintime.prototype.with
    static Value with(const CallContext& ctx, const std::vector<Value>& args);

    /// 4.3.11 Temporal.PlainTime.prototype.add ( temporalDurationLike )
    /// @spec https://tc39.es/proposal-temporal/#sec-temporal.plaintime.prototype.add
    static Value add(const CallContext& ctx, const std::vector<Value>& args);

    /// 4.3.12 Temporal.PlainTime.prototype.subtract ( temporalDurationLike )
    /// @spec https://tc39.es/proposal-temporal/#sec-temporal.plaintime.prototype.subtract
    static Value subtract(const CallContext& ctx, const std::vector<Value>& args);

    /// 4.3.13 Temporal.PlainTime.prototype.until ( other [ , options ] )
    /// @spec https://tc39.es/proposal-temporal/#sec-temporal.plaintime.prototype.until
    static Value until(const CallContext& ctx, const std::vector<Value>& args);

    /// 4.3.14 Temporal.PlainTime.prototype.since ( other [ , options ] )
    /// @spec https://tc39.es/proposal-temporal/#sec-temporal.plaintime.prototype.since
    static Value since(const CallContext& ctx, const std::vector<Value>& args);

    /// 4.3.16 Temporal.PlainTime.prototype.equals ( other )
    /// @spec https://tc39.es/proposal-temporal/#sec-temporal.plaintime.prototype.equals
    static Value equals(const CallContext& ctx, const std::vector<Value>& args);

    /// 4.3.17 Temporal.PlainTime.prototype.toString ( [ options ] )
    /// @spec https://tc39.es/proposal-temporal/#sec-temporal.plaintime.prototype.tostring
    static Value toString(const CallContext& ctx, const std::vector<Value>& args);

    /// 4.3.19 Temporal.PlainTime.prototype.toJSON ( )
    /// @spec https://tc39.es/proposal-temporal/#sec-temporal.plaintime.prototype.tojson
    static Value toJSON(const CallContext& ctx, const std::vector<Value>& args);

    /// 4.3.20 Temporal.PlainTime.prototype.valueOf ( )
    /// @spec https://tc39.es/proposal-temporal/#sec-temporal.plaintime.prototype.valueof
    static Value valueOf(const CallContext& ctx, const std::vector<Value>& args);

    /// NON-STANDARD: Helper to create a JS PlainTime object from a temporal_rs::PlainTime.
    static Value wrapPlainTime(std::unique_ptr<temporal_rs::PlainTime> time);

  private:
    static JSObject* getGlobalPrototype();
};

}  // namespace rift::builtins
