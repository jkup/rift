#include "rift/builtins/set/set.h"

#include <cmath>
#include <sstream>

#include "rift/builtins/set/set_iterator.h"
#include "rift/builtins/symbol/symbol.h"
#include "rift/core/engine/builtin_manager.h"
#include "rift/core/engine/evaluation_utils.h"
#include "rift/core/engine/javascript_exception.h"
#include "rift/memory/gc_protector.h"
#include "rift/runtime/values/object.h"

namespace rift::builtins {

// ============================================================================
// Setup Methods
// ============================================================================

void Set::setupStaticMethods(JSObject* constructor, rift::memory::ObjectFactory* factory) {
    // Set has no static methods in ES2024 (unlike Array.isArray, Object.keys, etc.)
}

void Set::setupPrototypeMethods(JSObject* prototype, rift::memory::ObjectFactory* factory) {
    RIFT_METHOD(prototype, "add", Set::add);
    RIFT_METHOD(prototype, "has", Set::has);
    RIFT_METHOD(prototype, "delete", Set::deleteMethod);
    RIFT_METHOD(prototype, "clear", Set::clear);
    RIFT_METHOD(prototype, "forEach", Set::forEach);
    RIFT_METHOD(prototype, "values", Set::values);
    RIFT_METHOD(prototype, "keys", Set::keys);
    RIFT_METHOD(prototype, "entries", Set::entries);

    // size is a getter - register it as a method that acts as getter
    RIFT_METHOD(prototype, "size", Set::sizeGetter);

    // Symbol.iterator - alias for values() per ECMAScript spec
    std::string iterator_key =
        rift::core::EvaluationUtils::symbolToPropertyKey(Symbol::getIteratorId());
    auto* iterator_func = factory->createJSFunction(Set::values);
    prototype->setProperty(iterator_key, Value(iterator_func));
}

// ============================================================================
// Helper Methods
// ============================================================================

bool Set::sameValueZero(const Value& a, const Value& b) {
    // SameValueZero: like strict equality but NaN === NaN and +0 === -0
    if(a.getType() != b.getType()) {
        return false;
    }

    if(a.isNumber()) {
        double x = a.toNumber();
        double y = b.toNumber();

        // NaN === NaN in SameValueZero
        if(std::isnan(x) && std::isnan(y)) {
            return true;
        }

        // +0 === -0 in SameValueZero (unlike SameValue)
        return x == y;
    }

    if(a.isString()) {
        return a.getString() == b.getString();
    }

    if(a.isBoolean()) {
        return a.getBool() == b.getBool();
    }

    if(a.isSymbol()) {
        return a.getSymbol().id == b.getSymbol().id;
    }

    if(a.isObject() || a.isFunction()) {
        return a.getObject() == b.getObject();
    }

    if(a.isUndefined() || a.isNull()) {
        return true;  // same type already checked
    }

    return false;
}

std::string Set::valueToSetKey(const Value& v) {
    // Generate unique string key for internal lookup
    // Must handle SameValueZero semantics
    switch(v.getType()) {
        case ValueType::Undefined:
            return "@@undefined";
        case ValueType::Null:
            return "@@null";
        case ValueType::Boolean:
            return v.getBool() ? "@@true" : "@@false";
        case ValueType::Number: {
            double num = v.toNumber();
            if(std::isnan(num)) {
                return "@@NaN";
            }
            // +0 and -0 both map to "0" for SameValueZero
            // Normalize -0 to 0
            if(num == 0.0) {
                return "n:0";
            }
            std::ostringstream oss;
            oss << "n:" << num;
            return oss.str();
        }
        case ValueType::String:
            return "s:" + v.getString();
        case ValueType::Symbol: {
            std::ostringstream oss;
            oss << "y:" << v.getSymbol().id;
            return oss.str();
        }
        case ValueType::Object:
        case ValueType::Function: {
            // Use pointer address for object identity
            std::ostringstream oss;
            oss << "o:" << static_cast<const void*>(v.getObject());
            return oss.str();
        }
        default:
            return "@@unknown";
    }
}

JSObject* Set::createSetObject(rift::memory::ObjectFactory* factory, JSObject* prototype) {
    auto* setObj = factory->createJSObject(prototype);
    rift::memory::GCProtector protect(setObj, factory->getObjectManager());

    // Initialize internal slots
    auto* entries = factory->createJSObject();
    auto* keys = factory->createJSObject();

    setObj->setProperty("[[SetEntries]]", Value(entries));
    setObj->setProperty("[[SetKeys]]", Value(keys));
    setObj->setProperty("[[SetSize]]", Value(0.0));
    setObj->setProperty("[[SetNextIndex]]", Value(0.0));

    return setObj;
}

JSObject* Set::getGlobalPrototype() {
    return rift::core::BuiltinManager::getSetPrototype();
}

// ============================================================================
// Constructor
// ============================================================================

Value Set::constructor(const CallContext& ctx, const std::vector<Value>& args) {
    auto* factory = getObjectFactory();
    auto* prototype = getGlobalPrototype();
    auto* setObj = createSetObject(factory, prototype);
    rift::memory::GCProtector protect(setObj, factory->getObjectManager());

    // If no arguments or null/undefined, return empty Set
    if(args.empty() || args[0].isUndefined() || args[0].isNull()) {
        return Value(setObj);
    }

    // If argument is provided, try to iterate it
    Value iterable = args[0];

    if(iterable.isObject()) {
        auto* iterableObj = iterable.getObject();

        // Check for Symbol.iterator
        std::string iterKey =
            rift::core::EvaluationUtils::symbolToPropertyKey(Symbol::getIteratorId());
        Value iterMethod = iterableObj->getProperty(iterKey);

        if(iterMethod.isFunction()) {
            // Has Symbol.iterator - use iterator protocol
            auto* iterFn = dynamic_cast<JSFunction*>(iterMethod.getObject());
            if(iterFn) {
                rift::core::CallContext iterCtx(rift::core::CallType::Function, iterable);
                Value iterator = iterFn->call(iterCtx, {});

                if(iterator.isObject()) {
                    auto* iterObj = iterator.getObject();
                    Value nextMethod = iterObj->getProperty("next");

                    if(nextMethod.isFunction()) {
                        auto* nextFunc = dynamic_cast<JSFunction*>(nextMethod.getObject());
                        if(nextFunc) {
                            // Iterate until done
                            while(true) {
                                rift::core::CallContext nextCtx(rift::core::CallType::Function,
                                                                iterator);
                                Value result = nextFunc->call(nextCtx, {});

                                if(result.isObject()) {
                                    auto* resultObj = result.getObject();
                                    Value done = resultObj->getProperty("done");

                                    if(done.toBool()) {
                                        break;
                                    }

                                    Value value = resultObj->getProperty("value");

                                    // Add value to set
                                    Value keysVal = setObj->getProperty("[[SetKeys]]");
                                    auto* keysObj = keysVal.getObject();
                                    std::string key = valueToSetKey(value);

                                    if(!keysObj->hasOwnProperty(key)) {
                                        Value entriesVal = setObj->getProperty("[[SetEntries]]");
                                        auto* entriesObj = entriesVal.getObject();
                                        Value nextIndexVal =
                                            setObj->getProperty("[[SetNextIndex]]");
                                        size_t nextIndex =
                                            static_cast<size_t>(nextIndexVal.toNumber());

                                        entriesObj->setProperty(std::to_string(nextIndex), value);
                                        keysObj->setProperty(key,
                                                             Value(static_cast<double>(nextIndex)));
                                        setObj->setProperty(
                                            "[[SetNextIndex]]",
                                            Value(static_cast<double>(nextIndex + 1)));

                                        Value sizeVal = setObj->getProperty("[[SetSize]]");
                                        size_t size = static_cast<size_t>(sizeVal.toNumber());
                                        setObj->setProperty("[[SetSize]]",
                                                            Value(static_cast<double>(size + 1)));
                                    }
                                } else {
                                    break;
                                }
                            }
                        }
                    }
                }
            }
        } else {
            // Fallback: array-like iteration (for arrays without Symbol.iterator somehow)
            Value lengthVal = iterableObj->getProperty("length");
            if(lengthVal.isNumber()) {
                size_t len = static_cast<size_t>(lengthVal.toNumber());
                for(size_t i = 0; i < len; ++i) {
                    Value val = iterableObj->getProperty(std::to_string(i));

                    // Add value to set
                    Value keysVal = setObj->getProperty("[[SetKeys]]");
                    auto* keysObj = keysVal.getObject();
                    std::string key = valueToSetKey(val);

                    if(!keysObj->hasOwnProperty(key)) {
                        Value entriesVal = setObj->getProperty("[[SetEntries]]");
                        auto* entriesObj = entriesVal.getObject();
                        Value nextIndexVal = setObj->getProperty("[[SetNextIndex]]");
                        size_t nextIndex = static_cast<size_t>(nextIndexVal.toNumber());

                        entriesObj->setProperty(std::to_string(nextIndex), val);
                        keysObj->setProperty(key, Value(static_cast<double>(nextIndex)));
                        setObj->setProperty("[[SetNextIndex]]",
                                            Value(static_cast<double>(nextIndex + 1)));

                        Value sizeVal = setObj->getProperty("[[SetSize]]");
                        size_t size = static_cast<size_t>(sizeVal.toNumber());
                        setObj->setProperty("[[SetSize]]", Value(static_cast<double>(size + 1)));
                    }
                }
            }
        }
    }

    return Value(setObj);
}

// ============================================================================
// Instance Methods
// ============================================================================

Value Set::add(const CallContext& ctx, const std::vector<Value>& args) {
    if(!ctx.thisValue.isObject()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Set.prototype.add called on non-object"));
    }

    auto* setObj = ctx.thisValue.getObject();
    Value value = args.empty() ? Value::undefined() : args[0];

    // Get internal structures
    Value keysVal = setObj->getProperty("[[SetKeys]]");
    if(!keysVal.isObject()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Set.prototype.add called on incompatible receiver"));
    }
    auto* keysObj = keysVal.getObject();

    std::string key = valueToSetKey(value);

    // Check if already exists
    if(!keysObj->hasOwnProperty(key)) {
        Value entriesVal = setObj->getProperty("[[SetEntries]]");
        auto* entriesObj = entriesVal.getObject();
        Value nextIndexVal = setObj->getProperty("[[SetNextIndex]]");
        size_t nextIndex = static_cast<size_t>(nextIndexVal.toNumber());

        // Add to entries (maintains order)
        entriesObj->setProperty(std::to_string(nextIndex), value);

        // Add to keys lookup (for O(1) has())
        keysObj->setProperty(key, Value(static_cast<double>(nextIndex)));

        // Update next index
        setObj->setProperty("[[SetNextIndex]]", Value(static_cast<double>(nextIndex + 1)));

        // Update size
        Value sizeVal = setObj->getProperty("[[SetSize]]");
        size_t size = static_cast<size_t>(sizeVal.toNumber());
        setObj->setProperty("[[SetSize]]", Value(static_cast<double>(size + 1)));
    }

    // Return the Set for chaining
    return ctx.thisValue;
}

Value Set::has(const CallContext& ctx, const std::vector<Value>& args) {
    if(!ctx.thisValue.isObject()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Set.prototype.has called on non-object"));
    }

    auto* setObj = ctx.thisValue.getObject();
    Value value = args.empty() ? Value::undefined() : args[0];

    Value keysVal = setObj->getProperty("[[SetKeys]]");
    if(!keysVal.isObject()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Set.prototype.has called on incompatible receiver"));
    }
    auto* keysObj = keysVal.getObject();

    std::string key = valueToSetKey(value);
    return Value(keysObj->hasOwnProperty(key));
}

Value Set::deleteMethod(const CallContext& ctx, const std::vector<Value>& args) {
    if(!ctx.thisValue.isObject()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Set.prototype.delete called on non-object"));
    }

    auto* setObj = ctx.thisValue.getObject();
    Value value = args.empty() ? Value::undefined() : args[0];

    Value keysVal = setObj->getProperty("[[SetKeys]]");
    if(!keysVal.isObject()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Set.prototype.delete called on incompatible receiver"));
    }
    auto* keysObj = keysVal.getObject();

    std::string key = valueToSetKey(value);

    if(!keysObj->hasOwnProperty(key)) {
        return Value(false);
    }

    // Get index of this element
    Value indexVal = keysObj->getProperty(key);
    size_t index = static_cast<size_t>(indexVal.toNumber());

    // Mark entry as deleted
    Value entriesVal = setObj->getProperty("[[SetEntries]]");
    auto* entriesObj = entriesVal.getObject();
    entriesObj->setProperty(std::to_string(index), Value("[[Deleted]]"));

    // Remove from keys lookup
    keysObj->deleteProperty(key);

    // Decrement size
    Value sizeVal = setObj->getProperty("[[SetSize]]");
    size_t size = static_cast<size_t>(sizeVal.toNumber());
    setObj->setProperty("[[SetSize]]", Value(static_cast<double>(size - 1)));

    return Value(true);
}

Value Set::clear(const CallContext& ctx, const std::vector<Value>& args) {
    if(!ctx.thisValue.isObject()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Set.prototype.clear called on non-object"));
    }

    auto* setObj = ctx.thisValue.getObject();
    auto* factory = getObjectFactory();

    // Create fresh internal structures
    auto* newEntries = factory->createJSObject();
    auto* newKeys = factory->createJSObject();

    setObj->setProperty("[[SetEntries]]", Value(newEntries));
    setObj->setProperty("[[SetKeys]]", Value(newKeys));
    setObj->setProperty("[[SetSize]]", Value(0.0));
    setObj->setProperty("[[SetNextIndex]]", Value(0.0));

    return Value::undefined();
}

Value Set::forEach(const CallContext& ctx, const std::vector<Value>& args) {
    if(!ctx.thisValue.isObject()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Set.prototype.forEach called on non-object"));
    }

    auto* setObj = ctx.thisValue.getObject();

    if(args.empty() || !args[0].isFunction()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Set.prototype.forEach callback must be a function"));
    }

    auto* callback = dynamic_cast<JSFunction*>(args[0].getObject());
    if(!callback) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Set.prototype.forEach callback must be a function"));
    }

