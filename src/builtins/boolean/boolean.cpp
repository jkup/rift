#include "rift/builtins/boolean/boolean.h"

#include "rift/core/engine/builtin_manager.h"
#include "rift/core/engine/call_context.h"
#include "rift/core/engine/this_helpers.h"
#include "rift/memory/gc_protector.h"

// ============================================================================
// ECMA-262 — Boolean Objects
// @spec https://tc39.es/ecma262/#sec-boolean-objects
// ============================================================================

namespace rift::builtins {

using rift::core::CallContext;
using rift::core::extractThisBool;

// ----------------------------------------------------------------------------
// 20.3.2 Properties of the Boolean Constructor
// @spec https://tc39.es/ecma262/#sec-properties-of-the-boolean-constructor
//
// The Boolean constructor has no static methods beyond Boolean.prototype
// (20.3.2.1) and the standard Function properties (name, length).
// ----------------------------------------------------------------------------
void Boolean::setupStaticMethods(JSObject* constructor, rift::memory::ObjectFactory* factory) {
    // Boolean has no static methods (like Array.isArray), so this is empty
}

// ----------------------------------------------------------------------------
// 20.3.3 Properties of the Boolean Prototype Object
// @spec https://tc39.es/ecma262/#sec-properties-of-the-boolean-prototype-object
//
// The Boolean prototype object:
//   - is %Boolean.prototype%
//   - is an ordinary object
//   - has a [[BooleanData]] internal slot with value false
//   - has a [[Prototype]] internal slot whose value is %Object.prototype%
// ----------------------------------------------------------------------------
void Boolean::setupPrototypeMethods(JSObject* prototype, rift::memory::ObjectFactory* factory) {
    // 20.3.3.1 Boolean.prototype.constructor — set up by BuiltinBase
    // @spec https://tc39.es/ecma262/#sec-boolean.prototype.constructor
    RIFT_METHOD(prototype, "toString", Boolean::toString);
    RIFT_METHOD(prototype, "valueOf", Boolean::valueOf);
}

// ----------------------------------------------------------------------------
// 20.3.1.1 Boolean ( value )
// @spec https://tc39.es/ecma262/#sec-boolean-constructor-boolean-value
//
// When Boolean is called with argument value, the following steps are taken:
//   1. Let b be ToBoolean(value).
//   2. If NewTarget is undefined, return b.
//   3. Let O be ? OrdinaryCreateFromConstructor(NewTarget, "%Boolean.prototype%",
//      << [[BooleanData]] >>).
//   4. Set O.[[BooleanData]] to b.
//   5. Return O.
// ----------------------------------------------------------------------------
Value Boolean::constructor(const CallContext& ctx, const std::vector<Value>& args) {
    // Step 1: Let b be ToBoolean(value).
    bool boolValue = args.empty() ? false : args[0].toBool();
    // Step 2: If NewTarget is undefined, return b.
    if(ctx.isConstructorCall()) {
        // Step 3: Let O be ? OrdinaryCreateFromConstructor(NewTarget,
        //         "%Boolean.prototype%", << [[BooleanData]] >>).
        // DEVIATION: We use createJSObject with the Boolean prototype directly
        // rather than OrdinaryCreateFromConstructor, so subclassing Boolean
        // via `class MyBool extends Boolean {}` won't use MyBool.prototype.
        auto booleanPrototype = getGlobalPrototype();
        auto* booleanObj = getObjectFactory()->createJSObject(booleanPrototype);

        // Protect from GC during initialization
        rift::memory::GCProtector protect(booleanObj, getObjectFactory()->getObjectManager());

        // Step 4: Set O.[[BooleanData]] to b.
        // DEVIATION: The spec uses an internal slot [[BooleanData]]; we store
        // the boolean value as a regular "value" property instead.
        booleanObj->setProperty("value", Value(boolValue));
        // Step 5: Return O.
        return Value(booleanObj);
    }
    // Step 2 (continued): return b (when called as a function, not a constructor).
    return Value(boolValue);
}

// ----------------------------------------------------------------------------
// 20.3.3.2 Boolean.prototype.toString ( )
// @spec https://tc39.es/ecma262/#sec-boolean.prototype.tostring
//
// Algorithm:
//   1. Let b be ? ThisBooleanValue(this value).
//   2. If b is true, return "true"; else return "false".
// ----------------------------------------------------------------------------
Value Boolean::toString(const CallContext& ctx, const std::vector<Value>& args) {
    // Step 1: Let b be ? ThisBooleanValue(this value).
    // SIMPLIFIED: extractThisBool handles both primitive and wrapper-object
    // cases, but does not throw a TypeError for non-Boolean this values as
    // ThisBooleanValue (20.3.3.3.1) requires.
    bool boolValue = extractThisBool(ctx);
    // Step 2: If b is true, return "true"; else return "false".
    return Value(boolValue ? "true" : "false");
}

// ----------------------------------------------------------------------------
// 20.3.3.3 Boolean.prototype.valueOf ( )
// @spec https://tc39.es/ecma262/#sec-boolean.prototype.valueof
//
// Algorithm:
//   1. Return ? ThisBooleanValue(this value).
//
// ThisBooleanValue ( value ) — 20.3.3.3.1
// @spec https://tc39.es/ecma262/#sec-thisbooleanvalue
//   1. If value is a Boolean, return value.
//   2. If value is an Object and value has a [[BooleanData]] internal slot, then
//      a. Let b be value.[[BooleanData]].
//      b. Assert: b is a Boolean.
//      c. Return b.
//   3. Throw a TypeError exception.
// ----------------------------------------------------------------------------
Value Boolean::valueOf(const CallContext& ctx, const std::vector<Value>& args) {
    // Step 1: Return ? ThisBooleanValue(this value).
    // SIMPLIFIED: extractThisBool handles both primitive and wrapper-object
    // cases (steps 1-2 of ThisBooleanValue), but uses a "value" property
    // instead of the [[BooleanData]] internal slot, and falls back to
    // toBool() instead of throwing a TypeError for non-Boolean this values
    // (step 3 of ThisBooleanValue).
    bool boolValue = extractThisBool(ctx);
    return Value(boolValue);
}

// ----------------------------------------------------------------------------
// Helper: retrieve the %Boolean.prototype% intrinsic object.
// @spec https://tc39.es/ecma262/#sec-boolean.prototype
// (20.3.2.1 Boolean.prototype)
// ----------------------------------------------------------------------------
JSObject* Boolean::getGlobalPrototype() {
    return rift::core::BuiltinManager::getBooleanPrototype();
}

}  // namespace rift::builtins