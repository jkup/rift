#pragma once

#include <string>
#include <vector>

#include "../../memory/object_factory.h"
#include "../builtin_base.h"
#include "rift/interpreter/call_context.h"
#include "rift/types/object.h"
#include "rift/types/value.h"

namespace rift::builtins {

using namespace rift::runtime;
using rift::core::CallContext;

/// 26.1 WeakRef Objects
/// @spec https://tc39.es/ecma262/#sec-weak-ref-objects
///
/// A WeakRef object lets you hold a weak reference to another object,
/// without preventing that object from being garbage collected.
///
/// The target can be dereferenced via deref(), which returns the target
/// if it is still alive, or undefined if it has been collected.
class WeakRef : public BuiltinBase<WeakRef> {
  public:
    /// 26.1.1.1 WeakRef ( target )
    /// @spec https://tc39.es/ecma262/#sec-weak-ref-target
    static Value constructor(const CallContext& ctx, const std::vector<Value>& args);

    /// 26.1.2 Properties of the WeakRef Constructor
    /// @spec https://tc39.es/ecma262/#sec-properties-of-the-weak-ref-constructor
    static void setupStaticMethods(JSObject* constructor, rift::memory::ObjectFactory* factory);

    /// 26.1.3 Properties of the WeakRef Prototype Object
    /// @spec https://tc39.es/ecma262/#sec-properties-of-the-weak-ref-prototype-object
    static void setupPrototypeMethods(JSObject* prototype, rift::memory::ObjectFactory* factory);

    /// 26.1.3.2 WeakRef.prototype.deref ()
    /// @spec https://tc39.es/ecma262/#sec-weak-ref.prototype.deref
    static Value deref(const CallContext& ctx, const std::vector<Value>& args);

    /// NON-STANDARD: Global prototype access for internal use.
    static JSObject* getGlobalPrototype();

    /// 7.2.7 CanBeHeldWeakly ( v )
    /// @spec https://tc39.es/ecma262/#sec-canbeheldweakly
    static bool isValidTarget(const Value& target);

    /// NON-STANDARD: Create initialized WeakRef object with internal slots.
    static JSObject* createWeakRefObject(rift::memory::ObjectFactory* factory, const Value& target);

    /// NON-STANDARD: Expose factory for internal use.
    static rift::memory::ObjectFactory* getFactory() {
        return BuiltinBase<WeakRef>::getObjectFactory();
    }
};

}  // namespace rift::builtins
