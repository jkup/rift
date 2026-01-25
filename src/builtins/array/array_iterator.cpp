#include "rift/builtins/array/array_iterator.h"

#include "rift/builtins/array/array.h"
#include "rift/builtins/symbol/symbol.h"
#include "rift/core/engine/evaluation_utils.h"
#include "rift/core/engine/javascript_exception.h"
#include "rift/memory/gc_protector.h"

namespace rift::builtins {

// Static member initialization
JSObject* ArrayIterator::prototype_ = nullptr;

JSObject* ArrayIterator::create(rift::memory::ObjectFactory* factory, JSObject* array,
                                ArrayIterationKind kind) {
    // Create iterator object inheriting from %ArrayIteratorPrototype%
    auto* iterator = factory->createJSObject(prototype_);
    rift::memory::GCProtector protect(iterator, factory->getObjectManager());

    // Internal slots (using string property names to store them)
    iterator->setProperty("[[IteratedArrayLike]]", Value(array));
    iterator->setProperty("[[ArrayLikeNextIndex]]", Value(0.0));
    iterator->setProperty("[[ArrayLikeIterationKind]]", Value(static_cast<double>(kind)));

    return iterator;
}

Value ArrayIterator::next(const CallContext& ctx, const std::vector<Value>& /* args */) {
    // Get the iterator object
    if(!ctx.thisValue.isObject()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: ArrayIterator.next called on non-object"));
    }

    auto* iter = ctx.thisValue.getObject();
    if(!iter) {
        throw rift::core::JavaScriptException(Value("TypeError: invalid ArrayIterator"));
    }

    // Get internal slots
    Value array_val = iter->getProperty("[[IteratedArrayLike]]");
    Value index_val = iter->getProperty("[[ArrayLikeNextIndex]]");
    Value kind_val = iter->getProperty("[[ArrayLikeIterationKind]]");

    // Get the factory from Array (it should have been set during initialization)
    auto* factory = Array::getObjectFactory();

    // Create result object
    auto* result = factory->createJSObject();
    rift::memory::GCProtector protect_result(result, factory->getObjectManager());

    // Check if iterator is exhausted
    if(array_val.isUndefined()) {
        result->setProperty("done", Value(true));
        result->setProperty("value", Value::undefined());
        return Value(result);
    }

    // Get array and check length
    auto* array = array_val.getObject();
    if(!array) {
        // Mark as exhausted
        iter->setProperty("[[IteratedArrayLike]]", Value::undefined());
        result->setProperty("done", Value(true));
        result->setProperty("value", Value::undefined());
        return Value(result);
    }

    size_t length = Array::getArrayLength(array);
    size_t index = static_cast<size_t>(index_val.toNumber());
    auto kind = static_cast<ArrayIterationKind>(static_cast<int>(kind_val.toNumber()));

    // Check if we've reached the end
    if(index >= length) {
        // Mark as exhausted - set [[IteratedArrayLike]] to undefined
        iter->setProperty("[[IteratedArrayLike]]", Value::undefined());
        result->setProperty("done", Value(true));
        result->setProperty("value", Value::undefined());
        return Value(result);
    }

    // Advance the index for next iteration
    iter->setProperty("[[ArrayLikeNextIndex]]", Value(static_cast<double>(index + 1)));

    // Return the appropriate value based on iteration kind
    result->setProperty("done", Value(false));

    switch(kind) {
        case ArrayIterationKind::Key:
            result->setProperty("value", Value(static_cast<double>(index)));
            break;

        case ArrayIterationKind::Value:
            result->setProperty("value", array->getProperty(std::to_string(index)));
            break;

        case ArrayIterationKind::KeyValue: {
            // Create [index, value] pair array
            std::vector<Value> entry = {Value(static_cast<double>(index)),
                                        array->getProperty(std::to_string(index))};
            auto* entry_array = Array::createArrayObject(factory, std::move(entry));
            result->setProperty("value", Value(entry_array));
            break;
        }
    }

    return Value(result);
}

void ArrayIterator::setupPrototype(rift::memory::ObjectFactory* factory,
                                   JSObject* iterator_prototype) {
    // Create %ArrayIteratorPrototype% inheriting from %IteratorPrototype%
    prototype_ = factory->createJSObject(iterator_prototype);

    // Add next() method
    auto* next_func = factory->createJSFunction(ArrayIterator::next);
    prototype_->setProperty("next", Value(next_func));

    // Add [Symbol.toStringTag] = "Array Iterator"
    std::string tag_key =
        rift::core::EvaluationUtils::symbolToPropertyKey(Symbol::getToStringTagId());
    prototype_->setProperty(tag_key, Value("Array Iterator"));
}

JSObject* ArrayIterator::getPrototype() {
    return prototype_;
}

}  // namespace rift::builtins
