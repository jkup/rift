# Third-party notices

Rift's own code is covered by the [MIT license](LICENSE). Bundled third-party
material retains its original notices and licenses:

| Material | License and provenance |
| --- | --- |
| ScriptC source patch | [Apache-2.0](toolchain/scriptc/LICENSE); [source revision and hashes](toolchain/scriptc/source.json). |
| Unicode data | [Unicode license](docs/data/unicode-license.txt), [property-data license](docs/data/unicode-properties-license.txt) and [property-data provenance](docs/data/unicode-properties-provenance.json). |
| IANA timezone data | [Timezone license](docs/data/iana-timezone-license.txt), [data provenance](docs/data/iana-timezone-provenance.json) and [identifier provenance](docs/data/iana-timezone-identifiers-provenance.json). |
| Test262 test and harness copies, including those in `docs/validation/` | [Test262 BSD license](test/fixtures/harness-bundle/LICENSE); individual files retain their copyright notices. |

Historical validation records can contain copies of third-party inputs and
compiler material. Their retained notices apply to those copies as well.
Dependencies installed with npm retain their own licenses; exact versions and
integrity hashes are recorded in `package-lock.json`.
