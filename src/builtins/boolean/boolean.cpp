#include "rift/builtins/boolean/boolean.h"

#include "rift/core/engine/builtin_manager.h"
#include "rift/core/engine/call_context.h"
#include "rift/core/engine/this_helpers.h"
#include "rift/memory/gc_protector.h"

namespace rift::builtins {

using rift::core::CallContext;
using rift::core::extractThisBool;

void Boolean::setupStaticMethods(JSObject* constructor, rift::memory::ObjectFactory* factory) {
    // Boolean has no static methods (like Array.isArray), so this is empty
}

void Boolean::setupPrototypeMethods(JSObject* prototype, rift::memory::ObjectFactory* factory) {
    RIFT_METHOD(prototype, "toString", Boolean::toString);
    RIFT_METHOD(prototype, "valueOf", Boolean::valueOf);
}

Value Boolean::constructor(const CallContext& ctx, const std::vector<Value>& args) {
    bool boolValue = args.empty() ? false : args[0].toBool();
    if(ctx.isConstructorCall()) {
        auto booleanPrototype = getGlobalPrototype();
        auto* booleanObj = getObjectFactory()->createJSObject(booleanPrototype);

        // Protect from GC during initialization
        rift::memory::GCProtector protect(booleanObj, getObjectFactory()->getObjectManager());

        booleanObj->setProperty("value", Value(boolValue));
        return Value(booleanObj);
    }
    return Value(boolValue);
}

Value Boolean::toString(const CallContext& ctx, const std::vector<Value>& args) {
    bool boolValue = extractThisBool(ctx);
    return Value(boolValue ? "true" : "false");
}

Value Boolean::valueOf(const CallContext& ctx, const std::vector<Value>& args) {
    bool boolValue = extractThisBool(ctx);
    return Value(boolValue);
}

JSObject* Boolean::getGlobalPrototype() {
    return rift::core::BuiltinManager::getBooleanPrototype();
}

}  // namespace rift::builtins