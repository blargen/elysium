/**
 * Tests for Weapon Usage Hook Integration
 *
 * Tests the hook that connects the overpower prompt and execution
 * to actual weapon usage in Foundry.
 *
 * Building this incrementally with TDD!
 */

import { describe, test, expect, jest, beforeEach } from "@jest/globals";
import {
  shouldInterceptWeapon,
  showOverpowerPrompt,
  handleNormalFire,
  checkFuelForOverpower,
  handleAetherWeaponUsage,
} from "../../scripts/aether-weapons/weapon-usage-hook.js";

// Mock Dialog that simulates card-selection behavior
// Set mockDialogSequence to an array of return values for sequential dialogs
let mockDialogSequence = [];
let mockDialogCallIndex = 0;

global.Dialog = class MockDialog {
  constructor(config, options) {
    this.config = config;
    this.options = options;

    // Auto-resolve the dialog asynchronously to simulate user interaction
    setTimeout(() => {
      const result = mockDialogSequence[mockDialogCallIndex] || null;
      mockDialogCallIndex++;

      // Simulate card click or cancel
      if (result !== null && result !== undefined) {
        // Find the card click handler in the render callback and simulate it
        const mockCards = [];
        const mockHtml = [{
          querySelectorAll: () => mockCards
        }];

        if (this.config.render) {
          // Create a mock card element
          const mockCard = {
            getAttribute: (attr) => "0", // First card
            addEventListener: (event, handler) => {
              // Immediately trigger the click handler with our result
              setTimeout(() => handler(), 0);
            }
          };
          mockCards.push(mockCard);
          this.config.render(mockHtml);
        }
      } else {
        // User cancelled
        if (this.config.close) {
          this.config.close();
        }
      }
    }, 0);
  }

  render(force) {
    // Render is called by card-selection-dialog, but we handle it in constructor
  }

  close() {
    // Close might be called, just no-op
  }
};

