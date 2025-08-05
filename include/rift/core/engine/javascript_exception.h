#pragma once

#include <exception>
#include <string>

#include "../../runtime/values/value.h"

namespace rift::core {

using namespace rift::runtime;

/// JavaScript exception class for handling thrown values
/// This exception carries a JavaScript value that can be caught and handled
class JavaScriptException : public std::exception {
  private:
    Value thrownValue_;
    mutable std::string message_;  // Cache the string representation

  public:
    /// Construct exception with a thrown JavaScript value
    explicit JavaScriptException(const Value& value) : thrownValue_(value) {
        message_ = "Uncaught " + thrownValue_.toString();
    }

    /// Get the thrown JavaScript value
    const Value& getValue() const {
        return thrownValue_;
    }

    /// Get the error message for debugging
    const char* what() const noexcept override {
        return message_.c_str();
    }
};

/// Exception for handling return statements (keeping existing functionality)
class ReturnException : public std::exception {
  private:
    Value returnValue_;

  public:
    explicit ReturnException(const Value& value) : returnValue_(value) {
    }
    const Value& getValue() const {
        return returnValue_;
    }
    const char* what() const noexcept override {
        return "Return statement";
    }
};

/// Exception for handling break statements
class BreakException : public std::exception {
  public:
    const char* what() const noexcept override {
        return "Break statement";
    }
};

}  // namespace rift::core