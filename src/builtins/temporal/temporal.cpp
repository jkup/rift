#include "rift/builtins/temporal/temporal.h"

#include "rift/builtins/builtin_base.h"
#include "rift/builtins/temporal/instant.h"
#include "rift/builtins/temporal/now.h"

namespace rift::builtins {

JSObject* Temporal::create(rift::memory::ObjectFactory* factory) {
    auto* temporal = factory->createJSObject();

    // Attach Temporal.Instant constructor
    auto* instant_ctor = TemporalInstant::create(factory);
    RIFT_PROPERTY(temporal, "Instant", Value(instant_ctor));

    // Attach Temporal.Now namespace
    auto* now = TemporalNow::create(factory);
    RIFT_PROPERTY(temporal, "Now", Value(now));

    return temporal;
}

}  // namespace rift::builtins
