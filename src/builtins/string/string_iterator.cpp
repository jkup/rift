#include "rift/builtins/string/string_iterator.h"

#include "rift/builtins/symbol/symbol.h"
#include "rift/interpreter/evaluation_utils.h"
#include "rift/interpreter/javascript_exception.h"
#include "rift/memory/gc_protector.h"

namespace rift::builtins {

// Static member initialization
JSObject* StringIterator::prototype_ = nullptr;
rift::memory::ObjectFactory* StringIterator::object_factory_ = nullptr;

void StringIterator::setObjectFactory(rift::memory::ObjectFactory* factory) {
    object_factory_ = factory;
}

JSObject* StringIterator::create(rift::memory::ObjectFactory* factory, const std::string& str) {
    // Create iterator object inheriting from %StringIteratorPrototype%
    auto* iterator = factory->createJSObject(prototype_);
    rift::memory::GCProtector protect(iterator, factory->getObjectManager());

    // Internal slots
    iterator->setProperty("[[IteratedString]]", Value(str));
    iterator->setProperty("[[StringIteratorNextIndex]]", Value(0.0));

    return iterator;
}

Value StringIterator::next(const CallContext& ctx, const std::vector<Value>& /* args */) {
    // Get the iterator object
    if(!ctx.thisValue.isObject()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: StringIterator.next called on non-object"));
    }

    auto* iter = ctx.thisValue.getObject();
    if(!iter) {
        throw rift::core::JavaScriptException(Value("TypeError: invalid StringIterator"));
    }

    // Get internal slots
    Value str_val = iter->getProperty("[[IteratedString]]");
    Value index_val = iter->getProperty("[[StringIteratorNextIndex]]");

    // Create result object
    auto* result = object_factory_->createJSObject();
    rift::memory::GCProtector protect_result(result, object_factory_->getObjectManager());

    // Check if iterator is exhausted
    if(str_val.isUndefined()) {
        result->setProperty("done", Value(true));
        result->setProperty("value", Value::undefined());
        return Value(result);
    }

    std::string str = str_val.getString();
    size_t position = static_cast<size_t>(index_val.toNumber());
    size_t len = str.length();

    // Check if we've reached the end
    if(position >= len) {
        // Mark as exhausted
        iter->setProperty("[[IteratedString]]", Value::undefined());
        result->setProperty("done", Value(true));
        result->setProperty("value", Value::undefined());
        return Value(result);
    }

    // Get the next code point
    // For basic ASCII, just return one character
    // TODO: Handle proper UTF-8 code points for full Unicode support
    std::string code_point(1, str[position]);

    // Advance the index
    iter->setProperty("[[StringIteratorNextIndex]]", Value(static_cast<double>(position + 1)));

    result->setProperty("done", Value(false));
    result->setProperty("value", Value(code_point));

    return Value(result);
}

void StringIterator::setupPrototype(rift::memory::ObjectFactory* factory,
                                    JSObject* iterator_prototype) {
    // Store factory for use in next()
    object_factory_ = factory;

    // Create %StringIteratorPrototype% inheriting from %IteratorPrototype%
    prototype_ = factory->createJSObject(iterator_prototype);

    // Add next() method
    auto* next_func = factory->createJSFunction(StringIterator::next);
    prototype_->setProperty("next", Value(next_func));

    // Add [Symbol.toStringTag] = "String Iterator"
    std::string tag_key =
        rift::core::EvaluationUtils::symbolToPropertyKey(Symbol::getToStringTagId());
    prototype_->setProperty(tag_key, Value("String Iterator"));
}

JSObject* StringIterator::getPrototype() {
    return prototype_;
}

}  // namespace rift::builtins
