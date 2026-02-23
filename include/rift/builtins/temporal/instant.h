#pragma once

#include <memory>
#include <unordered_map>

#include "../../memory/object_factory.h"
#include "../builtin_base.h"
#include "rift/interpreter/call_context.h"
#include "rift/types/object.h"
#include "rift/types/value.h"

// Forward declare temporal_rs types to avoid including heavy headers everywhere
namespace temporal_rs {
class Instant;
}

namespace rift::builtins {

using namespace rift::runtime;
using rift::core::CallContext;

/// NON-STANDARD: Registry mapping JSObject* to temporal_rs::Instant ownership.
class InstantRegistry {
  private:
    static std::unordered_map<JSObject*, std::unique_ptr<temporal_rs::Instant>> registry_;

  public:
    static void store(JSObject* obj, std::unique_ptr<temporal_rs::Instant> data);
    static temporal_rs::Instant* get(JSObject* obj);
    static void remove(JSObject* obj);
    static void clear();
};

/// 8 Temporal.Instant Objects
/// @spec https://tc39.es/proposal-temporal/#sec-temporal-instant-objects
class TemporalInstant : public BuiltinBase<TemporalInstant> {
  public:
    static constexpr const char* builtinName = "Instant";
    static constexpr int builtinLength = 1;

    /// 8.1.1 Temporal.Instant ( epochNanoseconds )
    /// @spec https://tc39.es/proposal-temporal/#sec-temporal.instant
    static Value constructor(const CallContext& ctx, const std::vector<Value>& args);

    /// 8.2 Properties of the Temporal.Instant Constructor
    /// @spec https://tc39.es/proposal-temporal/#sec-properties-of-temporal-instant-constructor
    static void setupStaticMethods(JSObject* constructor, rift::memory::ObjectFactory* factory);

    /// 8.3 Properties of the Temporal.Instant Prototype Object
    /// @spec https://tc39.es/proposal-temporal/#sec-properties-of-temporal-instant-prototype-object
    static void setupPrototypeMethods(JSObject* prototype, rift::memory::ObjectFactory* factory);

    /// 8.2.2 Temporal.Instant.from ( item )
    /// @spec https://tc39.es/proposal-temporal/#sec-temporal.instant.from
    static Value from(const CallContext& ctx, const std::vector<Value>& args);

    /// 8.2.3 Temporal.Instant.fromEpochMilliseconds ( epochMilliseconds )
    /// @spec https://tc39.es/proposal-temporal/#sec-temporal.instant.fromepochmilliseconds
    static Value fromEpochMilliseconds(const CallContext& ctx, const std::vector<Value>& args);

    /// 8.2.4 Temporal.Instant.fromEpochNanoseconds ( epochNanoseconds )
    /// @spec https://tc39.es/proposal-temporal/#sec-temporal.instant.fromepochnanoseconds
    static Value fromEpochNanoseconds(const CallContext& ctx, const std::vector<Value>& args);

    /// 8.2.5 Temporal.Instant.compare ( one, two )
    /// @spec https://tc39.es/proposal-temporal/#sec-temporal.instant.compare
    static Value compare(const CallContext& ctx, const std::vector<Value>& args);

    /// 8.3.3 get Temporal.Instant.prototype.epochMilliseconds
    /// @spec
    /// https://tc39.es/proposal-temporal/#sec-get-temporal.instant.prototype.epochmilliseconds
    static Value epochMilliseconds(const CallContext& ctx, const std::vector<Value>& args);

    /// 8.3.4 get Temporal.Instant.prototype.epochNanoseconds
    /// @spec https://tc39.es/proposal-temporal/#sec-get-temporal.instant.prototype.epochnanoseconds
    static Value epochNanoseconds(const CallContext& ctx, const std::vector<Value>& args);

    /// 8.3.5 Temporal.Instant.prototype.add ( temporalDurationLike )
    /// @spec https://tc39.es/proposal-temporal/#sec-temporal.instant.prototype.add
    static Value add(const CallContext& ctx, const std::vector<Value>& args);

    /// 8.3.6 Temporal.Instant.prototype.subtract ( temporalDurationLike )
    /// @spec https://tc39.es/proposal-temporal/#sec-temporal.instant.prototype.subtract
    static Value subtract(const CallContext& ctx, const std::vector<Value>& args);

    /// 8.3.11 Temporal.Instant.prototype.equals ( other )
    /// @spec https://tc39.es/proposal-temporal/#sec-temporal.instant.prototype.equals
    static Value equals(const CallContext& ctx, const std::vector<Value>& args);

    /// 8.3.10 Temporal.Instant.prototype.since ( other [ , options ] )
    /// @spec https://tc39.es/proposal-temporal/#sec-temporal.instant.prototype.since
    static Value since(const CallContext& ctx, const std::vector<Value>& args);

    /// 8.3.9 Temporal.Instant.prototype.until ( other [ , options ] )
    /// @spec https://tc39.es/proposal-temporal/#sec-temporal.instant.prototype.until
    static Value until(const CallContext& ctx, const std::vector<Value>& args);

    /// 8.3.12 Temporal.Instant.prototype.toString ( [ options ] )
    /// @spec https://tc39.es/proposal-temporal/#sec-temporal.instant.prototype.tostring
    static Value toString(const CallContext& ctx, const std::vector<Value>& args);

    /// 8.3.13 Temporal.Instant.prototype.toJSON ( )
    /// @spec https://tc39.es/proposal-temporal/#sec-temporal.instant.prototype.tojson
    static Value toJSON(const CallContext& ctx, const std::vector<Value>& args);

    /// 8.3.14 Temporal.Instant.prototype.valueOf ( )
    /// @spec https://tc39.es/proposal-temporal/#sec-temporal.instant.prototype.valueof
    static Value valueOf(const CallContext& ctx, const std::vector<Value>& args);

    /// 8.3.7 Temporal.Instant.prototype.round ( roundTo )
    /// @spec https://tc39.es/proposal-temporal/#sec-temporal.instant.prototype.round
    static Value round(const CallContext& ctx, const std::vector<Value>& args);

    /// 8.3.8 Temporal.Instant.prototype.toZonedDateTimeISO ( timeZone )
    /// @spec https://tc39.es/proposal-temporal/#sec-temporal.instant.prototype.tozoneddatetimeiso
    static Value toZonedDateTimeISO(const CallContext& ctx, const std::vector<Value>& args);

    /// 8.3.15 Temporal.Instant.prototype.toLocaleString ( [ locales [ , options ] ] )
    /// @spec https://tc39.es/proposal-temporal/#sec-temporal.instant.prototype.tolocalestring
    static Value toLocaleString(const CallContext& ctx, const std::vector<Value>& args);

    /// NON-STANDARD: Helper to create a JS Instant object from a temporal_rs::Instant.
    static Value wrapInstant(std::unique_ptr<temporal_rs::Instant> instant);

  private:
    static JSObject* getGlobalPrototype();
};

}  // namespace rift::builtins
