/**
 * Tests for Aether's Edge Stance Handler
 * Testing stance application, removal, and detection
 */

import { describe, test, expect, beforeEach, jest } from "@jest/globals";
import {
  applyStanceEffect,
  removeOldStance,
  getActiveStance,
} from "../../scripts/aethers-edge/stance-handler.js";

describe("Aether's Edge Stance Handler", () => {
  let mockActor;
  let mockStanceEffect;

  beforeEach(() => {
    mockStanceEffect = {
      id: "stance-effect-123",
      name: "Stance: Aggressive",
      flags: {
        elysium: {
          isStanceEffect: true,
          stance: "aggressive",
        },
      },
      delete: jest.fn(async function () {
        return this;
      }),
    };

    mockActor = {
      name: "Test Fighter",
      flags: {
        elysium: {},
      },
      effects: {
        _effects: [],
        find: function (callback) {
          return this._effects.find(callback);
        },
        filter: function (callback) {
          return this._effects.filter(callback);
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
      createEmbeddedDocuments: jest.fn(async function (type, data) {
        const created = data.map((d, index) => ({
          id: `created-${index}`,
          ...d,
        }));
        return created;
      }),
    };
  });

  describe("getActiveStance", () => {
    test("returns null when actor has no stance", () => {
      expect(getActiveStance(mockActor)).toBeNull();
    });

    test("returns stance name from actor flags", () => {
      mockActor.flags.elysium.activeStance = "aggressive";

      expect(getActiveStance(mockActor)).toBe("aggressive");
    });

    test("returns defensive stance from flags", () => {
      mockActor.flags.elysium.activeStance = "defensive";

      expect(getActiveStance(mockActor)).toBe("defensive");
    });

    test("returns balanced stance from flags", () => {
      mockActor.flags.elysium.activeStance = "balanced";

      expect(getActiveStance(mockActor)).toBe("balanced");
    });

    test("handles null actor", () => {
      expect(getActiveStance(null)).toBeNull();
    });

    test("handles actor with no flags", () => {
      const badActor = { name: "Bad Actor" };

      expect(getActiveStance(badActor)).toBeNull();
    });
  });

  describe("removeOldStance", () => {
    test("does nothing if actor has no stance effects", async () => {
      mockActor.effects._effects = [];

      await removeOldStance(mockActor);

      // Should not try to delete anything
      expect(mockStanceEffect.delete).not.toHaveBeenCalled();
    });

    test("removes existing stance effect", async () => {
      mockActor.effects._effects = [mockStanceEffect];

      await removeOldStance(mockActor);

      expect(mockStanceEffect.delete).toHaveBeenCalled();
    });

    test("removes only stance effects, not other effects", async () => {
      const normalEffect = {
        id: "normal-effect-456",
        name: "Bless",
        flags: {},
        delete: jest.fn(),
      };

      mockActor.effects._effects = [mockStanceEffect, normalEffect];

      await removeOldStance(mockActor);

      expect(mockStanceEffect.delete).toHaveBeenCalled();
      expect(normalEffect.delete).not.toHaveBeenCalled();
    });

    test("removes multiple stance effects if present", async () => {
      const stanceEffect2 = {
        id: "stance-effect-789",
        name: "Stance: Defensive",
        flags: {
          elysium: {
            isStanceEffect: true,
            stance: "defensive",
          },
        },
        delete: jest.fn(),
      };

      mockActor.effects._effects = [mockStanceEffect, stanceEffect2];

      await removeOldStance(mockActor);

      expect(mockStanceEffect.delete).toHaveBeenCalled();
      expect(stanceEffect2.delete).toHaveBeenCalled();
    });

    test("clears activeStance flag", async () => {
      mockActor.flags.elysium.activeStance = "aggressive";
      mockActor.effects._effects = [mockStanceEffect];

      await removeOldStance(mockActor);

      expect(mockActor.setFlag).toHaveBeenCalledWith(
        "elysium",
        "activeStance",
        null,
      );
    });
  });

  describe("applyStanceEffect", () => {
    test("applies Aggressive Stance passive bonuses", async () => {
      const effect = await applyStanceEffect(mockActor, "aggressive");

      expect(mockActor.createEmbeddedDocuments).toHaveBeenCalledWith(
        "ActiveEffect",
        expect.arrayContaining([
          expect.objectContaining({
            name: "Stance: Aggressive",
            changes: expect.arrayContaining([
              expect.objectContaining({
                key: "system.bonuses.mwak.attack",
                value: "2",
              }),
              expect.objectContaining({
                key: "system.bonuses.mwak.damage",
                value: "2",
              }),
              expect.objectContaining({
                key: "system.bonuses.rwak.attack",
                value: "2",
              }),
              expect.objectContaining({
                key: "system.bonuses.rwak.damage",
                value: "2",
              }),
            ]),
            flags: expect.objectContaining({
              elysium: expect.objectContaining({
                isStanceEffect: true,
                stance: "aggressive",
                isAetherEffect: true,
              }),
            }),
          }),
        ]),
      );

      expect(effect.name).toBe("Stance: Aggressive");
    });

    test("applies Defensive Stance passive bonuses", async () => {
      const effect = await applyStanceEffect(mockActor, "defensive");

      expect(mockActor.createEmbeddedDocuments).toHaveBeenCalledWith(
        "ActiveEffect",
        expect.arrayContaining([
          expect.objectContaining({
            name: "Stance: Defensive",
            changes: expect.arrayContaining([
              expect.objectContaining({
                key: "system.attributes.ac.bonus",
                value: "2",
              }),
            ]),
            flags: expect.objectContaining({
              elysium: expect.objectContaining({
                isStanceEffect: true,
                stance: "defensive",
                isAetherEffect: true,
              }),
            }),
          }),
        ]),
      );
    });

    test("applies Balanced Stance passive bonuses", async () => {
      const effect = await applyStanceEffect(mockActor, "balanced");

      expect(mockActor.createEmbeddedDocuments).toHaveBeenCalledWith(
        "ActiveEffect",
        expect.arrayContaining([
          expect.objectContaining({
            name: "Stance: Balanced",
            changes: expect.arrayContaining([
              expect.objectContaining({
                key: "system.bonuses.mwak.attack",
                value: "1",
              }),
              expect.objectContaining({
                key: "system.bonuses.mwak.damage",
                value: "1",
              }),
              expect.objectContaining({
                key: "system.bonuses.rwak.attack",
                value: "1",
              }),
              expect.objectContaining({
                key: "system.bonuses.rwak.damage",
                value: "1",
              }),
            ]),
            flags: expect.objectContaining({
              elysium: expect.objectContaining({
                isStanceEffect: true,
                stance: "balanced",
                isAetherEffect: true,
              }),
            }),
          }),
        ]),
      );
    });

    test("sets activeStance flag on actor", async () => {
      await applyStanceEffect(mockActor, "aggressive");

      expect(mockActor.setFlag).toHaveBeenCalledWith(
        "elysium",
        "activeStance",
        "aggressive",
      );
    });

    test("returns null for unknown stance", async () => {
      // Mock console.error to avoid noise
      const consoleError = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const effect = await applyStanceEffect(mockActor, "unknown");

      expect(effect).toBeNull();
      expect(consoleError).toHaveBeenCalled();

      consoleError.mockRestore();
    });

    test("stance effects have isAetherEffect flag for auto-cleanup", async () => {
      await applyStanceEffect(mockActor, "defensive");

      const effectData = mockActor.createEmbeddedDocuments.mock.calls[0][1][0];

      expect(effectData.flags.elysium.isAetherEffect).toBe(true);
    });

    test("stance effects have appropriate icons", async () => {
      const aggressiveEffect = await applyStanceEffect(mockActor, "aggressive");
      expect(aggressiveEffect.icon).toContain("sword");

      const defensiveEffect = await applyStanceEffect(mockActor, "defensive");
      expect(defensiveEffect.icon).toContain("shield");

      const balancedEffect = await applyStanceEffect(mockActor, "balanced");
      expect(balancedEffect.icon).toContain("yin");
    });
  });

  describe("stance switching workflow", () => {
    test("can switch from one stance to another", async () => {
      // Apply aggressive stance
      mockActor.flags.elysium.activeStance = "aggressive";
      mockActor.effects._effects = [mockStanceEffect];

      // Switch to defensive
      await removeOldStance(mockActor);
      await applyStanceEffect(mockActor, "defensive");

      expect(mockStanceEffect.delete).toHaveBeenCalled();
      expect(mockActor.setFlag).toHaveBeenCalledWith(
        "elysium",
        "activeStance",
        "defensive",
      );
    });

    test("removing stance clears flag before applying new stance", async () => {
      mockActor.flags.elysium.activeStance = "aggressive";
      mockActor.effects._effects = [mockStanceEffect];

      await removeOldStance(mockActor);

      // Flag should be cleared
      expect(mockActor.setFlag).toHaveBeenCalledWith(
        "elysium",
        "activeStance",
        null,
      );

      // Then can apply new stance
      await applyStanceEffect(mockActor, "balanced");

      expect(mockActor.setFlag).toHaveBeenCalledWith(
        "elysium",
        "activeStance",
        "balanced",
      );
    });
  });
});
