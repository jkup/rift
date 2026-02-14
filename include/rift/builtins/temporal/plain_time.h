#pragma once

#include <memory>
#include <unordered_map>

#include "../../core/engine/call_context.h"
#include "../../memory/object_factory.h"
#include "../../runtime/values/object.h"
#include "../../runtime/values/value.h"
#include "../builtin_base.h"

// Forward declare temporal_rs types
namespace temporal_rs {
class PlainTime;
}

namespace rift::builtins {

using namespace rift::runtime;
using rift::core::CallContext;

/// Registry mapping JSObject* to temporal_rs::PlainTime ownership.
class PlainTimeRegistry {
  private:
    static std::unordered_map<JSObject*, std::unique_ptr<temporal_rs::PlainTime>> registry_;

  public:
    static void store(JSObject* obj, std::unique_ptr<temporal_rs::PlainTime> data);
    static temporal_rs::PlainTime* get(JSObject* obj);
    static void remove(JSObject* obj);
    static void clear();
};

/// The `Temporal.PlainTime` builtin constructor and prototype methods.
class TemporalPlainTime : public BuiltinBase<TemporalPlainTime> {
  public:
    /// Constructor: new Temporal.PlainTime(hour=0, minute=0, second=0, ms=0, us=0, ns=0)
    static Value constructor(const CallContext& ctx, const std::vector<Value>& args);

    /// Setup methods required by BuiltinBase
    static void setupStaticMethods(JSObject* constructor, rift::memory::ObjectFactory* factory);
    static void setupPrototypeMethods(JSObject* prototype, rift::memory::ObjectFactory* factory);

    /// Static methods
    static Value from(const CallContext& ctx, const std::vector<Value>& args);
    static Value compare(const CallContext& ctx, const std::vector<Value>& args);

    /// Prototype getters
    static Value hour(const CallContext& ctx, const std::vector<Value>& args);
    static Value minute(const CallContext& ctx, const std::vector<Value>& args);
    static Value second(const CallContext& ctx, const std::vector<Value>& args);
    static Value millisecond(const CallContext& ctx, const std::vector<Value>& args);
    static Value microsecond(const CallContext& ctx, const std::vector<Value>& args);
    static Value nanosecond(const CallContext& ctx, const std::vector<Value>& args);

    /// Mutation
    static Value with(const CallContext& ctx, const std::vector<Value>& args);

    /// Arithmetic
    static Value add(const CallContext& ctx, const std::vector<Value>& args);
    static Value subtract(const CallContext& ctx, const std::vector<Value>& args);

    /// Difference
    static Value until(const CallContext& ctx, const std::vector<Value>& args);
    static Value since(const CallContext& ctx, const std::vector<Value>& args);

    /// Comparison
    static Value equals(const CallContext& ctx, const std::vector<Value>& args);

    /// String
    static Value toString(const CallContext& ctx, const std::vector<Value>& args);
    static Value toJSON(const CallContext& ctx, const std::vector<Value>& args);
    static Value valueOf(const CallContext& ctx, const std::vector<Value>& args);

    /// Helper to create a JS PlainTime object from a temporal_rs::PlainTime
    static Value wrapPlainTime(std::unique_ptr<temporal_rs::PlainTime> time);

  private:
    static JSObject* getGlobalPrototype();
};

}  // namespace rift::builtins
