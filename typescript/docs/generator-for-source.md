# Suspended for-in/of sources

A source frame retains the temporary head environment, outer frame and loop
metadata while the source expression suspends. On completion it restores the
outer frame before acquiring an iterator or enumerator. The ordinary and resumed
paths share acquisition and body setup. Abrupt resumption before acquisition has
no iterator to close.

Tests cover var, assignment and lexical heads; TDZ closures; nullish enumeration;
prototype enumeration; labels; iterator acquisition errors and cleanup; nested
sources; delegation and async iteration. Cross-Realm errors and current-session
getter limits protect the activation boundary.

Reviewed [engine262 LabelledEvaluation.mts](https://github.com/engine262/engine262/blob/18cdeb03c363eb31d775648a0d070bdc8a26ced1/src/runtime-semantics/LabelledEvaluation.mts),
especially ForInOfHeadEvaluation's temporary environment and acquisition order.
Evidence stays under ignored build/generator-for-source-* paths pending combined
canonical acceptance. Suspension inside assignment targets remains separate.
