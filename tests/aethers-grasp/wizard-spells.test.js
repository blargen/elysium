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

  test("should return ALL spell scrolls regardless of class (DM controls scroll availability)", () => {
    const allScrolls = [...wizardScrolls, ...nonWizardScrolls];
    mockActor.items._data = allScrolls;

    const result = findFirstLevelScrolls(mockActor);

    // Should return all scrolls - we don't care about class
    expect(result).toHaveLength(4);
    expect(result.every((s) => s.type === "consumable")).toBe(true);
    expect(result.every((s) => s.system.type?.value === "scroll")).toBe(true);
  });

  test("should return any available scrolls", () => {
    mockActor.items._data = [...wizardScrolls, nonWizardScrolls[0]];

    const result = findFirstLevelScrolls(mockActor);

    // Just verify we get scrolls back
    expect(result).toHaveLength(3);
    expect(result.every((s) => s.type === "consumable")).toBe(true);
  });

  test("should return empty array if no scrolls available", () => {
    mockActor.items._data = []; // No scrolls at all

    const result = findFirstLevelScrolls(mockActor);

    expect(result).toHaveLength(0);
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
    expect(
      result.some((s) => s.system.identifier === "spell-scroll-2nd-level"),
    ).toBe(true);
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
