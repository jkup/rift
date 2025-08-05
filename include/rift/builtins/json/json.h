#pragma once

#include <memory>
#include <vector>

#include "rift/runtime/values/value.h"
#include "rift/runtime/environment/environment.h"

namespace rift::core {
class Rift;
}

namespace rift::builtins {

using namespace rift::runtime;

/// JSON object implementation
/// Provides JSON.parse() and JSON.stringify() methods for serialization
class JSON {
  public:
    /// Setup JSON object in global environment
    /// Creates the JSON global object with parse and stringify methods
    static void setup(std::shared_ptr<Environment> env, rift::core::Rift* engine);

    /// JSON.parse(text[, reviver])
    /// Parses a JSON string and returns the JavaScript value
    /// @param args[0] - String to parse as JSON
    /// @param args[1] - Optional reviver function (not implemented)
    /// @returns Parsed JavaScript value
    /// @throws SyntaxError for invalid JSON
    static Value parse(const std::vector<Value>& args);

    /// JSON.stringify(value[, replacer[, space]])
    /// Converts a JavaScript value to a JSON string
    /// @param args[0] - Value to stringify
    /// @param args[1] - Optional replacer function/array (not implemented)
    /// @param args[2] - Optional space parameter for formatting (not implemented)
    /// @returns JSON string representation
    static Value stringify(const std::vector<Value>& args);

  private:
    /// Parse JSON string recursively
    /// @param json JSON string to parse
    /// @param pos Current position in string (modified during parsing)
    /// @returns Parsed JavaScript value
    static Value parseValue(const std::string& json, size_t& pos);
    
    /// Parse JSON object
    static Value parseObject(const std::string& json, size_t& pos);
    
    /// Parse JSON array
    static Value parseArray(const std::string& json, size_t& pos);
    
    /// Parse JSON string literal
    static Value parseString(const std::string& json, size_t& pos);
    
    /// Parse JSON number
    static Value parseNumber(const std::string& json, size_t& pos);
    
    /// Skip whitespace in JSON string
    static void skipWhitespace(const std::string& json, size_t& pos);
    
    /// Stringify JavaScript value recursively
    /// @param value Value to stringify
    /// @returns JSON string representation
    static std::string stringifyValue(const Value& value);
    
    /// Escape string for JSON output
    static std::string escapeString(const std::string& str);
};

}  // namespace rift::builtins