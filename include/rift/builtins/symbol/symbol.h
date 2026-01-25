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

/// The `Symbol` builtin object and constructor.
///
/// Symbol is a primitive type for creating unique identifiers.
/// Unlike other primitives, Symbol cannot be called with 'new'.
///
/// More information:
///  - [ECMAScript reference][spec]
///  - [MDN documentation][mdn]
///
/// [spec]: https://tc39.es/ecma262/#sec-symbol-objects
/// [mdn]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol
class Symbol : public BuiltinBase<Symbol> {
  public:
    /// Symbol constructor - throws TypeError if called with 'new'
    static Value constructor(const CallContext& ctx, const std::vector<Value>& args);

    /// Static methods
    static Value symbolFor(const CallContext& ctx, const std::vector<Value>& args);
    static Value keyFor(const CallContext& ctx, const std::vector<Value>& args);

    /// Prototype methods
    static Value toString(const CallContext& ctx, const std::vector<Value>& args);
    static Value valueOf(const CallContext& ctx, const std::vector<Value>& args);
    static Value descriptionGetter(const CallContext& ctx, const std::vector<Value>& args);

    /// Setup methods required by BuiltinBase template
    static void setupStaticMethods(JSObject* constructor, rift::memory::ObjectFactory* factory);
    static void setupPrototypeMethods(JSObject* prototype, rift::memory::ObjectFactory* factory);

    /// Generate a unique symbol ID
    static uint64_t generateSymbolId();

    /// Well-known symbols accessors
    static Value getIterator();
    static Value getToStringTag();
    static Value getHasInstance();
    static Value getToPrimitive();
    static Value getUnscopables();
    static Value getIsConcatSpreadable();

    /// Get the symbol ID for a well-known symbol (for use in property access)
    static uint64_t getIteratorId();
    static uint64_t getToStringTagId();

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
};

}  // namespace rift::builtins
