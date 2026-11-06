import { createHash } from 'node:crypto';

// Descriptive data only. This does not inspect the loaded engine, authenticate
// build provenance, or grant a selection, preflight, receipt or launch token.
const controls = ['B01','B02','B03','B04','B05','B06','B07','B08','B09','B10','B11','B12','B13','B14','B15','B16','N01','N02','I01'];
const sourceSnapshot = [
  {
    "path": "src/abstract-equality.ts",
    "bytes": 2265,
    "sha256": "8f45db12de1248c7b1bfdfe086d145e7b4a6e44dce1bcfde177b0ca34f125d3c"
  },
  {
    "path": "src/array-like.ts",
    "bytes": 837,
    "sha256": "4bed58ecbff750f939d1417f69d58c9a0168776bd7250ea2e2984615ca3d2a00"
  },
  {
    "path": "src/array-map.ts",
    "bytes": 4014,
    "sha256": "215118f00949a4d51ce8b331972385fa43ec9a1753e1841ae5349c9d5d1be2fc"
  },
  {
    "path": "src/array-object.ts",
    "bytes": 7468,
    "sha256": "d0bda5432db7b764d824207a61ae2a63af031b1fa3eb94d650c638a1af29de98"
  },
  {
    "path": "src/builtins/array.ts",
    "bytes": 3080,
    "sha256": "7d1dc6977abb64030a134649eced912c7ee7e9fdceef952cba144874b1bf0042"
  },
  {
    "path": "src/builtins/boolean.ts",
    "bytes": 1500,
    "sha256": "a99b83300c148bd0e56a1be35f6a694348659a5419cb7a9249cecd80f16efc46"
  },
  {
    "path": "src/builtins/error.ts",
    "bytes": 5199,
    "sha256": "63cc8748ad82ad834d42d69fe6a476e699ba8325fb06530fec4b6092edd2b71d"
  },
  {
    "path": "src/builtins/function.ts",
    "bytes": 5359,
    "sha256": "5ddd73411be86471ed1415a4f9f898f3bc5d8f9a3bca52479a03910c407e0d92"
  },
  {
    "path": "src/builtins/number.ts",
    "bytes": 4801,
    "sha256": "e246505dc2e165fbf91603982dabd3233aecf6b3a3c5d2319763f2be2aef8bb1"
  },
  {
    "path": "src/builtins/object.ts",
    "bytes": 3792,
    "sha256": "bbbeb2fbed6eea9ec0f41a693f0f484bcaca945046b2520dd50a0d2cb0c05350"
  },
  {
    "path": "src/builtins/restricted-function.ts",
    "bytes": 945,
    "sha256": "cb38bcaef25ede4e188ff97a4231b70fdea64df415aaf2180fb503217d9fe678"
  },
  {
    "path": "src/builtins/string.ts",
    "bytes": 4043,
    "sha256": "ef824693420de9fd6e674ea49684483e888bce3e64ad271758279d727d925c35"
  },
  {
    "path": "src/builtins/symbol.ts",
    "bytes": 2312,
    "sha256": "101864d34fe7bdc211d523f3655d9b5ad5dd8089f17c76f1c9cfa8307d17ac19"
  },
  {
    "path": "src/cli.ts",
    "bytes": 1698,
    "sha256": "d7188e812ed578b413450b638e1819a256f3e3acabd93be9b9c6fbbca14234e5"
  },
  {
    "path": "src/conversion.ts",
    "bytes": 6865,
    "sha256": "e1d5a4679d52ff8c83b9665aacb6092f25e25c626a7e6b8fe76bfc4d3899cb67"
  },
  {
    "path": "src/delete-reference.ts",
    "bytes": 1243,
    "sha256": "be571ffef848247784a502486138788b5fe1668f7a8b4da8d1c518bfe6a95173"
  },
  {
    "path": "src/evaluator.ts",
    "bytes": 147,
    "sha256": "8f0070acae33c0477267142eb09eab294dbc6e1fb93e19677729505ae3500d3a"
  },
  {
    "path": "src/global-environment.ts",
    "bytes": 8625,
    "sha256": "8bcf83030ffd569fcb5e37c16017d6628159f9603feefee04ae7556f52cef592"
  },
  {
    "path": "src/interpreter.ts",
    "bytes": 908,
    "sha256": "848f45a406e54bf5f419a8a30eb034ee48d376df04720e5b344b6422b8ec2994"
  },
  {
    "path": "src/lexer.ts",
    "bytes": 6180,
    "sha256": "11cde9da665575a6e2fda84b9b8329e5100a7acaa3beaee7fc86db281e5c1b07"
  },
  {
    "path": "src/number-radix-internal.ts",
    "bytes": 7410,
    "sha256": "bf9416a10c8b281cea2d36569341d3e6ddad495db90d6bddc2fc5ed10f42c0c4"
  },
  {
    "path": "src/number-radix.ts",
    "bytes": 346,
    "sha256": "9986c273c456174a7c8e1b312134aeb2a125b2e472b4bac93be53134d7934edd"
  },
  {
    "path": "src/object-conversion.ts",
    "bytes": 1121,
    "sha256": "7af59477a64131120d0b1ffdb4d21703ed510b7b57c4539d330dd6cab4c5569f"
  },
  {
    "path": "src/observation-driver.ts",
    "bytes": 1389,
    "sha256": "12e75a4efc158f6373828c9dca52e17ad9d694fd7ebc079faccfcea0359b444d"
  },
  {
    "path": "src/observation-json.ts",
    "bytes": 2314,
    "sha256": "3d0561b635419eaf3f55639876b6eca6c0742c6a8c55d4a4104bd4e595d396e3"
  },
  {
    "path": "src/observation.ts",
    "bytes": 4193,
    "sha256": "96b63888a74133f5538a28dd86515919b0be8d513219db9f9ad2a0d7387c75c0"
  },
  {
    "path": "src/outcomes.ts",
    "bytes": 1786,
    "sha256": "ac0e100ac4de91ee224e101b0c104d94b961759e8fd1d411b41218c83dc68582"
  },
  {
    "path": "src/parser.ts",
    "bytes": 38119,
    "sha256": "c9703926138c6ec11f6f8d8bca3d12332706ec89e05e24322416c80373cfa504"
  },
  {
    "path": "src/primitive-conversion.ts",
    "bytes": 2771,
    "sha256": "b3a856d1e767dabf9617ab621ddc0621b1dc5a9cab9b32c150efb2df19b2981d"
  },
  {
    "path": "src/primitive-objects.ts",
    "bytes": 3822,
    "sha256": "db95099e1613dbafd48e66e8512d777a4d917e9e654861657948ccaf590119c3"
  },
  {
    "path": "src/property-keys.ts",
    "bytes": 1209,
    "sha256": "2e415f1a442a73b028b0bc8c6bc10f2ce9c7455ab047f42e2f424fac840a67d8"
  },
  {
    "path": "src/realm.ts",
    "bytes": 13716,
    "sha256": "1416f625e0a3b3ac017551af12f8311e10d943676acf127da55a3ae6ae9d7f95"
  },
  {
    "path": "src/runtime.ts",
    "bytes": 22222,
    "sha256": "82a7b0686859f196a5c50faac9e6b7171135858983c3f6b160c058c62022dcdf"
  },
  {
    "path": "src/script-completion.ts",
    "bytes": 1432,
    "sha256": "520fb159ae850e0d9eeedcde8d2767f7f572af642d7814891c0be54665138753"
  },
  {
    "path": "src/script-declarations.ts",
    "bytes": 41439,
    "sha256": "9327c100723323a9af0b7f98b81daf2b0eb8679034a948439549b6f974ed1f77"
  },
  {
    "path": "src/script-environment.ts",
    "bytes": 5665,
    "sha256": "617b84d9611555dcd5f09dbcfcc8087af4834c41bd9ce74cf97296a55d4aa6bd"
  },
  {
    "path": "src/script-execution-internal.ts",
    "bytes": 101716,
    "sha256": "e855c74cba73ef87c5d8d6ef49a0337f947d94c8247ca5c9e47e901af692f4fc"
  },
  {
    "path": "src/script-execution.ts",
    "bytes": 260,
    "sha256": "4fbc047c7284ccf5bf512278a3d48aa38c38bf9b9018dd34459c60bf0872e10b"
  },
  {
    "path": "src/script-global-declarations.ts",
    "bytes": 7739,
    "sha256": "eec1f681f1d8fbd47fdf25e1af318800a504cc7013f03c6552b50fb0293550c6"
  },
  {
    "path": "src/script-metadata.ts",
    "bytes": 8487,
    "sha256": "575749e6513a060d32b02539c489697ed82e01400e0019d85fdcc6bacf46e677"
  },
  {
    "path": "src/script-observation-driver.ts",
    "bytes": 3086,
    "sha256": "2b9b6f567522daeaafef7152ca55d8bc1edea14522a8cf55733c5f38b0fc8ef2"
  },
  {
    "path": "src/script-observation-json.ts",
    "bytes": 3778,
    "sha256": "2f2718bc39dabab0ee430244ca59f7332173d4b2bc5318a07056a85c46ed8212"
  },
  {
    "path": "src/script-observation-types.ts",
    "bytes": 2389,
    "sha256": "c6e06c4df1d0ba5ac970347a134e615fe6a9690a4b65e295f76a03de57b076d1"
  },
  {
    "path": "src/script-observation.ts",
    "bytes": 42409,
    "sha256": "36397d2b2ff34c1db8df3cd2d203a42521430749797270c881ea7d1853c8bc8f"
  },
  {
    "path": "src/script-prologue.ts",
    "bytes": 1150,
    "sha256": "9b0a4c443c2f50ad38aa48b3e66f6809c08bae0ffc494be485daae878cb499cd"
  },
  {
    "path": "src/script-record.ts",
    "bytes": 382,
    "sha256": "cd96a00aea9d0c82938902bbcffd9c197f69cc8a5e4b0acf4c578823f709571e"
  },
  {
    "path": "src/script-throw-inspection.ts",
    "bytes": 257,
    "sha256": "366883481bc10c27d847f8d1c69e6a85d2cba8b46776489c5aa6db5fa06ded31"
  },
  {
    "path": "src/strings.ts",
    "bytes": 1165,
    "sha256": "eb6d5210faec12d6afa4fab570988beac1d98d2ec00ec6b97a3ebb9eed3aa6cb"
  },
  {
    "path": "src/symbols.ts",
    "bytes": 918,
    "sha256": "6150c63cdac32307226438b3fcdb178ca5cd79ee377745f32ff172e0ff351e85"
  },
  {
    "path": "src/syntax.ts",
    "bytes": 3077,
    "sha256": "9df324c84b784431874d8c840416f1d0cbf7729733a2d14923a1dcd784f331d4"
  },
  {
    "path": "src/typeof.ts",
    "bytes": 597,
    "sha256": "351562610b28a9460d50d11fa8fffce5bc989f0438d1a18d553cc2731546e849"
  },
  {
    "path": "test/script-observation.ts",
    "bytes": 3430,
    "sha256": "b723b84ea07f770bd6410c18bd1e9c8dd68e9932481a68a2f7b54c3f319bc888"
  }
];
function freeze(value) {
  if (value && typeof value === 'object') {
    for (const item of Object.values(value)) freeze(item);
    Object.freeze(value);
  }
  return value;
}
function realm(id, outputFault) {
  return { id, profile: 'script', outputFault,
    globals: [
      ['undefined',false,false,false], ['NaN',false,false,false], ['Infinity',false,false,false],
      ['console',true,false,true], ['Number',true,false,true],
      ['Error',true,false,true], ['TypeError',true,false,true], ['ReferenceError',true,false,true],
      ['RangeError',true,false,true], ['SyntaxError',true,false,true], ['String',true,false,true], ['Object',true,false,true]
    ],
    hostServices: [{ path: 'console.log', name: 'log', length: 0, writable: true, enumerable: false, configurable: true,
      effect: 'display arguments separated by spaces; call output sink; sink throws host Error',
      guard: 'profile first, then one-use Script builtin permit', definingRealm: id }]
  };
}
export function describeScriptHostServices(purpose, control) {
  if (arguments.length !== 2) throw Error('script-host-services/arguments');
  if (purpose !== 'main' && purpose !== 'conformance-preflight-v1') throw Error('script-host-services/purpose');
  if (purpose === 'main' ? control !== null : !controls.includes(control)) throw Error('script-host-services/control');
  const realms = [realm('test', 'control output')];
  const construction = ['new Attempt', 'new Script Realm test', 'register actual Realm as test'];
  const extensions = [];
  if (purpose !== 'main') construction.push('controlSetup ' + control + ' with alpha or beta');
  if (control === 'B09') {
    realms.push(realm('other', 'control output'));
    construction.push('new Script Realm other', 'register actual Realm as other', 'define Other on test from other.ReferenceError');
    extensions.push({ targetRealm: 'test', name: 'Other', value: 'other intrinsic ReferenceError constructor',
      definingRealm: 'other', writable: true, enumerable: false, configurable: true });
  }
  const data = { descriptorVersion: 1, kind: 'script-host-services-description', purpose, control,
    mode: 'conformance', preflightControl: purpose !== 'main',
    construction, realms, extensions,
    sourceBinding: 'actual ExecutableScript and Realm map identity; unit ID alone is insufficient',
    session: 'fresh per Attempt; shared across ordered occurrences; finally restores calls/depth/active',
    lifetime: 'discard all control Realms, ASTs, globals, callbacks, sessions and completions; reload original ordered sources into fresh main Attempt',
    sourceSnapshot: structuredClone(sourceSnapshot), currentSourceVerified: false, buildCertification: 'unavailable', authority: 'none' };
  return freeze({ data, sha256: createHash('sha256').update(JSON.stringify(data)).digest('hex') });
}
