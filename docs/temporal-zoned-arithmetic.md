# ZonedDateTime arithmetic

add/subtract convert the duration before reading overflow options, apply calendar date units to local time, then add exact time nanoseconds. The time-only path operates directly on the instant. Month-end constraints and intermediate/final bounds remain explicit; every result uses the defining Realm's intrinsic prototype and preserves the timezone identifier.

The UTC/fixed-offset policy has constant 24-hour days, but the operation keeps date and time phases separate for correct month-end behavior and future timezone work. Tests cover month/year constraints, weeks/days plus time, negative and subsecond arithmetic, receiver/option order, endpoints and subclass/Realm allocation.

Reference: [AddZonedDateTime](https://tc39.es/proposal-temporal/#sec-temporal-addzoneddatetime). Named-zone transitions remain unsupported. Full Node, focused static-only native tests and existing arithmetic regressions gate acceptance.
