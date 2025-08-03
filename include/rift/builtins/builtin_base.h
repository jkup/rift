#pragma once

#include <functional>
#include <type_traits>
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
        callSetupStaticMethods(constructor, factory);

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
        callSetupPrototypeMethods(prototype, factory);

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

  private:
    /**
     * CRTP method implementations - these call the derived class methods.
     * This ensures derived classes MUST implement these methods.
     */
    static void callSetupStaticMethods(JSObject* constructor, rift::memory::ObjectFactory* factory) {
        Derived::setupStaticMethods(constructor, factory);
    }
    
    static void callSetupPrototypeMethods(JSObject* prototype, rift::memory::ObjectFactory* factory) {
        // Static assert to ensure derived class implements this method
        static_assert(std::is_same_v<decltype(&Derived::setupPrototypeMethods), 
                                   void(*)(JSObject*, rift::memory::ObjectFactory*)>,
                     "Derived class must implement setupPrototypeMethods(JSObject*, rift::memory::ObjectFactory*)");
        Derived::setupPrototypeMethods(prototype, factory);
    }

    /// Static factory storage (one per builtin type due to template instantiation)
    static rift::memory::ObjectFactory* object_factory_;
};

// Template static member definition
template<typename Derived>
rift::memory::ObjectFactory* BuiltinBase<Derived>::object_factory_ = nullptr;

}  // namespace rift::builtins