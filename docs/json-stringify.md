# JSON.stringify

Serialization uses an explicit stack and a set of active containers. Shared
acyclic references serialize repeatedly; references to an active ancestor throw
a guest TypeError. Deep graphs never recurse on the host. Output is assembled
once from charged pieces, with separate charges for traversal, key enumeration
and indentation allocation.

Each property is read live, then its toJSON hook runs, then the replacer runs.
Wrapper conversion follows those hooks. Object keys and array lengths are
captured when their containers are entered. Replacer property lists retain
first-occurrence order and can select inherited or non-enumerable properties.
Omitted object values disappear; omitted array values become null. Formatting
uses the coerced, capped gap and well-formed UTF-16 quoting, preserving valid
surrogate pairs and escaping lone surrogates.

Tests cover coercion and callback order, root holders and borrowed-Realm calls,
mutation, cycles and repeated references, metadata, fixed UTF-16 output literals,
5,000 nested arrays and output/iteration resource limits. The implementation
handles current Rift Values; BigInt and rawJSON are separate features. It does
not hand guest objects to a host serializer.

References: [ECMAScript 2025 JSON.stringify](https://262.ecma-international.org/16.0/#sec-json.stringify)
and [engine262 JSON at 18cdeb03](https://github.com/engine262/engine262/blob/18cdeb03c363eb31d775648a0d070bdc8a26ced1/src/intrinsics/JSON.mts).
The newer engine's rawJSON extension is outside this slice. The draft passes
690 Node guest cases and focused native compilation/execution with parsed
zero-dynamic coverage; combined canonical acceptance remains separate.
