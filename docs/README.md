# Documentation

Start here:

- [Project goals](project-goals.md): purpose and design priorities.
- [Architecture](architecture-decisions.md): follow a program through the engine.
- [Feature inventory](feature-inventory.md): supported behavior and known limits.
- [CLI and validation](usage.md): build/run options, test setup and result accounting.
- [Compiler contract](compiler-contract.md): native constraints and evidence.
- [Readability](readability.md): formatting, lint and structural rules.
- [Roadmap](development-roadmap.md): accepted state and concrete followups.
- [Repository layout](repository-layout.md): why each root entry exists.

The other topic-named documents explain individual features and design reviews.
They include historical checkpoints; use the feature inventory for current scope.

`validation/` retains acceptance evidence, failures and measured results, including
[the Test262 comparison](validation/test262-count-milestone/README.md) and
[saved native benchmarks](validation/native-benchmarks/README.md).
`history/` and `assistance/` contain historical planning and supporting reviews.
Captured paths and commands describe their original checkout, not current setup.
