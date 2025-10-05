#include "rift/builtins/regexp/regexp.h"

#include "rift/core/engine/builtin_manager.h"
#include "rift/memory/gc_protector.h"

namespace rift::builtins {

// ===== RegExpData Implementation =====

RegExpData::RegExpData(const std::string& p, const std::string& f)
    : pattern(p)
    , flags(f)
    , global(false)
    , ignoreCase(false)
    , multiline(false)
    , lastIndex(0)
{
    RE2::Options opts;
    opts.set_log_errors(false);
    
    // Parse flags
    for (char c : f) {
        switch (c) {
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
    // Add RegExp.prototype methods using GC-managed function creation
    prototype->setProperty("test", Value(factory->createJSFunction(RegExp::test)));
    prototype->setProperty("exec", Value(factory->createJSFunction(RegExp::exec)));
    prototype->setProperty("toString", Value(factory->createJSFunction(RegExp::toString)));
}

// ===== RegExp Constructor =====

Value RegExp::constructor(const std::vector<Value>& args) {
    // Get pattern and flags
    std::string pattern = args.empty() ? "" : args[0].toString();
    std::string flags = args.size() > 1 ? args[1].toString() : "";
    
    // Create RegExp object
    auto regexpPrototype = getGlobalPrototype();
    auto* regexpObj = getObjectFactory()->createJSObject(regexpPrototype);
    
    // Protect from GC during initialization
    rift::memory::GCProtector protect(regexpObj, getObjectFactory()->getObjectManager());
    
    // Create and store RegExpData
    auto* data = new RegExpData(pattern, flags);
    
    // Store data pointer as a property (internal) - cast to double to avoid ambiguity
    double ptrAsDouble = static_cast<double>(reinterpret_cast<intptr_t>(data));
    regexpObj->setProperty("[[RegExpData]]", Value(ptrAsDouble));
    
    // Set JavaScript-visible properties
    regexpObj->setProperty("source", Value(pattern));
    regexpObj->setProperty("global", Value(data->global));
    regexpObj->setProperty("ignoreCase", Value(data->ignoreCase));
    regexpObj->setProperty("multiline", Value(data->multiline));
    regexpObj->setProperty("lastIndex", Value(0.0));
    regexpObj->setProperty("flags", Value(flags));
    
    return Value(regexpObj);
}

// ===== Helper to Get RegExpData =====

RegExpData* RegExp::getRegExpData(const std::vector<Value>& args) {
    // For prototype methods, the first argument should be the 'this' value
    if (args.empty()) {
        return nullptr;
    }
    
    const Value& thisValue = args[0];
    
    if (thisValue.isObject()) {
        auto obj = thisValue.getObject();
        if (obj) {
            Value dataValue = obj->getProperty("[[RegExpData]]");
            if (dataValue.isNumber()) {
                return reinterpret_cast<RegExpData*>(static_cast<intptr_t>(dataValue.getNumber()));
            }
        }
    }
    
    return nullptr;
}

// ===== RegExp.prototype.test =====

Value RegExp::test(const std::vector<Value>& args) {
    auto* data = getRegExpData(args);
    if (!data) {
        return Value(false);
    }
    
    // Get string to test (second argument, since first is 'this')
    std::string str = args.size() > 1 ? args[1].toString() : "";
    
    // Test if pattern matches
    bool matches = RE2::PartialMatch(str, *data->regex);
    
    return Value(matches);
}

// ===== RegExp.prototype.exec =====

Value RegExp::exec(const std::vector<Value>& args) {
    auto* data = getRegExpData(args);
    if (!data) {
        return Value::null();
    }
    
    // Get string to test
    std::string str = args.size() > 1 ? args[1].toString() : "";
    
    // Check if pattern matches
    if (!RE2::PartialMatch(str, *data->regex)) {
        return Value::null();
    }
    
    // For now, return null even on match
    // TODO: Return proper match array with captured groups
    return Value::null();
}

// ===== RegExp.prototype.toString =====

Value RegExp::toString(const std::vector<Value>& args) {
    auto* data = getRegExpData(args);
    if (!data) {
        return Value("/(?:)/");
    }
    
    // Format: /pattern/flags
    std::string result = "/" + data->pattern + "/" + data->flags;
    
    return Value(result);
}

// ===== Helper Methods =====

JSObject* RegExp::getGlobalPrototype() {
    return rift::core::BuiltinManager::getRegExpPrototype();
}

} // namespace rift::builtins
