# globalThis

Script Realms expose their existing global-this value through a writable,
non-enumerable, configurable globalThis property. Replacing, deleting or shadowing
the property does not replace the Global Environment Record's this binding.
Each Realm retains its own object identity, including through foreign function
calls and eval. Legacy globals remain unchanged.

Reference: [ECMAScript 2025 globalThis](https://262.ecma-international.org/16.0/#sec-globalthis).
