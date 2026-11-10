# String.raw

The generic String.raw builtin boxes its template and raw value, captures raw.length once, and reads each literal in order. Each literal is converted before its corresponding substitution. Missing substitutions contribute nothing; explicitly supplied undefined becomes "undefined", and extra substitutions are never coerced. Indexed getters, inherited properties and mutations remain observable. The builtin ignores its receiver.

Each literal iteration and each output code unit consumes the operation budget. Converted parts are collected and joined once, avoiding repeated growth of the result string. Host exceptions are not used to report guest coercion errors.

The implementation follows [ECMAScript 2025 String.raw](https://262.ecma-international.org/16.0/#sec-string.raw), reviewed against [engine262 String at 18cdeb03](https://github.com/engine262/engine262/blob/18cdeb03c363eb31d775648a0d070bdc8a26ced1/src/intrinsics/String.mts). Tagged-template syntax is still outside the supported parser grammar; this task supplies the builtin callable with ordinary template-like objects. Tests cover ordering, abrupt completions, sparse/inherited raw values, UTF-16 units, descriptor metadata and resource bounds.
