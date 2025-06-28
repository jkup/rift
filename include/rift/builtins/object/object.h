#pragma once

#include <vector>

#include "../../runtime/values/object.h"
#include "../../runtime/values/value.h"
#include "../../memory/object_factory.h"

namespace rift::builtins {

using namespace rift::runtime;

/// The `Object` builtin object and constructor.
///
/// The Object constructor creates an object wrapper for the given value.
/// It provides static methods for working with objects and serves as the base for all objects.
///
/// More information:
///  - [ECMAScript reference][spec]
///  - [MDN documentation][mdn]
///
/// [spec]: https://tc39.es/ecma262/#sec-object-objects
/// [mdn]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object
class Object {
   public:
    /// Static factory method
    static void setObjectFactory(rift::memory::ObjectFactory* factory);

    /// Create Object constructor function - now returns raw pointer
    static JSObject* create(rift::memory::ObjectFactory* factory);

    /// Create Object.prototype - now returns raw pointer
    static JSObject* createPrototype(rift::memory::ObjectFactory* factory);

   private:
    /// Static factory storage
    static rift::memory::ObjectFactory* object_factory_;

    /// Object constructor
    /// The `Object()` constructor creates Object objects.
    ///
    /// More information:
    ///  - [ECMAScript reference][spec]
    ///  - [MDN documentation][mdn]
    ///
    /// [spec]: https://tc39.es/ecma262/#sec-object-constructor
    /// [mdn]:
    /// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/Object
    static Value constructor(const std::vector<Value>& args);

    /// Object static methods

    /// The `Object.keys()` static method returns an array of a given object's own enumerable
    /// string-keyed property names.
    ///
    /// More information:
    ///  - [ECMAScript reference][spec]
    ///  - [MDN documentation][mdn]
    ///
    /// [spec]: https://tc39.es/ecma262/#sec-object.keys
    /// [mdn]:
    /// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/keys
    static Value keys(const std::vector<Value>& args);

    /// The `Object.values()` static method returns an array of a given object's own enumerable
    /// string-keyed property values.
    ///
    /// More information:
    ///  - [ECMAScript reference][spec]
    ///  - [MDN documentation][mdn]
    ///
    /// [spec]: https://tc39.es/ecma262/#sec-object.values
    /// [mdn]:
    /// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/values
    static Value values(const std::vector<Value>& args);

    /// The `Object.entries()` static method returns an array of a given object's own enumerable
    /// string-keyed property names and values.
    ///
    /// More information:
    ///  - [ECMAScript reference][spec]
    ///  - [MDN documentation][mdn]
    ///
    /// [spec]: https://tc39.es/ecma262/#sec-object.entries
    /// [mdn]:
    /// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/entries
    static Value entries(const std::vector<Value>& args);

    /// Object prototype methods

    /// The `toString()` method returns a string representing the object.
    ///
    /// More information:
    ///  - [ECMAScript reference][spec]
    ///  - [MDN documentation][mdn]
    ///
    /// [spec]: https://tc39.es/ecma262/#sec-object.prototype.tostring
    /// [mdn]:
    /// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/toString
    static Value toString(const std::vector<Value>& args);

    /// The `valueOf()` method returns the primitive value of the specified object.
    ///
    /// More information:
    ///  - [ECMAScript reference][spec]
    ///  - [MDN documentation][mdn]
    ///
    /// [spec]: https://tc39.es/ecma262/#sec-object.prototype.valueof
    /// [mdn]:
    /// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/valueOf
    static Value valueOf(const std::vector<Value>& args);

    /// The `hasOwnProperty()` method returns a boolean indicating whether the object has the
    /// specified property as its own property.
    ///
    /// More information:
    ///  - [ECMAScript reference][spec]
    ///  - [MDN documentation][mdn]
    ///
    /// [spec]: https://tc39.es/ecma262/#sec-object.prototype.hasownproperty
    /// [mdn]:
    /// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/hasOwnProperty
    static Value hasOwnProperty(const std::vector<Value>& args);
};

}  // namespace rift::builtins 