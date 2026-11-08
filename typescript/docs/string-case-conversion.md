# Default Unicode case conversion

TS-093 adds Script toLowerCase and toUpperCase using the existing UTF-16 host
string boundary. Both perform generic receiver conversion with the string hint,
reject nullish receivers and symbol string conversion, ignore arguments, and
propagate explicit guest completions. Locale methods are not installed.

The pinned backend passes 12 literal input/lower/upper triples in both hosts:
ASCII, sharp-s expansion, dotted-I expansion, contextual Greek sigma (including
combining marks), Deseret supplementary pairs, a ligature and lone surrogates.
The reduced runtime-input probe is fully static (13/13 statements); logs and
source are in build/string-case-probe*. The same expectations are retained in
the integrated string driver. Existing string probes also exercise expansion.
This is targeted backend evidence, not an exhaustive Unicode database comparison;
Unicode version alignment remains a follow-up audit as the toolchain changes.

Conversion is one atomic host operation after the normal guest entry/coercion
guards, as with other primitive string backends. No per-code-point CPU or memory
quota is claimed. No native-specific workaround or locale mapping is introduced.

Reference: [Unicode default case conversion in ECMAScript](https://tc39.es/ecma262/2023/multipage/text-processing.html#sec-string.prototype.tolowercase).
The C++ byte-string implementation is retained as a historical reference; literal
UTF-16 and special-casing expectations govern this implementation.
