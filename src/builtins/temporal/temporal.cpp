#include "rift/builtins/temporal/temporal.h"

#include "rift/builtins/builtin_base.h"
#include "rift/builtins/temporal/duration.h"
#include "rift/builtins/temporal/instant.h"
#include "rift/builtins/temporal/now.h"
#include "rift/builtins/temporal/plain_date.h"
#include "rift/builtins/temporal/plain_date_time.h"
#include "rift/builtins/temporal/plain_month_day.h"
#include "rift/builtins/temporal/plain_time.h"
#include "rift/builtins/temporal/plain_year_month.h"
#include "rift/builtins/temporal/zoned_date_time.h"

// ============================================================================
// Temporal Proposal -- The Temporal Object (Section 1.1)
// @spec https://tc39.es/proposal-temporal/#sec-temporal-objects
//
// The Temporal namespace object that hosts all Temporal type constructors
// and the Temporal.Now utility object.
// ============================================================================

namespace rift::builtins {

// 1.1 The Temporal Object
// @spec https://tc39.es/proposal-temporal/#sec-temporal-objects
JSObject* Temporal::create(rift::memory::ObjectFactory* factory) {
    auto* temporal = factory->createJSObject();

    // 8 Temporal.Instant
    // @spec https://tc39.es/proposal-temporal/#sec-temporal-instant-objects
    auto* instant_ctor = TemporalInstant::create(factory);
    RIFT_PROPERTY(temporal, "Instant", Value(instant_ctor));

    // 7 Temporal.Duration
    // @spec https://tc39.es/proposal-temporal/#sec-temporal-duration-objects
    auto* duration_ctor = TemporalDuration::create(factory);
    RIFT_PROPERTY(temporal, "Duration", Value(duration_ctor));

    // 3 Temporal.PlainDate
    // @spec https://tc39.es/proposal-temporal/#sec-temporal-plaindate-objects
    auto* plain_date_ctor = TemporalPlainDate::create(factory);
    RIFT_PROPERTY(temporal, "PlainDate", Value(plain_date_ctor));

    // 4 Temporal.PlainTime
    // @spec https://tc39.es/proposal-temporal/#sec-temporal-plaintime-objects
    auto* plain_time_ctor = TemporalPlainTime::create(factory);
    RIFT_PROPERTY(temporal, "PlainTime", Value(plain_time_ctor));

    // 5 Temporal.PlainDateTime
    // @spec https://tc39.es/proposal-temporal/#sec-temporal-plaindatetime-objects
    auto* plain_date_time_ctor = TemporalPlainDateTime::create(factory);
    RIFT_PROPERTY(temporal, "PlainDateTime", Value(plain_date_time_ctor));

    // 9 Temporal.PlainYearMonth
    // @spec https://tc39.es/proposal-temporal/#sec-temporal-plainyearmonth-objects
    auto* plain_year_month_ctor = TemporalPlainYearMonth::create(factory);
    RIFT_PROPERTY(temporal, "PlainYearMonth", Value(plain_year_month_ctor));

    // 10 Temporal.PlainMonthDay
    // @spec https://tc39.es/proposal-temporal/#sec-temporal-plainmonthday-objects
    auto* plain_month_day_ctor = TemporalPlainMonthDay::create(factory);
    RIFT_PROPERTY(temporal, "PlainMonthDay", Value(plain_month_day_ctor));

    // 6 Temporal.ZonedDateTime
    // @spec https://tc39.es/proposal-temporal/#sec-temporal-zoneddatetime-objects
    auto* zoned_date_time_ctor = TemporalZonedDateTime::create(factory);
    RIFT_PROPERTY(temporal, "ZonedDateTime", Value(zoned_date_time_ctor));

    // 2 Temporal.Now
    // @spec https://tc39.es/proposal-temporal/#sec-temporal-now-object
    auto* now = TemporalNow::create(factory);
    RIFT_PROPERTY(temporal, "Now", Value(now));

    return temporal;
}

}  // namespace rift::builtins
