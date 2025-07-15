#pragma once

#include <vector>
#include <string>
#include "../../runtime/values/value.h"

namespace rift::core {

using namespace rift::runtime;

/**
 * Constants for function call handling
 */
namespace EvaluationConstants {
    static const std::string CONSTRUCTOR_CALL_MARKER = "__CONSTRUCTOR_CALL__";
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
        if (!args.empty() && args[0].isString() && 
            args[0].getString() == EvaluationConstants::CONSTRUCTOR_CALL_MARKER) {
            info.isConstructorCall = true;
            info.argOffset = 1;
            
            // The next argument should be the 'this' object
            if (args.size() > 1) {
                info.thisValue = args[1];
                info.argOffset = 2;
            }
        }
        
        return info;
    }
}

}  // namespace rift::core 