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
    static JSObject* getSymbolPrototype();
    static JSObject* getErrorPrototype();
    static JSObject* getTypeErrorPrototype();
    static JSObject* getReferenceErrorPrototype();
    static JSObject* getSyntaxErrorPrototype();
    static JSObject* getRangeErrorPrototype();
    static JSObject* getRegExpPrototype();
    static JSObject* getIteratorPrototype();
    static JSObject* getSetPrototype();
    static JSObject* getMapPrototype();
    static JSObject* getWeakMapPrototype();
    static JSObject* getWeakSetPrototype();
    static JSObject* getPromisePrototype();
    static JSObject* getFunctionPrototype();
    static JSObject* getInstantPrototype();
    static JSObject* getDurationPrototype();
    static JSObject* getPlainDatePrototype();
    static JSObject* getPlainTimePrototype();
    static JSObject* getPlainDateTimePrototype();

    // Get the built-in eval function (for direct eval detection)
    static JSFunction* getEvalFunction();

    // Cleanup method for shutdown
    static void clearStaticPrototypes();

  private:
    // Store global prototypes - now raw pointers
    static JSObject* objectPrototype_;
    static JSObject* arrayPrototype_;
    static JSObject* stringPrototype_;
    static JSObject* booleanPrototype_;
    static JSObject* numberPrototype_;
    static JSObject* symbolPrototype_;
    static JSObject* errorPrototype_;
    static JSObject* typeErrorPrototype_;
    static JSObject* referenceErrorPrototype_;
    static JSObject* syntaxErrorPrototype_;
    static JSObject* rangeErrorPrototype_;
    static JSObject* regexpPrototype_;
    static JSObject* iteratorPrototype_;
    static JSObject* setPrototype_;
    static JSObject* mapPrototype_;
    static JSObject* weakMapPrototype_;
    static JSObject* weakSetPrototype_;
    static JSObject* promisePrototype_;
    static JSObject* functionPrototype_;
    static JSObject* instantPrototype_;
    static JSObject* durationPrototype_;
    static JSObject* plainDatePrototype_;
    static JSObject* plainTimePrototype_;
    static JSObject* plainDateTimePrototype_;
    static JSFunction* evalFunction_;

    // Individual builtin setup methods - now accept ObjectFactory
    static void setupGlobalFunctions(std::shared_ptr<Environment> globalEnv,
                                     rift::memory::ObjectFactory* factory, Rift* engine);
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
    static void setupTypeError(std::shared_ptr<Environment> globalEnv,
                               rift::memory::ObjectFactory* factory);
    static void setupReferenceError(std::shared_ptr<Environment> globalEnv,
                                    rift::memory::ObjectFactory* factory);
    static void setupSyntaxError(std::shared_ptr<Environment> globalEnv,
                                 rift::memory::ObjectFactory* factory);
    static void setupRangeError(std::shared_ptr<Environment> globalEnv,
                                rift::memory::ObjectFactory* factory);
    static void setupRegExp(std::shared_ptr<Environment> globalEnv,
                            rift::memory::ObjectFactory* factory);
    static void setupSymbol(std::shared_ptr<Environment> globalEnv,
                            rift::memory::ObjectFactory* factory);
    static void setupSet(std::shared_ptr<Environment> globalEnv,
                         rift::memory::ObjectFactory* factory);
    static void setupMap(std::shared_ptr<Environment> globalEnv,
                         rift::memory::ObjectFactory* factory);
    static void setupWeakMap(std::shared_ptr<Environment> globalEnv,
                             rift::memory::ObjectFactory* factory);
    static void setupWeakSet(std::shared_ptr<Environment> globalEnv,
                             rift::memory::ObjectFactory* factory);
    static void setupPromise(std::shared_ptr<Environment> globalEnv,
                             rift::memory::ObjectFactory* factory, Rift* engine);
    static void setupGCFunctions(std::shared_ptr<Environment> globalEnv, Rift* engine);
    static void setupIteratorPrototype(rift::memory::ObjectFactory* factory);
    static void setupFunction(std::shared_ptr<Environment> globalEnv,
                              rift::memory::ObjectFactory* factory);
    static void setupTemporal(std::shared_ptr<Environment> globalEnv,
                              rift::memory::ObjectFactory* factory);
};

}  // namespace rift::core