#pragma once

#include <vector>

#include "../../memory/object_factory.h"
#include "../builtin_base.h"
#include "rift/types/object.h"
#include "rift/types/value.h"

namespace rift::builtins {

using namespace rift::runtime;

/// 20.5.7 AggregateError Objects
/// @spec https://tc39.es/ecma262/#sec-aggregate-error-objects
class AggregateError : public BuiltinBase<AggregateError> {
  public:
    static constexpr const char* builtinName = "AggregateError";
    static constexpr int builtinLength = 2;

    /// NON-STANDARD: BuiltinBase setup hooks for constructor and prototype registration.
    static void setupStaticMethods(JSObject* constructor, rift::memory::ObjectFactory* factory);
    static void setupPrototypeMethods(JSObject* prototype, rift::memory::ObjectFactory* factory);

    /// 20.5.7.1 AggregateError ( errors, message [ , options ] )
    /// @spec https://tc39.es/ecma262/#sec-aggregate-error
    static Value constructor(const std::vector<Value>& args);

    /// 20.5.3.4 Error.prototype.toString ( )
    /// @spec https://tc39.es/ecma262/#sec-error.prototype.tostring
    static Value toString(const std::vector<Value>& args);

    /// NON-STANDARD: Helper to create an AggregateError object from C++ code.
    /// Used by Promise.any to create proper AggregateError rejections.
    static Value createError(const Value& errorsArray, const std::string& message);

  private:
    /// NON-STANDARD: Internal helper to extract the this-object from args.
    static JSObject* getThisErrorObject(const std::vector<Value>& args);
    /// NON-STANDARD: Internal helper to retrieve the AggregateError prototype from BuiltinManager.
    static JSObject* getGlobalPrototype();
};

}  // namespace rift::builtins
