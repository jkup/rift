#pragma once

#include <cstddef>

namespace rift::core {

/**
 * Security and resource limits for the JavaScript runtime.
 *
 * These limits prevent denial-of-service attacks and resource exhaustion.
 */
class RuntimeLimits {
  public:
    // Maximum string length: 100 million characters (≈100 MB assuming 1 byte per character).
    // ECMAScript doesn't mandate a limit, but we need one for security.
    // Note: This is a character count limit; actual memory usage may vary with encoding.
    static constexpr size_t MAX_STRING_LENGTH = 100 * 1024 * 1024;

    // Maximum recursion depth (prevents stack overflow)
    static constexpr size_t MAX_RECURSION_DEPTH = 1000;

    // Maximum number of properties per object (prevents memory exhaustion)
    static constexpr size_t MAX_OBJECT_PROPERTIES = 100000;
};

}  // namespace rift::core
