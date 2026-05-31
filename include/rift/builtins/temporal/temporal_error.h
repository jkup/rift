#pragma once

#include "temporal_rs/TemporalError.hpp"

namespace rift::builtins {

// NON-STANDARD: Internal helper to convert a temporal_rs::TemporalError into the
// appropriate JavaScript exception type (TypeError, RangeError, SyntaxError, or
// a generic Error) based on the error kind. Always throws; never returns.
[[noreturn]] void throwTemporalError(const temporal_rs::TemporalError& err);

}  // namespace rift::builtins
