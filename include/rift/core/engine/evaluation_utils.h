#pragma once

#include <string>
#include <vector>

#include "../../runtime/values/value.h"

namespace rift::core {

using namespace rift::runtime;

/**
 * Constants for function call handling
 */
namespace EvaluationConstants {
constexpr const char* CONSTRUCTOR_CALL_MARKER = "__CONSTRUCTOR_CALL__";
}

/**
 * Result of parsing constructor call arguments
 */
struct ConstructorCallInfo {
    bool isConstructorCall = false;
    Value thisValue = Value::undefined();
    size_t argOffset = 0;
};

/**
 * Utility functions for shared evaluation logic
 */
namespace EvaluationUtils {
/**
 * Parse constructor call arguments and extract 'this' context
 * @param args Function arguments vector
 * @return ConstructorCallInfo with parsed information
 */
inline ConstructorCallInfo parseConstructorCall(const std::vector<Value>& args) {
    ConstructorCallInfo info;

    // Check if this is a constructor call
    if(!args.empty() && args[0].isString() &&
       args[0].getString() == EvaluationConstants::CONSTRUCTOR_CALL_MARKER) {
        info.isConstructorCall = true;
        info.argOffset = 1;

        // The next argument should be the 'this' object
        if(args.size() > 1) {
            info.thisValue = args[1];
            info.argOffset = 2;
        }
    }

    return info;
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
}  // namespace EvaluationUtils

}  // namespace rift::core