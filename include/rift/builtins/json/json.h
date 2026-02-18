#pragma once

#include <memory>
#include <vector>

#include "rift/execution/environment.h"
#include "rift/types/value.h"

namespace rift::core {
class Rift;
}

namespace rift::memory {
class ObjectFactory;
}

namespace rift::builtins {

using namespace rift::runtime;

/// 25.5 The JSON Object
/// @spec https://tc39.es/ecma262/#sec-json-object
class JSON {
  public:
    /// Setup JSON object in global environment
    static void setup(std::shared_ptr<Environment> env, rift::core::Rift* engine);

    /// 25.5.1 JSON.parse ( text [ , reviver ] )
    /// @spec https://tc39.es/ecma262/#sec-json.parse
    static Value parse(const std::vector<Value>& args, rift::memory::ObjectFactory* factory);

    /// 25.5.2 JSON.stringify ( value [ , replacer [ , space ] ] )
    /// @spec https://tc39.es/ecma262/#sec-json.stringify
    static Value stringify(const std::vector<Value>& args);

  private:
    /// 25.5.1.1 ParseJSON ( text ) — internal recursive parser
    /// @spec https://tc39.es/ecma262/#sec-parsejson
    static Value parseValue(const std::string& json, size_t& pos,
                            rift::memory::ObjectFactory* factory);

    /// NON-STANDARD: Internal helper for parsing JSON object literals
    static Value parseObject(const std::string& json, size_t& pos,
                             rift::memory::ObjectFactory* factory);

    /// NON-STANDARD: Internal helper for parsing JSON array literals
    static Value parseArray(const std::string& json, size_t& pos,
                            rift::memory::ObjectFactory* factory);

    /// NON-STANDARD: Internal helper for parsing JSON string literals
    static Value parseString(const std::string& json, size_t& pos);

    /// NON-STANDARD: Internal helper for parsing JSON number literals
    static Value parseNumber(const std::string& json, size_t& pos);

    /// NON-STANDARD: Internal helper to skip whitespace in JSON input
    static void skipWhitespace(const std::string& json, size_t& pos);

    /// 25.5.2.1 SerializeJSONProperty ( state, key, holder )
    /// @spec https://tc39.es/ecma262/#sec-serializejsonproperty
    static std::string stringifyValue(const Value& value);

    /// 25.5.2.2 QuoteJSONString ( value )
    /// @spec https://tc39.es/ecma262/#sec-quotejsonstring
    static std::string escapeString(const std::string& str);
};

}  // namespace rift::builtins
