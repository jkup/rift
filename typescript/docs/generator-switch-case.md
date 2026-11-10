# Suspended switch selectors

A pending switch selection retains the discriminant, next clause index and default
index inside the initialized CaseBlock environment. Each selector advances the
cursor before evaluation. Resuming compares its value strictly and either starts
the selected clause or continues searching. Once selected, later selectors are
skipped while their bodies remain available for fallthrough.

The existing switch boundary becomes the break marker after selection. It holds
no evaluator or callback. Return/throw during a selector uses ordinary boundary
unwinding, including outer finally and iteration cleanup.

Tests cover defaults before/after cases, skipped selectors, fallthrough, TDZ and
captured bindings, strict object/NaN comparison, labels, async bodies, cross-Realm
errors and current-session budgets. The historical rejected selector source is
retained as a positive test. Evidence stays under ignored
build/generator-switch-case-* paths; combined canonical acceptance is required.

Reviewed [engine262 SwitchStatement.mts](https://github.com/engine262/engine262/blob/18cdeb03c363eb31d775648a0d070bdc8a26ced1/src/runtime-semantics/SwitchStatement.mts)
and its CaseBlockEvaluation algorithm, including default search and fallthrough.
