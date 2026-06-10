#pragma once

#include <cmath>
#include <cstring>
#include <iomanip>
#include <sstream>
#include <string>
#include <vector>

#include "call_context.h"
#include "rift/types/value.h"

namespace rift::core {

using namespace rift::runtime;

namespace EvaluationUtils {

// Maximum safe array length per ECMAScript spec (2^32 - 1)
constexpr size_t MAX_ARRAY_LENGTH = 4294967295ULL;

/**
 * Safely convert a double to size_t for array operations.
 * Returns false if the value is invalid (NaN, Infinity, negative, or > MAX_ARRAY_LENGTH).
 * @param value The double value to convert
 * @param result Output parameter for the converted size_t
 * @return true if conversion is safe, false otherwise
 */
inline bool toSafeArrayLength(double value, size_t& result) {
    // Check for invalid values
    if(!std::isfinite(value) || value < 0.0 || value > static_cast<double>(MAX_ARRAY_LENGTH)) {
        return false;
    }

    // Truncate to integer (matches ECMAScript ToLength behavior)
    result = static_cast<size_t>(value);
    return true;
}

/**
 * Check if a double value is a valid array length per ECMAScript spec.
 * A valid array length is a non-negative integer <= 2^32 - 1.
 * ToUint32(len) must equal len (i.e., len must be a non-negative integer in range).
 * @param value The double value to check
 * @return true if value is a valid array length
 */
inline bool isValidArrayLength(double value) {
    if(!std::isfinite(value) || value < 0.0 || value > static_cast<double>(MAX_ARRAY_LENGTH)) {
        return false;
    }
    // Must be an integer (ToUint32(len) === len)
    double intpart;
    if(std::modf(value, &intpart) != 0.0) {
        return false;
    }
    return true;
}

/**
 * Safely increment a size_t index, checking for overflow.
 * @param index The index to increment
 * @param result Output parameter for index + 1
 * @return true if increment is safe (no overflow), false otherwise
 */
inline bool safeIncrementIndex(size_t index, size_t& result) {
    // Check if incrementing would overflow or exceed max array length
    if(index >= MAX_ARRAY_LENGTH) {
        return false;
    }
    result = index + 1;
    return true;
}

/**
 * Safely check if a property name is a valid array index and convert it
 * According to ECMAScript specification:
 * - A property name P is an array index if ToString(ToUint32(P)) is equal to P
 *   and ToUint32(P) is not equal to 2^32 - 1
 * @param property The property string to check
 * @param index Output parameter for the converted index
 * @return true if property is a valid array index, false otherwise
 */
inline bool isValidArrayIndex(const std::string& property, size_t& index) {
    // Empty string is not a valid array index
    if(property.empty()) {
        return false;
    }

    // Must not start with leading zeros (except "0" itself)
    if(property.length() > 1 && property[0] == '0') {
        return false;
    }

    // Must contain only digits
    for(char c : property) {
        if(c < '0' || c > '9') {
            return false;
        }
    }

    // Safe conversion: check length first to prevent overflow
    // Maximum safe value is 2^32 - 2 = 4294967294
    // This has at most 10 digits
    if(property.length() > 10) {
        return false;
    }

    // For 10 digits, check if it's <= 4294967294
    if(property.length() == 10) {
        // "4294967294" is the maximum valid array index
        if(property > "4294967294") {
            return false;
        }
    }

    // Safe to convert now
    try {
        unsigned long long ull = std::stoull(property);

        // Check if it's within the valid range for array indices
        // Must be < 2^32 - 1 (4294967295)
        if(ull >= 4294967295ULL) {
            return false;
        }

        index = static_cast<size_t>(ull);
        return true;
    } catch(const std::exception&) {
        // Any conversion error means invalid index
        return false;
    }
}

/**
 * Convert a JavaScript value to a property key string.
 * Ensures that numeric values are converted without scientific notation
 * so that array index detection works correctly for large indices.
 */
inline std::string toPropertyKeyString(const Value& value) {
    if(value.isNumber()) {
        double num = value.toNumber();
        if(!std::isfinite(num)) {
            return value.toString();
        }
        // If integer within the double-exact range (|x| < 2^53), format as a
        // plain integer string. Beyond that, ToString(Number) semantics apply
        // (e.g. 1e21 -> "1e+21") and the long long cast would overflow.
        double intpart;
        if(std::modf(num, &intpart) == 0.0 && std::abs(intpart) < 9007199254740992.0) {
            long long asInt = static_cast<long long>(intpart);
            return std::to_string(asInt);
        }
        // For non-integers, fall back to a non-scientific representation with sufficient precision
        std::ostringstream oss;
        oss.setf(std::ios::fmtflags(0), std::ios::floatfield);  // clear floatfield
        oss << std::setprecision(15) << num;
        return oss.str();
    }
    return value.toString();
}

// Symbol property key prefix - used to store symbol-keyed properties as strings internally
constexpr const char* SYMBOL_KEY_PREFIX = "@@sym:";

/**
 * Convert a symbol ID to an internal property key string.
 * Uses a special prefix to distinguish symbol keys from string keys.
 */
inline std::string symbolToPropertyKey(uint64_t symbol_id) {
    return std::string(SYMBOL_KEY_PREFIX) + std::to_string(symbol_id);
}

/**
 * Check if a property key string represents a symbol key.
 */
inline bool isSymbolPropertyKey(const std::string& key) {
    return key.rfind(SYMBOL_KEY_PREFIX, 0) == 0;
}

/**
 * Extract the symbol ID from a symbol property key string.
 * Returns 0 if the key is not a valid symbol property key.
 */
inline uint64_t symbolIdFromPropertyKey(const std::string& key) {
    if(!isSymbolPropertyKey(key)) {
        return 0;
    }
    try {
        return std::stoull(key.substr(strlen(SYMBOL_KEY_PREFIX)));
    } catch(const std::exception&) {
        return 0;
    }
}
}  // namespace EvaluationUtils

}  // namespace rift::core