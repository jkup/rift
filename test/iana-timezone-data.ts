import { ianaZones, ianaLinks } from "../src/iana-timezone-data.js";
import { stringCompare } from "../src/strings.js";
import { findIanaZoneData, transitionTableOffset } from "../src/time-zone-transitions.js";

let boundaries = 0;
for (let index = 0; index < ianaZones.length; index++) {
    const zone = ianaZones[index];
    if (index > 0 && stringCompare(ianaZones[index - 1].identifier, zone.identifier) >= 0) throw new Error("zone ordering");
    if (findIanaZoneData(zone.identifier) !== zone) throw new Error("zone identity");
    if (zone.transitions.length !== zone.offsets.length || zone.footer.length === 0) throw new Error("zone shape");
    for (let position = 0; position < zone.transitions.length; position++) {
        const instant = zone.transitions[position];
        const before = transitionTableOffset(zone, instant - 1), at = transitionTableOffset(zone, instant);
        const expectedBefore = position === 0 ? zone.initialOffset : zone.offsets[position - 1];
        if (before === null || before.kind !== "offset" || before.seconds !== expectedBefore) throw new Error("before transition");
        if (at === null) throw new Error("at transition");
        if (position === zone.transitions.length - 1) {
            if (at.kind !== "recurring" || at.footer !== zone.footer) throw new Error("footer boundary");
        } else if (at.kind !== "offset" || at.seconds !== zone.offsets[position]) throw new Error("transition offset");
        boundaries += 2;
    }
    const first = transitionTableOffset(zone, -8640000000000), last = transitionTableOffset(zone, 8640000000000);
    if (first === null || last === null || last.kind !== "recurring" || last.footer !== zone.footer) throw new Error("range endpoint");
    if (zone.transitions.length === 0) {
        if (first.kind !== "recurring" || first.footer !== zone.footer) throw new Error("constant footer");
    } else if (first.kind !== "offset" || first.seconds !== zone.initialOffset) throw new Error("initial offset");
    for (const seconds of [NaN, Infinity, -Infinity, 0.5, -0.5, 8640000000001, -8640000000001]) {
        if (transitionTableOffset(zone, seconds) !== null) throw new Error("invalid instant");
    }
}
if (ianaZones.length !== 440 || ianaLinks.length !== 158 || boundaries !== 52896) throw new Error("data denominator");
for (const identifier of ["", "europe/london", "Europe/Londo", "Europe/London/", "US/Eastern", "UTC", "Etc/Unknown", "Asia/Kathmandu"]) {
    if (findIanaZoneData(identifier) !== null) throw new Error("exact internal lookup");
}
const names = ["Europe/London", "Europe/London", "Europe/London", "America/New_York", "America/New_York", "Asia/Kathmandu", "Asia/Kathmandu", "Pacific/Apia", "Pacific/Apia"];
const instants = [0, -2208988800, 1719792000, 1893456000, 1909094400, -2208988800, 473385600, 1325160000, 1325332800];
const offsets = [3600, 0, 3600, -18000, -14400, 20476, 19800, -36000, 50400];
for (let index = 0; index < names.length; index++) {
    const zone = findIanaZoneData(names[index]);
    if (zone === null) throw new Error("reference zone");
    const actual = transitionTableOffset(zone, instants[index]);
    if (actual === null || actual.kind !== "offset" || actual.seconds !== offsets[index]) throw new Error("upstream offset: " + names[index]);
}
console.log("iana timezone data passed");
