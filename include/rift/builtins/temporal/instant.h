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
class Instant;
}

namespace rift::builtins {

using namespace rift::runtime;
using rift::core::CallContext;

/// Registry mapping JSObject* to temporal_rs::Instant ownership.
class InstantRegistry {
  private:
    static std::unordered_map<JSObject*, std::unique_ptr<temporal_rs::Instant>> registry_;

  public:
    static void store(JSObject* obj, std::unique_ptr<temporal_rs::Instant> data);
    static temporal_rs::Instant* get(JSObject* obj);
    static void remove(JSObject* obj);
    static void clear();
};

/// The `Temporal.Instant` builtin constructor and prototype methods.
class TemporalInstant : public BuiltinBase<TemporalInstant> {
  public:
    /// Constructor: new Temporal.Instant(epochNanoseconds)
    static Value constructor(const CallContext& ctx, const std::vector<Value>& args);

    /// Setup methods required by BuiltinBase
    static void setupStaticMethods(JSObject* constructor, rift::memory::ObjectFactory* factory);
    static void setupPrototypeMethods(JSObject* prototype, rift::memory::ObjectFactory* factory);

    /// Static methods
    static Value from(const CallContext& ctx, const std::vector<Value>& args);
    static Value fromEpochMilliseconds(const CallContext& ctx, const std::vector<Value>& args);
    static Value fromEpochNanoseconds(const CallContext& ctx, const std::vector<Value>& args);
    static Value compare(const CallContext& ctx, const std::vector<Value>& args);

    /// Prototype methods
    static Value epochMilliseconds(const CallContext& ctx, const std::vector<Value>& args);
    static Value epochNanoseconds(const CallContext& ctx, const std::vector<Value>& args);
    static Value add(const CallContext& ctx, const std::vector<Value>& args);
    static Value subtract(const CallContext& ctx, const std::vector<Value>& args);
    static Value equals(const CallContext& ctx, const std::vector<Value>& args);
    static Value since(const CallContext& ctx, const std::vector<Value>& args);
    static Value until(const CallContext& ctx, const std::vector<Value>& args);
    static Value toString(const CallContext& ctx, const std::vector<Value>& args);
    static Value toJSON(const CallContext& ctx, const std::vector<Value>& args);
    static Value valueOf(const CallContext& ctx, const std::vector<Value>& args);

    /// Helper to create a JS Instant object from a temporal_rs::Instant
    static Value wrapInstant(std::unique_ptr<temporal_rs::Instant> instant);

  private:
    static JSObject* getGlobalPrototype();
};

}  // namespace rift::builtins
