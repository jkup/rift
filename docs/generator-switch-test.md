# Suspended switch discriminants

A switch discriminant resumes in the surrounding environment. Only after its
value is available does the shared switch-body helper create and initialize the
CaseBlock environment, evaluate selectors and schedule clause bodies. Ordinary
switch statements use that same helper.

Tests cover outer bindings versus selector TDZ, block functions, strict equality,
default search, fallthrough, labels, abrupt resumption, async bodies and cross-Realm
errors. The historical rejected discriminant source is retained as a positive
execution test. Case-selector suspension remains a separate slice.

Focused native/static evidence, full Node results and neighboring native checks
are retained in ignored build/generator-switch-test-* logs. Combined canonical
validation is still required before acceptance.
