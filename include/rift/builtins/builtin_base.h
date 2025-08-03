#pragma once

#include <functional>
#include <vector>

#include "../memory/object_factory.h"
#include "../runtime/values/object.h"
#include "../runtime/values/value.h"

namespace rift::builtins {

using namespace rift::runtime;

/**
 * Base class template for all JavaScript builtin objects.
 * 
 * This class uses the Curiously Recurring Template Pattern (CRTP) to eliminate
 * the massive code duplication that existed across all builtin implementations.
 * 
 * Each builtin class should inherit from this template and provide:
 * - constructor: static Value function for the builtin constructor
 * - setupStaticMethods: method to add static methods to constructor
 * - setupPrototypeMethods: method to add methods to prototype
 * 
 * @tparam Derived The derived builtin class (CRTP pattern)
 */
template<typename Derived>
class BuiltinBase {
  public:
    /**
     * Set the object factory for this builtin type.
     * This is called once during engine initialization.
     */
    static void setObjectFactory(rift::memory::ObjectFactory* factory) {
        object_factory_ = factory;
    }

    /**
     * Create the builtin constructor object with all static methods and prototype.
     * This replaces the duplicated create() method in all builtins.
     */
    static JSObject* create(rift::memory::ObjectFactory* factory) {
        // Store factory for use in other methods
        setObjectFactory(factory);

        // Create constructor function using GC-managed creation
        auto* constructor = factory->createJSFunction(Derived::constructor);

        // Let derived class add static methods (e.g., Array.isArray, Object.keys)
        Derived::setupStaticMethods(constructor, factory);

        // Create and set prototype
        auto* prototype = createPrototype(factory);
        constructor->setProperty("prototype", Value(prototype));

        return constructor;
    }

    /**
     * Create the builtin prototype object with all instance methods.
     * This replaces the duplicated createPrototype() method in all builtins.
     */
    static JSObject* createPrototype(rift::memory::ObjectFactory* factory) {
        // Create prototype object using GC-managed creation
        auto* prototype = factory->createJSObject();

        // Let derived class add prototype methods (e.g., Array.prototype.push)
        Derived::setupPrototypeMethods(prototype, factory);

        return prototype;
    }

  protected:
    /**
     * Get the stored object factory.
     * Used by derived classes in their constructor and method implementations.
     */
    static rift::memory::ObjectFactory* getObjectFactory() {
        return object_factory_;
    }

    /**
     * Default implementation for static methods setup.
     * Derived classes can override this if they have static methods.
     */
    static void setupStaticMethods(JSObject* constructor, rift::memory::ObjectFactory* factory) {
        // Default: no static methods
        // Derived classes can override this
    }

    /**
     * Pure virtual function that derived classes must implement.
     * This is where each builtin adds its prototype methods.
     */
    static void setupPrototypeMethods(JSObject* prototype, rift::memory::ObjectFactory* factory) {
        // This should be implemented by derived classes
        // We can't make it pure virtual in a template, but derived classes must provide it
    }

  private:
    /// Static factory storage (one per builtin type due to template instantiation)
    static rift::memory::ObjectFactory* object_factory_;
};

// Template static member definition
template<typename Derived>
rift::memory::ObjectFactory* BuiltinBase<Derived>::object_factory_ = nullptr;

}  // namespace rift::builtins