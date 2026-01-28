/**
 * Tests for Aether's Grasp Handler
 * Tests validation and action selection workflow
 */

import { describe, test, expect, beforeEach, jest } from "@jest/globals";
import { handleAethersGraspUse } from "../../scripts/aethers-grasp/grasp-handler.js";

describe("Aether's Grasp Handler", () => {
  let mockActor;
  let mockItem;

  beforeEach(() => {
    // Mock actor
    mockActor = {
      name: "Test Wizard",
      classes: {
        wizard: { system: { levels: 3 } },
      },
      items: {
        filter: jest.fn(() => []),
        find: jest.fn(),
        get: jest.fn(),
      },
    };

    // Mock item
    mockItem = {
      name: "Aether's Grasp",
      getFlag: jest.fn((namespace, key) => {
        if (key === "requiredLevel") return 3;
        if (key === "requiredClass") return "wizard";
        return null;
      }),
      system: {
        attunement: "required",
        attuned: true,
      },
    };

    // Mock global ui
    global.ui = {
      notifications: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      },
    };

    // Mock global Dialog
    global.Dialog = class {
      constructor(config) {
        this.config = config;
      }
      render() {
        return this;
      }
    };
  });

  describe("Validation checks", () => {
    test("should reject non-wizard actor", async () => {
      mockActor.classes = { fighter: { system: { levels: 5 } } };

      await handleAethersGraspUse(mockActor, mockItem);

      expect(ui.notifications.error).toHaveBeenCalledWith(
        "This modification requires the wizard class",
      );
    });

    test("should reject wizard below level 3", async () => {
      mockActor.classes.wizard.system.levels = 2;

      await handleAethersGraspUse(mockActor, mockItem);

      expect(ui.notifications.error).toHaveBeenCalledWith(
        "This modification requires wizard level 3 or higher",
      );
    });

    test("should accept wizard at level 3", async () => {
      mockActor.classes.wizard.system.levels = 3;
      mockItem.system.equipped = true;

      // Mock Dialog to immediately cancel (we just want to verify validation passed)
      global.Dialog = class {
        constructor(config) {
          this.config = config;
        }
        render() {
          // Immediately resolve as cancelled
          setTimeout(() => this.config.buttons.cancel.callback(), 0);
          return this;
        }
      };

      await handleAethersGraspUse(mockActor, mockItem);

      expect(ui.notifications.error).not.toHaveBeenCalled();
    });

    test("should accept wizard above level 3", async () => {
      mockActor.classes.wizard.system.levels = 5;
      mockItem.system.equipped = true;

      // Mock Dialog to immediately cancel
      global.Dialog = class {
        constructor(config) {
          this.config = config;
        }
        render() {
          setTimeout(() => this.config.buttons.cancel.callback(), 0);
          return this;
        }
      };

      await handleAethersGraspUse(mockActor, mockItem);

      expect(ui.notifications.error).not.toHaveBeenCalled();
    });

    test("should reject if not equipped", async () => {
      mockItem.system.equipped = false;

      await handleAethersGraspUse(mockActor, mockItem);

      expect(ui.notifications.error).toHaveBeenCalledWith(
        "This modification must be equipped to use",
      );
    });

    test("should reject if not attuned", async () => {
      mockItem.system.equipped = true;
      mockItem.system.attuned = false;

      await handleAethersGraspUse(mockActor, mockItem);

      expect(ui.notifications.error).toHaveBeenCalledWith(
        "This modification requires attunement",
      );
    });

    test("should accept if attunement not required", async () => {
      mockItem.system.attunement = "none";
      mockItem.system.attuned = false;
      mockItem.system.equipped = true;

      // Mock Dialog to immediately cancel
      global.Dialog = class {
        constructor(config) {
          this.config = config;
        }
        render() {
          setTimeout(() => this.config.buttons.cancel.callback(), 0);
          return this;
        }
      };

      await handleAethersGraspUse(mockActor, mockItem);

      expect(ui.notifications.error).not.toHaveBeenCalled();
    });
  });

  // Note: Action selection dialog interactions (imprint/cast/forget/cancel)
  // are tested via integration in Foundry. The individual action handlers
  // (handleImprintFromScroll, handleCastFromFinger, handleForgetFromFinger)
  // are tested in their respective test files: imprint.test.js, cast.test.js, forget.test.js
});
