# TS-030A executable row mapping

Every named row below runs in `test/compound-assignment.ts`, compiled and executed
under Node and native Rift. The driver has explicit five-operator loops (Add/Sub/Mul/Div/Rem),
literal vectors and named setup/action/assertion blocks. Restricted variants retain
the exact operator/subcase set in the frozen matrix. No expected vector calls binary().

| Frozen row | Driver entry | Assertions / variants |
|---|---|---|
| V1 Numbers | [driver:209](../../../test/compound-assignment.ts#L209) | Literal Value vectors and conversion setup; result, stored Value, hints, trace and cleanup. |
| V2 LeftString | [driver:209](../../../test/compound-assignment.ts#L209) | Literal Value vectors and conversion setup; result, stored Value, hints, trace and cleanup. |
| V3 RightString | [driver:209](../../../test/compound-assignment.ts#L209) | Literal Value vectors and conversion setup; result, stored Value, hints, trace and cleanup. |
| V4 Booleans | [driver:209](../../../test/compound-assignment.ts#L209) | Literal Value vectors and conversion setup; result, stored Value, hints, trace and cleanup. |
| V5 Null | [driver:209](../../../test/compound-assignment.ts#L209) | Literal Value vectors and conversion setup; result, stored Value, hints, trace and cleanup. |
| V6 Undefined | [driver:209](../../../test/compound-assignment.ts#L209) | Literal Value vectors and conversion setup; result, stored Value, hints, trace and cleanup. |
| V7 NaN | [driver:209](../../../test/compound-assignment.ts#L209) | Literal Value vectors and conversion setup; result, stored Value, hints, trace and cleanup. |
| V8 Infinity | [driver:209](../../../test/compound-assignment.ts#L209) | Literal Value vectors and conversion setup; result, stored Value, hints, trace and cleanup. |
| V9 BothInfinity | [driver:209](../../../test/compound-assignment.ts#L209) | Literal Value vectors and conversion setup; result, stored Value, hints, trace and cleanup. |
| V10 NegativeZero | [driver:209](../../../test/compound-assignment.ts#L209) | Literal Value vectors and conversion setup; result, stored Value, hints, trace and cleanup. |
| V11 BothNegativeZero | [driver:209](../../../test/compound-assignment.ts#L209) | Literal Value vectors and conversion setup; result, stored Value, hints, trace and cleanup. |
| V12 NegativeDivisor | [driver:209](../../../test/compound-assignment.ts#L209) | Literal Value vectors and conversion setup; result, stored Value, hints, trace and cleanup. |
| V13 NegativeDividend | [driver:209](../../../test/compound-assignment.ts#L209) | Literal Value vectors and conversion setup; result, stored Value, hints, trace and cleanup. |
| V14 InvalidNumericString | [driver:209](../../../test/compound-assignment.ts#L209) | Literal Value vectors and conversion setup; result, stored Value, hints, trace and cleanup. |
| V15 WhitespaceString | [driver:209](../../../test/compound-assignment.ts#L209) | Literal Value vectors and conversion setup; result, stored Value, hints, trace and cleanup. |
| V16 SymbolLeft | [driver:209](../../../test/compound-assignment.ts#L209) | Literal Value vectors and conversion setup; result, stored Value, hints, trace and cleanup. |
| V17 SymbolRight | [driver:209](../../../test/compound-assignment.ts#L209) | Literal Value vectors and conversion setup; result, stored Value, hints, trace and cleanup. |
| V18 StringSymbol | [driver:209](../../../test/compound-assignment.ts#L209) | Literal Value vectors and conversion setup; result, stored Value, hints, trace and cleanup. |
| V19 SymbolString | [driver:209](../../../test/compound-assignment.ts#L209) | Literal Value vectors and conversion setup; result, stored Value, hints, trace and cleanup. |
| V20 BoxPayloads | [driver:209](../../../test/compound-assignment.ts#L209) | Literal Value vectors and conversion setup; result, stored Value, hints, trace and cleanup. |
| V21 CanonicalHints | [driver:209](../../../test/compound-assignment.ts#L209) | Literal Value vectors and conversion setup; result, stored Value, hints, trace and cleanup. |
| V22 SymbolThenRightHook | [driver:209](../../../test/compound-assignment.ts#L209) | Literal Value vectors and conversion setup; result, stored Value, hints, trace and cleanup. |
| V23 HookSymbolThenRightHook | [driver:209](../../../test/compound-assignment.ts#L209) | Literal Value vectors and conversion setup; result, stored Value, hints, trace and cleanup. |
| V24 LeftThrow | [driver:209](../../../test/compound-assignment.ts#L209) | Literal Value vectors and conversion setup; result, stored Value, hints, trace and cleanup. |
| V25 RightThrow | [driver:209](../../../test/compound-assignment.ts#L209) | Literal Value vectors and conversion setup; result, stored Value, hints, trace and cleanup. |
| V26 NoncallableProtocol | [driver:209](../../../test/compound-assignment.ts#L209) | Literal Value vectors and conversion setup; result, stored Value, hints, trace and cleanup. |
| V27 ObjectProtocolResult | [driver:209](../../../test/compound-assignment.ts#L209) | Literal Value vectors and conversion setup; result, stored Value, hints, trace and cleanup. |
| V28 OrdinaryOrder | [driver:209](../../../test/compound-assignment.ts#L209) | Literal Value vectors and conversion setup; result, stored Value, hints, trace and cleanup. |
| V29 OrdinarySkip | [driver:209](../../../test/compound-assignment.ts#L209) | Literal Value vectors and conversion setup; result, stored Value, hints, trace and cleanup. |
| V30 OrdinaryExhaustion | [driver:209](../../../test/compound-assignment.ts#L209) | Literal Value vectors and conversion setup; result, stored Value, hints, trace and cleanup. |
| V31 DefaultVsNumber | [driver:209](../../../test/compound-assignment.ts#L209) | Literal Value vectors and conversion setup; result, stored Value, hints, trace and cleanup. |
| V32 CapturedRight | [driver:209](../../../test/compound-assignment.ts#L209) | Literal Value vectors and conversion setup; result, stored Value, hints, trace and cleanup. |
| E1 Once | [driver:335](../../../test/compound-assignment.ts#L335) | Reference/effect scenarios; stage prefixes, capture, dispatch keys/Receivers, binding and direct-reference retries. |
| E2 Operands | [driver:335](../../../test/compound-assignment.ts#L335) | Reference/effect scenarios; stage prefixes, capture, dispatch keys/Receivers, binding and direct-reference retries. |
| E3 BaseThrow | [driver:335](../../../test/compound-assignment.ts#L335) | Reference/effect scenarios; stage prefixes, capture, dispatch keys/Receivers, binding and direct-reference retries. |
| E4 KeyEvalThrow | [driver:335](../../../test/compound-assignment.ts#L335) | Reference/effect scenarios; stage prefixes, capture, dispatch keys/Receivers, binding and direct-reference retries. |
| E5 NullKeyEval | [driver:335](../../../test/compound-assignment.ts#L335) | Reference/effect scenarios; stage prefixes, capture, dispatch keys/Receivers, binding and direct-reference retries. |
| E6 NullGet | [driver:335](../../../test/compound-assignment.ts#L335) | Reference/effect scenarios; stage prefixes, capture, dispatch keys/Receivers, binding and direct-reference retries. |
| E7 KeyThrow | [driver:335](../../../test/compound-assignment.ts#L335) | Reference/effect scenarios; stage prefixes, capture, dispatch keys/Receivers, binding and direct-reference retries. |
| E8 GetThrow | [driver:335](../../../test/compound-assignment.ts#L335) | Reference/effect scenarios; stage prefixes, capture, dispatch keys/Receivers, binding and direct-reference retries. |
| E9 RHSThrow | [driver:335](../../../test/compound-assignment.ts#L335) | Reference/effect scenarios; stage prefixes, capture, dispatch keys/Receivers, binding and direct-reference retries. |
| E10 LeftThrowBeforeWrite | [driver:335](../../../test/compound-assignment.ts#L335) | Reference/effect scenarios; stage prefixes, capture, dispatch keys/Receivers, binding and direct-reference retries. |
| E11 RightThrowBeforeWrite | [driver:335](../../../test/compound-assignment.ts#L335) | Reference/effect scenarios; stage prefixes, capture, dispatch keys/Receivers, binding and direct-reference retries. |
| E12 SetThrow | [driver:335](../../../test/compound-assignment.ts#L335) | Reference/effect scenarios; stage prefixes, capture, dispatch keys/Receivers, binding and direct-reference retries. |
| E13 SetFalse | [driver:335](../../../test/compound-assignment.ts#L335) | Reference/effect scenarios; stage prefixes, capture, dispatch keys/Receivers, binding and direct-reference retries. |
| E14 RHSReplaceBase | [driver:335](../../../test/compound-assignment.ts#L335) | Reference/effect scenarios; stage prefixes, capture, dispatch keys/Receivers, binding and direct-reference retries. |
| E15 RHSReplaceKey | [driver:335](../../../test/compound-assignment.ts#L335) | Reference/effect scenarios; stage prefixes, capture, dispatch keys/Receivers, binding and direct-reference retries. |
| E16 GetReplaceKey | [driver:335](../../../test/compound-assignment.ts#L335) | Reference/effect scenarios; stage prefixes, capture, dispatch keys/Receivers, binding and direct-reference retries. |
| E17 RHSReplaceProperty | [driver:335](../../../test/compound-assignment.ts#L335) | Reference/effect scenarios; stage prefixes, capture, dispatch keys/Receivers, binding and direct-reference retries. |
| E18 RHSMutateOld | [driver:335](../../../test/compound-assignment.ts#L335) | Reference/effect scenarios; stage prefixes, capture, dispatch keys/Receivers, binding and direct-reference retries. |
| E19 RHSRebindOld | [driver:335](../../../test/compound-assignment.ts#L335) | Reference/effect scenarios; stage prefixes, capture, dispatch keys/Receivers, binding and direct-reference retries. |
| E20 RHSDeletes | [driver:335](../../../test/compound-assignment.ts#L335) | Reference/effect scenarios; stage prefixes, capture, dispatch keys/Receivers, binding and direct-reference retries. |
| E21 RHSFreeze | [driver:335](../../../test/compound-assignment.ts#L335) | Reference/effect scenarios; stage prefixes, capture, dispatch keys/Receivers, binding and direct-reference retries. |
| E22 RHSFreezeAndThrow | [driver:335](../../../test/compound-assignment.ts#L335) | Reference/effect scenarios; stage prefixes, capture, dispatch keys/Receivers, binding and direct-reference retries. |
| E23 MissingBinding | [driver:420](../../../test/compound-assignment.ts#L420) | Reference/effect scenarios; stage prefixes, capture, dispatch keys/Receivers, binding and direct-reference retries. |
| E24 TDZ | [driver:420](../../../test/compound-assignment.ts#L420) | Reference/effect scenarios; stage prefixes, capture, dispatch keys/Receivers, binding and direct-reference retries. |
| E25 Immutable | [driver:420](../../../test/compound-assignment.ts#L420) | Reference/effect scenarios; stage prefixes, capture, dispatch keys/Receivers, binding and direct-reference retries. |
| E26 ImmutableRHS | [driver:420](../../../test/compound-assignment.ts#L420) | Reference/effect scenarios; stage prefixes, capture, dispatch keys/Receivers, binding and direct-reference retries. |
| E27 ImmutableCoercion | [driver:420](../../../test/compound-assignment.ts#L420) | Reference/effect scenarios; stage prefixes, capture, dispatch keys/Receivers, binding and direct-reference retries. |
| E28 LexicalCapture | [driver:420](../../../test/compound-assignment.ts#L420) | Reference/effect scenarios; stage prefixes, capture, dispatch keys/Receivers, binding and direct-reference retries. |
| E29 SymbolKey | [driver:446](../../../test/compound-assignment.ts#L446) | Reference/effect scenarios; stage prefixes, capture, dispatch keys/Receivers, binding and direct-reference retries. |
| E30 PrimitiveKey | [driver:446](../../../test/compound-assignment.ts#L446) | Reference/effect scenarios; stage prefixes, capture, dispatch keys/Receivers, binding and direct-reference retries. |
| E31 SameRefSuccess | [driver:462](../../../test/compound-assignment.ts#L462) | Reference/effect scenarios; stage prefixes, capture, dispatch keys/Receivers, binding and direct-reference retries. |
| E32 SameRefGetFailure | [driver:462](../../../test/compound-assignment.ts#L462) | Reference/effect scenarios; stage prefixes, capture, dispatch keys/Receivers, binding and direct-reference retries. |
| E33 SameRefKeyFailure | [driver:462](../../../test/compound-assignment.ts#L462) | Reference/effect scenarios; stage prefixes, capture, dispatch keys/Receivers, binding and direct-reference retries. |
| E34 SameRefWriteFailure | [driver:462](../../../test/compound-assignment.ts#L462) | Reference/effect scenarios; stage prefixes, capture, dispatch keys/Receivers, binding and direct-reference retries. |
| W1 OwnWritable | [driver:592](../../../test/compound-assignment.ts#L592) | Descriptor/extensibility, eight primitive bases, real boxes and Array dispatch scenarios. |
| W2 InheritedWritable | [driver:592](../../../test/compound-assignment.ts#L592) | Descriptor/extensibility, eight primitive bases, real boxes and Array dispatch scenarios. |
| W3 OwnReadonly | [driver:592](../../../test/compound-assignment.ts#L592) | Descriptor/extensibility, eight primitive bases, real boxes and Array dispatch scenarios. |
| W4 InheritedReadonly | [driver:592](../../../test/compound-assignment.ts#L592) | Descriptor/extensibility, eight primitive bases, real boxes and Array dispatch scenarios. |
| W5 NonextensibleExisting | [driver:592](../../../test/compound-assignment.ts#L592) | Descriptor/extensibility, eight primitive bases, real boxes and Array dispatch scenarios. |
| W6 NonextensibleMissing | [driver:592](../../../test/compound-assignment.ts#L592) | Descriptor/extensibility, eight primitive bases, real boxes and Array dispatch scenarios. |
| W7 MissingExtensible | [driver:592](../../../test/compound-assignment.ts#L592) | Descriptor/extensibility, eight primitive bases, real boxes and Array dispatch scenarios. |
| W8 PrimitiveInherited | [driver:592](../../../test/compound-assignment.ts#L592) | Descriptor/extensibility, eight primitive bases, real boxes and Array dispatch scenarios. |
| W9 PrimitiveMissing | [driver:592](../../../test/compound-assignment.ts#L592) | Descriptor/extensibility, eight primitive bases, real boxes and Array dispatch scenarios. |
| W10 PrimitiveReadonly | [driver:592](../../../test/compound-assignment.ts#L592) | Descriptor/extensibility, eight primitive bases, real boxes and Array dispatch scenarios. |
| W11 StringIndex | [driver:592](../../../test/compound-assignment.ts#L592) | Descriptor/extensibility, eight primitive bases, real boxes and Array dispatch scenarios. |
| W12 StringLength | [driver:592](../../../test/compound-assignment.ts#L592) | Descriptor/extensibility, eight primitive bases, real boxes and Array dispatch scenarios. |
| W13 StringUTF16 | [driver:592](../../../test/compound-assignment.ts#L592) | Descriptor/extensibility, eight primitive bases, real boxes and Array dispatch scenarios. |
| W14 Nullish | [driver:592](../../../test/compound-assignment.ts#L592) | Descriptor/extensibility, eight primitive bases, real boxes and Array dispatch scenarios. |
| W15 PrimitiveSymbolOld | [driver:592](../../../test/compound-assignment.ts#L592) | Descriptor/extensibility, eight primitive bases, real boxes and Array dispatch scenarios. |
| W16 ArrayIndex | [driver:592](../../../test/compound-assignment.ts#L592) | Descriptor/extensibility, eight primitive bases, real boxes and Array dispatch scenarios. |
| W17 ArrayNewIndex | [driver:592](../../../test/compound-assignment.ts#L592) | Descriptor/extensibility, eight primitive bases, real boxes and Array dispatch scenarios. |
| W18 ArrayFrozenGrowth | [driver:592](../../../test/compound-assignment.ts#L592) | Descriptor/extensibility, eight primitive bases, real boxes and Array dispatch scenarios. |
| W19 ArrayLengthArithmetic | [driver:592](../../../test/compound-assignment.ts#L592) | Descriptor/extensibility, eight primitive bases, real boxes and Array dispatch scenarios. |
| W20 ArrayLengthString | [driver:592](../../../test/compound-assignment.ts#L592) | Descriptor/extensibility, eight primitive bases, real boxes and Array dispatch scenarios. |
| W21 ArrayInvalidLength | [driver:592](../../../test/compound-assignment.ts#L592) | Descriptor/extensibility, eight primitive bases, real boxes and Array dispatch scenarios. |
| W22 ArrayPartialShrink | [driver:592](../../../test/compound-assignment.ts#L592) | Descriptor/extensibility, eight primitive bases, real boxes and Array dispatch scenarios. |
| W23 ArrayReadonlyLength | [driver:592](../../../test/compound-assignment.ts#L592) | Descriptor/extensibility, eight primitive bases, real boxes and Array dispatch scenarios. |
| W24 ArrayRightHook | [driver:592](../../../test/compound-assignment.ts#L592) | Descriptor/extensibility, eight primitive bases, real boxes and Array dispatch scenarios. |
| W25 BoxObjectControl | [driver:592](../../../test/compound-assignment.ts#L592) | Descriptor/extensibility, eight primitive bases, real boxes and Array dispatch scenarios. |
| P1 Tokens | [driver:762](../../../test/compound-assignment.ts#L762) | Token offsets, parse diagnostics with whole-program prefix variants, parsed AST and execution. |
| P2 Adjacent | [driver:762](../../../test/compound-assignment.ts#L762) | Token offsets, parse diagnostics with whole-program prefix variants, parsed AST and execution. |
| P3 Comments | [driver:762](../../../test/compound-assignment.ts#L762) | Token offsets, parse diagnostics with whole-program prefix variants, parsed AST and execution. |
| P4 SpacedToken | [driver:762](../../../test/compound-assignment.ts#L762) | Token offsets, parse diagnostics with whole-program prefix variants, parsed AST and execution. |
| P5 MissingRHS | [driver:762](../../../test/compound-assignment.ts#L762) | Token offsets, parse diagnostics with whole-program prefix variants, parsed AST and execution. |
| P6 InvalidLiteral | [driver:762](../../../test/compound-assignment.ts#L762) | Token offsets, parse diagnostics with whole-program prefix variants, parsed AST and execution. |
| P7 InvalidBinary | [driver:762](../../../test/compound-assignment.ts#L762) | Token offsets, parse diagnostics with whole-program prefix variants, parsed AST and execution. |
| P8 InvalidCall | [driver:762](../../../test/compound-assignment.ts#L762) | Token offsets, parse diagnostics with whole-program prefix variants, parsed AST and execution. |
| P9 ParenthesizedTarget | [driver:762](../../../test/compound-assignment.ts#L762) | Token offsets, parse diagnostics with whole-program prefix variants, parsed AST and execution. |
| P10 RightAssociative | [driver:762](../../../test/compound-assignment.ts#L762) | Token offsets, parse diagnostics with whole-program prefix variants, parsed AST and execution. |
| P11 MixedAssign | [driver:762](../../../test/compound-assignment.ts#L762) | Token offsets, parse diagnostics with whole-program prefix variants, parsed AST and execution. |
| P12 OuterAssign | [driver:762](../../../test/compound-assignment.ts#L762) | Token offsets, parse diagnostics with whole-program prefix variants, parsed AST and execution. |
| P13 ConditionalRHS | [driver:762](../../../test/compound-assignment.ts#L762) | Token offsets, parse diagnostics with whole-program prefix variants, parsed AST and execution. |
| P14 ConditionalArm | [driver:762](../../../test/compound-assignment.ts#L762) | Token offsets, parse diagnostics with whole-program prefix variants, parsed AST and execution. |
| P15 MultiplicativeRHS | [driver:762](../../../test/compound-assignment.ts#L762) | Token offsets, parse diagnostics with whole-program prefix variants, parsed AST and execution. |
| P16 ArrayElement | [driver:762](../../../test/compound-assignment.ts#L762) | Token offsets, parse diagnostics with whole-program prefix variants, parsed AST and execution. |
| P17 StillUnsupported | [driver:762](../../../test/compound-assignment.ts#L762) | Token offsets, parse diagnostics with whole-program prefix variants, parsed AST and execution. |
| P18 LogicalExcluded | [driver:762](../../../test/compound-assignment.ts#L762) | Token offsets, parse diagnostics with whole-program prefix variants, parsed AST and execution. |
| P19 BitwiseExcluded | [driver:762](../../../test/compound-assignment.ts#L762) | Token offsets, parse diagnostics with whole-program prefix variants, parsed AST and execution. |
| P20 UpdatesExcluded | [driver:762](../../../test/compound-assignment.ts#L762) | Token offsets, parse diagnostics with whole-program prefix variants, parsed AST and execution. |
| P21 LongEquality | [driver:762](../../../test/compound-assignment.ts#L762) | Token offsets, parse diagnostics with whole-program prefix variants, parsed AST and execution. |
| P22 ExtraEquals | [driver:762](../../../test/compound-assignment.ts#L762) | Token offsets, parse diagnostics with whole-program prefix variants, parsed AST and execution. |
| P23 LineTerminators | [driver:762](../../../test/compound-assignment.ts#L762) | Token offsets, parse diagnostics with whole-program prefix variants, parsed AST and execution. |
| P24 SourceRetention | [driver:762](../../../test/compound-assignment.ts#L762) | Token offsets, parse diagnostics with whole-program prefix variants, parsed AST and execution. |
| P25 Nesting | [driver:762](../../../test/compound-assignment.ts#L762) | Token offsets, parse diagnostics with whole-program prefix variants, parsed AST and execution. |
| L1 Binding | [driver:847](../../../test/compound-assignment.ts#L847) | Reference versus operation versus child locations, exact sentinels and Array errors. |
| L2 Parenthesis | [driver:847](../../../test/compound-assignment.ts#L847) | Reference versus operation versus child locations, exact sentinels and Array errors. |
| L3 Dispatch | [driver:847](../../../test/compound-assignment.ts#L847) | Reference versus operation versus child locations, exact sentinels and Array errors. |
| L4 Coercion | [driver:847](../../../test/compound-assignment.ts#L847) | Reference versus operation versus child locations, exact sentinels and Array errors. |
| L5 PutFalse | [driver:847](../../../test/compound-assignment.ts#L847) | Reference versus operation versus child locations, exact sentinels and Array errors. |
| L6 RHSChild | [driver:847](../../../test/compound-assignment.ts#L847) | Reference versus operation versus child locations, exact sentinels and Array errors. |
| L7 KeyChild | [driver:847](../../../test/compound-assignment.ts#L847) | Reference versus operation versus child locations, exact sentinels and Array errors. |
| L8 BaseChild | [driver:847](../../../test/compound-assignment.ts#L847) | Reference versus operation versus child locations, exact sentinels and Array errors. |
| L9 Sentinel | [driver:847](../../../test/compound-assignment.ts#L847) | Reference versus operation versus child locations, exact sentinels and Array errors. |
| L10 Array | [driver:847](../../../test/compound-assignment.ts#L847) | Reference versus operation versus child locations, exact sentinels and Array errors. |
| R1 Plain | [driver:897](../../../test/compound-assignment.ts#L897) | Literal resource table and recursionGroup entries; admitted calls, RHS/Get counts, no Set, peaks and cleanup. |
| R2 StatementGuard | [driver:897](../../../test/compound-assignment.ts#L897) | Literal resource table and recursionGroup entries; admitted calls, RHS/Get counts, no Set, peaks and cleanup. |
| R3 CompoundGuard | [driver:897](../../../test/compound-assignment.ts#L897) | Literal resource table and recursionGroup entries; admitted calls, RHS/Get counts, no Set, peaks and cleanup. |
| R4 BaseGuard | [driver:897](../../../test/compound-assignment.ts#L897) | Literal resource table and recursionGroup entries; admitted calls, RHS/Get counts, no Set, peaks and cleanup. |
| R5 KeyGuard | [driver:897](../../../test/compound-assignment.ts#L897) | Literal resource table and recursionGroup entries; admitted calls, RHS/Get counts, no Set, peaks and cleanup. |
| R6 RHSGuard | [driver:897](../../../test/compound-assignment.ts#L897) | Literal resource table and recursionGroup entries; admitted calls, RHS/Get counts, no Set, peaks and cleanup. |
| R7 Exact | [driver:897](../../../test/compound-assignment.ts#L897) | Literal resource table and recursionGroup entries; admitted calls, RHS/Get counts, no Set, peaks and cleanup. |
| R8 Binding | [driver:897](../../../test/compound-assignment.ts#L897) | Literal resource table and recursionGroup entries; admitted calls, RHS/Get counts, no Set, peaks and cleanup. |
| R9 Nullish | [driver:897](../../../test/compound-assignment.ts#L897) | Literal resource table and recursionGroup entries; admitted calls, RHS/Get counts, no Set, peaks and cleanup. |
| R10 CanonicalKey | [driver:897](../../../test/compound-assignment.ts#L897) | Literal resource table and recursionGroup entries; admitted calls, RHS/Get counts, no Set, peaks and cleanup. |
| R11 OrdinaryKey | [driver:897](../../../test/compound-assignment.ts#L897) | Literal resource table and recursionGroup entries; admitted calls, RHS/Get counts, no Set, peaks and cleanup. |
| R12 FallbackKey | [driver:897](../../../test/compound-assignment.ts#L897) | Literal resource table and recursionGroup entries; admitted calls, RHS/Get counts, no Set, peaks and cleanup. |
| R13 KeyStep | [driver:897](../../../test/compound-assignment.ts#L897) | Literal resource table and recursionGroup entries; admitted calls, RHS/Get counts, no Set, peaks and cleanup. |
| R14 KeyCall | [driver:897](../../../test/compound-assignment.ts#L897) | Literal resource table and recursionGroup entries; admitted calls, RHS/Get counts, no Set, peaks and cleanup. |
| R15 OldHook | [driver:897](../../../test/compound-assignment.ts#L897) | Literal resource table and recursionGroup entries; admitted calls, RHS/Get counts, no Set, peaks and cleanup. |
| R16 BothHooks | [driver:897](../../../test/compound-assignment.ts#L897) | Literal resource table and recursionGroup entries; admitted calls, RHS/Get counts, no Set, peaks and cleanup. |
| R17 OldStep | [driver:897](../../../test/compound-assignment.ts#L897) | Literal resource table and recursionGroup entries; admitted calls, RHS/Get counts, no Set, peaks and cleanup. |
| R18 OldCall | [driver:897](../../../test/compound-assignment.ts#L897) | Literal resource table and recursionGroup entries; admitted calls, RHS/Get counts, no Set, peaks and cleanup. |
| R19 RHSCallee | [driver:897](../../../test/compound-assignment.ts#L897) | Literal resource table and recursionGroup entries; admitted calls, RHS/Get counts, no Set, peaks and cleanup. |
| R20 RHSCallGuard | [driver:897](../../../test/compound-assignment.ts#L897) | Literal resource table and recursionGroup entries; admitted calls, RHS/Get counts, no Set, peaks and cleanup. |
| R21 SeedDepth | [driver:897](../../../test/compound-assignment.ts#L897) | Literal resource table and recursionGroup entries; admitted calls, RHS/Get counts, no Set, peaks and cleanup. |
| R22 ChildDepth | [driver:897](../../../test/compound-assignment.ts#L897) | Literal resource table and recursionGroup entries; admitted calls, RHS/Get counts, no Set, peaks and cleanup. |
| R23 StepBeforeDepth | [driver:897](../../../test/compound-assignment.ts#L897) | Literal resource table and recursionGroup entries; admitted calls, RHS/Get counts, no Set, peaks and cleanup. |
| R24 Primitive | [driver:897](../../../test/compound-assignment.ts#L897) | Literal resource table and recursionGroup entries; admitted calls, RHS/Get counts, no Set, peaks and cleanup. |
| R25 PrimitiveKey | [driver:897](../../../test/compound-assignment.ts#L897) | Literal resource table and recursionGroup entries; admitted calls, RHS/Get counts, no Set, peaks and cleanup. |
| R26 PrimitiveRHSGuard | [driver:897](../../../test/compound-assignment.ts#L897) | Literal resource table and recursionGroup entries; admitted calls, RHS/Get counts, no Set, peaks and cleanup. |
| R27 Monotonic | [driver:897](../../../test/compound-assignment.ts#L897) | Literal resource table and recursionGroup entries; admitted calls, RHS/Get counts, no Set, peaks and cleanup. |
| R28 DirectReference | [driver:897](../../../test/compound-assignment.ts#L897) | Literal resource table and recursionGroup entries; admitted calls, RHS/Get counts, no Set, peaks and cleanup. |
| R29 KeyHostSmall | [driver:1080](../../../test/compound-assignment.ts#L1080) | Literal resource table and recursionGroup entries; admitted calls, RHS/Get counts, no Set, peaks and cleanup. |
| R30 KeyHostDefault | [driver:1080](../../../test/compound-assignment.ts#L1080) | Literal resource table and recursionGroup entries; admitted calls, RHS/Get counts, no Set, peaks and cleanup. |
| R31 KeyGuestSmall | [driver:1080](../../../test/compound-assignment.ts#L1080) | Literal resource table and recursionGroup entries; admitted calls, RHS/Get counts, no Set, peaks and cleanup. |
| R32 KeyGuestDefault | [driver:1080](../../../test/compound-assignment.ts#L1080) | Literal resource table and recursionGroup entries; admitted calls, RHS/Get counts, no Set, peaks and cleanup. |
| R33 KeyStepBeforeCall | [driver:1080](../../../test/compound-assignment.ts#L1080) | Literal resource table and recursionGroup entries; admitted calls, RHS/Get counts, no Set, peaks and cleanup. |
| R34 CoercionHostSmall | [driver:1080](../../../test/compound-assignment.ts#L1080) | Literal resource table and recursionGroup entries; admitted calls, RHS/Get counts, no Set, peaks and cleanup. |
| R35 CoercionHostDefault | [driver:1080](../../../test/compound-assignment.ts#L1080) | Literal resource table and recursionGroup entries; admitted calls, RHS/Get counts, no Set, peaks and cleanup. |
| R36 CoercionGuestSmall | [driver:1080](../../../test/compound-assignment.ts#L1080) | Literal resource table and recursionGroup entries; admitted calls, RHS/Get counts, no Set, peaks and cleanup. |
| R37 CoercionGuestDefault | [driver:1080](../../../test/compound-assignment.ts#L1080) | Literal resource table and recursionGroup entries; admitted calls, RHS/Get counts, no Set, peaks and cleanup. |
| R38 RightRecursion | [driver:1080](../../../test/compound-assignment.ts#L1080) | Literal resource table and recursionGroup entries; admitted calls, RHS/Get counts, no Set, peaks and cleanup. |
| R39 PrimitiveRecursive | [driver:1080](../../../test/compound-assignment.ts#L1080) | Literal resource table and recursionGroup entries; admitted calls, RHS/Get counts, no Set, peaks and cleanup. |
| R40 ExhaustedRetry | [driver:1080](../../../test/compound-assignment.ts#L1080) | Literal resource table and recursionGroup entries; admitted calls, RHS/Get counts, no Set, peaks and cleanup. |
| C1 ForeignKey | [driver:1195](../../../test/compound-assignment.ts#L1195) | Foreign Realm scenarios, all-stage abrupt/fault loops, seeded cleanup and postfailure reuse; recursion groups for C9/C10. |
| C2 ForeignOperands | [driver:1195](../../../test/compound-assignment.ts#L1195) | Foreign Realm scenarios, all-stage abrupt/fault loops, seeded cleanup and postfailure reuse; recursion groups for C9/C10. |
| C3 ForeignRHS | [driver:1195](../../../test/compound-assignment.ts#L1195) | Foreign Realm scenarios, all-stage abrupt/fault loops, seeded cleanup and postfailure reuse; recursion groups for C9/C10. |
| C4 PrimitiveBoxes | [driver:1195](../../../test/compound-assignment.ts#L1195) | Foreign Realm scenarios, all-stage abrupt/fault loops, seeded cleanup and postfailure reuse; recursion groups for C9/C10. |
| C5 ForeignObject | [driver:1195](../../../test/compound-assignment.ts#L1195) | Foreign Realm scenarios, all-stage abrupt/fault loops, seeded cleanup and postfailure reuse; recursion groups for C9/C10. |
| C6 GuestAbrupt | [driver:1257](../../../test/compound-assignment.ts#L1257) | Foreign Realm scenarios, all-stage abrupt/fault loops, seeded cleanup and postfailure reuse; recursion groups for C9/C10. |
| C7 HostFault | [driver:1257](../../../test/compound-assignment.ts#L1257) | Foreign Realm scenarios, all-stage abrupt/fault loops, seeded cleanup and postfailure reuse; recursion groups for C9/C10. |
| C8 ForeignFault | [driver:1257](../../../test/compound-assignment.ts#L1257) | Foreign Realm scenarios, all-stage abrupt/fault loops, seeded cleanup and postfailure reuse; recursion groups for C9/C10. |
| C9 RecursiveRealm | [driver:1080](../../../test/compound-assignment.ts#L1080) | Foreign Realm scenarios, all-stage abrupt/fault loops, seeded cleanup and postfailure reuse; recursion groups for C9/C10. |
| C10 RecursiveBoxes | [driver:1080](../../../test/compound-assignment.ts#L1080) | Foreign Realm scenarios, all-stage abrupt/fault loops, seeded cleanup and postfailure reuse; recursion groups for C9/C10. |
| C11 SeededCleanup | [driver:1257](../../../test/compound-assignment.ts#L1257) | Foreign Realm scenarios, all-stage abrupt/fault loops, seeded cleanup and postfailure reuse; recursion groups for C9/C10. |
| C12 PostFailure | [driver:1257](../../../test/compound-assignment.ts#L1257) | Foreign Realm scenarios, all-stage abrupt/fault loops, seeded cleanup and postfailure reuse; recursion groups for C9/C10. |

Disk-read CLI mapping: compound-basic.js covers V1/all five operators; compound-effects.js E1/E17 and saved key; compound-get-failure.js E6; compound-write-failure.js conversion before W3 rejection; compound-coercion-failure.js E11; compound-parse.js P6 whole-file rejection; compound-retention.js P24. Literal expected stdout/stderr/status are registered in tools/run-guests.mjs.

Additional variants: V16–V32 run each operator; E30 string/numeric/symbol keys; W8–W10 all eight bases; W13 both UTF-16 units (Add); W14 both nullish bases; W21 four invalid operations; W25 four actual box classes; P17–P23 every explicit token/line-ending variant; R9 both nullish bases; R29–R39 small0/1/2 and omitted-constructor-limit64; R38 both host/guest right hooks; C9/C10 host/guest plus key/old/right as applicable; C6–C8 both abrupt and host fault and calls2/depth4 seeds; C12 same evaluator after every failure.
