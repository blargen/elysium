/**
 * Tests for The Metatron Handler
 * Tests validation and action selection workflow
 */

import { describe, test, expect, beforeEach, jest } from "@jest/globals";
import { handleMetatronUse } from "../../scripts/the-metatron/metatron-handler.js";

describe("The Metatron Handler", () => {
  let mockActor;
  let mockItem;

  beforeEach(() => {
    // Mock actor
    mockActor = {
      name: "Test Cleric",
      classes: {
        cleric: { system: { levels: 3 } },
      },
      items: {
        filter: jest.fn(() => []),
        find: jest.fn(),
        get: jest.fn(),
      },
    };

    // Mock item
    mockItem = {
      name: "The Metatron",
      getFlag: jest.fn((namespace, key) => {
        if (key === "requiredLevel") return 3;
        if (key === "requiredClass") return "cleric";
        if (key === "disabled") return false;
        return null;
      }),
      system: {
        attunement: "required",
        attuned: true,
        equipped: true,
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
    test("should reject non-cleric actor", async () => {
      mockActor.classes = { fighter: { system: { levels: 5 } } };

      await handleMetatronUse(mockActor, mockItem);

      expect(ui.notifications.error).toHaveBeenCalledWith(
        "This modification requires the cleric class",
      );
    });

    test("should reject cleric below level 3", async () => {
      mockActor.classes.cleric.system.levels = 2;

      await handleMetatronUse(mockActor, mockItem);

      expect(ui.notifications.error).toHaveBeenCalledWith(
        "This modification requires cleric level 3 or higher",
      );
    });

    test("should accept cleric at level 3", async () => {
      mockActor.classes.cleric.system.levels = 3;
      mockItem.system.equipped = true;

      // Mock Dialog to immediately cancel (we just want to verify validation passed)
      global.Dialog = class {
        constructor(config) {
          this.config = config;
        }
        render() {
          setTimeout(() => this.config.buttons.cancel.callback(), 0);
          return this;
        }
      };

      await handleMetatronUse(mockActor, mockItem);

      expect(ui.notifications.error).not.toHaveBeenCalled();
    });

    test("should accept cleric above level 3", async () => {
      mockActor.classes.cleric.system.levels = 7;
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

      await handleMetatronUse(mockActor, mockItem);

      expect(ui.notifications.error).not.toHaveBeenCalled();
    });

    test("should reject if not equipped", async () => {
      mockItem.system.equipped = false;

      await handleMetatronUse(mockActor, mockItem);

      expect(ui.notifications.error).toHaveBeenCalledWith(
        "This modification must be equipped to use",
      );
    });

    test("should reject if not attuned", async () => {
      mockItem.system.equipped = true;
      mockItem.system.attuned = false;

      await handleMetatronUse(mockActor, mockItem);

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

      await handleMetatronUse(mockActor, mockItem);

      expect(ui.notifications.error).not.toHaveBeenCalled();
    });

    test("should reject if The Metatron is disabled (Healer's Gambit failed)", async () => {
      mockItem.getFlag = jest.fn((namespace, key) => {
        if (key === "requiredLevel") return 3;
        if (key === "requiredClass") return "cleric";
        if (key === "disabled") return true;
        return null;
      });

      await handleMetatronUse(mockActor, mockItem);

      expect(ui.notifications.error).toHaveBeenCalledWith(
        "The Metatron is dormant and cannot be used until you complete a long rest",
      );
    });
  });

  describe("Action selection dialog", () => {
    test("should show all four action options", async () => {
      let dialogContent = "";
      global.Dialog = class {
        constructor(config) {
          this.config = config;
          dialogContent = config.content;
        }
        render() {
          setTimeout(() => this.config.buttons.cancel.callback(), 0);
          return this;
        }
      };

      await handleMetatronUse(mockActor, mockItem);

      // Verify all four action options are present
      expect(dialogContent).toContain("Prayer of Creation");
      expect(dialogContent).toContain("Psalm of Casting");
      expect(dialogContent).toContain("Meditation of Forgetfulness");
      expect(dialogContent).toContain("Healer's Gambit");
    });
  });
});
