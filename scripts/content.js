const MODULE_ID = "pf2e-affliction-forge-alchemists-cabinet";
const CONTENT_VERSION = "0.1.0";
const I18N_PREFIX = "PF2E_AFFLICTION_AC.Content";

const token = (slug, key) => `@i18n:${I18N_PREFIX}.${slug}.${key}`;
const restrictions = ({ locks = [], healing = "none", damageTypes = [], blocked = [] } = {}) => ({ conditionLocks: locks.map(([slug, minimum]) => ({ slug, minimum })), healing, unhealableDamageTypes: [...damageTypes], blockedCapabilities: [...blocked] });
const duration = ([value, unit]) => ({ value, unit });
const condition = (slug, value = null) => value == null ? { type: "condition", slug } : { type: "condition", slug, value };
const damage = (formula, damageType, persistent = false) => ({ type: "damage", formula, damageType, ...(persistent ? { persistent: true } : {}) });
const death = (category = "death-effect") => ({ type: "death", category });

function effect(slug, stageNumber, components, nameKey = null) {
  if (!components.length) return null;
  return { schemaVersion: 2, id: `${MODULE_ID}.${slug}.stage-${stageNumber}`, name: token(slug, nameKey ?? `Stage${stageNumber}.Name`), duration: { value: -1, unit: "unlimited", expiry: null }, components, application: {}, metadata: { originModule: MODULE_ID, originFeature: "alchemists-cabinet-stage" } };
}

function componentFromSpec(entry) {
  if (entry[0] === "condition") return condition(entry[1], entry[2]);
  if (entry[0] === "damage") return damage(entry[1], entry[2], false);
  if (entry[0] === "damagePersistent") return damage(entry[1], entry[2], true);
  if (entry[0] === "death") return death(entry[1]);
  throw new Error(`Unsupported Alchemist's Cabinet component type: ${entry[0]}`);
}

function makeStage(slug, stageNumber, stageSpec) {
  const [durationSpec, componentSpecs, options = {}] = stageSpec;
  const components = componentSpecs.map(componentFromSpec);
  const stageRestrictions = restrictions({ locks: options.locks ?? [], healing: options.healing ?? "none", blocked: options.blockSpeak ? ["speak"] : [] });
  const preActionGates = options.gate ? [{ id: `${slug}.stage-${stageNumber}.gate`, label: token(slug, `Stage${stageNumber}.Gate`), trigger: { actionKinds: ["spell-cast", "item-activation"], requiredTraits: ["concentrate"] }, check: { kind: "flat", dc: options.gate }, blockOnFailure: true }] : [];
  return { id: `stage-${stageNumber}`, number: stageNumber, name: token(slug, `Stage${stageNumber}.Name`), description: token(slug, `Stage${stageNumber}.Description`), duration: duration(durationSpec), expiryAction: options.expiry ?? "check", check: null, restrictions: stageRestrictions, effectPersistence: "stage", effectPersistenceDuration: null, effectComponentPersistence: [], effectComponentPersistenceDurations: [], effect: effect(slug, stageNumber, components), numericModifiers: [], periodicEffects: [], preActionGates, reactions: [] };
}

function makeDefinition(spec) {
  const themes = Object.entries(spec.tags).flatMap(([namespace, values]) => values.map((value) => `${namespace}:${value}`));
  const normalProgression = { criticalSuccess: { action: "stage-delta", delta: -2 }, success: { action: "stage-delta", delta: -1 }, failure: { action: "stage-delta", delta: 1 }, criticalFailure: { action: "stage-delta", delta: 2 } };
  const stubbornProgression = { criticalSuccess: { action: "stage-delta", delta: -1 }, success: { action: "stay" }, failure: { action: "stage-delta", delta: 1 }, criticalFailure: { action: "stage-delta", delta: 2 } };
  return { schemaVersion: 2, id: `${MODULE_ID}.${spec.slug}`, name: token(spec.slug, "Name"), description: token(spec.slug, "Description"), img: "icons/svg/poison.svg", afflictionType: spec.type, level: spec.level, rarity: spec.rarity, traits: [spec.type, ...(spec.virulent === true ? ["virulent"] : [])], themes, saveDefaults: { execution: "player", visibility: "public" }, identification: { initialState: spec.identification ?? "identified" }, delivery: { injuryPoison: spec.injuryPoison === true }, multipleExposure: "default", restrictions: restrictions({ locks: spec.locks ?? [], healing: spec.rootHealing ?? "none" }), checks: [{ id: "primary", label: token(spec.slug, "SaveLabel"), kind: "save", statistic: spec.stat, dcMode: "fixed", dc: spec.dc, policy: null }], initialCheck: { checkIds: ["primary"], combine: "single", outcomes: { criticalSuccess: { action: "reject" }, success: { action: "reject" }, failure: { action: "set-stage", stage: 1 }, criticalFailure: { action: "set-stage", stage: Math.min(2, spec.stages.length) } } }, onset: spec.onset ? duration(spec.onset) : null, maximumDuration: spec.maxDuration ? duration(spec.maxDuration) : null, defaultStageCheck: { checkIds: ["primary"], combine: "single", outcomes: spec.stubborn ? stubbornProgression : normalProgression }, progression: { belowStageOne: "recover", aboveMaximumStage: "clamp", virulent: spec.virulent === true }, stages: spec.stages.map((stage, index) => makeStage(spec.slug, index + 1, stage)), metadata: { originModule: MODULE_ID, originFeature: "alchemists-cabinet-library", contentVersion: CONTENT_VERSION, contentLicense: "original-homebrew", creatureForgeReady: true } };
}

