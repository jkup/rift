#include "rift/core/engine/builtin_manager.h"

#include "rift/builtins/array/array.h"
#include "rift/builtins/array/array_iterator.h"
#include "rift/builtins/boolean/boolean.h"
#include "rift/builtins/console/console.h"
#include "rift/builtins/error/error.h"
#include "rift/builtins/error/range_error.h"
#include "rift/builtins/error/reference_error.h"
#include "rift/builtins/error/syntax_error.h"
#include "rift/builtins/error/type_error.h"
#include "rift/builtins/function/function.h"
#include "rift/builtins/generator/generator_iterator.h"
#include "rift/builtins/global/global.h"
#include "rift/builtins/iterator/iterator_prototype.h"
#include "rift/builtins/json/json.h"
#include "rift/builtins/map/map.h"
#include "rift/builtins/map/map_iterator.h"
#include "rift/builtins/math/math.h"
#include "rift/builtins/number/number.h"
#include "rift/builtins/object/object.h"
#include "rift/builtins/promise/promise.h"
#include "rift/builtins/regexp/regexp.h"
#include "rift/builtins/set/set.h"
#include "rift/builtins/set/set_iterator.h"
#include "rift/builtins/string/string.h"
#include "rift/builtins/string/string_iterator.h"
#include "rift/builtins/symbol/symbol.h"
#include "rift/builtins/weakmap/weakmap.h"
#include "rift/builtins/weakset/weakset.h"
#include "rift/core/engine/engine.h"
#include "rift/runtime/values/value.h"

