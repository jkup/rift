# RegExp execution

Prototype exec requires a branded instance before converting its input. Prototype test is generic over objects: after input conversion, RegExpExec looks up and calls the current exec property, accepts only object/null results, and falls back to the intrinsic matcher only for genuine instances with a noncallable exec property.

Intrinsic matching always reads and converts lastIndex, even without g/y. The original flags control search and sticky behavior independently of public getter overrides. Global/sticky success writes the match end; failure writes zero. These writes throw on a nonwritable lastIndex, including writes of the existing value. Plain exec does not advance empty matches. Resource failures remain fatal and leave lastIndex untouched.

Results are fresh method-Realm arrays with enumerable index, input and groups properties. Unmatched captures are present undefined elements. The d flag adds indices arrays and start/end pairs in UTF-16 offsets; unmatched indices are also present undefined elements. Named groups remain unsupported, so both groups properties are undefined. Arrays do not use guest species constructors.

Focused tests cover overridden exec, coercion and failure ordering, read-only lastIndex, global/sticky search, empty matches, capture resets, surrogate code units, descriptors, method-Realm allocation and bounded pathological backtracking. Literal syntax and string symbol protocols remain separate work.

Semantics follow [ECMAScript 2025 RegExpExec and RegExpBuiltinExec](https://262.ecma-international.org/16.0/#sec-regexpexec), reviewed alongside [engine262's prototype methods at 18cdeb03](https://github.com/engine262/engine262/blob/18cdeb03c363eb31d775648a0d070bdc8a26ced1/src/intrinsics/RegExpPrototype.mts). Matching itself uses the [bounded instruction machine](regexp-matcher.md).
