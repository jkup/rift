# Bounded Function construction

TS-140 exposes the Script Function intrinsic. Calls and construction coerce parameter/body arguments in order, validate their source independently, then materialize the complete function in the defining Realm's global environment. Construction does not execute the body or install an anonymous global. The resulting ordinary function uses existing call/constructor dispatch, lexical scope, metadata and source text.

Source-size checks happen before concatenation. Each parse charges the active execution budget by source length; parser resource guards and dynamic execution retain fatal-stop behavior. Certified syntax rules, declaration conflicts and invalid wrapper boundaries produce guest SyntaxError. Other rejected source returns the explicit fatal runtime.dynamic-function-source capability, rather than pretending the bounded parser has certified a syntax error. Defaults, rest parameters, arrows and other unsupported forms remain outside this slice. No host engine executes source; no constructor capability is added to OperationContext.

References consulted 2026-11-09: ECMAScript [CreateDynamicFunction](https://tc39.es/ecma262/multipage/fundamental-objects.html#sec-createdynamicfunction) and V8 [CreateDynamicFunction](https://github.com/v8/v8/blob/main/src/builtins/builtins-function.cc). Rift preserves conversion, isolated source boundaries and global scope using its existing parser and function records. Alternate newTarget and host code-like objects remain unsupported.

Acceptance pending.
