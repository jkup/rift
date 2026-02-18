#pragma once

#include <vector>

#include "../../memory/object_factory.h"
#include "../builtin_base.h"
#include "rift/interpreter/call_context.h"
#include "rift/types/object.h"
#include "rift/types/value.h"

namespace rift::builtins {

using namespace rift::runtime;
using rift::core::CallContext;

/// 21.1 Number Objects
/// @spec https://tc39.es/ecma262/#sec-number-objects
class Number : public BuiltinBase<Number> {
  public:
    /// 21.1.1.1 Number ( value )
    /// @spec https://tc39.es/ecma262/#sec-number-constructor-number-value
    static Value constructor(const CallContext& ctx, const std::vector<Value>& args);

    // ===== Static Methods (21.1.2 Properties of the Number Constructor) =====

    /// 21.1.2.4 Number.isNaN ( number )
    /// @spec https://tc39.es/ecma262/#sec-number.isnan
    static Value isNaN(const CallContext& ctx, const std::vector<Value>& args);

    /// 21.1.2.2 Number.isFinite ( number )
    /// @spec https://tc39.es/ecma262/#sec-number.isfinite
    static Value isFinite(const CallContext& ctx, const std::vector<Value>& args);

    /// 21.1.2.3 Number.isInteger ( number )
    /// @spec https://tc39.es/ecma262/#sec-number.isinteger
    static Value isInteger(const CallContext& ctx, const std::vector<Value>& args);

    /// 21.1.2.5 Number.isSafeInteger ( number )
    /// @spec https://tc39.es/ecma262/#sec-number.issafeinteger
    static Value isSafeInteger(const CallContext& ctx, const std::vector<Value>& args);

    /// 21.1.2.12 Number.parseFloat ( string )
    /// @spec https://tc39.es/ecma262/#sec-number.parsefloat
    static Value parseFloat(const CallContext& ctx, const std::vector<Value>& args);

    /// 21.1.2.13 Number.parseInt ( string, radix )
    /// @spec https://tc39.es/ecma262/#sec-number.parseint
    static Value parseInt(const CallContext& ctx, const std::vector<Value>& args);

    // ===== Prototype Methods (21.1.3 Properties of the Number Prototype Object) =====

    /// 21.1.3.6 Number.prototype.toString ( [ radix ] )
    /// @spec https://tc39.es/ecma262/#sec-number.prototype.tostring
    static Value toString(const CallContext& ctx, const std::vector<Value>& args);

    /// 21.1.3.7 Number.prototype.valueOf ( )
    /// @spec https://tc39.es/ecma262/#sec-number.prototype.valueof
    static Value valueOf(const CallContext& ctx, const std::vector<Value>& args);

    /// 21.1.3.3 Number.prototype.toFixed ( fractionDigits )
    /// @spec https://tc39.es/ecma262/#sec-number.prototype.tofixed
    static Value toFixed(const CallContext& ctx, const std::vector<Value>& args);

    /// 21.1.3.2 Number.prototype.toExponential ( fractionDigits )
    /// @spec https://tc39.es/ecma262/#sec-number.prototype.toexponential
    static Value toExponential(const CallContext& ctx, const std::vector<Value>& args);

    /// 21.1.3.5 Number.prototype.toPrecision ( precision )
    /// @spec https://tc39.es/ecma262/#sec-number.prototype.toprecision
    static Value toPrecision(const CallContext& ctx, const std::vector<Value>& args);

    /// Setup methods required by BuiltinBase template
    static void setupStaticMethods(JSObject* constructor, rift::memory::ObjectFactory* factory);
    static void setupPrototypeMethods(JSObject* prototype, rift::memory::ObjectFactory* factory);

  private:
    static JSObject* getGlobalPrototype();
};

}  // namespace rift::builtins
