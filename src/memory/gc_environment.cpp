#include "rift/memory/gc_environment.h"

#include "rift/types/object.h"
#include "rift/types/value.h"

namespace rift::memory {

std::vector<GCObject*> GCEnvironment::getReferences() const {
    std::vector<GCObject*> refs;

    if(!env_) {
        return refs;
    }

    // Collect the objects this environment's bindings reference. The parent
    // chain is not traversed here: every live environment registers itself in
    // the live-environment registry (see environment_registry.h) and is marked
    // independently by the GC, so parents are covered without traversal.
    for(rift::runtime::JSObject* obj : env_->getReferencedObjects()) {
        refs.push_back(obj);
    }

    return refs;
}

}  // namespace rift::memory