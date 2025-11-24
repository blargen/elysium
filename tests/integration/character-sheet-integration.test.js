/**
 * Integration Tests for Character Sheet Customization
 *
 * Testing the full flow from hook to display
 */

import { describe, test, expect, beforeEach, jest } from "@jest/globals";
import { injectToxicityDisplay } from "../../scripts/ui/character-sheet.js";

describe("Character Sheet Integration", () => {
  let mockActor;
  let mockSheet;
  let mockHTML;

  beforeEach(() => {
    mockActor = {
      flags: {},
      getFlag: function (scope, key) {
        return this.flags[scope]?.[key];
      },
      setFlag: jest.fn(async function (scope, key, value) {
        if (!this.flags[scope]) this.flags[scope] = {};
        this.flags[scope][key] = value;
        return this;
      }),
    };

    mockHTML = {
      injected: null,
      header: {
        insertAdjacentHTML: function (position, html) {
          mockHTML.injected = { html };
        },
      },
      querySelector: function (selector) {
        if (selector === "header.sheet-header .sheet-header-buttons") {
          return this.header;
        }
        if (selector === ".elysium-toxicity-display") {
          return this.injected
            ? {
                remove: () => {
                  this.injected = null;
                },
              }
            : null;
        }
        return null;
      },
    };

    mockSheet = {
      constructor: { name: "ActorSheetV2" },
      actor: mockActor,
    };
  });

  test("full workflow: no toxicity -> display shows 0/0", () => {
    injectToxicityDisplay(mockSheet, mockHTML);

    // Should always show display, even with 0 values
    expect(mockHTML.injected).not.toBeNull();
    expect(mockHTML.injected.html).toContain("0");
    expect(mockHTML.injected.html).toContain("Daily Doses");
    expect(mockHTML.injected.html).toContain("ATL");
  });

  test("full workflow: set toxicity -> display appears", async () => {
    // Set toxicity flags
    await mockActor.setFlag("elysium", "dailyDoses", 2);
    await mockActor.setFlag("elysium", "atl", 1);

    injectToxicityDisplay(mockSheet, mockHTML);

    expect(mockHTML.injected).not.toBeNull();
    expect(mockHTML.injected.html).toContain("2");
    expect(mockHTML.injected.html).toContain("1");
    expect(mockHTML.injected.html).toContain("Daily Doses");
    expect(mockHTML.injected.html).toContain("ATL");
  });

  test("full workflow: high ATL -> warning styling", async () => {
    // Set high toxicity
    await mockActor.setFlag("elysium", "dailyDoses", 5);
    await mockActor.setFlag("elysium", "atl", 4);

    injectToxicityDisplay(mockSheet, mockHTML);

    expect(mockHTML.injected).not.toBeNull();
    expect(mockHTML.injected.html).toContain("elysium-toxicity-warning");
  });

  test("full workflow: ATL exactly 3 -> warning styling", async () => {
    await mockActor.setFlag("elysium", "dailyDoses", 3);
    await mockActor.setFlag("elysium", "atl", 3);

    injectToxicityDisplay(mockSheet, mockHTML);

    expect(mockHTML.injected.html).toContain("elysium-toxicity-warning");
  });

  test("full workflow: ATL is 2 -> no warning styling", async () => {
    await mockActor.setFlag("elysium", "dailyDoses", 2);
    await mockActor.setFlag("elysium", "atl", 2);

    injectToxicityDisplay(mockSheet, mockHTML);

    expect(mockHTML.injected.html).not.toContain("elysium-toxicity-warning");
  });

  test("full workflow: reset toxicity -> display shows 0/0 on re-render", async () => {
    // Initial state with toxicity
    await mockActor.setFlag("elysium", "dailyDoses", 2);
    await mockActor.setFlag("elysium", "atl", 1);
    injectToxicityDisplay(mockSheet, mockHTML);
    expect(mockHTML.injected).not.toBeNull();

    // Reset toxicity
    await mockActor.setFlag("elysium", "dailyDoses", 0);
    await mockActor.setFlag("elysium", "atl", 0);

    // Clear the injected mock to simulate removal
    mockHTML.injected = null;

    // Re-render (should still inject, showing 0/0)
    injectToxicityDisplay(mockSheet, mockHTML);
    expect(mockHTML.injected).not.toBeNull();
    expect(mockHTML.injected.html).toContain("0");
  });

  test("full workflow: NPC sheet with toxicity -> no display", async () => {
    mockSheet.constructor.name = "ActorSheet5eNPC";

    await mockActor.setFlag("elysium", "dailyDoses", 3);
    await mockActor.setFlag("elysium", "atl", 2);

    injectToxicityDisplay(mockSheet, mockHTML);

    expect(mockHTML.injected).toBeNull();
  });

  test("full workflow: vehicle sheet with toxicity -> no display", async () => {
    mockSheet.constructor.name = "ActorSheet5eVehicle";

    await mockActor.setFlag("elysium", "dailyDoses", 1);
    await mockActor.setFlag("elysium", "atl", 1);

    injectToxicityDisplay(mockSheet, mockHTML);

    expect(mockHTML.injected).toBeNull();
  });

  test("full workflow: only dailyDoses set -> display appears", async () => {
    await mockActor.setFlag("elysium", "dailyDoses", 3);
    await mockActor.setFlag("elysium", "atl", 0);

    injectToxicityDisplay(mockSheet, mockHTML);

    expect(mockHTML.injected).not.toBeNull();
    expect(mockHTML.injected.html).toContain("3");
    expect(mockHTML.injected.html).toContain("0");
  });

  test("full workflow: only ATL set -> display appears", async () => {
    await mockActor.setFlag("elysium", "dailyDoses", 0);
    await mockActor.setFlag("elysium", "atl", 2);

    injectToxicityDisplay(mockSheet, mockHTML);

    expect(mockHTML.injected).not.toBeNull();
    expect(mockHTML.injected.html).toContain("0");
    expect(mockHTML.injected.html).toContain("2");
  });

  test("full workflow: re-render with same data -> removes old, injects new", async () => {
    await mockActor.setFlag("elysium", "dailyDoses", 2);
    await mockActor.setFlag("elysium", "atl", 1);

    // First render
    injectToxicityDisplay(mockSheet, mockHTML);
    const firstHTML = mockHTML.injected.html;
    expect(firstHTML).toContain("elysium-toxicity-display");

    // Simulate existing display for re-render
    const mockRemove = jest.fn();
    const mockExisting = { remove: mockRemove };

    // Update the querySelector method to return the existing display
    const originalQuerySelector = mockHTML.querySelector;
    mockHTML.querySelector = function (selector) {
      if (selector === ".elysium-toxicity-display") {
        return mockExisting;
      }
      return originalQuerySelector.call(this, selector);
    };

    // Second render
    injectToxicityDisplay(mockSheet, mockHTML);

    // Should have called remove
    expect(mockRemove).toHaveBeenCalled();

    // Should have injected new HTML
    expect(mockHTML.injected).not.toBeNull();
    expect(mockHTML.injected.html).toContain("elysium-toxicity-display");
  });

  test("full workflow: increment toxicity -> display updates", async () => {
    // Initial toxicity
    await mockActor.setFlag("elysium", "dailyDoses", 1);
    await mockActor.setFlag("elysium", "atl", 0);

    injectToxicityDisplay(mockSheet, mockHTML);
    expect(mockHTML.injected.html).toContain("1");
    expect(mockHTML.injected.html).not.toContain("elysium-toxicity-warning");

    // Increment toxicity
    await mockActor.setFlag("elysium", "dailyDoses", 4);
    await mockActor.setFlag("elysium", "atl", 3);

    // Simulate re-render
    mockHTML.injected = { remove: jest.fn() };
    injectToxicityDisplay(mockSheet, mockHTML);

    expect(mockHTML.injected.html).toContain("4");
    expect(mockHTML.injected.html).toContain("3");
    expect(mockHTML.injected.html).toContain("elysium-toxicity-warning");
  });

  test("full workflow: missing header element -> handles gracefully", async () => {
    await mockActor.setFlag("elysium", "dailyDoses", 2);
    await mockActor.setFlag("elysium", "atl", 1);

    // Remove header
    mockHTML.header = null;
    mockHTML.querySelector = function (selector) {
      return null;
    };

    // Should not throw
    expect(() => {
      injectToxicityDisplay(mockSheet, mockHTML);
    }).not.toThrow();

    // Should not inject
    expect(mockHTML.injected).toBeNull();
  });
});
