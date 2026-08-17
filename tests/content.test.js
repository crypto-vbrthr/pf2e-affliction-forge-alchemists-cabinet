import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { ALCHEMISTS_CABINET_DEFINITIONS, createAlchemistsCabinetDefinitions } from "../scripts/content.js";
import { loadAfflictionForgeContract } from "./support/core-contract-loader.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const { normalizeAfflictionDefinition, validateAfflictionDefinition, AFFLICTION_SEMANTIC_TAG_VOCABULARY, parseSemanticTag } = await loadAfflictionForgeContract(root);
const locales = Object.fromEntries(["de", "en"].map((lang) => [lang, JSON.parse(fs.readFileSync(path.join(root, "lang", `${lang}.json`), "utf8"))]));
const dcByLevel = new Map([[0,14],[1,15],[2,16],[3,18],[4,19],[5,20],[6,22],[7,23],[8,24],[9,26],[10,27],[11,28],[12,30],[13,31],[14,32],[15,34],[16,35],[17,36],[18,38],[19,39],[20,40]]);
function resolveLocale(rootObject, token) { assert.ok(token.startsWith("@i18n:")); return token.slice(6).split(".").reduce((value, part) => value?.[part], rootObject); }
function collectI18nTokens(value, output = []) { if (typeof value === "string" && value.startsWith("@i18n:")) output.push(value); else if (Array.isArray(value)) value.forEach((entry) => collectI18nTokens(entry, output)); else if (value && typeof value === "object") Object.values(value).forEach((entry) => collectI18nTokens(entry, output)); return output; }
function allStages() { return ALCHEMISTS_CABINET_DEFINITIONS.flatMap((definition) => definition.stages); }

test("0.1.0 ships 32 original alchemical afflictions", () => {
  assert.equal(ALCHEMISTS_CABINET_DEFINITIONS.length, 32);
  assert.deepEqual(new Set(ALCHEMISTS_CABINET_DEFINITIONS.map((definition) => definition.afflictionType)), new Set(["poison", "disease"]));
  assert.ok(ALCHEMISTS_CABINET_DEFINITIONS.filter((definition) => definition.afflictionType === "poison").length >= 20);
  assert.ok(ALCHEMISTS_CABINET_DEFINITIONS.filter((definition) => definition.afflictionType === "disease").length >= 7);
});

test("every definition validates against Affliction Forge schema v2", () => {
  const effectValidator = () => ({ valid: true, issues: [] });
  for (const source of ALCHEMISTS_CABINET_DEFINITIONS) {
    const definition = normalizeAfflictionDefinition(source);
    const report = validateAfflictionDefinition(definition, { effectValidator });
    assert.equal(report.valid, true, `${definition.id}: ${report.issues.map((issue) => `${issue.path}: ${issue.message}`).join(" | ")}`);
  }
});

test("all affliction and stage identities are unique", () => {
  const ids = new Set();
  for (const definition of ALCHEMISTS_CABINET_DEFINITIONS) {
    assert.ok(!ids.has(definition.id), `Duplicate definition id ${definition.id}`); ids.add(definition.id);
    const stageIds = new Set();
    for (const stage of definition.stages) { assert.ok(!stageIds.has(stage.id), `Duplicate stage id ${definition.id}/${stage.id}`); stageIds.add(stage.id); }
  }
});

test("all entries use the level-based DC baseline", () => {
  for (const definition of ALCHEMISTS_CABINET_DEFINITIONS) assert.equal(definition.checks[0].dc, dcByLevel.get(definition.level), `${definition.id} has unexpected DC`);
});

