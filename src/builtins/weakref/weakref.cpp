#include "rift/builtins/weakref/weakref.h"

#include <sstream>

#include "rift/builtins/builtin_manager.h"
#include "rift/builtins/symbol/symbol.h"
#include "rift/interpreter/evaluation_utils.h"
#include "rift/interpreter/javascript_exception.h"
#include "rift/memory/gc_protector.h"
#include "rift/types/object.h"

// ============================================================================
// ECMA-262 -- WeakRef Objects (26.1)
// @spec https://tc39.es/ecma262/#sec-weak-ref-objects
//
// A WeakRef object contains a weak reference to an object (the target).
// The target can be retrieved via deref() if it has not been garbage collected.
//
// Constructor (26.1.1): WeakRef ( target )
// Prototype methods (26.1.3): deref
//
// See also: weakmap/weakmap.cpp (24.3), weakset/weakset.cpp (24.4)
// ============================================================================

namespace rift::builtins {

// ============================================================================
// Setup Methods
// ============================================================================

// 26.1.2 Properties of the WeakRef Constructor
// @spec https://tc39.es/ecma262/#sec-properties-of-the-weak-ref-constructor
void WeakRef::setupStaticMethods(JSObject* /*constructor*/,
                                 rift::memory::ObjectFactory* /*factory*/) {
    // WeakRef has no static methods in ES2025
}

// 26.1.3 Properties of the WeakRef Prototype Object
// @spec https://tc39.es/ecma262/#sec-properties-of-the-weak-ref-prototype-object
void WeakRef::setupPrototypeMethods(JSObject* prototype, rift::memory::ObjectFactory* factory) {
    // 26.1.3.2 WeakRef.prototype.deref ()
    RIFT_METHOD(prototype, "deref", 0, WeakRef::deref);

    // 26.1.3.3 WeakRef.prototype [ @@toStringTag ]
    // @spec https://tc39.es/ecma262/#sec-weak-ref.prototype-@@tostringtag
    std::string toStringTagKey =
        rift::core::EvaluationUtils::symbolToPropertyKey(Symbol::getToStringTagId());
    prototype->defineProperty(
        toStringTagKey, PropertyDescriptor(Value(std::string("WeakRef")), false, false, true));
}

// ============================================================================
// Helper Methods
// ============================================================================

/**
 * Check if a value is a valid WeakRef target.
 * Corresponds to the CanBeHeldWeakly abstract operation (7.2.7).
 * @spec https://tc39.es/ecma262/#sec-canbeheldweakly
 *
 * Per spec, an object or a non-registered symbol can be held weakly.
 * SIMPLIFIED: Rift only accepts objects/functions as weak targets;
 * registered symbols as weak targets are not yet supported.
 */
bool WeakRef::isValidTarget(const Value& target) {
    return target.getType() == ValueType::Object || target.getType() == ValueType::Function;
}

/**
 * Create a WeakRef object with the given target stored as a weak reference.
 * Sets up the [[WeakRefTarget]] internal slot required by the spec.
 * DEVIATION: The spec defines [[WeakRefTarget]] as a direct object reference.
 * Rift stores it as a weak property on the WeakRef object and checks liveness
 * via ObjectManager::objectExists() on deref().
 */
JSObject* WeakRef::createWeakRefObject(rift::memory::ObjectFactory* factory, const Value& target) {
    auto* weak_ref_obj = factory->createJSObject(getGlobalPrototype());
    rift::memory::GCProtector protect(weak_ref_obj, factory->getObjectManager());

    // Store target as a weak reference (non-enumerable internal slot)
    weak_ref_obj->setWeakProperty("[[WeakRefTarget]]", target);

    // Also store the raw pointer for objectExists() checks (non-enumerable internal slot)
    std::ostringstream oss;
    oss << static_cast<const void*>(target.getObject());
    weak_ref_obj->defineProperty("[[WeakRefTargetPtr]]",
                                 PropertyDescriptor(Value(oss.str()), false, false, false));

    return weak_ref_obj;
}

// ============================================================================
// Constructor
// ============================================================================

// 26.1.1.1 WeakRef ( target )
// @spec https://tc39.es/ecma262/#sec-weak-ref-target
Value WeakRef::constructor(const CallContext& ctx, const std::vector<Value>& args) {
    auto* factory = getObjectFactory();

    // 1. If NewTarget is undefined, throw a TypeError exception.
    // SIMPLIFIED: Rift does not distinguish NewTarget; always creates a new object.

    // 2. If CanBeHeldWeakly(target) is false, throw a TypeError exception.
    Value target = args.empty() ? Value() : args[0];
    if(!isValidTarget(target)) {
        throw rift::core::JavaScriptException(
            Value("TypeError: WeakRef: target must be an object"));
    }

    // 3. Let weakRef be ? OrdinaryCreateFromConstructor(NewTarget,
    //    "%WeakRef.prototype%", << [[WeakRefTarget]] >>).
    // 4. Set weakRef.[[WeakRefTarget]] to target.
    auto* weak_ref_obj = createWeakRefObject(factory, target);

    // 5. Return weakRef.
    return Value(weak_ref_obj);
}

// ============================================================================
// Instance Methods
// ============================================================================

// 26.1.3.2 WeakRef.prototype.deref ()
// @spec https://tc39.es/ecma262/#sec-weak-ref.prototype.deref
Value WeakRef::deref(const CallContext& ctx, const std::vector<Value>& args) {
    // 1. Let weakRef be the this value.
    // 2. Perform ? RequireInternalSlot(weakRef, [[WeakRefTarget]]).
    if(ctx.thisValue.getType() != ValueType::Object) {
        throw rift::core::JavaScriptException(
            Value("TypeError: WeakRef.prototype.deref called on non-object"));
    }

    auto* weak_ref_obj = ctx.thisValue.getObject();

    Value ptr_val = weak_ref_obj->getProperty("[[WeakRefTargetPtr]]");
    if(ptr_val.isUndefined()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Method WeakRef.prototype.deref called on incompatible receiver"));
    }

    // 3. Return WeakRefDeref(weakRef).
    // WeakRefDeref:
    // a. Let target be weakRef.[[WeakRefTarget]].
    // b. If target is empty, return undefined.
    // c. Perform AddToKeptObjects(target).
    // d. Return target.

    // Get the target pointer string for objectExists() check
    std::string ptr_str = ptr_val.toString();

    // Parse the pointer back to check liveness
    void* raw_ptr = nullptr;
    std::istringstream iss(ptr_str);
    iss >> raw_ptr;

    auto* factory = getObjectFactory();
    auto* target_obj = static_cast<JSObject*>(raw_ptr);

    // Check if the target object still exists
    if(!factory->getObjectManager()->objectExists(target_obj)) {
        // Target has been garbage collected — return undefined
        return Value();
    }

    // Target is still alive — return it
    return Value(target_obj);
}

JSObject* WeakRef::getGlobalPrototype() {
    return rift::core::BuiltinManager::getWeakRefPrototype();
}

}  // namespace rift::builtins
