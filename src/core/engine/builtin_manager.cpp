#include "rift/core/engine/builtin_manager.h"

#include "rift/builtins/array/array.h"
#include "rift/builtins/array/array_iterator.h"
#include "rift/builtins/boolean/boolean.h"
#include "rift/builtins/console/console.h"
#include "rift/builtins/date/date.h"
#include "rift/builtins/error/error.h"
#include "rift/builtins/error/eval_error.h"
#include "rift/builtins/error/range_error.h"
#include "rift/builtins/error/reference_error.h"
#include "rift/builtins/error/syntax_error.h"
#include "rift/builtins/error/type_error.h"
#include "rift/builtins/error/uri_error.h"
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
#include "rift/builtins/temporal/duration.h"
#include "rift/builtins/temporal/instant.h"
#include "rift/builtins/temporal/plain_date.h"
#include "rift/builtins/temporal/plain_date_time.h"
#include "rift/builtins/temporal/plain_month_day.h"
#include "rift/builtins/temporal/plain_time.h"
#include "rift/builtins/temporal/plain_year_month.h"
#include "rift/builtins/temporal/temporal.h"
#include "rift/builtins/temporal/zoned_date_time.h"
#include "rift/builtins/weakmap/weakmap.h"
#include "rift/builtins/weakset/weakset.h"
#include "rift/core/engine/engine.h"
#include "rift/core/engine/javascript_exception.h"
#include "rift/frontend/lexer/lexer.h"
#include "rift/frontend/parser/parser.h"
#include "rift/memory/gc_protector.h"
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
JSObject* BuiltinManager::evalErrorPrototype_ = nullptr;
JSObject* BuiltinManager::uriErrorPrototype_ = nullptr;
JSObject* BuiltinManager::regexpPrototype_ = nullptr;
JSObject* BuiltinManager::iteratorPrototype_ = nullptr;
JSObject* BuiltinManager::setPrototype_ = nullptr;
JSObject* BuiltinManager::mapPrototype_ = nullptr;
JSObject* BuiltinManager::weakMapPrototype_ = nullptr;
JSObject* BuiltinManager::weakSetPrototype_ = nullptr;
JSObject* BuiltinManager::promisePrototype_ = nullptr;
JSObject* BuiltinManager::functionPrototype_ = nullptr;
JSObject* BuiltinManager::datePrototype_ = nullptr;
JSObject* BuiltinManager::instantPrototype_ = nullptr;
JSObject* BuiltinManager::durationPrototype_ = nullptr;
JSObject* BuiltinManager::plainDatePrototype_ = nullptr;
JSObject* BuiltinManager::plainTimePrototype_ = nullptr;
JSObject* BuiltinManager::plainDateTimePrototype_ = nullptr;
JSObject* BuiltinManager::plainYearMonthPrototype_ = nullptr;
JSObject* BuiltinManager::plainMonthDayPrototype_ = nullptr;
JSObject* BuiltinManager::zonedDateTimePrototype_ = nullptr;
JSFunction* BuiltinManager::evalFunction_ = nullptr;

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
        builtins::EvalError::setObjectFactory(factory);
        builtins::URIError::setObjectFactory(factory);
        builtins::RegExp::setObjectFactory(factory);
        builtins::Symbol::setObjectFactory(factory);
        builtins::Set::setObjectFactory(factory);
        builtins::Map::setObjectFactory(factory);
        builtins::WeakMap::setObjectFactory(factory);
        builtins::WeakSet::setObjectFactory(factory);
        builtins::Promise::setObjectFactory(factory);
        builtins::Date::setObjectFactory(factory);
        builtins::Function::setObjectFactory(factory);
        builtins::TemporalInstant::setObjectFactory(factory);
        builtins::TemporalDuration::setObjectFactory(factory);
        builtins::TemporalPlainDate::setObjectFactory(factory);
        builtins::TemporalPlainTime::setObjectFactory(factory);
        builtins::TemporalPlainDateTime::setObjectFactory(factory);
        builtins::TemporalPlainYearMonth::setObjectFactory(factory);
        builtins::TemporalPlainMonthDay::setObjectFactory(factory);
        builtins::TemporalZonedDateTime::setObjectFactory(factory);
    }

    // Setup Function FIRST so other functions can inherit from Function.prototype.
    // setupFunction uses two-phase bootstrap: creates Function.prototype before
    // any JSFunction objects, so all functions get the correct prototype chain.
    setupFunction(globalEnv, factory);

    // Store engine reference for Function constructor (parsing function bodies)
    builtins::Function::setEngine(engine);

    // Setup iterator prototype FIRST - other iterators inherit from this
    setupIteratorPrototype(factory);

    // Setup iterator subtype prototypes (must be after iterator prototype)
    builtins::ArrayIterator::setupPrototype(factory, iteratorPrototype_);
    builtins::StringIterator::setupPrototype(factory, iteratorPrototype_);
    builtins::SetIterator::setupPrototype(factory, iteratorPrototype_);
    builtins::MapIterator::setupPrototype(factory, iteratorPrototype_);
    builtins::GeneratorIterator::setupPrototype(factory, iteratorPrototype_);

    // Now setup builtins with factory - these will create their own prototypes
    setupGlobalFunctions(globalEnv, factory, engine);
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
    setupEvalError(globalEnv, factory);
    setupURIError(globalEnv, factory);
    setupRegExp(globalEnv, factory);
    setupSymbol(globalEnv, factory);
    setupSet(globalEnv, factory);
    setupMap(globalEnv, factory);
    setupWeakMap(globalEnv, factory);
    setupWeakSet(globalEnv, factory);
    setupDate(globalEnv, factory);
    setupPromise(globalEnv, factory, engine);
    setupTemporal(globalEnv, factory);

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
    auto* evalErrorConstructor = globalEnv->get("EvalError").getObject();
    auto* uriErrorConstructor = globalEnv->get("URIError").getObject();
    auto* regexpConstructor = globalEnv->get("RegExp").getObject();
    auto* symbolConstructor = globalEnv->get("Symbol").getObject();
    auto* setConstructor = globalEnv->get("Set").getObject();
    auto* mapConstructor = globalEnv->get("Map").getObject();
    auto* weakMapConstructor = globalEnv->get("WeakMap").getObject();
    auto* weakSetConstructor = globalEnv->get("WeakSet").getObject();
    auto* promiseConstructor = globalEnv->get("Promise").getObject();
    auto* dateConstructor = globalEnv->get("Date").getObject();

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
    if(evalErrorConstructor)
        evalErrorPrototype_ = evalErrorConstructor->getProperty("prototype").getObject();
    if(uriErrorConstructor)
        uriErrorPrototype_ = uriErrorConstructor->getProperty("prototype").getObject();
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
    if(dateConstructor)
        datePrototype_ = dateConstructor->getProperty("prototype").getObject();

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
    if(objectPrototype_ && datePrototype_) {
        datePrototype_->setPrototype(objectPrototype_);
    }
    if(objectPrototype_ && instantPrototype_) {
        instantPrototype_->setPrototype(objectPrototype_);
    }
    if(objectPrototype_ && durationPrototype_) {
        durationPrototype_->setPrototype(objectPrototype_);
    }
    if(objectPrototype_ && plainDatePrototype_) {
        plainDatePrototype_->setPrototype(objectPrototype_);
    }
    if(objectPrototype_ && plainTimePrototype_) {
        plainTimePrototype_->setPrototype(objectPrototype_);
    }
    if(objectPrototype_ && plainDateTimePrototype_) {
        plainDateTimePrototype_->setPrototype(objectPrototype_);
    }
    if(objectPrototype_ && plainYearMonthPrototype_) {
        plainYearMonthPrototype_->setPrototype(objectPrototype_);
    }
    if(objectPrototype_ && plainMonthDayPrototype_) {
        plainMonthDayPrototype_->setPrototype(objectPrototype_);
    }
    if(objectPrototype_ && zonedDateTimePrototype_) {
        zonedDateTimePrototype_->setPrototype(objectPrototype_);
    }

    // Setup GC functions if engine is provided
    if(engine) {
        setupGCFunctions(globalEnv, engine);
    }

    // Create globalThis - the global object that mirrors the global environment
    if(factory) {
        auto* globalObject = factory->createJSObject();
        rift::memory::GCProtector protect(globalObject, factory->getObjectManager());

        // Populate globalThis with all current global variables
        for(const auto& name : globalEnv->getVariableNames()) {
            globalObject->setProperty(name, globalEnv->get(name));
        }

        // Self-referential: globalThis.globalThis === globalThis
        globalObject->setProperty("globalThis", Value(globalObject));

        // Link the global environment to this object so future define/set calls sync
        globalEnv->setBindingObject(globalObject);

        // Register globalThis in the global environment
        globalEnv->define("globalThis", Value(globalObject));
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

JSObject* BuiltinManager::getEvalErrorPrototype() {
    return evalErrorPrototype_;
}

JSObject* BuiltinManager::getURIErrorPrototype() {
    return uriErrorPrototype_;
}

JSObject* BuiltinManager::getFunctionPrototype() {
    return functionPrototype_;
}

JSObject* BuiltinManager::getDatePrototype() {
    return datePrototype_;
}

JSObject* BuiltinManager::getInstantPrototype() {
    return instantPrototype_;
}

JSObject* BuiltinManager::getDurationPrototype() {
    return durationPrototype_;
}

JSObject* BuiltinManager::getPlainDatePrototype() {
    return plainDatePrototype_;
}

JSObject* BuiltinManager::getPlainTimePrototype() {
    return plainTimePrototype_;
}

JSObject* BuiltinManager::getPlainDateTimePrototype() {
    return plainDateTimePrototype_;
}

JSObject* BuiltinManager::getPlainYearMonthPrototype() {
    return plainYearMonthPrototype_;
}

JSObject* BuiltinManager::getPlainMonthDayPrototype() {
    return plainMonthDayPrototype_;
}

JSObject* BuiltinManager::getZonedDateTimePrototype() {
    return zonedDateTimePrototype_;
}

JSFunction* BuiltinManager::getEvalFunction() {
    return evalFunction_;
}

void BuiltinManager::setupGlobalFunctions(std::shared_ptr<Environment> globalEnv,
                                          rift::memory::ObjectFactory* factory, Rift* engine) {
    // Setup global functions (parseInt, parseFloat, isNaN, isFinite, etc.)
    builtins::Global::setupGlobalFunctions(globalEnv, factory);

    // Register eval() - needs engine for parsing and execution
    if(engine) {
        auto* evalFunc =
            factory->createJSFunction([engine](const rift::core::CallContext& /*ctx*/,
                                               const std::vector<Value>& args) -> Value {
                if(args.empty()) {
                    return Value::undefined();
                }

                // Per spec: if the argument is not a string, return it as-is
                if(!args[0].isString()) {
                    return args[0];
                }

                std::string code = args[0].toString();

                try {
                    // Parse the code using the existing lexer/parser pipeline
                    rift::frontend::Lexer lexer(code);
                    auto tokens = lexer.tokenize();
                    rift::frontend::Parser parser(tokens);
                    auto ast = parser.parse();

                    // Phase 1: execute in global environment (indirect eval behavior)
                    return engine->evaluate(ast, engine->getGlobalEnvironment());
                } catch(const JavaScriptException&) {
                    throw;  // Re-throw JavaScript exceptions as-is
                } catch(const ReturnException& e) {
                    // A top-level return in eval'd code returns the value
                    return e.getValue();
                } catch(const std::exception& e) {
                    // Convert parse/runtime errors to SyntaxError
                    throw JavaScriptException(Value(std::string(e.what())));
                }
            });
        evalFunc->setProperty("length", Value(1.0));
        evalFunction_ = evalFunc;
        globalEnv->define("eval", Value(evalFunc));
    }
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
void BuiltinManager::setupEvalError(std::shared_ptr<Environment> globalEnv,
                                    rift::memory::ObjectFactory* factory) {
    auto* evalError = builtins::EvalError::create(factory);
    globalEnv->define("EvalError", Value(evalError));
}
void BuiltinManager::setupURIError(std::shared_ptr<Environment> globalEnv,
                                   rift::memory::ObjectFactory* factory) {
    auto* uriError = builtins::URIError::create(factory);
    globalEnv->define("URIError", Value(uriError));
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
    evalErrorPrototype_ = nullptr;
    uriErrorPrototype_ = nullptr;
    iteratorPrototype_ = nullptr;
    setPrototype_ = nullptr;
    mapPrototype_ = nullptr;
    weakMapPrototype_ = nullptr;
    weakSetPrototype_ = nullptr;
    promisePrototype_ = nullptr;
    functionPrototype_ = nullptr;
    datePrototype_ = nullptr;
    instantPrototype_ = nullptr;
    durationPrototype_ = nullptr;
    plainDatePrototype_ = nullptr;
    plainTimePrototype_ = nullptr;
    plainDateTimePrototype_ = nullptr;
    plainYearMonthPrototype_ = nullptr;
    plainMonthDayPrototype_ = nullptr;
    zonedDateTimePrototype_ = nullptr;
    evalFunction_ = nullptr;
}

void BuiltinManager::setupRegExp(std::shared_ptr<Environment> globalEnv,
                                 rift::memory::ObjectFactory* factory) {
    // Setup RegExp object using GC-managed creation
    auto* regexp = builtins::RegExp::create(factory);
    globalEnv->define("RegExp", Value(regexp));
}

void BuiltinManager::setupDate(std::shared_ptr<Environment> globalEnv,
                               rift::memory::ObjectFactory* factory) {
    auto* date = builtins::Date::create(factory);
    globalEnv->define("Date", Value(date));
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

void BuiltinManager::setupTemporal(std::shared_ptr<Environment> globalEnv,
                                   rift::memory::ObjectFactory* factory) {
    auto* temporal = builtins::Temporal::create(factory);
    globalEnv->define("Temporal", Value(temporal));

    // Extract Instant prototype directly from the Temporal.Instant constructor
    auto instantCtorVal = temporal->getProperty("Instant");
    if(instantCtorVal.isObject() || instantCtorVal.isFunction()) {
        auto protoVal = instantCtorVal.getObject()->getProperty("prototype");
        if(protoVal.isObject() || protoVal.isFunction()) {
            instantPrototype_ = protoVal.getObject();
        }
    }

    // Extract Duration prototype from the Temporal.Duration constructor
    auto durationCtorVal = temporal->getProperty("Duration");
    if(durationCtorVal.isObject() || durationCtorVal.isFunction()) {
        auto protoVal = durationCtorVal.getObject()->getProperty("prototype");
        if(protoVal.isObject() || protoVal.isFunction()) {
            durationPrototype_ = protoVal.getObject();
        }
    }

    // Extract PlainDate prototype from the Temporal.PlainDate constructor
    auto plainDateCtorVal = temporal->getProperty("PlainDate");
    if(plainDateCtorVal.isObject() || plainDateCtorVal.isFunction()) {
        auto protoVal = plainDateCtorVal.getObject()->getProperty("prototype");
        if(protoVal.isObject() || protoVal.isFunction()) {
            plainDatePrototype_ = protoVal.getObject();
        }
    }

    // Extract PlainTime prototype from the Temporal.PlainTime constructor
    auto plainTimeCtorVal = temporal->getProperty("PlainTime");
    if(plainTimeCtorVal.isObject() || plainTimeCtorVal.isFunction()) {
        auto protoVal = plainTimeCtorVal.getObject()->getProperty("prototype");
        if(protoVal.isObject() || protoVal.isFunction()) {
            plainTimePrototype_ = protoVal.getObject();
        }
    }

    // Extract PlainDateTime prototype from the Temporal.PlainDateTime constructor
    auto plainDateTimeCtorVal = temporal->getProperty("PlainDateTime");
    if(plainDateTimeCtorVal.isObject() || plainDateTimeCtorVal.isFunction()) {
        auto protoVal = plainDateTimeCtorVal.getObject()->getProperty("prototype");
        if(protoVal.isObject() || protoVal.isFunction()) {
            plainDateTimePrototype_ = protoVal.getObject();
        }
    }

    // Extract PlainYearMonth prototype from the Temporal.PlainYearMonth constructor
    auto plainYearMonthCtorVal = temporal->getProperty("PlainYearMonth");
    if(plainYearMonthCtorVal.isObject() || plainYearMonthCtorVal.isFunction()) {
        auto protoVal = plainYearMonthCtorVal.getObject()->getProperty("prototype");
        if(protoVal.isObject() || protoVal.isFunction()) {
            plainYearMonthPrototype_ = protoVal.getObject();
        }
    }

    // Extract PlainMonthDay prototype from the Temporal.PlainMonthDay constructor
    auto plainMonthDayCtorVal = temporal->getProperty("PlainMonthDay");
    if(plainMonthDayCtorVal.isObject() || plainMonthDayCtorVal.isFunction()) {
        auto protoVal = plainMonthDayCtorVal.getObject()->getProperty("prototype");
        if(protoVal.isObject() || protoVal.isFunction()) {
            plainMonthDayPrototype_ = protoVal.getObject();
        }
    }

    // Extract ZonedDateTime prototype from the Temporal.ZonedDateTime constructor
    auto zonedDateTimeCtorVal = temporal->getProperty("ZonedDateTime");
    if(zonedDateTimeCtorVal.isObject() || zonedDateTimeCtorVal.isFunction()) {
        auto protoVal = zonedDateTimeCtorVal.getObject()->getProperty("prototype");
        if(protoVal.isObject() || protoVal.isFunction()) {
            zonedDateTimePrototype_ = protoVal.getObject();
        }
    }
}

}  // namespace rift::core