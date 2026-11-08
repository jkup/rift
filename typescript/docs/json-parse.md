# JSON parsing

TS-083 adds Script JSON.parse. A dedicated parser accepts JSON whitespace,
strings and escapes, decimal numbers, literals, arrays and objects. It does not
reuse the JavaScript parser or execute text in a host engine. Number conversion
uses the existing host numeric representation only after JSON grammar validation.

An explicit container stack avoids host recursion. String and number scanning,
whitespace, value allocation and container progress consume the active step budget.
Objects and arrays belong to the builtin's Realm, even when its caller and input
conversion hook belong to another Realm. Object properties are ordinary writable,
enumerable, configurable data; duplicate names replace earlier values without
moving the key, and __proto__ never mutates the result prototype.

Text conversion uses the string hint and propagates throws unchanged. Syntax is
validated before inspecting the reviver's callability. Noncallable revivers are
ignored. Callable revivers produce explicit runtime.json-reviver unsupported
results; traversal and source-context records are a separate task. JSON.stringify,
rawJSON and isRawJSON are not yet exposed. Legacy Realms remain unchanged.

Design references: [JSON.parse and ParseJSON](https://tc39.es/ecma262/multipage/structured-data.html#sec-json.parse),
including strict grammar, duplicate-key and __proto__ requirements, and the C++
parser in src/builtins/json/json.cpp at base1bd9f705. The C++ parser's ignored
reviver and object-string workaround were not retained. Tests use explicit
expected values and error categories, rather than agreement between hosts alone.

The JSON driver covers primitive values, negative zero, exponent overflow and
underflow, UTF-16 escapes, malformed grammar, nested values, duplicate properties,
Realm ownership, coercion, reviver precedence and step bounds. CLI cases cover
ordinary user-facing parsing and namespace metadata. Validation is recorded in
TASKS.md and COORDINATION.md after both hosts complete.
