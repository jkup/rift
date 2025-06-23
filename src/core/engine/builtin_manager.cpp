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

// Initialize static prototype storage
std::shared_ptr<JSObject> BuiltinManager::objectPrototype_;
std::shared_ptr<JSObject> BuiltinManager::arrayPrototype_;
std::shared_ptr<JSObject> BuiltinManager::stringPrototype_;
std::shared_ptr<JSObject> BuiltinManager::booleanPrototype_;
std::shared_ptr<JSObject> BuiltinManager::errorPrototype_;

void BuiltinManager::setupBuiltins(std::shared_ptr<Environment> globalEnv, Rift* engine) {
    // Get the object factory from the engine
    rift::memory::ObjectFactory* factory = engine ? engine->getObjectFactory() : nullptr;
    
    // Setup prototypes first (Object.prototype is the root) - need factory for these too
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

    // Set up the Array static factory for use in static methods
    if (factory) {
        builtins::Array::setObjectFactory(factory);
        builtins::Object::setObjectFactory(factory);
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

// Global prototype accessors
std::shared_ptr<JSObject> BuiltinManager::getObjectPrototype() {
    return objectPrototype_;
}

std::shared_ptr<JSObject> BuiltinManager::getArrayPrototype() {
    return arrayPrototype_;
}

std::shared_ptr<JSObject> BuiltinManager::getStringPrototype() {
    return stringPrototype_;
}

std::shared_ptr<JSObject> BuiltinManager::getBooleanPrototype() {
    return booleanPrototype_;
}

std::shared_ptr<JSObject> BuiltinManager::getErrorPrototype() {
    return errorPrototype_;
}

void BuiltinManager::setupGlobalFunctions(std::shared_ptr<Environment> globalEnv, rift::memory::ObjectFactory* factory) {
    // Setup global functions (parseInt, parseFloat, isNaN, isFinite, etc.)
    builtins::Global::setupGlobalFunctions(globalEnv);
}

void BuiltinManager::setupConsole(std::shared_ptr<Environment> globalEnv, rift::memory::ObjectFactory* factory) {
    // Setup console object using GC-managed creation
    auto console = builtins::Console::create(factory);
    globalEnv->define("console", Value(console));
}

void BuiltinManager::setupMath(std::shared_ptr<Environment> globalEnv, rift::memory::ObjectFactory* factory) {
    // Setup Math object using GC-managed creation
    auto math = builtins::Math::create(factory);
    globalEnv->define("Math", Value(math));
}

void BuiltinManager::setupString(std::shared_ptr<Environment> globalEnv, rift::memory::ObjectFactory* factory) {
    // Setup String object using GC-managed creation
    auto string = builtins::String::create(factory);
    globalEnv->define("String", Value(string));
}

void BuiltinManager::setupArray(std::shared_ptr<Environment> globalEnv, rift::memory::ObjectFactory* factory) {
    // Setup Array object using GC-managed creation
    auto array = builtins::Array::create(factory);
    globalEnv->define("Array", Value(array));
}

void BuiltinManager::setupObject(std::shared_ptr<Environment> globalEnv, rift::memory::ObjectFactory* factory) {
    // Setup Object object using GC-managed creation
    auto object = builtins::Object::create(factory);
    globalEnv->define("Object", Value(object));
}

void BuiltinManager::setupBoolean(std::shared_ptr<Environment> globalEnv, rift::memory::ObjectFactory* factory) {
    // Setup Boolean object using GC-managed creation
    auto boolean = builtins::Boolean::create(factory);
    globalEnv->define("Boolean", Value(boolean));
}

void BuiltinManager::setupError(std::shared_ptr<Environment> globalEnv, rift::memory::ObjectFactory* factory) {
    // Setup Error object using GC-managed creation
    auto error = builtins::Error::create(factory);
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
    
    globalEnv->define("gc", Value(gcFunction));
    globalEnv->define("gcStats", Value(gcStatsFunction));
}

}  // namespace rift::core 