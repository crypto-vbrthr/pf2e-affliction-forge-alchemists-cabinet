# PF2E Affliction Forge: Alchemist's Cabinet

A bilingual DE/EN library add-on for **PF2E Affliction Forge 0.1.63+** containing 32 original alchemical afflictions for laboratories, assassins, artificers, alchemical creatures, and Creature Forge matching.

## Highlights

- 32 original afflictions from level 0 to 20
- Manufactured poisons, weapon coatings, aerosols, ingestible agents, mutagenic accidents, and laboratory diseases
- 12 true weapon injury poisons using the Affliction Forge charge/application workflow
- Canonical creature, family, habitat, theme, origin, and delivery semantic tags
- Every entry carries `origin:alchemical`; selected entries also use arcane, occult, magical, technological, or natural origin tags
- Strong humanoid, construct, ooze, aberration, fungus, elemental, spirit, dragon, and beast matching coverage
- Advanced stages including persistent damage, virulent disease, concentration gates, speech blocking, condition locks, healing restrictions, and a level-20 death effect
- Foundry 14-safe managed world-compendium synchronization
- Read-only provider registration through the public Affliction Forge library API

## Creature Forge contract

Example tags:

```text
creature:construct
habitat:urban
theme:toxin
origin:alchemical
delivery:weapon
```

Creature Forge can use the library for alchemical monsters, poison-using humanoids, laboratory creations, and other generated creatures whose identity or abilities fit these tags.

## Injury poisons

Only entries explicitly designed as weapon coatings set `delivery.injuryPoison: true`. Contact toxins, inhaled agents, injections, diseases, and innate creature associations do not consume weapon-poison charges.

## Installation

Install this module next to `pf2e-affliction-forge`, enable both modules, and start the world as a GM once. The add-on creates or synchronizes its managed world compendium and registers it as a read-only Affliction Forge library.

## Development tests

```bash
npm test
```

The tests locate Affliction Forge by its `module.json` id in a sibling folder. For a non-standard development layout, set `PF2E_AFFLICTION_FORGE_PATH` to the core module directory.
