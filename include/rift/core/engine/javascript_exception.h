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
    size_t line_ = 0;              // Source line (0 = unknown)
    size_t column_ = 0;            // Source column (0 = unknown)

    void buildMessage() {
        message_ = "Uncaught " + thrownValue_.toString();
        if(line_ > 0) {
            message_ += " at line " + std::to_string(line_);
            if(column_ > 0) {
                message_ += ":" + std::to_string(column_);
            }
        }
    }

  public:
    /// Construct exception with a thrown JavaScript value
    explicit JavaScriptException(const Value& value) : thrownValue_(value) {
        buildMessage();
    }

    /// Construct exception with a thrown JavaScript value and source location
    JavaScriptException(const Value& value, size_t line, size_t col = 0)
        : thrownValue_(value), line_(line), column_(col) {
        buildMessage();
    }

    /// Get the thrown JavaScript value
    const Value& getValue() const {
        return thrownValue_;
    }

    /// Get source line number (0 = unknown)
    size_t getLine() const {
        return line_;
    }

    /// Get source column number (0 = unknown)
    size_t getColumn() const {
        return column_;
    }

    /// Check if this exception has source location info
    bool hasLocation() const {
        return line_ > 0;
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

/// Exception for handling continue statements
class ContinueException : public std::exception {
  public:
    const char* what() const noexcept override {
        return "Continue statement";
    }
};

/// Exception for handling yield expressions in generators
/// This is thrown when a yield is encountered and caught by the generator's next() method
class YieldException : public std::exception {
  private:
    Value yieldedValue_;     // The value being yielded
    int yieldPointId_;       // Unique ID of this yield point
    int statementIndex_;     // Index of statement in the block

  public:
    YieldException(const Value& value, int yieldPointId, int statementIndex)
        : yieldedValue_(value), yieldPointId_(yieldPointId), statementIndex_(statementIndex) {
    }

    /// Get the yielded value
    const Value& getValue() const {
        return yieldedValue_;
    }

    /// Get the yield point ID for resumption
    int getYieldPointId() const {
        return yieldPointId_;
    }

    /// Get the statement index for resumption
    int getStatementIndex() const {
        return statementIndex_;
    }

    const char* what() const noexcept override {
        return "Yield expression";
    }
};

}  // namespace rift::core