/**
 * Tests for Aether's Detection Item
 *
 * Testing the Investigation advantage aether-powered item
 */

import { describe, test, expect, beforeEach, jest } from "@jest/globals";
import {
  applyDetectionEffect,
  useAethersDetection,
  rollDetectionCheck,
} from "../../scripts/aethers-detection/detection.js";

describe("Aether's Detection", () => {
  let mockActor;
  let mockItem;
  let mockAetherFuel;

  beforeEach(() => {
    mockActor = {
      name: "Test Character",
      flags: {},
      items: {
        contents: [],
        filter: function (fn) {
          return this.contents.filter(fn);
        },
      },
      appliedEffects: [],
      getFlag: function (scope, key) {
        return this.flags[scope]?.[key];
      },
      setFlag: jest.fn(async function (scope, key, value) {
        if (!this.flags[scope]) this.flags[scope] = {};
        this.flags[scope][key] = value;
        return this;
      }),
      createEmbeddedDocuments: jest.fn(async function (type, data) {
        // Mock creating active effects
        const effect = { name: data[0].name, ...data[0] };
        this.appliedEffects.push(effect);
        return [effect];
      }),
    };

    mockItem = {
      name: "Aether's Detection",
      id: "aethers-detection-123",
      flags: {
        elysium: {
          isAethersDetection: true,
          requiresAether: true,
        },
      },
      system: {
        equipped: true, // Item must be equipped to use
      },
      getFlag: function (scope, key) {
        return this.flags[scope]?.[key];
      },
    };

    mockAetherFuel = {
      name: "Basic Refined Aether",
      flags: {
        elysium: {
          isAetherFuel: true,
          aetherQuality: "basic-refined",
        },
      },
      system: {
        uses: { value: 5, max: 5 },
        quantity: 1,
      },
      getFlag: function (scope, key) {
        return this.flags[scope]?.[key];
      },
      update: jest.fn(async function (data) {
        if (data["system.uses.value"] !== undefined) {
          this.system.uses.value = data["system.uses.value"];
        }
        return this;
      }),
    };

    // Add aether fuel to actor's inventory
    mockActor.items.contents = [mockAetherFuel];
  });

  describe("applyDetectionEffect", () => {
    test("applies Investigation advantage effect to actor", async () => {
      await applyDetectionEffect(mockActor, "basic-refined");

      expect(mockActor.createEmbeddedDocuments).toHaveBeenCalledWith(
        "ActiveEffect",
        expect.arrayContaining([
          expect.objectContaining({
            name: expect.stringContaining("Detection"),
          }),
        ]),
      );
    });

    test("Detection effect lasts 10 minutes (100 rounds)", async () => {
      await applyDetectionEffect(mockActor, "basic-refined");

      const createCall = mockActor.createEmbeddedDocuments.mock.calls[0];
      const effectData = createCall[1][0];

      expect(effectData.duration).toMatchObject({
        rounds: 100, // 10 minutes = 100 rounds
      });
    });

    test("Detection effect does NOT require concentration", async () => {
      await applyDetectionEffect(mockActor, "basic-refined");

      const createCall = mockActor.createEmbeddedDocuments.mock.calls[0];
      const effectData = createCall[1][0];

      // Should not have concentration flag
      expect(effectData.flags?.dnd5e?.concentration).toBeFalsy();
    });

    test("Detection effect has empty changes array (advantage applied by Detect action)", async () => {
      await applyDetectionEffect(mockActor, "basic-refined");

      const createCall = mockActor.createEmbeddedDocuments.mock.calls[0];
      const effectData = createCall[1][0];

      // Effect is just a timer/marker - no stat changes
      // The Detect action applies advantage when it rolls
      expect(effectData.changes).toEqual([]);
    });

    test("returns success result", async () => {
      const result = await applyDetectionEffect(mockActor, "basic-refined");

      expect(result).toMatchObject({
        success: true,
        effectApplied: true,
      });
    });
  });

  describe("useAethersDetection", () => {
    test("consumes aether fuel when used", async () => {
      await useAethersDetection(mockActor, mockItem, mockAetherFuel);

      expect(mockAetherFuel.update).toHaveBeenCalledWith({
        "system.uses.value": 4,
      });
    });

    test("applies Detection effect to actor", async () => {
      await useAethersDetection(mockActor, mockItem, mockAetherFuel);

      expect(mockActor.createEmbeddedDocuments).toHaveBeenCalled();
      expect(mockActor.appliedEffects.length).toBe(1);
      expect(mockActor.appliedEffects[0].name).toContain("Detection");
    });

    test("returns success with fuel and effect details", async () => {
      const result = await useAethersDetection(
        mockActor,
        mockItem,
        mockAetherFuel,
      );

      expect(result).toMatchObject({
        success: true,
        fuelConsumed: true,
        fuelQuality: "basic-refined",
        effectApplied: true,
      });
    });

    test("fails gracefully if no aether fuel available", async () => {
      mockActor.items.contents = []; // No fuel

      const result = await useAethersDetection(mockActor, mockItem);

      expect(result.success).toBe(false);
      expect(result.reason).toBe("no-fuel");
      expect(mockActor.createEmbeddedDocuments).not.toHaveBeenCalled();
    });

    test("fails if item is not equipped", async () => {
      mockItem.system.equipped = false;

      const result = await useAethersDetection(
        mockActor,
        mockItem,
        mockAetherFuel,
      );

      expect(result.success).toBe(false);
      expect(result.reason).toBe("not-equipped");
      expect(mockAetherFuel.update).not.toHaveBeenCalled();
      expect(mockActor.createEmbeddedDocuments).not.toHaveBeenCalled();
    });

    test("works with different aether qualities", async () => {
      const qualities = [
        "unrefined",
        "basic-refined",
        "rarefied",
        "prometheum",
      ];

      for (const quality of qualities) {
        mockAetherFuel.flags.elysium.aetherQuality = quality;
        mockAetherFuel.system.uses.value = 5; // Reset
        mockActor.appliedEffects = []; // Reset
        mockActor.createEmbeddedDocuments.mockClear();
        mockActor.rollSavingThrow = jest.fn(async () => [
          { _total: 20, total: 20 },
        ]);

        const result = await useAethersDetection(
          mockActor,
          mockItem,
          mockAetherFuel,
        );

        expect(result.success).toBe(true);
        expect(result.fuelQuality).toBe(quality);
        expect(mockActor.createEmbeddedDocuments).toHaveBeenCalled();
      }
    });
  });

  describe("rollDetectionCheck", () => {
    beforeEach(() => {
      mockActor.rollSkill = jest.fn(async () => ({
        total: 18,
        _total: 18,
        terms: [{ results: [{ result: 15 }, { result: 3 }] }],
      }));

      // Mock the effects collection
      mockActor.effects = {
        contents: [],
      };
    });

    test("rolls Investigation check with advantage when effect is active", async () => {
      // Add the Detection effect to actor
      mockActor.effects.contents = [
        {
          name: "Aether's Detection",
          disabled: false,
        },
      ];

      await rollDetectionCheck(mockActor, mockItem);

      expect(mockActor.rollSkill).toHaveBeenCalledWith(
        expect.objectContaining({
          skill: "inv",
          advantage: true,
        }),
      );
    });

    test("fails if item is not equipped", async () => {
      mockItem.system.equipped = false;

      const result = await rollDetectionCheck(mockActor, mockItem);

      expect(result.success).toBe(false);
      expect(result.reason).toBe("not-equipped");
      expect(mockActor.rollSkill).not.toHaveBeenCalled();
    });

    test("fails if Detection effect is not active", async () => {
      // No effects on actor
      mockActor.effects.contents = [];

      const result = await rollDetectionCheck(mockActor, mockItem);

      expect(result.success).toBe(false);
      expect(result.reason).toBe("effect-not-active");
      expect(mockActor.rollSkill).not.toHaveBeenCalled();
    });

    test("fails if Detection effect exists but is disabled", async () => {
      mockActor.effects.contents = [
        {
          name: "Aether's Detection",
          disabled: true,
        },
      ];

      const result = await rollDetectionCheck(mockActor, mockItem);

      expect(result.success).toBe(false);
      expect(result.reason).toBe("effect-not-active");
      expect(mockActor.rollSkill).not.toHaveBeenCalled();
    });

    test("returns success with roll result when effect is active", async () => {
      mockActor.effects.contents = [
        {
          name: "Aether's Detection",
          disabled: false,
        },
      ];

      const result = await rollDetectionCheck(mockActor, mockItem);

      expect(result).toMatchObject({
        success: true,
        total: 18,
      });
    });

    test("includes flavor text in roll options", async () => {
      mockActor.effects.contents = [
        {
          name: "Aether's Detection",
          disabled: false,
        },
      ];

      await rollDetectionCheck(mockActor, mockItem);

      expect(mockActor.rollSkill).toHaveBeenCalledWith(
        expect.objectContaining({
          skill: "inv",
          flavor: expect.stringContaining("Detection"),
        }),
      );
    });
  });
});
