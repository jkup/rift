#pragma once

#include <string>
#include <vector>

#include "../../runtime/values/value.h"

namespace rift::core {

using namespace rift::runtime;

/**
 * Constants for backward compatibility during migration
 * @deprecated These constants are kept only for backward compatibility
 * and will be removed once the migration to CallContext is complete.
 */
namespace EvaluationConstants {
constexpr const char* CONSTRUCTOR_CALL_MARKER = "__CONSTRUCTOR_CALL__";
}

/**
 * Enum to distinguish between different types of function calls
 */
enum class CallType {
    Function,      // Regular function call: func()
    Constructor    // Constructor call: new func()
};

/**
 * Context information for function calls
 */
struct CallContext {
    CallType type = CallType::Function;
    Value thisValue = Value::undefined();
    
    // Constructor for function calls
    CallContext() = default;
    
    // Constructor for constructor calls with this value
    CallContext(CallType callType, const Value& thisVal = Value::undefined()) 
        : type(callType), thisValue(thisVal) {}
    
    bool isConstructorCall() const {
        return type == CallType::Constructor;
    }
};

/**
 * Utility functions for shared evaluation logic
 */
namespace EvaluationUtils {

/**
 * Backward compatibility: Parse old-style constructor call arguments and convert to CallContext
 * @param args Function arguments vector (may contain magic string marker)
 * @param realArgs Output vector with real arguments (marker removed)
 * @return CallContext with call type and this value
 */
inline CallContext parseCallContext(const std::vector<Value>& args, std::vector<Value>& realArgs) {
    // Check for old magic string marker format (for backward compatibility)
    if(!args.empty() && args[0].isString() &&
       args[0].getString() == EvaluationConstants::CONSTRUCTOR_CALL_MARKER) {
        
        // This is a constructor call with magic marker
        Value thisValue = Value::undefined();
        if(args.size() > 1) {
            thisValue = args[1];
        }
        
        // Copy real arguments (skip marker and this value)
        realArgs.clear();
        for(size_t i = 2; i < args.size(); ++i) {
            realArgs.push_back(args[i]);
        }
        
        return CallContext(CallType::Constructor, thisValue);
    } else {
        // Regular function call - copy all arguments as-is
        realArgs = args;
        return CallContext(CallType::Function);
    }
}

/**
 * New preferred API: Extract real arguments for a given call context
 * @param callContext The call context
 * @param args The function arguments
 * @return Vector of real arguments (excluding context information)
 */
inline std::vector<Value> extractRealArgs(const CallContext& callContext, const std::vector<Value>& args) {
    // With the new API, args should always be real arguments
    // This function exists for consistency and future extensibility
    return args;
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