// Literal CLI expectations shared by the Node and native guest lanes.
const usage = "usage: rift [--time-zone <identifier>] <file.js> | -e <source>\n";
const help =
    usage +
    "\nRun a JavaScript file or evaluate source with Rift.\n\n" +
    "Options:\n" +
    "  -e <source>               Evaluate JavaScript source.\n" +
    "  --time-zone <identifier>  Select the Date time zone (default: UTC).\n" +
    "  -h, --help                Show this help.\n\n" +
    "Examples:\n" +
    "  rift examples/counter.js\n" +
    "  rift -e 'console.log(6 * 7);'\n";

export const cliCases = [
    { name: "cli-help", args: ["--help"], expected: { stdout: help } },
    { name: "cli-short-help", args: ["-h"], expected: { stdout: help } },
    {
        name: "cli-unknown-option",
        args: ["--unknown"],
        expected: { status: 64, stderr: usage },
    },
    {
        name: "cli-help-extra-argument",
        args: ["--help", "build/nonexistent-guest.js"],
        expected: { status: 64, stderr: usage },
    },
    {
        name: "cli-short-help-extra-argument",
        args: ["-h", "build/nonexistent-guest.js"],
        expected: { status: 64, stderr: usage },
    },
    {
        name: "cli-help-source-argument",
        args: ["-e", 'console.log("--help");'],
        expected: { stdout: "--help\n" },
    },
    {
        name: "cli-zone-file",
        args: ["--time-zone", "America/New_York", "build/guest-fixtures/cli-time-zone.js"],
        expected: { stdout: "2024-03-10T07:30:00.000Z\n" },
    },
    {
        name: "cli-zone-gap",
        args: [
            "--time-zone",
            "America/New_York",
            "-e",
            "console.log(new Date(2024,2,10,2,30).toISOString());",
        ],
        expected: { stdout: "2024-03-10T07:30:00.000Z\n" },
    },
    {
        name: "cli-zone-fold",
        args: [
            "--time-zone",
            "America/New_York",
            "-e",
            "console.log(new Date(2024,10,3,1,30).toISOString());",
        ],
        expected: { stdout: "2024-11-03T05:30:00.000Z\n" },
    },
    {
        name: "cli-zone-alias",
        args: [
            "--time-zone",
            "US/Eastern",
            "-e",
            "console.log(new Date(0).getHours(),new Date(0).getTimezoneOffset());",
        ],
        expected: { stdout: "19 300\n" },
    },
    {
        name: "cli-zone-case",
        args: ["--time-zone", "europe/london", "-e", "console.log(new Date(0).getHours());"],
        expected: { stdout: "1\n" },
    },
    {
        name: "cli-zone-fixed",
        args: [
            "--time-zone",
            "+05:30",
            "-e",
            "console.log(new Date(0).getHours(),new Date(0).getMinutes(),new Date(0).getTimezoneOffset());",
        ],
        expected: { stdout: "5 30 -330\n" },
    },
    {
        name: "cli-zone-negative-fixed",
        args: [
            "--time-zone",
            "-05:00",
            "-e",
            "console.log(new Date(0).getHours(),new Date(0).getTimezoneOffset());",
        ],
        expected: { stdout: "19 300\n" },
    },
    {
        name: "cli-zone-utc",
        args: [
            "--time-zone",
            "UTC",
            "-e",
            "console.log(new Date(0).getHours(),new Date(0).getTimezoneOffset());",
        ],
        expected: { stdout: "0 0\n" },
    },
    {
        name: "cli-zone-parse",
        args: [
            "--time-zone",
            "America/New_York",
            "-e",
            'console.log(Date.parse("1970-01-01"),Date.parse("1970-01-01T00:00:00"),Date.parse("1970-01-01T00:00:00Z"));',
        ],
        expected: { stdout: "0 18000000 0\n" },
    },
    {
        name: "cli-zone-default",
        args: ["-e", "console.log(new Date(0).getHours(),new Date(0).getTimezoneOffset());"],
        expected: { stdout: "0 0\n" },
    },
    {
        name: "cli-zone-source-argument",
        args: ["-e", 'console.log("--time-zone");'],
        expected: { stdout: "--time-zone\n" },
    },
    {
        name: "cli-zone-invalid-unknown",
        args: ["--time-zone", "Not/AZone", "-e", 'console.log("must not run");'],
        expected: { status: 64, stderr: "invalid time zone: Not/AZone\n" },
    },
    {
        name: "cli-zone-invalid-empty",
        args: ["--time-zone", "", "-e", 'console.log("must not run");'],
        expected: { status: 64, stderr: "invalid time zone: \n" },
    },
    {
        name: "cli-zone-invalid-annotated",
        args: ["--time-zone", "2024-01-01[Europe/London]", "-e", 'console.log("must not run");'],
        expected: { status: 64, stderr: "invalid time zone: 2024-01-01[Europe/London]\n" },
    },
    {
        name: "cli-zone-invalid-seconds",
        args: ["--time-zone", "+01:00:30", "-e", 'console.log("must not run");'],
        expected: { status: 64, stderr: "invalid time zone: +01:00:30\n" },
    },
    {
        name: "cli-zone-invalid-range",
        args: ["--time-zone", "+24:00", "-e", 'console.log("must not run");'],
        expected: { status: 64, stderr: "invalid time zone: +24:00\n" },
    },
    {
        name: "cli-zone-missing-value",
        args: ["--time-zone"],
        expected: {
            status: 64,
            stderr: "usage: rift [--time-zone <identifier>] <file.js> | -e <source>\n",
        },
    },
    {
        name: "cli-zone-missing-source",
        args: ["--time-zone", "UTC"],
        expected: {
            status: 64,
            stderr: "usage: rift [--time-zone <identifier>] <file.js> | -e <source>\n",
        },
    },
    {
        name: "cli-zone-missing-inline",
        args: ["--time-zone", "UTC", "-e"],
        expected: {
            status: 64,
            stderr: "usage: rift [--time-zone <identifier>] <file.js> | -e <source>\n",
        },
    },
    {
        name: "cli-zone-extra",
        args: ["--time-zone", "UTC", "-e", "0", "extra"],
        expected: {
            status: 64,
            stderr: "usage: rift [--time-zone <identifier>] <file.js> | -e <source>\n",
        },
    },
    {
        name: "cli-zone-repeat",
        args: ["--time-zone", "UTC", "--time-zone", "UTC", "-e", "0"],
        expected: {
            status: 64,
            stderr: "usage: rift [--time-zone <identifier>] <file.js> | -e <source>\n",
        },
    },
    {
        name: "cli-zone-io",
        args: ["--time-zone", "UTC", "build/nonexistent-guest.js"],
        expected: { status: 66, stderr: "cannot read source: build/nonexistent-guest.js\n" },
    },
    {
        name: "cli-zone-invalid-before-io",
        args: ["--time-zone", "Not/AZone", "build/nonexistent-guest.js"],
        expected: { status: 64, stderr: "invalid time zone: Not/AZone\n" },
    },
    {
        name: "cli-zone-parse-error",
        args: ["--time-zone", "UTC", "-e", "1 + ;"],
        expected: {
            status: 2,
            stderr: "<eval>:1:5: parse SyntaxError: unsupported or unexpected syntax: ;\n",
        },
    },
    {
        name: "cli-zone-runtime-error",
        args: ["--time-zone", "UTC", "-e", "missing;"],
        expected: {
            status: 1,
            stderr: "<eval>:1:1: runtime ReferenceError: missing is not defined\n",
        },
    },
];
