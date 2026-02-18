#include "rift/builtins/map/map_iterator.h"

#include <string>

#include "rift/builtins/symbol/symbol.h"
#include "rift/interpreter/evaluation_utils.h"
#include "rift/interpreter/javascript_exception.h"
#include "rift/memory/gc_protector.h"
#include "rift/types/object.h"

namespace rift::builtins {

JSObject* MapIterator::prototype_ = nullptr;
rift::memory::ObjectFactory* MapIterator::factory_ = nullptr;

void MapIterator::setupPrototype(rift::memory::ObjectFactory* factory,
                                 JSObject* iterator_prototype) {
    factory_ = factory;
    prototype_ = factory->createJSObject(iterator_prototype);
    rift::memory::GCProtector protect(prototype_, factory->getObjectManager());

    // Add next method
    auto* nextFunc = factory->createJSFunction(MapIterator::next);
    prototype_->setProperty("next", Value(nextFunc));

    // Add Symbol.toStringTag
    std::string toStringTagKey =
        rift::core::EvaluationUtils::symbolToPropertyKey(Symbol::getToStringTagId());
    prototype_->setProperty(toStringTagKey, Value("Map Iterator"));
}

JSObject* MapIterator::create(rift::memory::ObjectFactory* factory, JSObject* map,
                              MapIterationKind kind) {
    auto* iterator = factory->createJSObject(prototype_);
    rift::memory::GCProtector protect(iterator, factory->getObjectManager());

    // Set internal slots
    iterator->setProperty("[[IteratedMap]]", Value(map));
    iterator->setProperty("[[MapNextIndex]]", Value(0.0));
    iterator->setProperty("[[MapIterationKind]]", Value(static_cast<double>(kind)));

    return iterator;
}

/**
 * MapIterator.prototype.next()
 * Returns {done: boolean, value: any} per iterator protocol.
 */
Value MapIterator::next(const CallContext& ctx, const std::vector<Value>& /*args*/) {
    if(ctx.thisValue.getType() != ValueType::Object) {
        throw rift::core::JavaScriptException(
            Value("TypeError: MapIterator.prototype.next called on non-object"));
    }

    auto* iterator = ctx.thisValue.getObject();

    // Get internal slots
    Value mapVal = iterator->getProperty("[[IteratedMap]]");
    Value indexVal = iterator->getProperty("[[MapNextIndex]]");
    Value kindVal = iterator->getProperty("[[MapIterationKind]]");

    // Check if iterator is exhausted
    if(mapVal.isUndefined()) {
        // Create done result
        auto* result = factory_->createJSObject();
        result->setProperty("done", Value(true));
        result->setProperty("value", Value());
        return Value(result);
    }

    auto* map = mapVal.getObject();
    int current_index = static_cast<int>(indexVal.toNumber());
    auto kind = static_cast<MapIterationKind>(static_cast<int>(kindVal.toNumber()));

    // Get map's entries and next index
    Value entriesVal = map->getProperty("[[MapEntries]]");
    Value map_next_index_val = map->getProperty("[[MapNextIndex]]");

    if(entriesVal.isUndefined() || entriesVal.getType() != ValueType::Object) {
        throw rift::core::JavaScriptException(Value("TypeError: Map internal slots corrupted"));
    }

    auto* entries = entriesVal.getObject();
    int map_next_index = static_cast<int>(map_next_index_val.toNumber());

    // Find next non-deleted entry
    while(current_index < map_next_index) {
        Value entryVal = entries->getProperty(std::to_string(current_index));
        current_index++;

        // Skip deleted entries
        if(entryVal.getType() == ValueType::String && entryVal.getString() == "[[Deleted]]") {
            continue;
        }

        if(entryVal.getType() != ValueType::Object) {
            continue;
        }

        auto* entry = entryVal.getObject();
        Value key = entry->getProperty("key");
        Value value = entry->getProperty("value");

        // Update iterator index
        iterator->setProperty("[[MapNextIndex]]", Value(static_cast<double>(current_index)));

        // Create result based on iteration kind
        auto* result = factory_->createJSObject();
        result->setProperty("done", Value(false));

        switch(kind) {
            case MapIterationKind::Key:
                result->setProperty("value", key);
                break;

            case MapIterationKind::Value:
                result->setProperty("value", value);
                break;

            case MapIterationKind::KeyValue: {
                // Return [key, value] array
                auto* pair = factory_->createJSObject();
                pair->setProperty("0", key);
                pair->setProperty("1", value);
                pair->setProperty("length", Value(2.0));
                result->setProperty("value", Value(pair));
                break;
            }
        }

        return Value(result);
    }

    // No more entries - mark iterator as exhausted
    iterator->setProperty("[[IteratedMap]]", Value());
    iterator->setProperty("[[MapNextIndex]]", Value(0.0));

    auto* result = factory_->createJSObject();
    result->setProperty("done", Value(true));
    result->setProperty("value", Value());
    return Value(result);
}

JSObject* MapIterator::getPrototype() {
    return prototype_;
}

void MapIterator::setObjectFactory(rift::memory::ObjectFactory* factory) {
    factory_ = factory;
}

}  // namespace rift::builtins
