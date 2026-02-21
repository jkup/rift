#include "rift/builtins/finalization_registry/finalization_registry.h"

#include <sstream>

#include "rift/builtins/builtin_manager.h"
#include "rift/builtins/symbol/symbol.h"
#include "rift/builtins/weakmap/weakmap.h"
#include "rift/interpreter/evaluation_utils.h"
#include "rift/interpreter/javascript_exception.h"
#include "rift/memory/gc_protector.h"
#include "rift/types/object.h"

// ============================================================================
// ECMA-262 -- FinalizationRegistry Objects (26.2)
// @spec https://tc39.es/ecma262/#sec-finalization-registry-objects
//
// FinalizationRegistry provides cleanup callbacks for garbage-collected objects.
// Users register a target object with a held value; when the target is collected,
// the cleanup callback may be called with the held value.
//
// Constructor (26.2.1): FinalizationRegistry ( cleanupCallback )
// Prototype methods (26.2.3): register, unregister
//
// NOTE: Cleanup callbacks are invoked at implementation-defined times. Since
// Rift does not have an event loop, callbacks are not proactively triggered.
// The register/unregister API is fully functional.
//
// See also: weakref/weakref.cpp (26.1), weakmap/weakmap.cpp (24.3)
// ============================================================================

namespace rift::builtins {

// ============================================================================
// Setup Methods
// ============================================================================

// 26.2.2 Properties of the FinalizationRegistry Constructor
// @spec https://tc39.es/ecma262/#sec-properties-of-the-finalization-registry-constructor
void FinalizationRegistry::setupStaticMethods(JSObject* /*constructor*/,
                                              rift::memory::ObjectFactory* /*factory*/) {
    // FinalizationRegistry has no static methods in ES2025
}

// 26.2.3 Properties of the FinalizationRegistry Prototype Object
// @spec https://tc39.es/ecma262/#sec-properties-of-the-finalization-registry-prototype-object
void FinalizationRegistry::setupPrototypeMethods(JSObject* prototype,
                                                 rift::memory::ObjectFactory* factory) {
    // 26.2.3.2 FinalizationRegistry.prototype.register ( target, heldValue [, unregisterToken ] )
    {
        auto* fn = factory->createJSFunction(FinalizationRegistry::registerMethod);
        fn->defineProperty("name",
                           PropertyDescriptor(Value(std::string("register")), false, false, true));
        fn->defineProperty("length", PropertyDescriptor(Value(2.0), false, false, true));
        prototype->defineProperty("register", PropertyDescriptor(Value(fn), true, false, true));
    }
    // 26.2.3.3 FinalizationRegistry.prototype.unregister ( unregisterToken )
    {
        auto* fn = factory->createJSFunction(FinalizationRegistry::unregister);
        fn->defineProperty(
            "name", PropertyDescriptor(Value(std::string("unregister")), false, false, true));
        fn->defineProperty("length", PropertyDescriptor(Value(1.0), false, false, true));
        prototype->defineProperty("unregister", PropertyDescriptor(Value(fn), true, false, true));
    }

    // 26.2.3.4 FinalizationRegistry.prototype [ @@toStringTag ]
    // @spec https://tc39.es/ecma262/#sec-finalization-registry.prototype-@@tostringtag
    std::string to_string_tag_key =
        rift::core::EvaluationUtils::symbolToPropertyKey(Symbol::getToStringTagId());
    prototype->defineProperty(
        to_string_tag_key,
        PropertyDescriptor(Value(std::string("FinalizationRegistry")), false, false, true));
}

// ============================================================================
// Helper Methods
// ============================================================================

/**
 * Create a FinalizationRegistry object with internal slots initialized.
 * Sets up [[CleanupCallback]] and [[Cells]] internal slots.
 * DEVIATION: The spec defines [[Cells]] as a List of Records
 * { [[WeakRefTarget]], [[HeldValue]], [[UnregisterToken]] }.
 * Rift stores cells as numbered properties on a JSObject.
 */
JSObject* FinalizationRegistry::createFinalizationRegistryObject(
    rift::memory::ObjectFactory* factory, const Value& callback) {
    auto* fr_obj = factory->createJSObject(getGlobalPrototype());
    rift::memory::GCProtector protect(fr_obj, factory->getObjectManager());

    // Store the cleanup callback (non-enumerable internal slot)
    fr_obj->defineProperty("[[CleanupCallback]]",
                           PropertyDescriptor(callback, false, false, false));

    // Create internal storage for cells (non-enumerable internal slot)
    auto* cells = factory->createJSObject();
    fr_obj->defineProperty("[[Cells]]", PropertyDescriptor(Value(cells), false, false, false));

    // Track the number of cells (non-enumerable internal slot)
    fr_obj->defineProperty("[[CellCount]]", PropertyDescriptor(Value(0.0), true, false, false));

    return fr_obj;
}

// ============================================================================
// Constructor
// ============================================================================

// 26.2.1.1 FinalizationRegistry ( cleanupCallback )
// @spec https://tc39.es/ecma262/#sec-finalization-registry-cleanup-callback
Value FinalizationRegistry::constructor(const CallContext& ctx, const std::vector<Value>& args) {
    auto* factory = getObjectFactory();

    // 1. If NewTarget is undefined, throw a TypeError exception.
    // SIMPLIFIED: Rift does not distinguish NewTarget; always creates a new object.

    // 2. If IsCallable(cleanupCallback) is false, throw a TypeError exception.
    Value callback = args.empty() ? Value() : args[0];
    if(callback.getType() != ValueType::Function) {
        throw rift::core::JavaScriptException(
            Value("TypeError: FinalizationRegistry: cleanup callback must be a function"));
    }

    // 3. Let finalizationRegistry be ? OrdinaryCreateFromConstructor(NewTarget,
    //    "%FinalizationRegistry.prototype%", << [[Realm]], [[CleanupCallback]], [[Cells]] >>).
    // 4. Set finalizationRegistry.[[CleanupCallback]] to cleanupCallback.
    // 5. Set finalizationRegistry.[[Cells]] to a new empty List.
    auto* fr_obj = createFinalizationRegistryObject(factory, callback);

    // 6. Return finalizationRegistry.
    return Value(fr_obj);
}

// ============================================================================
// Instance Methods
// ============================================================================

// 26.2.3.2 FinalizationRegistry.prototype.register ( target, heldValue [, unregisterToken ] )
// @spec https://tc39.es/ecma262/#sec-finalization-registry.prototype.register
Value FinalizationRegistry::registerMethod(const CallContext& ctx, const std::vector<Value>& args) {
    // 1. Let finalizationRegistry be the this value.
    // 2. Perform ? RequireInternalSlot(finalizationRegistry, [[Cells]]).
    if(ctx.thisValue.getType() != ValueType::Object) {
        throw rift::core::JavaScriptException(
            Value("TypeError: FinalizationRegistry.prototype.register called on non-object"));
    }

    auto* fr_obj = ctx.thisValue.getObject();

    Value cells_val = fr_obj->getProperty("[[Cells]]");
    if(cells_val.isUndefined()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Method FinalizationRegistry.prototype.register called on "
                  "incompatible receiver"));
    }

    Value target = args.empty() ? Value() : args[0];
    Value held_value = args.size() > 1 ? args[1] : Value();
    Value unregister_token = args.size() > 2 ? args[2] : Value();

    // 3. If CanBeHeldWeakly(target) is false, throw a TypeError exception.
    if(!WeakMap::isValidWeakKey(target)) {
        throw rift::core::JavaScriptException(
            Value("TypeError: FinalizationRegistry.prototype.register: target must be an object"));
    }

    // 4. If SameValue(target, heldValue) is true, throw a TypeError exception.
    if((held_value.getType() == ValueType::Object || held_value.getType() == ValueType::Function) &&
       target.getObject() == held_value.getObject()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: FinalizationRegistry.prototype.register: target and heldValue "
                  "must not be the same object"));
    }

    // 5. If CanBeHeldWeakly(unregisterToken) is false, then
    //    a. If unregisterToken is not undefined, throw a TypeError exception.
    //    b. Set unregisterToken to empty.
    if(!unregister_token.isUndefined() && !WeakMap::isValidWeakKey(unregister_token)) {
        throw rift::core::JavaScriptException(
            Value("TypeError: FinalizationRegistry.prototype.register: unregisterToken "
                  "must be an object or undefined"));
    }

    // 6. Let cell be the Record { [[WeakRefTarget]]: target,
    //    [[HeldValue]]: heldValue, [[UnregisterToken]]: unregisterToken }.
    auto* factory = getObjectFactory();
    auto* cell = factory->createJSObject();
    rift::memory::GCProtector cell_protect(cell, factory->getObjectManager());

    // Store target as weak reference
    cell->setWeakProperty("[[WeakRefTarget]]", target);

    // Store the raw target pointer for liveness checks
    std::ostringstream oss;
    oss << static_cast<const void*>(target.getObject());
    cell->setProperty("[[TargetPtr]]", Value(oss.str()));

    // Store held value as strong reference
    cell->setProperty("[[HeldValue]]", held_value);

    // Store unregister token as weak reference (if provided)
    if(!unregister_token.isUndefined()) {
        cell->setWeakProperty("[[UnregisterToken]]", unregister_token);
        std::ostringstream token_oss;
        token_oss << static_cast<const void*>(unregister_token.getObject());
        cell->setProperty("[[TokenPtr]]", Value(token_oss.str()));
    }

    // 7. Append cell to finalizationRegistry.[[Cells]].
    auto* cells = cells_val.getObject();
    Value count_val = fr_obj->getProperty("[[CellCount]]");
    int count = static_cast<int>(count_val.toNumber());
    cells->setProperty(std::to_string(count), Value(cell));
    fr_obj->setProperty("[[CellCount]]", Value(static_cast<double>(count + 1)));

    // 8. Return undefined.
    return Value();
}

