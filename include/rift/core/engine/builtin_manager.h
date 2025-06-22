#pragma once

#include <memory>
#include "../../runtime/environment/environment.h"
#include "../../runtime/values/object.h"

namespace rift::core {

using namespace rift::runtime;

// Forward declaration
class Rift;

class BuiltinManager {
public:
    // Setup all built-in objects and functions
    static void setupBuiltins(std::shared_ptr<Environment> globalEnv, Rift* engine = nullptr);

    // Global prototype access
    static std::shared_ptr<JSObject> getObjectPrototype();
    static std::shared_ptr<JSObject> getArrayPrototype();
    static std::shared_ptr<JSObject> getStringPrototype();
    static std::shared_ptr<JSObject> getBooleanPrototype();
    static std::shared_ptr<JSObject> getErrorPrototype();

private:
    // Store global prototypes
    static std::shared_ptr<JSObject> objectPrototype_;
    static std::shared_ptr<JSObject> arrayPrototype_;
    static std::shared_ptr<JSObject> stringPrototype_;
    static std::shared_ptr<JSObject> booleanPrototype_;
    static std::shared_ptr<JSObject> errorPrototype_;

    // Individual builtin setup methods
    static void setupGlobalFunctions(std::shared_ptr<Environment> globalEnv);
    static void setupConsole(std::shared_ptr<Environment> globalEnv);
    static void setupMath(std::shared_ptr<Environment> globalEnv); 
    static void setupString(std::shared_ptr<Environment> globalEnv);
    static void setupArray(std::shared_ptr<Environment> globalEnv);
    static void setupObject(std::shared_ptr<Environment> globalEnv);
    static void setupBoolean(std::shared_ptr<Environment> globalEnv);
    static void setupError(std::shared_ptr<Environment> globalEnv);
    static void setupGCFunctions(std::shared_ptr<Environment> globalEnv, Rift* engine);
};

}  // namespace rift::core 