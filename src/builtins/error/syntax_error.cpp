#include "rift/builtins/error/syntax_error.h"

#include "rift/builtins/builtin_manager.h"
#include "rift/interpreter/javascript_exception.h"
#include "rift/memory/gc_protector.h"

// ============================================================================
// ECMA-262 — NativeError: SyntaxError
// @spec https://tc39.es/ecma262/#sec-native-error-types-used-in-this-standard-syntaxerror
// Implements the NativeError constructor pattern (20.5.5) for SyntaxError.
// SyntaxError is thrown when trying to interpret syntactically invalid code.
// See also: error.cpp (base Error, 20.5.1), type_error.cpp, reference_error.cpp,
//           range_error.cpp
// ============================================================================

namespace rift::builtins {

// 20.5.5.2 Properties of the NativeError Constructors
// @spec https://tc39.es/ecma262/#sec-properties-of-the-nativeerror-constructors
void SyntaxError::setupStaticMethods(JSObject* constructor, rift::memory::ObjectFactory* factory) {
    // name and length are set by BuiltinBase::create()
}

// 20.5.5.3 Properties of the NativeError Prototype Objects
// @spec https://tc39.es/ecma262/#sec-properties-of-the-nativeerror-prototype-objects
void SyntaxError::setupPrototypeMethods(JSObject* prototype, rift::memory::ObjectFactory* factory) {
    // 20.5.5.3.3 NativeError.prototype.name
    // @spec https://tc39.es/ecma262/#sec-nativeerror.prototype.name
    // The initial value is "SyntaxError" (writable, non-enumerable, configurable per spec).
    prototype->defineProperty(
        "name", rift::runtime::PropertyDescriptor(Value("SyntaxError"), true, false, true));

    // 20.5.5.3.2 NativeError.prototype.message
    // @spec https://tc39.es/ecma262/#sec-nativeerror.prototype.message
    // The initial value is "" (writable, non-enumerable, configurable per spec).
    prototype->defineProperty("message",
                              rift::runtime::PropertyDescriptor(Value(""), true, false, true));

    // DEVIATION: NativeError prototypes inherit toString from Error.prototype per spec.
    // Rift defines a separate toString on each NativeError prototype.
    RIFT_METHOD(prototype, "toString", 0, SyntaxError::toString);
}

// 20.5.5.1 NativeError ( message [, options ] )
// @spec https://tc39.es/ecma262/#sec-nativeerror
Value SyntaxError::constructor(const std::vector<Value>& args) {
    // 1. If NewTarget is undefined, let newTarget be the active function object;
    //    otherwise let newTarget be NewTarget.
    // SIMPLIFIED: Rift does not distinguish NewTarget; always creates a new SyntaxError object.

    // 2. Let O be ? OrdinaryCreateFromConstructor(newTarget, "%NativeError.prototype%",
    //    << [[ErrorData]] >>).
    auto errorPrototype = getGlobalPrototype();
    auto* errorObj = getObjectFactory()->createJSObject(errorPrototype);

    // Protect from GC during initialization
    rift::memory::GCProtector protect(errorObj, getObjectFactory()->getObjectManager());

    // DEVIATION: Spec does not set "name" on instances; it is inherited from the prototype.
    // Rift sets "name" directly on each NativeError instance.
    errorObj->setProperty("name", Value("SyntaxError"));

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
// DEVIATION: Per spec, NativeError prototypes inherit toString from Error.prototype.
// Rift provides a duplicate implementation on each NativeError prototype.
// The algorithm is identical to Error.prototype.toString (see error.cpp).
Value SyntaxError::toString(const std::vector<Value>& args) {
    // 1. Let O be the this value.
    // 2. If O is not an Object, throw a TypeError exception.
    auto errorObj = getThisErrorObject(args);
    if(!errorObj) {
        throw rift::core::JavaScriptException(
            Value("TypeError: SyntaxError.prototype.toString called on non-object"));
    }

    // 3. Let name be ? Get(O, "name").
    // 4. If name is undefined, set name to "Error"; otherwise set name to ? ToString(name).
    Value nameValue = errorObj->getProperty("name");
    Value messageValue = errorObj->getProperty("message");

    std::string name = nameValue.isUndefined() ? "SyntaxError" : nameValue.toString();
    // DEVIATION: Spec step 4 defaults to "Error", not "SyntaxError". Rift uses
    // "SyntaxError" as the default, which diverges when name has been explicitly set
    // to undefined.

    // 5. Let msg be ? Get(O, "message").
    // 6. If msg is undefined, set msg to ""; otherwise set msg to ? ToString(msg).
    std::string message = messageValue.isUndefined() ? "" : messageValue.toString();

    // 7. If name is the empty String, return msg.
    // 8. If msg is the empty String, return name.
    // 9. Return the string-concatenation of name, ":", " ", and msg.
    if(message.empty()) {
        return Value(name);
    } else {
        return Value(name + ": " + message);
    }
}

// NON-STANDARD: Internal helper to extract the this-object from the args vector.
// Rift NativeError prototype methods receive `this` as args[0] instead of via CallContext.
JSObject* SyntaxError::getThisErrorObject(const std::vector<Value>& args) {
    if(args.empty()) {
        return nullptr;
    }

    const Value& thisValue = args[0];

    if(thisValue.isObject()) {
        return thisValue.getObject();
    }

    return nullptr;
}

// NON-STANDARD: Internal helper to retrieve the SyntaxError prototype from BuiltinManager.
JSObject* SyntaxError::getGlobalPrototype() {
    return rift::core::BuiltinManager::getSyntaxErrorPrototype();
}

}  // namespace rift::builtins
