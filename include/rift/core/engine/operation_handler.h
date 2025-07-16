#pragma once

#include <string>

#include "../../runtime/values/value.h"

namespace rift::core {

using namespace rift::runtime;

class OperationHandler {
  public:
    // Binary operation handler
    static Value performBinaryOperation(const std::string& op, const Value& left,
                                        const Value& right);

    // Unary operation handler
    static Value performUnaryOperation(const std::string& op, const Value& operand);
};

}  // namespace rift::core