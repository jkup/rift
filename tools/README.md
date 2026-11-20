# Repository tools

- `build-native.mjs`: compile the interpreter and test drivers with the pinned ScriptC.
- `setup-native-toolchain.mjs`: prepare and build the hash-pinned native compiler and runtime.
- `package-native.mjs`: build, check, archive and smoke-test a relocatable native CLI release.
- `run-guests.mjs`: run guest regression cases and check expected results.
- `test-compiler.mjs`: compare the ten compiler checks under Node and native execution.
- `test262/`: corpus preparation, execution, result accounting and runner tests.
- `generate-*.mjs`, `parse-timezone-footer.mjs`: regenerate Unicode and timezone data.
- `check-readability-*.mjs`: enforce the repository's code policies.
- `legacy-suite.mjs`: execute the preserved regression corpus under `test/fixtures/legacy`.
- `test-number-radix.mjs`: compare number formatting with the independent reference oracle.

The remaining modules support these entry points; `*.test.mjs` files test the tools.
Use the package commands in [the contributor guide](../CONTRIBUTING.md) and
[validation reference](../docs/usage.md).
