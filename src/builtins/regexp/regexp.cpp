#include "rift/builtins/regexp/regexp.h"

#include "rift/core/engine/builtin_manager.h"
#include "rift/core/engine/call_context.h"
#include "rift/core/engine/this_helpers.h"
#include "rift/memory/gc_protector.h"

namespace rift::builtins {

using rift::core::extractThisObject;

// ===== RegExpRegistry Implementation =====

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

// ===== RegExpData Implementation =====

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

// ===== RegExp Static Setup =====

void RegExp::setupStaticMethods(JSObject* constructor, rift::memory::ObjectFactory* factory) {
    // No static methods for now
}

void RegExp::setupPrototypeMethods(JSObject* prototype, rift::memory::ObjectFactory* factory) {
    RIFT_METHOD(prototype, "test", RegExp::test);
    RIFT_METHOD(prototype, "exec", RegExp::exec);
    RIFT_METHOD(prototype, "toString", RegExp::toString);
}

// ===== RegExp Constructor =====

Value RegExp::constructor(const CallContext& ctx, const std::vector<Value>& args) {
    // Get pattern and flags
    std::string pattern = args.empty() ? "" : args[0].toString();
    std::string flags = args.size() > 1 ? args[1].toString() : "";

    // Create RegExp object
    auto regexpPrototype = getGlobalPrototype();
    auto* regexpObj = getObjectFactory()->createJSObject(regexpPrototype);

    // Protect from GC during initialization
    rift::memory::GCProtector protect(regexpObj, getObjectFactory()->getObjectManager());

    // Create RegExpData with smart pointer for proper memory management
    auto data = std::make_unique<RegExpData>(pattern, flags);

    // Set JavaScript-visible properties
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

// ===== Helper to Get RegExpData =====

RegExpData* RegExp::getRegExpData(const CallContext& ctx) {
    auto* obj = extractThisObject(ctx);
    if(obj) {
        return RegExpRegistry::get(obj);
    }
    return nullptr;
}

// ===== RegExp.prototype.test =====

Value RegExp::test(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getRegExpData(ctx);
    if(!data) {
        return Value(false);
    }

    // Get string to test
    std::string str = !args.empty() ? args[0].toString() : "";

    // Test if pattern matches
    bool matches = RE2::PartialMatch(str, *data->regex);

    return Value(matches);
}

// ===== RegExp.prototype.exec =====

Value RegExp::exec(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getRegExpData(ctx);
    if(!data) {
        return Value::null();
    }

    // Get string to test
    std::string str = !args.empty() ? args[0].toString() : "";

    // Check if pattern matches
    if(!RE2::PartialMatch(str, *data->regex)) {
        return Value::null();
    }

    // For now, return null even on match
    // TODO: Return proper match array with captured groups
    return Value::null();
}

// ===== RegExp.prototype.toString =====

Value RegExp::toString(const CallContext& ctx, const std::vector<Value>& args) {
    auto* data = getRegExpData(ctx);
    if(!data) {
        return Value("/(?:)/");
    }

    // Format: /pattern/flags
    std::string result = "/" + data->pattern + "/" + data->flags;

    return Value(std::move(result));
}

// ===== Helper Methods =====

JSObject* RegExp::getGlobalPrototype() {
    return rift::core::BuiltinManager::getRegExpPrototype();
}

}  // namespace rift::builtins
