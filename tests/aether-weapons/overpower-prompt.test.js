/**
 * Tests for Overpower Prompt Hook
 *
 * Tests the dialog that prompts users to choose between Normal Fire and Overpower
 * when using an aether weapon. Shows current toxicity status to help players decide.
 */

import { describe, test, expect, jest, beforeEach } from "@jest/globals";
import {
  shouldShowOverpowerPrompt,
  createOverpowerDialog,
  handleOverpowerChoice,
} from "../../scripts/aether-weapons/overpower-prompt.js";
import { calculateToxicityDC } from "../../scripts/utils/calculations.js";

// Mock Foundry Dialog
global.Dialog = class MockDialog {
  constructor(config) {
    this.config = config;
  }

  static async wait(config) {
    return new MockDialog(config);
  }
};

describe("Overpower Prompt Hook", () => {
  describe("Detection", () => {
    test("should show prompt for aether weapons", () => {
      const weapon = {
        getFlag: (scope, key) => {
          if (scope === "elysium" && key === "isAetherWeapon") return true;
          return undefined;
        },
      };

      expect(shouldShowOverpowerPrompt(weapon)).toBe(true);
    });

    test("should NOT show prompt for non-aether weapons", () => {
      const weapon = {
        getFlag: () => undefined,
      };

      expect(shouldShowOverpowerPrompt(weapon)).toBe(false);
    });

    test("should handle null weapon", () => {
      expect(shouldShowOverpowerPrompt(null)).toBe(false);
    });
  });

  describe("Dialog Creation - Basic Structure", () => {
    test("should create dialog with proper title", () => {
      const weapon = {
        name: "The Elysium Defender",
        getFlag: (scope, key) => {
          if (scope === "elysium" && key === "normalDamage") return "2d6";
          if (scope === "elysium" && key === "overpowerDamage") return "4d6";
          return undefined;
        },
      };

      const actor = {
        getFlag: () => 0,
      };

      const dialog = createOverpowerDialog(weapon, actor);

      expect(dialog.title).toBeDefined();
      expect(dialog.title).toContain("Fire Mode");
    });

    test("should use Elysium CSS classes", () => {
      const weapon = {
        name: "The Elysium Defender",
        getFlag: (scope, key) => {
          if (scope === "elysium" && key === "normalDamage") return "2d6";
          if (scope === "elysium" && key === "overpowerDamage") return "4d6";
          return undefined;
        },
      };

      const actor = {
        getFlag: () => 0,
      };

      const dialog = createOverpowerDialog(weapon, actor);

      expect(dialog.content).toContain("elysium-dialog-content");
      expect(dialog.content).toContain("elysium-header");
    });

    test("should have two buttons (Normal and Overpower)", () => {
      const weapon = {
        name: "The Elysium Defender",
        getFlag: (scope, key) => {
          if (scope === "elysium" && key === "normalDamage") return "2d6";
          if (scope === "elysium" && key === "overpowerDamage") return "4d6";
          return undefined;
        },
      };

      const actor = {
        getFlag: () => 0,
      };

      const dialog = createOverpowerDialog(weapon, actor);

      expect(dialog.buttons).toBeDefined();
      expect(Object.keys(dialog.buttons).length).toBe(2);
      expect(dialog.buttons.normal).toBeDefined();
      expect(dialog.buttons.overpower).toBeDefined();
    });
  });

  describe("Dialog Content - Fire Modes", () => {
    test("should include Normal Fire option with damage", () => {
      const weapon = {
        name: "The Elysium Defender",
        getFlag: (scope, key) => {
          if (scope === "elysium" && key === "normalDamage") return "2d6";
          if (scope === "elysium" && key === "overpowerDamage") return "4d6";
          return undefined;
        },
      };

      const actor = {
        getFlag: () => 0,
      };

      const dialog = createOverpowerDialog(weapon, actor);

      expect(dialog.content).toContain("Normal Fire");
      expect(dialog.content).toContain("2d6");
    });

    test("should include Overpower option with damage", () => {
      const weapon = {
        name: "The Elysium Defender",
        getFlag: (scope, key) => {
          if (scope === "elysium" && key === "normalDamage") return "2d6";
          if (scope === "elysium" && key === "overpowerDamage") return "4d6";
          return undefined;
        },
      };

      const actor = {
        getFlag: () => 0,
      };

      const dialog = createOverpowerDialog(weapon, actor);

      expect(dialog.content).toContain("Overpower");
      expect(dialog.content).toContain("4d6");
    });

    test("should display different damage formulas correctly", () => {
      const weapon = {
        name: "Test Weapon",
        getFlag: (scope, key) => {
          if (scope === "elysium" && key === "normalDamage") return "3d8";
          if (scope === "elysium" && key === "overpowerDamage") return "6d8";
          return undefined;
        },
      };

      const actor = {
        getFlag: () => 0,
      };

      const dialog = createOverpowerDialog(weapon, actor);

      expect(dialog.content).toContain("3d8");
      expect(dialog.content).toContain("6d8");
    });
  });

  describe("Dialog Content - Current Toxicity Status", () => {
    test("should display current daily doses (zero)", () => {
      const weapon = {
        name: "The Elysium Defender",
        getFlag: (scope, key) => {
          if (scope === "elysium" && key === "normalDamage") return "2d6";
          if (scope === "elysium" && key === "overpowerDamage") return "4d6";
          return undefined;
        },
      };

      const actor = {
        getFlag: (scope, key) => {
          if (scope === "elysium" && key === "dailyDoses") return 0;
          if (scope === "elysium" && key === "atl") return 0;
          return 0;
        },
      };

      const dialog = createOverpowerDialog(weapon, actor);

      expect(dialog.content).toContain("Daily Doses");
      expect(dialog.content).toContain("0");
    });

    test("should display current daily doses (multiple)", () => {
      const weapon = {
        name: "The Elysium Defender",
        getFlag: (scope, key) => {
          if (scope === "elysium" && key === "normalDamage") return "2d6";
          if (scope === "elysium" && key === "overpowerDamage") return "4d6";
          return undefined;
        },
      };

      const actor = {
        getFlag: (scope, key) => {
          if (scope === "elysium" && key === "dailyDoses") return 3;
          if (scope === "elysium" && key === "atl") return 2;
          return 0;
        },
      };

      const dialog = createOverpowerDialog(weapon, actor);

      expect(dialog.content).toContain("Daily Doses");
      expect(dialog.content).toContain("3");
    });

    test("should display current ATL (zero)", () => {
      const weapon = {
        name: "The Elysium Defender",
        getFlag: (scope, key) => {
          if (scope === "elysium" && key === "normalDamage") return "2d6";
          if (scope === "elysium" && key === "overpowerDamage") return "4d6";
          return undefined;
        },
      };

      const actor = {
        getFlag: (scope, key) => {
          if (scope === "elysium" && key === "dailyDoses") return 0;
          if (scope === "elysium" && key === "atl") return 0;
          return 0;
        },
      };

      const dialog = createOverpowerDialog(weapon, actor);

      expect(dialog.content).toContain("ATL");
      expect(dialog.content).toMatch(/ATL.*0/);
    });

    test("should display current ATL (elevated)", () => {
      const weapon = {
        name: "The Elysium Defender",
        getFlag: (scope, key) => {
          if (scope === "elysium" && key === "normalDamage") return "2d6";
          if (scope === "elysium" && key === "overpowerDamage") return "4d6";
          return undefined;
        },
      };

      const actor = {
        getFlag: (scope, key) => {
          if (scope === "elysium" && key === "dailyDoses") return 2;
          if (scope === "elysium" && key === "atl") return 3;
          return 0;
        },
      };

      const dialog = createOverpowerDialog(weapon, actor);

      expect(dialog.content).toContain("ATL");
      expect(dialog.content).toMatch(/ATL.*3/);
    });
  });

  describe("Dialog Content - Overpower Risk Display", () => {
    test("should show guaranteed ATL increase warning", () => {
      const weapon = {
        name: "The Elysium Defender",
        getFlag: (scope, key) => {
          if (scope === "elysium" && key === "normalDamage") return "2d6";
          if (scope === "elysium" && key === "overpowerDamage") return "4d6";
          return undefined;
        },
      };

      const actor = {
        getFlag: () => 0,
      };

      const dialog = createOverpowerDialog(weapon, actor);

      expect(dialog.content).toContain("Guaranteed");
      expect(dialog.content).toContain("+1 ATL");
    });

    test("should show CON save DC for first overpower use", () => {
      const weapon = {
        name: "The Elysium Defender",
        getFlag: (scope, key) => {
          if (scope === "elysium" && key === "normalDamage") return "2d6";
          if (scope === "elysium" && key === "overpowerDamage") return "4d6";
          return undefined;
        },
      };

      const actor = {
        getFlag: (scope, key) => {
          if (scope === "elysium" && key === "dailyDoses") return 0;
          return 0;
        },
      };

      const dialog = createOverpowerDialog(weapon, actor);
      const expectedDC = calculateToxicityDC(0); // DC 12 for first use

      expect(dialog.content).toContain("DC");
      expect(dialog.content).toContain(expectedDC.toString());
    });

    test("should show CON save DC for subsequent overpower use", () => {
      const weapon = {
        name: "The Elysium Defender",
        getFlag: (scope, key) => {
          if (scope === "elysium" && key === "normalDamage") return "2d6";
          if (scope === "elysium" && key === "overpowerDamage") return "4d6";
          return undefined;
        },
      };

      const actor = {
        getFlag: (scope, key) => {
          if (scope === "elysium" && key === "dailyDoses") return 3;
          if (scope === "elysium" && key === "atl") return 2;
          return 0;
        },
      };

      const dialog = createOverpowerDialog(weapon, actor);
      const expectedDC = calculateToxicityDC(3); // DC 18 for 4th use

      expect(dialog.content).toContain("DC");
      expect(dialog.content).toContain(expectedDC.toString());
    });

    test("should show weapon lock risk warning", () => {
      const weapon = {
        name: "The Elysium Defender",
        getFlag: (scope, key) => {
          if (scope === "elysium" && key === "normalDamage") return "2d6";
          if (scope === "elysium" && key === "overpowerDamage") return "4d6";
          return undefined;
        },
      };

      const actor = {
        getFlag: () => 0,
      };

      const dialog = createOverpowerDialog(weapon, actor);

      expect(dialog.content).toContain("weapon lock");
      expect(dialog.content).toContain("long rest");
    });

    test("should include aether fuel requirement mention", () => {
      const weapon = {
        name: "The Elysium Defender",
        getFlag: (scope, key) => {
          if (scope === "elysium" && key === "normalDamage") return "2d6";
          if (scope === "elysium" && key === "overpowerDamage") return "4d6";
          return undefined;
        },
      };

      const actor = {
        getFlag: () => 0,
      };

      const dialog = createOverpowerDialog(weapon, actor);

      expect(dialog.content).toContain("aether");
    });
  });

  describe("User Choice Handling", () => {
    test("should return 'normal' for Normal Fire choice", () => {
      const result = handleOverpowerChoice("normal");
      expect(result.mode).toBe("normal");
      expect(result.cancelled).toBe(false);
    });

    test("should return 'overpower' for Overpower choice", () => {
      const result = handleOverpowerChoice("overpower");
      expect(result.mode).toBe("overpower");
      expect(result.cancelled).toBe(false);
    });

    test("should return cancelled if no choice made", () => {
      const result = handleOverpowerChoice(null);
      expect(result.cancelled).toBe(true);
    });

    test("should return cancelled if undefined choice", () => {
      const result = handleOverpowerChoice(undefined);
      expect(result.cancelled).toBe(true);
    });
  });
});
