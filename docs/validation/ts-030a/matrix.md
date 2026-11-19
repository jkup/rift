# TS-030A executable row mapping

Every named row below runs in `test/compound-assignment.ts`, compiled and executed
under Node and native Rift. The driver has explicit five-operator loops (Add/Sub/Mul/Div/Rem),
literal vectors and named setup/action/assertion blocks. Restricted variants retain
the exact operator/subcase set in the frozen matrix. No expected vector calls binary().

| Frozen row | Driver entry | Assertions / variants |
|---|---|---|
| V1 Numbers | [driver:215](../../../test/compound-assignment.ts#L215) | Literal Value vectors and conversion setup; result, stored Value, hints, trace and cleanup. |
| V2 LeftString | [driver:215](../../../test/compound-assignment.ts#L215) | Literal Value vectors and conversion setup; result, stored Value, hints, trace and cleanup. |
| V3 RightString | [driver:215](../../../test/compound-assignment.ts#L215) | Literal Value vectors and conversion setup; result, stored Value, hints, trace and cleanup. |
| V4 Booleans | [driver:215](../../../test/compound-assignment.ts#L215) | Literal Value vectors and conversion setup; result, stored Value, hints, trace and cleanup. |
| V5 Null | [driver:215](../../../test/compound-assignment.ts#L215) | Literal Value vectors and conversion setup; result, stored Value, hints, trace and cleanup. |
| V6 Undefined | [driver:215](../../../test/compound-assignment.ts#L215) | Literal Value vectors and conversion setup; result, stored Value, hints, trace and cleanup. |
| V7 NaN | [driver:215](../../../test/compound-assignment.ts#L215) | Literal Value vectors and conversion setup; result, stored Value, hints, trace and cleanup. |
| V8 Infinity | [driver:215](../../../test/compound-assignment.ts#L215) | Literal Value vectors and conversion setup; result, stored Value, hints, trace and cleanup. |
| V9 BothInfinity | [driver:215](../../../test/compound-assignment.ts#L215) | Literal Value vectors and conversion setup; result, stored Value, hints, trace and cleanup. |
| V10 NegativeZero | [driver:215](../../../test/compound-assignment.ts#L215) | Literal Value vectors and conversion setup; result, stored Value, hints, trace and cleanup. |
| V11 BothNegativeZero | [driver:215](../../../test/compound-assignment.ts#L215) | Literal Value vectors and conversion setup; result, stored Value, hints, trace and cleanup. |
| V12 NegativeDivisor | [driver:215](../../../test/compound-assignment.ts#L215) | Literal Value vectors and conversion setup; result, stored Value, hints, trace and cleanup. |
| V13 NegativeDividend | [driver:215](../../../test/compound-assignment.ts#L215) | Literal Value vectors and conversion setup; result, stored Value, hints, trace and cleanup. |
| V14 InvalidNumericString | [driver:215](../../../test/compound-assignment.ts#L215) | Literal Value vectors and conversion setup; result, stored Value, hints, trace and cleanup. |
| V15 WhitespaceString | [driver:215](../../../test/compound-assignment.ts#L215) | Literal Value vectors and conversion setup; result, stored Value, hints, trace and cleanup. |
| V16 SymbolLeft | [driver:215](../../../test/compound-assignment.ts#L215) | Literal Value vectors and conversion setup; result, stored Value, hints, trace and cleanup. |
| V17 SymbolRight | [driver:215](../../../test/compound-assignment.ts#L215) | Literal Value vectors and conversion setup; result, stored Value, hints, trace and cleanup. |
| V18 StringSymbol | [driver:215](../../../test/compound-assignment.ts#L215) | Literal Value vectors and conversion setup; result, stored Value, hints, trace and cleanup. |
| V19 SymbolString | [driver:215](../../../test/compound-assignment.ts#L215) | Literal Value vectors and conversion setup; result, stored Value, hints, trace and cleanup. |
| V20 BoxPayloads | [driver:215](../../../test/compound-assignment.ts#L215) | Literal Value vectors and conversion setup; result, stored Value, hints, trace and cleanup. |
| V21 CanonicalHints | [driver:215](../../../test/compound-assignment.ts#L215) | Literal Value vectors and conversion setup; result, stored Value, hints, trace and cleanup. |
| V22 SymbolThenRightHook | [driver:215](../../../test/compound-assignment.ts#L215) | Literal Value vectors and conversion setup; result, stored Value, hints, trace and cleanup. |
| V23 HookSymbolThenRightHook | [driver:215](../../../test/compound-assignment.ts#L215) | Literal Value vectors and conversion setup; result, stored Value, hints, trace and cleanup. |
| V24 LeftThrow | [driver:215](../../../test/compound-assignment.ts#L215) | Literal Value vectors and conversion setup; result, stored Value, hints, trace and cleanup. |
| V25 RightThrow | [driver:215](../../../test/compound-assignment.ts#L215) | Literal Value vectors and conversion setup; result, stored Value, hints, trace and cleanup. |
| V26 NoncallableProtocol | [driver:215](../../../test/compound-assignment.ts#L215) | Literal Value vectors and conversion setup; result, stored Value, hints, trace and cleanup. |
| V27 ObjectProtocolResult | [driver:215](../../../test/compound-assignment.ts#L215) | Literal Value vectors and conversion setup; result, stored Value, hints, trace and cleanup. |
| V28 OrdinaryOrder | [driver:215](../../../test/compound-assignment.ts#L215) | Literal Value vectors and conversion setup; result, stored Value, hints, trace and cleanup. |
| V29 OrdinarySkip | [driver:215](../../../test/compound-assignment.ts#L215) | Literal Value vectors and conversion setup; result, stored Value, hints, trace and cleanup. |
| V30 OrdinaryExhaustion | [driver:215](../../../test/compound-assignment.ts#L215) | Literal Value vectors and conversion setup; result, stored Value, hints, trace and cleanup. |
| V31 DefaultVsNumber | [driver:215](../../../test/compound-assignment.ts#L215) | Literal Value vectors and conversion setup; result, stored Value, hints, trace and cleanup. |
| V32 CapturedRight | [driver:215](../../../test/compound-assignment.ts#L215) | Literal Value vectors and conversion setup; result, stored Value, hints, trace and cleanup. |
| E1 Once | [driver:341](../../../test/compound-assignment.ts#L341) | Reference/effect scenarios; stage prefixes, capture, dispatch keys/Receivers, binding and direct-reference retries. |
| E2 Operands | [driver:341](../../../test/compound-assignment.ts#L341) | Reference/effect scenarios; stage prefixes, capture, dispatch keys/Receivers, binding and direct-reference retries. |
| E3 BaseThrow | [driver:341](../../../test/compound-assignment.ts#L341) | Reference/effect scenarios; stage prefixes, capture, dispatch keys/Receivers, binding and direct-reference retries. |
| E4 KeyEvalThrow | [driver:341](../../../test/compound-assignment.ts#L341) | Reference/effect scenarios; stage prefixes, capture, dispatch keys/Receivers, binding and direct-reference retries. |
| E5 NullKeyEval | [driver:341](../../../test/compound-assignment.ts#L341) | Reference/effect scenarios; stage prefixes, capture, dispatch keys/Receivers, binding and direct-reference retries. |
| E6 NullGet | [driver:341](../../../test/compound-assignment.ts#L341) | Reference/effect scenarios; stage prefixes, capture, dispatch keys/Receivers, binding and direct-reference retries. |
| E7 KeyThrow | [driver:341](../../../test/compound-assignment.ts#L341) | Reference/effect scenarios; stage prefixes, capture, dispatch keys/Receivers, binding and direct-reference retries. |
| E8 GetThrow | [driver:341](../../../test/compound-assignment.ts#L341) | Reference/effect scenarios; stage prefixes, capture, dispatch keys/Receivers, binding and direct-reference retries. |
| E9 RHSThrow | [driver:341](../../../test/compound-assignment.ts#L341) | Reference/effect scenarios; stage prefixes, capture, dispatch keys/Receivers, binding and direct-reference retries. |
| E10 LeftThrowBeforeWrite | [driver:341](../../../test/compound-assignment.ts#L341) | Reference/effect scenarios; stage prefixes, capture, dispatch keys/Receivers, binding and direct-reference retries. |
| E11 RightThrowBeforeWrite | [driver:341](../../../test/compound-assignment.ts#L341) | Reference/effect scenarios; stage prefixes, capture, dispatch keys/Receivers, binding and direct-reference retries. |
| E12 SetThrow | [driver:341](../../../test/compound-assignment.ts#L341) | Reference/effect scenarios; stage prefixes, capture, dispatch keys/Receivers, binding and direct-reference retries. |
| E13 SetFalse | [driver:341](../../../test/compound-assignment.ts#L341) | Reference/effect scenarios; stage prefixes, capture, dispatch keys/Receivers, binding and direct-reference retries. |
| E14 RHSReplaceBase | [driver:341](../../../test/compound-assignment.ts#L341) | Reference/effect scenarios; stage prefixes, capture, dispatch keys/Receivers, binding and direct-reference retries. |
| E15 RHSReplaceKey | [driver:341](../../../test/compound-assignment.ts#L341) | Reference/effect scenarios; stage prefixes, capture, dispatch keys/Receivers, binding and direct-reference retries. |
| E16 GetReplaceKey | [driver:341](../../../test/compound-assignment.ts#L341) | Reference/effect scenarios; stage prefixes, capture, dispatch keys/Receivers, binding and direct-reference retries. |
| E17 RHSReplaceProperty | [driver:341](../../../test/compound-assignment.ts#L341) | Reference/effect scenarios; stage prefixes, capture, dispatch keys/Receivers, binding and direct-reference retries. |
| E18 RHSMutateOld | [driver:341](../../../test/compound-assignment.ts#L341) | Reference/effect scenarios; stage prefixes, capture, dispatch keys/Receivers, binding and direct-reference retries. |
| E19 RHSRebindOld | [driver:341](../../../test/compound-assignment.ts#L341) | Reference/effect scenarios; stage prefixes, capture, dispatch keys/Receivers, binding and direct-reference retries. |
| E20 RHSDeletes | [driver:341](../../../test/compound-assignment.ts#L341) | Reference/effect scenarios; stage prefixes, capture, dispatch keys/Receivers, binding and direct-reference retries. |
| E21 RHSFreeze | [driver:341](../../../test/compound-assignment.ts#L341) | Reference/effect scenarios; stage prefixes, capture, dispatch keys/Receivers, binding and direct-reference retries. |
| E22 RHSFreezeAndThrow | [driver:341](../../../test/compound-assignment.ts#L341) | Reference/effect scenarios; stage prefixes, capture, dispatch keys/Receivers, binding and direct-reference retries. |
| E23 MissingBinding | [driver:429](../../../test/compound-assignment.ts#L429) | Reference/effect scenarios; stage prefixes, capture, dispatch keys/Receivers, binding and direct-reference retries. |
| E24 TDZ | [driver:429](../../../test/compound-assignment.ts#L429) | Reference/effect scenarios; stage prefixes, capture, dispatch keys/Receivers, binding and direct-reference retries. |
| E25 Immutable | [driver:429](../../../test/compound-assignment.ts#L429) | Reference/effect scenarios; stage prefixes, capture, dispatch keys/Receivers, binding and direct-reference retries. |
| E26 ImmutableRHS | [driver:429](../../../test/compound-assignment.ts#L429) | Reference/effect scenarios; stage prefixes, capture, dispatch keys/Receivers, binding and direct-reference retries. |
| E27 ImmutableCoercion | [driver:429](../../../test/compound-assignment.ts#L429) | Reference/effect scenarios; stage prefixes, capture, dispatch keys/Receivers, binding and direct-reference retries. |
| E28 LexicalCapture | [driver:429](../../../test/compound-assignment.ts#L429) | Reference/effect scenarios; stage prefixes, capture, dispatch keys/Receivers, binding and direct-reference retries. |
| E29 SymbolKey | [driver:458](../../../test/compound-assignment.ts#L458) | Reference/effect scenarios; stage prefixes, capture, dispatch keys/Receivers, binding and direct-reference retries. |
| E30 PrimitiveKey | [driver:458](../../../test/compound-assignment.ts#L458) | Reference/effect scenarios; stage prefixes, capture, dispatch keys/Receivers, binding and direct-reference retries. |
| E31 SameRefSuccess | [driver:474](../../../test/compound-assignment.ts#L474) | Reference/effect scenarios; stage prefixes, capture, dispatch keys/Receivers, binding and direct-reference retries. |
| E32 SameRefGetFailure | [driver:474](../../../test/compound-assignment.ts#L474) | Reference/effect scenarios; stage prefixes, capture, dispatch keys/Receivers, binding and direct-reference retries. |
| E33 SameRefKeyFailure | [driver:474](../../../test/compound-assignment.ts#L474) | Reference/effect scenarios; stage prefixes, capture, dispatch keys/Receivers, binding and direct-reference retries. |
| E34 SameRefWriteFailure | [driver:474](../../../test/compound-assignment.ts#L474) | Reference/effect scenarios; stage prefixes, capture, dispatch keys/Receivers, binding and direct-reference retries. |
| W1 OwnWritable | [driver:604](../../../test/compound-assignment.ts#L604) | Descriptor/extensibility, eight primitive bases, real boxes and Array dispatch scenarios. |
| W2 InheritedWritable | [driver:604](../../../test/compound-assignment.ts#L604) | Descriptor/extensibility, eight primitive bases, real boxes and Array dispatch scenarios. |
| W3 OwnReadonly | [driver:604](../../../test/compound-assignment.ts#L604) | Descriptor/extensibility, eight primitive bases, real boxes and Array dispatch scenarios. |
| W4 InheritedReadonly | [driver:604](../../../test/compound-assignment.ts#L604) | Descriptor/extensibility, eight primitive bases, real boxes and Array dispatch scenarios. |
| W5 NonextensibleExisting | [driver:604](../../../test/compound-assignment.ts#L604) | Descriptor/extensibility, eight primitive bases, real boxes and Array dispatch scenarios. |
| W6 NonextensibleMissing | [driver:604](../../../test/compound-assignment.ts#L604) | Descriptor/extensibility, eight primitive bases, real boxes and Array dispatch scenarios. |
| W7 MissingExtensible | [driver:604](../../../test/compound-assignment.ts#L604) | Descriptor/extensibility, eight primitive bases, real boxes and Array dispatch scenarios. |
| W8 PrimitiveInherited | [driver:604](../../../test/compound-assignment.ts#L604) | Descriptor/extensibility, eight primitive bases, real boxes and Array dispatch scenarios. |
| W9 PrimitiveMissing | [driver:604](../../../test/compound-assignment.ts#L604) | Descriptor/extensibility, eight primitive bases, real boxes and Array dispatch scenarios. |
| W10 PrimitiveReadonly | [driver:604](../../../test/compound-assignment.ts#L604) | Descriptor/extensibility, eight primitive bases, real boxes and Array dispatch scenarios. |
| W11 StringIndex | [driver:604](../../../test/compound-assignment.ts#L604) | Descriptor/extensibility, eight primitive bases, real boxes and Array dispatch scenarios. |
| W12 StringLength | [driver:604](../../../test/compound-assignment.ts#L604) | Descriptor/extensibility, eight primitive bases, real boxes and Array dispatch scenarios. |
| W13 StringUTF16 | [driver:604](../../../test/compound-assignment.ts#L604) | Descriptor/extensibility, eight primitive bases, real boxes and Array dispatch scenarios. |
| W14 Nullish | [driver:604](../../../test/compound-assignment.ts#L604) | Descriptor/extensibility, eight primitive bases, real boxes and Array dispatch scenarios. |
| W15 PrimitiveSymbolOld | [driver:604](../../../test/compound-assignment.ts#L604) | Descriptor/extensibility, eight primitive bases, real boxes and Array dispatch scenarios. |
| W16 ArrayIndex | [driver:604](../../../test/compound-assignment.ts#L604) | Descriptor/extensibility, eight primitive bases, real boxes and Array dispatch scenarios. |
| W17 ArrayNewIndex | [driver:604](../../../test/compound-assignment.ts#L604) | Descriptor/extensibility, eight primitive bases, real boxes and Array dispatch scenarios. |
| W18 ArrayFrozenGrowth | [driver:604](../../../test/compound-assignment.ts#L604) | Descriptor/extensibility, eight primitive bases, real boxes and Array dispatch scenarios. |
| W19 ArrayLengthArithmetic | [driver:604](../../../test/compound-assignment.ts#L604) | Descriptor/extensibility, eight primitive bases, real boxes and Array dispatch scenarios. |
| W20 ArrayLengthString | [driver:604](../../../test/compound-assignment.ts#L604) | Descriptor/extensibility, eight primitive bases, real boxes and Array dispatch scenarios. |
| W21 ArrayInvalidLength | [driver:604](../../../test/compound-assignment.ts#L604) | Descriptor/extensibility, eight primitive bases, real boxes and Array dispatch scenarios. |
| W22 ArrayPartialShrink | [driver:604](../../../test/compound-assignment.ts#L604) | Descriptor/extensibility, eight primitive bases, real boxes and Array dispatch scenarios. |
| W23 ArrayReadonlyLength | [driver:604](../../../test/compound-assignment.ts#L604) | Descriptor/extensibility, eight primitive bases, real boxes and Array dispatch scenarios. |
| W24 ArrayRightHook | [driver:604](../../../test/compound-assignment.ts#L604) | Descriptor/extensibility, eight primitive bases, real boxes and Array dispatch scenarios. |
| W25 BoxObjectControl | [driver:604](../../../test/compound-assignment.ts#L604) | Descriptor/extensibility, eight primitive bases, real boxes and Array dispatch scenarios. |
| P1 Tokens | [driver:780](../../../test/compound-assignment.ts#L780) | Token offsets, parse diagnostics with whole-program prefix variants, parsed AST and execution. |
| P2 Adjacent | [driver:780](../../../test/compound-assignment.ts#L780) | Token offsets, parse diagnostics with whole-program prefix variants, parsed AST and execution. |
| P3 Comments | [driver:780](../../../test/compound-assignment.ts#L780) | Token offsets, parse diagnostics with whole-program prefix variants, parsed AST and execution. |
| P4 SpacedToken | [driver:780](../../../test/compound-assignment.ts#L780) | Token offsets, parse diagnostics with whole-program prefix variants, parsed AST and execution. |
| P5 MissingRHS | [driver:780](../../../test/compound-assignment.ts#L780) | Token offsets, parse diagnostics with whole-program prefix variants, parsed AST and execution. |
| P6 InvalidLiteral | [driver:780](../../../test/compound-assignment.ts#L780) | Token offsets, parse diagnostics with whole-program prefix variants, parsed AST and execution. |
| P7 InvalidBinary | [driver:780](../../../test/compound-assignment.ts#L780) | Token offsets, parse diagnostics with whole-program prefix variants, parsed AST and execution. |
| P8 InvalidCall | [driver:780](../../../test/compound-assignment.ts#L780) | Token offsets, parse diagnostics with whole-program prefix variants, parsed AST and execution. |
| P9 ParenthesizedTarget | [driver:780](../../../test/compound-assignment.ts#L780) | Token offsets, parse diagnostics with whole-program prefix variants, parsed AST and execution. |
| P10 RightAssociative | [driver:780](../../../test/compound-assignment.ts#L780) | Token offsets, parse diagnostics with whole-program prefix variants, parsed AST and execution. |
| P11 MixedAssign | [driver:780](../../../test/compound-assignment.ts#L780) | Token offsets, parse diagnostics with whole-program prefix variants, parsed AST and execution. |
| P12 OuterAssign | [driver:780](../../../test/compound-assignment.ts#L780) | Token offsets, parse diagnostics with whole-program prefix variants, parsed AST and execution. |
| P13 ConditionalRHS | [driver:780](../../../test/compound-assignment.ts#L780) | Token offsets, parse diagnostics with whole-program prefix variants, parsed AST and execution. |
| P14 ConditionalArm | [driver:780](../../../test/compound-assignment.ts#L780) | Token offsets, parse diagnostics with whole-program prefix variants, parsed AST and execution. |
| P15 MultiplicativeRHS | [driver:780](../../../test/compound-assignment.ts#L780) | Token offsets, parse diagnostics with whole-program prefix variants, parsed AST and execution. |
| P16 ArrayElement | [driver:780](../../../test/compound-assignment.ts#L780) | Token offsets, parse diagnostics with whole-program prefix variants, parsed AST and execution. |
| P17 StillUnsupported | [driver:780](../../../test/compound-assignment.ts#L780) | Token offsets, parse diagnostics with whole-program prefix variants, parsed AST and execution. |
| P18 LogicalExcluded | [driver:780](../../../test/compound-assignment.ts#L780) | Token offsets, parse diagnostics with whole-program prefix variants, parsed AST and execution. |
| P19 BitwiseExcluded | [driver:780](../../../test/compound-assignment.ts#L780) | Token offsets, parse diagnostics with whole-program prefix variants, parsed AST and execution. |
| P20 UpdatesExcluded | [driver:780](../../../test/compound-assignment.ts#L780) | Token offsets, parse diagnostics with whole-program prefix variants, parsed AST and execution. |
| P21 LongEquality | [driver:780](../../../test/compound-assignment.ts#L780) | Token offsets, parse diagnostics with whole-program prefix variants, parsed AST and execution. |
| P22 ExtraEquals | [driver:780](../../../test/compound-assignment.ts#L780) | Token offsets, parse diagnostics with whole-program prefix variants, parsed AST and execution. |
| P23 LineTerminators | [driver:780](../../../test/compound-assignment.ts#L780) | Token offsets, parse diagnostics with whole-program prefix variants, parsed AST and execution. |
| P24 SourceRetention | [driver:780](../../../test/compound-assignment.ts#L780) | Token offsets, parse diagnostics with whole-program prefix variants, parsed AST and execution. |
| P25 Nesting | [driver:780](../../../test/compound-assignment.ts#L780) | Token offsets, parse diagnostics with whole-program prefix variants, parsed AST and execution. |
| L1 Binding | [driver:865](../../../test/compound-assignment.ts#L865) | Reference versus operation versus child locations, exact sentinels and Array errors. |
| L2 Parenthesis | [driver:865](../../../test/compound-assignment.ts#L865) | Reference versus operation versus child locations, exact sentinels and Array errors. |
| L3 Dispatch | [driver:865](../../../test/compound-assignment.ts#L865) | Reference versus operation versus child locations, exact sentinels and Array errors. |
| L4 Coercion | [driver:865](../../../test/compound-assignment.ts#L865) | Reference versus operation versus child locations, exact sentinels and Array errors. |
| L5 PutFalse | [driver:865](../../../test/compound-assignment.ts#L865) | Reference versus operation versus child locations, exact sentinels and Array errors. |
| L6 RHSChild | [driver:865](../../../test/compound-assignment.ts#L865) | Reference versus operation versus child locations, exact sentinels and Array errors. |
| L7 KeyChild | [driver:865](../../../test/compound-assignment.ts#L865) | Reference versus operation versus child locations, exact sentinels and Array errors. |
| L8 BaseChild | [driver:865](../../../test/compound-assignment.ts#L865) | Reference versus operation versus child locations, exact sentinels and Array errors. |
| L9 Sentinel | [driver:865](../../../test/compound-assignment.ts#L865) | Reference versus operation versus child locations, exact sentinels and Array errors. |
| L10 Array | [driver:865](../../../test/compound-assignment.ts#L865) | Reference versus operation versus child locations, exact sentinels and Array errors. |
| R1 Plain | [driver:947](../../../test/compound-assignment.ts#L947) | Literal resource table and recursionGroup entries; admitted calls, RHS/Get counts, no Set, peaks and cleanup. |
| R2 StatementGuard | [driver:947](../../../test/compound-assignment.ts#L947) | Literal resource table and recursionGroup entries; admitted calls, RHS/Get counts, no Set, peaks and cleanup. |
| R3 CompoundGuard | [driver:947](../../../test/compound-assignment.ts#L947) | Literal resource table and recursionGroup entries; admitted calls, RHS/Get counts, no Set, peaks and cleanup. |
| R4 BaseGuard | [driver:947](../../../test/compound-assignment.ts#L947) | Literal resource table and recursionGroup entries; admitted calls, RHS/Get counts, no Set, peaks and cleanup. |
| R5 KeyGuard | [driver:947](../../../test/compound-assignment.ts#L947) | Literal resource table and recursionGroup entries; admitted calls, RHS/Get counts, no Set, peaks and cleanup. |
| R6 RHSGuard | [driver:947](../../../test/compound-assignment.ts#L947) | Literal resource table and recursionGroup entries; admitted calls, RHS/Get counts, no Set, peaks and cleanup. |
| R7 Exact | [driver:947](../../../test/compound-assignment.ts#L947) | Literal resource table and recursionGroup entries; admitted calls, RHS/Get counts, no Set, peaks and cleanup. |
| R8 Binding | [driver:947](../../../test/compound-assignment.ts#L947) | Literal resource table and recursionGroup entries; admitted calls, RHS/Get counts, no Set, peaks and cleanup. |
| R9 Nullish | [driver:947](../../../test/compound-assignment.ts#L947) | Literal resource table and recursionGroup entries; admitted calls, RHS/Get counts, no Set, peaks and cleanup. |
| R10 CanonicalKey | [driver:947](../../../test/compound-assignment.ts#L947) | Literal resource table and recursionGroup entries; admitted calls, RHS/Get counts, no Set, peaks and cleanup. |
| R11 OrdinaryKey | [driver:947](../../../test/compound-assignment.ts#L947) | Literal resource table and recursionGroup entries; admitted calls, RHS/Get counts, no Set, peaks and cleanup. |
| R12 FallbackKey | [driver:947](../../../test/compound-assignment.ts#L947) | Literal resource table and recursionGroup entries; admitted calls, RHS/Get counts, no Set, peaks and cleanup. |
| R13 KeyStep | [driver:947](../../../test/compound-assignment.ts#L947) | Literal resource table and recursionGroup entries; admitted calls, RHS/Get counts, no Set, peaks and cleanup. |
| R14 KeyCall | [driver:947](../../../test/compound-assignment.ts#L947) | Literal resource table and recursionGroup entries; admitted calls, RHS/Get counts, no Set, peaks and cleanup. |
| R15 OldHook | [driver:947](../../../test/compound-assignment.ts#L947) | Literal resource table and recursionGroup entries; admitted calls, RHS/Get counts, no Set, peaks and cleanup. |
| R16 BothHooks | [driver:947](../../../test/compound-assignment.ts#L947) | Literal resource table and recursionGroup entries; admitted calls, RHS/Get counts, no Set, peaks and cleanup. |
| R17 OldStep | [driver:947](../../../test/compound-assignment.ts#L947) | Literal resource table and recursionGroup entries; admitted calls, RHS/Get counts, no Set, peaks and cleanup. |
| R18 OldCall | [driver:947](../../../test/compound-assignment.ts#L947) | Literal resource table and recursionGroup entries; admitted calls, RHS/Get counts, no Set, peaks and cleanup. |
| R19 RHSCallee | [driver:947](../../../test/compound-assignment.ts#L947) | Literal resource table and recursionGroup entries; admitted calls, RHS/Get counts, no Set, peaks and cleanup. |
| R20 RHSCallGuard | [driver:947](../../../test/compound-assignment.ts#L947) | Literal resource table and recursionGroup entries; admitted calls, RHS/Get counts, no Set, peaks and cleanup. |
| R21 SeedDepth | [driver:947](../../../test/compound-assignment.ts#L947) | Literal resource table and recursionGroup entries; admitted calls, RHS/Get counts, no Set, peaks and cleanup. |
| R22 ChildDepth | [driver:947](../../../test/compound-assignment.ts#L947) | Literal resource table and recursionGroup entries; admitted calls, RHS/Get counts, no Set, peaks and cleanup. |
| R23 StepBeforeDepth | [driver:947](../../../test/compound-assignment.ts#L947) | Literal resource table and recursionGroup entries; admitted calls, RHS/Get counts, no Set, peaks and cleanup. |
| R24 Primitive | [driver:947](../../../test/compound-assignment.ts#L947) | Literal resource table and recursionGroup entries; admitted calls, RHS/Get counts, no Set, peaks and cleanup. |
| R25 PrimitiveKey | [driver:947](../../../test/compound-assignment.ts#L947) | Literal resource table and recursionGroup entries; admitted calls, RHS/Get counts, no Set, peaks and cleanup. |
| R26 PrimitiveRHSGuard | [driver:947](../../../test/compound-assignment.ts#L947) | Literal resource table and recursionGroup entries; admitted calls, RHS/Get counts, no Set, peaks and cleanup. |
| R27 Monotonic | [driver:947](../../../test/compound-assignment.ts#L947) | Literal resource table and recursionGroup entries; admitted calls, RHS/Get counts, no Set, peaks and cleanup. |
| R28 DirectReference | [driver:947](../../../test/compound-assignment.ts#L947) | Literal resource table and recursionGroup entries; admitted calls, RHS/Get counts, no Set, peaks and cleanup. |
| R29 KeyHostSmall | [driver:1147](../../../test/compound-assignment.ts#L1147) | Literal resource table and recursionGroup entries; admitted calls, RHS/Get counts, no Set, peaks and cleanup. |
| R30 KeyHostDefault | [driver:1147](../../../test/compound-assignment.ts#L1147) | Literal resource table and recursionGroup entries; admitted calls, RHS/Get counts, no Set, peaks and cleanup. |
| R31 KeyGuestSmall | [driver:1147](../../../test/compound-assignment.ts#L1147) | Literal resource table and recursionGroup entries; admitted calls, RHS/Get counts, no Set, peaks and cleanup. |
| R32 KeyGuestDefault | [driver:1147](../../../test/compound-assignment.ts#L1147) | Literal resource table and recursionGroup entries; admitted calls, RHS/Get counts, no Set, peaks and cleanup. |
| R33 KeyStepBeforeCall | [driver:1147](../../../test/compound-assignment.ts#L1147) | Literal resource table and recursionGroup entries; admitted calls, RHS/Get counts, no Set, peaks and cleanup. |
| R34 CoercionHostSmall | [driver:1147](../../../test/compound-assignment.ts#L1147) | Literal resource table and recursionGroup entries; admitted calls, RHS/Get counts, no Set, peaks and cleanup. |
| R35 CoercionHostDefault | [driver:1147](../../../test/compound-assignment.ts#L1147) | Literal resource table and recursionGroup entries; admitted calls, RHS/Get counts, no Set, peaks and cleanup. |
| R36 CoercionGuestSmall | [driver:1147](../../../test/compound-assignment.ts#L1147) | Literal resource table and recursionGroup entries; admitted calls, RHS/Get counts, no Set, peaks and cleanup. |
| R37 CoercionGuestDefault | [driver:1147](../../../test/compound-assignment.ts#L1147) | Literal resource table and recursionGroup entries; admitted calls, RHS/Get counts, no Set, peaks and cleanup. |
| R38 RightRecursion | [driver:1147](../../../test/compound-assignment.ts#L1147) | Literal resource table and recursionGroup entries; admitted calls, RHS/Get counts, no Set, peaks and cleanup. |
| R39 PrimitiveRecursive | [driver:1147](../../../test/compound-assignment.ts#L1147) | Literal resource table and recursionGroup entries; admitted calls, RHS/Get counts, no Set, peaks and cleanup. |
| R40 ExhaustedRetry | [driver:1147](../../../test/compound-assignment.ts#L1147) | Literal resource table and recursionGroup entries; admitted calls, RHS/Get counts, no Set, peaks and cleanup. |
| C1 ForeignKey | [driver:1262](../../../test/compound-assignment.ts#L1262) | Foreign Realm scenarios, all-stage abrupt/fault loops, seeded cleanup and postfailure reuse; recursion groups for C9/C10. |
| C2 ForeignOperands | [driver:1262](../../../test/compound-assignment.ts#L1262) | Foreign Realm scenarios, all-stage abrupt/fault loops, seeded cleanup and postfailure reuse; recursion groups for C9/C10. |
| C3 ForeignRHS | [driver:1262](../../../test/compound-assignment.ts#L1262) | Foreign Realm scenarios, all-stage abrupt/fault loops, seeded cleanup and postfailure reuse; recursion groups for C9/C10. |
| C4 PrimitiveBoxes | [driver:1262](../../../test/compound-assignment.ts#L1262) | Foreign Realm scenarios, all-stage abrupt/fault loops, seeded cleanup and postfailure reuse; recursion groups for C9/C10. |
| C5 ForeignObject | [driver:1262](../../../test/compound-assignment.ts#L1262) | Foreign Realm scenarios, all-stage abrupt/fault loops, seeded cleanup and postfailure reuse; recursion groups for C9/C10. |
| C6 GuestAbrupt | [driver:1328](../../../test/compound-assignment.ts#L1328) | Foreign Realm scenarios, all-stage abrupt/fault loops, seeded cleanup and postfailure reuse; recursion groups for C9/C10. |
| C7 HostFault | [driver:1328](../../../test/compound-assignment.ts#L1328) | Foreign Realm scenarios, all-stage abrupt/fault loops, seeded cleanup and postfailure reuse; recursion groups for C9/C10. |
| C8 ForeignFault | [driver:1328](../../../test/compound-assignment.ts#L1328) | Foreign Realm scenarios, all-stage abrupt/fault loops, seeded cleanup and postfailure reuse; recursion groups for C9/C10. |
| C9 RecursiveRealm | [driver:1147](../../../test/compound-assignment.ts#L1147) | Foreign Realm scenarios, all-stage abrupt/fault loops, seeded cleanup and postfailure reuse; recursion groups for C9/C10. |
| C10 RecursiveBoxes | [driver:1147](../../../test/compound-assignment.ts#L1147) | Foreign Realm scenarios, all-stage abrupt/fault loops, seeded cleanup and postfailure reuse; recursion groups for C9/C10. |
| C11 SeededCleanup | [driver:1328](../../../test/compound-assignment.ts#L1328) | Foreign Realm scenarios, all-stage abrupt/fault loops, seeded cleanup and postfailure reuse; recursion groups for C9/C10. |
| C12 PostFailure | [driver:1328](../../../test/compound-assignment.ts#L1328) | Foreign Realm scenarios, all-stage abrupt/fault loops, seeded cleanup and postfailure reuse; recursion groups for C9/C10. |

Disk-read CLI mapping: compound-basic.js covers V1/all five operators; compound-effects.js E1/E17 and saved key; compound-get-failure.js E6; compound-write-failure.js conversion before W3 rejection; compound-coercion-failure.js E11; compound-parse.js P6 whole-file rejection; compound-retention.js P24. Literal expected stdout/stderr/status are registered in tools/run-guests.mjs.

Additional variants: V16–V32 run each operator; E30 string/numeric/symbol keys; W8–W10 all eight bases; W13 both UTF-16 units (Add); W14 both nullish bases; W21 four invalid operations; W25 four actual box classes; P17–P23 every explicit token/line-ending variant; R9 both nullish bases; R29–R39 small0/1/2 and omitted-constructor-limit64; R38 both host/guest right hooks; C9/C10 host/guest plus key/old/right as applicable; C6–C8 both abrupt and host fault and calls2/depth4 seeds; C12 same evaluator after every failure.

Review revision: R1–R28 add a literal per-row progress/state table; the watched parsed RHS distinguishes evaluator entry from normal completion. R27 also checks the second attempt. C3 now has both operand hooks and exact BKCGRLHS, with foreign R and caller L/H/S. Explicit stored-state assertions cover E21/E22/E25/E26/E27/E28, W3/W8/W10/W16/W17. Production and all earlier assertions remain unchanged.
