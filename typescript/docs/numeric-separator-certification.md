# Malformed numeric separator certification

TS-151 follows the [ECMAScript 2025 numeric literal grammar](https://262.ecma-international.org/16.0/#sec-literals-numeric-literals): separators belong between digits of the same numeric component, and are excluded from leading-zero integer forms. The implementation review used [engine262 scanNumber](https://github.com/engine262/engine262/blob/18cdeb03c363eb31d775648a0d070bdc8a26ced1/src/parser/Lexer.mts), including its separate radix, leading-zero, fraction and exponent checks. Rift retains its own scanner and bounded syntax classification.

Ordinary lexing and declaration planning remain unchanged. A separate lexer entry point can consume misplaced underscores and emit `invalid-number` tokens, preserving original text, offsets and locations. Unsupported suffixes, including BigInt, remain lexer failures. This is evidence for a rejection-only continuation, not a permissive number parser.

Only the numeric separator audit parser accepts those tokens, as disposable literal operands. It must consume the entire original source, then run the existing declaration collector with inherited strictness and no retained nodes. Unsupported grammar, regexp literals, scope restrictions, other declaration conflicts and resource guards veto certification. Invalid numeric property names are conservatively outside this continuation. Strings, comments and template raw segments never supply numeric evidence; template substitutions can.

The audit returns only candidate spans or a veto. It cannot return executable nodes or an executable preparation. The source and ordinary first rejection are preserved whenever the audit cannot certify the whole input.

The initial audit prerequisite passes its focused driver on Node and native Rift. Static-only compilation and coverage report 1646/1646 static statements with zero dynamic operations. This prerequisite alone does not change eval outcomes or corpus completion counts.
