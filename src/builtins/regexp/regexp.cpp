#include "rift/builtins/regexp/regexp.h"

#include <absl/strings/string_view.h>

#include "rift/builtins/array/array.h"
#include "rift/builtins/builtin_manager.h"
#include "rift/interpreter/call_context.h"
#include "rift/interpreter/this_helpers.h"
#include "rift/memory/gc_protector.h"

// ============================================================================
// ECMA-262 -- RegExp Objects (22.2)
// @spec https://tc39.es/ecma262/#sec-regexp-regular-expression-objects
//
// DEVIATION: Rift uses the Google RE2 library instead of the spec's internal
// RegExp engine. RE2 guarantees linear-time matching but does not support
// backreferences, lookahead/lookbehind, or other features that require
// backtracking. This means some valid ECMAScript RegExp patterns are not
// supported.
//
// DEVIATION: The spec stores regex state in internal slots on the RegExp
// object ([[RegExpMatcher]], [[OriginalSource]], [[OriginalFlags]]). Rift
// uses an external static registry (RegExpRegistry) that maps JSObject*
// pointers to RegExpData structs containing the RE2 instance and flags.
//
// INCOMPLETE: The following spec features are not yet implemented:
//   - Symbol.match, Symbol.replace, Symbol.search, Symbol.split (22.2.6.8-13)
//   - Named capture groups in exec results (22.2.6.2 step 29)
//   - The "groups" and "indices" properties on exec results
//   - RegExp.prototype[@@matchAll] (22.2.6.9)
//   - get RegExp.prototype.dotAll/hasIndices/sticky/unicode/unicodeSets
//   - RegExp ( pattern, flags ) when pattern is already a RegExp (22.2.3.1 steps 4-10)
// ============================================================================

