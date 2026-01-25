#include "rift/builtins/iterator/iterator_prototype.h"

#include "rift/builtins/symbol/symbol.h"
#include "rift/core/engine/evaluation_utils.h"

namespace rift::builtins {

JSObject* IteratorPrototype::create(rift::memory::ObjectFactory* factory) {
    // Create the prototype object
    auto* prototype = factory->createJSObject();

    // Add [Symbol.iterator] method that returns this
    std::string iterator_key =
        rift::core::EvaluationUtils::symbolToPropertyKey(Symbol::getIteratorId());
    auto* iterator_func = factory->createJSFunction(IteratorPrototype::symbolIterator);
    prototype->setProperty(iterator_key, Value(iterator_func));

    return prototype;
}

Value IteratorPrototype::symbolIterator(const CallContext& ctx, const std::vector<Value>& args) {
    // Per ECMAScript spec: [Symbol.iterator]() { return this; }
    // This makes iterators themselves iterable
    return ctx.thisValue;
}

}  // namespace rift::builtins