test("semantic tags are canonical and identify alchemical Creature Forge content", () => {
  const creatures = new Set(); const deliveries = new Set(); const themes = new Set(); const origins = new Set();
  for (const definition of ALCHEMISTS_CABINET_DEFINITIONS) {
    const namespaces = new Set();
    for (const tag of definition.themes) {
      const parsed = parseSemanticTag(tag); assert.ok(parsed, `${definition.id} has non-semantic theme ${tag}`); assert.equal(parsed.canonical, true, `${definition.id} has non-canonical tag ${tag}`);
      assert.ok(AFFLICTION_SEMANTIC_TAG_VOCABULARY[parsed.namespace].includes(parsed.value), `${definition.id} uses unknown tag ${tag}`); namespaces.add(parsed.namespace);
      if (parsed.namespace === "creature") creatures.add(parsed.value); if (parsed.namespace === "delivery") deliveries.add(parsed.value); if (parsed.namespace === "theme") themes.add(parsed.value); if (parsed.namespace === "origin") origins.add(parsed.value);
    }
    for (const required of ["creature","habitat","theme","origin","delivery"]) assert.ok(namespaces.has(required), `${definition.id} lacks ${required} tags`);
    assert.ok(definition.themes.includes("origin:alchemical"), `${definition.id} lacks origin:alchemical`);
  }
  for (const creature of ["humanoid","construct","ooze","aberration","fungus"]) assert.ok(creatures.has(creature), `Missing creature:${creature}`);
  for (const delivery of ["weapon","injury","contact","ingested","inhaled"]) assert.ok(deliveries.has(delivery), `Missing delivery:${delivery}`);
  for (const theme of ["poison","toxin","disease","mutation","corruption","mental","blood","elemental"]) assert.ok(themes.has(theme), `Missing theme:${theme}`);
  for (const origin of ["alchemical","arcane","occult","magical","technological"]) assert.ok(origins.has(origin), `Missing origin:${origin}`);
});

test("exactly 12 true weapon coatings opt into injury-poison charges", () => {
  const coatings = ALCHEMISTS_CABINET_DEFINITIONS.filter((definition) => definition.delivery?.injuryPoison === true);
  assert.equal(coatings.length, 12);
  for (const definition of coatings) {
    assert.equal(definition.afflictionType, "poison");
    assert.ok(definition.themes.includes("delivery:weapon"), `${definition.id} lacks delivery:weapon`);
    assert.ok(definition.themes.includes("delivery:injury"), `${definition.id} lacks delivery:injury`);
    assert.ok(definition.themes.includes("origin:alchemical"), `${definition.id} lacks alchemical origin`);
  }
  for (const definition of ALCHEMISTS_CABINET_DEFINITIONS.filter((definition) => definition.afflictionType === "disease")) assert.equal(definition.delivery?.injuryPoison, false, `${definition.id} disease must not be a weapon coating`);
});

test("the library exercises advanced Affliction Forge runtime mechanics", () => {
  const stages = allStages();
  assert.ok(ALCHEMISTS_CABINET_DEFINITIONS.filter((definition) => definition.progression?.virulent === true).length >= 7);
  assert.ok(stages.some((stage) => stage.effect?.components?.some((component) => component.type === "damage" && component.persistent === true)), "Expected persistent damage");
  assert.ok(stages.filter((stage) => stage.preActionGates?.length).length >= 5, "Expected concentration gates");
  assert.ok(stages.some((stage) => stage.restrictions?.blockedCapabilities?.includes("speak")), "Expected speech blocking");
  assert.ok(stages.some((stage) => stage.restrictions?.conditionLocks?.length), "Expected condition locks");
  assert.ok(stages.some((stage) => stage.restrictions?.healing === "affliction-damage"), "Expected healing restrictions");
  assert.ok(stages.some((stage) => stage.effect?.components?.some((component) => component.type === "death")), "Expected a death effect");
});

test("all i18n content tokens resolve in German and English", () => {
  const tokens = [...new Set(ALCHEMISTS_CABINET_DEFINITIONS.flatMap((definition) => collectI18nTokens(definition)))];
  assert.ok(tokens.length > 120, "Expected a substantial localized content set");
  for (const token of tokens) for (const lang of ["de","en"]) { const value = resolveLocale(locales[lang], token); assert.equal(typeof value, "string", `${lang} missing ${token}`); assert.ok(value.trim(), `${lang} has blank ${token}`); }
});

test("definition factory returns independent clones", () => {
  const a = createAlchemistsCabinetDefinitions(); const b = createAlchemistsCabinetDefinitions(); assert.notEqual(a[0], b[0]); a[0].name = "mutated"; assert.notEqual(b[0].name, "mutated");
});

test("release tests contain no build-machine absolute imports", () => {
  const testsRoot = path.join(root, "tests"); const files = [];
  const visit = (dir) => { for (const entry of fs.readdirSync(dir, { withFileTypes: true })) { const full = path.join(dir, entry.name); if (entry.isDirectory()) visit(full); else if (entry.isFile() && entry.name.endsWith(".js")) files.push(full); } }; visit(testsRoot);
  for (const file of files) { const source = fs.readFileSync(file, "utf8"); assert.equal(source.includes("/mnt/data/" + "affliction_semantic"), false, `${path.relative(root, file)} contains a build-machine path`); assert.equal(/from\s+["'][A-Za-z]:[\\/]/.test(source), false, `${path.relative(root, file)} contains a Windows absolute import`); }
});
