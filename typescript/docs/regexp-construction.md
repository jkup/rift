# RegExp construction and metadata

The Script profile exposes a Realm-local RegExp constructor and ordinary prototype. Instances carry original pattern/flag strings and the bounded compiled matcher. The prototype itself has no matcher slots. The shared IsRegExp operation consults Symbol.match before falling back to the brand; string includes/startsWith/endsWith use that same operation. Object.prototype.toString recognizes the brand independently of mutable prototype chains and still honors Symbol.toStringTag.

Calling RegExp can return its argument when IsRegExp is true, flags are undefined and the argument's constructor is the called intrinsic. Construction always creates a fresh instance. Genuine instances clone original slots even when public source/flags properties are overridden. RegExp-like objects expose observable source/flags reads. Prototype selection precedes pattern and flag coercion; a non-object newTarget prototype falls back to that constructor's Realm.

The admitted flags are dgimsy. Duplicate/unknown flags, mutually exclusive u/v and proven pattern syntax errors produce guest SyntaxErrors. Unicode modes and unsupported pattern features produce fatal `runtime.regexp-pattern` outcomes, which are carried through the observation codecs rather than accepted as language errors. Compilation and source escaping use the supplied operation budget.

Instances own a writable, nonenumerable, nonconfigurable lastIndex initialized to zero. Source escaping preserves pattern meaning and prevents raw line terminators or unescaped delimiters in its printable form. Flag accessors require the brand, with the specified undefined exception for their own Realm's RegExp.prototype. The flags getter and toString are generic and retain observable access/coercion order. Species returns its receiver.

Exec/test, symbol protocols, RegExp.escape and literal syntax are separate work. This task alone does not claim the original RegExp fixtures pass.

The implementation follows [ECMAScript 2025 construction](https://262.ecma-international.org/16.0/#sec-regexp-pattern-flags) and [prototype properties](https://262.ecma-international.org/16.0/#sec-properties-of-the-regexp-prototype-object), reviewed against [engine262 at 18cdeb03](https://github.com/engine262/engine262/blob/18cdeb03c363eb31d775648a0d070bdc8a26ced1/src/intrinsics/RegExp.mts). The bounded backend decision remains in [TS-168](validation/ts-168/README.md).
