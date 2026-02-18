#pragma once

#include "rift/types/value.h"

namespace rift::core {

using rift::runtime::Value;

/**
 * Enum to distinguish between different types of function calls
 */
enum class CallType {
    Function,    // Regular function call: func()
    Constructor  // Constructor call: new func()
};

/**
 * Context information for function calls
 */
struct CallContext {
    CallType type = CallType::Function;
    Value thisValue = Value::undefined();

    CallContext() = default;
    CallContext(CallType callType, const Value& thisVal = Value::undefined())
        : type(callType), thisValue(thisVal) {
    }

    bool isConstructorCall() const {
        return type == CallType::Constructor;
    }
};

}  // namespace rift::core
