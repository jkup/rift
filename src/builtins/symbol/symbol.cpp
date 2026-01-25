#include "rift/builtins/symbol/symbol.h"

#include "rift/core/engine/builtin_manager.h"
#include "rift/core/engine/javascript_exception.h"

namespace rift::builtins {

using rift::core::CallContext;
using rift::core::JavaScriptException;

// Static member initialization
std::atomic<uint64_t> Symbol::next_symbol_id_{1};  // Start at 1, 0 reserved for uninitialized
std::unordered_map<std::string, uint64_t> Symbol::global_registry_;
std::unordered_map<uint64_t, std::string> Symbol::reverse_registry_;

// Well-known symbol IDs - will be initialized on first access
uint64_t Symbol::iterator_id_ = 0;
uint64_t Symbol::to_string_tag_id_ = 0;
uint64_t Symbol::has_instance_id_ = 0;
uint64_t Symbol::to_primitive_id_ = 0;
uint64_t Symbol::unscopables_id_ = 0;
uint64_t Symbol::is_concat_spreadable_id_ = 0;

uint64_t Symbol::generateSymbolId() {
    return next_symbol_id_.fetch_add(1, std::memory_order_relaxed);
}

Value Symbol::constructor(const CallContext& ctx, const std::vector<Value>& args) {
    // Symbol cannot be called with 'new'
    if(ctx.isConstructorCall()) {
        throw JavaScriptException(Value("TypeError: Symbol is not a constructor"));
    }

    // Get optional description
    std::string description;
    if(!args.empty() && !args[0].isUndefined()) {
        description = args[0].toString();
    }

    // Create new unique symbol
    uint64_t id = generateSymbolId();
    return Value::symbol(id, description);
}

Value Symbol::symbolFor(const CallContext& ctx, const std::vector<Value>& args) {
    // Get the key argument
    std::string key;
    if(args.empty() || args[0].isUndefined()) {
        key = "undefined";
    } else {
        key = args[0].toString();
    }

    // Check if symbol already exists in global registry
    auto it = global_registry_.find(key);
    if(it != global_registry_.end()) {
        return Value::symbol(it->second, key);
    }

    // Create new symbol and register it
    uint64_t id = generateSymbolId();
    global_registry_[key] = id;
    reverse_registry_[id] = key;

    return Value::symbol(id, key);
}

Value Symbol::keyFor(const CallContext& ctx, const std::vector<Value>& args) {
    // Validate argument is a symbol
    if(args.empty() || !args[0].isSymbol()) {
        throw JavaScriptException(Value("TypeError: Symbol.keyFor requires a symbol argument"));
    }

    uint64_t id = args[0].getSymbol().id;

    // Look up in reverse registry
    auto it = reverse_registry_.find(id);
    if(it != reverse_registry_.end()) {
        return Value(it->second);
    }

    // Symbol not in global registry - return undefined
    return Value::undefined();
}

Value Symbol::toString(const CallContext& ctx, const std::vector<Value>& args) {
    // Check if this is a symbol
    if(!ctx.thisValue.isSymbol()) {
        throw JavaScriptException(
            Value("TypeError: Symbol.prototype.toString requires that 'this' be a Symbol"));
    }

    const SymbolData& sym = ctx.thisValue.getSymbol();
    return Value("Symbol(" + sym.description + ")");
}

Value Symbol::valueOf(const CallContext& ctx, const std::vector<Value>& args) {
    // Check if this is a symbol
    if(!ctx.thisValue.isSymbol()) {
        throw JavaScriptException(
            Value("TypeError: Symbol.prototype.valueOf requires that 'this' be a Symbol"));
    }

    return ctx.thisValue;
}

Value Symbol::descriptionGetter(const CallContext& ctx, const std::vector<Value>& args) {
    // Check if this is a symbol
    if(!ctx.thisValue.isSymbol()) {
        throw JavaScriptException(
            Value("TypeError: Symbol.prototype.description requires that 'this' be a Symbol"));
    }

    const SymbolData& sym = ctx.thisValue.getSymbol();
    if(sym.description.empty()) {
        return Value::undefined();
    }
    return Value(sym.description);
}

// Well-known symbol accessors - lazily initialize on first access
Value Symbol::getIterator() {
    if(iterator_id_ == 0) {
        iterator_id_ = generateSymbolId();
    }
    return Value::symbol(iterator_id_, "Symbol.iterator");
}

Value Symbol::getToStringTag() {
    if(to_string_tag_id_ == 0) {
        to_string_tag_id_ = generateSymbolId();
    }
    return Value::symbol(to_string_tag_id_, "Symbol.toStringTag");
}

Value Symbol::getHasInstance() {
    if(has_instance_id_ == 0) {
        has_instance_id_ = generateSymbolId();
    }
    return Value::symbol(has_instance_id_, "Symbol.hasInstance");
}

Value Symbol::getToPrimitive() {
    if(to_primitive_id_ == 0) {
        to_primitive_id_ = generateSymbolId();
    }
    return Value::symbol(to_primitive_id_, "Symbol.toPrimitive");
}

Value Symbol::getUnscopables() {
    if(unscopables_id_ == 0) {
        unscopables_id_ = generateSymbolId();
    }
    return Value::symbol(unscopables_id_, "Symbol.unscopables");
}

Value Symbol::getIsConcatSpreadable() {
    if(is_concat_spreadable_id_ == 0) {
        is_concat_spreadable_id_ = generateSymbolId();
    }
    return Value::symbol(is_concat_spreadable_id_, "Symbol.isConcatSpreadable");
}

uint64_t Symbol::getIteratorId() {
    if(iterator_id_ == 0) {
        iterator_id_ = generateSymbolId();
    }
    return iterator_id_;
}

void Symbol::setupStaticMethods(JSObject* constructor, rift::memory::ObjectFactory* factory) {
    // Static methods
    RIFT_STATIC_METHOD(constructor, "for", Symbol::symbolFor);
    RIFT_STATIC_METHOD(constructor, "keyFor", Symbol::keyFor);

    // Well-known symbols as non-enumerable properties
    PropertyDescriptor iteratorDesc(getIterator(), false, false, false);
    constructor->defineProperty("iterator", iteratorDesc);

    PropertyDescriptor toStringTagDesc(getToStringTag(), false, false, false);
    constructor->defineProperty("toStringTag", toStringTagDesc);

    PropertyDescriptor hasInstanceDesc(getHasInstance(), false, false, false);
    constructor->defineProperty("hasInstance", hasInstanceDesc);

    PropertyDescriptor toPrimitiveDesc(getToPrimitive(), false, false, false);
    constructor->defineProperty("toPrimitive", toPrimitiveDesc);

    PropertyDescriptor unscopablesDesc(getUnscopables(), false, false, false);
    constructor->defineProperty("unscopables", unscopablesDesc);

    PropertyDescriptor isConcatSpreadableDesc(getIsConcatSpreadable(), false, false, false);
    constructor->defineProperty("isConcatSpreadable", isConcatSpreadableDesc);
}

void Symbol::setupPrototypeMethods(JSObject* prototype, rift::memory::ObjectFactory* factory) {
    RIFT_METHOD(prototype, "toString", Symbol::toString);
    RIFT_METHOD(prototype, "valueOf", Symbol::valueOf);
    // Note: description should ideally be a getter property, but we implement as method for now
    RIFT_METHOD(prototype, "description", Symbol::descriptionGetter);
}

JSObject* Symbol::getGlobalPrototype() {
    return rift::core::BuiltinManager::getSymbolPrototype();
}

}  // namespace rift::builtins
