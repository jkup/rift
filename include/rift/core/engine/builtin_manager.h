#pragma once

#include <memory>

#include "../../memory/object_factory.h"
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

    // Global prototype access - now return raw pointers
    static JSObject* getObjectPrototype();
    static JSObject* getArrayPrototype();
    static JSObject* getStringPrototype();
    static JSObject* getBooleanPrototype();
    static JSObject* getNumberPrototype();
    static JSObject* getErrorPrototype();
    static JSObject* getRegExpPrototype();

    // Cleanup method for shutdown
    static void clearStaticPrototypes();

  private:
    // Store global prototypes - now raw pointers
    static JSObject* objectPrototype_;
    static JSObject* arrayPrototype_;
    static JSObject* stringPrototype_;
    static JSObject* booleanPrototype_;
    static JSObject* numberPrototype_;
    static JSObject* errorPrototype_;
    static JSObject* regexpPrototype_;

    // Individual builtin setup methods - now accept ObjectFactory
    static void setupGlobalFunctions(std::shared_ptr<Environment> globalEnv,
                                     rift::memory::ObjectFactory* factory);
    static void setupConsole(std::shared_ptr<Environment> globalEnv,
                             rift::memory::ObjectFactory* factory);
    static void setupMath(std::shared_ptr<Environment> globalEnv,
                          rift::memory::ObjectFactory* factory);
    static void setupString(std::shared_ptr<Environment> globalEnv,
                            rift::memory::ObjectFactory* factory);
    static void setupArray(std::shared_ptr<Environment> globalEnv,
                           rift::memory::ObjectFactory* factory);
    static void setupJSON(std::shared_ptr<Environment> globalEnv, rift::core::Rift* engine);
    static void setupObject(std::shared_ptr<Environment> globalEnv,
                            rift::memory::ObjectFactory* factory);
    static void setupBoolean(std::shared_ptr<Environment> globalEnv,
                             rift::memory::ObjectFactory* factory);
    static void setupNumber(std::shared_ptr<Environment> globalEnv,
                            rift::memory::ObjectFactory* factory);
    static void setupError(std::shared_ptr<Environment> globalEnv,
                           rift::memory::ObjectFactory* factory);
    static void setupRegExp(std::shared_ptr<Environment> globalEnv,
                            rift::memory::ObjectFactory* factory);
    static void setupGCFunctions(std::shared_ptr<Environment> globalEnv, Rift* engine);
};

}  // namespace rift::core