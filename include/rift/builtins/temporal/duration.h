#pragma once

#include <memory>
#include <unordered_map>

#include "../../core/engine/call_context.h"
#include "../../memory/object_factory.h"
#include "../../runtime/values/object.h"
#include "../../runtime/values/value.h"
#include "../builtin_base.h"

// Forward declare temporal_rs types to avoid including heavy headers everywhere
namespace temporal_rs {
class Duration;
}

namespace rift::builtins {

using namespace rift::runtime;
using rift::core::CallContext;

/// NON-STANDARD: Registry mapping JSObject* to temporal_rs::Duration ownership.
class DurationRegistry {
  private:
    static std::unordered_map<JSObject*, std::unique_ptr<temporal_rs::Duration>> registry_;

  public:
    static void store(JSObject* obj, std::unique_ptr<temporal_rs::Duration> data);
    static temporal_rs::Duration* get(JSObject* obj);
    static void remove(JSObject* obj);
    static void clear();
};

/// 7 Temporal.Duration Objects
/// @spec https://tc39.es/proposal-temporal/#sec-temporal-duration-objects
class TemporalDuration : public BuiltinBase<TemporalDuration> {
  public:
    /// 7.1.1 Temporal.Duration ( [ years [ , months [ , weeks [ , days [ , hours [ , minutes [ ,
    /// seconds [ , milliseconds [ , microseconds [ , nanoseconds ] ] ] ] ] ] ] ] ] ] )
    /// @spec https://tc39.es/proposal-temporal/#sec-temporal.duration
    static Value constructor(const CallContext& ctx, const std::vector<Value>& args);

    /// 7.2 Properties of the Temporal.Duration Constructor
    /// @spec https://tc39.es/proposal-temporal/#sec-properties-of-the-temporal-duration-constructor
    static void setupStaticMethods(JSObject* constructor, rift::memory::ObjectFactory* factory);

    /// 7.3 Properties of the Temporal.Duration Prototype Object
    /// @spec
    /// https://tc39.es/proposal-temporal/#sec-properties-of-the-temporal-duration-prototype-object
    static void setupPrototypeMethods(JSObject* prototype, rift::memory::ObjectFactory* factory);

    /// 7.2.2 Temporal.Duration.from ( item )
    /// @spec https://tc39.es/proposal-temporal/#sec-temporal.duration.from
    static Value from(const CallContext& ctx, const std::vector<Value>& args);

    /// 7.2.3 Temporal.Duration.compare ( one, two [ , options ] )
    /// @spec https://tc39.es/proposal-temporal/#sec-temporal.duration.compare
    static Value compare(const CallContext& ctx, const std::vector<Value>& args);

    /// 7.3.3 get Temporal.Duration.prototype.years
    /// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.duration.prototype.years
    static Value years(const CallContext& ctx, const std::vector<Value>& args);

    /// 7.3.4 get Temporal.Duration.prototype.months
    /// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.duration.prototype.months
    static Value months(const CallContext& ctx, const std::vector<Value>& args);

    /// 7.3.5 get Temporal.Duration.prototype.weeks
    /// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.duration.prototype.weeks
    static Value weeks(const CallContext& ctx, const std::vector<Value>& args);

    /// 7.3.6 get Temporal.Duration.prototype.days
    /// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.duration.prototype.days
    static Value days(const CallContext& ctx, const std::vector<Value>& args);

    /// 7.3.7 get Temporal.Duration.prototype.hours
    /// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.duration.prototype.hours
    static Value hours(const CallContext& ctx, const std::vector<Value>& args);

    /// 7.3.8 get Temporal.Duration.prototype.minutes
    /// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.duration.prototype.minutes
    static Value minutes(const CallContext& ctx, const std::vector<Value>& args);

    /// 7.3.9 get Temporal.Duration.prototype.seconds
    /// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.duration.prototype.seconds
    static Value seconds(const CallContext& ctx, const std::vector<Value>& args);

    /// 7.3.10 get Temporal.Duration.prototype.milliseconds
    /// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.duration.prototype.milliseconds
    static Value milliseconds(const CallContext& ctx, const std::vector<Value>& args);

    /// 7.3.11 get Temporal.Duration.prototype.microseconds
    /// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.duration.prototype.microseconds
    static Value microseconds(const CallContext& ctx, const std::vector<Value>& args);

    /// 7.3.12 get Temporal.Duration.prototype.nanoseconds
    /// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.duration.prototype.nanoseconds
    static Value nanoseconds(const CallContext& ctx, const std::vector<Value>& args);

    /// 7.3.13 get Temporal.Duration.prototype.sign
    /// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.duration.prototype.sign
    static Value sign(const CallContext& ctx, const std::vector<Value>& args);

    /// 7.3.14 get Temporal.Duration.prototype.blank
    /// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.duration.prototype.blank
    static Value blank(const CallContext& ctx, const std::vector<Value>& args);

    /// 7.3.17 Temporal.Duration.prototype.abs ( )
    /// @spec https://tc39.es/proposal-temporal/#sec-temporal.duration.prototype.abs
    static Value abs(const CallContext& ctx, const std::vector<Value>& args);

    /// 7.3.16 Temporal.Duration.prototype.negated ( )
    /// @spec https://tc39.es/proposal-temporal/#sec-temporal.duration.prototype.negated
    static Value negated(const CallContext& ctx, const std::vector<Value>& args);

    /// 7.3.18 Temporal.Duration.prototype.add ( other [ , options ] )
    /// @spec https://tc39.es/proposal-temporal/#sec-temporal.duration.prototype.add
    static Value add(const CallContext& ctx, const std::vector<Value>& args);

    /// 7.3.19 Temporal.Duration.prototype.subtract ( other [ , options ] )
    /// @spec https://tc39.es/proposal-temporal/#sec-temporal.duration.prototype.subtract
    static Value subtract(const CallContext& ctx, const std::vector<Value>& args);

    /// 7.3.20 Temporal.Duration.prototype.round ( roundTo )
    /// @spec https://tc39.es/proposal-temporal/#sec-temporal.duration.prototype.round
    static Value round(const CallContext& ctx, const std::vector<Value>& args);

    /// 7.3.21 Temporal.Duration.prototype.total ( totalOf )
    /// @spec https://tc39.es/proposal-temporal/#sec-temporal.duration.prototype.total
    static Value total(const CallContext& ctx, const std::vector<Value>& args);

    /// 7.3.22 Temporal.Duration.prototype.toString ( [ options ] )
    /// @spec https://tc39.es/proposal-temporal/#sec-temporal.duration.prototype.tostring
    static Value toString(const CallContext& ctx, const std::vector<Value>& args);

    /// 7.3.23 Temporal.Duration.prototype.toJSON ( )
    /// @spec https://tc39.es/proposal-temporal/#sec-temporal.duration.prototype.tojson
    static Value toJSON(const CallContext& ctx, const std::vector<Value>& args);

    /// 7.3.24 Temporal.Duration.prototype.valueOf ( )
    /// @spec https://tc39.es/proposal-temporal/#sec-temporal.duration.prototype.valueof
    static Value valueOf(const CallContext& ctx, const std::vector<Value>& args);

    /// NON-STANDARD: Helper to create a JS Duration object from a temporal_rs::Duration.
    static Value wrapDuration(std::unique_ptr<temporal_rs::Duration> dur);

  private:
    static JSObject* getGlobalPrototype();
};

}  // namespace rift::builtins
