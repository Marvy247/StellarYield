/**
 * API Schema Snapshot Tests
 *
 * Guards the `paths` and `components` sections of the OpenAPI spec with a
 * content checksum so any change to a documented request/response schema
 * is a deliberate, reviewed diff (update the expected hash below) instead
 * of silent drift from what the API actually returns.
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";

const SPEC_PATH = path.join(__dirname, "../../openapi.yaml");

// Update these when a PR intentionally changes the OpenAPI schema.
const EXPECTED_COMPONENTS_SCHEMA_HASH =
    "47496a8008915b00d50cdc0fd6476a34263bdaeb0930db927cf87201845dfd2d";
const EXPECTED_PATHS_SCHEMA_HASH =
    "c32c933f9895088870e2cf4db8b182379286236838b95ed5c06c873112ea7a13";

function readSection(spec: string, startMarker: string, endMarker?: string): string {
    const startIdx = spec.indexOf(startMarker);
    if (startIdx === -1) {
        throw new Error(`Could not find section starting with "${startMarker}"`);
    }
    const contentStart = startIdx + startMarker.length;
    const endIdx = endMarker ? spec.indexOf(endMarker, contentStart) : -1;
    return endIdx === -1 ? spec.slice(contentStart) : spec.slice(contentStart, endIdx);
}

function sha256(content: string): string {
    return crypto.createHash("sha256").update(content).digest("hex");
}

describe("OpenAPI schema snapshots", () => {
    const spec = fs.readFileSync(SPEC_PATH, "utf-8");
    const componentsSection = readSection(spec, "\ncomponents:");
    const pathsSection = readSection(spec, "\npaths:", "\ncomponents:");

    it("keeps a stable checksum for documented response/request schemas (components)", () => {
        expect(sha256(componentsSection)).toBe(EXPECTED_COMPONENTS_SCHEMA_HASH);
    });

    it("keeps a stable checksum for documented path definitions", () => {
        expect(sha256(pathsSection)).toBe(EXPECTED_PATHS_SCHEMA_HASH);
    });

    it("every documented path declares at least one 2xx response", () => {
        const pathBlocks = pathsSection
            .split(/\n(?=  \/)/) // top-level path entries are indented by 2 spaces
            .filter((block) => block.trim().length > 0);

        expect(pathBlocks.length).toBeGreaterThan(0);

        for (const block of pathBlocks) {
            const [pathName] = block.trim().split(":");
            expect(block).toContain("responses:");
            expect(block, `Path "${pathName}" is missing a 2xx response`).toMatch(
                /'?2\d\d'?:/,
            );
        }
    });
});
