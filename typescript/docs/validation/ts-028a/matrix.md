# TS-028A implementation mapping

All 144 frozen primary rows and their listed variants are retained in the
[accepted matrix](../ts-028p/matrix.md). Assertions use literal semantic oracles;
no generated execution output supplies expectations. Line anchors below identify
the named scenario group; shared loops exercise the explicit variants.

| Row | Implementation / assertion group |
|---|---|
| V1 BooleanTrue | [`test/primitive-reads.ts:195`](../../../test/primitive-reads.ts#L195) — `const valueRows` |
| V2 BooleanFalse | [`test/primitive-reads.ts:195`](../../../test/primitive-reads.ts#L195) — `const valueRows` |
| V3 Number | [`test/primitive-reads.ts:195`](../../../test/primitive-reads.ts#L195) — `const valueRows` |
| V4 NegativeZero | [`test/primitive-reads.ts:195`](../../../test/primitive-reads.ts#L195) — `const valueRows` |
| V5 Nonfinite | [`test/primitive-reads.ts:195`](../../../test/primitive-reads.ts#L195) — `const valueRows` |
| V6 StringMethods | [`test/primitive-reads.ts:195`](../../../test/primitive-reads.ts#L195) — `const valueRows` |
| V7 Symbol | [`test/primitive-reads.ts:195`](../../../test/primitive-reads.ts#L195) — `const valueRows` |
| V8 SymbolHook | [`test/primitive-reads.ts:195`](../../../test/primitive-reads.ts#L195) — `const valueRows` |
| V9 Missing | [`test/primitive-reads.ts:221`](../../../test/primitive-reads.ts#L221) — `for (const value of primitives)` |
| V10 Inherited | [`test/primitive-reads.ts:221`](../../../test/primitive-reads.ts#L221) — `for (const value of primitives)` |
| V11 RootInherited | [`test/primitive-reads.ts:221`](../../../test/primitive-reads.ts#L221) — `for (const value of primitives)` |
| V12 UndefinedShadow | [`test/primitive-reads.ts:221`](../../../test/primitive-reads.ts#L221) — `for (const value of primitives)` |
| V13 SymbolIdentity | [`test/primitive-reads.ts:221`](../../../test/primitive-reads.ts#L221) — `for (const value of primitives)` |
| V14 SameTextString | [`test/primitive-reads.ts:221`](../../../test/primitive-reads.ts#L221) — `for (const value of primitives)` |
| V15 ObjectControl | [`test/primitive-reads.ts:249`](../../../test/primitive-reads.ts#L249) — `class ObservedObject` |
| V16 BoxControl | [`test/primitive-reads.ts:249`](../../../test/primitive-reads.ts#L249) — `class ObservedObject` |
| V17 CallableControl | [`test/primitive-reads.ts:249`](../../../test/primitive-reads.ts#L249) — `class ObservedObject` |
| V18 Null | [`test/primitive-reads.ts:249`](../../../test/primitive-reads.ts#L249) — `class ObservedObject` |
| V19 Undefined | [`test/primitive-reads.ts:249`](../../../test/primitive-reads.ts#L249) — `class ObservedObject` |
| V20 NumberToStringBoundary | [`test/primitive-reads.ts:195`](../../../test/primitive-reads.ts#L195) — `const valueRows` |
| V21 BooleanMethodIdentity | [`test/primitive-reads.ts:249`](../../../test/primitive-reads.ts#L249) — `class ObservedObject` |
| V22 NoBaseCoercion | [`test/primitive-reads.ts:221`](../../../test/primitive-reads.ts#L221) — `for (const value of primitives)` |
| S1 ASCII | [`test/primitive-reads.ts:278`](../../../test/primitive-reads.ts#L278) — `const stringRows` |
| S2 Empty | [`test/primitive-reads.ts:278`](../../../test/primitive-reads.ts#L278) — `const stringRows` |
| S3 Pair | [`test/primitive-reads.ts:278`](../../../test/primitive-reads.ts#L278) — `const stringRows` |
| S4 LoneUnits | [`test/primitive-reads.ts:278`](../../../test/primitive-reads.ts#L278) — `const stringRows` |
| S5 Nul | [`test/primitive-reads.ts:278`](../../../test/primitive-reads.ts#L278) — `const stringRows` |
| S6 NumericZero | [`test/primitive-reads.ts:278`](../../../test/primitive-reads.ts#L278) — `const stringRows` |
| S7 Nonindices | [`test/primitive-reads.ts:305`](../../../test/primitive-reads.ts#L305) — `for (const key of [s("-0")` |
| S8 Canonical | [`test/primitive-reads.ts:278`](../../../test/primitive-reads.ts#L278) — `const stringRows` |
| S9 VirtualWins | [`test/primitive-reads.ts:313`](../../../test/primitive-reads.ts#L313) — `put(realm.stringPrototype, "0"` |
| S10 MissingInherits | [`test/primitive-reads.ts:313`](../../../test/primitive-reads.ts#L313) — `put(realm.stringPrototype, "0"` |
| S11 NoncanonicalInherits | [`test/primitive-reads.ts:313`](../../../test/primitive-reads.ts#L313) — `put(realm.stringPrototype, "0"` |
| S12 LengthOwn | [`test/primitive-reads.ts:313`](../../../test/primitive-reads.ts#L313) — `put(realm.stringPrototype, "0"` |
| S13 DescriptorControl | [`test/primitive-reads.ts:322`](../../../test/primitive-reads.ts#L322) — `const index = box.getOwnProperty` |
| S14 NoMaterialization | [`test/primitive-reads.ts:326`](../../../test/primitive-reads.ts#L326) — `box.preventExtensions` |
| E1 CallOrder | [`test/primitive-reads.ts:334`](../../../test/primitive-reads.ts#L334) — `function effects` |
| E2 ReadOrder | [`test/primitive-reads.ts:334`](../../../test/primitive-reads.ts#L334) — `function effects` |
| E3 BaseThrow | [`test/primitive-reads.ts:334`](../../../test/primitive-reads.ts#L334) — `function effects` |
| E4 KeyExpressionThrow | [`test/primitive-reads.ts:334`](../../../test/primitive-reads.ts#L334) — `function effects` |
| E5 NullBeforeHook | [`test/primitive-reads.ts:334`](../../../test/primitive-reads.ts#L334) — `function effects` |
| E6 HookThrow | [`test/primitive-reads.ts:334`](../../../test/primitive-reads.ts#L334) — `function effects` |
| E7 GetThrow | [`test/primitive-reads.ts:334`](../../../test/primitive-reads.ts#L334) — `function effects` |
| E8 ArgumentThrow | [`test/primitive-reads.ts:334`](../../../test/primitive-reads.ts#L334) — `function effects` |
| E9 Noncallable | [`test/primitive-reads.ts:334`](../../../test/primitive-reads.ts#L334) — `function effects` |
| E10 MissingCall | [`test/primitive-reads.ts:334`](../../../test/primitive-reads.ts#L334) — `function effects` |
| E11 ArgumentWins | [`test/primitive-reads.ts:334`](../../../test/primitive-reads.ts#L334) — `function effects` |
| E12 HookNoncallable | [`test/primitive-reads.ts:334`](../../../test/primitive-reads.ts#L334) — `function effects` |
| E13 HookObject | [`test/primitive-reads.ts:334`](../../../test/primitive-reads.ts#L334) — `function effects` |
| E14 OrdinaryFirst | [`test/primitive-reads.ts:334`](../../../test/primitive-reads.ts#L334) — `function effects` |
| E15 OrdinaryFallback | [`test/primitive-reads.ts:334`](../../../test/primitive-reads.ts#L334) — `function effects` |
| E16 OrdinaryMissing | [`test/primitive-reads.ts:334`](../../../test/primitive-reads.ts#L334) — `function effects` |
| E17 SymbolResult | [`test/primitive-reads.ts:334`](../../../test/primitive-reads.ts#L334) — `function effects` |
| E18 PrimitiveKeys | [`test/primitive-reads.ts:490`](../../../test/primitive-reads.ts#L490) — `const keys: Value[]` |
| E19 KeyRebinding | [`test/primitive-reads.ts:334`](../../../test/primitive-reads.ts#L334) — `function effects` |
| E20 BaseRebinding | [`test/primitive-reads.ts:334`](../../../test/primitive-reads.ts#L334) — `function effects` |
| E21 PrototypeMutation | [`test/primitive-reads.ts:334`](../../../test/primitive-reads.ts#L334) — `function effects` |
| E22 PrototypeDeletion | [`test/primitive-reads.ts:334`](../../../test/primitive-reads.ts#L334) — `function effects` |
| E23 ArgumentMutation | [`test/primitive-reads.ts:334`](../../../test/primitive-reads.ts#L334) — `function effects` |
| E24 Chain | [`test/primitive-reads.ts:501`](../../../test/primitive-reads.ts#L501) — `"E24 Chain"` |
| E25 MissingChain | [`test/primitive-reads.ts:502`](../../../test/primitive-reads.ts#L502) — `"E25 MissingChain"` |
| E26 Typeof | [`test/primitive-reads.ts:503`](../../../test/primitive-reads.ts#L503) — `"E26 Typeof"` |
| E27 Void | [`test/primitive-reads.ts:504`](../../../test/primitive-reads.ts#L504) — `"E27 Void"` |
| E28 InControl | [`test/primitive-reads.ts:505`](../../../test/primitive-reads.ts#L505) — `"E28 InControl"` |
| E29 NestedDelete | [`test/primitive-reads.ts:506`](../../../test/primitive-reads.ts#L506) — `"E29 NestedDelete"` |
| E30 KeyEffectsOnPrimitives | [`test/primitive-reads.ts:484`](../../../test/primitive-reads.ts#L484) — `// E30` |
| M1 GuestThis | [`test/primitive-reads.ts:509`](../../../test/primitive-reads.ts#L509) — `// M1-M7` |
| M2 Parenthesized | [`test/primitive-reads.ts:509`](../../../test/primitive-reads.ts#L509) — `// M1-M7` |
| M3 Detached | [`test/primitive-reads.ts:509`](../../../test/primitive-reads.ts#L509) — `// M1-M7` |
| M4 ConditionalValue | [`test/primitive-reads.ts:509`](../../../test/primitive-reads.ts#L509) — `// M1-M7` |
| M5 LogicalValue | [`test/primitive-reads.ts:509`](../../../test/primitive-reads.ts#L509) — `// M1-M7` |
| M6 DetachedBrand | [`test/primitive-reads.ts:509`](../../../test/primitive-reads.ts#L509) — `// M1-M7` |
| M7 BorrowedCall | [`test/primitive-reads.ts:509`](../../../test/primitive-reads.ts#L509) — `// M1-M7` |
| M8 LocalLookup | [`test/primitive-reads.ts:531`](../../../test/primitive-reads.ts#L531) — `for (const mode of ["normal"` |
| M9 ForeignBox | [`test/primitive-reads.ts:531`](../../../test/primitive-reads.ts#L531) — `for (const mode of ["normal"` |
| M10 ForeignMethod | [`test/primitive-reads.ts:531`](../../../test/primitive-reads.ts#L531) — `for (const mode of ["normal"` |
| M11 ForeignGuest | [`test/primitive-reads.ts:531`](../../../test/primitive-reads.ts#L531) — `for (const mode of ["normal"` |
| M12 ForeignKey | [`test/primitive-reads.ts:531`](../../../test/primitive-reads.ts#L531) — `for (const mode of ["normal"` |
| M13 SeparateReads | [`test/primitive-reads.ts:531`](../../../test/primitive-reads.ts#L531) — `for (const mode of ["normal"` |
| M14 ReceiverObservation | [`test/primitive-reads.ts:531`](../../../test/primitive-reads.ts#L531) — `for (const mode of ["normal"` |
| M15 BoxingInsideMethod | [`test/primitive-reads.ts:531`](../../../test/primitive-reads.ts#L531) — `for (const mode of ["normal"` |
| M16 DetachedRead | [`test/primitive-reads.ts:531`](../../../test/primitive-reads.ts#L531) — `for (const mode of ["normal"` |
| M17 RetainedEffects | [`test/primitive-reads.ts:531`](../../../test/primitive-reads.ts#L531) — `for (const mode of ["normal"` |
| M18 FreshPrototype | [`test/primitive-reads.ts:531`](../../../test/primitive-reads.ts#L531) — `for (const mode of ["normal"` |
| W1 ReadTwice | [`test/primitive-reads.ts:605`](../../../test/primitive-reads.ts#L605) — `const reuseNames` |
| W2 FreshReferences | [`test/primitive-reads.ts:605`](../../../test/primitive-reads.ts#L605) — `const reuseNames` |
| W3 ReadThenWrite | [`test/primitive-reads.ts:605`](../../../test/primitive-reads.ts#L605) — `const reuseNames` |
| W4 MutationAfterRead | [`test/primitive-reads.ts:605`](../../../test/primitive-reads.ts#L605) — `const reuseNames` |
| W5 SymbolCache | [`test/primitive-reads.ts:605`](../../../test/primitive-reads.ts#L605) — `const reuseNames` |
| W6 PrimitiveReadWrite | [`test/primitive-reads.ts:692`](../../../test/primitive-reads.ts#L692) — `for (const value of [...primitives` |
| W7 Nullish | [`test/primitive-reads.ts:692`](../../../test/primitive-reads.ts#L692) — `for (const value of [...primitives` |
| W8 ConversionFailure | [`test/primitive-reads.ts:605`](../../../test/primitive-reads.ts#L605) — `const reuseNames` |
| W9 DispatchFailureCache | [`test/primitive-reads.ts:605`](../../../test/primitive-reads.ts#L605) — `const reuseNames` |
| W10 HostFailureCache | [`test/primitive-reads.ts:605`](../../../test/primitive-reads.ts#L605) — `const reuseNames` |
| W11 ConversionHostFault | [`test/primitive-reads.ts:605`](../../../test/primitive-reads.ts#L605) — `const reuseNames` |
| W12 NoValueCache | [`test/primitive-reads.ts:605`](../../../test/primitive-reads.ts#L605) — `const reuseNames` |
| W13 SimplePrimitiveWrite | [`test/primitive-reads.ts:718`](../../../test/primitive-reads.ts#L718) — `for (const name of ["W13` |
| W14 RHSAbrupt | [`test/primitive-reads.ts:718`](../../../test/primitive-reads.ts#L718) — `for (const name of ["W13` |
| W15 SimpleObjectWrite | [`test/primitive-reads.ts:718`](../../../test/primitive-reads.ts#L718) — `for (const name of ["W13` |
| W16 ParseBoundary | [`test/primitive-reads.ts:751`](../../../test/primitive-reads.ts#L751) — `const parseRows` |
| W17 ReadBeforeNumericFailure | [`test/primitive-reads.ts:761`](../../../test/primitive-reads.ts#L761) — `for (const name of ["W17` |
| W18 ReadBeforeRHSFailure | [`test/primitive-reads.ts:761`](../../../test/primitive-reads.ts#L761) — `for (const name of ["W17` |
| W19 LocationSplit | [`test/primitive-reads.ts:605`](../../../test/primitive-reads.ts#L605) — `const reuseNames` |
| W20 DeleteControl | [`test/primitive-reads.ts:784`](../../../test/primitive-reads.ts#L784) — `"W20 DeleteControl"` |
| R1 Primitive | [`test/primitive-reads.ts:797`](../../../test/primitive-reads.ts#L797) — `const resourceRows` |
| R2 StatementGuard | [`test/primitive-reads.ts:797`](../../../test/primitive-reads.ts#L797) — `const resourceRows` |
| R3 MemberGuard | [`test/primitive-reads.ts:797`](../../../test/primitive-reads.ts#L797) — `const resourceRows` |
| R4 BaseGuard | [`test/primitive-reads.ts:797`](../../../test/primitive-reads.ts#L797) — `const resourceRows` |
| R5 KeyGuard | [`test/primitive-reads.ts:797`](../../../test/primitive-reads.ts#L797) — `const resourceRows` |
| R6 Exact | [`test/primitive-reads.ts:797`](../../../test/primitive-reads.ts#L797) — `const resourceRows` |
| R7 Nullish | [`test/primitive-reads.ts:797`](../../../test/primitive-reads.ts#L797) — `const resourceRows` |
| R8 Canonical | [`test/primitive-reads.ts:797`](../../../test/primitive-reads.ts#L797) — `const resourceRows` |
| R9 OrdinaryFirst | [`test/primitive-reads.ts:797`](../../../test/primitive-reads.ts#L797) — `const resourceRows` |
| R10 OrdinarySecond | [`test/primitive-reads.ts:797`](../../../test/primitive-reads.ts#L797) — `const resourceRows` |
| R11 HookTickGuard | [`test/primitive-reads.ts:797`](../../../test/primitive-reads.ts#L797) — `const resourceRows` |
| R12 CallGuard | [`test/primitive-reads.ts:797`](../../../test/primitive-reads.ts#L797) — `const resourceRows` |
| R13 SeededDepth | [`test/primitive-reads.ts:797`](../../../test/primitive-reads.ts#L797) — `const resourceRows` |
| R14 ChildDepth | [`test/primitive-reads.ts:797`](../../../test/primitive-reads.ts#L797) — `const resourceRows` |
| R15 StepWins | [`test/primitive-reads.ts:797`](../../../test/primitive-reads.ts#L797) — `const resourceRows` |
| R16 Calls | [`test/primitive-reads.ts:797`](../../../test/primitive-reads.ts#L797) — `const resourceRows` |
| R17 CallArguments | [`test/primitive-reads.ts:797`](../../../test/primitive-reads.ts#L797) — `const resourceRows` |
| R18 DirectHelper | [`test/primitive-reads.ts:913`](../../../test/primitive-reads.ts#L913) — `"R18 primitive helper"` |
| R19 Monotonic | [`test/primitive-reads.ts:921`](../../../test/primitive-reads.ts#L921) — `const monotonic` |
| R20 HostRecursiveKey | [`test/primitive-reads.ts:932`](../../../test/primitive-reads.ts#L932) — `// R20-R25` |
| R21 HostLimits | [`test/primitive-reads.ts:932`](../../../test/primitive-reads.ts#L932) — `// R20-R25` |
| R22 GuestRecursiveKey | [`test/primitive-reads.ts:932`](../../../test/primitive-reads.ts#L932) — `// R20-R25` |
| R23 GuestLimits | [`test/primitive-reads.ts:932`](../../../test/primitive-reads.ts#L932) — `// R20-R25` |
| R24 StepBeforeCall | [`test/primitive-reads.ts:932`](../../../test/primitive-reads.ts#L932) — `// R20-R25` |
| R25 ForeignRecursion | [`test/primitive-reads.ts:932`](../../../test/primitive-reads.ts#L932) — `// R20-R25` |
| R26 AbruptCleanup | [`test/primitive-reads.ts:1008`](../../../test/primitive-reads.ts#L1008) — `// R26-R28` |
| R27 HostCleanup | [`test/primitive-reads.ts:1008`](../../../test/primitive-reads.ts#L1008) — `// R26-R28` |
| R28 Retry | [`test/primitive-reads.ts:1008`](../../../test/primitive-reads.ts#L1008) — `// R26-R28` |
| R29 LookupDepth | [`test/primitive-reads.ts:1098`](../../../test/primitive-reads.ts#L1098) — `let chain =` |
| R30 NoWrapperCache | [`test/primitive-reads.ts:932`](../../../test/primitive-reads.ts#L932) — `// R20-R25` |
| C1 Basic | `tools/run-guests.mjs` TS-028A cases and committed `test/fixtures/primitive-reads-*.js` |
| C2 Methods | `tools/run-guests.mjs` TS-028A cases and committed `test/fixtures/primitive-reads-*.js` |
| C3 Nullish | `tools/run-guests.mjs` TS-028A cases and committed `test/fixtures/primitive-reads-*.js` |
| C4 Write | `tools/run-guests.mjs` TS-028A cases and committed `test/fixtures/primitive-reads-*.js` |
| C5 Effects | `tools/run-guests.mjs` TS-028A cases and committed `test/fixtures/primitive-reads-*.js` |
| C6 Injected | [`test/primitive-reads.ts:1109`](../../../test/primitive-reads.ts#L1109) — `// C6:` |
| C7 UnsupportedBeforeEffects | `tools/run-guests.mjs` TS-028A cases and committed `test/fixtures/primitive-reads-*.js` |
| C8 PreservedBaseline | [preservation audit](audit.mjs), both rebuilt suite result files |
| C9 NewDriver | `tools/build-native.mjs` additive primitive-reads entry; independently parsed coverage in audit |
| C10 SourceRetention | [`test/primitive-reads.ts:1119`](../../../test/primitive-reads.ts#L1119) — `// C10:` |
