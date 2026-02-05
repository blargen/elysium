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

// Mock Dialog
global.Dialog = class MockDialog {
  static async wait(config) {
    return "normal"; // Default choice
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
        return undefined;
      },
      setFlag: jest.fn(),
    };

    const actor = {
      getFlag: () => 0,
    };

    global.Dialog.wait = jest.fn(async () => "normal");

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
        return undefined;
      },
    };

    const actor = {
      getFlag: () => 0,
      items: [], // No fuel
    };

    global.Dialog.wait = jest.fn(async () => "overpower");

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
        return undefined;
      },
      setFlag: jest.fn(),
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
      items: [aetherFuel],
    };

    // Mock dialog sequence: overpower, then select fuel
    let callCount = 0;
    global.Dialog.wait = jest.fn(async () => {
      callCount++;
      if (callCount === 1) return "overpower";
      if (callCount === 2) return aetherFuel;
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
});
