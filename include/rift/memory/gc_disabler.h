#pragma once

namespace rift::memory {

// Forward declaration
class GarbageCollector;

/**
 * RAII class to temporarily disable garbage collection.
 * 
 * Ensures GC is always re-enabled when the GCDisabler goes out of scope,
 * even if an exception occurs during the protected operations.
 * 
 * Usage:
 *   {
 *       GCDisabler disabler(gc_);  // GC disabled
 *       // ... operations that need GC disabled ...
 *   }  // GC automatically re-enabled here
 */
class GCDisabler {
  private:
    GarbageCollector* gc_;
    bool was_enabled_;

  public:
    /**
     * Disable GC and remember its previous state.
     * @param gc The garbage collector to temporarily disable
     */
    explicit GCDisabler(GarbageCollector* gc);

    /**
     * Restore GC to its previous enabled/disabled state.
     */
    ~GCDisabler();

    // Prevent copying (RAII should have unique ownership)
    GCDisabler(const GCDisabler&) = delete;
    GCDisabler& operator=(const GCDisabler&) = delete;

    // Allow moving
    GCDisabler(GCDisabler&& other) noexcept;
    GCDisabler& operator=(GCDisabler&& other) noexcept;
};

}  // namespace rift::memory
