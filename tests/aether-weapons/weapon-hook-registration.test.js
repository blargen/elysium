/**
 * Tests for Weapon Hook Registration
 *
 * Tests that our weapon usage hook is properly registered with Foundry.
 */

import { describe, test, expect, jest, beforeEach } from "@jest/globals";
import { registerWeaponUsageHook } from "../../scripts/aether-weapons/weapon-hook-registration.js";

// Mock Hooks
global.Hooks = {
  on: jest.fn(),
  once: jest.fn(),
};

describe("Weapon Hook Registration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should register midi-qol.preItemRoll hook", () => {
    registerWeaponUsageHook();

    expect(Hooks.on).toHaveBeenCalledWith(
      "midi-qol.preItemRoll",
      expect.any(Function)
    );
  });

  test("should register hook only once", () => {
    registerWeaponUsageHook();

    expect(Hooks.on).toHaveBeenCalledTimes(1);
  });

  test("registered hook callback should be a function", () => {
    registerWeaponUsageHook();

    // Get the registered callback
    const callback = Hooks.on.mock.calls[0][1];

    // Should be an async function
    expect(typeof callback).toBe("function");
  });
});
