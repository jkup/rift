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

/// Registry mapping JSObject* to temporal_rs::Duration ownership.
class DurationRegistry {
  private:
    static std::unordered_map<JSObject*, std::unique_ptr<temporal_rs::Duration>> registry_;

  public:
    static void store(JSObject* obj, std::unique_ptr<temporal_rs::Duration> data);
    static temporal_rs::Duration* get(JSObject* obj);
    static void remove(JSObject* obj);
    static void clear();
};

/// The `Temporal.Duration` builtin constructor and prototype methods.
class TemporalDuration : public BuiltinBase<TemporalDuration> {
  public:
    /// Constructor: new Temporal.Duration(y, mo, w, d, h, mi, s, ms, us, ns)
    static Value constructor(const CallContext& ctx, const std::vector<Value>& args);

    /// Setup methods required by BuiltinBase
    static void setupStaticMethods(JSObject* constructor, rift::memory::ObjectFactory* factory);
    static void setupPrototypeMethods(JSObject* prototype, rift::memory::ObjectFactory* factory);

    /// Static methods
    static Value from(const CallContext& ctx, const std::vector<Value>& args);
    static Value compare(const CallContext& ctx, const std::vector<Value>& args);

    /// Prototype getters (registered as methods)
    static Value years(const CallContext& ctx, const std::vector<Value>& args);
    static Value months(const CallContext& ctx, const std::vector<Value>& args);
    static Value weeks(const CallContext& ctx, const std::vector<Value>& args);
    static Value days(const CallContext& ctx, const std::vector<Value>& args);
    static Value hours(const CallContext& ctx, const std::vector<Value>& args);
    static Value minutes(const CallContext& ctx, const std::vector<Value>& args);
    static Value seconds(const CallContext& ctx, const std::vector<Value>& args);
    static Value milliseconds(const CallContext& ctx, const std::vector<Value>& args);
    static Value microseconds(const CallContext& ctx, const std::vector<Value>& args);
    static Value nanoseconds(const CallContext& ctx, const std::vector<Value>& args);
    static Value sign(const CallContext& ctx, const std::vector<Value>& args);
    static Value blank(const CallContext& ctx, const std::vector<Value>& args);

    /// Arithmetic
    static Value abs(const CallContext& ctx, const std::vector<Value>& args);
    static Value negated(const CallContext& ctx, const std::vector<Value>& args);
    static Value add(const CallContext& ctx, const std::vector<Value>& args);
    static Value subtract(const CallContext& ctx, const std::vector<Value>& args);

    /// Rounding
    static Value round(const CallContext& ctx, const std::vector<Value>& args);
    static Value total(const CallContext& ctx, const std::vector<Value>& args);

    /// String
    static Value toString(const CallContext& ctx, const std::vector<Value>& args);
    static Value toJSON(const CallContext& ctx, const std::vector<Value>& args);
    static Value valueOf(const CallContext& ctx, const std::vector<Value>& args);

    /// Helper to create a JS Duration object from a temporal_rs::Duration
    static Value wrapDuration(std::unique_ptr<temporal_rs::Duration> dur);

  private:
    static JSObject* getGlobalPrototype();
};

}  // namespace rift::builtins
