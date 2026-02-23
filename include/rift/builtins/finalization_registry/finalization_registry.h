#pragma once

#include <vector>

#include "../../memory/object_factory.h"
#include "../builtin_base.h"
#include "rift/interpreter/call_context.h"
#include "rift/types/object.h"
#include "rift/types/value.h"

namespace rift::builtins {

using namespace rift::runtime;
using rift::core::CallContext;

/// 26.2 FinalizationRegistry Objects
/// @spec https://tc39.es/ecma262/#sec-finalization-registry-objects
///
/// A FinalizationRegistry provides a way to request cleanup after an object
/// has been garbage collected. A cleanup callback is registered, and when
/// the target object is collected, the callback may be called with a
/// user-provided held value.
///
/// NOTE: The spec states that cleanup callbacks are called at implementation-
/// defined times. Since Rift does not have an event loop, cleanup callbacks
/// are not proactively invoked. The register/unregister API is fully functional.
class FinalizationRegistry : public BuiltinBase<FinalizationRegistry> {
  public:
    static constexpr const char* builtinName = "FinalizationRegistry";
    static constexpr int builtinLength = 1;

    /// 26.2.1.1 FinalizationRegistry ( cleanupCallback )
    /// @spec https://tc39.es/ecma262/#sec-finalization-registry-cleanup-callback
    static Value constructor(const CallContext& ctx, const std::vector<Value>& args);

    /// 26.2.2 Properties of the FinalizationRegistry Constructor
    /// @spec https://tc39.es/ecma262/#sec-properties-of-the-finalization-registry-constructor
    static void setupStaticMethods(JSObject* constructor, rift::memory::ObjectFactory* factory);

    /// 26.2.3 Properties of the FinalizationRegistry Prototype Object
    /// @spec https://tc39.es/ecma262/#sec-properties-of-the-finalization-registry-prototype-object
    static void setupPrototypeMethods(JSObject* prototype, rift::memory::ObjectFactory* factory);

    /// 26.2.3.2 FinalizationRegistry.prototype.register ( target, heldValue [, unregisterToken ] )
    /// @spec https://tc39.es/ecma262/#sec-finalization-registry.prototype.register
    static Value registerMethod(const CallContext& ctx, const std::vector<Value>& args);

    /// 26.2.3.3 FinalizationRegistry.prototype.unregister ( unregisterToken )
    /// @spec https://tc39.es/ecma262/#sec-finalization-registry.prototype.unregister
    static Value unregister(const CallContext& ctx, const std::vector<Value>& args);

    /// NON-STANDARD: Global prototype access for internal use.
    static JSObject* getGlobalPrototype();

    /// NON-STANDARD: Create initialized FinalizationRegistry object with internal slots.
    static JSObject* createFinalizationRegistryObject(rift::memory::ObjectFactory* factory,
                                                      const Value& callback);

    /// NON-STANDARD: Expose factory for internal use.
    static rift::memory::ObjectFactory* getFactory() {
        return BuiltinBase<FinalizationRegistry>::getObjectFactory();
    }
};

}  // namespace rift::builtins
