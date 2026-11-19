# String replaceAll

The RegExp-global check precedes custom Symbol.replace lookup. Custom methods
receive the original receiver and replacement without premature conversion.
matchAll and replaceAll share that prerequisite; replace retains its existing
behavior and budgets.

String matching collects non-overlapping UTF-16 positions before invoking
replacers, advancing one code unit for empty searches. Position collection is
budgeted. Functional replacement and dollar substitutions use the existing
replacement machinery, and output assembly retains its allocation budget.
The bounded search loop handles the host indexOf empty-string clamping difference
by stopping once the next start exceeds the input length.

References: [ECMAScript 2025 replaceAll](https://262.ecma-international.org/16.0/#sec-string.prototype.replaceall)
and [engine262 StringPrototype at 18cdeb03](https://github.com/engine262/engine262/blob/18cdeb03c363eb31d775648a0d070bdc8a26ced1/src/intrinsics/StringPrototype.mts).
