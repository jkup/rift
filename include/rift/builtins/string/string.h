#pragma once

#include <algorithm>
#include <cctype>
#include <regex>
#include <string>
#include <vector>

#include "../../memory/object_factory.h"
#include "../builtin_base.h"
#include "rift/interpreter/call_context.h"
#include "rift/types/object.h"
#include "rift/types/value.h"

namespace rift::builtins {

using namespace rift::runtime;
using rift::core::CallContext;

/// 22.1 String Objects
/// @spec https://tc39.es/ecma262/#sec-string-objects
class String : public BuiltinBase<String> {
  public:
    /// Setup methods required by BuiltinBase template
    static void setupStaticMethods(JSObject* constructor, rift::memory::ObjectFactory* factory);
    static void setupPrototypeMethods(JSObject* prototype, rift::memory::ObjectFactory* factory);

    /// 22.1.1.1 String ( value )
    /// @spec https://tc39.es/ecma262/#sec-string-constructor-string-value
    static Value constructor(const CallContext& ctx, const std::vector<Value>& args);

    /// 22.1.2.1 String.fromCharCode ( ...codeUnits )
    /// @spec https://tc39.es/ecma262/#sec-string.fromcharcode
    static Value fromCharCode(const CallContext& ctx, const std::vector<Value>& args);

    // String prototype methods

    /// 22.1.3.2 String.prototype.charAt ( pos )
    /// @spec https://tc39.es/ecma262/#sec-string.prototype.charat
    static Value charAt(const CallContext& ctx, const std::vector<Value>& args);

    /// 22.1.3.3 String.prototype.charCodeAt ( pos )
    /// @spec https://tc39.es/ecma262/#sec-string.prototype.charcodeat
    static Value charCodeAt(const CallContext& ctx, const std::vector<Value>& args);

    /// 22.1.3.5 String.prototype.concat ( ...args )
    /// @spec https://tc39.es/ecma262/#sec-string.prototype.concat
    static Value concat(const CallContext& ctx, const std::vector<Value>& args);

    /// 22.1.3.9 String.prototype.indexOf ( searchString [ , position ] )
    /// @spec https://tc39.es/ecma262/#sec-string.prototype.indexof
    static Value indexOf(const CallContext& ctx, const std::vector<Value>& args);

    /// 22.1.3.11 String.prototype.lastIndexOf ( searchString [ , position ] )
    /// @spec https://tc39.es/ecma262/#sec-string.prototype.lastindexof
    static Value lastIndexOf(const CallContext& ctx, const std::vector<Value>& args);

    /// 22.1.3.22 String.prototype.slice ( start, end )
    /// @spec https://tc39.es/ecma262/#sec-string.prototype.slice
    static Value slice(const CallContext& ctx, const std::vector<Value>& args);

    /// 22.1.3.25 String.prototype.substring ( start, end )
    /// @spec https://tc39.es/ecma262/#sec-string.prototype.substring
    static Value substring(const CallContext& ctx, const std::vector<Value>& args);

    /// NON-STANDARD: Legacy Annex B method (not implemented)
    /// @spec https://tc39.es/ecma262/#sec-string.prototype.substr
    static Value substr(const CallContext& ctx, const std::vector<Value>& args);

    /// 22.1.3.30 String.prototype.toUpperCase ( )
    /// @spec https://tc39.es/ecma262/#sec-string.prototype.touppercase
    static Value toUpperCase(const CallContext& ctx, const std::vector<Value>& args);

    /// 22.1.3.28 String.prototype.toLowerCase ( )
    /// @spec https://tc39.es/ecma262/#sec-string.prototype.tolowercase
    static Value toLowerCase(const CallContext& ctx, const std::vector<Value>& args);

    /// 22.1.3.32 String.prototype.trim ( )
    /// @spec https://tc39.es/ecma262/#sec-string.prototype.trim
    static Value trim(const CallContext& ctx, const std::vector<Value>& args);

    /// 22.1.3.13 String.prototype.match ( regexp )
    /// @spec https://tc39.es/ecma262/#sec-string.prototype.match
    static Value match(const CallContext& ctx, const std::vector<Value>& args);

    /// 22.1.3.21 String.prototype.search ( regexp )
    /// @spec https://tc39.es/ecma262/#sec-string.prototype.search
    static Value search(const CallContext& ctx, const std::vector<Value>& args);

