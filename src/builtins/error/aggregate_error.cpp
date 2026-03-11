#include "rift/builtins/error/aggregate_error.h"

#include "rift/builtins/builtin_manager.h"
#include "rift/builtins/symbol/symbol.h"
#include "rift/interpreter/evaluation_utils.h"
#include "rift/interpreter/javascript_exception.h"
#include "rift/memory/gc_protector.h"

// ============================================================================
// ECMA-262 — AggregateError Objects
// @spec https://tc39.es/ecma262/#sec-aggregate-error-objects
// AggregateError is used to represent multiple errors bundled together.
// It is primarily used by Promise.any() when all promises reject.
// Unlike other NativeErrors, AggregateError takes (errors, message, options)
// instead of (message, options).
// See also: error.cpp (base Error, 20.5.1), type_error.cpp, etc.
// ============================================================================

namespace rift::builtins {

// 20.5.7.2 Properties of the AggregateError Constructor
// @spec https://tc39.es/ecma262/#sec-properties-of-the-aggregate-error-constructors
void AggregateError::setupStaticMethods(JSObject* constructor,
                                        rift::memory::ObjectFactory* factory) {
    // name and length are set by BuiltinBase::create()
}

// 20.5.7.3 Properties of the AggregateError Prototype Object
// @spec https://tc39.es/ecma262/#sec-properties-of-the-aggregate-error-prototype-object
void AggregateError::setupPrototypeMethods(JSObject* prototype,
                                           rift::memory::ObjectFactory* factory) {
    // 20.5.7.3.3 AggregateError.prototype.name
    // @spec https://tc39.es/ecma262/#sec-aggregate-error.prototype.name
    // The initial value is "AggregateError" (writable, non-enumerable, configurable per spec).
    prototype->defineProperty(
        "name", rift::runtime::PropertyDescriptor(Value("AggregateError"), true, false, true));

    // 20.5.7.3.2 AggregateError.prototype.message
    // @spec https://tc39.es/ecma262/#sec-aggregate-error.prototype.message
    // The initial value is "" (writable, non-enumerable, configurable per spec).
    prototype->defineProperty("message",
                              rift::runtime::PropertyDescriptor(Value(""), true, false, true));

    // DEVIATION: NativeError prototypes inherit toString from Error.prototype per spec.
    // Rift defines a separate toString on each NativeError prototype.
    RIFT_METHOD(prototype, "toString", 0, AggregateError::toString);
}

// 20.5.7.1 AggregateError ( errors, message [ , options ] )
// @spec https://tc39.es/ecma262/#sec-aggregate-error
Value AggregateError::constructor(const std::vector<Value>& args) {
    // 1. If NewTarget is undefined, let newTarget be the active function object;
    //    otherwise let newTarget be NewTarget.
    // SIMPLIFIED: Rift does not distinguish NewTarget; always creates a new AggregateError object.

    // 2. Let O be ? OrdinaryCreateFromConstructor(newTarget, "%AggregateError.prototype%",
    //    << [[ErrorData]] >>).
    auto errorPrototype = getGlobalPrototype();
    auto* errorObj = getObjectFactory()->createJSObject(errorPrototype);

    // Protect from GC during initialization
    rift::memory::GCProtector protect(errorObj, getObjectFactory()->getObjectManager());

    // DEVIATION: Spec does not set "name" on instances; it is inherited from the prototype.
    // Rift sets "name" directly on each NativeError instance.
    errorObj->setProperty("name", Value("AggregateError"));

    // 3. If message is not undefined, then
    //    a. Let msg be ? ToString(message).
    //    b. Perform ! CreateNonEnumerableDataPropertyOrThrow(O, "message", msg).
    // Note: args[0] is errors, args[1] is message (unlike other NativeErrors)
    if(args.size() > 1 && !args[1].isUndefined()) {
        std::string message = args[1].toString();
        errorObj->defineProperty(
            "message", rift::runtime::PropertyDescriptor(Value(message), true, false, true));
    }

    // 4. Perform ? InstallErrorCause(O, options).
    // INCOMPLETE: Error cause (options.cause) not yet implemented.

    // 5. Let errorsList be ? IterableToList(errors).
    // 6. Perform ! DefinePropertyOrThrow(O, "errors",
    //    PropertyDescriptor { [[Value]]: CreateArrayFromList(errorsList),
    //    [[Writable]]: true, [[Enumerable]]: false, [[Configurable]]: true }).
    auto* factory = getObjectFactory();
    auto* errors_array = factory->createJSObject(rift::core::BuiltinManager::getArrayPrototype());
    rift::memory::GCProtector protect2(errors_array, factory->getObjectManager());

    if(args.empty()) {
        // No errors argument — spec requires TypeError per IterableToList on undefined.
        throw rift::core::JavaScriptException(
            Value("TypeError: AggregateError requires an iterable as the first argument"));
    }

    const Value& errors_arg = args[0];
    int error_count = 0;

    if(errors_arg.isObject()) {
        auto* errors_obj = errors_arg.getObject();

        // Try Symbol.iterator first (spec-compliant path)
        std::string iter_key =
            rift::core::EvaluationUtils::symbolToPropertyKey(Symbol::getIteratorId());
        Value iter_method = errors_obj->getProperty(iter_key);

        if(iter_method.isFunction()) {
            // Use iterator protocol
            auto* iter_fn = dynamic_cast<JSFunction*>(iter_method.getObject());
            if(iter_fn) {
                rift::core::CallContext iter_ctx(rift::core::CallType::Function, errors_arg);
                Value iterator = iter_fn->call(iter_ctx, {});

                if(iterator.isObject()) {
                    auto* iter_obj = iterator.getObject();
                    Value next_method = iter_obj->getProperty("next");

                    if(next_method.isFunction()) {
                        auto* next_func = dynamic_cast<JSFunction*>(next_method.getObject());
                        if(next_func) {
                            while(true) {
                                rift::core::CallContext next_ctx(rift::core::CallType::Function,
                                                                 iterator);
                                Value result = next_func->call(next_ctx, {});

                                if(result.isObject()) {
                                    auto* result_obj = result.getObject();
                                    Value done = result_obj->getProperty("done");

                                    if(done.toBool()) {
                                        break;
                                    }

                                    Value value = result_obj->getProperty("value");
                                    errors_array->setProperty(std::to_string(error_count), value);
                                    error_count++;
                                } else {
                                    break;
                                }
                            }
                        }
                    }
                }
            }
        } else {
            // Fallback: array-like access for objects without Symbol.iterator
            Value length_val = errors_obj->getProperty("length");
            if(!length_val.isUndefined()) {
                int length = static_cast<int>(length_val.toNumber());
                for(int i = 0; i < length; i++) {
                    Value item = errors_obj->getProperty(std::to_string(i));
                    errors_array->setProperty(std::to_string(i), item);
                    error_count++;
                }
            }
        }
    } else if(!errors_arg.isUndefined() && !errors_arg.isNull()) {
        // Non-object, non-null/undefined: spec would throw TypeError from GetIterator
        throw rift::core::JavaScriptException(
            Value("TypeError: AggregateError requires an iterable as the first argument"));
    }

    errors_array->setProperty("length", Value(static_cast<double>(error_count)));

    errorObj->defineProperty(
        "errors", rift::runtime::PropertyDescriptor(Value(errors_array), true, false, true));

    // 7. Return O.
    return Value(errorObj);
}

// 20.5.3.4 Error.prototype.toString ( )
// @spec https://tc39.es/ecma262/#sec-error.prototype.tostring
// DEVIATION: Per spec, NativeError prototypes inherit toString from Error.prototype.
// Rift provides a duplicate implementation on each NativeError prototype.
Value AggregateError::toString(const std::vector<Value>& args) {
    // 1. Let O be the this value.
    // 2. If O is not an Object, throw a TypeError exception.
    auto errorObj = getThisErrorObject(args);
    if(!errorObj) {
        throw rift::core::JavaScriptException(
            Value("TypeError: AggregateError.prototype.toString called on non-object"));
    }

    // 3. Let name be ? Get(O, "name").
    // 4. If name is undefined, set name to "Error"; otherwise set name to ? ToString(name).
    Value nameValue = errorObj->getProperty("name");
    Value messageValue = errorObj->getProperty("message");

    std::string name = nameValue.isUndefined() ? "AggregateError" : nameValue.toString();

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

// NON-STANDARD: Helper to create an AggregateError object from C++ code.
// Used by Promise.any to create proper AggregateError rejections.
Value AggregateError::createError(const Value& errorsArray, const std::string& message) {
    std::vector<Value> args;
    args.push_back(errorsArray);
    if(!message.empty()) {
        args.push_back(Value(message));
    } else {
        args.push_back(Value::undefined());
    }
    return constructor(args);
}

// NON-STANDARD: Internal helper to extract the this-object from the args vector.
JSObject* AggregateError::getThisErrorObject(const std::vector<Value>& args) {
    if(args.empty()) {
        return nullptr;
    }

    const Value& thisValue = args[0];

    if(thisValue.isObject()) {
        return thisValue.getObject();
    }

    return nullptr;
}

// NON-STANDARD: Internal helper to retrieve the AggregateError prototype from BuiltinManager.
JSObject* AggregateError::getGlobalPrototype() {
    return rift::core::BuiltinManager::getAggregateErrorPrototype();
}

}  // namespace rift::builtins
