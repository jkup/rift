#include "rift/memory/gc_protector.h"
#include "rift/memory/object_manager.h"

namespace rift::memory {

GCProtector::GCProtector(GCObject* obj, ObjectManager* manager)
    : protected_object_(obj), object_manager_(manager) {
    // Add object as GC root to protect during initialization
    if(protected_object_ && object_manager_) {
        object_manager_->addRoot(protected_object_);
    }
}

GCProtector::~GCProtector() {
    // Remove from roots when going out of scope.
    // By now, the object should be reachable through normal means (stored in
    // a variable, property, return value, etc.) and will be kept alive by GC traversal.
    if(protected_object_ && object_manager_) {
        object_manager_->removeRoot(protected_object_);
    }
}

GCProtector::GCProtector(GCProtector&& other) noexcept
    : protected_object_(other.protected_object_), object_manager_(other.object_manager_) {
    // Transfer ownership - other should not remove root
    other.protected_object_ = nullptr;
    other.object_manager_ = nullptr;
}

GCProtector& GCProtector::operator=(GCProtector&& other) noexcept {
    if(this != &other) {
        // Clean up current protection
        if(protected_object_ && object_manager_) {
            object_manager_->removeRoot(protected_object_);
        }

        // Transfer ownership
        protected_object_ = other.protected_object_;
        object_manager_ = other.object_manager_;

        other.protected_object_ = nullptr;
        other.object_manager_ = nullptr;
    }
    return *this;
}

}  // namespace rift::memory