    Value thisArg = args.size() > 1 ? args[1] : Value::undefined();

    Value entriesVal = setObj->getProperty("[[SetEntries]]");
    if(!entriesVal.isObject()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Set.prototype.forEach called on incompatible receiver"));
    }
    auto* entries = entriesVal.getObject();

    Value nextIndexVal = setObj->getProperty("[[SetNextIndex]]");
    size_t nextIndex = static_cast<size_t>(nextIndexVal.toNumber());

    for(size_t i = 0; i < nextIndex; ++i) {
        Value entry = entries->getProperty(std::to_string(i));

        // Skip deleted entries
        if(entry.isString() && entry.getString() == "[[Deleted]]") {
            continue;
        }

        // Call callback(value, value, set)
        std::vector<Value> callArgs = {entry, entry, ctx.thisValue};
        rift::core::CallContext cbCtx(rift::core::CallType::Function, thisArg);
        callback->call(cbCtx, callArgs);
    }

    return Value::undefined();
}

Value Set::sizeGetter(const CallContext& ctx, const std::vector<Value>& args) {
    if(!ctx.thisValue.isObject()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Set.prototype.size called on non-object"));
    }

    auto* setObj = ctx.thisValue.getObject();
    Value sizeVal = setObj->getProperty("[[SetSize]]");

    if(!sizeVal.isNumber()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Set.prototype.size called on incompatible receiver"));
    }

    return sizeVal;
}

Value Set::values(const CallContext& ctx, const std::vector<Value>& args) {
    if(!ctx.thisValue.isObject()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Set.prototype.values called on non-object"));
    }

    auto* setObj = ctx.thisValue.getObject();
    return Value(SetIterator::create(getObjectFactory(), setObj, SetIterationKind::Value));
}

Value Set::keys(const CallContext& ctx, const std::vector<Value>& args) {
    // Per ECMAScript spec, Set.prototype.keys === Set.prototype.values
    return values(ctx, args);
}

Value Set::entries(const CallContext& ctx, const std::vector<Value>& args) {
    if(!ctx.thisValue.isObject()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Set.prototype.entries called on non-object"));
    }

    auto* setObj = ctx.thisValue.getObject();
    return Value(SetIterator::create(getObjectFactory(), setObj, SetIterationKind::KeyValue));
}

}  // namespace rift::builtins