// Mock ui.notifications
global.ui = {
  notifications: {
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
};

describe("Weapon Usage Hook - Detection", () => {
  test("should intercept aether weapons", () => {
    const weapon = {
      getFlag: (scope, key) => {
        if (scope === "elysium" && key === "isAetherWeapon") return true;
        return undefined;
      },
    };

    expect(shouldInterceptWeapon(weapon)).toBe(true);
  });

  test("should NOT intercept regular weapons", () => {
    const weapon = {
      getFlag: () => undefined,
    };

    expect(shouldInterceptWeapon(weapon)).toBe(false);
  });

  test("should NOT intercept locked weapons", () => {
    const weapon = {
      getFlag: (scope, key) => {
        if (scope === "elysium" && key === "isAetherWeapon") return true;
        if (scope === "elysium" && key === "isLocked") return true;
        return undefined;
      },
    };

    expect(shouldInterceptWeapon(weapon)).toBe(false);
  });

  test("should handle null weapon", () => {
    expect(shouldInterceptWeapon(null)).toBe(false);
  });
});

describe("Weapon Usage Hook - Show Dialog", () => {
  test("should show overpower prompt and return choice", async () => {
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

    // Mock dialog to return "normal"
    global.Dialog.wait = jest.fn(async () => "normal");

    const choice = await showOverpowerPrompt(weapon, actor);

    expect(global.Dialog.wait).toHaveBeenCalled();
    expect(choice).toBe("normal");
  });

  test("should return null when dialog cancelled", async () => {
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

    // Mock dialog to return null (cancelled)
    global.Dialog.wait = jest.fn(async () => null);

    const choice = await showOverpowerPrompt(weapon, actor);

    expect(choice).toBeNull();
  });

  test("should return overpower when chosen", async () => {
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

    // Mock dialog to return "overpower"
    global.Dialog.wait = jest.fn(async () => "overpower");

    const choice = await showOverpowerPrompt(weapon, actor);

    expect(choice).toBe("overpower");
  });
});

describe("Weapon Usage Hook - Handle Normal Fire", () => {
  test("should store normal mode on weapon", async () => {
    const weapon = {
      name: "The Elysium Defender",
      setFlag: jest.fn(),
    };

    const actor = {
      name: "Test Character",
    };

    await handleNormalFire(weapon, actor);

    expect(weapon.setFlag).toHaveBeenCalledWith(
      "elysium",
      "currentFireMode",
      "normal"
    );
  });

  test("should return continue true", async () => {
    const weapon = {
      name: "The Elysium Defender",
      setFlag: jest.fn(),
    };

    const actor = {
      name: "Test Character",
    };

    const result = await handleNormalFire(weapon, actor);

    expect(result.continue).toBe(true);
    expect(result.mode).toBe("normal");
  });

  test("should NOT modify actor flags", async () => {
    const weapon = {
      name: "The Elysium Defender",
      setFlag: jest.fn(),
    };

    const actor = {
      name: "Test Character",
      setFlag: jest.fn(),
    };

    await handleNormalFire(weapon, actor);

    // Should NOT set daily doses or ATL
    expect(actor.setFlag).not.toHaveBeenCalled();
  });
});

describe("Weapon Usage Hook - Check Fuel for Overpower", () => {
  beforeEach(() => {
    // Clear mock calls
    jest.clearAllMocks();
  });

  test("should return false when no aether fuel available", () => {
    const actor = {
      items: [], // No fuel
    };

    const result = checkFuelForOverpower(actor);

    expect(result).toBe(false);
  });

  test("should show warning when no fuel available", () => {
    const actor = {
      items: [],
    };

    checkFuelForOverpower(actor);

    expect(ui.notifications.warn).toHaveBeenCalled();
    expect(ui.notifications.warn).toHaveBeenCalledWith(
      expect.stringContaining("aether fuel")
    );
  });

  test("should return true when aether fuel exists", () => {
    const actor = {
      items: [
        {
          name: "Basic Refined Aether",
          system: { uses: { value: 3, max: 5 } },
          getFlag: (scope, key) => {
            if (scope === "elysium" && key === "isAetherFuel") return true;
            return undefined;
          },
        },
      ],
    };

    const result = checkFuelForOverpower(actor);

    expect(result).toBe(true);
  });

  test("should NOT show warning when fuel exists", () => {
    const actor = {
      items: [
        {
          name: "Basic Refined Aether",
          system: { uses: { value: 3, max: 5 } },
          getFlag: (scope, key) => {
            if (scope === "elysium" && key === "isAetherFuel") return true;
            return undefined;
          },
        },
      ],
    };

    checkFuelForOverpower(actor);

    expect(ui.notifications.warn).not.toHaveBeenCalled();
  });
});

describe("Weapon Usage Hook - Main Orchestrator", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should handle normal fire path end-to-end", async () => {
    const weapon = {
      name: "The Elysium Defender",
      getFlag: (scope, key) => {
        if (scope === "elysium" && key === "isAetherWeapon") return true;
        if (scope === "elysium" && key === "normalDamage") return "2d6";
        if (scope === "elysium" && key === "overpowerDamage") return "4d6";
        if (scope === "elysium" && key === "ammoType") return "revolver";
        return undefined;
      },
      setFlag: jest.fn(),
    };

    const mockAmmo = {
      name: "Mock Ammo",
      type: "consumable",
      system: { type: { value: "ammo" }, quantity: 10 },
      getFlag: (scope, key) => {
        if (scope === "elysium" && key === "roundType") return "revolver";
        return null;
      },
      update: jest.fn().mockResolvedValue(true),
    };

    const actor = {
      getFlag: () => 0,
      items: [mockAmmo], // actor.items should be an array
    };

    // Dialog sequence: overpower choice, then ammo selection
    let dialogCallCount = 0;
    global.Dialog.wait = jest.fn(async () => {
      dialogCallCount++;
      if (dialogCallCount === 1) return "normal"; // Overpower choice
      if (dialogCallCount === 2) return mockAmmo; // Ammo selection
      return null;
    });

    const result = await handleAetherWeaponUsage(weapon, actor);

    expect(result.continue).toBe(true);
    expect(result.mode).toBe("normal");
    expect(weapon.setFlag).toHaveBeenCalledWith(
      "elysium",
      "currentFireMode",
      "normal"
    );
  });

  test("should cancel when dialog cancelled", async () => {
    const weapon = {
      name: "The Elysium Defender",
      getFlag: (scope, key) => {
        if (scope === "elysium" && key === "isAetherWeapon") return true;
        if (scope === "elysium" && key === "normalDamage") return "2d6";
        if (scope === "elysium" && key === "overpowerDamage") return "4d6";
        return undefined;
      },
    };

    const actor = {
      getFlag: () => 0,
      items: {
        filter: jest.fn(() => [{ name: "Mock Ammo", system: { quantity: 10 } }]),
      },
    };

    global.Dialog.wait = jest.fn(async () => null);

    const result = await handleAetherWeaponUsage(weapon, actor);

    expect(result.cancelled).toBe(true);
    expect(result.continue).toBe(false);
  });

  test("should cancel when no fuel for overpower", async () => {
    const weapon = {
      name: "The Elysium Defender",
      getFlag: (scope, key) => {
        if (scope === "elysium" && key === "isAetherWeapon") return true;
        if (scope === "elysium" && key === "normalDamage") return "2d6";
        if (scope === "elysium" && key === "overpowerDamage") return "4d6";
        if (scope === "elysium" && key === "ammoType") return "revolver";
        return undefined;
      },
    };

    const mockAmmo = {
      name: "Mock Ammo",
      type: "consumable",
      system: { type: { value: "ammo" }, quantity: 10 },
      getFlag: (scope, key) => {
        if (scope === "elysium" && key === "roundType") return "revolver";
        return null;
      },
      update: jest.fn().mockResolvedValue(true),
    };

    const actor = {
      getFlag: () => 0,
      items: [mockAmmo], // Only ammo, no fuel
    };

    // Dialog sequence: overpower choice, ammo selection, then fuel check fails
    let dialogCallCount = 0;
    global.Dialog.wait = jest.fn(async () => {
      dialogCallCount++;
      if (dialogCallCount === 1) return "overpower"; // Overpower choice
      if (dialogCallCount === 2) return mockAmmo; // Ammo selection
      return null;
    });

    const result = await handleAetherWeaponUsage(weapon, actor);

    expect(result.cancelled).toBe(true);
    expect(result.reason).toBe("no-fuel");
    expect(ui.notifications.warn).toHaveBeenCalled();
  });

  test("should execute overclock when overpower chosen with fuel", async () => {
    const weapon = {
      name: "The Elysium Defender",
      getFlag: (scope, key) => {
        if (scope === "elysium" && key === "isAetherWeapon") return true;
        if (scope === "elysium" && key === "normalDamage") return "2d6";
        if (scope === "elysium" && key === "overpowerDamage") return "4d6";
        if (scope === "elysium" && key === "ammoType") return "revolver";
        return undefined;
      },
      setFlag: jest.fn(),
    };

    const mockAmmo = {
      name: "Mock Ammo",
      type: "consumable",
      system: { type: { value: "ammo" }, quantity: 10 },
      getFlag: (scope, key) => {
        if (scope === "elysium" && key === "roundType") return "revolver";
        return null;
      },
      update: jest.fn().mockResolvedValue(true),
    };

    const aetherFuel = {
      name: "Basic Refined Aether",
      system: { uses: { value: 3, max: 5 } },
      getFlag: (scope, key) => {
        if (scope === "elysium" && key === "isAetherFuel") return true;
        return undefined;
      },
      update: jest.fn(),
      delete: jest.fn(),
    };

    const actor = {
      name: "Test Character",
      getFlag: (scope, key) => {
        if (scope === "elysium" && key === "dailyDoses") return 0;
        if (scope === "elysium" && key === "atl") return 0;
        return 0;
      },
      setFlag: jest.fn(),
      toggleStatusEffect: jest.fn(),
      update: jest.fn(),
      rollSavingThrow: jest.fn(async () => ({ total: 15 })),
      system: {
        attributes: { exhaustion: 0 },
      },
      items: [mockAmmo, aetherFuel], // Both ammo and fuel available
    };

    // Mock dialog sequence: overpower, ammo selection, then fuel selection
    let callCount = 0;
    global.Dialog.wait = jest.fn(async () => {
      callCount++;
      if (callCount === 1) return "overpower"; // Overpower choice
      if (callCount === 2) return mockAmmo; // Ammo selection
      if (callCount === 3) return aetherFuel; // Fuel selection
      return null;
    });

    const result = await handleAetherWeaponUsage(weapon, actor);

    expect(result.continue).toBe(true);
    expect(result.mode).toBe("overpower");
    expect(actor.setFlag).toHaveBeenCalledWith("elysium", "dailyDoses", 1);
    expect(actor.setFlag).toHaveBeenCalledWith("elysium", "atl", 1);
  });

  test("should block locked weapon", async () => {
    const weapon = {
      name: "The Elysium Defender",
      getFlag: (scope, key) => {
        if (scope === "elysium" && key === "isAetherWeapon") return true;
        if (scope === "elysium" && key === "isLocked") return true;
        return undefined;
      },
    };

    const actor = {
      getFlag: () => 0,
    };

    const result = await handleAetherWeaponUsage(weapon, actor);

    expect(result.cancelled).toBe(true);
    expect(result.reason).toBe("weapon-locked");
    expect(ui.notifications.warn).toHaveBeenCalled();
  });

  describe("Activity Selection", () => {
    test("should set activity to 'attack' when normal fire is selected", async () => {
      // Arrange
      const mockAmmo = {
        id: "ammo1",
        name: "Standard Round",
        img: "icons/ammo.png",
        system: { quantity: 10 },
        getFlag: (scope, key) => {
          if (scope === "elysium" && key === "ammoType") return "standard";
          return undefined;
        },
        update: jest.fn(),
      };

      const weapon = {
        name: "The Elysium Defender",
        getFlag: jest.fn((scope, key) => {
          if (scope === "elysium" && key === "isAetherWeapon") return true;
          if (scope === "elysium" && key === "isLocked") return false;
          if (scope === "elysium" && key === "normalDamage") return "2d6";
          if (scope === "elysium" && key === "overpowerDamage") return "4d6";
          return undefined;
        }),
        setFlag: jest.fn(),
        img: "icons/weapon.png",
      };

      const actor = {
        getFlag: () => 0,
        items: [mockAmmo],
      };

      // Mock dialogs - user selects "normal" fire
      global.Dialog.wait = jest
        .fn()
        .mockResolvedValueOnce({ id: "normal" }) // Fire mode selection
        .mockResolvedValueOnce(mockAmmo); // Ammo selection

      // Act
      const result = await handleAetherWeaponUsage(weapon, actor);

      // Assert
      expect(result.continue).toBe(true);
      expect(result.mode).toBe("normal");
      expect(result.selectedActivity).toBe("attack");
      expect(weapon.setFlag).toHaveBeenCalledWith(
        "elysium",
        "currentFireMode",
        "normal"
      );
      expect(weapon.setFlag).toHaveBeenCalledWith(
        "elysium",
        "selectedActivity",
        "attack"
      );
    });

    test("should set activity to 'overload' when overpower is selected", async () => {
      // Arrange
      const mockAmmo = {
        id: "ammo1",
        name: "Standard Round",
        img: "icons/ammo.png",
        system: { quantity: 10 },
        getFlag: (scope, key) => {
          if (scope === "elysium" && key === "ammoType") return "standard";
          return undefined;
        },
        update: jest.fn(),
      };

      const mockFuel = {
        id: "fuel1",
        name: "Unrefined Aether",
        system: { uses: { value: 5 } },
        update: jest.fn(),
        getFlag: () => "unrefined",
      };

      const weapon = {
        name: "The Elysium Defender",
        getFlag: jest.fn((scope, key) => {
          if (scope === "elysium" && key === "isAetherWeapon") return true;
          if (scope === "elysium" && key === "isLocked") return false;
          if (scope === "elysium" && key === "normalDamage") return "2d6";
          if (scope === "elysium" && key === "overpowerDamage") return "4d6";
          return undefined;
        }),
        setFlag: jest.fn(),
        img: "icons/weapon.png",
      };

      const actor = {
        getFlag: () => 0,
        setFlag: jest.fn(),
        items: [mockAmmo, mockFuel],
      };

      // Mock dialogs - user selects "overpower"
      global.Dialog.wait = jest
        .fn()
        .mockResolvedValueOnce({ id: "overpower" }) // Fire mode selection
        .mockResolvedValueOnce(mockAmmo) // Ammo selection
        .mockResolvedValueOnce(mockFuel); // Fuel selection

      // Mock CON save roll
      global.actor = {
        rollSavingThrow: jest.fn().mockResolvedValue([
          {
            total: 15,
            options: { targetValue: 12 },
          },
        ]),
      };

      // Act
      const result = await handleAetherWeaponUsage(weapon, actor);

      // Assert
      expect(result.continue).toBe(true);
      expect(result.mode).toBe("overpower");
      expect(result.selectedActivity).toBe("overload");
      expect(weapon.setFlag).toHaveBeenCalledWith(
        "elysium",
        "currentFireMode",
        "overpower"
      );
      expect(weapon.setFlag).toHaveBeenCalledWith(
        "elysium",
        "selectedActivity",
        "overload"
      );
    });
  });
});
