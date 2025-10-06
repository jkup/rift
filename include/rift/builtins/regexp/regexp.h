#pragma once

#include <memory>
#include <string>
#include <unordered_map>
#include <vector>

#include "re2/re2.h"
#include "../../memory/object_factory.h"
#include "../../runtime/values/object.h"
#include "../../runtime/values/value.h"
#include "../builtin_base.h"

namespace rift::builtins {

using namespace rift::runtime;

/**
 * Internal class to store regex state
 */
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

/**
 * Registry to manage RegExpData lifecycle
 * Maps JSObject* to RegExpData to avoid unsafe pointer casting
 * 
 * NOTE: This registry currently does not automatically clean up entries
 * when RegExp objects are garbage collected. This is acceptable for now
 * because RegExp objects are typically long-lived, but a future improvement
 * would be to integrate with GC finalization or use weak references.
 */
class RegExpRegistry {
private:
    static std::unordered_map<JSObject*, std::unique_ptr<RegExpData>> registry_;

public:
    static void store(JSObject* obj, std::unique_ptr<RegExpData> data);
    static RegExpData* get(JSObject* obj);
    static void remove(JSObject* obj);
    static void clear();
};

/**
 * RegExp built-in object implementation using Google RE2
 * 
 * Note: RE2 is a safe, fast regex library that guarantees linear time execution.
 * It does not support some JavaScript regex features (backreferences, lookahead/lookbehind)
 * but covers the most common use cases and prevents catastrophic backtracking.
 *
 * More information:
 *  - [ECMAScript reference][spec]
 *  - [MDN documentation][mdn]
 *  - [RE2 syntax][re2]
 *
 * [spec]: https://tc39.es/ecma262/#sec-regexp-regular-expression-objects
 * [mdn]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp
 * [re2]: https://github.com/google/re2/wiki/Syntax
 */
class RegExp : public BuiltinBase<RegExp> {
public:
    /// RegExp constructor (required by BuiltinBase)
    static Value constructor(const std::vector<Value>& args);

    /// RegExp prototype methods
    static Value test(const std::vector<Value>& args);
    static Value exec(const std::vector<Value>& args);
    static Value toString(const std::vector<Value>& args);

    /// Setup methods required by BuiltinBase template
    static void setupStaticMethods(JSObject* constructor, rift::memory::ObjectFactory* factory);
    static void setupPrototypeMethods(JSObject* prototype, rift::memory::ObjectFactory* factory);

private:
    /// Helper methods
    static JSObject* getGlobalPrototype();
    static RegExpData* getRegExpData(const std::vector<Value>& args);
};

} // namespace rift::builtins
