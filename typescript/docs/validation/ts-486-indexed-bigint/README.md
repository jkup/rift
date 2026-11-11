# Indexed BigInt return boundary

scriptc 0.4.7 adds undefined to an indexed BigInt return even when the function
is declared bigint | null. A caller's null guard or typeof guard does not remove
the resulting arithmetic blocker (SC1043). The scalar-return control passes.

An explicit type assertion at the return boundary, or at the arithmetic operand,
compiles. The consumer migration uses the boundary form for its two local-time
provider calls; provider candidate bounds are already validated. No guest value
is coerced, and no dynamic compilation is enabled.

The six source controls and coverage transcripts are retained here. The four
successful native programs print "1 null" and have fully static coverage. The
two failing controls retain their diagnostics. Full-engine acceptance is separate.
