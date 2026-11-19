# Catch-pattern compiler narrowing

The initial TS-551 native build rejected two expressions in the isolated draft:

- Comparing a nullable declaration site directly with a non-null site (SC1090).
- Returning a narrowed pattern-initialization completion directly as a statement completion (SC2003).

The amended draft checks null before comparing site identity and assigns the
throw arm to a `ThrowCompletion` local before returning it. The latter follows
the existing evaluator idiom. Neither change alters guest behavior.

`probe.ts` exercises the supported forms, including null/non-null identity and
preservation of a thrown payload. `results.json` records scriptc 0.4.7 static-only
compilation, parsed coverage (14/14 static statements), and matching expected
Node/native output on Windows x64 with Zig 0.17.0. This probe establishes the
small compiler idioms; it does not establish full catch-pattern acceptance.

The original failed 32-entry attempt (eight passing, 24 failing) and source are
retained locally under `build/catch-pattern-draft/build/initial-native-failure/`.
Only SC1090 and SC2003 were reported. The amended full Node run passes 999 guests
and 35 runner checks, with the 998 predecessor results unchanged. Native and
canonical acceptance remain separate requirements.
