# Script whitespace

Script token separation uses the existing ECMAScript string-whitespace predicate,
covering 21 whitespace characters and four line terminators. Line accounting and
ASI still distinguish line terminators from other whitespace. Legacy lexing and
string/template contents retain their behavior.

The focused test checks every accepted separator, UTF-16 spans, incremental
lexing, return ASI, line/block comments, directives and literal preservation. It
also checks CRLF accounting, excluded near-neighbors and the legacy boundary.
The 146 independently reviewed controls are retained unchanged for both-host
replay. All 146 Node controls, 35 runner tests and eight producer-codec records
pass. Focused native execution passes with all 20,436 statements static. The
first sandboxed link attempt could not locate Zig's installation directory;
the unchanged source passed with host linker access. That failure is retained.
Full Node regression passes 957/957 without skips; all 146 controls pass both
hosts. All 15 native tooling builds and 296 tooling tests pass, along with eight
producer-codec records per host and 16 parent envelopes. The isolated change is
accepted after integration and combined lexical validation.

See docs/script-whitespace-review.md for the grammar review and specification.
