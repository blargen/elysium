/**
 * Tests for Fighting Style Utilities
 * Testing detection and granting of fighting styles for Aether's Edge
 */

import { describe, test, expect, beforeEach, jest } from "@jest/globals";
import {
  hasFightingStyle,
  getAvailableFightingStyles,
  grantTemporaryFightingStyle,
  removeTemporaryFightingStyles,
} from "../../scripts/utils/fighting-styles.js";

describe("Fighting Style Utilities", () => {
  let mockActor;

  beforeEach(() => {
    mockActor = {
      name: "Test Fighter",
      items: {
        _items: [],
        find: function (callback) {
          return this._items.find(callback);
        },
        filter: function (callback) {
          return this._items.filter(callback);
        },
      },
      createEmbeddedDocuments: jest.fn(async function (type, data) {
        const created = data.map((d, index) => ({
          id: `created-${index}`,
          ...d,
        }));
        return created;
      }),
    };
  });

  describe("hasFightingStyle", () => {
    test("returns false when actor has no fighting styles", () => {
      mockActor.items._items = [];

      expect(hasFightingStyle(mockActor, "Dueling")).toBe(false);
    });

    test("returns true when actor has fighting style by name", () => {
      mockActor.items._items = [
        {
          type: "feat",
          name: "Dueling",
          system: { identifier: "dueling" },
        },
      ];

      expect(hasFightingStyle(mockActor, "Dueling")).toBe(true);
    });

    test("returns true when actor has fighting style by identifier", () => {
      mockActor.items._items = [
        {
          type: "feat",
          name: "Dueling",
          system: { identifier: "dueling" },
        },
      ];

      expect(hasFightingStyle(mockActor, "dueling")).toBe(true);
    });

    test("returns false when item is not a feat", () => {
      mockActor.items._items = [
        {
          type: "weapon",
          name: "Dueling Sword",
          system: {},
        },
      ];

      expect(hasFightingStyle(mockActor, "Dueling")).toBe(false);
    });

    test("handles actor with no items collection", () => {
      const badActor = { name: "Bad Actor" };

      expect(hasFightingStyle(badActor, "Dueling")).toBe(false);
    });

    test("handles null actor", () => {
      expect(hasFightingStyle(null, "Dueling")).toBe(false);
    });
  });

  describe("getAvailableFightingStyles", () => {
    test("returns all styles when actor has none", () => {
      mockActor.items._items = [];

      const available = getAvailableFightingStyles(mockActor);

      expect(available).toHaveLength(4);
      expect(available.map((s) => s.name)).toContain("Archery");
      expect(available.map((s) => s.name)).toContain("Defense");
      expect(available.map((s) => s.name)).toContain("Great Weapon Fighting");
      expect(available.map((s) => s.name)).toContain("Two-Weapon Fighting");
    });

    test("excludes styles the actor already has", () => {
      mockActor.items._items = [
        {
          type: "feat",
          name: "Dueling",
          system: { identifier: "dueling" },
        },
        {
          type: "feat",
          name: "Defense",
          system: { identifier: "defense" },
        },
      ];

      const available = getAvailableFightingStyles(mockActor);

      expect(available).toHaveLength(3);
      expect(available.map((s) => s.name)).toContain("Archery");
      expect(available.map((s) => s.name)).toContain("Great Weapon Fighting");
      expect(available.map((s) => s.name)).toContain("Two-Weapon Fighting");
      expect(available.map((s) => s.name)).not.toContain("Defense");
    });

    test("returns empty array if actor has all styles", () => {
      mockActor.items._items = [
        { type: "feat", name: "Archery", system: { identifier: "archery" } },
        { type: "feat", name: "Defense", system: { identifier: "defense" } },
        {
          type: "feat",
          name: "Great Weapon Fighting",
          system: { identifier: "great-weapon-fighting" },
        },
        {
          type: "feat",
          name: "Two-Weapon Fighting",
          system: { identifier: "two-weapon-fighting" },
        },
      ];

      const available = getAvailableFightingStyles(mockActor);

      expect(available).toHaveLength(0);
    });
  });

  describe("grantTemporaryFightingStyle", () => {
    test("creates feat item for Archery", async () => {
      const feat = await grantTemporaryFightingStyle(mockActor, "Archery");

      expect(mockActor.createEmbeddedDocuments).toHaveBeenCalledWith(
        "Item",
        expect.arrayContaining([
          expect.objectContaining({
            name: "Archery",
            type: "feat",
            flags: expect.objectContaining({
              elysium: expect.objectContaining({
                isTemporaryFightingStyle: true,
                grantedBy: "aethers-edge",
              }),
            }),
          }),
        ]),
      );

      expect(feat.name).toBe("Archery");
    });

    test("creates feat item for Defense", async () => {
      const feat = await grantTemporaryFightingStyle(mockActor, "Defense");

      expect(mockActor.createEmbeddedDocuments).toHaveBeenCalledWith(
        "Item",
        expect.arrayContaining([
          expect.objectContaining({
            name: "Defense",
            type: "feat",
          }),
        ]),
      );

      expect(feat.name).toBe("Defense");
    });

    test("creates feat item for Great Weapon Fighting", async () => {
      const feat = await grantTemporaryFightingStyle(
        mockActor,
        "Great Weapon Fighting",
      );

      expect(feat.name).toBe("Great Weapon Fighting");
      expect(feat.flags.elysium.isTemporaryFightingStyle).toBe(true);
    });

    test("creates feat item for Two-Weapon Fighting", async () => {
      const feat = await grantTemporaryFightingStyle(
        mockActor,
        "Two-Weapon Fighting",
      );

      expect(mockActor.createEmbeddedDocuments).toHaveBeenCalledWith(
        "Item",
        expect.arrayContaining([
          expect.objectContaining({
            name: "Two-Weapon Fighting",
            type: "feat",
          }),
        ]),
      );
    });

    test("returns null for unknown fighting style", async () => {
      // Mock console.error to avoid noise
      const consoleError = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const feat = await grantTemporaryFightingStyle(
        mockActor,
        "Unknown Style",
      );

      expect(feat).toBeNull();
      expect(consoleError).toHaveBeenCalled();

      consoleError.mockRestore();
    });

    test("warns if actor already has the fighting style", async () => {
      mockActor.items._items = [
        {
          type: "feat",
          name: "Archery",
          system: { identifier: "archery" },
        },
      ];

      // Mock ui.notifications
      global.ui = {
        notifications: {
          warn: jest.fn(),
        },
      };

      const feat = await grantTemporaryFightingStyle(mockActor, "Archery");

      expect(feat).toBeNull();
      expect(global.ui.notifications.warn).toHaveBeenCalledWith(
        expect.stringContaining("already has Archery"),
      );
    });
  });

  describe("removeTemporaryFightingStyles", () => {
    test("removes temporary fighting styles", async () => {
      mockActor.items._items = [
        {
          id: "temp-archery",
          type: "feat",
          name: "Archery",
          getFlag: (scope, key) =>
            scope === "elysium" && key === "isTemporaryFightingStyle"
              ? true
              : undefined,
        },
        {
          id: "perm-defense",
          type: "feat",
          name: "Defense",
          getFlag: () => undefined, // Not temporary
        },
      ];
      mockActor.deleteEmbeddedDocuments = jest.fn(async () => {});

      const removed = await removeTemporaryFightingStyles(mockActor);

      expect(removed).toBe(1);
      expect(mockActor.deleteEmbeddedDocuments).toHaveBeenCalledWith("Item", [
        "temp-archery",
      ]);
    });

    test("returns 0 when no temporary styles exist", async () => {
      mockActor.items._items = [
        {
          id: "perm-defense",
          type: "feat",
          name: "Defense",
          getFlag: () => undefined,
        },
      ];
      mockActor.deleteEmbeddedDocuments = jest.fn(async () => {});

      const removed = await removeTemporaryFightingStyles(mockActor);

      expect(removed).toBe(0);
      expect(mockActor.deleteEmbeddedDocuments).not.toHaveBeenCalled();
    });
  });
});
