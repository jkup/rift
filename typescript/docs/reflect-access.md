# Reflect property access

TS-470 is in progress. Reflect exposes `get`, `set` and `has` through the existing
internal property operations. Target checks precede key conversion, then the
operation's step-budget check. Omitted receivers use the target; explicitly
provided receivers remain unchanged.

Getter/setter calls retain normal function strictness and Realm rules. Inherited
readonly properties reject writes, writable inherited data properties write to
the receiver, and receiver-own accessors do not replace the data-property path.
Setter return values do not change a successful boolean result. Presence checks
traverse properties without invoking getters.

The design and specification links are in `reflect-access-review.md`. Twenty-six
independent Node references pass, with explicit strict mode where receiver
observations require it. Focused Rift Node tests add virtual String properties,
partial array-length writes, mapped arguments, missing arguments, exact thrown
values, foreign-Realm calls/errors and budget sweeps. Session restoration is
checked after every run. Historical fixtures remain unchanged.

Typechecking and focused Node tests pass; full Node and native acceptance remain
pending. The nine native regression groups include both existing runtime-input
variants of the property-accessor driver. Reflect.apply remains separate.

Isolated validation is READY: 939/939 Node guests, focused native with 19,951 static statements, nine regression groups covering ten runtime inputs, fifteen tooling builds, 296 tooling tests, eight codec records per host and sixteen parent-envelope checks pass. Canonical integration remains pending the frozen private-field rollup.