    /// 22.1.3.19 String.prototype.replace ( searchValue, replaceValue )
    /// @spec https://tc39.es/ecma262/#sec-string.prototype.replace
    static Value replace(const CallContext& ctx, const std::vector<Value>& args);

    /// 22.1.3.23 String.prototype.split ( separator, limit )
    /// @spec https://tc39.es/ecma262/#sec-string.prototype.split
    static Value split(const CallContext& ctx, const std::vector<Value>& args);

    /// 22.1.3.29 String.prototype.toString ( )
    /// @spec https://tc39.es/ecma262/#sec-string.prototype.tostring
    static Value toString(const CallContext& ctx, const std::vector<Value>& args);

    /// 22.1.3.35 String.prototype.valueOf ( )
    /// @spec https://tc39.es/ecma262/#sec-string.prototype.valueof
    static Value valueOf(const CallContext& ctx, const std::vector<Value>& args);

    /// 22.1.3.24 String.prototype.startsWith ( searchString [ , position ] )
    /// @spec https://tc39.es/ecma262/#sec-string.prototype.startswith
    static Value startsWith(const CallContext& ctx, const std::vector<Value>& args);

    /// 22.1.3.7 String.prototype.endsWith ( searchString [ , endPosition ] )
    /// @spec https://tc39.es/ecma262/#sec-string.prototype.endswith
    static Value endsWith(const CallContext& ctx, const std::vector<Value>& args);

    /// 22.1.3.8 String.prototype.includes ( searchString [ , position ] )
    /// @spec https://tc39.es/ecma262/#sec-string.prototype.includes
    static Value includes(const CallContext& ctx, const std::vector<Value>& args);

    /// 22.1.3.18 String.prototype.repeat ( count )
    /// @spec https://tc39.es/ecma262/#sec-string.prototype.repeat
    static Value repeat(const CallContext& ctx, const std::vector<Value>& args);

    /// 22.1.3.16 String.prototype.padStart ( maxLength [ , fillString ] )
    /// @spec https://tc39.es/ecma262/#sec-string.prototype.padstart
    static Value padStart(const CallContext& ctx, const std::vector<Value>& args);

    /// 22.1.3.15 String.prototype.padEnd ( maxLength [ , fillString ] )
    /// @spec https://tc39.es/ecma262/#sec-string.prototype.padend
    static Value padEnd(const CallContext& ctx, const std::vector<Value>& args);

    /// 22.1.3.33 String.prototype.trimStart ( )
    /// @spec https://tc39.es/ecma262/#sec-string.prototype.trimstart
    static Value trimStart(const CallContext& ctx, const std::vector<Value>& args);

    /// 22.1.3.34 String.prototype.trimEnd ( )
    /// @spec https://tc39.es/ecma262/#sec-string.prototype.trimend
    static Value trimEnd(const CallContext& ctx, const std::vector<Value>& args);

    /// 22.1.3.1 String.prototype.at ( index )
    /// @spec https://tc39.es/ecma262/#sec-string.prototype.at
    static Value at(const CallContext& ctx, const std::vector<Value>& args);

    /// 22.1.3.20 String.prototype.replaceAll ( searchValue, replaceValue )
    /// @spec https://tc39.es/ecma262/#sec-string.prototype.replaceall
    static Value replaceAll(const CallContext& ctx, const std::vector<Value>& args);

    /// 22.1.3.14 String.prototype.matchAll ( regexp )
    /// @spec https://tc39.es/ecma262/#sec-string.prototype.matchall
    static Value matchAll(const CallContext& ctx, const std::vector<Value>& args);

    /// 22.1.3.15 String.prototype.normalize ( [ form ] )
    /// @spec https://tc39.es/ecma262/#sec-string.prototype.normalize
    static Value normalize(const CallContext& ctx, const std::vector<Value>& args);

    /// 22.1.3.36 String.prototype [ @@iterator ] ( )
    /// @spec https://tc39.es/ecma262/#sec-string.prototype-%symbol.iterator%
    static Value symbolIterator(const CallContext& ctx, const std::vector<Value>& args);

    /// Get the object factory (needed by StringIterator)
    static rift::memory::ObjectFactory* getObjectFactory() {
        return BuiltinBase<String>::getObjectFactory();
    }

  private:
    /// NON-STANDARD: Helper for index validation
    static size_t validateStringIndex(const std::string& str, double index);

    /// NON-STANDARD: Helper to get the global String prototype
    static JSObject* getGlobalPrototype();
};

}  // namespace rift::builtins
