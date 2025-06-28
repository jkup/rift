#include "rift/core/engine/builtin_manager.h"
#include "rift/core/engine/engine.h"
#include "rift/builtins/global/global.h"
#include "rift/builtins/console/console.h"
#include "rift/builtins/math/math.h"
#include "rift/builtins/string/string.h"
#include "rift/builtins/array/array.h"
#include "rift/builtins/object/object.h"
#include "rift/builtins/boolean/boolean.h"
#include "rift/builtins/error/error.h"
#include "rift/runtime/values/value.h"

namespace rift::core {

// Initialize static prototype storage - now raw pointers
JSObject* BuiltinManager::objectPrototype_ = nullptr;
JSObject* BuiltinManager::arrayPrototype_ = nullptr;
JSObject* BuiltinManager::stringPrototype_ = nullptr;
JSObject* BuiltinManager::booleanPrototype_ = nullptr;
JSObject* BuiltinManager::errorPrototype_ = nullptr;

void BuiltinManager::setupBuiltins(std::shared_ptr<Environment> globalEnv, Rift* engine) {
    // Get the object factory from the engine
    rift::memory::ObjectFactory* factory = engine ? engine->getObjectFactory() : nullptr;
    
    // Setup prototypes first (Object.prototype is the root) - now raw pointers
    objectPrototype_ = builtins::Object::createPrototype(factory);
    arrayPrototype_ = builtins::Array::createPrototype(factory);
    stringPrototype_ = builtins::String::createPrototype(factory);
    booleanPrototype_ = builtins::Boolean::createPrototype(factory);
    errorPrototype_ = builtins::Error::createPrototype(factory);

    // Set up prototype chain: All prototypes -> Object.prototype
    arrayPrototype_->setPrototype(objectPrototype_);
    stringPrototype_->setPrototype(objectPrototype_);
    booleanPrototype_->setPrototype(objectPrototype_);
    errorPrototype_->setPrototype(objectPrototype_);

    // Set up the static factories for use in static methods
    if (factory) {
        builtins::Array::setObjectFactory(factory);
        builtins::Object::setObjectFactory(factory);
        builtins::String::setObjectFactory(factory);
        builtins::Boolean::setObjectFactory(factory);
        builtins::Error::setObjectFactory(factory);
    }

    // Now setup builtins with factory
    setupGlobalFunctions(globalEnv, factory);
    setupConsole(globalEnv, factory);
    setupMath(globalEnv, factory);
    setupString(globalEnv, factory);
    setupArray(globalEnv, factory);
    setupObject(globalEnv, factory);
    setupBoolean(globalEnv, factory);
    setupError(globalEnv, factory);
    
    // Setup GC functions if engine is provided
    if (engine) {
        setupGCFunctions(globalEnv, engine);
    }
}

// Global prototype accessors - now return raw pointers
JSObject* BuiltinManager::getObjectPrototype() {
    return objectPrototype_;
}

JSObject* BuiltinManager::getArrayPrototype() {
    return arrayPrototype_;
}

JSObject* BuiltinManager::getStringPrototype() {
    return stringPrototype_;
}

JSObject* BuiltinManager::getBooleanPrototype() {
    return booleanPrototype_;
}

JSObject* BuiltinManager::getErrorPrototype() {
    return errorPrototype_;
}

void BuiltinManager::setupGlobalFunctions(std::shared_ptr<Environment> globalEnv, rift::memory::ObjectFactory* factory) {
    // Setup global functions (parseInt, parseFloat, isNaN, isFinite, etc.)
    builtins::Global::setupGlobalFunctions(globalEnv, factory);  // Pass factory parameter
}

void BuiltinManager::setupConsole(std::shared_ptr<Environment> globalEnv, rift::memory::ObjectFactory* factory) {
    // Setup console object using GC-managed creation
    auto console = builtins::Console::create(factory);  // console is now raw pointer
    globalEnv->define("console", Value(console));
}

void BuiltinManager::setupMath(std::shared_ptr<Environment> globalEnv, rift::memory::ObjectFactory* factory) {
    // Setup Math object using GC-managed creation
    auto math = builtins::Math::create(factory);  // math is now raw pointer
    globalEnv->define("Math", Value(math));
}

void BuiltinManager::setupString(std::shared_ptr<Environment> globalEnv, rift::memory::ObjectFactory* factory) {
    // Setup String object using GC-managed creation
    auto string = builtins::String::create(factory);  // string is now raw pointer
    globalEnv->define("String", Value(string));
}

void BuiltinManager::setupArray(std::shared_ptr<Environment> globalEnv, rift::memory::ObjectFactory* factory) {
    // Setup Array object using GC-managed creation
    auto array = builtins::Array::create(factory);  // array is now raw pointer
    globalEnv->define("Array", Value(array));
}

void BuiltinManager::setupObject(std::shared_ptr<Environment> globalEnv, rift::memory::ObjectFactory* factory) {
    // Setup Object object using GC-managed creation
    auto object = builtins::Object::create(factory);  // object is now raw pointer
    globalEnv->define("Object", Value(object));
}

void BuiltinManager::setupBoolean(std::shared_ptr<Environment> globalEnv, rift::memory::ObjectFactory* factory) {
    // Setup Boolean object using GC-managed creation
    auto boolean = builtins::Boolean::create(factory);  // boolean is now raw pointer
    globalEnv->define("Boolean", Value(boolean));
}

void BuiltinManager::setupError(std::shared_ptr<Environment> globalEnv, rift::memory::ObjectFactory* factory) {
    // Setup Error object using GC-managed creation
    auto error = builtins::Error::create(factory);  // error is now raw pointer
    globalEnv->define("Error", Value(error));
}

void BuiltinManager::setupGCFunctions(std::shared_ptr<Environment> globalEnv, Rift* engine) {
    // Create GC functions that have access to the engine using GC-managed creation
    auto gcFunction = engine->getObjectFactory()->createJSFunction([engine](const std::vector<Value>& args) -> Value {
        if (engine) {
            engine->collectGarbage();
        }
        return Value::undefined();
    });
    
    auto gcStatsFunction = engine->getObjectFactory()->createJSFunction([engine](const std::vector<Value>& args) -> Value {
        if (engine) {
            engine->printGCStats();
        }
        return Value::undefined();
    });
    
    globalEnv->define("gc", Value(gcFunction));  // Functions are now raw pointers
    globalEnv->define("gcStats", Value(gcStatsFunction));
}

}  // namespace rift::core 