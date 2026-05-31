#pragma once

#include <functional>

namespace rift::runtime {
class Environment;
}

namespace rift::memory {

class GCObject;

// Live-environment registry.
//
// Environments are shared_ptr-managed (not GC objects), so they never dangle,
// but the objects they reference must stay alive as long as the environment is
// reachable from an active call frame or a closure. The GC cannot see into the
// std::function closures that capture environments, so instead every live
// Environment registers itself here and the mark phase treats each one as a
// root source. An environment is "live" exactly while a shared_ptr to it
// exists (active stack frame, block scope, or closure capture).
void registerEnvironment(rift::runtime::Environment* env);
void unregisterEnvironment(rift::runtime::Environment* env);

// Invoke `mark` on every GCObject directly referenced by any live environment.
// Called by the GC during the mark phase, in addition to the explicit roots.
void markLiveEnvironmentRoots(const std::function<void(GCObject*)>& mark);

}  // namespace rift::memory
