#pragma once

#include <string>
#include <vector>

#include "../../core/engine/call_context.h"
#include "../../memory/object_factory.h"
#include "../../runtime/values/object.h"
#include "../../runtime/values/value.h"

namespace rift::builtins {

using namespace rift::runtime;
using rift::core::CallContext;

/// 22.1.5 String Iterator Objects
/// @spec https://tc39.es/ecma262/#sec-string-iterator-objects
class StringIterator {
  public:
    /// 22.1.5.1 CreateStringIterator ( string )
    /// @spec https://tc39.es/ecma262/#sec-createstringiterator
    static JSObject* create(rift::memory::ObjectFactory* factory, const std::string& str);

    /// 22.1.5.2.1 %StringIteratorPrototype%.next ( )
    /// @spec https://tc39.es/ecma262/#sec-%stringiteratorprototype%.next
    static Value next(const CallContext& ctx, const std::vector<Value>& args);

    /// Setup the %StringIteratorPrototype% object.
    static void setupPrototype(rift::memory::ObjectFactory* factory, JSObject* iterator_prototype);

    /// Get the %StringIteratorPrototype% object.
    static JSObject* getPrototype();

    /// Set the object factory for creating result objects in next().
    static void setObjectFactory(rift::memory::ObjectFactory* factory);

  private:
    static JSObject* prototype_;
    static rift::memory::ObjectFactory* object_factory_;
};

}  // namespace rift::builtins
