#pragma once

#include <string>

#include "../../memory/object_factory.h"
#include "rift/execution/environment.h"
#include "rift/types/value.h"

namespace rift::builtins {

using namespace rift::runtime;

/// 19 The Global Object
/// @spec https://tc39.es/ecma262/#sec-global-object
class Global {
  public:
    /// NON-STANDARD: Registers global functions (parseInt, parseFloat, etc.) into the environment.
    static void setupGlobalFunctions(std::shared_ptr<Environment> global_env,
                                     rift::memory::ObjectFactory* factory);

  private:
    /// 19.2.5 parseInt ( string, radix )
    /// @spec https://tc39.es/ecma262/#sec-parseint-string-radix
    static Value parseInt(const std::vector<Value>& args);

    /// 19.2.4 parseFloat ( string )
    /// @spec https://tc39.es/ecma262/#sec-parsefloat-string
    static Value parseFloat(const std::vector<Value>& args);

    /// 19.2.3 isNaN ( number )
    /// @spec https://tc39.es/ecma262/#sec-isnan-number
    static Value isNaN(const std::vector<Value>& args);

    /// 19.2.2 isFinite ( number )
    /// @spec https://tc39.es/ecma262/#sec-isfinite-number
    static Value isFinite(const std::vector<Value>& args);

    /// 19.2.6.1 encodeURI ( uri )
    /// @spec https://tc39.es/ecma262/#sec-encodeuri-uri
    static Value encodeURI(const std::vector<Value>& args);

    /// 19.2.6.2 encodeURIComponent ( uriComponent )
    /// @spec https://tc39.es/ecma262/#sec-encodeuricomponent-uricomponent
    static Value encodeURIComponent(const std::vector<Value>& args);

    /// 19.2.6.3 decodeURI ( encodedURI )
    /// @spec https://tc39.es/ecma262/#sec-decodeuri-encodeduri
    static Value decodeURI(const std::vector<Value>& args);

    /// 19.2.6.4 decodeURIComponent ( encodedURIComponent )
    /// @spec https://tc39.es/ecma262/#sec-decodeuricomponent-encodeduricomponent
    static Value decodeURIComponent(const std::vector<Value>& args);

    /// NON-STANDARD: Internal helpers for parseInt digit parsing.
    static bool isValidDigit(char c, int radix);
    static int getDigitValue(char c);

    /// B.2.1 escape ( string )
    /// @spec https://tc39.es/ecma262/#sec-escape-string
    static Value escape(const std::vector<Value>& args);

    /// B.2.2 unescape ( string )
    /// @spec https://tc39.es/ecma262/#sec-unescape-string
    static Value unescape(const std::vector<Value>& args);

    /// Internal helpers for URI encoding/decoding.
    static std::string encodeHelper(const std::string& str, const std::string& unescaped);
    static std::string decodeHelper(const std::string& str, const std::string& reserved_set);
    static int hexDigitValue(char c);
};

}  // namespace rift::builtins