const SPECS = [
  {
    "slug": "blinding-lime",
    "level": 0,
    "dc": 14,
    "type": "poison",
    "rarity": "common",
    "stat": "fortitude",
    "tags": {
      "creature": [
        "humanoid"
      ],
      "habitat": [
        "urban",
        "underground"
      ],
      "theme": [
        "poison",
        "toxin"
      ],
      "origin": [
        "alchemical"
      ],
      "delivery": [
        "inhaled",
        "contact"
      ]
    },
    "stages": [
      [
        [
          1,
          "rounds"
        ],
        [
          [
            "damage",
            "1d4",
            "poison"
          ],
          [
            "condition",
            "dazzled"
          ]
        ],
        {}
      ],
      [
        [
          1,
          "rounds"
        ],
        [
          [
            "damage",
            "1d4",
            "poison"
          ],
          [
            "condition",
            "sickened",
            1
          ],
          [
            "condition",
            "dazzled"
          ]
        ],
        {}
      ],
      [
        [
          1,
          "rounds"
        ],
        [
          [
            "damage",
            "1d6",
            "poison"
          ],
          [
            "condition",
            "sickened",
            1
          ],
          [
            "condition",
            "dazzled"
          ]
        ],
        {}
      ]
    ],
    "onset": null,
    "maxDuration": [
      6,
      "rounds"
    ],
    "stubborn": false,
    "virulent": false,
    "identification": "identified",
    "locks": [],
    "rootHealing": "none",
    "injuryPoison": false
  },
  {
    "slug": "numbtongue-tonic",
    "level": 0,
    "dc": 14,
    "type": "poison",
    "rarity": "common",
    "stat": "fortitude",
    "tags": {
      "creature": [
        "humanoid"
      ],
      "habitat": [
        "urban"
      ],
      "theme": [
        "poison",
        "toxin"
      ],
      "origin": [
        "alchemical"
      ],
      "delivery": [
        "ingested"
      ]
    },
    "stages": [
      [
        [
          10,
          "minutes"
        ],
        [
          [
            "condition",
            "stupefied",
            1
          ]
        ],
        {}
      ],
      [
        [
          10,
          "minutes"
        ],
        [
          [
            "condition",
            "stupefied",
            1
          ]
        ],
        {
          "blockSpeak": true
        }
      ],
      [
        [
          10,
          "minutes"
        ],
        [
          [
            "condition",
            "stupefied",
            2
          ]
        ],
        {
          "blockSpeak": true
        }
      ]
    ],
    "onset": [
      1,
      "minutes"
    ],
    "maxDuration": [
      1,
      "hours"
    ],
    "stubborn": false,
    "virulent": false,
    "identification": "identified",
    "locks": [],
    "rootHealing": "none",
    "injuryPoison": false
  },
  {
    "slug": "copperbite-paste",
    "level": 1,
    "dc": 15,
    "type": "poison",
    "rarity": "common",
    "stat": "fortitude",
    "tags": {
      "creature": [
        "humanoid",
        "construct"
      ],
      "habitat": [
        "urban",
        "underground"
      ],
      "theme": [
        "poison",
        "toxin"
      ],
      "origin": [
        "alchemical"
      ],
      "delivery": [
        "weapon",
        "injury"
      ]
    },
    "stages": [
      [
        [
          1,
          "rounds"
        ],
        [
          [
            "damage",
            "1d6",
            "poison"
          ]
        ],
        {}
      ],
      [
        [
          1,
          "rounds"
        ],
        [
          [
            "damage",
            "1d6",
            "poison"
          ],
          [
            "condition",
            "clumsy",
            1
          ]
        ],
        {}
      ],
      [
        [
          1,
          "rounds"
        ],
        [
          [
            "damage",
            "1d6",
            "poison"
          ],
          [
            "condition",
            "clumsy",
            1
          ],
          [
            "condition",
            "sickened",
            1
          ]
        ],
        {}
      ]
    ],
    "onset": null,
    "maxDuration": [
      6,
      "rounds"
    ],
    "stubborn": false,
    "virulent": false,
    "identification": "identified",
    "locks": [],
    "rootHealing": "none",
    "injuryPoison": true
  },
  {
    "slug": "sombercap-distillate",
    "level": 1,
    "dc": 15,
    "type": "poison",
    "rarity": "common",
    "stat": "fortitude",
    "tags": {
      "creature": [
        "fungus",
        "humanoid"
      ],
      "family": [
        "parasite"
      ],
      "habitat": [
        "forest",
        "urban"
      ],
      "theme": [
        "poison",
        "toxin",
        "fungal"
      ],
      "origin": [
        "alchemical",
        "natural"
      ],
      "delivery": [
        "ingested"
      ]
    },
    "stages": [
      [
        [
          10,
          "minutes"
        ],
        [
          [
            "condition",
            "fatigued"
          ]
        ],
        {}
      ],
      [
        [
          10,
          "minutes"
        ],
        [
          [
            "condition",
            "fatigued"
          ],
          [
            "condition",
            "stupefied",
            1
          ]
        ],
        {}
      ],
      [
        [
          10,
          "minutes"
        ],
        [
          [
            "condition",
            "slowed",
            1
          ],
          [
            "condition",
            "stupefied",
            1
          ]
        ],
        {}
      ]
    ],
    "onset": [
      1,
      "minutes"
    ],
    "maxDuration": [
      1,
      "hours"
    ],
    "stubborn": false,
    "virulent": false,
    "identification": "identified",
    "locks": [],
    "rootHealing": "none",
    "injuryPoison": false
  },
  {
    "slug": "emberglass-coating",
    "level": 2,
    "dc": 16,
    "type": "poison",
    "rarity": "uncommon",
    "stat": "fortitude",
    "tags": {
      "creature": [
        "humanoid",
        "construct"
      ],
      "habitat": [
        "urban",
        "volcanic"
      ],
      "theme": [
        "poison",
        "toxin",
        "elemental"
      ],
      "origin": [
        "alchemical"
      ],
      "delivery": [
        "weapon",
        "injury"
      ]
    },
    "stages": [
      [
        [
          1,
          "rounds"
        ],
        [
          [
            "damage",
            "1d6",
            "fire"
          ]
        ],
        {}
      ],
      [
        [
          1,
          "rounds"
        ],
        [
          [
            "damage",
            "1d6",
            "fire"
          ],
          [
            "damagePersistent",
            "1d4",
            "fire"
          ]
        ],
        {}
      ],
      [
        [
          1,
          "rounds"
        ],
        [
          [
            "damage",
            "2d6",
            "fire"
          ],
          [
            "damagePersistent",
            "1d4",
            "fire"
          ],
          [
            "condition",
            "clumsy",
            1
          ]
        ],
        {}
      ]
    ],
    "onset": null,
    "maxDuration": [
      6,
      "rounds"
    ],
    "stubborn": false,
    "virulent": false,
    "identification": "identified",
    "locks": [],
    "rootHealing": "none",
    "injuryPoison": true
  },
  {
    "slug": "hushmist-ampoule",
    "level": 2,
    "dc": 16,
    "type": "poison",
    "rarity": "uncommon",
    "stat": "fortitude",
    "tags": {
      "creature": [
        "humanoid",
        "ooze"
      ],
      "habitat": [
        "urban",
        "underground"
      ],
      "theme": [
        "poison",
        "toxin"
      ],
      "origin": [
        "alchemical"
      ],
      "delivery": [
        "inhaled"
      ]
    },
    "stages": [
      [
        [
          1,
          "rounds"
        ],
        [
          [
            "condition",
            "sickened",
            1
          ]
        ],
        {}
      ],
      [
        [
          1,
          "rounds"
        ],
        [
          [
            "damage",
            "1d6",
            "poison"
          ],
          [
            "condition",
            "sickened",
            1
          ]
        ],
        {
          "blockSpeak": true
        }
      ],
      [
        [
          1,
          "rounds"
        ],
        [
          [
            "damage",
            "1d6",
            "poison"
          ],
          [
            "condition",
            "sickened",
            2
          ]
        ],
        {
          "blockSpeak": true
        }
      ]
    ],
    "onset": null,
    "maxDuration": [
      6,
      "rounds"
    ],
    "stubborn": false,
    "virulent": false,
    "identification": "identified",
    "locks": [],
    "rootHealing": "none",
    "injuryPoison": false
  },
  {
    "slug": "nerve-lacquer",
    "level": 3,
    "dc": 18,
    "type": "poison",
    "rarity": "uncommon",
    "stat": "fortitude",
    "tags": {
      "creature": [
        "humanoid",
        "construct"
      ],
      "habitat": [
        "urban"
      ],
      "theme": [
        "poison",
        "toxin"
      ],
      "origin": [
        "alchemical"
      ],
      "delivery": [
        "weapon",
        "injury"
      ]
    },
    "stages": [
      [
        [
          1,
          "rounds"
        ],
        [
          [
            "damage",
            "1d6",
            "poison"
          ],
          [
            "condition",
            "clumsy",
            1
          ]
        ],
        {}
      ],
      [
        [
          1,
          "rounds"
        ],
        [
          [
            "damage",
            "2d6",
            "poison"
          ],
          [
            "condition",
            "clumsy",
            1
          ]
        ],
        {}
      ],
      [
        [
          1,
          "rounds"
        ],
        [
          [
            "damage",
            "2d6",
            "poison"
          ],
          [
            "condition",
            "clumsy",
            2
          ],
          [
            "condition",
            "slowed",
            1
          ]
        ],
        {}
      ]
    ],
    "onset": null,
    "maxDuration": [
      6,
      "rounds"
    ],
    "stubborn": false,
    "virulent": false,
    "identification": "identified",
    "locks": [],
    "rootHealing": "none",
    "injuryPoison": true
  },
  {
    "slug": "verdigris-fever",
    "level": 3,
    "dc": 18,
    "type": "disease",
    "rarity": "uncommon",
    "stat": "fortitude",
    "tags": {
      "creature": [
        "construct",
        "humanoid"
      ],
      "habitat": [
        "urban",
        "underground"
      ],
      "theme": [
        "disease",
        "toxin",
        "corruption"
      ],
      "origin": [
        "alchemical",
        "technological"
      ],
      "delivery": [
        "contact",
        "inhaled"
      ]
    },
    "stages": [
      [
        [
          8,
          "hours"
        ],
        [
          [
            "condition",
            "sickened",
            1
          ]
        ],
        {}
      ],
      [
        [
          8,
          "hours"
        ],
        [
          [
            "damage",
            "1d6",
            "poison"
          ],
          [
            "condition",
            "sickened",
            1
          ],
          [
            "condition",
            "fatigued"
          ]
        ],
        {}
      ],
      [
        [
          8,
          "hours"
        ],
        [
          [
            "damage",
            "2d6",
            "poison"
          ],
          [
            "condition",
            "sickened",
            2
          ],
          [
            "condition",
            "drained",
            1
          ]
        ],
        {}
      ]
    ],
    "onset": [
      1,
      "hours"
    ],
    "maxDuration": [
      3,
      "days"
    ],
    "stubborn": false,
    "virulent": false,
    "identification": "identified",
    "locks": [],
    "rootHealing": "none",
    "injuryPoison": false
  },
  {
    "slug": "blackout-resin",
    "level": 4,
    "dc": 19,
    "type": "poison",
    "rarity": "uncommon",
    "stat": "fortitude",
    "tags": {
      "creature": [
        "humanoid"
      ],
      "habitat": [
        "urban",
        "underground"
      ],
      "theme": [
        "poison",
        "toxin",
        "mental"
      ],
      "origin": [
        "alchemical"
      ],
      "delivery": [
        "weapon",
        "injury"
      ]
    },
    "stages": [
      [
        [
          1,
          "rounds"
        ],
        [
          [
            "damage",
            "2d6",
            "poison"
          ]
        ],
        {}
      ],
      [
        [
          1,
          "rounds"
        ],
        [
          [
            "damage",
            "2d6",
            "poison"
          ],
          [
            "condition",
            "stupefied",
            1
          ]
        ],
        {}
      ],
      [
        [
          1,
          "rounds"
        ],
        [
          [
            "damage",
            "2d6",
            "poison"
          ],
          [
            "condition",
            "stupefied",
            2
          ],
          [
            "condition",
            "slowed",
            1
          ]
        ],
        {
          "gate": 5
        }
      ]
    ],
    "onset": null,
    "maxDuration": [
      6,
      "rounds"
    ],
    "stubborn": false,
    "virulent": false,
    "identification": "identified",
    "locks": [],
    "rootHealing": "none",
    "injuryPoison": true
  },
  {
    "slug": "mutagen-bloom",
    "level": 4,
    "dc": 19,
    "type": "disease",
    "rarity": "uncommon",
    "stat": "fortitude",
    "tags": {
      "creature": [
        "ooze",
        "humanoid",
        "aberration"
      ],
      "habitat": [
        "urban",
        "underground"
      ],
      "theme": [
        "disease",
        "mutation",
        "corruption"
      ],
      "origin": [
        "alchemical"
      ],
      "delivery": [
        "contact",
        "inhaled"
      ]
    },
    "stages": [
      [
        [
          6,
          "hours"
        ],
        [
          [
            "condition",
            "clumsy",
            1
          ]
        ],
        {}
      ],
      [
        [
          6,
          "hours"
        ],
        [
          [
            "condition",
            "clumsy",
            1
          ],
          [
            "condition",
            "sickened",
            1
          ]
        ],
        {}
      ],
      [
        [
          6,
          "hours"
        ],
        [
          [
            "damage",
            "2d6",
            "poison"
          ],
          [
            "condition",
            "clumsy",
            2
          ],
          [
            "condition",
            "sickened",
            1
          ]
        ],
        {}
      ]
    ],
    "onset": [
      10,
      "minutes"
    ],
    "maxDuration": [
      2,
      "days"
    ],
    "stubborn": false,
    "virulent": false,
    "identification": "identified",
    "locks": [],
    "rootHealing": "none",
    "injuryPoison": false
  },
  {
    "slug": "ghostsalt-injection",
    "level": 5,
    "dc": 20,
    "type": "poison",
    "rarity": "uncommon",
    "stat": "fortitude",
    "tags": {
      "creature": [
        "humanoid",
        "spirit"
      ],
      "habitat": [
        "urban"
      ],
      "theme": [
        "poison",
        "toxin",
        "necrotic"
      ],
      "origin": [
        "alchemical",
        "occult"
      ],
      "delivery": [
        "injury"
      ]
    },
    "stages": [
      [
        [
          1,
          "rounds"
        ],
        [
          [
            "damage",
            "2d6",
            "poison"
          ],
          [
            "damage",
            "1d4",
            "spirit"
          ]
        ],
        {}
      ],
      [
        [
          1,
          "rounds"
        ],
        [
          [
            "damage",
            "2d6",
            "poison"
          ],
          [
            "condition",
            "drained",
            1
          ]
        ],
        {}
      ],
      [
        [
          1,
          "rounds"
        ],
        [
          [
            "damage",
            "3d6",
            "poison"
          ],
          [
            "damage",
            "1d6",
            "spirit"
          ],
          [
            "condition",
            "drained",
            1
          ]
        ],
        {}
      ]
    ],
    "onset": null,
    "maxDuration": [
      6,
      "rounds"
    ],
    "stubborn": false,
    "virulent": false,
    "identification": "identified",
    "locks": [],
    "rootHealing": "none",
    "injuryPoison": false
  },
  {
    "slug": "smokeserpent-compound",
    "level": 5,
    "dc": 20,
    "type": "poison",
    "rarity": "uncommon",
    "stat": "fortitude",
    "tags": {
      "creature": [
        "humanoid",
        "beast"
      ],
      "family": [
        "snake"
      ],
      "habitat": [
        "urban",
        "desert"
      ],
      "theme": [
        "poison",
        "toxin"
      ],
      "origin": [
        "alchemical"
      ],
      "delivery": [
        "weapon",
        "injury"
      ]
    },
    "stages": [
      [
        [
          1,
          "rounds"
        ],
        [
          [
            "damage",
            "2d6",
            "poison"
          ]
        ],
        {}
      ],
      [
        [
          1,
          "rounds"
        ],
        [
          [
            "damage",
            "2d6",
            "poison"
          ],
          [
            "condition",
            "clumsy",
            1
          ]
        ],
        {}
      ],
      [
        [
          1,
          "rounds"
        ],
        [
          [
            "damage",
            "3d6",
            "poison"
          ],
          [
            "condition",
            "clumsy",
            1
          ],
          [
            "condition",
            "slowed",
            1
          ]
        ],
        {}
      ]
    ],
    "onset": null,
    "maxDuration": [
      6,
      "rounds"
    ],
    "stubborn": false,
    "virulent": false,
    "identification": "identified",
    "locks": [],
    "rootHealing": "none",
    "injuryPoison": true
  },
  {
    "slug": "marrow-solvent",
    "level": 6,
    "dc": 22,
    "type": "poison",
    "rarity": "rare",
    "stat": "fortitude",
    "tags": {
      "creature": [
        "humanoid",
        "ooze"
      ],
      "habitat": [
        "urban",
        "underground"
      ],
      "theme": [
        "poison",
        "toxin",
        "blood"
      ],
      "origin": [
        "alchemical"
      ],
      "delivery": [
        "weapon",
        "injury"
      ]
    },
    "stages": [
      [
        [
          1,
          "rounds"
        ],
        [
          [
            "damage",
            "2d6",
            "acid"
          ]
        ],
        {}
      ],
      [
        [
          1,
          "rounds"
        ],
        [
          [
            "damage",
            "2d6",
            "acid"
          ],
          [
            "damagePersistent",
            "1d6",
            "acid"
          ]
        ],
        {}
      ],
      [
        [
          1,
          "rounds"
        ],
        [
          [
            "damage",
            "3d6",
            "acid"
          ],
          [
            "damagePersistent",
            "1d6",
            "acid"
          ],
          [
            "condition",
            "enfeebled",
            1
          ]
        ],
        {}
      ]
    ],
    "onset": null,
    "maxDuration": [
      6,
      "rounds"
    ],
    "stubborn": false,
    "virulent": false,
    "identification": "identified",
    "locks": [],
    "rootHealing": "none",
    "injuryPoison": true
  },
  {
    "slug": "glasslung-culture",
    "level": 6,
    "dc": 22,
    "type": "disease",
    "rarity": "rare",
    "stat": "fortitude",
    "tags": {
      "creature": [
        "humanoid",
        "fungus"
      ],
      "habitat": [
        "urban",
        "underground"
      ],
      "theme": [
        "disease",
        "spores",
        "corruption"
      ],
      "origin": [
        "alchemical"
      ],
      "delivery": [
        "inhaled"
      ]
    },
    "stages": [
      [
        [
          6,
          "hours"
        ],
        [
          [
            "condition",
            "sickened",
            1
          ]
        ],
        {}
      ],
      [
        [
          6,
          "hours"
        ],
        [
          [
            "damage",
            "2d6",
            "poison"
          ],
          [
            "condition",
            "sickened",
            1
          ],
          [
            "condition",
            "fatigued"
          ]
        ],
        {}
      ],
      [
        [
          6,
          "hours"
        ],
        [
          [
            "damage",
            "2d6",
            "poison"
          ],
          [
            "condition",
            "sickened",
            2
          ],
          [
            "condition",
            "drained",
            1
          ]
        ],
        {
          "healing": "affliction-damage"
        }
      ]
    ],
    "onset": [
      10,
      "minutes"
    ],
    "maxDuration": [
      3,
      "days"
    ],
    "stubborn": false,
    "virulent": true,
    "identification": "identified",
    "locks": [],
    "rootHealing": "none",
    "injuryPoison": false
  },
  {
    "slug": "clockwork-bile",
    "level": 7,
    "dc": 23,
    "type": "poison",
    "rarity": "rare",
    "stat": "fortitude",
    "tags": {
      "creature": [
        "construct",
        "humanoid"
      ],
      "habitat": [
        "urban"
      ],
      "theme": [
        "poison",
        "toxin",
        "elemental"
      ],
      "origin": [
        "alchemical",
        "technological"
      ],
      "delivery": [
        "contact",
        "inhaled"
      ]
    },
    "stages": [
      [
        [
          1,
          "rounds"
        ],
        [
          [
            "damage",
            "2d6",
            "electricity"
          ]
        ],
        {}
      ],
      [
        [
          1,
          "rounds"
        ],
        [
          [
            "damage",
            "2d6",
            "electricity"
          ],
          [
            "condition",
            "clumsy",
            1
          ]
        ],
        {}
      ],
      [
        [
          1,
          "rounds"
        ],
        [
          [
            "damage",
            "3d6",
            "electricity"
          ],
          [
            "condition",
            "clumsy",
            2
          ],
          [
            "condition",
            "slowed",
            1
          ]
        ],
        {}
      ]
    ],
    "onset": null,
    "maxDuration": [
      6,
      "rounds"
    ],
    "stubborn": false,
    "virulent": false,
    "identification": "identified",
    "locks": [],
    "rootHealing": "none",
    "injuryPoison": false
  },
  {
    "slug": "bloodbreaker-serum",
    "level": 7,
    "dc": 23,
    "type": "poison",
    "rarity": "rare",
    "stat": "fortitude",
    "tags": {
      "creature": [
        "humanoid"
      ],
      "habitat": [
        "urban"
      ],
      "theme": [
        "poison",
        "toxin",
        "blood"
      ],
      "origin": [
        "alchemical"
      ],
      "delivery": [
        "weapon",
        "injury"
      ]
    },
    "stages": [
      [
        [
          1,
          "rounds"
        ],
        [
          [
            "damage",
            "2d6",
            "poison"
          ]
        ],
        {}
      ],
      [
        [
          1,
          "rounds"
        ],
        [
          [
            "damage",
            "3d6",
            "poison"
          ],
          [
            "condition",
            "drained",
            1
          ]
        ],
        {}
      ],
      [
        [
          1,
          "rounds"
        ],
        [
          [
            "damage",
            "3d6",
            "poison"
          ],
          [
            "condition",
            "drained",
            2
          ]
        ],
        {}
      ]
    ],
    "onset": null,
    "maxDuration": [
      6,
      "rounds"
    ],
    "stubborn": false,
    "virulent": false,
    "identification": "identified",
    "locks": [],
    "rootHealing": "none",
    "injuryPoison": true
  },
  {
    "slug": "prism-toxin",
    "level": 8,
    "dc": 24,
    "type": "poison",
    "rarity": "rare",
    "stat": "fortitude",
    "tags": {
      "creature": [
        "humanoid",
        "construct"
      ],
      "habitat": [
        "urban"
      ],
      "theme": [
        "poison",
        "toxin",
        "elemental"
      ],
      "origin": [
        "alchemical",
        "arcane"
      ],
      "delivery": [
        "weapon",
        "injury"
      ]
    },
    "stages": [
      [
        [
          1,
          "rounds"
        ],
        [
          [
            "damage",
            "2d6",
            "poison"
          ],
          [
            "damage",
            "1d6",
            "electricity"
          ]
        ],
        {}
      ],
      [
        [
          1,
          "rounds"
        ],
        [
          [
            "damage",
            "3d6",
            "poison"
          ],
          [
            "damage",
            "1d6",
            "fire"
          ],
          [
            "condition",
            "clumsy",
            1
          ]
        ],
        {}
      ],
      [
        [
          1,
          "rounds"
        ],
        [
          [
            "damage",
            "3d6",
            "poison"
          ],
          [
            "damage",
            "1d6",
            "cold"
          ],
          [
            "condition",
            "clumsy",
            2
          ]
        ],
        {}
      ]
    ],
    "onset": null,
    "maxDuration": [
      6,
      "rounds"
    ],
    "stubborn": false,
    "virulent": false,
    "identification": "identified",
    "locks": [],
    "rootHealing": "none",
    "injuryPoison": true
  },
  {
    "slug": "mimic-spore-suspension",
    "level": 8,
    "dc": 24,
    "type": "disease",
    "rarity": "rare",
    "stat": "fortitude",
    "tags": {
      "creature": [
        "fungus",
        "ooze",
        "aberration"
      ],
      "habitat": [
        "urban",
        "underground"
      ],
      "theme": [
        "disease",
        "spores",
        "mutation"
      ],
      "origin": [
        "alchemical",
        "magical"
      ],
      "delivery": [
        "inhaled",
        "contact"
      ]
    },
    "stages": [
      [
        [
          4,
          "hours"
        ],
        [
          [
            "condition",
            "sickened",
            1
          ]
        ],
        {}
      ],
      [
        [
          4,
          "hours"
        ],
        [
          [
            "damage",
            "2d6",
            "poison"
          ],
          [
            "condition",
            "sickened",
            1
          ],
          [
            "condition",
            "clumsy",
            1
          ]
        ],
        {}
      ],
      [
        [
          4,
          "hours"
        ],
        [
          [
            "damage",
            "3d6",
            "poison"
          ],
          [
            "condition",
            "sickened",
            2
          ],
          [
            "condition",
            "clumsy",
            1
          ],
          [
            "condition",
            "drained",
            1
          ]
        ],
        {}
      ]
    ],
    "onset": [
      10,
      "minutes"
    ],
    "maxDuration": [
      2,
      "days"
    ],
    "stubborn": false,
    "virulent": true,
    "identification": "identified",
    "locks": [],
    "rootHealing": "none",
    "injuryPoison": false
  },
  {
    "slug": "kingmaker-poison",
    "level": 9,
    "dc": 26,
    "type": "poison",
    "rarity": "rare",
    "stat": "fortitude",
    "tags": {
      "creature": [
        "humanoid"
      ],
      "habitat": [
        "urban"
      ],
      "theme": [
        "poison",
        "toxin",
        "blood"
      ],
      "origin": [
        "alchemical"
      ],
      "delivery": [
        "weapon",
        "injury"
      ]
    },
    "stages": [
      [
        [
          1,
          "rounds"
        ],
        [
          [
            "damage",
            "3d6",
            "poison"
          ]
        ],
        {}
      ],
      [
        [
          1,
          "rounds"
        ],
        [
          [
            "damage",
            "3d6",
            "poison"
          ],
          [
            "condition",
            "enfeebled",
            1
          ]
        ],
        {}
      ],
      [
        [
          1,
          "rounds"
        ],
        [
          [
            "damage",
            "4d6",
            "poison"
          ],
          [
            "condition",
            "enfeebled",
            2
          ],
          [
            "condition",
            "drained",
            1
          ]
        ],
        {}
      ]
    ],
    "onset": null,
    "maxDuration": [
      6,
      "rounds"
    ],
    "stubborn": false,
    "virulent": false,
    "identification": "identified",
    "locks": [],
    "rootHealing": "none",
    "injuryPoison": true
  },
  {
    "slug": "red-tide-reagent",
    "level": 9,
    "dc": 26,
    "type": "poison",
    "rarity": "rare",
    "stat": "fortitude",
    "tags": {
      "creature": [
        "ooze",
        "humanoid"
      ],
      "habitat": [
        "urban",
        "coastal"
      ],
      "theme": [
        "poison",
        "toxin",
        "blood"
      ],
      "origin": [
        "alchemical"
      ],
      "delivery": [
        "contact",
        "ingested"
      ]
    },
    "stages": [
      [
        [
          1,
          "minutes"
        ],
        [
          [
            "condition",
            "sickened",
            1
          ]
        ],
        {}
      ],
      [
        [
          1,
          "minutes"
        ],
        [
          [
            "damage",
            "3d6",
            "poison"
          ],
          [
            "condition",
            "sickened",
            1
          ]
        ],
        {}
      ],
      [
        [
          1,
          "minutes"
        ],
        [
          [
            "damage",
            "4d6",
            "poison"
          ],
          [
            "condition",
            "sickened",
            2
          ],
          [
            "condition",
            "drained",
            1
          ]
        ],
        {}
      ]
    ],
    "onset": [
      1,
      "minutes"
    ],
    "maxDuration": [
      10,
      "minutes"
    ],
    "stubborn": false,
    "virulent": false,
    "identification": "identified",
    "locks": [],
    "rootHealing": "none",
    "injuryPoison": false
  },
  {
    "slug": "nullsilver-catalyst",
    "level": 10,
    "dc": 27,
    "type": "poison",
    "rarity": "rare",
    "stat": "will",
    "tags": {
      "creature": [
        "humanoid",
        "construct"
      ],
      "habitat": [
        "urban"
      ],
      "theme": [
        "poison",
        "toxin",
        "mental"
      ],
      "origin": [
        "alchemical",
        "arcane"
      ],
      "delivery": [
        "weapon",
        "injury"
      ]
    },
    "stages": [
      [
        [
          1,
          "rounds"
        ],
        [
          [
            "damage",
            "3d6",
            "mental"
          ],
          [
            "condition",
            "stupefied",
            1
          ]
        ],
        {}
      ],
      [
        [
          1,
          "rounds"
        ],
        [
          [
            "damage",
            "4d6",
            "mental"
          ],
          [
            "condition",
            "stupefied",
            1
          ]
        ],
        {
          "gate": 7
        }
      ],
      [
        [
          1,
          "rounds"
        ],
        [
          [
            "damage",
            "4d6",
            "mental"
          ],
          [
            "condition",
            "stupefied",
            2
          ],
          [
            "condition",
            "slowed",
            1
          ]
        ],
        {
          "gate": 7
        }
      ]
    ],
    "onset": null,
    "maxDuration": [
      6,
      "rounds"
    ],
    "stubborn": false,
    "virulent": false,
    "identification": "identified",
    "locks": [],
    "rootHealing": "none",
    "injuryPoison": true
  },
  {
    "slug": "marrowfire-plague",
    "level": 10,
    "dc": 27,
    "type": "disease",
    "rarity": "rare",
    "stat": "fortitude",
    "tags": {
      "creature": [
        "humanoid",
        "aberration"
      ],
      "habitat": [
        "urban",
        "volcanic"
      ],
      "theme": [
        "disease",
        "blood",
        "corruption"
      ],
      "origin": [
        "alchemical",
        "magical"
      ],
      "delivery": [
        "contact",
        "injury"
      ]
    },
    "stages": [
      [
        [
          4,
          "hours"
        ],
        [
          [
            "condition",
            "fatigued"
          ]
        ],
        {}
      ],
      [
        [
          4,
          "hours"
        ],
        [
          [
            "damage",
            "3d6",
            "fire"
          ],
          [
            "condition",
            "fatigued"
          ],
          [
            "condition",
            "drained",
            1
          ]
        ],
        {}
      ],
      [
        [
          4,
          "hours"
        ],
        [
          [
            "damage",
            "4d6",
            "fire"
          ],
          [
            "condition",
            "drained",
            2
          ]
        ],
        {
          "healing": "affliction-damage"
        }
      ]
    ],
    "onset": [
      10,
      "minutes"
    ],
    "maxDuration": [
      2,
      "days"
    ],
    "stubborn": false,
    "virulent": true,
    "identification": "identified",
    "locks": [],
    "rootHealing": "none",
    "injuryPoison": false
  },
  {
    "slug": "black-mercury",
    "level": 11,
    "dc": 28,
    "type": "poison",
    "rarity": "rare",
    "stat": "fortitude",
    "tags": {
      "creature": [
        "humanoid",
        "construct"
      ],
      "habitat": [
        "urban",
        "underground"
      ],
      "theme": [
        "poison",
        "toxin",
        "corruption"
      ],
      "origin": [
        "alchemical",
        "technological"
      ],
      "delivery": [
        "contact",
        "inhaled"
      ]
    },
    "stages": [
      [
        [
          1,
          "rounds"
        ],
        [
          [
            "damage",
            "4d6",
            "poison"
          ]
        ],
        {}
      ],
      [
        [
          1,
          "rounds"
        ],
        [
          [
            "damage",
            "4d6",
            "poison"
          ],
          [
            "condition",
            "clumsy",
            1
          ],
          [
            "condition",
            "stupefied",
            1
          ]
        ],
        {}
      ],
      [
        [
          1,
          "rounds"
        ],
        [
          [
            "damage",
            "5d6",
            "poison"
          ],
          [
            "condition",
            "clumsy",
            2
          ],
          [
            "condition",
            "stupefied",
            2
          ]
        ],
        {}
      ]
    ],
    "onset": null,
    "maxDuration": [
      6,
      "rounds"
    ],
    "stubborn": false,
    "virulent": true,
    "identification": "identified",
    "locks": [],
    "rootHealing": "none",
    "injuryPoison": false
  },
  {
    "slug": "thought-eater-elixir",
    "level": 12,
    "dc": 30,
    "type": "poison",
    "rarity": "rare",
    "stat": "will",
    "tags": {
      "creature": [
        "humanoid",
        "aberration"
      ],
      "habitat": [
        "urban"
      ],
      "theme": [
        "poison",
        "toxin",
        "mental"
      ],
      "origin": [
        "alchemical",
        "occult"
      ],
      "delivery": [
        "ingested"
      ]
    },
    "stages": [
      [
        [
          10,
          "minutes"
        ],
        [
          [
            "condition",
            "stupefied",
            1
          ]
        ],
        {}
      ],
      [
        [
          10,
          "minutes"
        ],
        [
          [
            "damage",
            "3d6",
            "mental"
          ],
          [
            "condition",
            "stupefied",
            2
          ]
        ],
        {
          "gate": 7
        }
      ],
      [
        [
          10,
          "minutes"
        ],
        [
          [
            "damage",
            "4d6",
            "mental"
          ],
          [
            "condition",
            "stupefied",
            2
          ],
          [
            "condition",
            "slowed",
            1
          ]
        ],
        {
          "gate": 9,
          "blockSpeak": true
        }
      ]
    ],
    "onset": [
      1,
      "minutes"
    ],
    "maxDuration": [
      1,
      "hours"
    ],
    "stubborn": true,
    "virulent": false,
    "identification": "identified",
    "locks": [],
    "rootHealing": "none",
    "injuryPoison": false
  },
  {
    "slug": "fleshweaver-serum",
    "level": 13,
    "dc": 31,
    "type": "disease",
    "rarity": "rare",
    "stat": "fortitude",
    "tags": {
      "creature": [
        "aberration",
        "humanoid",
        "ooze"
      ],
      "habitat": [
        "urban",
        "underground"
      ],
      "theme": [
        "disease",
        "mutation",
        "corruption"
      ],
      "origin": [
        "alchemical",
        "magical"
      ],
      "delivery": [
        "injury",
        "contact"
      ]
    },
    "stages": [
      [
        [
          4,
          "hours"
        ],
        [
          [
            "condition",
            "clumsy",
            1
          ]
        ],
        {}
      ],
      [
        [
          4,
          "hours"
        ],
        [
          [
            "damage",
            "3d6",
            "poison"
          ],
          [
            "condition",
            "clumsy",
            2
          ],
          [
            "condition",
            "sickened",
            1
          ]
        ],
        {}
      ],
      [
        [
          4,
          "hours"
        ],
        [
          [
            "damage",
            "4d6",
            "poison"
          ],
          [
            "condition",
            "clumsy",
            2
          ],
          [
            "condition",
            "drained",
            1
          ]
        ],
        {
          "locks": [
            [
              "clumsy",
              1
            ]
          ]
        }
      ]
    ],
    "onset": [
      10,
      "minutes"
    ],
    "maxDuration": [
      2,
      "days"
    ],
    "stubborn": false,
    "virulent": true,
    "identification": "identified",
    "locks": [],
    "rootHealing": "none",
    "injuryPoison": false
  },
  {
    "slug": "dragonbone-distillate",
    "level": 14,
    "dc": 32,
    "type": "poison",
    "rarity": "rare",
    "stat": "fortitude",
    "tags": {
      "creature": [
        "dragon",
        "humanoid"
      ],
      "habitat": [
        "urban",
        "mountain"
      ],
      "theme": [
        "poison",
        "toxin",
        "elemental"
      ],
      "origin": [
        "alchemical",
        "arcane"
      ],
      "delivery": [
        "ingested",
        "contact"
      ]
    },
    "stages": [
      [
        [
          1,
          "rounds"
        ],
        [
          [
            "damage",
            "4d6",
            "poison"
          ],
          [
            "damage",
            "2d6",
            "fire"
          ]
        ],
        {}
      ],
      [
        [
          1,
          "rounds"
        ],
        [
          [
            "damage",
            "5d6",
            "poison"
          ],
          [
            "damage",
            "2d6",
            "fire"
          ],
          [
            "condition",
            "sickened",
            1
          ]
        ],
        {}
      ],
      [
        [
          1,
          "rounds"
        ],
        [
          [
            "damage",
            "6d6",
            "poison"
          ],
          [
            "damage",
            "2d6",
            "fire"
          ],
          [
            "condition",
            "sickened",
            2
          ]
        ],
        {}
      ]
    ],
    "onset": null,
    "maxDuration": [
      6,
      "rounds"
    ],
    "stubborn": false,
    "virulent": false,
    "identification": "identified",
    "locks": [],
    "rootHealing": "none",
    "injuryPoison": false
  },
  {
    "slug": "voidglass-poison",
    "level": 15,
    "dc": 34,
    "type": "poison",
    "rarity": "rare",
    "stat": "fortitude",
    "tags": {
      "creature": [
        "humanoid",
        "spirit"
      ],
      "habitat": [
        "urban",
        "planar"
      ],
      "theme": [
        "poison",
        "toxin",
        "necrotic"
      ],
      "origin": [
        "alchemical",
        "occult"
      ],
      "delivery": [
        "weapon",
        "injury"
      ]
    },
    "stages": [
      [
        [
          1,
          "rounds"
        ],
        [
          [
            "damage",
            "5d6",
            "poison"
          ],
          [
            "damage",
            "2d6",
            "void"
          ]
        ],
        {}
      ],
      [
        [
          1,
          "rounds"
        ],
        [
          [
            "damage",
            "5d6",
            "poison"
          ],
          [
            "damage",
            "3d6",
            "void"
          ],
          [
            "condition",
            "drained",
            1
          ]
        ],
        {}
      ],
      [
        [
          1,
          "rounds"
        ],
        [
          [
            "damage",
            "6d6",
            "poison"
          ],
          [
            "damage",
            "3d6",
            "void"
          ],
          [
            "condition",
            "drained",
            2
          ]
        ],
        {
          "healing": "affliction-damage"
        }
      ]
    ],
    "onset": null,
    "maxDuration": [
      6,
      "rounds"
    ],
    "stubborn": false,
    "virulent": true,
    "identification": "identified",
    "locks": [],
    "rootHealing": "none",
    "injuryPoison": true
  },
  {
    "slug": "homunculus-rot",
    "level": 16,
    "dc": 35,
    "type": "disease",
    "rarity": "rare",
    "stat": "fortitude",
    "tags": {
      "creature": [
        "construct",
        "humanoid"
      ],
      "habitat": [
        "urban",
        "underground"
      ],
      "theme": [
        "disease",
        "corruption",
        "mutation"
      ],
      "origin": [
        "alchemical",
        "arcane"
      ],
      "delivery": [
        "contact",
        "injury"
      ]
    },
    "stages": [
      [
        [
          4,
          "hours"
        ],
        [
          [
            "condition",
            "sickened",
            1
          ],
          [
            "condition",
            "stupefied",
            1
          ]
        ],
        {}
      ],
      [
        [
          4,
          "hours"
        ],
        [
          [
            "damage",
            "4d6",
            "poison"
          ],
          [
            "condition",
            "sickened",
            2
          ],
          [
            "condition",
            "stupefied",
            1
          ]
        ],
        {}
      ],
      [
        [
          4,
          "hours"
        ],
        [
          [
            "damage",
            "5d6",
            "poison"
          ],
          [
            "condition",
            "sickened",
            2
          ],
          [
            "condition",
            "stupefied",
            2
          ],
          [
            "condition",
            "drained",
            1
          ]
        ],
        {}
      ]
    ],
    "onset": [
      10,
      "minutes"
    ],
    "maxDuration": [
      2,
      "days"
    ],
    "stubborn": false,
    "virulent": true,
    "identification": "identified",
    "locks": [],
    "rootHealing": "none",
    "injuryPoison": false
  },
  {
    "slug": "phoenixbane-reagent",
    "level": 17,
    "dc": 36,
    "type": "poison",
    "rarity": "rare",
    "stat": "fortitude",
    "tags": {
      "creature": [
        "humanoid",
        "elemental"
      ],
      "habitat": [
        "urban",
        "volcanic"
      ],
      "theme": [
        "poison",
        "toxin",
        "elemental"
      ],
      "origin": [
        "alchemical",
        "magical"
      ],
      "delivery": [
        "weapon",
        "injury"
      ]
    },
    "stages": [
      [
        [
          1,
          "rounds"
        ],
        [
          [
            "damage",
            "6d6",
            "poison"
          ],
          [
            "damage",
            "2d6",
            "cold"
          ]
        ],
        {}
      ],
      [
        [
          1,
          "rounds"
        ],
        [
          [
            "damage",
            "6d6",
            "poison"
          ],
          [
            "damage",
            "3d6",
            "cold"
          ],
          [
            "condition",
            "slowed",
            1
          ]
        ],
        {}
      ],
      [
        [
          1,
          "rounds"
        ],
        [
          [
            "damage",
            "7d6",
            "poison"
          ],
          [
            "damage",
            "3d6",
            "cold"
          ],
          [
            "condition",
            "slowed",
            1
          ],
          [
            "condition",
            "drained",
            1
          ]
        ],
        {
          "healing": "affliction-damage"
        }
      ]
    ],
    "onset": null,
    "maxDuration": [
      6,
      "rounds"
    ],
    "stubborn": false,
    "virulent": true,
    "identification": "identified",
    "locks": [],
    "rootHealing": "none",
    "injuryPoison": true
  },
  {
    "slug": "green-crucible-fever",
    "level": 18,
    "dc": 38,
    "type": "disease",
    "rarity": "rare",
    "stat": "fortitude",
    "tags": {
      "creature": [
        "ooze",
        "aberration",
        "humanoid"
      ],
      "habitat": [
        "urban",
        "underground"
      ],
      "theme": [
        "disease",
        "mutation",
        "corruption"
      ],
      "origin": [
        "alchemical"
      ],
      "delivery": [
        "inhaled",
        "contact"
      ]
    },
    "stages": [
      [
        [
          2,
          "hours"
        ],
        [
          [
            "damage",
            "4d6",
            "acid"
          ],
          [
            "condition",
            "sickened",
            1
          ]
        ],
        {}
      ],
      [
        [
          2,
          "hours"
        ],
        [
          [
            "damage",
            "5d6",
            "acid"
          ],
          [
            "condition",
            "sickened",
            2
          ],
          [
            "condition",
            "drained",
            1
          ]
        ],
        {}
      ],
      [
        [
          2,
          "hours"
        ],
        [
          [
            "damage",
            "6d6",
            "acid"
          ],
          [
            "condition",
            "sickened",
            2
          ],
          [
            "condition",
            "drained",
            2
          ]
        ],
        {
          "locks": [
            [
              "drained",
              1
            ]
          ],
          "healing": "affliction-damage"
        }
      ]
    ],
    "onset": [
      10,
      "minutes"
    ],
    "maxDuration": [
      1,
      "days"
    ],
    "stubborn": false,
    "virulent": true,
    "identification": "identified",
    "locks": [],
    "rootHealing": "none",
    "injuryPoison": false
  },
  {
    "slug": "philosophers-blight",
    "level": 19,
    "dc": 39,
    "type": "disease",
    "rarity": "rare",
    "stat": "will",
    "tags": {
      "creature": [
        "humanoid",
        "aberration"
      ],
      "habitat": [
        "urban"
      ],
      "theme": [
        "disease",
        "mental",
        "corruption"
      ],
      "origin": [
        "alchemical",
        "occult"
      ],
      "delivery": [
        "inhaled",
        "ingested"
      ]
    },
    "stages": [
      [
        [
          2,
          "hours"
        ],
        [
          [
            "condition",
            "stupefied",
            1
          ]
        ],
        {}
      ],
      [
        [
          2,
          "hours"
        ],
        [
          [
            "damage",
            "5d6",
            "mental"
          ],
          [
            "condition",
            "stupefied",
            2
          ]
        ],
        {
          "gate": 9
        }
      ],
      [
        [
          2,
          "hours"
        ],
        [
          [
            "damage",
            "6d6",
            "mental"
          ],
          [
            "condition",
            "stupefied",
            3
          ],
          [
            "condition",
            "slowed",
            1
          ]
        ],
        {
          "gate": 11,
          "blockSpeak": true,
          "locks": [
            [
              "stupefied",
              1
            ]
          ]
        }
      ]
    ],
    "onset": [
      10,
      "minutes"
    ],
    "maxDuration": [
      1,
      "days"
    ],
    "stubborn": true,
    "virulent": true,
    "identification": "identified",
    "locks": [],
    "rootHealing": "none",
    "injuryPoison": false
  },
  {
    "slug": "apex-distillate",
    "level": 20,
    "dc": 40,
    "type": "poison",
    "rarity": "rare",
    "stat": "fortitude",
    "tags": {
      "creature": [
        "humanoid",
        "aberration",
        "construct"
      ],
      "habitat": [
        "urban",
        "planar"
      ],
      "theme": [
        "poison",
        "toxin",
        "corruption",
        "mutation"
      ],
      "origin": [
        "alchemical",
        "magical"
      ],
      "delivery": [
        "contact",
        "ingested",
        "injury"
      ]
    },
    "stages": [
      [
        [
          1,
          "rounds"
        ],
        [
          [
            "damage",
            "7d6",
            "poison"
          ],
          [
            "condition",
            "drained",
            1
          ]
        ],
        {}
      ],
      [
        [
          1,
          "rounds"
        ],
        [
          [
            "damage",
            "8d6",
            "poison"
          ],
          [
            "condition",
            "drained",
            2
          ],
          [
            "condition",
            "slowed",
            1
          ]
        ],
        {
          "healing": "affliction-damage"
        }
      ],
      [
        [
          1,
          "rounds"
        ],
        [
          [
            "damage",
            "8d6",
            "poison"
          ],
          [
            "damage",
            "4d6",
            "void"
          ],
          [
            "condition",
            "drained",
            3
          ],
          [
            "death",
            "death-effect"
          ]
        ],
        {
          "healing": "all",
          "locks": [
            [
              "drained",
              2
            ]
          ]
        }
      ]
    ],
    "onset": null,
    "maxDuration": [
      6,
      "rounds"
    ],
    "stubborn": false,
    "virulent": true,
    "identification": "identified",
    "locks": [],
    "rootHealing": "none",
    "injuryPoison": false
  }
];

export const ALCHEMISTS_CABINET_MODULE_ID = MODULE_ID;
export const ALCHEMISTS_CABINET_CONTENT_VERSION = CONTENT_VERSION;
export const ALCHEMISTS_CABINET_DEFINITIONS = Object.freeze(SPECS.map(makeDefinition));
export function createAlchemistsCabinetDefinitions() { return ALCHEMISTS_CABINET_DEFINITIONS.map((definition) => structuredClone(definition)); }
