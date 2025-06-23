#pragma once

#include <memory>
#include "../../runtime/environment/environment.h"
#include "../../runtime/values/object.h"
#include "../../memory/object_factory.h"

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

    // Individual builtin setup methods - now accept ObjectFactory
    static void setupGlobalFunctions(std::shared_ptr<Environment> globalEnv, rift::memory::ObjectFactory* factory);
    static void setupConsole(std::shared_ptr<Environment> globalEnv, rift::memory::ObjectFactory* factory);
    static void setupMath(std::shared_ptr<Environment> globalEnv, rift::memory::ObjectFactory* factory); 
    static void setupString(std::shared_ptr<Environment> globalEnv, rift::memory::ObjectFactory* factory);
    static void setupArray(std::shared_ptr<Environment> globalEnv, rift::memory::ObjectFactory* factory);
    static void setupObject(std::shared_ptr<Environment> globalEnv, rift::memory::ObjectFactory* factory);
    static void setupBoolean(std::shared_ptr<Environment> globalEnv, rift::memory::ObjectFactory* factory);
    static void setupError(std::shared_ptr<Environment> globalEnv, rift::memory::ObjectFactory* factory);
    static void setupGCFunctions(std::shared_ptr<Environment> globalEnv, Rift* engine);
};

}  // namespace rift::core 