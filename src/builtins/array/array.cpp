// Array builtin - core functionality
// Setup, constructor, utilities, and static methods
//
// Implementation is split across multiple files for maintainability:
// - array.cpp (this file): Core setup, constructor, utilities, static methods
// - array_mutators.cpp: Methods that modify arrays in place (push, pop, splice, etc.)
// - array_iterators.cpp: Callback-based iteration methods (forEach, map, filter, etc.)
// - array_accessors.cpp: Methods that access/search/copy (indexOf, slice, concat, etc.)

#include "rift/builtins/array/array.h"

#include <cmath>
#include <limits>

#include "rift/builtins/array/array_iterator.h"
#include "rift/builtins/symbol/symbol.h"
#include "rift/core/engine/builtin_manager.h"
#include "rift/core/engine/call_context.h"
#include "rift/core/engine/evaluation_utils.h"
#include "rift/core/engine/javascript_exception.h"
#include "rift/core/engine/this_helpers.h"
#include "rift/memory/gc_protector.h"

namespace rift::builtins {

// ============================================================================
// Setup Methods
// ============================================================================

void Array::setupStaticMethods(JSObject* constructor, rift::memory::ObjectFactory* factory) {
    RIFT_STATIC_METHOD(constructor, "isArray", Array::isArray);
    RIFT_STATIC_METHOD(constructor, "from", Array::from);
    RIFT_STATIC_METHOD(constructor, "of", Array::of);
}

void Array::setupPrototypeMethods(JSObject* prototype, rift::memory::ObjectFactory* factory) {
    // Mutator methods (array_mutators.cpp)
    RIFT_METHOD(prototype, "push", Array::push);
    RIFT_METHOD(prototype, "pop", Array::pop);
    RIFT_METHOD(prototype, "shift", Array::shift);
    RIFT_METHOD(prototype, "unshift", Array::unshift);
    RIFT_METHOD(prototype, "splice", Array::splice);
    RIFT_METHOD(prototype, "reverse", Array::reverse);
    RIFT_METHOD(prototype, "sort", Array::sort);

    // Iterator methods (array_iterators.cpp)
    RIFT_METHOD(prototype, "forEach", Array::forEach);
    RIFT_METHOD(prototype, "map", Array::map);
    RIFT_METHOD(prototype, "filter", Array::filter);
    RIFT_METHOD(prototype, "reduce", Array::reduce);
    RIFT_METHOD(prototype, "reduceRight", Array::reduceRight);
    RIFT_METHOD(prototype, "find", Array::find);
    RIFT_METHOD(prototype, "findIndex", Array::findIndex);
    RIFT_METHOD(prototype, "findLast", Array::findLast);
    RIFT_METHOD(prototype, "findLastIndex", Array::findLastIndex);
    RIFT_METHOD(prototype, "every", Array::every);
    RIFT_METHOD(prototype, "some", Array::some);
    RIFT_METHOD(prototype, "flat", Array::flat);
    RIFT_METHOD(prototype, "flatMap", Array::flatMap);

    // Accessor methods (array_accessors.cpp)
    RIFT_METHOD(prototype, "indexOf", Array::indexOf);
    RIFT_METHOD(prototype, "lastIndexOf", Array::lastIndexOf);
    RIFT_METHOD(prototype, "includes", Array::includes);
    RIFT_METHOD(prototype, "slice", Array::slice);
    RIFT_METHOD(prototype, "concat", Array::concat);
    RIFT_METHOD(prototype, "join", Array::join);
    RIFT_METHOD(prototype, "toString", Array::toString);

    // Iterator methods
    RIFT_METHOD(prototype, "keys", Array::keys);
    RIFT_METHOD(prototype, "values", Array::values);
    RIFT_METHOD(prototype, "entries", Array::entries);

    // Symbol.iterator - alias for values() per ECMAScript spec
    std::string iterator_key = core::EvaluationUtils::symbolToPropertyKey(Symbol::getIteratorId());
    auto* iterator_func = factory->createJSFunction(Array::values);
    prototype->setProperty(iterator_key, Value(iterator_func));
}

// ============================================================================
// Constructor
// ============================================================================

Value Array::constructor(const CallContext& ctx, const std::vector<Value>& args) {
    // Create array with proper prototype chain using GC-managed creation
    auto* arrayPrototype = getGlobalPrototype();
    auto* arrayObj = getObjectFactory()->createJSObject(arrayPrototype);

    // CRITICAL: Protect arrayObj from GC collection during initialization
    rift::memory::GCProtector protect(arrayObj, getObjectFactory()->getObjectManager());

    size_t effectiveArgCount = args.size();

    if(effectiveArgCount == 0) {
        // new Array() - create empty array
        setArrayLength(arrayObj, 0);
    } else if(effectiveArgCount == 1 && args[0].isNumber()) {
        // new Array(length) - create array with specific length
        double length = args[0].toNumber();
        size_t safeLength;
        if(!core::EvaluationUtils::toSafeArrayLength(length, safeLength)) {
            // Invalid length: NaN, Infinity, negative, or > MAX_ARRAY_LENGTH
            setArrayLength(arrayObj, 0);
        } else {
            setArrayLength(arrayObj, safeLength);
        }
    } else {
        // new Array(element0, element1, ...) - create array with elements
        for(size_t i = 0; i < effectiveArgCount; ++i) {
            arrayObj->setProperty(std::to_string(i), args[i]);
        }
        setArrayLength(arrayObj, effectiveArgCount);
    }

    return Value(arrayObj);
}

// ============================================================================
// Utility Methods
// ============================================================================

size_t Array::getArrayLength(JSObject* obj) {
    if(!obj) {
        return 0;
    }

    Value lengthValue = obj->getProperty("length");
    if(lengthValue.isNumber()) {
        double length = lengthValue.toNumber();
        if(length >= 0 && !std::isnan(length) && !std::isinf(length)) {
            return static_cast<size_t>(length);
        }
    }

    return 0;
}

void Array::setArrayLength(JSObject* obj, size_t length) {
    if(obj) {
        obj->setProperty("length", Value(static_cast<double>(length)));
    }
}

JSObject* Array::createArrayObject(rift::memory::ObjectFactory* factory,
                                   std::vector<Value> elements) {
    auto* arrayPrototype = getGlobalPrototype();
    auto* arrayObj = factory->createJSObject(arrayPrototype);

    rift::memory::GCProtector protect(arrayObj, factory->getObjectManager());

    for(size_t i = 0; i < elements.size(); ++i) {
        arrayObj->setProperty(std::to_string(i), elements[i]);
    }

    setArrayLength(arrayObj, elements.size());

    return arrayObj;
}

JSObject* Array::getGlobalPrototype() {
    return rift::core::BuiltinManager::getArrayPrototype();
}

// ============================================================================
// Static Methods
// ============================================================================

Value Array::isArray(const CallContext& ctx, const std::vector<Value>& args) {
    if(args.empty()) {
        return Value(false);
    }

    Value arg = args[0];

    if(!arg.isObject() && !arg.isFunction()) {
        return Value(false);
    }

    auto* obj = arg.getObject();
    if(!obj) {
        return Value(false);
    }

    Value lengthValue = obj->getProperty("length");
    if(!lengthValue.isNumber()) {
        return Value(false);
    }

    double length = lengthValue.toNumber();
    if(length < 0 || std::isnan(length) || std::isinf(length)) {
        return Value(false);
    }

    Value pushMethod = obj->getProperty("push");
    if(pushMethod.isFunction()) {
        return Value(true);
    }

    if(length == 0) {
        return Value(true);
    }

    size_t arrayLength = static_cast<size_t>(length);
    for(size_t i = 0; i < std::min(arrayLength, static_cast<size_t>(3)); ++i) {
        Value element = obj->getProperty(std::to_string(i));
        if(!element.isUndefined()) {
            return Value(true);
        }
    }

    return Value(false);
}

Value Array::from(const CallContext& ctx, const std::vector<Value>& args) {
    if(args.empty()) {
        return Value(createArrayObject(getObjectFactory(), {}));
    }

    Value arrayLike = args[0];

    if(arrayLike.isNull() || arrayLike.isUndefined()) {
        return Value(createArrayObject(getObjectFactory(), {}));
    }

    std::vector<Value> result;

    if(arrayLike.isString()) {
        // Spread a string into individual characters
        std::string str = arrayLike.getString();
        for(char c : str) {
            result.push_back(Value(std::string(1, c)));
        }
    } else if(arrayLike.isObject()) {
        auto* obj = arrayLike.getObject();

        // First, check for Symbol.iterator (iterator protocol)
        std::string iterator_key =
            rift::core::EvaluationUtils::symbolToPropertyKey(Symbol::getIteratorId());
        Value iterator_method = obj->getProperty(iterator_key);

        if(iterator_method.isFunction()) {
            // Use iterator protocol
            auto* iterator_func = dynamic_cast<JSFunction*>(iterator_method.getObject());
            if(iterator_func) {
                rift::core::CallContext iter_ctx(rift::core::CallType::Function, arrayLike);
                Value iterator = iterator_func->call(iter_ctx, {});

                if(iterator.isObject()) {
                    auto* iterator_obj = iterator.getObject();

                    // Repeatedly call next() until done
                    while(true) {
                        Value next_method = iterator_obj->getProperty("next");
                        if(!next_method.isFunction()) {
                            break;
                        }

                        auto* next_func = dynamic_cast<JSFunction*>(next_method.getObject());
                        if(!next_func) {
                            break;
                        }

                        rift::core::CallContext next_ctx(rift::core::CallType::Function, iterator);
                        Value iter_result = next_func->call(next_ctx, {});

                        if(!iter_result.isObject()) {
                            break;
                        }

                        auto* result_obj = iter_result.getObject();
                        Value done = result_obj->getProperty("done");
                        if(done.toBool()) {
                            break;
                        }

                        Value value = result_obj->getProperty("value");
                        result.push_back(value);
                    }
                }
            }
        } else {
            // Fall back to array-like iteration (length property)
            Value lengthVal = obj->getProperty("length");

            if(lengthVal.isNumber()) {
                size_t length = static_cast<size_t>(lengthVal.toNumber());

                for(size_t i = 0; i < length; ++i) {
                    Value element = obj->getProperty(std::to_string(i));
                    result.push_back(element);
                }
            }
        }
    }

    if(args.size() >= 2 && args[1].isFunction()) {
        auto* mapFn = dynamic_cast<JSFunction*>(args[1].getObject());
        if(!mapFn) {
            throw rift::core::JavaScriptException(
                Value("TypeError: Array.from mapFn is not a function"));
        }
        for(size_t i = 0; i < result.size(); ++i) {
            std::vector<Value> callArgs = {result[i], Value(static_cast<double>(i))};
            rift::core::CallContext cbCtx(rift::core::CallType::Function, Value::undefined());
            result[i] = mapFn->call(cbCtx, callArgs);
        }
    }

    return Value(createArrayObject(getObjectFactory(), std::move(result)));
}

Value Array::of(const CallContext& ctx, const std::vector<Value>& args) {
    std::vector<Value> elements;

    for(size_t i = 0; i < args.size(); ++i) {
        elements.push_back(args[i]);
    }

    return Value(createArrayObject(getObjectFactory(), std::move(elements)));
}

// ============================================================================
// Iterator Methods - keys(), values(), entries()
// ============================================================================

Value Array::keys(const CallContext& ctx, const std::vector<Value>& /* args */) {
    if(!ctx.thisValue.isObject()) {
        throw core::JavaScriptException(
            Value("TypeError: Array.prototype.keys called on non-object"));
    }
    return Value(ArrayIterator::create(getObjectFactory(), ctx.thisValue.getObject(),
                                       ArrayIterationKind::Key));
}

Value Array::values(const CallContext& ctx, const std::vector<Value>& /* args */) {
    if(!ctx.thisValue.isObject()) {
        throw core::JavaScriptException(
            Value("TypeError: Array.prototype.values called on non-object"));
    }
    return Value(ArrayIterator::create(getObjectFactory(), ctx.thisValue.getObject(),
                                       ArrayIterationKind::Value));
}

Value Array::entries(const CallContext& ctx, const std::vector<Value>& /* args */) {
    if(!ctx.thisValue.isObject()) {
        throw core::JavaScriptException(
            Value("TypeError: Array.prototype.entries called on non-object"));
    }
    return Value(ArrayIterator::create(getObjectFactory(), ctx.thisValue.getObject(),
                                       ArrayIterationKind::KeyValue));
}

// symbolIterator is now an alias for values() - registered in setupPrototypeMethods

}  // namespace rift::builtins
