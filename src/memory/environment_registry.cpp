#include "rift/memory/environment_registry.h"

#include <unordered_set>

#include "rift/execution/environment.h"
#include "rift/types/object.h"

namespace rift::memory {

// Heap-allocated and intentionally never freed so the set keeps true static
// lifetime. Environments can be destroyed during static teardown (e.g. suspended
// generator frames), and their destructors call unregisterEnvironment(); a
// function-local static would already be destroyed by then, leaving erase() to
// touch a freed container. The leak is reclaimed by the OS at exit, consistent
// with the GC's own shutdown strategy. The interpreter is single-threaded, so no
// synchronization is needed.
static std::unordered_set<rift::runtime::Environment*>& liveEnvironments() {
    static auto* environments = new std::unordered_set<rift::runtime::Environment*>();
    return *environments;
}

void registerEnvironment(rift::runtime::Environment* env) {
    if(env) {
        liveEnvironments().insert(env);
    }
}

void unregisterEnvironment(rift::runtime::Environment* env) {
    if(env) {
        liveEnvironments().erase(env);
    }
}

void markLiveEnvironmentRoots(const std::function<void(GCObject*)>& mark) {
    for(auto* env : liveEnvironments()) {
        for(rift::runtime::JSObject* obj : env->getReferencedObjects()) {
            mark(obj);  // JSObject derives from GCObject
        }
    }
}

}  // namespace rift::memory
