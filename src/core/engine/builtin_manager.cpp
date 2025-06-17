#include "rift/core/engine/builtin_manager.h"
#include "rift/builtins/global/global.h"
#include "rift/builtins/console/console.h"
#include "rift/builtins/math/math.h"
#include "rift/builtins/string/string.h"
#include "rift/builtins/array/array.h"
#include "rift/builtins/object/object.h"
#include "rift/runtime/values/value.h"

namespace rift::core {

void BuiltinManager::setupBuiltins(std::shared_ptr<Environment> globalEnv) {
    setupGlobalFunctions(globalEnv);
    setupConsole(globalEnv);
    setupMath(globalEnv);
    setupString(globalEnv);
    setupArray(globalEnv);
    setupObject(globalEnv);
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

}  // namespace rift::core 