#include "rift/memory/gc_disabler.h"

#include "rift/memory/gc.h"

namespace rift::memory {

GCDisabler::GCDisabler(GarbageCollector* gc) : gc_(gc), was_enabled_(false) {
    if(gc_) {
        was_enabled_ = gc_->isGCEnabled();
        gc_->setGCEnabled(false);
    }
}

GCDisabler::~GCDisabler() {
    // Restore GC to its previous state
    if(gc_) {
        gc_->setGCEnabled(was_enabled_);
    }
}

GCDisabler::GCDisabler(GCDisabler&& other) noexcept
    : gc_(other.gc_), was_enabled_(other.was_enabled_) {
    // Transfer ownership - other should not restore GC
    other.gc_ = nullptr;
}

GCDisabler& GCDisabler::operator=(GCDisabler&& other) noexcept {
    if(this != &other) {
        // Restore current GC state before transferring
        if(gc_) {
            gc_->setGCEnabled(was_enabled_);
        }

        // Transfer ownership
        gc_ = other.gc_;
        was_enabled_ = other.was_enabled_;

        other.gc_ = nullptr;
    }
    return *this;
}

}  // namespace rift::memory
