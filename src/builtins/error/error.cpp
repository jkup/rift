#include "rift/builtins/error/error.h"

#include "rift/core/engine/builtin_manager.h"
#include "rift/core/engine/call_context.h"
#include "rift/core/engine/javascript_exception.h"
#include "rift/core/engine/this_helpers.h"
#include "rift/memory/gc_protector.h"

// ============================================================================
// ECMA-262 — Error Objects
// @spec https://tc39.es/ecma262/#sec-error-objects
// Covers: Error constructor (20.5.1), Error.prototype (20.5.3),
//         Error.prototype.toString (20.5.3.4)
// See also: type_error.cpp, reference_error.cpp, syntax_error.cpp, range_error.cpp
//           (NativeError constructors, 20.5.5)
// ============================================================================

namespace rift::builtins {

using rift::core::extractThisObject;

// 20.5.2 Properties of the Error Constructor
// @spec https://tc39.es/ecma262/#sec-properties-of-the-error-constructor
void Error::setupStaticMethods(JSObject* constructor, rift::memory::ObjectFactory* factory) {
    // Set the name property on the constructor
    RIFT_PROPERTY(constructor, "name", Value("Error"));
}

// 20.5.3 Properties of the Error Prototype Object
// @spec https://tc39.es/ecma262/#sec-properties-of-the-error-prototype-object
void Error::setupPrototypeMethods(JSObject* prototype, rift::memory::ObjectFactory* factory) {
    // 20.5.3.3 Error.prototype.name
    // @spec https://tc39.es/ecma262/#sec-error.prototype.name
    // The initial value is "Error" (writable, non-enumerable, configurable per spec).
    prototype->defineProperty("name",
                              rift::runtime::PropertyDescriptor(Value("Error"), true, false, true));

    // 20.5.3.2 Error.prototype.message
    // @spec https://tc39.es/ecma262/#sec-error.prototype.message
    // The initial value is "" (writable, non-enumerable, configurable per spec).
    prototype->defineProperty("message",
                              rift::runtime::PropertyDescriptor(Value(""), true, false, true));

    // 20.5.3.4 Error.prototype.toString ( )
    // @spec https://tc39.es/ecma262/#sec-error.prototype.tostring
    RIFT_METHOD(prototype, "toString", Error::toString);
}

// 20.5.1.1 Error ( message )
// @spec https://tc39.es/ecma262/#sec-error-message
Value Error::constructor(const CallContext& ctx, const std::vector<Value>& args) {
    // 1. If NewTarget is undefined, let newTarget be the active function object;
    //    otherwise let newTarget be NewTarget.
    // SIMPLIFIED: Rift does not distinguish NewTarget; always creates a new Error object.

    // 2. Let O be ? OrdinaryCreateFromConstructor(newTarget, "%Error.prototype%",
    //    << [[ErrorData]] >>).
    auto errorPrototype = getGlobalPrototype();
    auto* errorObj = getObjectFactory()->createJSObject(errorPrototype);

    // Protect from GC during initialization
    rift::memory::GCProtector protect(errorObj, getObjectFactory()->getObjectManager());

    // DEVIATION: Spec does not set "name" on instances; it is inherited from the prototype.
    // Rift sets "name" directly on each Error instance.
    errorObj->setProperty("name", Value("Error"));

    // 3. If message is not undefined, then
    //    a. Let msg be ? ToString(message).
    //    b. Perform CreateNonEnumerableDataPropertyOrThrow(O, "message", msg).
    std::string message = "";
    if(!args.empty() && !args[0].isUndefined()) {
        message = args[0].toString();
    }
    // INCOMPLETE: Should only set "message" when message argument is not undefined.
    // Rift always sets it (to "" when undefined), which is observable but rarely matters.
    errorObj->setProperty("message", Value(message));

    // 4. Perform ? InstallErrorCause(O, options).
    // INCOMPLETE: Error cause (options.cause) not yet implemented.

    // 5. Return O.
    return Value(errorObj);
}

// 20.5.3.4 Error.prototype.toString ( )
// @spec https://tc39.es/ecma262/#sec-error.prototype.tostring
Value Error::toString(const CallContext& ctx, const std::vector<Value>& args) {
    // 1. Let O be the this value.
    // 2. If O is not an Object, throw a TypeError exception.
    auto errorObj = extractThisObject(ctx);
    if(!errorObj) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Error.prototype.toString called on non-object"));
    }

    // 3. Let name be ? Get(O, "name").
    Value nameValue = errorObj->getProperty("name");

    // 4. If name is undefined, set name to "Error"; otherwise set name to ? ToString(name).
    std::string name = nameValue.isUndefined() ? "Error" : nameValue.toString();

    // 5. Let msg be ? Get(O, "message").
    Value messageValue = errorObj->getProperty("message");

    // 6. If msg is undefined, set msg to the empty String;
    //    otherwise set msg to ? ToString(msg).
    std::string message = messageValue.isUndefined() ? "" : messageValue.toString();

    // 7. If name is the empty String, return msg.
    // 8. If msg is the empty String, return name.
    // DEVIATION: Spec step 7 checks if name is empty (returns msg).
    // Rift checks if message is empty (returns name), which differs when name is "" but
    // message is not. In practice, Error.prototype.name is always "Error" so this rarely
    // diverges. The combined "name: msg" case (step 9) is handled correctly.
    if(message.empty()) {
        return Value(name);
    } else {
        // 9. Return the string-concatenation of name, the code unit 0x003A (COLON),
        //    the code unit 0x0020 (SPACE), and msg.
        return Value(name + ": " + message);
    }
}

// NON-STANDARD: Internal helper to retrieve the Error prototype from BuiltinManager.
JSObject* Error::getGlobalPrototype() {
    return rift::core::BuiltinManager::getErrorPrototype();
}

}  // namespace rift::builtins