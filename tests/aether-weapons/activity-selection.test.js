/**
 * Tests for Activity Selection Logic
 *
 * Tests the pure logic that determines which activity to trigger based on fire mode choice.
 * Building this with TDD - tests first, implementation second!
 */

import { describe, test, expect } from "@jest/globals";
import { getActivityIdForFireMode } from "../../scripts/aether-weapons/activity-selection.js";

describe("Activity Selection Logic", () => {
  describe("getActivityIdForFireMode", () => {
    test("should return 'Fire' for normal fire mode", () => {
      const result = getActivityIdForFireMode("normal");
      expect(result).toBe("Fire");
    });

    test("should return 'Overload' for overpower mode", () => {
      const result = getActivityIdForFireMode("overpower");
      expect(result).toBe("Overload");
    });

    test("should return null for invalid choice", () => {
      const result = getActivityIdForFireMode("invalid");
      expect(result).toBeNull();
    });

    test("should return null for null input", () => {
      const result = getActivityIdForFireMode(null);
      expect(result).toBeNull();
    });

    test("should return null for undefined input", () => {
      const result = getActivityIdForFireMode(undefined);
      expect(result).toBeNull();
    });

    test("should be case-sensitive", () => {
      const result = getActivityIdForFireMode("NORMAL");
      expect(result).toBeNull(); // Should not match
    });
  });
});
