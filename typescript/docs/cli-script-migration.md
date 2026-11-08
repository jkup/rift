# CLI Script migration

The CLI now calls `prepareBoundedScript`, creates one Script session, and evaluates
the prepared record in a Script Realm. Preparation failures exit 2 before any guest
effects. Guest throws exit 1; usage, file-read and host-fault exits remain 64, 66
and 70. The legacy interpreter and observation driver are unchanged.

Strictness now comes from the source. The old CLI treated detached calls and
failed writes as strict even without a directive. Fixtures testing those strict
errors now include `"use strict"`; their error line numbers move by one. New cases
also check sloppy receivers, ignored non-writable writes, global assignment and
delete results. This follows ECMAScript
[PutValue](https://tc39.es/ecma262/multipage/ecmascript-data-types-and-values.html#sec-putvalue)
and the existing Script evaluator's strictness model.

The `increment` case now checks the result of the supported update expression.
Duplicate declarations and invalid numeric assignment targets retain parse errors
with the Script parser's more specific diagnostic text. No cases were removed.
The suite grows from 212 to 222 cases, with explicit loop, catch, constructor,
receiver, write, delete, preparation-before-effects and resource-limit checks.

Validation: Node and native guest suites each pass 222/222, with no skips; native
CLI static-only build and separate coverage pass 3996/3996 static statements.
Logs are ignored under `build/catch-up-script-cli-*` and
`build/catch-up-cli-native-*`. Host-driver binaries are unchanged; only the CLI
needs rebuilding for this production change.
