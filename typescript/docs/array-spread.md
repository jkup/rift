# Array literal spread

TS-128 adds Script array spread elements: `[prefix, ...iterable, , suffix]`. The Script lexer recognizes one ellipsis token, including before numeric operands (`[...7]` must reach a non-iterable TypeError). Legacy parsing keeps its previous rejection. Call, constructor and object spread, rest bindings and destructuring remain excluded.

Each spread operand is evaluated in source order, then consumed by the existing synchronous iterator helpers. Ordinary elements and yielded values advance a shared destination index; elisions advance it without defining properties. Consequently spreading a sparse array creates own undefined-valued elements, while literal elisions remain holes. Fresh destination properties bypass inherited setters. Allocation uses the active function's Realm and ignores guest Array bindings, constructors and species.

Iterator acquisition and stepping preserve receiver, cached next and done-before-value semantics. Array accumulation propagates iterator faults without IteratorClose. Later operands are skipped after a fault. Fatal resource stops likewise skip guest cleanup. Every iterator step consumes the shared budget; no temporary list of all yielded values is needed. Declaration and metadata visitors traverse the spread operand so nested functions retain their original source and lexical associations.

References consulted on 2026-11-09: [ArrayAccumulation](https://tc39.es/ecma262/multipage/ecmascript-language-expressions.html#sec-runtime-semantics-arrayaccumulation) and V8's [BuildFillArrayWithIterator / BuildCreateArrayLiteral](https://github.com/v8/v8/blob/main/src/interpreter/bytecode-generator.cc). Rift uses the same iterator stepping order directly, without V8's boilerplate and bytecode optimizations.

Accepted validation: 617/617 guest cases on each host, all 127 native entries passing build and static coverage, tooling 290/290, runner 31/31, ten probes and typechecking. All 225 fixture results match; 140 complete, with the sparse-array fixture adding 11 passing checks. The focused Node and native driver passes, with 7468/7468 statements static. Tests cover sparse input versus elisions, multiple spreads, strings/Map/Set, custom iterators, cached next, getter ordering, no cleanup on faults, descriptor flags, inherited setters, captured Realms and infinite-iterator bounds. The initial typecheck identified the separate metadata visitor; the initial Node-focused run exposed tokenization before numeric operands. Both were corrected before native validation. Logs: `build/array-spread-*`.

The initial full Node run passed 616/617; the historical CLI source `let a = [...x];` now expects runtime ReferenceError at x rather than an unsupported-spread parse error. Its source and case count remain unchanged.

Reports: `build/legacy-suite-node-OLbepU/report.json`, `build/legacy-suite-native-23Hpwb/report.json`; full native evidence: `build/array-spread-native-results.json`.
