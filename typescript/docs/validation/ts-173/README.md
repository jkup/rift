# Formatting audit override compatibility

The Promise aggregation matrix at `7bd0df2f` passed 176/177 native entries. `test/harness-formatting.ts` failed with SC1090 on its existing block-scoped `Poison.internalGet` override, although the parameter and return types match `GuestObject.internalGet`. The unchanged isolated retry reproduced the error; matching parameter names also failed.

Moving only this host audit subclass to module scope lets the complete audit build with static-only compilation and zero dynamic statements. Every assertion, invocation and thrown sentinel is preserved. Both runtime input fixtures execute successfully and produce identical Node/native output. No production interpreter source changes.

Small probes with the same imports and override pass at both module and block scope, so this is not evidence of a general prohibition on block-scoped classes. The reduced probes did not reproduce the interaction in the full audit. Retain the narrow placement change rather than weaken the override or remove identity-path checks.

Evidence: `build/promise-aggregation-native-initial.json` retains the original failure; `build/promise-aggregation-formatting-retry.log` retains the unchanged retry; `build/formatting-review/` contains the small probes and parameter-name/module-scope experiments. `build/promise-aggregation-native-retry.json` records the repaired entry's build/coverage and `build/promise-aggregation-formatting-reviewed.json` records both input fixtures in both hosts. The accepted matrix replaces only that entry in `build/promise-aggregation-native-results.json`.
