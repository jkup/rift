#pragma once

#include <vector>

#include "../../memory/object_factory.h"
#include "../builtin_base.h"
#include "rift/types/object.h"
#include "rift/types/value.h"

namespace rift::builtins {

using namespace rift::runtime;

/// 20.5.5 NativeError Object Structure — TypeError
/// @spec https://tc39.es/ecma262/#sec-native-error-types-used-in-this-standard-typeerror
class TypeError : public BuiltinBase<TypeError> {
  public:
    static constexpr const char* builtinName = "TypeError";
    static constexpr int builtinLength = 1;

    /// NON-STANDARD: BuiltinBase setup hooks for constructor and prototype registration.
    static void setupStaticMethods(JSObject* constructor, rift::memory::ObjectFactory* factory);
    static void setupPrototypeMethods(JSObject* prototype, rift::memory::ObjectFactory* factory);

    /// 20.5.5.1 NativeError ( message [ , options ] )
    /// @spec https://tc39.es/ecma262/#sec-nativeerror
    static Value constructor(const std::vector<Value>& args);

    /// 20.5.3.4 Error.prototype.toString ( )
    /// @spec https://tc39.es/ecma262/#sec-error.prototype.tostring
    static Value toString(const std::vector<Value>& args);

  private:
    /// NON-STANDARD: Internal helper to extract the this-object from args.
    static JSObject* getThisErrorObject(const std::vector<Value>& args);
    /// NON-STANDARD: Internal helper to retrieve the TypeError prototype from BuiltinManager.
    static JSObject* getGlobalPrototype();
};

}  // namespace rift::builtins
