#include "rift/builtins/regexp/regexp.h"

#include <absl/strings/string_view.h>

#include "rift/builtins/array/array.h"
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

    std::string str = !args.empty() ? args[0].toString() : "";

    int num_groups = data->regex->NumberOfCapturingGroups();
    int num_submatch = 1 + num_groups;
    std::vector<absl::string_view> submatch(num_submatch);

    // For global regexps, start from lastIndex
    size_t start_pos = 0;
    if(data->global) {
        start_pos = static_cast<size_t>(std::max(0, data->lastIndex));
        if(start_pos > str.size()) {
            data->lastIndex = 0;
            auto* obj = extractThisObject(ctx);
            if(obj) {
                obj->setProperty("lastIndex", Value(0.0));
            }
            return Value::null();
        }
    }

    absl::string_view text(str);
    if(!data->regex->Match(text, static_cast<int>(start_pos), static_cast<int>(str.size()),
                           RE2::UNANCHORED, submatch.data(), num_submatch)) {
        if(data->global) {
            data->lastIndex = 0;
            auto* obj = extractThisObject(ctx);
            if(obj) {
                obj->setProperty("lastIndex", Value(0.0));
            }
        }
        return Value::null();
    }

    // Calculate match index
    size_t match_index = submatch[0].data() - str.data();

    // Update lastIndex for global
    if(data->global) {
        data->lastIndex = static_cast<int>(match_index + submatch[0].size());
        auto* obj = extractThisObject(ctx);
        if(obj) {
            obj->setProperty("lastIndex", Value(static_cast<double>(data->lastIndex)));
        }
    }

    // Build result array: [fullMatch, group1, group2, ...]
    std::vector<Value> elements;
    elements.push_back(Value(std::string(submatch[0])));
    for(int i = 1; i < num_submatch; ++i) {
        if(submatch[i].data() == nullptr) {
            elements.push_back(Value::undefined());
        } else {
            elements.push_back(Value(std::string(submatch[i])));
        }
    }

    auto* result = Array::createArrayObject(getObjectFactory(), std::move(elements));
    result->setProperty("index", Value(static_cast<double>(match_index)));
    result->setProperty("input", Value(str));

    return Value(result);
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
