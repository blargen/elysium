/**
 * Tests for Fuel Selection Prompt
 *
 * Tests the dialog that lets users choose which aether fuel to use.
 * Built with TDD to match our overpower prompt quality!
 */

import { describe, test, expect, jest } from "@jest/globals";
import {
  createFuelSelectionDialog,
  showFuelSelectionPrompt,
} from "../../scripts/aether-weapons/fuel-selection-prompt.js";

// Mock Dialog
global.Dialog = class MockDialog {
  static async wait(config) {
    return null; // Default to cancel
  }
};

describe("Fuel Selection Prompt", () => {
  describe("Dialog Creation", () => {
    test("should create dialog with proper title", () => {
      const fuels = [
        {
          id: "fuel1",
          name: "Basic Refined Aether",
          img: "path/to/icon.png",
          system: { quantity: 3 },
          getFlag: (scope, key) => {
            if (scope === "elysium" && key === "aetherQuality")
              return "basic-refined";
            return undefined;
          },
        },
      ];

      const dialog = createFuelSelectionDialog(fuels);

      expect(dialog.title).toBeDefined();
      expect(dialog.title).toContain("Select");
    });

    test("should show fuel name in content", () => {
      const fuels = [
        {
          id: "fuel1",
          name: "Rarefied Aether",
          img: "path/to/icon.png",
          system: { quantity: 5 },
          getFlag: (scope, key) => {
            if (scope === "elysium" && key === "aetherQuality")
              return "rarefied";
            return undefined;
          },
        },
      ];

      const dialog = createFuelSelectionDialog(fuels);

      expect(dialog.content).toContain("Rarefied Aether");
    });

    test("should show fuel image in content", () => {
      const fuels = [
        {
          id: "fuel1",
          name: "Basic Refined Aether",
          img: "modules/elysium/assets/aether-blue.png",
          system: { quantity: 3 },
          getFlag: () => "basic-refined",
        },
      ];

      const dialog = createFuelSelectionDialog(fuels);

      expect(dialog.content).toContain("modules/elysium/assets/aether-blue.png");
      expect(dialog.content).toContain("<img");
    });

    test("should show quantity in content", () => {
      const fuels = [
        {
          id: "fuel1",
          name: "Basic Refined Aether",
          img: "path/to/icon.png",
          system: { quantity: 7 },
          getFlag: (scope, key) => {
            if (scope === "elysium" && key === "aetherQuality")
              return "basic-refined";
            return undefined;
          },
        },
      ];

      const dialog = createFuelSelectionDialog(fuels);

      expect(dialog.content).toContain("7");
    });

    test("should show quality description", () => {
      const fuels = [
        {
          id: "fuel1",
          name: "Rarefied Aether",
          img: "path/to/icon.png",
          system: { quantity: 3 },
          getFlag: (scope, key) => {
            if (scope === "elysium" && key === "aetherQuality")
              return "rarefied";
            return undefined;
          },
        },
      ];

      const dialog = createFuelSelectionDialog(fuels);

      expect(dialog.content).toContain("Enhanced");
    });

    test("should show multiple fuel options", () => {
      const fuels = [
        {
          id: "fuel1",
          name: "Basic Refined Aether",
          img: "path/to/icon.png",
          system: { quantity: 3 },
          getFlag: () => "basic-refined",
        },
        {
          id: "fuel2",
          name: "Rarefied Aether",
          img: "path/to/icon.png",
          system: { quantity: 1 },
          getFlag: () => "rarefied",
        },
      ];

      const dialog = createFuelSelectionDialog(fuels);

      expect(dialog.content).toContain("Basic Refined Aether");
      expect(dialog.content).toContain("Rarefied Aether");
    });

    test("should use Elysium CSS classes", () => {
      const fuels = [
        {
          id: "fuel1",
          name: "Basic Refined Aether",
          img: "path/to/icon.png",
          system: { quantity: 3 },
          getFlag: () => "basic-refined",
        },
      ];

      const dialog = createFuelSelectionDialog(fuels);

      expect(dialog.content).toContain("elysium-dialog-content");
    });

    test("should have buttons for each fuel", () => {
      const fuels = [
        {
          id: "fuel1",
          name: "Basic Refined Aether",
          img: "path/to/icon.png",
          system: { quantity: 3 },
          getFlag: () => "basic-refined",
        },
        {
          id: "fuel2",
          name: "Rarefied Aether",
          img: "path/to/icon.png",
          system: { quantity: 1 },
          getFlag: () => "rarefied",
        },
      ];

      const dialog = createFuelSelectionDialog(fuels);

      expect(dialog.buttons).toBeDefined();
      expect(Object.keys(dialog.buttons).length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("Fuel Selection Flow", () => {
    test("should return selected fuel when chosen", async () => {
      const fuels = [
        {
          id: "fuel1",
          name: "Basic Refined Aether",
          img: "path/to/icon.png",
          system: { quantity: 3 },
          getFlag: () => "basic-refined",
        },
      ];

      // Mock dialog to return the fuel
      global.Dialog.wait = jest.fn(async () => fuels[0]);

      const result = await showFuelSelectionPrompt(fuels);

      expect(result).toBe(fuels[0]);
    });

    test("should return null when cancelled", async () => {
      const fuels = [
        {
          id: "fuel1",
          name: "Basic Refined Aether",
          img: "path/to/icon.png",
          system: { quantity: 3 },
          getFlag: () => "basic-refined",
        },
      ];

      // Mock dialog to return null (cancelled)
      global.Dialog.wait = jest.fn(async () => null);

      const result = await showFuelSelectionPrompt(fuels);

      expect(result).toBeNull();
    });

    test("should return null when no fuels available", async () => {
      const fuels = [];

      const result = await showFuelSelectionPrompt(fuels);

      expect(result).toBeNull();
    });
  });
});
