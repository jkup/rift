#pragma once

#include <functional>
#include <type_traits>
#include <vector>

#include "../memory/object_factory.h"
#include "rift/interpreter/call_context.h"
#include "rift/types/object.h"
#include "rift/types/value.h"

namespace rift::builtins {

using namespace rift::runtime;

// ============================================================================
// Method Registration Macros
// ============================================================================
//
// These macros simplify the repetitive pattern of registering builtin methods.
// They must be used within setupStaticMethods() or setupPrototypeMethods()
// where 'factory' is available as a parameter.
//
// Usage:
//   RIFT_METHOD(prototype, "push", Array::push);
//   RIFT_STATIC_METHOD(constructor, "isArray", Array::isArray);
//   RIFT_PROPERTY(constructor, "PI", Value(3.14159));
//

/// Register an instance method on a prototype object (non-enumerable per spec)
/// The `len` parameter is the spec-mandated Function.length value (expected argument count).
#define RIFT_METHOD(obj, name, len, func)                                                        \
    do {                                                                                         \
        auto* _fn = factory->createJSFunction(func);                                             \
        _fn->defineProperty(                                                                     \
            "name", rift::runtime::PropertyDescriptor(rift::runtime::Value(std::string(name)),   \
                                                      false, false, true));                      \
        _fn->defineProperty(                                                                     \
            "length", rift::runtime::PropertyDescriptor(                                         \
                          rift::runtime::Value(static_cast<double>(len)), false, false, true));  \
        (obj)->defineProperty(name, rift::runtime::PropertyDescriptor(rift::runtime::Value(_fn), \
                                                                      true, false, true));       \
    } while(0)

/// Register a static method on a constructor object (non-enumerable per spec)
/// The `len` parameter is the spec-mandated Function.length value (expected argument count).
#define RIFT_STATIC_METHOD(obj, name, len, func)                                                 \
    do {                                                                                         \
        auto* _fn = factory->createJSFunction(func);                                             \
        _fn->defineProperty(                                                                     \
            "name", rift::runtime::PropertyDescriptor(rift::runtime::Value(std::string(name)),   \
                                                      false, false, true));                      \
        _fn->defineProperty(                                                                     \
            "length", rift::runtime::PropertyDescriptor(                                         \
                          rift::runtime::Value(static_cast<double>(len)), false, false, true));  \
        (obj)->defineProperty(name, rift::runtime::PropertyDescriptor(rift::runtime::Value(_fn), \
                                                                      true, false, true));       \
    } while(0)

/// Register a getter property (non-enumerable, configurable per spec)
#define RIFT_GETTER(obj, name, func)                                                       \
    (obj)->defineProperty(name, rift::runtime::PropertyDescriptor::accessor(               \
                                    rift::runtime::Value(factory->createJSFunction(func)), \
                                    rift::runtime::Value::undefined(), false, true))

/// Register a static property (constant, non-enumerable, non-configurable per spec)
#define RIFT_PROPERTY(obj, name, value) \
    (obj)->defineProperty(name, rift::runtime::PropertyDescriptor(value, false, false, false))

/// CRTP base class for Rift builtins. Provides common setup infrastructure
/// for constructor, prototype, and method registration.
/// NON-STANDARD: Internal Rift implementation detail, not part of ECMA-262.
template <typename Derived>
class BuiltinBase {
  public:
    /// NON-STANDARD: Set the object factory for this builtin type.
    /// Called once during engine initialization.
    static void setObjectFactory(rift::memory::ObjectFactory* factory) {
        object_factory_ = factory;
    }

