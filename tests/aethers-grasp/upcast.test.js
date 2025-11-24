/**
 * Tests for Aether's Grasp Spell Upcasting
 * Tests the fuel + spell slot enhancement system for casting stored spells
 */

import { describe, test, expect, beforeEach, jest } from "@jest/globals";
import { castSpellFromFinger } from "../../scripts/aethers-grasp/cast.js";

describe("Aether's Grasp Spell Upcasting", () => {
  let mockActor;
  let mockStoredSpell;
  let mockModifiers;
  let mockAetherFuel;

  beforeEach(() => {
    // Mock aether fuel
    mockAetherFuel = {
      id: "fuel-1",
      name: "Basic Refined Aether",
      system: { uses: { value: 1, max: 1 }, quantity: 1 },
      getFlag: jest.fn(() => "basic-refined"),
      update: jest.fn(),
      delete: jest.fn(),
    };

    // Mock wizard actor with spell slots
    mockActor = {
      name: "Test Wizard",
      classes: {
        wizard: { system: { levels: 3 } },
      },
      system: {
        spells: {
          spell1: { value: 4, max: 4 },
          spell2: { value: 2, max: 2 },
        },
      },
      items: {
        filter: jest.fn(() => []),
        find: jest.fn(),
        get: jest.fn(),
      },
      createEmbeddedDocuments: jest.fn(async (type, data) => {
        // Return mock spell with ID
        return [
          {
            id: "temp-spell-id",
            name: data[0].name,
            system: data[0].system,
            use: jest.fn(async () => ({ success: true })), // Return successful result
          },
        ];
      }),
      update: jest.fn(),
    };

    // Mock stored spell (Magic Missile - 1st level wizard spell)
    mockStoredSpell = {
      id: "stored-spell-1",
      fingerIndex: 0,
      fingerName: "Thumb",
      spellData: {
        name: "Spell Scroll: Magic Missile",
        type: "spell",
        system: {
          level: 1,
          school: "evo",
          damage: {
            parts: [["1d4 + 1", "force"]],
          },
          scaling: {
            mode: "level",
            formula: "1d4 + 1",
          },
          description: {
            value:
              "<p>Create 3 darts of magical force. Each dart deals 1d4+1 force damage.</p><p><strong>At Higher Levels:</strong> Create one additional dart for each slot level above 1st.</p>",
          },
        },
        flags: {
          ddbimporter: {
            originalName: "Magic Missile",
          },
        },
      },
      imprintedAt: Date.now(),
      originalScrollName: "Spell Scroll: Magic Missile",
    };

    // Mock basic modifiers (no quality bonuses)
    mockModifiers = {
      attackBonus: 0,
      damageBonus: 0,
      saveDC: 0,
      duration: 0,
    };

    // Mock global ChatMessage
    global.ChatMessage = {
      create: jest.fn(),
      getSpeaker: jest.fn(() => ({})),
    };
  });

  describe("Aether Only Mode (No Upcasting)", () => {
    test("should cast spell at 1st level with aether only", async () => {
      const result = await castSpellFromFinger(
        mockActor,
        mockStoredSpell,
        {
          ...mockModifiers,
          enhanced: false,
        },
        mockAetherFuel,
      );

      expect(result).toBeDefined();
      expect(result.tempSpell).toBeDefined();
      expect(result.tempSpell.system.level).toBe(1);
      expect(mockActor.createEmbeddedDocuments).toHaveBeenCalledWith(
        "Item",
        expect.arrayContaining([
          expect.objectContaining({
            name: "Magic Missile",
            system: expect.objectContaining({
              level: 1,
            }),
          }),
        ]),
      );
    });

    test("should not consume spell slots when not enhanced", async () => {
      await castSpellFromFinger(
        mockActor,
        mockStoredSpell,
        {
          ...mockModifiers,
          enhanced: false,
        },
        mockAetherFuel,
      );

      expect(mockActor.update).not.toHaveBeenCalled();
    });

    test("should consume aether fuel after successful cast", async () => {
      await castSpellFromFinger(
        mockActor,
        mockStoredSpell,
        {
          ...mockModifiers,
          enhanced: false,
        },
        mockAetherFuel,
      );

      expect(mockAetherFuel.delete).toHaveBeenCalled();
    });
  });

  describe("Aether + Spell Slot Mode (Upcasting)", () => {
    test("should cast spell at 2nd level when upcast", async () => {
      const result = await castSpellFromFinger(
        mockActor,
        mockStoredSpell,
        {
          ...mockModifiers,
          enhanced: true,
        },
        mockAetherFuel,
      );

      expect(result).toBeDefined();
      expect(result.tempSpell).toBeDefined();
      expect(result.tempSpell.system.level).toBe(2);
    });

    test("should consume 1st level spell slot when upcasting", async () => {
      await castSpellFromFinger(
        mockActor,
        mockStoredSpell,
        {
          ...mockModifiers,
          enhanced: true,
        },
        mockAetherFuel,
      );

      expect(mockActor.update).toHaveBeenCalledWith({
        "system.spells.spell1.value": 3, // 4 - 1 = 3
      });
    });

    test("should append (Upcast) to spell name", async () => {
      const result = await castSpellFromFinger(
        mockActor,
        mockStoredSpell,
        {
          ...mockModifiers,
          enhanced: true,
        },
        mockAetherFuel,
      );

      expect(result.tempSpell.name).toContain("Magic Missile");
      // The name should indicate it's upcast
      expect(mockActor.createEmbeddedDocuments).toHaveBeenCalledWith(
        "Item",
        expect.arrayContaining([
          expect.objectContaining({
            name: expect.stringMatching(/Magic Missile.*\(.*2nd.*\)/i),
          }),
        ]),
      );
    });

    test("should fail if no spell slots available", async () => {
      // Set spell slots to 0
      mockActor.system.spells.spell1.value = 0;

      await expect(async () => {
        await castSpellFromFinger(
          mockActor,
          mockStoredSpell,
          {
            ...mockModifiers,
            enhanced: true,
          },
          mockAetherFuel,
        );
      }).rejects.toThrow(/no.*spell slot/i);
    });

    test("should create chat message showing upcast level", async () => {
      await castSpellFromFinger(
        mockActor,
        mockStoredSpell,
        {
          ...mockModifiers,
          enhanced: true,
        },
        mockAetherFuel,
      );

      expect(ChatMessage.create).toHaveBeenCalledWith(
        expect.objectContaining({
          speaker: expect.any(Object),
          content: expect.stringMatching(/2nd level|upcast|enhanced/i),
        }),
      );
    });
  });

  describe("Different Spell Types", () => {
    test("should upcast damage spells correctly", async () => {
      // Magic Missile is already a damage spell - just verify
      const result = await castSpellFromFinger(
        mockActor,
        mockStoredSpell,
        {
          ...mockModifiers,
          enhanced: true,
        },
        mockAetherFuel,
      );

      expect(result.tempSpell.system.level).toBe(2);
      // D&D 5e system handles the extra damage
    });

    test("should upcast utility spells correctly", async () => {
      // Shield spell (utility)
      mockStoredSpell.spellData.name = "Spell Scroll: Shield";
      mockStoredSpell.spellData.system.damage = null;
      mockStoredSpell.spellData.flags.ddbimporter.originalName = "Shield";

      const result = await castSpellFromFinger(
        mockActor,
        mockStoredSpell,
        {
          ...mockModifiers,
          enhanced: true,
        },
        mockAetherFuel,
      );

      expect(result.tempSpell.system.level).toBe(2);
    });
  });

  describe("Error Handling", () => {
    test("should work without enhanced flag (defaults to false)", async () => {
      const result = await castSpellFromFinger(
        mockActor,
        mockStoredSpell,
        mockModifiers,
        mockAetherFuel,
      );

      expect(result.tempSpell.system.level).toBe(1);
      expect(mockActor.update).not.toHaveBeenCalled();
    });

    test("should handle missing actor spell slots gracefully", async () => {
      delete mockActor.system.spells;

      await expect(async () => {
        await castSpellFromFinger(
          mockActor,
          mockStoredSpell,
          {
            ...mockModifiers,
            enhanced: true,
          },
          mockAetherFuel,
        );
      }).rejects.toThrow();
    });
  });
});
