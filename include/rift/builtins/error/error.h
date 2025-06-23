#pragma once

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
    /// Create the Error constructor object with all properties and methods.
    static std::shared_ptr<JSObject> create(rift::memory::ObjectFactory* factory);

    /// Create the Error.prototype object with all instance methods.
    static std::shared_ptr<JSObject> createPrototype(rift::memory::ObjectFactory* factory);

   private:
    // Error constructor function
    /// The `Error()` constructor creates Error objects.
    ///
    /// More information:
    ///  - [ECMAScript reference][spec]
    ///  - [MDN documentation][mdn]
    ///
    /// [spec]: https://tc39.es/ecma262/#sec-error-constructor
    /// [mdn]:
    /// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error/Error
    static Value constructor(const std::vector<Value>& args);

    // Error prototype methods

    /// The `toString()` method returns a string representing the specified Error object.
    ///
    /// More information:
    ///  - [ECMAScript reference][spec]
    ///  - [MDN documentation][mdn]
    ///
    /// [spec]: https://tc39.es/ecma262/#sec-error.prototype.tostring
    /// [mdn]:
    /// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error/toString
    static Value toString(const std::vector<Value>& args);

    // Helper methods
    /// Helper to get the Error object from the 'this' binding in prototype methods
    static std::shared_ptr<JSObject> getThisErrorObject(const std::vector<Value>& args);
    
    /// Helper to get the global Error prototype
    static std::shared_ptr<JSObject> getGlobalPrototype();
};

}  // namespace rift::builtins 