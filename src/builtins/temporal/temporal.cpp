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

namespace rift::builtins {

JSObject* Temporal::create(rift::memory::ObjectFactory* factory) {
    auto* temporal = factory->createJSObject();

    // Attach Temporal.Instant constructor
    auto* instant_ctor = TemporalInstant::create(factory);
    RIFT_PROPERTY(temporal, "Instant", Value(instant_ctor));

    // Attach Temporal.Duration constructor
    auto* duration_ctor = TemporalDuration::create(factory);
    RIFT_PROPERTY(temporal, "Duration", Value(duration_ctor));

    // Attach Temporal.PlainDate constructor
    auto* plain_date_ctor = TemporalPlainDate::create(factory);
    RIFT_PROPERTY(temporal, "PlainDate", Value(plain_date_ctor));

    // Attach Temporal.PlainTime constructor
    auto* plain_time_ctor = TemporalPlainTime::create(factory);
    RIFT_PROPERTY(temporal, "PlainTime", Value(plain_time_ctor));

    // Attach Temporal.PlainDateTime constructor
    auto* plain_date_time_ctor = TemporalPlainDateTime::create(factory);
    RIFT_PROPERTY(temporal, "PlainDateTime", Value(plain_date_time_ctor));

    // Attach Temporal.PlainYearMonth constructor
    auto* plain_year_month_ctor = TemporalPlainYearMonth::create(factory);
    RIFT_PROPERTY(temporal, "PlainYearMonth", Value(plain_year_month_ctor));

    // Attach Temporal.PlainMonthDay constructor
    auto* plain_month_day_ctor = TemporalPlainMonthDay::create(factory);
    RIFT_PROPERTY(temporal, "PlainMonthDay", Value(plain_month_day_ctor));

    // Attach Temporal.ZonedDateTime constructor
    auto* zoned_date_time_ctor = TemporalZonedDateTime::create(factory);
    RIFT_PROPERTY(temporal, "ZonedDateTime", Value(zoned_date_time_ctor));

    // Attach Temporal.Now namespace
    auto* now = TemporalNow::create(factory);
    RIFT_PROPERTY(temporal, "Now", Value(now));

    return temporal;
}

}  // namespace rift::builtins
