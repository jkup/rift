#include "rift/builtins/symbol/symbol.h"

#include "rift/builtins/builtin_manager.h"
#include "rift/interpreter/javascript_exception.h"

// ============================================================================
// ECMA-262 — Symbol Objects
// @spec https://tc39.es/ecma262/#sec-symbol-objects
// ============================================================================

namespace rift::builtins {

using rift::core::CallContext;
using rift::core::JavaScriptException;

// Static member initialization
// The next_symbol_id_ counter provides unique symbol IDs. Each call to
// generateSymbolId() returns a new value, satisfying the spec requirement that
// every Symbol value is "unique and immutable" (6.1.5.1).
std::atomic<uint64_t> Symbol::next_symbol_id_{1};  // Start at 1, 0 reserved for uninitialized

// The GlobalSymbolRegistry is a globally available List used by Symbol.for()
// and Symbol.keyFor(). Each record has [[Key]] (a String) and [[Symbol]] fields.
// @spec https://tc39.es/ecma262/#sec-symbol.for
// DEVIATION: Spec uses a List of { [[Key]], [[Symbol]] } Records. We use two
// maps (key->id and id->key) for O(1) lookup in both directions.
std::unordered_map<std::string, uint64_t> Symbol::global_registry_;
std::unordered_map<uint64_t, std::string> Symbol::reverse_registry_;

// Well-known symbol IDs - will be initialized on first access
// @spec https://tc39.es/ecma262/#sec-well-known-symbols
// Table 1: Well-Known Symbols — these are built-in Symbol values referenced
// by name throughout the specification (e.g., @@iterator, @@toStringTag).
uint64_t Symbol::iterator_id_ = 0;
uint64_t Symbol::to_string_tag_id_ = 0;
uint64_t Symbol::has_instance_id_ = 0;
uint64_t Symbol::to_primitive_id_ = 0;
uint64_t Symbol::unscopables_id_ = 0;
uint64_t Symbol::is_concat_spreadable_id_ = 0;
uint64_t Symbol::async_iterator_id_ = 0;

// Internal helper: generates a new unique symbol ID.
// This implements the spec's requirement that each Symbol value is
// "unique and immutable" (6.1.5.1 The Symbol Type).
uint64_t Symbol::generateSymbolId() {
    return next_symbol_id_.fetch_add(1, std::memory_order_relaxed);
}

// ----------------------------------------------------------------------------
// 20.4.1.1 Symbol ( description )
// @spec https://tc39.es/ecma262/#sec-symbol-description
// Called as a function, not as a constructor. Creates a new Symbol value.
// ----------------------------------------------------------------------------
Value Symbol::constructor(const CallContext& ctx, const std::vector<Value>& args) {
    // 1. If NewTarget is not undefined, throw a TypeError exception.
    if(ctx.isConstructorCall()) {
        throw JavaScriptException(Value("TypeError: Symbol is not a constructor"));
    }

    // 2. If description is undefined, let descString be undefined.
    // 3. Else, let descString be ? ToString(description).
    std::string description;
    if(!args.empty() && !args[0].isUndefined()) {
        description = args[0].toString();
    }
    // SIMPLIFIED: Spec distinguishes between descString=undefined and descString="".
    // We use an empty string for both cases. This affects Symbol().description
    // which should return undefined for no-arg calls, but returns undefined only
    // because descriptionGetter checks for empty string.

    // 4. Return a new unique Symbol value whose [[Description]] value is descString.
    uint64_t id = generateSymbolId();
    return Value::symbol(id, description);
}

// ----------------------------------------------------------------------------
// 20.4.2.2 Symbol.for ( key )
// @spec https://tc39.es/ecma262/#sec-symbol.for
// Searches the GlobalSymbolRegistry for an existing symbol with the given key.
// If found, returns it. Otherwise creates a new symbol, adds it, and returns it.
// ----------------------------------------------------------------------------
Value Symbol::symbolFor(const CallContext& ctx, const std::vector<Value>& args) {
    // 1. Let stringKey be ? ToString(key).
    std::string key;
    if(args.empty() || args[0].isUndefined()) {
        key = "undefined";
    } else {
        key = args[0].toString();
    }

    // 2. For each element e of the GlobalSymbolRegistry List, do
    //    a. If SameValue(e.[[Key]], stringKey) is true, return e.[[Symbol]].
    auto it = global_registry_.find(key);
    if(it != global_registry_.end()) {
        return Value::symbol(it->second, key);
    }

    // 3. Assert: GlobalSymbolRegistry does not currently contain an entry for stringKey.
    // 4. Let newSymbol be a new unique Symbol value whose [[Description]] value is stringKey.
    uint64_t id = generateSymbolId();
    // 5. Append the Record { [[Key]]: stringKey, [[Symbol]]: newSymbol } to the
    //    GlobalSymbolRegistry List.
    global_registry_[key] = id;
    reverse_registry_[id] = key;

    // 6. Return newSymbol.
    return Value::symbol(id, key);
}

// ----------------------------------------------------------------------------
// 20.4.2.6 Symbol.keyFor ( sym )
// @spec https://tc39.es/ecma262/#sec-symbol.keyfor
// Returns the key string from the GlobalSymbolRegistry for the given symbol,
// or undefined if the symbol is not in the registry.
// ----------------------------------------------------------------------------
Value Symbol::keyFor(const CallContext& ctx, const std::vector<Value>& args) {
    // 1. If sym is not a Symbol, throw a TypeError exception.
    if(args.empty() || !args[0].isSymbol()) {
        throw JavaScriptException(Value("TypeError: Symbol.keyFor requires a symbol argument"));
    }

    uint64_t id = args[0].getSymbol().id;

    // 2. Return KeyForSymbol(sym).
    // (Inlined: 20.4.5.1 KeyForSymbol searches GlobalSymbolRegistry for matching symbol)
    // 2a. For each element e of the GlobalSymbolRegistry List, do
    //     i. If SameValue(e.[[Symbol]], sym) is true, return e.[[Key]].
    auto it = reverse_registry_.find(id);
    if(it != reverse_registry_.end()) {
        return Value(it->second);
    }

    // 2b. Assert: GlobalSymbolRegistry does not currently contain an entry for sym.
    // 2c. Return undefined.
    return Value::undefined();
}

// ----------------------------------------------------------------------------
// 20.4.3.3 Symbol.prototype.toString ( )
// @spec https://tc39.es/ecma262/#sec-symbol.prototype.tostring
// Returns a descriptive string like "Symbol(description)".
// ----------------------------------------------------------------------------
Value Symbol::toString(const CallContext& ctx, const std::vector<Value>& args) {
    // 1. Let sym be ? ThisSymbolValue(this value).
    // INCOMPLETE: Spec's ThisSymbolValue also accepts Symbol wrapper objects
    // (Object(sym)). We only accept primitive symbol values.
    if(!ctx.thisValue.isSymbol()) {
        throw JavaScriptException(
            Value("TypeError: Symbol.prototype.toString requires that 'this' be a Symbol"));
    }

    // 2. Return SymbolDescriptiveString(sym).
    // (Inlined: 20.4.3.3.1 SymbolDescriptiveString ( sym ))
    //   1. Let desc be sym's [[Description]] value.
    //   2. If desc is undefined, set desc to the empty String.
    //   3. Assert: desc is a String.
    //   4. Return the string-concatenation of "Symbol(", desc, and ")".
    const SymbolData& sym = ctx.thisValue.getSymbol();
    return Value("Symbol(" + sym.description + ")");
}

// ----------------------------------------------------------------------------
// 20.4.3.4 Symbol.prototype.valueOf ( )
// @spec https://tc39.es/ecma262/#sec-symbol.prototype.valueof
// Returns the primitive Symbol value.
// ----------------------------------------------------------------------------
Value Symbol::valueOf(const CallContext& ctx, const std::vector<Value>& args) {
    // 1. Return ? ThisSymbolValue(this value).
    // INCOMPLETE: Spec's ThisSymbolValue (20.4.3.4.1) also accepts Symbol
    // wrapper objects (Object(sym)). We only accept primitive symbol values.
    if(!ctx.thisValue.isSymbol()) {
        throw JavaScriptException(
            Value("TypeError: Symbol.prototype.valueOf requires that 'this' be a Symbol"));
    }

    return ctx.thisValue;
}

// ----------------------------------------------------------------------------
// 20.4.3.2 get Symbol.prototype.description
// @spec https://tc39.es/ecma262/#sec-symbol.prototype.description
// Accessor property that returns the [[Description]] of the symbol, or
// undefined if none was provided.
// ----------------------------------------------------------------------------
Value Symbol::descriptionGetter(const CallContext& ctx, const std::vector<Value>& args) {
    // 1. Let s be the this value.
    // 2. Let sym be ? ThisSymbolValue(s).
    // INCOMPLETE: Spec's ThisSymbolValue also accepts Symbol wrapper objects
    // (Object(sym)). We only accept primitive symbol values.
    if(!ctx.thisValue.isSymbol()) {
        throw JavaScriptException(
            Value("TypeError: Symbol.prototype.description requires that 'this' be a Symbol"));
    }

    // 3. Return sym.[[Description]].
    const SymbolData& sym = ctx.thisValue.getSymbol();
    if(sym.description.empty()) {
        return Value::undefined();
    }
    return Value(sym.description);
}

// ============================================================================
// Well-known symbol accessors - lazily initialize on first access
// @spec https://tc39.es/ecma262/#sec-well-known-symbols
// Table 1 in the spec defines these well-known symbols. Each is a built-in
// Symbol value, referred to by specification name (e.g., @@iterator).
// DEVIATION: The spec creates well-known symbols at realm creation time.
// We lazily initialize them on first access.
// ============================================================================

// 20.4.2.5 Symbol.iterator
// @spec https://tc39.es/ecma262/#sec-symbol.iterator
// A method that returns the default Iterator for an object. Called by
// the semantics of the for-of statement.
Value Symbol::getIterator() {
    if(iterator_id_ == 0) {
        iterator_id_ = generateSymbolId();
    }
    return Value::symbol(iterator_id_, "Symbol.iterator");
}

// 20.4.2.15 Symbol.toStringTag
// @spec https://tc39.es/ecma262/#sec-symbol.tostringtag
// A String-valued property used in the creation of the default string
// description of an object. Accessed by Object.prototype.toString.
Value Symbol::getToStringTag() {
    if(to_string_tag_id_ == 0) {
        to_string_tag_id_ = generateSymbolId();
    }
    return Value::symbol(to_string_tag_id_, "Symbol.toStringTag");
}

// 20.4.2.3 Symbol.hasInstance
// @spec https://tc39.es/ecma262/#sec-symbol.hasinstance
// A method that determines if a constructor object recognizes an object as
// one of the constructor's instances. Called by the semantics of instanceof.
Value Symbol::getHasInstance() {
    if(has_instance_id_ == 0) {
        has_instance_id_ = generateSymbolId();
    }
    return Value::symbol(has_instance_id_, "Symbol.hasInstance");
}

// 20.4.2.14 Symbol.toPrimitive
// @spec https://tc39.es/ecma262/#sec-symbol.toprimitive
// A method that converts an object to a corresponding primitive value.
// Called by the ToPrimitive abstract operation.
Value Symbol::getToPrimitive() {
    if(to_primitive_id_ == 0) {
        to_primitive_id_ = generateSymbolId();
    }
    return Value::symbol(to_primitive_id_, "Symbol.toPrimitive");
}

// 20.4.2.16 Symbol.unscopables
// @spec https://tc39.es/ecma262/#sec-symbol.unscopables
// An object-valued property whose own and inherited property names are
// property names excluded from 'with' environment bindings.
Value Symbol::getUnscopables() {
    if(unscopables_id_ == 0) {
        unscopables_id_ = generateSymbolId();
    }
    return Value::symbol(unscopables_id_, "Symbol.unscopables");
}

// 20.4.2.4 Symbol.isConcatSpreadable
// @spec https://tc39.es/ecma262/#sec-symbol.isconcatspreadable
// A Boolean-valued property that if true indicates that an object should
// be flattened to its array elements by Array.prototype.concat.
Value Symbol::getIsConcatSpreadable() {
    if(is_concat_spreadable_id_ == 0) {
        is_concat_spreadable_id_ = generateSymbolId();
    }
    return Value::symbol(is_concat_spreadable_id_, "Symbol.isConcatSpreadable");
}

// Internal helper: returns the raw ID for @@iterator.
// Used by the engine for iterator protocol checks.
uint64_t Symbol::getIteratorId() {
    if(iterator_id_ == 0) {
        iterator_id_ = generateSymbolId();
    }
    return iterator_id_;
}

// Internal helper: returns the raw ID for @@toStringTag.
// Used by Object.prototype.toString to determine the type tag.
uint64_t Symbol::getToStringTagId() {
    if(to_string_tag_id_ == 0) {
        to_string_tag_id_ = generateSymbolId();
    }
    return to_string_tag_id_;
}

// 20.4.2.1 Symbol.asyncIterator
// @spec https://tc39.es/ecma262/#sec-symbol.asynciterator
// A method that returns the default AsyncIterator for an object.
// Called by the semantics of the for-await-of statement.
Value Symbol::getAsyncIterator() {
    if(async_iterator_id_ == 0) {
        async_iterator_id_ = generateSymbolId();
    }
    return Value::symbol(async_iterator_id_, "Symbol.asyncIterator");
}

// Internal helper: returns the raw ID for @@asyncIterator.
// Used by the engine for async iterator protocol checks.
uint64_t Symbol::getAsyncIteratorId() {
    if(async_iterator_id_ == 0) {
        async_iterator_id_ = generateSymbolId();
    }
    return async_iterator_id_;
}

// Internal helper: returns the raw ID for @@toPrimitive.
// Used by Date.prototype[@@toPrimitive] registration.
uint64_t Symbol::getToPrimitiveId() {
    if(to_primitive_id_ == 0) {
        to_primitive_id_ = generateSymbolId();
    }
    return to_primitive_id_;
}

// ----------------------------------------------------------------------------
// 20.4.2 Properties of the Symbol Constructor
// @spec https://tc39.es/ecma262/#sec-properties-of-the-symbol-constructor
// Sets up static methods (Symbol.for, Symbol.keyFor) and well-known symbol
// properties on the Symbol constructor object.
// ----------------------------------------------------------------------------
void Symbol::setupStaticMethods(JSObject* constructor, rift::memory::ObjectFactory* factory) {
    // 20.4.2.2 Symbol.for ( key )
    RIFT_STATIC_METHOD(constructor, "for", Symbol::symbolFor);
    // 20.4.2.6 Symbol.keyFor ( sym )
    RIFT_STATIC_METHOD(constructor, "keyFor", Symbol::keyFor);

    // Well-known symbols as non-enumerable, non-writable, non-configurable properties.
    // Spec: each well-known symbol property has attributes { [[Writable]]: false,
    // [[Enumerable]]: false, [[Configurable]]: false }.

    // 20.4.2.5 Symbol.iterator
    PropertyDescriptor iteratorDesc(getIterator(), false, false, false);
    constructor->defineProperty("iterator", iteratorDesc);

    // 20.4.2.15 Symbol.toStringTag
    PropertyDescriptor toStringTagDesc(getToStringTag(), false, false, false);
    constructor->defineProperty("toStringTag", toStringTagDesc);

    // 20.4.2.3 Symbol.hasInstance
    PropertyDescriptor hasInstanceDesc(getHasInstance(), false, false, false);
    constructor->defineProperty("hasInstance", hasInstanceDesc);

    // 20.4.2.14 Symbol.toPrimitive
    PropertyDescriptor toPrimitiveDesc(getToPrimitive(), false, false, false);
    constructor->defineProperty("toPrimitive", toPrimitiveDesc);

    // 20.4.2.16 Symbol.unscopables
    PropertyDescriptor unscopablesDesc(getUnscopables(), false, false, false);
    constructor->defineProperty("unscopables", unscopablesDesc);

    // 20.4.2.4 Symbol.isConcatSpreadable
    PropertyDescriptor isConcatSpreadableDesc(getIsConcatSpreadable(), false, false, false);
    constructor->defineProperty("isConcatSpreadable", isConcatSpreadableDesc);

    // 20.4.2.1 Symbol.asyncIterator
    PropertyDescriptor asyncIteratorDesc(getAsyncIterator(), false, false, false);
    constructor->defineProperty("asyncIterator", asyncIteratorDesc);

    // INCOMPLETE: Missing well-known symbol properties:
    // 20.4.2.7  Symbol.match
    // 20.4.2.8  Symbol.matchAll
    // 20.4.2.10 Symbol.replace
    // 20.4.2.11 Symbol.search
    // 20.4.2.12 Symbol.species
    // 20.4.2.13 Symbol.split
}

// ----------------------------------------------------------------------------
// 20.4.3 Properties of the Symbol Prototype Object
// @spec https://tc39.es/ecma262/#sec-properties-of-the-symbol-prototype-object
// Sets up prototype methods: toString, valueOf, and the description getter.
// ----------------------------------------------------------------------------
void Symbol::setupPrototypeMethods(JSObject* prototype, rift::memory::ObjectFactory* factory) {
    // 20.4.3.3 Symbol.prototype.toString ( )
    RIFT_METHOD(prototype, "toString", Symbol::toString);
    // 20.4.3.4 Symbol.prototype.valueOf ( )
    RIFT_METHOD(prototype, "valueOf", Symbol::valueOf);
    // 20.4.3.2 get Symbol.prototype.description
    // DEVIATION: Spec defines this as an accessor property (getter with no setter).
    // We register it as a regular method, which means `sym.description` works but
    // is technically a function property rather than a getter accessor.
    RIFT_METHOD(prototype, "description", Symbol::descriptionGetter);

    // INCOMPLETE: Missing prototype properties:
    // 20.4.3.5 Symbol.prototype [ @@toPrimitive ] ( hint )
    // 20.4.3.6 Symbol.prototype [ @@toStringTag ] — value: "Symbol"
}

// Returns the %Symbol.prototype% intrinsic object.
JSObject* Symbol::getGlobalPrototype() {
    return rift::core::BuiltinManager::getSymbolPrototype();
}

}  // namespace rift::builtins
