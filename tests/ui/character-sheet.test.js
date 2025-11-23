/**
 * Tests for Character Sheet UI Injection
 *
 * Testing HTML generation and data extraction for character sheet display
 */

import { describe, test, expect, beforeEach, jest } from "@jest/globals";
import {
  generateToxicityHTML,
  extractSheetHeaderElement,
  shouldInjectToxicityDisplay,
  getToxicityDisplayData,
  injectToxicityDisplay,
} from "../../scripts/ui/character-sheet.js";

describe("Character Sheet UI - HTML Generation", () => {
  describe("getToxicityDisplayData", () => {
    test("returns correct data structure with no toxicity", () => {
      const mockActor = {
        flags: {},
      };

      const data = getToxicityDisplayData(mockActor);

      expect(data).toEqual({
        dailyDoses: 0,
        atl: 0,
        hasToxicity: true, // Always show
      });
    });

    test("returns correct data with active toxicity", () => {
      const mockActor = {
        flags: {
          elysium: {
            dailyDoses: 3,
            atl: 2,
          },
        },
      };

      const data = getToxicityDisplayData(mockActor);

      expect(data).toEqual({
        dailyDoses: 3,
        atl: 2,
        hasToxicity: true,
      });
    });

    test("hasToxicity is always true (always show display)", () => {
      const mockActor = {
        flags: {
          elysium: {
            dailyDoses: 0,
            atl: 0,
          },
        },
      };

      const data = getToxicityDisplayData(mockActor);

      expect(data.hasToxicity).toBe(true);
    });

    test("hasToxicity is true when ATL > 0", () => {
      const mockActor = {
        flags: {
          elysium: {
            dailyDoses: 0,
            atl: 1,
          },
        },
      };

      const data = getToxicityDisplayData(mockActor);

      expect(data.hasToxicity).toBe(true);
    });

    test("hasToxicity is true when dailyDoses > 0", () => {
      const mockActor = {
        flags: {
          elysium: {
            dailyDoses: 1,
            atl: 0,
          },
        },
      };

      const data = getToxicityDisplayData(mockActor);

      expect(data.hasToxicity).toBe(true);
    });
  });

  describe("generateToxicityHTML", () => {
    test("generates HTML with correct classes", () => {
      const html = generateToxicityHTML(3, 2);

      expect(html).toContain("elysium-toxicity-display");
      expect(html).toContain("elysium-toxicity-stat");
    });

    test("includes daily doses value", () => {
      const html = generateToxicityHTML(3, 2);

      expect(html).toContain("3");
      expect(html).toContain("Daily Doses");
    });

    test("includes ATL value", () => {
      const html = generateToxicityHTML(3, 2);

      expect(html).toContain("2");
      expect(html).toContain("ATL");
    });

    test("handles zero values", () => {
      const html = generateToxicityHTML(0, 0);

      expect(html).toContain("0");
      expect(html).toBeTruthy();
    });

    test("applies warning class when ATL is high (>= 3)", () => {
      const html = generateToxicityHTML(5, 3);

      expect(html).toContain("elysium-toxicity-warning");
    });

    test("applies warning class when ATL is very high", () => {
      const html = generateToxicityHTML(7, 5);

      expect(html).toContain("elysium-toxicity-warning");
    });

    test("does not apply warning class when ATL is low", () => {
      const html = generateToxicityHTML(2, 1);

      expect(html).not.toContain("elysium-toxicity-warning");
    });

    test("does not apply warning class when ATL is 2", () => {
      const html = generateToxicityHTML(4, 2);

      expect(html).not.toContain("elysium-toxicity-warning");
    });
  });

  describe("shouldInjectToxicityDisplay", () => {
    test("returns true for ActorSheet5eCharacter", () => {
      const mockSheet = {
        constructor: {
          name: "ActorSheet5eCharacter",
        },
      };

      expect(shouldInjectToxicityDisplay(mockSheet)).toBe(true);
    });

    test("returns true for ActorSheetV2", () => {
      const mockSheet = {
        constructor: {
          name: "ActorSheetV2",
        },
      };

      expect(shouldInjectToxicityDisplay(mockSheet)).toBe(true);
    });

    test("returns true for character type actors", () => {
      const mockSheet = {
        constructor: {
          name: "SomeCustomSheet",
        },
        actor: {
          type: "character",
        },
      };

      expect(shouldInjectToxicityDisplay(mockSheet)).toBe(true);
    });

    test("returns false for ActorSheet5eNPC", () => {
      const mockSheet = {
        constructor: {
          name: "ActorSheet5eNPC",
        },
        actor: {
          type: "npc",
        },
      };

      expect(shouldInjectToxicityDisplay(mockSheet)).toBe(false);
    });

    test("returns false for ActorSheet5eVehicle", () => {
      const mockSheet = {
        constructor: {
          name: "ActorSheet5eVehicle",
        },
        actor: {
          type: "vehicle",
        },
      };

      expect(shouldInjectToxicityDisplay(mockSheet)).toBe(false);
    });

    test("returns false for other sheet types without character actor", () => {
      const mockSheet = {
        constructor: {
          name: "SomeOtherSheet",
        },
        actor: {
          type: "npc",
        },
      };

      expect(shouldInjectToxicityDisplay(mockSheet)).toBe(false);
    });
  });
});