    /// NON-STANDARD: Create the builtin constructor object with all static methods and prototype.
    /// Replaces the duplicated create() method in all builtins.
    static JSObject* create(rift::memory::ObjectFactory* factory) {
        // Store factory for use in other methods
        setObjectFactory(factory);

        // Create constructor function using GC-managed creation
        // If Derived::constructor accepts CallContext, pass it directly.
        // Otherwise, wrap to drop CallContext and pass only args.
        rift::runtime::JSFunction* constructor = nullptr;
        if constexpr(requires {
                         static_cast<rift::runtime::Value (*)(
                             const rift::core::CallContext&,
                             const std::vector<rift::runtime::Value>&)>(&Derived::constructor);
                     }) {
            constructor = factory->createJSFunction(
                static_cast<rift::runtime::Value (*)(const rift::core::CallContext&,
                                                     const std::vector<rift::runtime::Value>&)>(
                    &Derived::constructor));
        } else {
            constructor = factory->createJSFunction(
                [](const rift::core::CallContext& /*ctx*/,
                   const std::vector<rift::runtime::Value>& args) -> rift::runtime::Value {
                    return Derived::constructor(args);
                });
        }

        // Let derived class add static methods (e.g., Array.isArray, Object.keys)
        callSetupStaticMethods(constructor, factory);

        // Create and set prototype
        auto* prototype = createPrototype(factory);
        constructor->setProperty("prototype", Value(prototype));
        // Set constructor property on prototype (non-enumerable per spec)
        prototype->defineProperty("constructor",
                                  PropertyDescriptor(Value(constructor), true, false, true));

        return constructor;
    }

    /// NON-STANDARD: Create the builtin prototype object with all instance methods.
    /// Replaces the duplicated createPrototype() method in all builtins.
    static JSObject* createPrototype(rift::memory::ObjectFactory* factory) {
        // Create prototype object using GC-managed creation
        auto* prototype = factory->createJSObject();

        // Let derived class add prototype methods (e.g., Array.prototype.push)
        callSetupPrototypeMethods(prototype, factory);

        return prototype;
    }

  protected:
    /// NON-STANDARD: Get the stored object factory.
    /// Used by derived classes in their constructor and method implementations.
    static rift::memory::ObjectFactory* getObjectFactory() {
        return object_factory_;
    }

    // ========================================================================
    // Method Registration Helpers
    // ========================================================================
    // Alternative to macros - use these static methods directly if preferred.

    /// Type alias for builtin method signature
    using MethodFunc = Value (*)(const rift::core::CallContext&, const std::vector<Value>&);

    /// NON-STANDARD: Register a method on an object (prototype or constructor).
    static void registerMethod(JSObject* obj, const char* name, MethodFunc func,
                               rift::memory::ObjectFactory* factory) {
        obj->defineProperty(
            name, PropertyDescriptor(Value(factory->createJSFunction(func)), true, false, true));
    }

    /// NON-STANDARD: Register a static property (constant value) on an object.
    static void registerProperty(JSObject* obj, const char* name, const Value& value) {
        obj->defineProperty(name, PropertyDescriptor(value, false, false, false));
    }

  private:
    /// NON-STANDARD: CRTP dispatch to derived class setup methods.
    static void callSetupStaticMethods(JSObject* constructor,
                                       rift::memory::ObjectFactory* factory) {
        Derived::setupStaticMethods(constructor, factory);
    }

    static void callSetupPrototypeMethods(JSObject* prototype,
                                          rift::memory::ObjectFactory* factory) {
        // Static assert to ensure derived class implements this method
        static_assert(std::is_same_v<decltype(&Derived::setupPrototypeMethods),
                                     void (*)(JSObject*, rift::memory::ObjectFactory*)>,
                      "Derived class must implement setupPrototypeMethods(JSObject*, "
                      "rift::memory::ObjectFactory*)");
        Derived::setupPrototypeMethods(prototype, factory);
    }

    /// Static factory storage (one per builtin type due to template instantiation)
    static rift::memory::ObjectFactory* object_factory_;
};

// Template static member definition
template <typename Derived>
rift::memory::ObjectFactory* BuiltinBase<Derived>::object_factory_ = nullptr;

}  // namespace rift::builtins