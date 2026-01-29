/**
 * Tests for Elysium Defender Handler
 *
 * Testing the overload mechanic, fuel consumption, and weapon dormancy.
 * Uses shared overload utilities from utils/overload.js
 */

import { describe, test, expect, beforeEach, jest } from "@jest/globals";
import {
  handleDefenderFire,
  handleDefenderOverload,
} from "../../scripts/elysium-defender/defender-handler.js";

describe("Elysium Defender Handler", () => {
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
        get: jest.fn(function (id) {
          return this.contents.find((i) => i.id === id);
        }),
      },
      getFlag: function (scope, key) {
        return this.flags[scope]?.[key];
      },
      setFlag: jest.fn(async function (scope, key, value) {
        if (!this.flags[scope]) this.flags[scope] = {};
        this.flags[scope][key] = value;
        return this;
      }),
      rollSavingThrow: jest.fn(async function () {
        return [{ _total: 20, total: 20 }];
      }),
      toggleStatusEffect: jest.fn(async function () {
        return this;
      }),
      update: jest.fn(async function () {
        return this;
      }),
    };

    mockItem = {
      name: "The Elysium Defender",
      id: "elysium-defender-123",
      flags: {
        elysium: {
          isElysiumDefender: true,
          requiresAether: true,
          modType: "weapon",
          disabled: false,
          overload: {
            damageDice: "4d6",
            damageType: "force",
          },
        },
      },
      getFlag: function (scope, key) {
        return this.flags[scope]?.[key];
      },
      setFlag: jest.fn(async function (scope, key, value) {
        if (!this.flags[scope]) this.flags[scope] = {};
        this.flags[scope][key] = value;
        return this;
      }),
      update: jest.fn(async function () {
        return this;
      }),
    };

    mockAetherFuel = {
      name: "Basic Refined Aether",
      id: "fuel-123",
      flags: {
        elysium: {
          isAetherFuel: true,
          aetherQuality: "basic-refined",
        },
      },
      system: {
        uses: { value: 1, max: 1 },
        quantity: 1,
      },
      getFlag: function (scope, key) {
        return this.flags[scope]?.[key];
      },
      update: jest.fn(async function (data) {
        if (data["system.uses.value"] !== undefined) {
          this.system.uses.value = data["system.uses.value"];
        }
        if (data["system.quantity"] !== undefined) {
          this.system.quantity = data["system.quantity"];
        }
        return this;
      }),
      delete: jest.fn(),
    };

    mockActor.items.contents = [mockAetherFuel];
  });

  describe("handleDefenderFire", () => {
    test("consumes aether fuel on regular fire", async () => {
      const result = await handleDefenderFire(mockActor, mockItem, mockAetherFuel);

      expect(result.success).toBe(true);
      expect(result.fuelConsumed).toBe(true);
      expect(mockAetherFuel.delete).toHaveBeenCalled();
    });

    test("returns fuel quality in result", async () => {
      const result = await handleDefenderFire(mockActor, mockItem, mockAetherFuel);

      expect(result.fuelQuality).toBe("basic-refined");
    });

    test("does not increment ATL or daily doses", async () => {
      mockActor.flags.elysium = { dailyDoses: 0, atl: 0 };

      await handleDefenderFire(mockActor, mockItem, mockAetherFuel);

      expect(mockActor.setFlag).not.toHaveBeenCalled();
    });

    test("fails gracefully if no fuel provided", async () => {
      const result = await handleDefenderFire(mockActor, mockItem, null);

      expect(result.success).toBe(false);
      expect(result.reason).toBe("no-fuel");
    });

    test("does not disable the weapon", async () => {
      const result = await handleDefenderFire(mockActor, mockItem, mockAetherFuel);

      expect(result.weaponDisabled).toBeUndefined();
      expect(mockItem.setFlag).not.toHaveBeenCalled();
    });
  });

  describe("handleDefenderOverload", () => {
    test("consumes aether fuel", async () => {
      const result = await handleDefenderOverload(
        mockActor,
        mockItem,
        mockAetherFuel,
        { roll: 20 },
      );

      expect(result.fuelConsumed).toBe(true);
      expect(mockAetherFuel.delete).toHaveBeenCalled();
    });

    test("increments daily doses by 1", async () => {
      mockActor.flags.elysium = { dailyDoses: 2, atl: 0 };

      await handleDefenderOverload(mockActor, mockItem, mockAetherFuel, {
        roll: 20,
      });

      const setFlagCalls = mockActor.setFlag.mock.calls;
      const dailyDosesCall = setFlagCalls.find(
        (call) => call[1] === "dailyDoses",
      );
      expect(dailyDosesCall[2]).toBe(3);
    });

    test("increments ATL by 1", async () => {
      mockActor.flags.elysium = { dailyDoses: 0, atl: 1 };

      await handleDefenderOverload(mockActor, mockItem, mockAetherFuel, {
        roll: 20,
      });

      const setFlagCalls = mockActor.setFlag.mock.calls;
      const atlCall = setFlagCalls.find((call) => call[1] === "atl");
      expect(atlCall[2]).toBe(2);
    });

    test("returns overload damage dice (4d6)", async () => {
      const result = await handleDefenderOverload(
        mockActor,
        mockItem,
        mockAetherFuel,
        { roll: 20 },
      );

      expect(result.damageDice).toBe("4d6");
      expect(result.damageType).toBe("force");
    });

    test("weapon stays active on high stability roll", async () => {
      mockActor.flags.elysium = { dailyDoses: 0, atl: 0 };

      const result = await handleDefenderOverload(
        mockActor,
        mockItem,
        mockAetherFuel,
        { roll: 15 },
      );

      expect(result.weaponDisabled).toBe(false);
    });

    test("weapon goes dormant on low stability roll at ATL 0 (threshold 2)", async () => {
      mockActor.flags.elysium = { dailyDoses: 0, atl: 0 };

      const result = await handleDefenderOverload(
        mockActor,
        mockItem,
        mockAetherFuel,
        { roll: 1 },
      );

      expect(result.weaponDisabled).toBe(true);
      expect(mockItem.setFlag).toHaveBeenCalledWith(
        "elysium",
        "disabled",
        true,
      );
    });

    test("weapon goes dormant on roll equal to threshold at ATL 2 (threshold 6)", async () => {
      mockActor.flags.elysium = { dailyDoses: 0, atl: 2 };

      const result = await handleDefenderOverload(
        mockActor,
        mockItem,
        mockAetherFuel,
        { roll: 6 },
      );

      expect(result.weaponDisabled).toBe(true);
    });

    test("uses NEW ATL for threshold calculation", async () => {
      // Starting ATL 0, will become 1 after increment
      // Threshold should be 2 + (1 * 2) = 4
      mockActor.flags.elysium = { dailyDoses: 0, atl: 0 };

      const result = await handleDefenderOverload(
        mockActor,
        mockItem,
        mockAetherFuel,
        { roll: 3 },
      );

      expect(result.newATL).toBe(1);
      expect(result.threshold).toBe(4);
      expect(result.weaponDisabled).toBe(true); // 3 <= 4
    });

    test("fails gracefully if no fuel provided", async () => {
      const result = await handleDefenderOverload(
        mockActor,
        mockItem,
        null,
        { roll: 20 },
      );

      expect(result.success).toBe(false);
      expect(result.reason).toBe("no-fuel");
    });

    test("returns success true on successful overload", async () => {
      const result = await handleDefenderOverload(
        mockActor,
        mockItem,
        mockAetherFuel,
        { roll: 20 },
      );

      expect(result.success).toBe(true);
    });

    test("returns roll and threshold in result", async () => {
      mockActor.flags.elysium = { dailyDoses: 0, atl: 1 };

      const result = await handleDefenderOverload(
        mockActor,
        mockItem,
        mockAetherFuel,
        { roll: 10 },
      );

      expect(result.roll).toBe(10);
      expect(result.threshold).toBe(6); // ATL 1 -> newATL 2 -> 2 + 2*2 = 6
    });
  });
});