describe("Character Sheet UI - DOM Manipulation", () => {
  let mockHTML;

  beforeEach(() => {
    // Create a minimal mock DOM structure (v2 style - native DOM)
    mockHTML = {
      element: null,
      querySelector: function (selector) {
        if (selector === "header.sheet-header .sheet-header-buttons") {
          return this.element;
        }
        return null;
      },
    };
  });

  describe("extractSheetHeaderElement", () => {
    test("finds header element when present", () => {
      mockHTML.element = { name: "header" };

      const result = extractSheetHeaderElement(mockHTML);

      expect(result).toEqual({ name: "header" });
    });

    test("returns null when header not found", () => {
      mockHTML.element = null;

      const result = extractSheetHeaderElement(mockHTML);

      expect(result).toBeNull();
    });
  });
});

describe("Character Sheet UI - Hook Handler", () => {
  let mockSheet;
  let mockHTML;
  let mockActor;

  beforeEach(() => {
    mockActor = {
      flags: {
        elysium: {
          dailyDoses: 2,
          atl: 1,
        },
      },
    };

    mockHTML = {
      header: null,
      injected: null,
      querySelector: function (selector) {
        if (selector === "header.sheet-header .sheet-header-buttons") {
          return this.header;
        }
        if (selector === ".elysium-toxicity-display") {
          return this.injected;
        }
        return null;
      },
    };

    // Mock native DOM element with insertAdjacentHTML method
    mockHTML.header = {
      insertAdjacentHTML: function (position, html) {
        mockHTML.injected = { html };
      },
    };

    mockSheet = {
      constructor: {
        name: "ActorSheetV2",
      },
      actor: mockActor,
    };
  });

  describe("injectToxicityDisplay", () => {
    test("injects HTML when toxicity is present", () => {
      injectToxicityDisplay(mockSheet, mockHTML);

      expect(mockHTML.injected).not.toBeNull();
      expect(mockHTML.injected.html).toContain("elysium-toxicity-display");
    });

    test("includes correct values in injected HTML", () => {
      injectToxicityDisplay(mockSheet, mockHTML);

      expect(mockHTML.injected.html).toContain("2");
      expect(mockHTML.injected.html).toContain("1");
    });

    test("injects even when no toxicity (both 0) - always show", () => {
      mockActor.flags.elysium = { dailyDoses: 0, atl: 0 };

      injectToxicityDisplay(mockSheet, mockHTML);

      expect(mockHTML.injected).not.toBeNull();
      expect(mockHTML.injected.html).toContain("0");
    });

    test("injects even when flags are undefined - always show", () => {
      mockActor.flags = {};

      injectToxicityDisplay(mockSheet, mockHTML);

      expect(mockHTML.injected).not.toBeNull();
      expect(mockHTML.injected.html).toContain("0");
    });

    test("does not inject for non-character sheets", () => {
      mockSheet.constructor.name = "ActorSheet5eNPC";

      injectToxicityDisplay(mockSheet, mockHTML);

      expect(mockHTML.injected).toBeNull();
    });

    test("handles missing header element gracefully", () => {
      mockHTML.header = null;

      // Should not throw
      expect(() => {
        injectToxicityDisplay(mockSheet, mockHTML);
      }).not.toThrow();

      expect(mockHTML.injected).toBeNull();
    });

    test("removes existing display before re-injecting", () => {
      // First injection
      injectToxicityDisplay(mockSheet, mockHTML);
      const firstHTML = mockHTML.injected.html;

      // Simulate existing display
      const mockRemove = jest.fn();
      mockHTML.injected = { remove: mockRemove };

      // Second injection (re-render)
      injectToxicityDisplay(mockSheet, mockHTML);

      expect(mockRemove).toHaveBeenCalled();
    });

    test("injects when dailyDoses > 0 even if ATL is 0", () => {
      mockActor.flags.elysium = { dailyDoses: 3, atl: 0 };

      injectToxicityDisplay(mockSheet, mockHTML);

      expect(mockHTML.injected).not.toBeNull();
    });

    test("injects when ATL > 0 even if dailyDoses is 0", () => {
      mockActor.flags.elysium = { dailyDoses: 0, atl: 2 };

      injectToxicityDisplay(mockSheet, mockHTML);

      expect(mockHTML.injected).not.toBeNull();
    });
  });
});
