#pragma once

#include <memory>
#include "../../runtime/environment/environment.h"

namespace rift::core {

using namespace rift::runtime;

class BuiltinManager {
public:
    // Setup all built-in objects and functions
    static void setupBuiltins(std::shared_ptr<Environment> globalEnv);

private:
    // Individual builtin setup methods
    static void setupGlobalFunctions(std::shared_ptr<Environment> globalEnv);
    static void setupConsole(std::shared_ptr<Environment> globalEnv);
    static void setupMath(std::shared_ptr<Environment> globalEnv); 
    static void setupString(std::shared_ptr<Environment> globalEnv);
    static void setupArray(std::shared_ptr<Environment> globalEnv);
};

}  // namespace rift::core 