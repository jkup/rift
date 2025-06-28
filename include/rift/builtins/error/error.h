#pragma once

#include <vector>
#include "../../runtime/values/value.h"
#include "../../runtime/values/object.h"
#include "../../memory/object_factory.h"

namespace rift::builtins {

using namespace rift::runtime;

/// The `Error` builtin object and constructor.
///
/// The Error object represents an error when trying to execute a statement or accessing a property.
/// User-defined exceptions can also use the Error constructor.
///
/// More information:
///  - [ECMAScript reference][spec]
///  - [MDN documentation][mdn]
///
/// [spec]: https://tc39.es/ecma262/#sec-error-objects
/// [mdn]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error
class Error {
   public:
    /// Static factory method
    static void setObjectFactory(rift::memory::ObjectFactory* factory);

    /// Create Error constructor function - now returns raw pointer
    static JSObject* create(rift::memory::ObjectFactory* factory);

    /// Create Error.prototype - now returns raw pointer
    static JSObject* createPrototype(rift::memory::ObjectFactory* factory);

    /// Error constructor
    static Value constructor(const std::vector<Value>& args);

    /// Error prototype methods
    static Value toString(const std::vector<Value>& args);

   private:
    /// Static factory storage
    static rift::memory::ObjectFactory* object_factory_;

    /// Helper methods - now work with raw pointers
    static JSObject* getThisErrorObject(const std::vector<Value>& args);
    static JSObject* getGlobalPrototype();
};

}  // namespace rift::builtins 