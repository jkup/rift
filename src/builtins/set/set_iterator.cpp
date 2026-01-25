#include "rift/builtins/set/set_iterator.h"

#include "rift/builtins/set/set.h"
#include "rift/builtins/symbol/symbol.h"
#include "rift/core/engine/evaluation_utils.h"
#include "rift/core/engine/javascript_exception.h"
#include "rift/memory/gc_protector.h"

namespace rift::builtins {

// Initialize static members
JSObject* SetIterator::prototype_ = nullptr;
rift::memory::ObjectFactory* SetIterator::factory_ = nullptr;

void SetIterator::setObjectFactory(rift::memory::ObjectFactory* factory) {
    factory_ = factory;
}

void SetIterator::setupPrototype(rift::memory::ObjectFactory* factory,
                                 JSObject* iterator_prototype) {
    factory_ = factory;
    prototype_ = factory->createJSObject(iterator_prototype);

    // Register next() method
    auto* next_func = factory->createJSFunction(SetIterator::next);
    prototype_->setProperty("next", Value(next_func));

    // Set [Symbol.toStringTag] = "Set Iterator"
    std::string tag_key =
        rift::core::EvaluationUtils::symbolToPropertyKey(Symbol::getToStringTagId());
    prototype_->setProperty(tag_key, Value("Set Iterator"));
}

JSObject* SetIterator::getPrototype() {
    return prototype_;
}

JSObject* SetIterator::create(rift::memory::ObjectFactory* factory, JSObject* set,
                              SetIterationKind kind) {
    auto* iterator = factory->createJSObject(prototype_);
    rift::memory::GCProtector protect(iterator, factory->getObjectManager());

    // Store internal slots
    iterator->setProperty("[[IteratedSet]]", Value(set));
    iterator->setProperty("[[SetNextIndex]]", Value(0.0));
    iterator->setProperty("[[SetIterationKind]]", Value(static_cast<double>(kind)));

    return iterator;
}

Value SetIterator::next(const CallContext& ctx, const std::vector<Value>& args) {
    if(!ctx.thisValue.isObject()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: SetIterator.next called on non-object"));
    }

    auto* iter = ctx.thisValue.getObject();
    auto* factory = Set::getFactory();

    // Create result object
    auto* result = factory->createJSObject();
    rift::memory::GCProtector protect(result, factory->getObjectManager());

    // Get internal slots
    Value setVal = iter->getProperty("[[IteratedSet]]");

    // Check if exhausted
    if(setVal.isUndefined()) {
        result->setProperty("done", Value(true));
        result->setProperty("value", Value::undefined());
        return Value(result);
    }

    if(!setVal.isObject()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: SetIterator.next called on incompatible receiver"));
    }

    auto* setObj = setVal.getObject();

    // Get iteration state
    Value indexVal = iter->getProperty("[[SetNextIndex]]");
    size_t index = static_cast<size_t>(indexVal.toNumber());

    Value kindVal = iter->getProperty("[[SetIterationKind]]");
    auto kind = static_cast<SetIterationKind>(static_cast<int>(kindVal.toNumber()));

    // Get Set's entries and max index
    Value entriesVal = setObj->getProperty("[[SetEntries]]");
    if(!entriesVal.isObject()) {
        // Set has been invalidated somehow
        iter->setProperty("[[IteratedSet]]", Value::undefined());
        result->setProperty("done", Value(true));
        result->setProperty("value", Value::undefined());
        return Value(result);
    }
    auto* entries = entriesVal.getObject();

    Value nextIndexVal = setObj->getProperty("[[SetNextIndex]]");
    size_t maxIndex = static_cast<size_t>(nextIndexVal.toNumber());

    // Skip deleted entries and find next valid entry
    while(index < maxIndex) {
        Value entry = entries->getProperty(std::to_string(index));

        // Check if this entry is deleted
        bool isDeleted = entry.isString() && entry.getString() == "[[Deleted]]";

        if(!isDeleted) {
            // Found valid entry - advance index for next call
            iter->setProperty("[[SetNextIndex]]", Value(static_cast<double>(index + 1)));

            result->setProperty("done", Value(false));

            if(kind == SetIterationKind::KeyValue) {
                // Return [value, value] pair for entries()
                auto* pair = factory->createJSObject();
                pair->setProperty("0", entry);
                pair->setProperty("1", entry);
                pair->setProperty("length", Value(2.0));
                result->setProperty("value", Value(pair));
            } else {
                // Return just the value for values()/keys()
                result->setProperty("value", entry);
            }

            return Value(result);
        }

        ++index;
    }

    // Exhausted - mark iterator as done
    iter->setProperty("[[IteratedSet]]", Value::undefined());
    result->setProperty("done", Value(true));
    result->setProperty("value", Value::undefined());

    return Value(result);
}

}  // namespace rift::builtins
