# Directive checks after parser rejection

Incremental scanning exposed an error-path assumption in checkParameterDirective. A duplicate default-parameter rejection can stop the function body before enough tokens exist for scriptPrologue's lookahead. Frozen strict-parameter case E10, `function f(a,a=1){"use strict";}`, then threw a host TypeError instead of retaining its original parser diagnostic.

The fix skips directive inspection once the parser already has a rejection. Complete non-simple parameter lists still reject strict directives. Regression tests cover functions, arrows, rest parameters and legacy parsing. Focused execution passes both hosts: parser-token-stream has 11064 static statements and script-strict-parameter-audit has 2098, both with zero dynamic. The full 77-input frozen strict-parameter audit passes on both hosts.

The initial canonical tooling run passed 289/291. Its other failure was a preflight process importing an incomplete emitted boolean.js module while probe compilation and readers overlapped. The isolated pinned preflight passes after emission finishes. Future validation completes all TypeScript/probe emission before launching Node readers. This was a host artifact failure, not a changed guest expectation.

The native matrix was cancelled before source correction; its incomplete log is not acceptance evidence. Retained reports: build/regexp-lexing-native-aborted.log, regexp-lexing-tooling-initial.log, directive-guard-reviewed.json, directive-guard-audit.log and directive-guard-preflight.log. An intermediate native audit invocation omitted its required fixture id; the corrected invocation supplies E10. No EOF behavior change was needed. Full combined validation remains pending.
