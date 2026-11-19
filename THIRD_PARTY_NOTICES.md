# Third-party notices

Rift's own code is covered by the [MIT license](LICENSE). Bundled third-party
material retains its original notices and licenses:

| Material | License and provenance |
| --- | --- |
| ScriptC source patch | [Apache-2.0](toolchain/scriptc/LICENSE); [source revision and hashes](toolchain/scriptc/source.json). |
| Unicode data | [Unicode license](docs/data/unicode-license.txt), [property-data provenance](docs/data/unicode-properties-provenance.json) and [identifier/case-fold provenance](docs/data/unicode-provenance.json). |
| IANA timezone data | [Timezone license](docs/data/iana-timezone-license.txt), [data provenance](docs/data/iana-timezone-provenance.json) and [identifier provenance](docs/data/iana-timezone-identifiers-provenance.json). |
| Test262 test and harness copies, including tooling regression inputs | [Test262 BSD license](test/fixtures/harness-bundle/LICENSE); individual files retain their copyright notices. |

Dependencies installed with npm retain their own licenses; exact versions and
integrity hashes are recorded in `package-lock.json`.
