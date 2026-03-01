// ============================================================================
// 7.1.18 ToObject ( argument ) — this-value variant
// @spec https://tc39.es/ecma262/#sec-toobject
//
// Wraps primitive this-values in their corresponding object wrappers
// (Boolean, Number, String) and throws TypeError for null/undefined.
// Used by Array, RegExp, and other builtins that require ToObject(this value)
// as their first step per the ECMAScript specification.
// ============================================================================

#include "rift/interpreter/this_helpers.h"

#include "rift/builtins/builtin_manager.h"
#include "rift/builtins/error/type_error.h"
#include "rift/interpreter/javascript_exception.h"
#include "rift/memory/gc_protector.h"

namespace rift::core {

runtime::JSObject* thisToObject(const CallContext& ctx, const char* methodName) {
    const runtime::Value& thisValue = ctx.thisValue;

    // Objects and functions pass through unchanged.
    if(thisValue.isObject() || thisValue.isFunction()) {
        auto* obj = thisValue.getObject();
        if(obj) {
            return obj;
        }
    }

    // null and undefined throw TypeError per spec step 1-2.
    if(thisValue.isNull() || thisValue.isUndefined()) {
        throw JavaScriptException(rift::builtins::TypeError::constructor(
            {runtime::Value(std::string("Cannot convert undefined or null to object"))}));
    }

    auto* factory = BuiltinManager::getFactory();

    // Boolean → Boolean wrapper object
    if(thisValue.isBoolean()) {
        auto* prototype = BuiltinManager::getBooleanPrototype();
        auto* wrapper = factory->createJSObject(prototype);
        rift::memory::GCProtector protect(wrapper, factory->getObjectManager());
        wrapper->setProperty("value", thisValue);
        return wrapper;
    }

    // Number → Number wrapper object
    if(thisValue.isNumber()) {
        auto* prototype = BuiltinManager::getNumberPrototype();
        auto* wrapper = factory->createJSObject(prototype);
        rift::memory::GCProtector protect(wrapper, factory->getObjectManager());
        wrapper->setProperty("value", thisValue);
        return wrapper;
    }

    // String → String wrapper object with indexed characters and length
    if(thisValue.isString()) {
        auto* prototype = BuiltinManager::getStringPrototype();
        auto* wrapper = factory->createJSObject(prototype);
        rift::memory::GCProtector protect(wrapper, factory->getObjectManager());
        std::string str = thisValue.getString();
        wrapper->setProperty("value", thisValue);
        wrapper->setProperty("length", runtime::Value(static_cast<double>(str.length())));
        for(size_t i = 0; i < str.length(); ++i) {
            wrapper->setProperty(std::to_string(i), runtime::Value(std::string(1, str[i])));
        }
        return wrapper;
    }

    // Symbol → Symbol wrapper object
    if(thisValue.isSymbol()) {
        auto* prototype = BuiltinManager::getSymbolPrototype();
        auto* wrapper = factory->createJSObject(prototype);
        rift::memory::GCProtector protect(wrapper, factory->getObjectManager());
        wrapper->setProperty("value", thisValue);
        return wrapper;
    }

    // Should not reach here, but throw TypeError as a safety fallback.
    throw JavaScriptException(rift::builtins::TypeError::constructor(
        {runtime::Value(std::string("Cannot convert value to object"))}));
}

}  // namespace rift::core
