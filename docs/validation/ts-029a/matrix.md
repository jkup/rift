# TS-029A matrix mapping

The frozen [146-row contract](../ts-029p/matrix.md) supplies the independent literal
oracles and explicit variants. Named scenarios in the dedicated driver carry
the same IDs. Variants are separate literal rows or named loops over the specified
values/modes. CLI records separately check stdout, stderr and exit status.

R30 alone uses the independently coordinator-reviewed correction to **5 ticks**.
The identifier callee is resolved through reference/GetValue without evaluate.
The [retained reproduction](r30-reproduction.json) and original failed transcripts
preserve the discrepancy; the historical TS-029P matrix is unchanged.

| Frozen row | Implementation |
|---|---|
| V1 True | [named scenario](../../../test/property-assignment.ts#L640) |
| V2 False | [named scenario](../../../test/property-assignment.ts#L641) |
| V3 Number | [named scenario](../../../test/property-assignment.ts#L642) |
| V4 MinusZero | [named scenario](../../../test/property-assignment.ts#L643) |
| V5 NaN | [named scenario](../../../test/property-assignment.ts#L644) |
| V6 Infinity | [named scenario](../../../test/property-assignment.ts#L645) |
| V7 EmptyString | [named scenario](../../../test/property-assignment.ts#L647) |
| V8 String | [named scenario](../../../test/property-assignment.ts#L648) |
| V9 Symbol | [named scenario](../../../test/property-assignment.ts#L649) |
| V10 Null | [named scenario](../../../test/property-assignment.ts#L690) |
| V11 Undefined | [named scenario](../../../test/property-assignment.ts#L690) |
| V12 Unit | [named scenario](../../../test/property-assignment.ts#L650) |
| V13 Length | [named scenario](../../../test/property-assignment.ts#L652) |
| V14 UTF16 | [named scenario](../../../test/property-assignment.ts#L654) |
| V15 StringOrdinaryKeys | [named scenario](../../../test/property-assignment.ts#L656) |
| V16 PrimitiveInheritedWritable | [named scenario](../../../test/property-assignment.ts#L694) |
| V17 PrimitiveInheritedLocked | [named scenario](../../../test/property-assignment.ts#L694) |
| V18 PrimitiveSymbolKey | [named scenario](../../../test/property-assignment.ts#L694) |
| V19 ObjectNew | [named scenario](../../../test/property-assignment.ts#L717) |
| V20 ObjectUpdate | [named scenario](../../../test/property-assignment.ts#L717) |
| V21 InheritedWritable | [named scenario](../../../test/property-assignment.ts#L717) |
| V22 InheritedLocked | [named scenario](../../../test/property-assignment.ts#L717) |
| V23 Nonextensible | [named scenario](../../../test/property-assignment.ts#L717) |
| V24 CallableObject | [named scenario](../../../test/property-assignment.ts#L717) |
| V25 ExplicitBoxes | [named scenario](../../../test/property-assignment.ts#L765) |
| V26 ExplicitStringVirtual | [named scenario](../../../test/property-assignment.ts#L772) |
| V27 ArrayIndex | [named scenario](../../../test/property-assignment.ts#L784) |
| V28 ArrayFrozenLength | [named scenario](../../../test/property-assignment.ts#L784) |
| V29 ArrayLength | [named scenario](../../../test/property-assignment.ts#L784) |
| V30 InvalidLength | [named scenario](../../../test/property-assignment.ts#L784) |
| V31 ArrayBlockedShrink | [named scenario](../../../test/property-assignment.ts#L784) |
| V32 ArrayRHSIdentity | [named scenario](../../../test/property-assignment.ts#L784) |
| V33 SymbolObjectKeys | [named scenario](../../../test/property-assignment.ts#L717) |
| V34 RawPrimitiveReceiver | [named scenario](../../../test/property-assignment.ts#L832) |
| V35 DistinctObjectReceiver | [named scenario](../../../test/property-assignment.ts#L845) |
| V36 DefinitionBoundary | [named scenario](../../../test/property-assignment.ts#L717) |
| E1 PrimitiveOrder | [named scenario](../../../test/property-assignment.ts#L340) |
| E2 ObjectOrder | [named scenario](../../../test/property-assignment.ts#L341) |
| E3 BaseAbrupt | [named scenario](../../../test/property-assignment.ts#L342) |
| E4 KeyExpressionAbrupt | [named scenario](../../../test/property-assignment.ts#L343) |
| E5 RHSAbrupt | [named scenario](../../../test/property-assignment.ts#L398) |
| E6 NullishOrder | [named scenario](../../../test/property-assignment.ts#L410) |
| E7 NullishCompetingKey | [named scenario](../../../test/property-assignment.ts#L410) |
| E8 KeyAbrupt | [named scenario](../../../test/property-assignment.ts#L344) |
| E9 KeyHostFault | [named scenario](../../../test/property-assignment.ts#L345) |
| E10 SetAbrupt | [named scenario](../../../test/property-assignment.ts#L346) |
| E11 SetHostFault | [named scenario](../../../test/property-assignment.ts#L347) |
| E12 FactoryFault | [named scenario](../../../test/property-assignment.ts#L348) |
| E13 KeyLookupFault | [named scenario](../../../test/property-assignment.ts#L349) |
| E14 KeyLookupAbrupt | [named scenario](../../../test/property-assignment.ts#L350) |
| E15 RHSChangesKeyMethod | [named scenario](../../../test/property-assignment.ts#L351) |
| E16 RHSRebindsBase | [named scenario](../../../test/property-assignment.ts#L352) |
| E17 RHSRebindsKey | [named scenario](../../../test/property-assignment.ts#L353) |
| E18 RHSChangesPrototype | [named scenario](../../../test/property-assignment.ts#L417) |
| E19 HookUnlocksTarget | [named scenario](../../../test/property-assignment.ts#L417) |
| E20 HookClosesTarget | [named scenario](../../../test/property-assignment.ts#L417) |
| E21 HookMutatesRHS | [named scenario](../../../test/property-assignment.ts#L417) |
| E22 BaseNotCoerced | [named scenario](../../../test/property-assignment.ts#L417) |
| E23 RHSNotCoerced | [named scenario](../../../test/property-assignment.ts#L417) |
| E24 CanonicalSymbol | [named scenario](../../../test/property-assignment.ts#L543) |
| E25 CanonicalNoncallable | [named scenario](../../../test/property-assignment.ts#L468) |
| E26 CanonicalObject | [named scenario](../../../test/property-assignment.ts#L469) |
| E27 OrdinaryFirst | [named scenario](../../../test/property-assignment.ts#L470) |
| E28 OrdinarySecond | [named scenario](../../../test/property-assignment.ts#L472) |
| E29 OrdinarySkip | [named scenario](../../../test/property-assignment.ts#L473) |
| E30 OrdinaryFailure | [named scenario](../../../test/property-assignment.ts#L474) |
| E31 OrdinaryAbrupt | [named scenario](../../../test/property-assignment.ts#L524) |
| E32 PrimitiveKeySpelling | [named scenario](../../../test/property-assignment.ts#L552) |
| E33 EmptyAndUTF16Key | [named scenario](../../../test/property-assignment.ts#L560) |
| E34 FrozenArrayRHS | [named scenario](../../../test/property-assignment.ts#L606) |
| E35 ArrayRHSFailure | [named scenario](../../../test/property-assignment.ts#L607) |
| E36 NestedAssignment | [named scenario](../../../test/property-assignment.ts#L631) |
| E37 InnerFailure | [named scenario](../../../test/property-assignment.ts#L628) |
| E38 NoTargetRead | [named scenario](../../../test/property-assignment.ts#L417) |
| K1 PutPut | [named scenario](../../../test/property-assignment.ts#L873) |
| K2 PutGet | [named scenario](../../../test/property-assignment.ts#L873) |
| K3 GetPut | [named scenario](../../../test/property-assignment.ts#L873) |
| K4 SeparateReferences | [named scenario](../../../test/property-assignment.ts#L928) |
| K5 FalseRetry | [named scenario](../../../test/property-assignment.ts#L873) |
| K6 AbruptRetry | [named scenario](../../../test/property-assignment.ts#L873) |
| K7 HostRetry | [named scenario](../../../test/property-assignment.ts#L873) |
| K8 ConversionRetry | [named scenario](../../../test/property-assignment.ts#L873) |
| K9 ConversionFaultRetry | [named scenario](../../../test/property-assignment.ts#L873) |
| K10 PrimitiveRetry | [named scenario](../../../test/property-assignment.ts#L933) |
| K11 PrimitiveGetAfterFailure | [named scenario](../../../test/property-assignment.ts#L933) |
| K12 NullishRetry | [named scenario](../../../test/property-assignment.ts#L933) |
| K13 SymbolCache | [named scenario](../../../test/property-assignment.ts#L873) |
| K14 CacheBeforeDispatch | [named scenario](../../../test/property-assignment.ts#L977) |
| K15 CacheBeforeArrayRHS | [named scenario](../../../test/property-assignment.ts#L994) |
| K16 LocationSplit | [named scenario](../../../test/property-assignment.ts#L1016) |
| K17 NoBoxCache | [named scenario](../../../test/property-assignment.ts#L933) |
| K18 FreshRHS | [named scenario](../../../test/property-assignment.ts#L873) |
| K19 BindingControls | [named scenario](../../../test/property-assignment.ts#L1031) |
| K20 ReadBeforeFailure | [named scenario](../../../test/property-assignment.ts#L1051) |
| F1 ForeignKey | [named scenario](../../../test/property-assignment.ts#L1059) |
| F2 ForeignPrimitiveResult | [named scenario](../../../test/property-assignment.ts#L1059) |
| F3 ForeignObject | [named scenario](../../../test/property-assignment.ts#L1059) |
| F4 NestedBoxing | [named scenario](../../../test/property-assignment.ts#L1059) |
| F5 MutateAPrototype | [named scenario](../../../test/property-assignment.ts#L1059) |
| F6 GuestAbrupt | [named scenario](../../../test/property-assignment.ts#L1059) |
| F7 HostFault | [named scenario](../../../test/property-assignment.ts#L1059) |
| F8 DispatchFault | [named scenario](../../../test/property-assignment.ts#L1059) |
| F9 SeededCalls | [named scenario](../../../test/property-assignment.ts#L1059) |
| F10 Recovery | [named scenario](../../../test/property-assignment.ts#L1132) |
| F11 SideEffectSurvival | [named scenario](../../../test/property-assignment.ts#L1059) |
| F12 LongPrototypeChain | [named scenario](../../../test/property-assignment.ts#L1196) |
| R1 Primitive | [named scenario](../../../test/property-assignment.ts#L1203) |
| R2 Statement | [named scenario](../../../test/property-assignment.ts#L1204) |
| R3 Assignment | [named scenario](../../../test/property-assignment.ts#L1205) |
| R4 Base | [named scenario](../../../test/property-assignment.ts#L1206) |
| R5 Key | [named scenario](../../../test/property-assignment.ts#L1207) |
| R6 RHS | [named scenario](../../../test/property-assignment.ts#L1208) |
| R7 Exact | [named scenario](../../../test/property-assignment.ts#L1209) |
| R8 Nullish | [named scenario](../../../test/property-assignment.ts#L1210) |
| R9 Canonical | [named scenario](../../../test/property-assignment.ts#L1212) |
| R10 OrdinaryFirst | [named scenario](../../../test/property-assignment.ts#L1213) |
| R11 OrdinarySecond | [named scenario](../../../test/property-assignment.ts#L1214) |
| R12 KeyTick | [named scenario](../../../test/property-assignment.ts#L1215) |
| R13 CallGuard | [named scenario](../../../test/property-assignment.ts#L1216) |
| R14 SeededDepth | [named scenario](../../../test/property-assignment.ts#L1217) |
| R15 ChildDepth | [named scenario](../../../test/property-assignment.ts#L1218) |
| R16 StepWins | [named scenario](../../../test/property-assignment.ts#L1219) |
| R17 Direct | [named scenario](../../../test/property-assignment.ts#L1254) |
| R18 Monotonic | [named scenario](../../../test/property-assignment.ts#L1273) |
| R19 ObjectControl | [named scenario](../../../test/property-assignment.ts#L1220) |
| R20 HostRecursive | [named scenario](../../../test/property-assignment.ts#L1279) |
| R21 HostSmall | [named scenario](../../../test/property-assignment.ts#L1279) |
| R22 HostDefault | [named scenario](../../../test/property-assignment.ts#L1279) |
| R23 GuestRecursive | [named scenario](../../../test/property-assignment.ts#L1280) |
| R24 GuestSmall | [named scenario](../../../test/property-assignment.ts#L1280) |
| R25 GuestDefault | [named scenario](../../../test/property-assignment.ts#L1280) |
| R26 StepBeforeCall | [named scenario](../../../test/property-assignment.ts#L1334) |
| R27 RecursiveRealm | [named scenario](../../../test/property-assignment.ts#L1323) |
| R28 Cleanup | [named scenario](../../../test/property-assignment.ts#L1132) |
| R29 Exhaustion | [named scenario](../../../test/property-assignment.ts#L1334) |
| R30 NullishRHSCost | [named scenario](../../../test/property-assignment.ts#L1379) |
| C1 Object | [runtime fixture](../../../test/fixtures/property-assignment-object.js) and `tools/run-guests.mjs` literal record |
| C2 Primitive | [runtime fixture](../../../test/fixtures/property-assignment-primitive.js) and `tools/run-guests.mjs` literal record |
| C3 Nullish | [runtime fixture](../../../test/fixtures/property-assignment-nullish.js) and `tools/run-guests.mjs` literal record |
| C4 Effects | [runtime fixture](../../../test/fixtures/property-assignment-effects.js) and `tools/run-guests.mjs` literal record |
| C5 RHSWins | [runtime fixture](../../../test/fixtures/property-assignment-rhs-wins.js) and `tools/run-guests.mjs` literal record |
| C6 ParseBeforeEffects | [runtime fixture](../../../test/fixtures/property-assignment-parse.js) and `tools/run-guests.mjs` literal record |
| C7 SourceRetention | [named scenario](../../../test/property-assignment.ts#L1343) |
| C8 Unsupported | [named scenario](../../../test/property-assignment.ts#L1362) |
| C9 Preserve | [named scenario](../../../test/property-assignment.ts#L1364) |
| C10 NewDriver | [named scenario](../../../test/property-assignment.ts#L1365) |
