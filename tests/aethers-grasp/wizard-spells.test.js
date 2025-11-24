/**
 * Tests for Aether's Grasp Wizard Spell Validation
 * Ensures only wizard 1st level spells can be imprinted
 */

import { describe, test, expect, beforeEach, jest } from "@jest/globals";
import { findFirstLevelScrolls } from "../../scripts/aethers-grasp/imprint.js";

describe("Aether's Grasp - Wizard Spell Validation", () => {
  let mockActor;
  let wizardScrolls;
  let nonWizardScrolls;

  beforeEach(() => {
    // Create wizard spell scrolls
    wizardScrolls = [
      {
        id: "scroll-1",
        name: "Spell Scroll: Magic Missile",
        type: "consumable",
        system: {
          type: { value: "scroll" },
          identifier: "spell-scroll-1st-level",
          uses: { value: 1, max: 1 },
          sourceClass: "wizard", // Wizard spell
        },
      },
      {
        id: "scroll-2",
        name: "Spell Scroll: Shield",
        type: "consumable",
        system: {
          type: { value: "scroll" },
          identifier: "spell-scroll-1st-level",
          uses: { value: 1, max: 1 },
          sourceClass: "wizard", // Wizard spell
        },
      },
    ];

    // Create non-wizard spell scrolls (cleric, druid, etc.)
    nonWizardScrolls = [
      {
        id: "scroll-3",
        name: "Spell Scroll: Cure Wounds",
        type: "consumable",
        system: {
          type: { value: "scroll" },
          identifier: "spell-scroll-1st-level",
          uses: { value: 1, max: 1 },
          sourceClass: "cleric", // Cleric spell - should NOT be allowed
        },
      },
      {
        id: "scroll-4",
        name: "Spell Scroll: Goodberry",
        type: "consumable",
        system: {
          type: { value: "scroll" },
          identifier: "spell-scroll-1st-level",
          uses: { value: 1, max: 1 },
          sourceClass: "druid", // Druid spell - should NOT be allowed
        },
      },
    ];

    mockActor = {
      name: "Test Wizard",
      items: {
        filter: jest.fn((callback) => {
          // Actually call the filter callback on the mock data
          return mockActor.items._data.filter(callback);
        }),
        _data: [], // Will be set in each test
      },
    };
  });

  test("should return ALL spell scrolls (DM controls scroll availability)", () => {
    const allScrolls = [...wizardScrolls, ...nonWizardScrolls];
    mockActor.items._data = allScrolls;

    const result = findFirstLevelScrolls(mockActor);

    // Should include wizard, cleric, AND druid scrolls
    expect(result).toHaveLength(4);
    expect(result.some((s) => s.system.sourceClass === "wizard")).toBe(true);
    expect(result.some((s) => s.system.sourceClass === "cleric")).toBe(true);
    expect(result.some((s) => s.system.sourceClass === "druid")).toBe(true);
  });

  test("should include cleric spells", () => {
    mockActor.items._data = [...wizardScrolls, nonWizardScrolls[0]];

    const result = findFirstLevelScrolls(mockActor);

    // Should include both wizard and cleric scrolls
    expect(result).toHaveLength(3);
    expect(result.some((s) => s.system.sourceClass === "wizard")).toBe(true);
    expect(result.some((s) => s.system.sourceClass === "cleric")).toBe(true);
  });

  test("should include druid spells", () => {
    mockActor.items._data = [...wizardScrolls, nonWizardScrolls[1]];

    const result = findFirstLevelScrolls(mockActor);

    // Should include both wizard and druid scrolls
    expect(result).toHaveLength(3);
    expect(result.some((s) => s.system.sourceClass === "wizard")).toBe(true);
    expect(result.some((s) => s.system.sourceClass === "druid")).toBe(true);
  });

  test("should return non-wizard scrolls if only those are available", () => {
    mockActor.items._data = nonWizardScrolls;

    const result = findFirstLevelScrolls(mockActor);

    // Should include cleric and druid scrolls
    expect(result).toHaveLength(2);
    expect(result.some((s) => s.system.sourceClass === "cleric")).toBe(true);
    expect(result.some((s) => s.system.sourceClass === "druid")).toBe(true);
  });

  test("should accept scrolls of any level (DM controls scroll availability)", () => {
    const level2Scroll = {
      id: "scroll-5",
      name: "Spell Scroll: Scorching Ray",
      type: "consumable",
      system: {
        type: { value: "scroll" },
        identifier: "spell-scroll-2nd-level", // 2nd level - now included!
        uses: { value: 1, max: 1 },
        sourceClass: "wizard",
      },
    };

    mockActor.items._data = [...wizardScrolls, level2Scroll];

    const result = findFirstLevelScrolls(mockActor);

    // Should return ALL scrolls regardless of level (DM controls what scrolls exist)
    expect(result).toHaveLength(3);
    expect(result.some((s) => s.system.identifier === "spell-scroll-2nd-level")).toBe(true);
  });

  test("should handle scrolls with depleted uses", () => {
    const depletedScroll = {
      ...wizardScrolls[0],
      system: {
        ...wizardScrolls[0].system,
        uses: { value: 0, max: 1 }, // Depleted
      },
    };

    mockActor.items._data = [depletedScroll, wizardScrolls[1]];

    const result = findFirstLevelScrolls(mockActor);

    // Should only return scroll with uses > 0
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("scroll-2");
  });
});
