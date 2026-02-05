/**
 * Tests for Toxicity Calculations
 *
 * These are pure functions - easy to test!
 */

import { describe, test, expect } from "@jest/globals";
import {
  calculateToxicityDC,
  shouldAddExhaustion,
} from "../../scripts/utils/calculations.js";

describe("Toxicity Calculations", () => {
  describe("calculateToxicityDC", () => {
    test("calculates DC correctly for first dose", () => {
      expect(calculateToxicityDC(0)).toBe(12); // 10 + 2*1
    });

    test("calculates DC correctly for second dose", () => {
      expect(calculateToxicityDC(1)).toBe(14); // 10 + 2*2
    });

    test("calculates DC correctly for fifth dose", () => {
      expect(calculateToxicityDC(4)).toBe(20); // 10 + 2*5
    });

    test("calculates DC correctly for tenth dose", () => {
      expect(calculateToxicityDC(9)).toBe(30); // 10 + 2*10
    });
  });

  describe("shouldAddExhaustion", () => {
    test("returns false for ATL 1", () => {
      expect(shouldAddExhaustion(1)).toBe(false);
    });

    test("returns true for ATL 2 (first exhaustion point)", () => {
      expect(shouldAddExhaustion(2)).toBe(true);
    });

    test("returns false for ATL 3", () => {
      expect(shouldAddExhaustion(3)).toBe(false);
    });

    test("returns true for ATL 4 (second exhaustion point)", () => {
      expect(shouldAddExhaustion(4)).toBe(true);
    });

    test("returns false for ATL 5", () => {
      expect(shouldAddExhaustion(5)).toBe(false);
    });
  });
});
