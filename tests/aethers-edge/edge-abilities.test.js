/**
 * Tests for Aether's Edge Abilities
 * Testing Extra Attack, Battle Cry, and Elemental Strike
 */

import { describe, test, expect, beforeEach, jest } from "@jest/globals";
import {
  activateExtraAttack,
  activateBattleCry,
  activateElementalStrike,
} from "../../scripts/aethers-edge/edge-abilities.js";

describe("Aether's Edge Abilities", () => {
  let mockActor;
  let mockItem;
  let mockAetherFuel;
  let mockAlly1;
  let mockAlly2;

  beforeEach(() => {
    mockActor = {
      name: "Test Fighter",
      uuid: "Actor.fighter123",
      system: {
        abilities: {
          cha: {
            mod: 3, // +3 CHA modifier
          },
        },
      },
      flags: {},
      items: {
        contents: [],
        filter: function (callback) {
          return this.contents.filter(callback);
        },
      },
      createEmbeddedDocuments: jest.fn(async function (type, data) {
        const created = data.map((d, index) => ({
          id: `created-${index}`,
          ...d,
        }));
        return created;
      }),
      getFlag: function (scope, key) {
        return this.flags[scope]?.[key];
      },
      setFlag: jest.fn(async function (scope, key, value) {
        if (!this.flags[scope]) this.flags[scope] = {};
        this.flags[scope][key] = value;
        return this;
      }),
    };

    mockItem = {
      name: "Aether's Edge",
      id: "aethers-edge-123",
      flags: {
        elysium: {
          requiresAether: true,
        },
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
        uses: { value: 1, max: 1 },
        quantity: 1,
      },
      getFlag: function (scope, key) {
        return this.flags[scope]?.[key];
      },
      update: jest.fn(),
      delete: jest.fn(),
    };

    mockAlly1 = {
      name: "Ally 1",
      uuid: "Actor.ally1",
      system: {
        attributes: {
          hp: {
            temp: 0,
            max: 50,
          },
        },
      },
      update: jest.fn(async function (data) {
        if (data["system.attributes.hp.temp"] !== undefined) {
          this.system.attributes.hp.temp = data["system.attributes.hp.temp"];
        }
        return this;
      }),
    };

    mockAlly2 = {
      name: "Ally 2",
      uuid: "Actor.ally2",
      system: {
        attributes: {
          hp: {
            temp: 5, // Already has 5 temp HP
            max: 60,
          },
        },
      },
      update: jest.fn(async function (data) {
        if (data["system.attributes.hp.temp"] !== undefined) {
          this.system.attributes.hp.temp = data["system.attributes.hp.temp"];
        }
        return this;
      }),
    };

    // Add fuel to actor inventory
    mockActor.items.contents = [mockAetherFuel];

    // Mock Roll for damage dice
    global.Roll = jest.fn().mockImplementation((formula) => {
      return {
        formula,
        evaluate: jest.fn(async function () {
          // Mock 2d6 = 7 (average)
          if (formula === "2d6") {
            this.total = 7;
          }
          // Mock 2d8 = 9 (average)
          if (formula === "2d8") {
            this.total = 9;
          }
          return this;
        }),
        toMessage: jest.fn(),
      };
    });

    // Mock canvas for ally detection
    global.canvas = {
      tokens: {
        placeables: [],
      },
    };
  });

  describe("activateExtraAttack", () => {
    test("consumes aether fuel", async () => {
      const result = await activateExtraAttack(
        mockActor,
        mockItem,
        mockAetherFuel,
      );

      expect(mockAetherFuel.delete).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    test("creates Extra Attack active effect", async () => {
      await activateExtraAttack(mockActor, mockItem, mockAetherFuel);

      expect(mockActor.createEmbeddedDocuments).toHaveBeenCalledWith(
        "ActiveEffect",
        expect.arrayContaining([
          expect.objectContaining({
            name: "Extra Attack (Aether)",
            flags: expect.objectContaining({
              elysium: expect.objectContaining({
                isExtraAttackEffect: true,
              }),
            }),
          }),
        ]),
      );
    });

    test("effect expires at end of turn", async () => {
      await activateExtraAttack(mockActor, mockItem, mockAetherFuel);

      const effectData = mockActor.createEmbeddedDocuments.mock.calls[0][1][0];

      expect(effectData.flags.elysium.expiresEndOfTurn).toBe(true);
    });

    test("returns success result", async () => {
      const result = await activateExtraAttack(
        mockActor,
        mockItem,
        mockAetherFuel,
      );

      expect(result).toMatchObject({
        success: true,
        fuelConsumed: true,
        fuelQuality: "basic-refined",
      });
    });

    test("returns failure if no aether fuel", async () => {
      mockActor.items.contents = []; // No fuel

      const result = await activateExtraAttack(mockActor, mockItem, null);

      expect(result.success).toBe(false);
      expect(result.fuelConsumed).toBe(false);
    });
  });

  describe("activateBattleCry", () => {
    beforeEach(() => {
      // Add createEmbeddedDocuments to ally mocks
      mockAlly1.createEmbeddedDocuments = jest.fn(async function (type, data) {
        return data.map((d, i) => ({ id: `effect-${i}`, ...d }));
      });

      mockAlly2.createEmbeddedDocuments = jest.fn(async function (type, data) {
        return data.map((d, i) => ({ id: `effect-${i}`, ...d }));
      });

      // Place allied tokens within 10ft
      const mockToken = {
        actor: mockActor,
        document: {
          disposition: 1, // CONST.TOKEN_DISPOSITIONS.FRIENDLY
        },
      };

      const allyToken1 = {
        actor: mockAlly1,
        document: {
          disposition: 1,
          distanceTo: jest.fn(() => 5), // 5 ft away (within 10ft)
        },
      };

      const allyToken2 = {
        actor: mockAlly2,
        document: {
          disposition: 1,
          distanceTo: jest.fn(() => 8), // 8 ft away (within 10ft)
        },
      };

      const distantAlly = {
        actor: {
          name: "Distant Ally",
          uuid: "Actor.distant",
          createEmbeddedDocuments: jest.fn(),
        },
        document: {
          disposition: 1,
          distanceTo: jest.fn(() => 15), // Too far away (outside 10ft)
        },
      };

      global.canvas.tokens.placeables = [
        mockToken,
        allyToken1,
        allyToken2,
        distantAlly,
      ];
    });

    test("consumes aether fuel", async () => {
      const result = await activateBattleCry(
        mockActor,
        mockItem,
        mockAetherFuel,
      );

      expect(mockAetherFuel.delete).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    test("grants +1 AC effect to allies within 10ft", async () => {
      await activateBattleCry(mockActor, mockItem, mockAetherFuel);

      expect(mockAlly1.createEmbeddedDocuments).toHaveBeenCalledWith(
        "ActiveEffect",
        expect.arrayContaining([
          expect.objectContaining({
            name: "Battle Cry",
            changes: expect.arrayContaining([
              expect.objectContaining({
                key: "system.attributes.ac.bonus",
                value: "1",
              }),
            ]),
          }),
        ]),
      );
    });

    test("effect lasts 1 round (until fighter's next turn)", async () => {
      await activateBattleCry(mockActor, mockItem, mockAetherFuel);

      const effectData = mockAlly1.createEmbeddedDocuments.mock.calls[0][1][0];

      expect(effectData.duration).toEqual({
        rounds: 1,
        turns: 1,
      });
    });

    test("does not affect allies outside 10ft", async () => {
      await activateBattleCry(mockActor, mockItem, mockAetherFuel);

      const distantAlly = global.canvas.tokens.placeables[3].actor;

      expect(distantAlly.createEmbeddedDocuments).not.toHaveBeenCalled();
    });

    test("returns number of allies affected", async () => {
      const result = await activateBattleCry(
        mockActor,
        mockItem,
        mockAetherFuel,
      );

      expect(result.alliesAffected).toBe(2); // Ally1 and Ally2 within 10ft
    });

    test("handles no allies nearby", async () => {
      global.canvas.tokens.placeables = [
        {
          actor: mockActor,
          document: { disposition: 1 },
        },
      ];

      const result = await activateBattleCry(
        mockActor,
        mockItem,
        mockAetherFuel,
      );

      expect(result.alliesAffected).toBe(0);
      expect(result.success).toBe(true); // Still succeeds, just affects 0 allies
    });
  });

  describe("activateElementalStrike", () => {
    test("consumes aether fuel", async () => {
      const result = await activateElementalStrike(
        mockActor,
        mockItem,
        mockAetherFuel,
        "fire",
      );

      expect(mockAetherFuel.delete).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    test("creates Elemental Strike effect for fire damage", async () => {
      await activateElementalStrike(
        mockActor,
        mockItem,
        mockAetherFuel,
        "fire",
      );

      expect(mockActor.createEmbeddedDocuments).toHaveBeenCalledWith(
        "ActiveEffect",
        expect.arrayContaining([
          expect.objectContaining({
            name: "Elemental Strike: Fire",
            flags: expect.objectContaining({
              elysium: expect.objectContaining({
                isElementalStrikeEffect: true,
                elementType: "fire",
                bonusDamage: "1d6",
              }),
            }),
          }),
        ]),
      );
    });

    test("creates Elemental Strike effect for cold damage", async () => {
      await activateElementalStrike(
        mockActor,
        mockItem,
        mockAetherFuel,
        "cold",
      );

      const effectData = mockActor.createEmbeddedDocuments.mock.calls[0][1][0];

      expect(effectData.name).toBe("Elemental Strike: Cold");
      expect(effectData.flags.elysium.elementType).toBe("cold");
    });

    test("creates Elemental Strike effect for lightning damage", async () => {
      await activateElementalStrike(
        mockActor,
        mockItem,
        mockAetherFuel,
        "lightning",
      );

      const effectData = mockActor.createEmbeddedDocuments.mock.calls[0][1][0];

      expect(effectData.name).toBe("Elemental Strike: Lightning");
      expect(effectData.flags.elysium.elementType).toBe("lightning");
    });

    test("creates Elemental Strike effect for thunder damage", async () => {
      await activateElementalStrike(
        mockActor,
        mockItem,
        mockAetherFuel,
        "thunder",
      );

      const effectData = mockActor.createEmbeddedDocuments.mock.calls[0][1][0];

      expect(effectData.name).toBe("Elemental Strike: Thunder");
      expect(effectData.flags.elysium.elementType).toBe("thunder");
    });

    test("effect expires after one hit", async () => {
      await activateElementalStrike(
        mockActor,
        mockItem,
        mockAetherFuel,
        "fire",
      );

      const effectData = mockActor.createEmbeddedDocuments.mock.calls[0][1][0];

      expect(effectData.flags.elysium.expiresOnHit).toBe(true);
    });

    test("rejects invalid element type", async () => {
      const result = await activateElementalStrike(
        mockActor,
        mockItem,
        mockAetherFuel,
        "poison",
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid element type");
    });

    test("requires element type parameter", async () => {
      const result = await activateElementalStrike(
        mockActor,
        mockItem,
        mockAetherFuel,
        null,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid element type");
    });

    test("element type is case-insensitive", async () => {
      await activateElementalStrike(
        mockActor,
        mockItem,
        mockAetherFuel,
        "FIRE",
      );

      const effectData = mockActor.createEmbeddedDocuments.mock.calls[0][1][0];

      expect(effectData.flags.elysium.elementType).toBe("fire");
    });

    test("stores 1d6 bonus damage in effect flags", async () => {
      await activateElementalStrike(
        mockActor,
        mockItem,
        mockAetherFuel,
        "lightning",
      );

      const effectData = mockActor.createEmbeddedDocuments.mock.calls[0][1][0];

      expect(effectData.flags.elysium.bonusDamage).toBe("1d6");
    });
  });
});
