#include "rift/core/engine/builtin_manager.h"
#include "rift/builtins/global/global.h"
#include "rift/builtins/console/console.h"
#include "rift/builtins/math/math.h"
#include "rift/builtins/string/string.h"
#include "rift/builtins/array/array.h"
#include "rift/builtins/object/object.h"
#include "rift/builtins/boolean/boolean.h"
#include "rift/runtime/values/value.h"

namespace rift::core {

// Initialize static prototype storage
std::shared_ptr<JSObject> BuiltinManager::objectPrototype_;
std::shared_ptr<JSObject> BuiltinManager::arrayPrototype_;
std::shared_ptr<JSObject> BuiltinManager::stringPrototype_;
std::shared_ptr<JSObject> BuiltinManager::booleanPrototype_;

void BuiltinManager::setupBuiltins(std::shared_ptr<Environment> globalEnv) {
    // Setup prototypes first (Object.prototype is the root)
    objectPrototype_ = builtins::Object::createPrototype();
    arrayPrototype_ = builtins::Array::createPrototype();
    stringPrototype_ = builtins::String::createPrototype();
    booleanPrototype_ = builtins::Boolean::createPrototype();

    // Set up prototype chain: Array.prototype -> Object.prototype
    arrayPrototype_->setPrototype(objectPrototype_);
    stringPrototype_->setPrototype(objectPrototype_);
    booleanPrototype_->setPrototype(objectPrototype_);

    // Now setup builtins
    setupGlobalFunctions(globalEnv);
    setupConsole(globalEnv);
    setupMath(globalEnv);
    setupString(globalEnv);
    setupArray(globalEnv);
    setupObject(globalEnv);
    setupBoolean(globalEnv);
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

void BuiltinManager::setupGlobalFunctions(std::shared_ptr<Environment> globalEnv) {
    // Setup global functions (parseInt, parseFloat, isNaN, isFinite, etc.)
    builtins::Global::setupGlobalFunctions(globalEnv);
}

void BuiltinManager::setupConsole(std::shared_ptr<Environment> globalEnv) {
    // Setup console object
    auto console = builtins::Console::create();
    globalEnv->define("console", Value(console));
}

void BuiltinManager::setupMath(std::shared_ptr<Environment> globalEnv) {
    // Setup Math object
    auto math = builtins::Math::create();
    globalEnv->define("Math", Value(math));
}

void BuiltinManager::setupString(std::shared_ptr<Environment> globalEnv) {
    // Setup String object
    auto string = builtins::String::create();
    globalEnv->define("String", Value(string));
}

void BuiltinManager::setupArray(std::shared_ptr<Environment> globalEnv) {
    // Setup Array object
    auto array = builtins::Array::create();
    globalEnv->define("Array", Value(array));
}

void BuiltinManager::setupObject(std::shared_ptr<Environment> globalEnv) {
    // Setup Object object
    auto object = builtins::Object::create();
    globalEnv->define("Object", Value(object));
}

void BuiltinManager::setupBoolean(std::shared_ptr<Environment> globalEnv) {
    // Setup Boolean object
    auto boolean = builtins::Boolean::create();
    globalEnv->define("Boolean", Value(boolean));
}

}  // namespace rift::core 