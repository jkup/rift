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
    constructor->setProperty("isArray", Value(factory->createJSFunction(Array::isArray)));
    constructor->setProperty("from", Value(factory->createJSFunction(Array::from)));
    constructor->setProperty("of", Value(factory->createJSFunction(Array::of)));
}

void Array::setupPrototypeMethods(JSObject* prototype, rift::memory::ObjectFactory* factory) {
    // Mutator methods (array_mutators.cpp)
    prototype->setProperty("push", Value(factory->createJSFunction(Array::push)));
    prototype->setProperty("pop", Value(factory->createJSFunction(Array::pop)));
    prototype->setProperty("shift", Value(factory->createJSFunction(Array::shift)));
    prototype->setProperty("unshift", Value(factory->createJSFunction(Array::unshift)));
    prototype->setProperty("splice", Value(factory->createJSFunction(Array::splice)));
    prototype->setProperty("reverse", Value(factory->createJSFunction(Array::reverse)));
    prototype->setProperty("sort", Value(factory->createJSFunction(Array::sort)));

    // Iterator methods (array_iterators.cpp)
    prototype->setProperty("forEach", Value(factory->createJSFunction(Array::forEach)));
    prototype->setProperty("map", Value(factory->createJSFunction(Array::map)));
    prototype->setProperty("filter", Value(factory->createJSFunction(Array::filter)));
    prototype->setProperty("reduce", Value(factory->createJSFunction(Array::reduce)));
    prototype->setProperty("reduceRight", Value(factory->createJSFunction(Array::reduceRight)));
    prototype->setProperty("find", Value(factory->createJSFunction(Array::find)));
    prototype->setProperty("findIndex", Value(factory->createJSFunction(Array::findIndex)));
    prototype->setProperty("findLast", Value(factory->createJSFunction(Array::findLast)));
    prototype->setProperty("findLastIndex", Value(factory->createJSFunction(Array::findLastIndex)));
    prototype->setProperty("every", Value(factory->createJSFunction(Array::every)));
    prototype->setProperty("some", Value(factory->createJSFunction(Array::some)));
    prototype->setProperty("flat", Value(factory->createJSFunction(Array::flat)));
    prototype->setProperty("flatMap", Value(factory->createJSFunction(Array::flatMap)));

    // Accessor methods (array_accessors.cpp)
    prototype->setProperty("indexOf", Value(factory->createJSFunction(Array::indexOf)));
    prototype->setProperty("lastIndexOf", Value(factory->createJSFunction(Array::lastIndexOf)));
    prototype->setProperty("includes", Value(factory->createJSFunction(Array::includes)));
    prototype->setProperty("slice", Value(factory->createJSFunction(Array::slice)));
    prototype->setProperty("concat", Value(factory->createJSFunction(Array::concat)));
    prototype->setProperty("join", Value(factory->createJSFunction(Array::join)));
    prototype->setProperty("toString", Value(factory->createJSFunction(Array::toString)));
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
                                   const std::vector<Value>& elements) {
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

    if(arrayLike.isObject()) {
        auto* obj = arrayLike.getObject();
        Value lengthVal = obj->getProperty("length");

        if(lengthVal.isNumber()) {
            size_t length = static_cast<size_t>(lengthVal.toNumber());

            for(size_t i = 0; i < length; ++i) {
                Value element = obj->getProperty(std::to_string(i));
                result.push_back(element);
            }
        } else {
            result.push_back(arrayLike);
        }
    } else {
        result.push_back(arrayLike);
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

    return Value(createArrayObject(getObjectFactory(), result));
}

Value Array::of(const CallContext& ctx, const std::vector<Value>& args) {
    std::vector<Value> elements;

    for(size_t i = 0; i < args.size(); ++i) {
        elements.push_back(args[i]);
    }

    return Value(createArrayObject(getObjectFactory(), elements));
}

}  // namespace rift::builtins
