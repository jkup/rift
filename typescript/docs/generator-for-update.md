# Suspended for-loop updates

Retained for loops now distinguish iteration preparation from test evaluation.
Preparation creates the next lexical environment, then evaluates the update.
A suspended update resumes into the test phase, so neither cloning nor the update
runs twice. The test phase resets preparation before entering the next body.
Ordinary loops use the same preparation helper and evaluate their updates directly.

Tests cover let closures captured by the body and update, var/let paths,
continue/labels, break, nested suspensions, delegation, async updates, cross-Realm
errors and current-session resource limits. The original rejected update source
is retained with successful resume/return assertions.

Initializers and assignment expressions whose suspension positions are not yet
admitted remain separate. Reports are retained under ignored
build/generator-for-update-* paths. Combined canonical acceptance is required.
