#pragma once

#include "gc.h"

namespace rift::memory {

// Forward declarations
class ObjectManager;

/**
 * RAII-based GC protection manager for objects under construction.
 *
 * Problem: When objects are created via createJSObject() or createJSFunction(),
 * they are immediately added to GC tracking. If GC collection is triggered during
 * initialization (via setProperty or other operations), objects that aren't yet
 * reachable from any GC root will be collected, leading to heap-use-after-free.
 *
 * Solution: GCProtector temporarily adds objects as GC roots during initialization
 * and removes them when initialization is complete. By then, the object should be
 * reachable through normal means (stored in a variable, property, or return value)
 * and will be kept alive by mark-sweep traversal.
 *
 * Usage:
 *   auto* obj = factory->createJSObject(prototype);
 *   GCProtector protect(obj, objectManager);  // Add as temporary root
 *
 *   obj->setProperty("length", Value(100));  // Safe - obj is a root
 *   obj->setProperty("data", someValue);      // Safe - obj is a root
 *
 *   return Value(obj);  // GCProtector destructor removes from roots
 *                       // obj is now reachable via return value
 */
class GCProtector {
  private:
    GCObject* protected_object_;
    ObjectManager* object_manager_;

  public:
    /**
     * Add an object as a temporary GC root for safe initialization.
     * @param obj The object to protect (must be GC-tracked via createJSObject/createJSFunction)
     * @param manager The ObjectManager to use for root management
     *
     * Objects created via ObjectFactory are GC-tracked but not automatically roots.
     * This constructor adds them as temporary roots to prevent premature collection
     * during complex initialization.
     */
    GCProtector(GCObject* obj, ObjectManager* manager);

    /**
     * Remove object from roots when going out of scope.
     * Object remains GC-tracked but is no longer a root - it must be
     * reachable through normal GC traversal to stay alive.
     */
    ~GCProtector();

    // Prevent copying (RAII should have unique ownership)
    GCProtector(const GCProtector&) = delete;
    GCProtector& operator=(const GCProtector&) = delete;

    // Allow moving
    GCProtector(GCProtector&& other) noexcept;
    GCProtector& operator=(GCProtector&& other) noexcept;
};

}  // namespace rift::memory