namespace rift::builtins {

using rift::core::extractThisObject;

// ============================================================================
// RegExpRegistry — NON-STANDARD Internal Registry
// ============================================================================
//
// NON-STANDARD: RegExpRegistry is not part of ECMA-262. The spec uses
// internal slots on the RegExp object itself. Rift uses this static registry
// to associate JSObject pointers with RegExpData (which holds the compiled
// RE2 pattern and parsed flags). This avoids unsafe pointer casting but
// introduces a potential memory leak when RegExp objects are garbage collected
// without being removed from the registry.

std::unordered_map<JSObject*, std::unique_ptr<RegExpData>> RegExpRegistry::registry_;

void RegExpRegistry::store(JSObject* obj, std::unique_ptr<RegExpData> data) {
    registry_[obj] = std::move(data);
}

RegExpData* RegExpRegistry::get(JSObject* obj) {
    auto it = registry_.find(obj);
    if(it != registry_.end()) {
        return it->second.get();
    }
    return nullptr;
}

void RegExpRegistry::remove(JSObject* obj) {
    registry_.erase(obj);
}

void RegExpRegistry::clear() {
    registry_.clear();
}

// ============================================================================
// RegExpData — NON-STANDARD Internal Data Structure
// ============================================================================
//
// NON-STANDARD: RegExpData is Rift's equivalent of the spec's internal slots:
//   [[OriginalSource]]  -> RegExpData::pattern
//   [[OriginalFlags]]   -> RegExpData::flags
//   [[RegExpMatcher]]   -> RegExpData::regex (compiled RE2 instance)
//
// DEVIATION: The spec defines [[RegExpMatcher]] as an abstract closure that
// takes a string and an index, and returns a MatchState or failure. Rift
// stores a compiled RE2 pattern instead, and performs matching via RE2::Match
// and RE2::PartialMatch at call sites (exec, test).
//
// DEVIATION: Flag parsing translates ECMAScript flag characters into
// RE2::Options. Some flags have approximate rather than exact semantics:
//   - 'g' (global): tracked via RegExpData::global; controls lastIndex behavior
//   - 'i' (ignoreCase): mapped to RE2 case_sensitive(false)
//   - 'm' (multiline): mapped to RE2 dot_nl(true) — DEVIATION: the spec's
//     multiline flag affects ^ and $ anchors, but Rift maps it to dot_nl
//   - 's' (dotAll): mapped to RE2 dot_nl(true) — correct behavior
//   - 'u' (unicode): no-op, RE2 handles Unicode by default
//   - 'd' (hasIndices), 'v' (unicodeSets), 'y' (sticky): not yet supported

RegExpData::RegExpData(const std::string& p, const std::string& f)
    : pattern(p), flags(f), global(false), ignoreCase(false), multiline(false), lastIndex(0) {
    RE2::Options opts;
    opts.set_log_errors(false);

    // Parse flags
    for(char c : f) {
        switch(c) {
            case 'g':
                global = true;
                break;
            case 'i':
                ignoreCase = true;
                opts.set_case_sensitive(false);
                break;
            case 'm':
                multiline = true;
                opts.set_dot_nl(true);
                break;
            case 's':
                opts.set_dot_nl(true);
                break;
            case 'u':
                // Unicode mode - RE2 handles Unicode by default
                break;
            default:
                // Ignore unknown flags for now
                break;
        }
    }

    regex = std::make_unique<RE2>(p, opts);
}

// ============================================================================
// Setup Methods
// ============================================================================

// ----------------------------------------------------------------------------
// 22.2.4 Properties of the RegExp Constructor
// @spec https://tc39.es/ecma262/#sec-properties-of-the-regexp-constructor
//
// TODO: 22.2.4.2 get RegExp [ @@species ] -- not yet implemented.
// @spec https://tc39.es/ecma262/#sec-get-regexp-@@species
// ----------------------------------------------------------------------------
void RegExp::setupStaticMethods(JSObject* constructor, rift::memory::ObjectFactory* factory) {
    // RegExp has no static methods beyond @@species in ES2025.
}

// ----------------------------------------------------------------------------
// 22.2.6 Properties of the RegExp Prototype Object
// @spec https://tc39.es/ecma262/#sec-properties-of-the-regexp-prototype-object
//
// The RegExp prototype object:
//   - is %RegExp.prototype%
//   - is an ordinary object
//   - is not itself a RegExp instance (has no [[RegExpMatcher]] internal slot)
//   - has a [[Prototype]] internal slot whose value is %Object.prototype%
//
// INCOMPLETE: The following prototype properties are not yet registered:
//   - 22.2.6.3 get RegExp.prototype.dotAll
//   - 22.2.6.4 get RegExp.prototype.flags
//   - 22.2.6.5 get RegExp.prototype.global
//   - 22.2.6.6 get RegExp.prototype.hasIndices
//   - 22.2.6.7 get RegExp.prototype.ignoreCase
//   - 22.2.6.8 RegExp.prototype [ @@match ] ( string )
//   - 22.2.6.9 RegExp.prototype [ @@matchAll ] ( string )
//   - 22.2.6.10 get RegExp.prototype.multiline
//   - 22.2.6.11 RegExp.prototype [ @@replace ] ( string, replaceValue )
//   - 22.2.6.12 RegExp.prototype [ @@search ] ( string )
//   - 22.2.6.13 get RegExp.prototype.source
//   - 22.2.6.15 RegExp.prototype [ @@split ] ( string, limit )
//   - 22.2.6.17 get RegExp.prototype.sticky
//   - 22.2.6.18 get RegExp.prototype.unicode
//   - 22.2.6.19 get RegExp.prototype.unicodeSets
// ----------------------------------------------------------------------------
void RegExp::setupPrototypeMethods(JSObject* prototype, rift::memory::ObjectFactory* factory) {
    // 22.2.6.14 RegExp.prototype.test ( S )
    RIFT_METHOD(prototype, "test", 1, RegExp::test);
    // 22.2.6.2 RegExp.prototype.exec ( string )
    RIFT_METHOD(prototype, "exec", 1, RegExp::exec);
    // 22.2.6.16 RegExp.prototype.toString ( )
    RIFT_METHOD(prototype, "toString", 0, RegExp::toString);
}

// ============================================================================
// Constructor
// ============================================================================

// 22.2.3.1 RegExp ( pattern, flags )
// @spec https://tc39.es/ecma262/#sec-regexp-pattern-flags
//
// Spec algorithm (simplified):
//   1. If NewTarget is undefined, ...handle IsRegExp(pattern)...
//   2. If pattern is a RegExp object, extract source and flags.
//   3. Let P be the pattern string.
//   4. Let F be the flags string.
//   5. Let obj be ? RegExpAlloc(NewTarget).
//   6. Return ? RegExpInitialize(obj, P, F).
//
// INCOMPLETE: Steps 1-2 (handling when pattern is already a RegExp, or when
// called without new) are not implemented. Rift always creates a new RegExp
// from string arguments regardless of whether pattern is a RegExp object.
// INCOMPLETE: Step 1 NewTarget check not enforced -- Rift does not yet
// distinguish [[Construct]] from [[Call]] for built-in constructors.
Value RegExp::constructor(const CallContext& ctx, const std::vector<Value>& args) {
    // Step 3: Let P be ? ToString(pattern) (or "" if absent).
    std::string pattern = args.empty() ? "" : args[0].toString();
    // Step 4: Let F be ? ToString(flags) (or "" if absent).
    std::string flags = args.size() > 1 ? args[1].toString() : "";

    // Step 5: Let obj be ? RegExpAlloc(NewTarget).
    // SIMPLIFIED: Rift creates a plain JSObject with the RegExp prototype
    // instead of calling the abstract RegExpAlloc operation.
    auto regexpPrototype = getGlobalPrototype();
    auto* regexpObj = getObjectFactory()->createJSObject(regexpPrototype);

    // Protect from GC during initialization
    rift::memory::GCProtector protect(regexpObj, getObjectFactory()->getObjectManager());

    // Step 6: Return ? RegExpInitialize(obj, P, F).
    // DEVIATION: Instead of calling RegExpInitialize (which sets the internal
    // slots [[OriginalSource]], [[OriginalFlags]], and [[RegExpMatcher]]),
    // Rift creates a RegExpData struct and stores it in the static registry.
    auto data = std::make_unique<RegExpData>(pattern, flags);

    // Set JavaScript-visible properties.
    // DEVIATION: The spec defines source, global, ignoreCase, multiline as
    // getter accessors on RegExp.prototype (22.2.6.5, 22.2.6.7, 22.2.6.10,
    // 22.2.6.13). Rift sets them as own data properties on each instance.
    regexpObj->setProperty("source", Value(pattern));
    regexpObj->setProperty("global", Value(data->global));
    regexpObj->setProperty("ignoreCase", Value(data->ignoreCase));
    regexpObj->setProperty("multiline", Value(data->multiline));
    regexpObj->setProperty("lastIndex", Value(0.0));
    regexpObj->setProperty("flags", Value(flags));

    // Store data in registry (transfers ownership to registry)
    // NOTE: This creates a potential memory leak if RegExp objects are GC'd.
    // A future improvement would be to integrate with GC finalization or
    // use weak references to automatically clean up unused entries.
    RegExpRegistry::store(regexpObj, std::move(data));

    return Value(regexpObj);
}

// NON-STANDARD: Internal helper to extract RegExpData from the registry.
// The spec accesses internal slots directly (e.g., R.[[RegExpMatcher]]).
// Rift looks up the this-object in the static RegExpRegistry instead.
RegExpData* RegExp::getRegExpData(const CallContext& ctx) {
    auto* obj = extractThisObject(ctx);
    if(obj) {
        return RegExpRegistry::get(obj);
    }
    return nullptr;
}

// ============================================================================
// Instance Methods
// ============================================================================

// 22.2.6.14 RegExp.prototype.test ( S )
// @spec https://tc39.es/ecma262/#sec-regexp.prototype.test
//
// Spec algorithm:
//   1. Let R be the this value.
//   2. If R is not an Object, throw a TypeError exception.
//   3. Let string be ? ToString(S).
//   4. Let match be ? RegExpExec(R, string).
//   5. If match is not null, return true.
//   6. Return false.
//
// SIMPLIFIED: The spec delegates to RegExpExec (which calls R.exec or the
// built-in exec algorithm). Rift inlines the matching directly using
// RE2::PartialMatch, bypassing the RegExpExec abstract operation. This
// means subclass overrides of exec() are not called from test().
//
// DEVIATION: The spec throws a TypeError at step 2 if this is not an object.
// Rift returns false instead of throwing when RegExpData is not found.
//
// INCOMPLETE: Does not handle the 'g' (global) or 'y' (sticky) flag
// behavior described in RegExpBuiltinExec (22.2.7.1), which updates
// lastIndex and starts matching from lastIndex.
Value RegExp::test(const CallContext& ctx, const std::vector<Value>& args) {
    // Steps 1-2: Let R be the this value (extract RegExpData from registry).
    auto* data = getRegExpData(ctx);
    if(!data) {
        return Value(false);
    }

    // Step 3: Let string be ? ToString(S).
    std::string str = !args.empty() ? args[0].toString() : "";

    // Steps 4-6: Let match be ? RegExpExec(R, string). Return match is not null.
    // SIMPLIFIED: Uses RE2::PartialMatch directly instead of RegExpExec.
    bool matches = RE2::PartialMatch(str, *data->regex);

    return Value(matches);
}

// 22.2.6.2 RegExp.prototype.exec ( string )
// @spec https://tc39.es/ecma262/#sec-regexp.prototype.exec
//
// Spec algorithm:
//   1. Let R be the this value.
//   2. Perform ? RequireInternalSlot(R, [[RegExpMatcher]]).
//   3. Let S be ? ToString(string).
//   4. Return ? RegExpBuiltinExec(R, S).
//
// RegExpBuiltinExec ( R, S ) — 22.2.7.1:
// @spec https://tc39.es/ecma262/#sec-regexpbuiltinexec
//   1. Let length be the length of S.
//   2. Let lastIndex be ? ToLength(? Get(R, "lastIndex")).
//   3. Let flags be R.[[OriginalFlags]].
//   4. If flags contains "g", let global be true; else let global be false.
//   5. If flags contains "y", let sticky be true; else let sticky be false.
//   ...
//   (many steps for matching, capture groups, named groups, lastIndex update)
//   ...
//   28. Perform ! CreateDataPropertyOrThrow(A, "index", F(lastIndex)).
//   29. Perform ! CreateDataPropertyOrThrow(A, "input", S).
//   30. ... (groups, indices properties)
//   31. Return A.
//
// SIMPLIFIED: Rift implements a subset of RegExpBuiltinExec:
//   - Global flag (lastIndex tracking) is implemented
//   - Capture groups are included in the result array
//   - INCOMPLETE: Sticky flag ('y') is not handled
//   - INCOMPLETE: Named capture groups / "groups" property not set (step 30)
//   - INCOMPLETE: "indices" property not set (hasIndices / 'd' flag)
//   - DEVIATION: Uses RE2::Match instead of the spec's pattern matching algorithm
Value RegExp::exec(const CallContext& ctx, const std::vector<Value>& args) {
    // Steps 1-2: Let R be the this value. RequireInternalSlot(R, [[RegExpMatcher]]).
    auto* data = getRegExpData(ctx);
    if(!data) {
        return Value::null();
    }

    // Step 3: Let S be ? ToString(string).
    std::string str = !args.empty() ? args[0].toString() : "";

    // Prepare submatch array for RE2 (full match + capture groups)
    int num_groups = data->regex->NumberOfCapturingGroups();
    int num_submatch = 1 + num_groups;
    std::vector<absl::string_view> submatch(num_submatch);

    // RegExpBuiltinExec step 2: Let lastIndex be ? ToLength(? Get(R, "lastIndex")).
    // RegExpBuiltinExec step 4: If flags contains "g", let global be true.
    size_t start_pos = 0;
    if(data->global) {
        start_pos = static_cast<size_t>(std::max(0, data->lastIndex));
        // RegExpBuiltinExec step 11: If lastIndex > length, then
        //   a. If global or sticky, set lastIndex to +0 and return null.
        if(start_pos > str.size()) {
            data->lastIndex = 0;
            auto* obj = extractThisObject(ctx);
            if(obj) {
                obj->setProperty("lastIndex", Value(0.0));
            }
            return Value::null();
        }
    }

    // RegExpBuiltinExec steps 14-18: Perform the match.
    // DEVIATION: Uses RE2::Match with UNANCHORED mode instead of the spec's
    // internal pattern matching algorithm.
    absl::string_view text(str);
    if(!data->regex->Match(text, static_cast<int>(start_pos), static_cast<int>(str.size()),
                           RE2::UNANCHORED, submatch.data(), num_submatch)) {
        // RegExpBuiltinExec step 17: If r is failure, then
        //   a. If global or sticky, set lastIndex to +0.
        //   b. Return null.
        if(data->global) {
            data->lastIndex = 0;
            auto* obj = extractThisObject(ctx);
            if(obj) {
                obj->setProperty("lastIndex", Value(0.0));
            }
        }
        return Value::null();
    }

    // RegExpBuiltinExec step 19: Let e be r's endIndex.
    size_t match_index = submatch[0].data() - str.data();

    // RegExpBuiltinExec step 21: If global or sticky, set lastIndex to e.
    if(data->global) {
        data->lastIndex = static_cast<int>(match_index + submatch[0].size());
        auto* obj = extractThisObject(ctx);
        if(obj) {
            obj->setProperty("lastIndex", Value(static_cast<double>(data->lastIndex)));
        }
    }

    // RegExpBuiltinExec steps 26-27: Build result array A.
    // A[0] = matched substring, A[1..n] = capture groups.
    std::vector<Value> elements;
    elements.push_back(Value(std::string(submatch[0])));
    for(int i = 1; i < num_submatch; ++i) {
        // Step 27.c: If captureI is undefined, let capturedValue be undefined.
        if(submatch[i].data() == nullptr) {
            elements.push_back(Value::undefined());
        } else {
            elements.push_back(Value(std::string(submatch[i])));
        }
    }

    // RegExpBuiltinExec step 28: Perform ! CreateDataPropertyOrThrow(A, "index", ...).
    // RegExpBuiltinExec step 29: Perform ! CreateDataPropertyOrThrow(A, "input", S).
    // INCOMPLETE: Step 30 (groups property for named captures) not implemented.
    // INCOMPLETE: Step 31 (indices property for 'd' flag) not implemented.
    auto* result = Array::createArrayObject(getObjectFactory(), std::move(elements));
    result->setProperty("index", Value(static_cast<double>(match_index)));
    result->setProperty("input", Value(str));

    return Value(result);
}

// 22.2.6.16 RegExp.prototype.toString ( )
// @spec https://tc39.es/ecma262/#sec-regexp.prototype.tostring
//
// Spec algorithm:
//   1. Let R be the this value.
//   2. If R is not an Object, throw a TypeError exception.
//   3. Let pattern be ? ToString(? Get(R, "source")).
//   4. Let flags be ? ToString(? Get(R, "flags")).
//   5. Let result be the string-concatenation of "/", pattern, "/", and flags.
//   6. Return result.
//
// DEVIATION: The spec reads "source" and "flags" properties from the object
// (steps 3-4), which means it works generically on any object with those
// properties. Rift reads from the RegExpData registry instead, and returns
// "/(?:)/" as a fallback when no RegExpData is found (instead of throwing
// a TypeError as step 2 requires).
Value RegExp::toString(const CallContext& ctx, const std::vector<Value>& args) {
    // Steps 1-2: Let R be the this value.
    auto* data = getRegExpData(ctx);
    if(!data) {
        // DEVIATION: Returns default pattern instead of throwing TypeError.
        return Value("/(?:)/");
    }

    // Steps 3-5: Let result be "/" + pattern + "/" + flags.
    std::string result = "/" + data->pattern + "/" + data->flags;

    // Step 6: Return result.
    return Value(std::move(result));
}

// ============================================================================
// Helper Methods
// ============================================================================

JSObject* RegExp::getGlobalPrototype() {
    return rift::core::BuiltinManager::getRegExpPrototype();
}

}  // namespace rift::builtins
