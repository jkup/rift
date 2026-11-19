# Suspended template substitutions

An untagged template retains its preceding text and substitution cursor across
yield or await. Each completed substitution converts to a primitive with the
string hint and then to a string before the next expression runs. The ordinary
and suspended paths share that conversion helper.

Focused tests cover nested templates, conversion hooks/order, Symbol failures,
throw/return interruption, calls, arrays, members, delegation and async bodies.
Tagged templates remain separate. Native static-only coverage, the full Node
suite and neighboring native checks are recorded in ignored
build/generator-template-* logs. Combined canonical acceptance remains required.