// 26.2.3.3 FinalizationRegistry.prototype.unregister ( unregisterToken )
// @spec https://tc39.es/ecma262/#sec-finalization-registry.prototype.unregister
Value FinalizationRegistry::unregister(const CallContext& ctx, const std::vector<Value>& args) {
    // 1. Let finalizationRegistry be the this value.
    // 2. Perform ? RequireInternalSlot(finalizationRegistry, [[Cells]]).
    if(ctx.thisValue.getType() != ValueType::Object) {
        throw rift::core::JavaScriptException(
            Value("TypeError: FinalizationRegistry.prototype.unregister called on non-object"));
    }

    auto* fr_obj = ctx.thisValue.getObject();

    Value cells_val = fr_obj->getProperty("[[Cells]]");
    if(cells_val.isUndefined()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Method FinalizationRegistry.prototype.unregister called on "
                  "incompatible receiver"));
    }

    Value unregister_token = args.empty() ? Value() : args[0];

    // 3. If CanBeHeldWeakly(unregisterToken) is false, throw a TypeError exception.
    if(!WeakMap::isValidWeakKey(unregister_token)) {
        throw rift::core::JavaScriptException(
            Value("TypeError: FinalizationRegistry.prototype.unregister: unregisterToken "
                  "must be an object"));
    }

    // 4. Let removed be false.
    bool removed = false;

    // 5. For each Record { [[WeakRefTarget]], [[HeldValue]], [[UnregisterToken]] } cell
    //    of finalizationRegistry.[[Cells]], do
    //    a. If cell.[[UnregisterToken]] is not empty and
    //       SameValue(cell.[[UnregisterToken]], unregisterToken) is true, then
    //       i. Remove cell from finalizationRegistry.[[Cells]].
    //       ii. Set removed to true.
    auto* cells = cells_val.getObject();
    Value count_val = fr_obj->getProperty("[[CellCount]]");
    int count = static_cast<int>(count_val.toNumber());

    std::ostringstream token_oss;
    token_oss << static_cast<const void*>(unregister_token.getObject());
    std::string token_ptr_str = token_oss.str();

    for(int i = 0; i < count; i++) {
        Value cell_val = cells->getProperty(std::to_string(i));
        if(cell_val.isUndefined() || cell_val.getType() != ValueType::Object) {
            continue;
        }

        auto* cell = cell_val.getObject();
        Value cell_token_ptr = cell->getProperty("[[TokenPtr]]");
        if(!cell_token_ptr.isUndefined() && cell_token_ptr.toString() == token_ptr_str) {
            // Remove this cell by setting it to undefined
            cells->setProperty(std::to_string(i), Value());
            removed = true;
        }
    }

    // 6. Return removed.
    return Value(removed);
}

JSObject* FinalizationRegistry::getGlobalPrototype() {
    return rift::core::BuiltinManager::getFinalizationRegistryPrototype();
}

}  // namespace rift::builtins
