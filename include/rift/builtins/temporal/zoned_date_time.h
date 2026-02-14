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
class ZonedDateTime;
}

namespace rift::builtins {

using namespace rift::runtime;
using rift::core::CallContext;

/// Registry mapping JSObject* to temporal_rs::ZonedDateTime ownership.
class ZonedDateTimeRegistry {
  private:
    static std::unordered_map<JSObject*, std::unique_ptr<temporal_rs::ZonedDateTime>> registry_;

  public:
    static void store(JSObject* obj, std::unique_ptr<temporal_rs::ZonedDateTime> data);
    static temporal_rs::ZonedDateTime* get(JSObject* obj);
    static void remove(JSObject* obj);
    static void clear();
};

/// The `Temporal.ZonedDateTime` builtin constructor and prototype methods.
class TemporalZonedDateTime : public BuiltinBase<TemporalZonedDateTime> {
  public:
    /// Constructor: new Temporal.ZonedDateTime(epochNanoseconds, timeZone [, calendar])
    static Value constructor(const CallContext& ctx, const std::vector<Value>& args);

    /// Setup methods required by BuiltinBase
    static void setupStaticMethods(JSObject* constructor, rift::memory::ObjectFactory* factory);
    static void setupPrototypeMethods(JSObject* prototype, rift::memory::ObjectFactory* factory);

    /// Static methods
    static Value from(const CallContext& ctx, const std::vector<Value>& args);
    static Value compare(const CallContext& ctx, const std::vector<Value>& args);

    /// Date getters
    static Value year(const CallContext& ctx, const std::vector<Value>& args);
    static Value month(const CallContext& ctx, const std::vector<Value>& args);
    static Value monthCode(const CallContext& ctx, const std::vector<Value>& args);
    static Value day(const CallContext& ctx, const std::vector<Value>& args);
    static Value dayOfWeek(const CallContext& ctx, const std::vector<Value>& args);
    static Value dayOfYear(const CallContext& ctx, const std::vector<Value>& args);
    static Value weekOfYear(const CallContext& ctx, const std::vector<Value>& args);
    static Value daysInMonth(const CallContext& ctx, const std::vector<Value>& args);
    static Value daysInYear(const CallContext& ctx, const std::vector<Value>& args);
    static Value monthsInYear(const CallContext& ctx, const std::vector<Value>& args);
    static Value inLeapYear(const CallContext& ctx, const std::vector<Value>& args);
    static Value calendarId(const CallContext& ctx, const std::vector<Value>& args);

    /// Time getters
    static Value hour(const CallContext& ctx, const std::vector<Value>& args);
    static Value minute(const CallContext& ctx, const std::vector<Value>& args);
    static Value second(const CallContext& ctx, const std::vector<Value>& args);
    static Value millisecond(const CallContext& ctx, const std::vector<Value>& args);
    static Value microsecond(const CallContext& ctx, const std::vector<Value>& args);
    static Value nanosecond(const CallContext& ctx, const std::vector<Value>& args);

    /// Timezone getters
    static Value timeZoneId(const CallContext& ctx, const std::vector<Value>& args);
    static Value offset(const CallContext& ctx, const std::vector<Value>& args);
    static Value offsetNanoseconds(const CallContext& ctx, const std::vector<Value>& args);
    static Value epochMilliseconds(const CallContext& ctx, const std::vector<Value>& args);
    static Value epochNanoseconds(const CallContext& ctx, const std::vector<Value>& args);

    /// Mutation
    static Value with(const CallContext& ctx, const std::vector<Value>& args);
    static Value withTimeZone(const CallContext& ctx, const std::vector<Value>& args);
    static Value withCalendar(const CallContext& ctx, const std::vector<Value>& args);
    static Value withPlainTime(const CallContext& ctx, const std::vector<Value>& args);

    /// Arithmetic
    static Value add(const CallContext& ctx, const std::vector<Value>& args);
    static Value subtract(const CallContext& ctx, const std::vector<Value>& args);

    /// Difference
    static Value until(const CallContext& ctx, const std::vector<Value>& args);
    static Value since(const CallContext& ctx, const std::vector<Value>& args);

    /// Comparison
    static Value equals(const CallContext& ctx, const std::vector<Value>& args);

    /// Conversion
    static Value toInstant(const CallContext& ctx, const std::vector<Value>& args);
    static Value toPlainDate(const CallContext& ctx, const std::vector<Value>& args);
    static Value toPlainTime(const CallContext& ctx, const std::vector<Value>& args);
    static Value toPlainDateTime(const CallContext& ctx, const std::vector<Value>& args);

    /// Special
    static Value startOfDay(const CallContext& ctx, const std::vector<Value>& args);
    static Value hoursInDay(const CallContext& ctx, const std::vector<Value>& args);

    /// String
    static Value toString(const CallContext& ctx, const std::vector<Value>& args);
    static Value toJSON(const CallContext& ctx, const std::vector<Value>& args);
    static Value valueOf(const CallContext& ctx, const std::vector<Value>& args);

    /// Helper to create a JS ZonedDateTime object from a temporal_rs::ZonedDateTime
    static Value wrapZonedDateTime(std::unique_ptr<temporal_rs::ZonedDateTime> zdt);

  private:
    static JSObject* getGlobalPrototype();
};

}  // namespace rift::builtins
