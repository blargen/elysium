/**
 * Tests for Aether Fuel Selection Logic
 *
 * Testing the logic that finds and filters available aether fuel
 */

import { describe, test, expect, beforeEach } from "@jest/globals";
import {
  getAvailableAetherFuel,
  getQualityDescription,
  getQualityModifiers,
} from "../../scripts/aether-fuel/fuel-selection.js";

describe("Aether Fuel Selection", () => {
  let mockActor;

  beforeEach(() => {
    mockActor = {
      items: {
        filter: function (callback) {
          return this._items.filter(callback);
        },
        _items: [],
      },
    };
  });

  describe("getAvailableAetherFuel", () => {
    test("returns empty array when actor has no items", () => {
      mockActor.items._items = [];
      expect(getAvailableAetherFuel(mockActor)).toEqual([]);
    });

    test("returns only items flagged as aether fuel", () => {
      mockActor.items._items = [
        {
          name: "Basic Refined Aether",
          flags: {
            elysium: { isAetherFuel: true, aetherQuality: "basic-refined" },
          },
          system: { uses: { value: 5 } },
          getFlag: function (scope, key) {
            return this.flags[scope]?.[key];
          },
        },
        {
          name: "Regular Potion",
          flags: {},
          system: { uses: { value: 1 } },
          getFlag: function () {
            return undefined;
          },
        },
      ];

      const result = getAvailableAetherFuel(mockActor);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Basic Refined Aether");
    });

    test("filters out aether fuel with 0 uses", () => {
      mockActor.items._items = [
        {
          name: "Aether with uses",
          flags: {
            elysium: { isAetherFuel: true, aetherQuality: "unrefined" },
          },
          system: { uses: { value: 3 } },
          getFlag: function (scope, key) {
            return this.flags[scope]?.[key];
          },
        },
        {
          name: "Empty aether",
          flags: {
            elysium: { isAetherFuel: true, aetherQuality: "unrefined" },
          },
          system: { uses: { value: 0 } },
          getFlag: function (scope, key) {
            return this.flags[scope]?.[key];
          },
        },
      ];

      const result = getAvailableAetherFuel(mockActor);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Aether with uses");
    });

    test("returns multiple valid aether items", () => {
      mockActor.items._items = [
        {
          name: "Unrefined Aether",
          flags: {
            elysium: { isAetherFuel: true, aetherQuality: "unrefined" },
          },
          system: { uses: { value: 5 } },
          getFlag: function (scope, key) {
            return this.flags[scope]?.[key];
          },
        },
        {
          name: "Rarefied Aether",
          flags: { elysium: { isAetherFuel: true, aetherQuality: "rarefied" } },
          system: { uses: { value: 2 } },
          getFlag: function (scope, key) {
            return this.flags[scope]?.[key];
          },
        },
      ];

      const result = getAvailableAetherFuel(mockActor);
      expect(result).toHaveLength(2);
    });
  });

  describe("getQualityDescription", () => {
    test("returns correct description for unrefined", () => {
      expect(getQualityDescription("unrefined")).toBe(
        "⚠️ TOXIC - Risk of toxicity buildup",
      );
    });

    test("returns correct description for basic-refined", () => {
      expect(getQualityDescription("basic-refined")).toBe(
        "⚪ Neutral - Safe, no bonuses",
      );
    });

    test("returns correct description for rarefied", () => {
      expect(getQualityDescription("rarefied")).toBe(
        "🟢 Enhanced - Provides bonuses",
      );
    });

    test("returns correct description for prometheum", () => {
      expect(getQualityDescription("prometheum")).toBe(
        "🟣 Premium - Significant bonuses",
      );
    });

    test("returns correct description for wild", () => {
      expect(getQualityDescription("wild")).toBe(
        "🌀 Chaotic - Wild Magic effects",
      );
    });

    test("returns empty string for unknown quality", () => {
      expect(getQualityDescription("unknown")).toBe("");
    });
  });

  describe("getQualityModifiers", () => {
    test("returns no modifiers for unrefined (toxicity is the cost)", () => {
      const mods = getQualityModifiers("unrefined");
      expect(mods.attack).toBe(0);
      expect(mods.damage).toBe(0);
      expect(mods.spellAttack).toBe(0);
      expect(mods.spellDamage).toBe(0);
    });

    test("returns no modifiers for basic-refined", () => {
      const mods = getQualityModifiers("basic-refined");
      expect(mods.attack).toBe(0);
      expect(mods.damage).toBe(0);
      expect(mods.spellAttack).toBe(0);
      expect(mods.spellDamage).toBe(0);
    });

    test("returns flat bonuses for rarefied", () => {
      const mods = getQualityModifiers("rarefied");
      expect(mods.attack).toBe(1);
      expect(mods.damage).toBe(1);
      expect(mods.spellAttack).toBe(1);
      expect(mods.spellDamage).toBe(1);
    });

    test("returns higher flat bonuses for prometheum", () => {
      const mods = getQualityModifiers("prometheum");
      expect(mods.attack).toBe(5);
      expect(mods.damage).toBe(5);
      expect(mods.spellAttack).toBe(5);
      expect(mods.spellDamage).toBe(5);
    });

    test("returns null for wild (determined by wild magic)", () => {
      const mods = getQualityModifiers("wild");
      expect(mods).toBeNull();
    });

    test("returns no modifiers for unknown quality", () => {
      const mods = getQualityModifiers("unknown");
      expect(mods.attack).toBe(0);
      expect(mods.damage).toBe(0);
      expect(mods.spellAttack).toBe(0);
      expect(mods.spellDamage).toBe(0);
    });
  });
});
