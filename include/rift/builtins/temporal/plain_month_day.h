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
class PlainMonthDay;
}

namespace rift::builtins {

using namespace rift::runtime;
using rift::core::CallContext;

/// Registry mapping JSObject* to temporal_rs::PlainMonthDay ownership.
class PlainMonthDayRegistry {
  private:
    static std::unordered_map<JSObject*, std::unique_ptr<temporal_rs::PlainMonthDay>> registry_;

  public:
    static void store(JSObject* obj, std::unique_ptr<temporal_rs::PlainMonthDay> data);
    static temporal_rs::PlainMonthDay* get(JSObject* obj);
    static void remove(JSObject* obj);
    static void clear();
};

/// The `Temporal.PlainMonthDay` builtin constructor and prototype methods.
class TemporalPlainMonthDay : public BuiltinBase<TemporalPlainMonthDay> {
  public:
    /// Constructor: new Temporal.PlainMonthDay(month, day [, calendar [, referenceYear]])
    static Value constructor(const CallContext& ctx, const std::vector<Value>& args);

    /// Setup methods required by BuiltinBase
    static void setupStaticMethods(JSObject* constructor, rift::memory::ObjectFactory* factory);
    static void setupPrototypeMethods(JSObject* prototype, rift::memory::ObjectFactory* factory);

    /// Static methods
    static Value from(const CallContext& ctx, const std::vector<Value>& args);

    /// Prototype getters
    static Value day(const CallContext& ctx, const std::vector<Value>& args);
    static Value monthCode(const CallContext& ctx, const std::vector<Value>& args);
    static Value calendarId(const CallContext& ctx, const std::vector<Value>& args);

    /// Mutation
    static Value with(const CallContext& ctx, const std::vector<Value>& args);

    /// Comparison
    static Value equals(const CallContext& ctx, const std::vector<Value>& args);

    /// Conversion
    static Value toPlainDate(const CallContext& ctx, const std::vector<Value>& args);

    /// String
    static Value toString(const CallContext& ctx, const std::vector<Value>& args);
    static Value toJSON(const CallContext& ctx, const std::vector<Value>& args);
    static Value valueOf(const CallContext& ctx, const std::vector<Value>& args);

    /// Helper to create a JS PlainMonthDay object from a temporal_rs::PlainMonthDay
    static Value wrapPlainMonthDay(std::unique_ptr<temporal_rs::PlainMonthDay> md);

  private:
    static JSObject* getGlobalPrototype();
};

}  // namespace rift::builtins
