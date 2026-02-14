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
class PlainYearMonth;
}

namespace rift::builtins {

using namespace rift::runtime;
using rift::core::CallContext;

/// Registry mapping JSObject* to temporal_rs::PlainYearMonth ownership.
class PlainYearMonthRegistry {
  private:
    static std::unordered_map<JSObject*, std::unique_ptr<temporal_rs::PlainYearMonth>> registry_;

  public:
    static void store(JSObject* obj, std::unique_ptr<temporal_rs::PlainYearMonth> data);
    static temporal_rs::PlainYearMonth* get(JSObject* obj);
    static void remove(JSObject* obj);
    static void clear();
};

/// The `Temporal.PlainYearMonth` builtin constructor and prototype methods.
class TemporalPlainYearMonth : public BuiltinBase<TemporalPlainYearMonth> {
  public:
    /// Constructor: new Temporal.PlainYearMonth(year, month [, calendar [, referenceDay]])
    static Value constructor(const CallContext& ctx, const std::vector<Value>& args);

    /// Setup methods required by BuiltinBase
    static void setupStaticMethods(JSObject* constructor, rift::memory::ObjectFactory* factory);
    static void setupPrototypeMethods(JSObject* prototype, rift::memory::ObjectFactory* factory);

    /// Static methods
    static Value from(const CallContext& ctx, const std::vector<Value>& args);
    static Value compare(const CallContext& ctx, const std::vector<Value>& args);

    /// Prototype getters
    static Value year(const CallContext& ctx, const std::vector<Value>& args);
    static Value month(const CallContext& ctx, const std::vector<Value>& args);
    static Value monthCode(const CallContext& ctx, const std::vector<Value>& args);
    static Value daysInMonth(const CallContext& ctx, const std::vector<Value>& args);
    static Value daysInYear(const CallContext& ctx, const std::vector<Value>& args);
    static Value monthsInYear(const CallContext& ctx, const std::vector<Value>& args);
    static Value inLeapYear(const CallContext& ctx, const std::vector<Value>& args);
    static Value calendarId(const CallContext& ctx, const std::vector<Value>& args);

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

    /// Conversion
    static Value toPlainDate(const CallContext& ctx, const std::vector<Value>& args);

    /// String
    static Value toString(const CallContext& ctx, const std::vector<Value>& args);
    static Value toJSON(const CallContext& ctx, const std::vector<Value>& args);
    static Value valueOf(const CallContext& ctx, const std::vector<Value>& args);

    /// Helper to create a JS PlainYearMonth object from a temporal_rs::PlainYearMonth
    static Value wrapPlainYearMonth(std::unique_ptr<temporal_rs::PlainYearMonth> ym);

  private:
    static JSObject* getGlobalPrototype();
};

}  // namespace rift::builtins
