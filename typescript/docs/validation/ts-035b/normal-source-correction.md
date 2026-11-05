During self-review, a Node control `try {throw 1;} catch(e) {}` exposed a
normal result carrying the session's historical caught-throw source. Before
correction, the control printed `normal caught`. The observed result now has
source=null for normal completion, while the existing session history remains
unchanged. The compiled control explicitly checks both facts.

The first full native build was stopped while still in build-native, before
any historical replay or guest validation. Its typecheck record was retained
as `initial-suite-results.json`. No completed full native evidence is claimed
for that run. The final full pipeline starts again from corrected sources.
