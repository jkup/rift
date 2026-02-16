#pragma once

#include "../../memory/object_factory.h"
#include "../../runtime/values/object.h"
#include "../../runtime/values/value.h"

namespace rift::builtins {

using namespace rift::runtime;

/// 1.1 The Temporal Object
/// @spec https://tc39.es/proposal-temporal/#sec-temporal-objects
///
/// Unlike most builtins, Temporal is a namespace (like Math), not a constructor.
/// It holds sub-constructors (Temporal.Instant, Temporal.Duration, etc.)
/// and the Temporal.Now namespace.
class Temporal {
  public:
    /// Creates the Temporal namespace object with all sub-properties attached.
    static JSObject* create(rift::memory::ObjectFactory* factory);
};

}  // namespace rift::builtins
