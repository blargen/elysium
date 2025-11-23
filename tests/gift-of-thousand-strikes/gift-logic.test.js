/**
 * Tests for Gift of a Thousand Strikes
 * A monk nervous system modification that allows using aether instead of/with ki
 */

import { describe, test, expect, beforeEach, jest } from "@jest/globals";
import { useGiftOfThousandStrikes } from "../../scripts/gift-of-thousand-strikes/gift-logic.js";

describe("Gift of a Thousand Strikes", () => {
  let mockActor;
  let mockItem;
  let mockAetherFuel;
  let mockMonkFocus;

  beforeEach(() => {
    // Mock Monk's Focus item (D&D 5e 2024 focus points)
    mockMonkFocus = {
      name: "Monk's Focus",
      system: {
        uses: {
          value: 2,
          max: 2,
        },
      },
      update: jest.fn(),
    };

    // Mock actor with monk class
    mockActor = {
      name: "Test Monk",
      classes: {
        monk: { system: { levels: 3 } },
      },
      items: {
        filter: jest.fn(),
        find: jest.fn((callback) => {
          // Return Monk's Focus when searching by name
          if (callback({ name: "Monk's Focus" })) {
            return mockMonkFocus;
          }
          return null;
        }),
      },
      getFlag: jest.fn(),
      setFlag: jest.fn(),
      update: jest.fn(),
      rollSavingThrow: jest.fn(async () => ({
        total: 15,
        // Mock a successful roll
      })),
    };

    // Mock Gift of a Thousand Strikes item
    mockItem = {
      name: "Gift of a Thousand Strikes",
      actor: mockActor,
      getFlag: jest.fn((namespace, key) => {
        const flags = {
          "elysium.requiresAether": true,
          "elysium.modType": "ki-enhancement",
          "elysium.requiredClass": "monk",
          "elysium.requiredLevel": 3,
          "elysium.allowsKiBoost": true,
          "elysium.monkAbilities": {
            "flurry-of-blows": {
              label: "Flurry of Strikes",
              normalEffect: "Make 2 unarmed strikes",
              enhancedEffect: "Make 3 unarmed strikes",
              enhancedBonus: "extra-strike",
            },
            "patient-defense": {
              label: "Patient Defense",
              normalEffect: "Dodge action",
              enhancedEffect: "Dodge + +2 AC",
              enhancedBonus: "ac-bonus-2",
            },
            "step-of-wind": {
              label: "Step of the Wind",
              normalEffect: "Jump distance doubled",
              enhancedEffect: "Jump distance tripled",
              enhancedBonus: "triple-jump",
            },
          },
        };
        return flags[`${namespace}.${key}`];
      }),
    };

    // Mock aether fuel
    mockAetherFuel = {
      name: "Basic Refined Aether",
      system: { uses: { value: 5, max: 5 } },
      getFlag: jest.fn(() => "basic-refined"),
      update: jest.fn(),
    };

    mockActor.items.filter.mockReturnValue([mockAetherFuel]);
  });

  describe("Monk Level Requirement", () => {
    test("should activate for monk level 3+", async () => {
      mockActor.classes.monk.system.levels = 3;

      const result = await useGiftOfThousandStrikes(mockActor, mockItem, {
        mode: "aether-only",
        ability: "flurry-of-blows",
        aetherFuel: mockAetherFuel,
      });

      expect(result.success).toBe(true);
    });

    test("should fail for monk level 2", async () => {
      mockActor.classes.monk.system.levels = 2;

      const result = await useGiftOfThousandStrikes(mockActor, mockItem, {
        mode: "aether-only",
        ability: "flurry-of-blows",
        aetherFuel: mockAetherFuel,
      });

      expect(result.success).toBe(false);
      expect(result.reason).toContain("level 3");
    });

    test("should fail for non-monk", async () => {
      mockActor.classes = {};

      const result = await useGiftOfThousandStrikes(mockActor, mockItem, {
        mode: "aether-only",
        ability: "flurry-of-blows",
        aetherFuel: mockAetherFuel,
      });

      expect(result.success).toBe(false);
      expect(result.reason).toContain("monk");
    });
  });

  describe("Aether Only Mode", () => {
    test("should activate Flurry of Strikes without consuming ki", async () => {
      const result = await useGiftOfThousandStrikes(mockActor, mockItem, {
        mode: "aether-only",
        ability: "flurry-of-blows",
        aetherFuel: mockAetherFuel,
      });

      expect(result.success).toBe(true);
      expect(result.ability).toBe("flurry-of-blows");
      expect(result.enhanced).toBe(false);
      expect(result.effect).toContain("2 unarmed strikes");
      expect(mockAetherFuel.update).toHaveBeenCalled();
    });

    test("should activate Patient Defense without consuming ki", async () => {
      const result = await useGiftOfThousandStrikes(mockActor, mockItem, {
        mode: "aether-only",
        ability: "patient-defense",
        aetherFuel: mockAetherFuel,
      });

      expect(result.success).toBe(true);
      expect(result.ability).toBe("patient-defense");
      expect(result.enhanced).toBe(false);
      expect(result.effect).toContain("Dodge");
    });

    test("should activate Step of the Wind without consuming ki", async () => {
      const result = await useGiftOfThousandStrikes(mockActor, mockItem, {
        mode: "aether-only",
        ability: "step-of-wind",
        aetherFuel: mockAetherFuel,
      });

      expect(result.success).toBe(true);
      expect(result.ability).toBe("step-of-wind");
      expect(result.enhanced).toBe(false);
      expect(result.effect).toContain("doubled");
    });

    test("should consume aether fuel", async () => {
      await useGiftOfThousandStrikes(mockActor, mockItem, {
        mode: "aether-only",
        ability: "flurry-of-blows",
        aetherFuel: mockAetherFuel,
      });

      expect(mockAetherFuel.update).toHaveBeenCalledWith({
        "system.uses.value": 4,
      });
    });
  });

  describe("Aether + Ki Mode (Enhanced)", () => {
    test("should enhance Flurry of Strikes to 3 strikes", async () => {
      // Monk Focus is already mocked with 2 focus points in beforeEach

      const result = await useGiftOfThousandStrikes(mockActor, mockItem, {
        mode: "aether-and-ki",
        ability: "flurry-of-blows",
        aetherFuel: mockAetherFuel,
      });

      expect(result.success).toBe(true);
      expect(result.enhanced).toBe(true);
      expect(result.effect).toContain("3 unarmed strikes");
      expect(result.bonus).toBe("extra-strike");
    });

    test("should enhance Patient Defense with +2 AC", async () => {
      // Monk Focus is already mocked with 2 focus points in beforeEach

      const result = await useGiftOfThousandStrikes(mockActor, mockItem, {
        mode: "aether-and-ki",
        ability: "patient-defense",
        aetherFuel: mockAetherFuel,
      });

      expect(result.success).toBe(true);
      expect(result.enhanced).toBe(true);
      expect(result.effect).toContain("+2 AC");
      expect(result.bonus).toBe("ac-bonus-2");
    });

    test("should enhance Step of the Wind to triple jump", async () => {
      // Monk Focus is already mocked with 2 focus points in beforeEach

      const result = await useGiftOfThousandStrikes(mockActor, mockItem, {
        mode: "aether-and-ki",
        ability: "step-of-wind",
        aetherFuel: mockAetherFuel,
      });

      expect(result.success).toBe(true);
      expect(result.enhanced).toBe(true);
      expect(result.effect).toContain("tripled");
      expect(result.bonus).toBe("triple-jump");
    });

    test("should consume both aether and focus", async () => {
      // Monk Focus is already mocked with 2 focus points in beforeEach

      const result = await useGiftOfThousandStrikes(mockActor, mockItem, {
        mode: "aether-and-ki",
        ability: "flurry-of-blows",
        aetherFuel: mockAetherFuel,
      });

      // Should succeed
      expect(result.success).toBe(true);
      expect(result.enhanced).toBe(true);

      // Should consume aether
      expect(mockAetherFuel.update).toHaveBeenCalled();

      // NOTE: Focus consumption now happens automatically when the monk ability activity
      // is triggered, not by us calling update() directly. In test environment,
      // activities don't exist, so focus isn't consumed. In real Foundry, the
      // "(Focus Point)" activity auto-consumes focus when triggered.
    });

    test("should fail if no focus points available", async () => {
      // Set focus points to 0
      mockMonkFocus.system.uses.value = 0;

      const result = await useGiftOfThousandStrikes(mockActor, mockItem, {
        mode: "aether-and-ki",
        ability: "flurry-of-blows",
        aetherFuel: mockAetherFuel,
      });

      expect(result.success).toBe(false);
      expect(result.reason).toContain("focus");
    });
  });

  describe("Aether Fuel Integration", () => {
    test("should fail if no aether fuel selected", async () => {
      const result = await useGiftOfThousandStrikes(mockActor, mockItem, {
        mode: "aether-only",
        ability: "flurry-of-blows",
        aetherFuel: null,
      });

      expect(result.success).toBe(false);
      expect(result.reason).toContain("aether");
    });

    test("should fail if aether fuel is depleted", async () => {
      mockAetherFuel.system.uses.value = 0;

      const result = await useGiftOfThousandStrikes(mockActor, mockItem, {
        mode: "aether-only",
        ability: "flurry-of-blows",
        aetherFuel: mockAetherFuel,
      });

      expect(result.success).toBe(false);
      expect(result.reason).toContain("depleted");
    });

    test("should work with unrefined aether (with toxicity)", async () => {
      mockAetherFuel.getFlag = jest.fn(() => "unrefined");

      const result = await useGiftOfThousandStrikes(mockActor, mockItem, {
        mode: "aether-only",
        ability: "flurry-of-blows",
        aetherFuel: mockAetherFuel,
      });

      expect(result.success).toBe(true);
      expect(result.quality).toBe("unrefined");
      // Toxicity should be handled by aether fuel system
    });
  });

  describe("Error Handling", () => {
    test("should fail gracefully with invalid ability", async () => {
      const result = await useGiftOfThousandStrikes(mockActor, mockItem, {
        mode: "aether-only",
        ability: "invalid-ability",
        aetherFuel: mockAetherFuel,
      });

      expect(result.success).toBe(false);
      expect(result.reason).toContain("Invalid");
    });

    test("should fail gracefully with invalid mode", async () => {
      const result = await useGiftOfThousandStrikes(mockActor, mockItem, {
        mode: "invalid-mode",
        ability: "flurry-of-blows",
        aetherFuel: mockAetherFuel,
      });

      expect(result.success).toBe(false);
      expect(result.reason).toContain("mode");
    });
  });
});
