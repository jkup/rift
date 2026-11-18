import hashlib
import json
from pathlib import Path
import tarfile

root = Path('/var/tmp/rift-test262-baseline-91c7075').resolve()
archive = Path('corpus.tar.gz')
expected = '9869ee47ade3ed1f4d08c06e1b9a7c7e84391394575e2267064335917decb903'
archive_hash = hashlib.sha256(archive.read_bytes()).hexdigest()
assert archive_hash == expected, 'archive changed'
prefix = 'test262-91c70759363c46557b694792bf34a2551a7af5ba/'
differences = []
harness_hashes = {}
checked = 0
with tarfile.open(archive, 'r:gz') as source:
    for member in source:
        if not member.isfile():
            continue
        assert member.name.startswith(prefix), 'unexpected archive root'
        relative = member.name[len(prefix):]
        target = (root / relative).resolve()
        assert target.is_relative_to(root), 'corpus path escaped its root'
        expected_hash = hashlib.sha256(source.extractfile(member).read()).hexdigest()
        actual_hash = hashlib.sha256(target.read_bytes()).hexdigest() if target.is_file() else None
        checked += 1
        if actual_hash != expected_hash:
            differences.append(relative)
        if relative.startswith('harness/'):
            harness_hashes[relative] = expected_hash
report = {'archiveSha256': archive_hash, 'checked': checked, 'differences': differences,
          'harnessHashes': harness_hashes}
with open('corpus-audit.json', 'x') as output:
    json.dump(report, output, indent=2)
print(json.dumps({'checked': checked, 'differences': differences, 'harnessFiles': len(harness_hashes)}))
assert not differences, 'extracted corpus differs from the pinned archive'
