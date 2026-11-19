# Suspended loop conditions

While and do-while conditions use the expression continuation stack and a small
loop-test receiver. A normal result either removes the loop frame or schedules
its next body. Existing loop frames retain test-before/after-body ordering and
continue/break targets; abrupt resumes use the existing unwind machinery.

Expression startup is shared with statement receivers, including immediate
short-circuit completion and a delegate that completes without yielding. Tests
cover both forms, nested loops, delegation, lexical body environments, labels,
finally, abrupt resumes and resource limits charged to the resuming session.
For-loop initializers, updates and conditions remain a separate boundary.

The ordering follows [ECMA-262 iteration statements](https://262.ecma-international.org/16.0/#sec-iteration-statements).