namespace rift::core {

// Initialize static prototype storage - now raw pointers
JSObject* BuiltinManager::objectPrototype_ = nullptr;
JSObject* BuiltinManager::arrayPrototype_ = nullptr;
JSObject* BuiltinManager::stringPrototype_ = nullptr;
JSObject* BuiltinManager::booleanPrototype_ = nullptr;
JSObject* BuiltinManager::numberPrototype_ = nullptr;
JSObject* BuiltinManager::symbolPrototype_ = nullptr;
JSObject* BuiltinManager::errorPrototype_ = nullptr;
JSObject* BuiltinManager::typeErrorPrototype_ = nullptr;
JSObject* BuiltinManager::referenceErrorPrototype_ = nullptr;
JSObject* BuiltinManager::syntaxErrorPrototype_ = nullptr;
JSObject* BuiltinManager::rangeErrorPrototype_ = nullptr;
JSObject* BuiltinManager::regexpPrototype_ = nullptr;
JSObject* BuiltinManager::iteratorPrototype_ = nullptr;
JSObject* BuiltinManager::setPrototype_ = nullptr;
JSObject* BuiltinManager::mapPrototype_ = nullptr;
JSObject* BuiltinManager::weakMapPrototype_ = nullptr;
JSObject* BuiltinManager::weakSetPrototype_ = nullptr;
JSObject* BuiltinManager::promisePrototype_ = nullptr;
JSObject* BuiltinManager::functionPrototype_ = nullptr;

void BuiltinManager::setupBuiltins(std::shared_ptr<Environment> globalEnv, Rift* engine) {
    // Get the object factory from the engine
    rift::memory::ObjectFactory* factory = engine ? engine->getObjectFactory() : nullptr;

    // Set up the static factories for use in static methods FIRST
    if(factory) {
        builtins::Array::setObjectFactory(factory);
        builtins::Object::setObjectFactory(factory);
        builtins::String::setObjectFactory(factory);
        builtins::Boolean::setObjectFactory(factory);
        builtins::Number::setObjectFactory(factory);
        builtins::Error::setObjectFactory(factory);
        builtins::TypeError::setObjectFactory(factory);
        builtins::ReferenceError::setObjectFactory(factory);
        builtins::SyntaxError::setObjectFactory(factory);
        builtins::RangeError::setObjectFactory(factory);
        builtins::RegExp::setObjectFactory(factory);
        builtins::Symbol::setObjectFactory(factory);
        builtins::Set::setObjectFactory(factory);
        builtins::Map::setObjectFactory(factory);
        builtins::WeakMap::setObjectFactory(factory);
        builtins::WeakSet::setObjectFactory(factory);
        builtins::Promise::setObjectFactory(factory);
        builtins::Function::setObjectFactory(factory);
    }

    // Setup Function FIRST so other functions can inherit from Function.prototype.
    // setupFunction uses two-phase bootstrap: creates Function.prototype before
    // any JSFunction objects, so all functions get the correct prototype chain.
    setupFunction(globalEnv, factory);

    // Setup iterator prototype FIRST - other iterators inherit from this
    setupIteratorPrototype(factory);

    // Setup iterator subtype prototypes (must be after iterator prototype)
    builtins::ArrayIterator::setupPrototype(factory, iteratorPrototype_);
    builtins::StringIterator::setupPrototype(factory, iteratorPrototype_);
    builtins::SetIterator::setupPrototype(factory, iteratorPrototype_);
    builtins::MapIterator::setupPrototype(factory, iteratorPrototype_);
    builtins::GeneratorIterator::setupPrototype(factory, iteratorPrototype_);

    // Now setup builtins with factory - these will create their own prototypes
    setupGlobalFunctions(globalEnv, factory);
    setupConsole(globalEnv, factory);
    setupMath(globalEnv, factory);
    setupString(globalEnv, factory);
    setupArray(globalEnv, factory);
    setupJSON(globalEnv, engine);
    setupObject(globalEnv, factory);
    setupBoolean(globalEnv, factory);
    setupNumber(globalEnv, factory);
    setupError(globalEnv, factory);
    setupTypeError(globalEnv, factory);
    setupReferenceError(globalEnv, factory);
    setupSyntaxError(globalEnv, factory);
    setupRangeError(globalEnv, factory);
    setupRegExp(globalEnv, factory);
    setupSymbol(globalEnv, factory);
    setupSet(globalEnv, factory);
    setupMap(globalEnv, factory);
    setupWeakMap(globalEnv, factory);
    setupWeakSet(globalEnv, factory);
    setupPromise(globalEnv, factory, engine);

    // After all builtins are created, get their prototypes from the constructors
    auto* objectConstructor = globalEnv->get("Object").getObject();
    auto* arrayConstructor = globalEnv->get("Array").getObject();
    auto* stringConstructor = globalEnv->get("String").getObject();
    auto* booleanConstructor = globalEnv->get("Boolean").getObject();
    auto* numberConstructor = globalEnv->get("Number").getObject();
    auto* errorConstructor = globalEnv->get("Error").getObject();
    auto* typeErrorConstructor = globalEnv->get("TypeError").getObject();
    auto* referenceErrorConstructor = globalEnv->get("ReferenceError").getObject();
    auto* syntaxErrorConstructor = globalEnv->get("SyntaxError").getObject();
    auto* rangeErrorConstructor = globalEnv->get("RangeError").getObject();
    auto* regexpConstructor = globalEnv->get("RegExp").getObject();
    auto* symbolConstructor = globalEnv->get("Symbol").getObject();
    auto* setConstructor = globalEnv->get("Set").getObject();
    auto* mapConstructor = globalEnv->get("Map").getObject();
    auto* weakMapConstructor = globalEnv->get("WeakMap").getObject();
    auto* weakSetConstructor = globalEnv->get("WeakSet").getObject();
    auto* promiseConstructor = globalEnv->get("Promise").getObject();

    if(objectConstructor)
        objectPrototype_ = objectConstructor->getProperty("prototype").getObject();
    if(arrayConstructor)
        arrayPrototype_ = arrayConstructor->getProperty("prototype").getObject();
    if(stringConstructor)
        stringPrototype_ = stringConstructor->getProperty("prototype").getObject();
    if(booleanConstructor)
        booleanPrototype_ = booleanConstructor->getProperty("prototype").getObject();
    if(numberConstructor)
        numberPrototype_ = numberConstructor->getProperty("prototype").getObject();
    if(errorConstructor)
        errorPrototype_ = errorConstructor->getProperty("prototype").getObject();
    if(typeErrorConstructor)
        typeErrorPrototype_ = typeErrorConstructor->getProperty("prototype").getObject();
    if(referenceErrorConstructor)
        referenceErrorPrototype_ = referenceErrorConstructor->getProperty("prototype").getObject();
    if(syntaxErrorConstructor)
        syntaxErrorPrototype_ = syntaxErrorConstructor->getProperty("prototype").getObject();
    if(rangeErrorConstructor)
        rangeErrorPrototype_ = rangeErrorConstructor->getProperty("prototype").getObject();
    if(regexpConstructor)
        regexpPrototype_ = regexpConstructor->getProperty("prototype").getObject();
    if(symbolConstructor)
        symbolPrototype_ = symbolConstructor->getProperty("prototype").getObject();
    if(setConstructor)
        setPrototype_ = setConstructor->getProperty("prototype").getObject();
    if(mapConstructor)
        mapPrototype_ = mapConstructor->getProperty("prototype").getObject();
    if(weakMapConstructor)
        weakMapPrototype_ = weakMapConstructor->getProperty("prototype").getObject();
    if(weakSetConstructor)
        weakSetPrototype_ = weakSetConstructor->getProperty("prototype").getObject();
    if(promiseConstructor)
        promisePrototype_ = promiseConstructor->getProperty("prototype").getObject();

    // Set up prototype chain: All prototypes -> Object.prototype (except Object itself)
    if(objectPrototype_ && arrayPrototype_) {
        arrayPrototype_->setPrototype(objectPrototype_);
    }
    if(objectPrototype_ && stringPrototype_) {
        stringPrototype_->setPrototype(objectPrototype_);
    }
    if(objectPrototype_ && booleanPrototype_) {
        booleanPrototype_->setPrototype(objectPrototype_);
    }
    if(objectPrototype_ && numberPrototype_) {
        numberPrototype_->setPrototype(objectPrototype_);
    }
    if(objectPrototype_ && errorPrototype_) {
        errorPrototype_->setPrototype(objectPrototype_);
    }
    if(objectPrototype_ && regexpPrototype_) {
        regexpPrototype_->setPrototype(objectPrototype_);
    }
    if(objectPrototype_ && symbolPrototype_) {
        symbolPrototype_->setPrototype(objectPrototype_);
    }
    if(objectPrototype_ && setPrototype_) {
        setPrototype_->setPrototype(objectPrototype_);
    }
    if(objectPrototype_ && mapPrototype_) {
        mapPrototype_->setPrototype(objectPrototype_);
    }
    if(objectPrototype_ && weakMapPrototype_) {
        weakMapPrototype_->setPrototype(objectPrototype_);
    }
    if(objectPrototype_ && weakSetPrototype_) {
        weakSetPrototype_->setPrototype(objectPrototype_);
    }
    if(objectPrototype_ && promisePrototype_) {
        promisePrototype_->setPrototype(objectPrototype_);
    }
    if(objectPrototype_ && functionPrototype_) {
        functionPrototype_->setPrototype(objectPrototype_);
    }

    // Setup GC functions if engine is provided
    if(engine) {
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

JSObject* BuiltinManager::getNumberPrototype() {
    return numberPrototype_;
}

JSObject* BuiltinManager::getSymbolPrototype() {
    return symbolPrototype_;
}

JSObject* BuiltinManager::getErrorPrototype() {
    return errorPrototype_;
}

JSObject* BuiltinManager::getRegExpPrototype() {
    return regexpPrototype_;
}

JSObject* BuiltinManager::getIteratorPrototype() {
    return iteratorPrototype_;
}

JSObject* BuiltinManager::getSetPrototype() {
    return setPrototype_;
}

JSObject* BuiltinManager::getMapPrototype() {
    return mapPrototype_;
}

JSObject* BuiltinManager::getWeakMapPrototype() {
    return weakMapPrototype_;
}

JSObject* BuiltinManager::getWeakSetPrototype() {
    return weakSetPrototype_;
}

JSObject* BuiltinManager::getPromisePrototype() {
    return promisePrototype_;
}

JSObject* BuiltinManager::getTypeErrorPrototype() {
    return typeErrorPrototype_;
}

JSObject* BuiltinManager::getReferenceErrorPrototype() {
    return referenceErrorPrototype_;
}

JSObject* BuiltinManager::getSyntaxErrorPrototype() {
    return syntaxErrorPrototype_;
}

JSObject* BuiltinManager::getRangeErrorPrototype() {
    return rangeErrorPrototype_;
}

JSObject* BuiltinManager::getFunctionPrototype() {
    return functionPrototype_;
}

void BuiltinManager::setupGlobalFunctions(std::shared_ptr<Environment> globalEnv,
                                          rift::memory::ObjectFactory* factory) {
    // Setup global functions (parseInt, parseFloat, isNaN, isFinite, etc.)
    builtins::Global::setupGlobalFunctions(globalEnv, factory);  // Pass factory parameter
}

void BuiltinManager::setupConsole(std::shared_ptr<Environment> globalEnv,
                                  rift::memory::ObjectFactory* factory) {
    // Setup console object using GC-managed creation
    auto* console = builtins::Console::create(factory);  // console is now raw pointer
    globalEnv->define("console", Value(console));
}

void BuiltinManager::setupMath(std::shared_ptr<Environment> globalEnv,
                               rift::memory::ObjectFactory* factory) {
    // Setup Math object using GC-managed creation
    auto* math = builtins::Math::create(factory);  // math is now raw pointer
    globalEnv->define("Math", Value(math));
}

void BuiltinManager::setupString(std::shared_ptr<Environment> globalEnv,
                                 rift::memory::ObjectFactory* factory) {
    // Setup String object using GC-managed creation
    auto* string = builtins::String::create(factory);  // string is now raw pointer
    globalEnv->define("String", Value(string));
}

void BuiltinManager::setupArray(std::shared_ptr<Environment> globalEnv,
                                rift::memory::ObjectFactory* factory) {
    // Setup Array object using GC-managed creation
    auto* array = builtins::Array::create(factory);  // array is now raw pointer
    globalEnv->define("Array", Value(array));
}

void BuiltinManager::setupObject(std::shared_ptr<Environment> globalEnv,
                                 rift::memory::ObjectFactory* factory) {
    // Setup Object object using GC-managed creation
    auto* object = builtins::Object::create(factory);  // object is now raw pointer
    globalEnv->define("Object", Value(object));
}

void BuiltinManager::setupBoolean(std::shared_ptr<Environment> globalEnv,
                                  rift::memory::ObjectFactory* factory) {
    // Setup Boolean object using GC-managed creation
    auto* boolean = builtins::Boolean::create(factory);  // boolean is now raw pointer
    globalEnv->define("Boolean", Value(boolean));
}

void BuiltinManager::setupNumber(std::shared_ptr<Environment> globalEnv,
                                 rift::memory::ObjectFactory* factory) {
    // Setup Number object using GC-managed creation
    auto* number = builtins::Number::create(factory);  // number is now raw pointer
    globalEnv->define("Number", Value(number));
}

void BuiltinManager::setupError(std::shared_ptr<Environment> globalEnv,
                                rift::memory::ObjectFactory* factory) {
    // Setup Error object using GC-managed creation
    auto* error = builtins::Error::create(factory);  // error is now raw pointer
    globalEnv->define("Error", Value(error));
}

void BuiltinManager::setupTypeError(std::shared_ptr<Environment> globalEnv,
                                    rift::memory::ObjectFactory* factory) {
    // Setup TypeError object using GC-managed creation
    auto* typeError = builtins::TypeError::create(factory);
    globalEnv->define("TypeError", Value(typeError));
}

void BuiltinManager::setupReferenceError(std::shared_ptr<Environment> globalEnv,
                                         rift::memory::ObjectFactory* factory) {
    // Setup ReferenceError object using GC-managed creation
    auto* referenceError = builtins::ReferenceError::create(factory);
    globalEnv->define("ReferenceError", Value(referenceError));
}

void BuiltinManager::setupSyntaxError(std::shared_ptr<Environment> globalEnv,
                                      rift::memory::ObjectFactory* factory) {
    // Setup SyntaxError object using GC-managed creation
    auto* syntaxError = builtins::SyntaxError::create(factory);
    globalEnv->define("SyntaxError", Value(syntaxError));
}

void BuiltinManager::setupRangeError(std::shared_ptr<Environment> globalEnv,
                                     rift::memory::ObjectFactory* factory) {
    // Setup RangeError object using GC-managed creation
    auto* rangeError = builtins::RangeError::create(factory);
    globalEnv->define("RangeError", Value(rangeError));
}
void BuiltinManager::setupGCFunctions(std::shared_ptr<Environment> globalEnv, Rift* engine) {
    // Create GC functions that have access to the engine using GC-managed creation
    auto* gcFunction = engine->getObjectFactory()->createJSFunction(
        [engine](const rift::core::CallContext& /*ctx*/, const std::vector<Value>& args) -> Value {
            if(engine) {
                engine->collectGarbage();
            }
            return Value::undefined();
        });

    auto* gcStatsFunction = engine->getObjectFactory()->createJSFunction(
        [engine](const rift::core::CallContext& /*ctx*/, const std::vector<Value>& args) -> Value {
            if(engine) {
                engine->printGCStats();
            }
            return Value::undefined();
        });

    globalEnv->define("gc", Value(gcFunction));  // Functions are now raw pointers
    globalEnv->define("gcStats", Value(gcStatsFunction));
}

void BuiltinManager::setupIteratorPrototype(rift::memory::ObjectFactory* factory) {
    // Create %IteratorPrototype% - the hidden prototype all iterators inherit from
    iteratorPrototype_ = builtins::IteratorPrototype::create(factory);
}

void BuiltinManager::clearStaticPrototypes() {
    // Clear all static prototype pointers to avoid dangling references during shutdown
    objectPrototype_ = nullptr;
    arrayPrototype_ = nullptr;
    stringPrototype_ = nullptr;
    booleanPrototype_ = nullptr;
    numberPrototype_ = nullptr;
    symbolPrototype_ = nullptr;
    errorPrototype_ = nullptr;
    regexpPrototype_ = nullptr;
    typeErrorPrototype_ = nullptr;
    referenceErrorPrototype_ = nullptr;
    syntaxErrorPrototype_ = nullptr;
    rangeErrorPrototype_ = nullptr;
    iteratorPrototype_ = nullptr;
    setPrototype_ = nullptr;
    mapPrototype_ = nullptr;
    weakMapPrototype_ = nullptr;
    weakSetPrototype_ = nullptr;
    promisePrototype_ = nullptr;
    functionPrototype_ = nullptr;
}

void BuiltinManager::setupRegExp(std::shared_ptr<Environment> globalEnv,
                                 rift::memory::ObjectFactory* factory) {
    // Setup RegExp object using GC-managed creation
    auto* regexp = builtins::RegExp::create(factory);
    globalEnv->define("RegExp", Value(regexp));
}

void BuiltinManager::setupSymbol(std::shared_ptr<Environment> globalEnv,
                                 rift::memory::ObjectFactory* factory) {
    // Setup Symbol object using GC-managed creation
    auto* symbol = builtins::Symbol::create(factory);
    globalEnv->define("Symbol", Value(symbol));
}

void BuiltinManager::setupSet(std::shared_ptr<Environment> globalEnv,
                              rift::memory::ObjectFactory* factory) {
    // Setup Set object using GC-managed creation
    auto* set = builtins::Set::create(factory);
    globalEnv->define("Set", Value(set));
}

void BuiltinManager::setupJSON(std::shared_ptr<Environment> globalEnv, rift::core::Rift* engine) {
    rift::builtins::JSON::setup(globalEnv, engine);
}

void BuiltinManager::setupMap(std::shared_ptr<Environment> globalEnv,
                              rift::memory::ObjectFactory* factory) {
    // Setup Map object using GC-managed creation
    auto* map = builtins::Map::create(factory);
    globalEnv->define("Map", Value(map));
}

void BuiltinManager::setupWeakMap(std::shared_ptr<Environment> globalEnv,
                                  rift::memory::ObjectFactory* factory) {
    // Setup WeakMap object using GC-managed creation
    auto* weakMap = builtins::WeakMap::create(factory);
    globalEnv->define("WeakMap", Value(weakMap));
}

void BuiltinManager::setupWeakSet(std::shared_ptr<Environment> globalEnv,
                                  rift::memory::ObjectFactory* factory) {
    // Setup WeakSet object using GC-managed creation
    auto* weakSet = builtins::WeakSet::create(factory);
    globalEnv->define("WeakSet", Value(weakSet));
}

void BuiltinManager::setupPromise(std::shared_ptr<Environment> globalEnv,
                                  rift::memory::ObjectFactory* factory, Rift* engine) {
    // Setup Promise object using GC-managed creation
    auto* promise = builtins::Promise::create(factory);
    globalEnv->define("Promise", Value(promise));

    // Store engine reference for microtask queue access
    builtins::Promise::setEngine(engine);
}

void BuiltinManager::setupFunction(std::shared_ptr<Environment> globalEnv,
                                   rift::memory::ObjectFactory* factory) {
    // Two-phase bootstrap: Function.prototype must exist BEFORE we create any
    // JSFunction objects, so that createJSFunction() can set the correct
    // prototype chain on every function from the start.
    //
    // Phase 1: Create the bare Function.prototype object and register it.
    auto* prototype = factory->createJSObject();
    functionPrototype_ = prototype;

    // Phase 2: Now that functionPrototype_ is set, every call to
    // createJSFunction() will automatically get the right prototype.
    // Populate Function.prototype with methods and create the constructor.
    builtins::Function::setupPrototypeMethods(prototype, factory);

    builtins::Function::setObjectFactory(factory);
    auto* constructor = factory->createJSFunction(builtins::Function::constructor);
    builtins::Function::setupStaticMethods(constructor, factory);

    constructor->setProperty("prototype", Value(prototype));
    prototype->setProperty("constructor", Value(constructor));

    globalEnv->define("Function", Value(constructor));
}

}  // namespace rift::core