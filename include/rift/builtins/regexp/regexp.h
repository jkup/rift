#pragma once

#include <memory>
#include <string>
#include <unordered_map>
#include <vector>

#include "../../memory/object_factory.h"
#include "../builtin_base.h"
#include "re2/re2.h"
#include "rift/interpreter/call_context.h"
#include "rift/types/object.h"
#include "rift/types/value.h"

namespace rift::builtins {

using namespace rift::runtime;
using rift::core::CallContext;

/// NON-STANDARD: Internal class to store regex state. Rift's equivalent of the spec's
/// [[OriginalSource]], [[OriginalFlags]], and [[RegExpMatcher]] internal slots.
class RegExpData {
  public:
    std::string pattern;
    std::string flags;
    std::unique_ptr<RE2> regex;
    bool global;
    bool ignoreCase;
    bool multiline;
    int lastIndex;

    RegExpData(const std::string& p, const std::string& f);
};

/// NON-STANDARD: Registry to manage RegExpData lifecycle. Maps JSObject* to RegExpData
/// to avoid unsafe pointer casting. Not part of ECMA-262 (the spec uses internal slots).
class RegExpRegistry {
  private:
    static std::unordered_map<JSObject*, std::unique_ptr<RegExpData>> registry_;

  public:
    static void store(JSObject* obj, std::unique_ptr<RegExpData> data);
    static RegExpData* get(JSObject* obj);
    static void remove(JSObject* obj);
    static void clear();
};

/// 22.2 RegExp (Regular Expression) Objects
/// @spec https://tc39.es/ecma262/#sec-regexp-regular-expression-objects
class RegExp : public BuiltinBase<RegExp> {
  public:
    /// 22.2.3.1 RegExp ( pattern, flags )
    /// @spec https://tc39.es/ecma262/#sec-regexp-pattern-flags
    static Value constructor(const CallContext& ctx, const std::vector<Value>& args);

    /// 22.2.6.14 RegExp.prototype.test ( S )
    /// @spec https://tc39.es/ecma262/#sec-regexp.prototype.test
    static Value test(const CallContext& ctx, const std::vector<Value>& args);

    /// 22.2.6.2 RegExp.prototype.exec ( string )
    /// @spec https://tc39.es/ecma262/#sec-regexp.prototype.exec
    static Value exec(const CallContext& ctx, const std::vector<Value>& args);

    /// 22.2.6.16 RegExp.prototype.toString ( )
    /// @spec https://tc39.es/ecma262/#sec-regexp.prototype.tostring
    static Value toString(const CallContext& ctx, const std::vector<Value>& args);

    /// 22.2.6.8 RegExp.prototype [ @@match ] ( string )
    /// @spec https://tc39.es/ecma262/#sec-regexp.prototype-@@match
    static Value symbolMatch(const CallContext& ctx, const std::vector<Value>& args);

    /// 22.2.6.11 RegExp.prototype [ @@replace ] ( string, replaceValue )
    /// @spec https://tc39.es/ecma262/#sec-regexp.prototype-@@replace
    static Value symbolReplace(const CallContext& ctx, const std::vector<Value>& args);

    /// 22.2.6.12 RegExp.prototype [ @@search ] ( string )
    /// @spec https://tc39.es/ecma262/#sec-regexp.prototype-@@search
    static Value symbolSearch(const CallContext& ctx, const std::vector<Value>& args);

    /// 22.2.6.15 RegExp.prototype [ @@split ] ( string, limit )
    /// @spec https://tc39.es/ecma262/#sec-regexp.prototype-@@split
    static Value symbolSplit(const CallContext& ctx, const std::vector<Value>& args);

    /// NON-STANDARD: BuiltinBase setup hooks for constructor and prototype registration.
    static void setupStaticMethods(JSObject* constructor, rift::memory::ObjectFactory* factory);
    static void setupPrototypeMethods(JSObject* prototype, rift::memory::ObjectFactory* factory);

  private:
    /// NON-STANDARD: Internal helper to retrieve the RegExp prototype from BuiltinManager.
    static JSObject* getGlobalPrototype();
    /// NON-STANDARD: Internal helper to extract RegExpData from the registry for `this`.
    static RegExpData* getRegExpData(const CallContext& ctx);
};

}  // namespace rift::builtins
