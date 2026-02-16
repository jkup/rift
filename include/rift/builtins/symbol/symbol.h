#pragma once

#include <atomic>
#include <unordered_map>
#include <vector>

#include "../../core/engine/call_context.h"
#include "../../memory/object_factory.h"
#include "../../runtime/values/object.h"
#include "../../runtime/values/value.h"
#include "../builtin_base.h"

namespace rift::builtins {

using namespace rift::runtime;
using rift::core::CallContext;

/// 20.4 Symbol Objects
/// @spec https://tc39.es/ecma262/#sec-symbol-objects
class Symbol : public BuiltinBase<Symbol> {
  public:
    /// 20.4.1.1 Symbol ( description )
    /// @spec https://tc39.es/ecma262/#sec-symbol-description
    static Value constructor(const CallContext& ctx, const std::vector<Value>& args);

    // ===== Static Methods (20.4.2 Properties of the Symbol Constructor) =====

    /// 20.4.2.2 Symbol.for ( key )
    /// @spec https://tc39.es/ecma262/#sec-symbol.for
    static Value symbolFor(const CallContext& ctx, const std::vector<Value>& args);

    /// 20.4.2.6 Symbol.keyFor ( sym )
    /// @spec https://tc39.es/ecma262/#sec-symbol.keyfor
    static Value keyFor(const CallContext& ctx, const std::vector<Value>& args);

    // ===== Prototype Methods (20.4.3 Properties of the Symbol Prototype Object) =====

    /// 20.4.3.3 Symbol.prototype.toString ( )
    /// @spec https://tc39.es/ecma262/#sec-symbol.prototype.tostring
    static Value toString(const CallContext& ctx, const std::vector<Value>& args);

    /// 20.4.3.4 Symbol.prototype.valueOf ( )
    /// @spec https://tc39.es/ecma262/#sec-symbol.prototype.valueof
    static Value valueOf(const CallContext& ctx, const std::vector<Value>& args);

    /// 20.4.3.2 get Symbol.prototype.description
    /// @spec https://tc39.es/ecma262/#sec-symbol.prototype.description
    static Value descriptionGetter(const CallContext& ctx, const std::vector<Value>& args);

    /// Setup methods required by BuiltinBase template
    static void setupStaticMethods(JSObject* constructor, rift::memory::ObjectFactory* factory);
    static void setupPrototypeMethods(JSObject* prototype, rift::memory::ObjectFactory* factory);

    /// NON-STANDARD: Generate a unique symbol ID (internal implementation detail)
    static uint64_t generateSymbolId();

    // ===== Well-Known Symbols (6.1.5.1 Well-Known Symbols) =====
    // @spec https://tc39.es/ecma262/#sec-well-known-symbols

    /// 20.4.2.5 Symbol.iterator
    /// @spec https://tc39.es/ecma262/#sec-symbol.iterator
    static Value getIterator();

    /// 20.4.2.15 Symbol.toStringTag
    /// @spec https://tc39.es/ecma262/#sec-symbol.tostringtag
    static Value getToStringTag();

    /// 20.4.2.3 Symbol.hasInstance
    /// @spec https://tc39.es/ecma262/#sec-symbol.hasinstance
    static Value getHasInstance();

    /// 20.4.2.14 Symbol.toPrimitive
    /// @spec https://tc39.es/ecma262/#sec-symbol.toprimitive
    static Value getToPrimitive();

    /// 20.4.2.16 Symbol.unscopables
    /// @spec https://tc39.es/ecma262/#sec-symbol.unscopables
    static Value getUnscopables();

    /// 20.4.2.4 Symbol.isConcatSpreadable
    /// @spec https://tc39.es/ecma262/#sec-symbol.isconcatspreadable
    static Value getIsConcatSpreadable();

    /// 20.4.2.1 Symbol.asyncIterator
    /// @spec https://tc39.es/ecma262/#sec-symbol.asynciterator
    static Value getAsyncIterator();

    /// NON-STANDARD: Internal accessors for well-known symbol IDs
    static uint64_t getIteratorId();
    static uint64_t getToStringTagId();
    static uint64_t getAsyncIteratorId();

  private:
    static JSObject* getGlobalPrototype();

    /// Atomic counter for unique symbol IDs
    static std::atomic<uint64_t> next_symbol_id_;

    /// Global symbol registry (Symbol.for / Symbol.keyFor)
    static std::unordered_map<std::string, uint64_t> global_registry_;
    static std::unordered_map<uint64_t, std::string> reverse_registry_;

    /// Well-known symbol IDs (lazily initialized)
    static uint64_t iterator_id_;
    static uint64_t to_string_tag_id_;
    static uint64_t has_instance_id_;
    static uint64_t to_primitive_id_;
    static uint64_t unscopables_id_;
    static uint64_t is_concat_spreadable_id_;
    static uint64_t async_iterator_id_;
};

}  // namespace rift::builtins
