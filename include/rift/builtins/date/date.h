#pragma once

#include <vector>

#include "../../core/engine/call_context.h"
#include "../../memory/object_factory.h"
#include "../../runtime/values/object.h"
#include "../../runtime/values/value.h"
#include "../builtin_base.h"

namespace rift::builtins {

using namespace rift::runtime;
using rift::core::CallContext;

/// 21.4 Date Objects
/// @spec https://tc39.es/ecma262/#sec-date-objects
class Date : public BuiltinBase<Date> {
  public:
    /// 21.4.2.1 Date ( ...values )
    /// @spec https://tc39.es/ecma262/#sec-date
    static Value constructor(const CallContext& ctx, const std::vector<Value>& args);

    // ===== Static Methods (21.4.3 Properties of the Date Constructor) =====

    /// 21.4.3.1 Date.now ( )
    /// @spec https://tc39.es/ecma262/#sec-date.now
    static Value now(const CallContext& ctx, const std::vector<Value>& args);

    /// 21.4.3.2 Date.parse ( string )
    /// @spec https://tc39.es/ecma262/#sec-date.parse
    static Value parse(const CallContext& ctx, const std::vector<Value>& args);

    /// 21.4.3.4 Date.UTC ( year [ , month [ , date [ , hours [ , minutes [ , seconds [ , ms ] ] ]
    /// ] ] ] )
    /// @spec https://tc39.es/ecma262/#sec-date.utc
    static Value UTC(const CallContext& ctx, const std::vector<Value>& args);

    // ===== Prototype Getters (21.4.4 Properties of the Date Prototype Object) =====

    /// 21.4.4.2 Date.prototype.getDate ( )
    static Value getDate(const CallContext& ctx, const std::vector<Value>& args);
    /// 21.4.4.3 Date.prototype.getDay ( )
    static Value getDay(const CallContext& ctx, const std::vector<Value>& args);
    /// 21.4.4.4 Date.prototype.getFullYear ( )
    static Value getFullYear(const CallContext& ctx, const std::vector<Value>& args);
    /// 21.4.4.5 Date.prototype.getHours ( )
    static Value getHours(const CallContext& ctx, const std::vector<Value>& args);
    /// 21.4.4.6 Date.prototype.getMilliseconds ( )
    static Value getMilliseconds(const CallContext& ctx, const std::vector<Value>& args);
    /// 21.4.4.7 Date.prototype.getMinutes ( )
    static Value getMinutes(const CallContext& ctx, const std::vector<Value>& args);
    /// 21.4.4.8 Date.prototype.getMonth ( )
    static Value getMonth(const CallContext& ctx, const std::vector<Value>& args);
    /// 21.4.4.9 Date.prototype.getSeconds ( )
    static Value getSeconds(const CallContext& ctx, const std::vector<Value>& args);
    /// 21.4.4.10 Date.prototype.getTime ( )
    static Value getTime(const CallContext& ctx, const std::vector<Value>& args);
    /// 21.4.4.11 Date.prototype.getTimezoneOffset ( )
    static Value getTimezoneOffset(const CallContext& ctx, const std::vector<Value>& args);
    /// 21.4.4.12 Date.prototype.getUTCDate ( )
    static Value getUTCDate(const CallContext& ctx, const std::vector<Value>& args);
    /// 21.4.4.13 Date.prototype.getUTCDay ( )
    static Value getUTCDay(const CallContext& ctx, const std::vector<Value>& args);
    /// 21.4.4.14 Date.prototype.getUTCFullYear ( )
    static Value getUTCFullYear(const CallContext& ctx, const std::vector<Value>& args);
    /// 21.4.4.15 Date.prototype.getUTCHours ( )
    static Value getUTCHours(const CallContext& ctx, const std::vector<Value>& args);
    /// 21.4.4.16 Date.prototype.getUTCMilliseconds ( )
    static Value getUTCMilliseconds(const CallContext& ctx, const std::vector<Value>& args);
    /// 21.4.4.17 Date.prototype.getUTCMinutes ( )
    static Value getUTCMinutes(const CallContext& ctx, const std::vector<Value>& args);
    /// 21.4.4.18 Date.prototype.getUTCMonth ( )
    static Value getUTCMonth(const CallContext& ctx, const std::vector<Value>& args);
    /// 21.4.4.19 Date.prototype.getUTCSeconds ( )
    static Value getUTCSeconds(const CallContext& ctx, const std::vector<Value>& args);

    // ===== Prototype Setters =====

