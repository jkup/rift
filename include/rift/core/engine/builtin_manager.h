#pragma once

#include <memory>
#include "../../runtime/environment/environment.h"
#include "../../runtime/values/object.h"

namespace rift::core {

using namespace rift::runtime;

class BuiltinManager {
public:
    // Setup all built-in objects and functions
    static void setupBuiltins(std::shared_ptr<Environment> globalEnv);

    // Global prototype access
    static std::shared_ptr<JSObject> getObjectPrototype();
    static std::shared_ptr<JSObject> getArrayPrototype();
    static std::shared_ptr<JSObject> getStringPrototype();
    static std::shared_ptr<JSObject> getBooleanPrototype();

private:
    // Store global prototypes
    static std::shared_ptr<JSObject> objectPrototype_;
    static std::shared_ptr<JSObject> arrayPrototype_;
    static std::shared_ptr<JSObject> stringPrototype_;
    static std::shared_ptr<JSObject> booleanPrototype_;

    // Individual builtin setup methods
    static void setupGlobalFunctions(std::shared_ptr<Environment> globalEnv);
    static void setupConsole(std::shared_ptr<Environment> globalEnv);
    static void setupMath(std::shared_ptr<Environment> globalEnv); 
    static void setupString(std::shared_ptr<Environment> globalEnv);
    static void setupArray(std::shared_ptr<Environment> globalEnv);
    static void setupObject(std::shared_ptr<Environment> globalEnv);
    static void setupBoolean(std::shared_ptr<Environment> globalEnv);
};

}  // namespace rift::core 