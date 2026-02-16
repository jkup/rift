#pragma once

#include <string>

#include "../../memory/object_factory.h"
#include "../../runtime/environment/environment.h"
#include "../../runtime/values/value.h"

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

    /// NON-STANDARD: Internal helper to create array objects in the current runtime.
    static Value createArray(const std::vector<Value>& args);

    /// NON-STANDARD: Internal helpers for parseInt digit parsing.
    static bool isValidDigit(char c, int radix);
    static int getDigitValue(char c);
};

}  // namespace rift::builtins