    /// 21.4.4.20 Date.prototype.setDate ( date )
    static Value setDate(const CallContext& ctx, const std::vector<Value>& args);
    /// 21.4.4.21 Date.prototype.setFullYear ( year [ , month [ , date ] ] )
    static Value setFullYear(const CallContext& ctx, const std::vector<Value>& args);
    /// 21.4.4.22 Date.prototype.setHours ( hour [ , min [ , sec [ , ms ] ] ] )
    static Value setHours(const CallContext& ctx, const std::vector<Value>& args);
    /// 21.4.4.23 Date.prototype.setMilliseconds ( ms )
    static Value setMilliseconds(const CallContext& ctx, const std::vector<Value>& args);
    /// 21.4.4.24 Date.prototype.setMinutes ( min [ , sec [ , ms ] ] )
    static Value setMinutes(const CallContext& ctx, const std::vector<Value>& args);
    /// 21.4.4.25 Date.prototype.setMonth ( month [ , date ] )
    static Value setMonth(const CallContext& ctx, const std::vector<Value>& args);
    /// 21.4.4.26 Date.prototype.setSeconds ( sec [ , ms ] )
    static Value setSeconds(const CallContext& ctx, const std::vector<Value>& args);
    /// 21.4.4.27 Date.prototype.setTime ( time )
    static Value setTime(const CallContext& ctx, const std::vector<Value>& args);
    /// 21.4.4.28 Date.prototype.setUTCDate ( date )
    static Value setUTCDate(const CallContext& ctx, const std::vector<Value>& args);
    /// 21.4.4.29 Date.prototype.setUTCFullYear ( year [ , month [ , date ] ] )
    static Value setUTCFullYear(const CallContext& ctx, const std::vector<Value>& args);
    /// 21.4.4.30 Date.prototype.setUTCHours ( hour [ , min [ , sec [ , ms ] ] ] )
    static Value setUTCHours(const CallContext& ctx, const std::vector<Value>& args);
    /// 21.4.4.31 Date.prototype.setUTCMilliseconds ( ms )
    static Value setUTCMilliseconds(const CallContext& ctx, const std::vector<Value>& args);
    /// 21.4.4.32 Date.prototype.setUTCMinutes ( min [ , sec [ , ms ] ] )
    static Value setUTCMinutes(const CallContext& ctx, const std::vector<Value>& args);
    /// 21.4.4.33 Date.prototype.setUTCMonth ( month [ , date ] )
    static Value setUTCMonth(const CallContext& ctx, const std::vector<Value>& args);
    /// 21.4.4.34 Date.prototype.setUTCSeconds ( sec [ , ms ] )
    static Value setUTCSeconds(const CallContext& ctx, const std::vector<Value>& args);

    // ===== Conversion Methods =====

    /// 21.4.4.35 Date.prototype.toDateString ( )
    static Value toDateString(const CallContext& ctx, const std::vector<Value>& args);
    /// 21.4.4.36 Date.prototype.toISOString ( )
    static Value toISOString(const CallContext& ctx, const std::vector<Value>& args);
    /// 21.4.4.37 Date.prototype.toJSON ( key )
    static Value toJSON(const CallContext& ctx, const std::vector<Value>& args);
    /// 21.4.4.38 Date.prototype.toLocaleDateString ( )
    static Value toLocaleDateString(const CallContext& ctx, const std::vector<Value>& args);
    /// 21.4.4.39 Date.prototype.toLocaleString ( )
    static Value toLocaleString(const CallContext& ctx, const std::vector<Value>& args);
    /// 21.4.4.40 Date.prototype.toLocaleTimeString ( )
    static Value toLocaleTimeString(const CallContext& ctx, const std::vector<Value>& args);
    /// 21.4.4.41 Date.prototype.toString ( )
    static Value toString(const CallContext& ctx, const std::vector<Value>& args);
    /// 21.4.4.42 Date.prototype.toTimeString ( )
    static Value toTimeString(const CallContext& ctx, const std::vector<Value>& args);
    /// 21.4.4.43 Date.prototype.toUTCString ( )
    static Value toUTCString(const CallContext& ctx, const std::vector<Value>& args);
    /// 21.4.4.44 Date.prototype.valueOf ( )
    static Value valueOf(const CallContext& ctx, const std::vector<Value>& args);
    /// 21.4.4.45 Date.prototype [ @@toPrimitive ] ( hint )
    static Value toPrimitive(const CallContext& ctx, const std::vector<Value>& args);

    /// Setup methods required by BuiltinBase template
    static void setupStaticMethods(JSObject* constructor, rift::memory::ObjectFactory* factory);
    static void setupPrototypeMethods(JSObject* prototype, rift::memory::ObjectFactory* factory);

  private:
    static JSObject* getGlobalPrototype();
};

}  // namespace rift::builtins
