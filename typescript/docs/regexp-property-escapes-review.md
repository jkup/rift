# Unicode property escape review

TS-517 is a read-only boundary and data review. Implementation is not yet
assigned. The TypeScript Unicode parser explicitly rejects property escapes;
C++ passes patterns to RE2 with Unicode matching enabled by default.

The existing C++ executable confirms a limited parity gap: `\p{L}` matches `A`.
Its binary hash is retained, but its build revision has not been established.
It is evidence of observed behavior, not proof of the current source build.

Seven reduced constructor controls separate RegExp creation from method calls.
The plain `a` baseline and `\p{L}` succeed. C++ returns false for the valid
ECMAScript spellings `\p{Letter}`, `\p{Script=Greek}`, `\p{White_Space}` and
`\p{scx=Hira}` on their explicit matching inputs. It accepts `\p{Greek}`,
which the independent ECMAScript reference rejects. The CLI also prints its
final undefined completion; that line is retained separately from test output.
Initial chained-constructor controls inside try printed only that completion;
they are preserved and are not interpreted as property-matching results.

[RE2's grammar](https://github.com/google/re2/wiki/Syntax) permits its own Unicode
class names. [ECMAScript's property matching rules](https://tc39.es/ecma262/multipage/text-processing.html#sec-runtime-semantics-unicodematchproperty-p)
require exact specified names and aliases, including their casing. Bare values
are general categories or allowed binary properties; script values require a
property name. The successor must follow those rules rather than importing RE2
aliases or turning unknown properties into empty matching sets.

Both TypeScript hosts agree on all six initial property controls, reporting
explicit unsupported operation without falsely certifying valid input. The
independent reference verifies five matching expectations and one SyntaxError.
All sources, process results and executable hashes are in
`build/regexp-property-escape-review/`.

The broader review remains pending: exact aliases and invalid syntax, class
composition, complementary properties with ignore-case, supplementary code
points and surrogates, and Script_Extensions defaults. It must identify complete
[Unicode 17.0.0 data](https://www.unicode.org/Public/17.0.0/ucd/ReadMe.txt), licenses,
provenance and native compiler constraints before proposing an implementation.
Partial property tables and v-mode string properties are outside this review's
implementation authority.
