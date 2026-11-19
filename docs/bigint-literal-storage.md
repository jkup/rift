# BigInt literal representation

BigInt syntax nodes retain normalized, lexer-validated numeric text in their own
bigint arm. The evaluator charges work by text length before constructing the
exact guest numeric value. Existing Number/String/Boolean/null literal shapes
are unchanged. Declaration traversal treats the new arm as a leaf; the legacy
metadata path rejects it explicitly.

This keeps syntax records serializable without host BigInt values. The pinned
scriptc rejects JSON.stringify of any record type containing bigint, even when a
particular runtime input contains only Numbers. The two-statement before/after
reduction and original driver failure are retained in build evidence. Two eager
async test failure messages also serialized full runtime completions; they now
report completion kind and string content without changing their assertions.

The repaired snapshot driver passes native static compilation and zero-dynamic
coverage, and all 102 historical audit inputs pass in both orders on both hosts.
The full Node suite passes 784/784. Canonical acceptance requires a fresh matrix;
the obsolete partial matrix is explicitly cancelled, not counted as a pass.

Constructing a literal value at evaluation time adds bounded conversion work;
this is a compiler-compatibility decision, not a performance claim. No host eval,
JSON replacer shim, dynamic tier or guest numeric approximation is introduced.
