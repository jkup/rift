# Labelled generator control flow

Label continuations retain break targets, and iteration records retain their
attached continue targets. Sequence records pass labels only to the labelled
statement itself; nested blocks and loop bodies do not inherit them accidentally.

A labelled continue keeps the matching loop and unwinds intervening cleanup and
iterators. A labelled break leaves those loops and stops at the matching label
boundary. Parser checks still reject missing, duplicate and non-iteration
continue targets.

Tests cover chained labels, block breaks, nested loop continues, yielding finally,
iterator close order, for-in targets and cleanup overriding pending control.
Switch and nested expression suspension remain subsequent work.
