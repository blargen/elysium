/**
 * Tests for Shared Overload Mechanics
 *
 * Reusable functions for items with risk/reward overload abilities.
 * Used by: The Metatron (Healer's Gambit), The Elysium Defender (Overload), future items.
 */

import { describe, test, expect, beforeEach, jest } from "@jest/globals";
import {
  calculateOverloadThreshold,
  isOverloadFailure,
  disableItem,
  enableItem,
  isItemDisabled,
} from "../../scripts/utils/overload.js";

describe("Shared Overload Mechanics", () => {
  describe("calculateOverloadThreshold", () => {
    test("returns 2 at ATL 0", () => {
      expect(calculateOverloadThreshold(0)).toBe(2);
    });

    test("returns 4 at ATL 1", () => {
      expect(calculateOverloadThreshold(1)).toBe(4);
    });

    test("returns 6 at ATL 2", () => {
      expect(calculateOverloadThreshold(2)).toBe(6);
    });

    test("returns 10 at ATL 4", () => {
      expect(calculateOverloadThreshold(4)).toBe(10);
    });

    test("scales linearly: 2 + ATL * 2", () => {
      for (let atl = 0; atl <= 8; atl++) {
        expect(calculateOverloadThreshold(atl)).toBe(2 + atl * 2);
      }
    });

    test("caps at 20", () => {
      expect(calculateOverloadThreshold(10)).toBe(20);
      expect(calculateOverloadThreshold(15)).toBe(20);
    });
  });

  describe("isOverloadFailure", () => {
    test("returns true when roll equals threshold", () => {
      expect(isOverloadFailure(4, 4)).toBe(true);
    });

    test("returns true when roll is below threshold", () => {
      expect(isOverloadFailure(1, 4)).toBe(true);
    });

    test("returns false when roll is above threshold", () => {
      expect(isOverloadFailure(5, 4)).toBe(false);
    });

    test("roll of 1 always fails (threshold minimum is 2)", () => {
      expect(isOverloadFailure(1, 2)).toBe(true);
    });

    test("roll of 20 succeeds unless threshold is 20", () => {
      expect(isOverloadFailure(20, 19)).toBe(false);
      expect(isOverloadFailure(20, 20)).toBe(true);
    });
  });

  describe("disableItem", () => {
    let mockItem;

    beforeEach(() => {
      mockItem = {
        flags: { elysium: { disabled: false } },
        getFlag: function (scope, key) {
          return this.flags[scope]?.[key];
        },
        setFlag: jest.fn(async function (scope, key, value) {
          if (!this.flags[scope]) this.flags[scope] = {};
          this.flags[scope][key] = value;
          return this;
        }),
      };
    });

    test("sets disabled flag to true", async () => {
      await disableItem(mockItem);

      expect(mockItem.setFlag).toHaveBeenCalledWith(
        "elysium",
        "disabled",
        true,
      );
    });
  });

  describe("enableItem", () => {
    let mockItem;

    beforeEach(() => {
      mockItem = {
        flags: { elysium: { disabled: true } },
        getFlag: function (scope, key) {
          return this.flags[scope]?.[key];
        },
        setFlag: jest.fn(async function (scope, key, value) {
          if (!this.flags[scope]) this.flags[scope] = {};
          this.flags[scope][key] = value;
          return this;
        }),
      };
    });

    test("sets disabled flag to false", async () => {
      await enableItem(mockItem);

      expect(mockItem.setFlag).toHaveBeenCalledWith(
        "elysium",
        "disabled",
        false,
      );
    });
  });

  describe("isItemDisabled", () => {
    test("returns false when disabled is false", () => {
      const item = {
        getFlag: () => false,
      };
      expect(isItemDisabled(item)).toBe(false);
    });

    test("returns true when disabled is true", () => {
      const item = {
        getFlag: () => true,
      };
      expect(isItemDisabled(item)).toBe(true);
    });

    test("returns false when no elysium flags exist", () => {
      const item = {
        getFlag: () => undefined,
      };
      expect(isItemDisabled(item)).toBe(false);
    });
  });
});
