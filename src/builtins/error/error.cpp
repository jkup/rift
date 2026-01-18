#include "rift/builtins/error/error.h"

#include "rift/core/engine/builtin_manager.h"
#include "rift/core/engine/call_context.h"
#include "rift/core/engine/javascript_exception.h"
#include "rift/core/engine/this_helpers.h"
#include "rift/memory/gc_protector.h"

namespace rift::builtins {

using rift::core::extractThisObject;

void Error::setupStaticMethods(JSObject* constructor, rift::memory::ObjectFactory* factory) {
    // Error has no static methods (like Array.isArray), so this is empty
}

void Error::setupPrototypeMethods(JSObject* prototype, rift::memory::ObjectFactory* factory) {
    // Set default properties
    prototype->setProperty("name", Value("Error"));
    prototype->setProperty("message", Value(""));

    // Add Error.prototype methods using GC-managed function creation
    prototype->setProperty("toString", Value(factory->createJSFunction(Error::toString)));
}

Value Error::constructor(const CallContext& ctx, const std::vector<Value>& args) {
    // With CallContext migration, args are the real constructor arguments

    // Create Error object with proper prototype chain
    auto errorPrototype = getGlobalPrototype();
    auto* errorObj = getObjectFactory()->createJSObject(errorPrototype);  // Use factory

    // Protect from GC during initialization
    rift::memory::GCProtector protect(errorObj, getObjectFactory()->getObjectManager());

    // Set the name property
    errorObj->setProperty("name", Value("Error"));

    // Set the message property
    std::string message = "";
    if(!args.empty() && !args[0].isUndefined()) {
        message = args[0].toString();
    }
    errorObj->setProperty("message", Value(message));

    return Value(errorObj);  // errorObj is now raw pointer
}

Value Error::toString(const CallContext& ctx, const std::vector<Value>& args) {
    auto errorObj = extractThisObject(ctx);
    if(!errorObj) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Error.prototype.toString called on non-object"));
    }

    // Get name and message properties
    Value nameValue = errorObj->getProperty("name");
    Value messageValue = errorObj->getProperty("message");

    std::string name = nameValue.isUndefined() ? "Error" : nameValue.toString();
    std::string message = messageValue.isUndefined() ? "" : messageValue.toString();

    // Format according to ECMAScript spec
    if(message.empty()) {
        return Value(name);
    } else {
        return Value(name + ": " + message);
    }
}

JSObject* Error::getGlobalPrototype() {
    return rift::core::BuiltinManager::getErrorPrototype();  // Now returns raw pointer
}

}  // namespace rift::builtins