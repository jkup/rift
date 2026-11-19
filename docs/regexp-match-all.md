# RegExp and String matchAll

The factory captures the input, species-created matcher, flags and current Realm.
It copies lastIndex with ToLength and performs no matching until next. String's
protocol checks the global flag before looking up a custom matchAll method and
passes an unconverted receiver to that method.

The iterator has explicit suspended, executing and completed states. An abrupt
matching operation completes it; recursive next calls fail in the recursive
caller's Realm. Matching resumes with the captured Realm and the current caller's
dispatch and operation budget. This keeps helper-generated errors and yielded
result objects in the captured Realm without retaining an old execution session.
Completed results use the next builtin's Realm. Completion releases the matcher
and input. No guest generator syntax or host RegExp execution is involved.

Empty global matches advance by UTF-16 code units, or code points when custom
species supplies u/v flags. This does not enable unsupported Unicode patterns in
the built-in matcher. Non-global iterators yield once without reading match[0].

The design follows [ECMAScript 2025 CreateRegExpStringIterator](https://262.ecma-international.org/16.0/#sec-createregexpstringiterator),
[RegExp matchAll](https://262.ecma-international.org/16.0/#sec-regexp-prototype-matchall),
and [String matchAll](https://262.ecma-international.org/16.0/#sec-string.prototype.matchall).
The generator closure and abrupt-completion boundary were cross-checked against
[engine262 at 18cdeb03](https://github.com/engine262/engine262/blob/18cdeb03c363eb31d775648a0d070bdc8a26ced1/src/intrinsics/RegExpStringIteratorPrototype.mts).
Rift uses explicit iterator state instead of adopting host-generator suspension.
