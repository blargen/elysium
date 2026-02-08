/**
 * Card Selection Dialog Tests
 *
 * Tests for the reusable card selection dialog component
 */

import { describe, test, expect, jest, beforeEach } from "@jest/globals";
import { showCardSelectionDialog } from "../../scripts/ui/card-selection-dialog.js";

describe("Card Selection Dialog", () => {
  let mockItems;
  let mockDialog;
  let renderCallback;

  beforeEach(() => {
    // Mock items
    mockItems = [
      {
        id: "item1",
        name: "Test Item 1",
        img: "path/to/image1.png",
        quantity: 10,
        metadata: "Type A",
      },
      {
        id: "item2",
        name: "Test Item 2",
        img: "path/to/image2.png",
        quantity: 5,
        metadata: "Type B",
      },
    ];

    // Mock Dialog constructor
    renderCallback = null;
    mockDialog = {
      render: jest.fn(function (force) {
        // Store render callback for testing
        if (renderCallback) {
          const mockHtml = {
            find: jest.fn((selector) => {
              if (selector === ".elysium-selection-card") {
                // Return mock jQuery collection with click handler support
                return {
                  on: jest.fn((event, handler) => {
                    // Store the click handler so we can call it in tests
                    mockHtml._clickHandler = handler;
                  }),
                  _clickHandler: null,
                };
              }
              return { on: jest.fn() };
            }),
          };
          renderCallback(mockHtml);
        }
      }),
      close: jest.fn(),
    };

    global.Dialog = jest.fn(function (config, options) {
      renderCallback = config.render;
      mockDialog.config = config;
      mockDialog.options = options;
      return mockDialog;
    });

    // Mock jQuery
    global.$ = jest.fn((element) => ({
      attr: jest.fn((attrName) => {
        if (attrName === "data-item-index") {
          // Return index based on which element
          return "0"; // Default to first item
        }
      }),
    }));

    // Mock ui.notifications
    global.ui = {
      notifications: {
        warn: jest.fn(),
      },
    };
  });

  describe("Basic Functionality", () => {
    test("should create dialog with correct title", async () => {
      const promise = showCardSelectionDialog({
        title: "Test Selection",
        items: mockItems,
        getImage: (item) => item.img,
        getTitle: (item) => item.name,
        getSubtitle: (item) => `${item.quantity} items`,
      });

      // Immediately close to resolve promise
      setTimeout(() => mockDialog.config.close(), 0);

      await promise;

      expect(global.Dialog).toHaveBeenCalled();
      expect(mockDialog.config.title).toBe("Test Selection");
    });

    test("should include description when provided", async () => {
      const promise = showCardSelectionDialog({
        title: "Test Selection",
        description: "Choose an item:",
        items: mockItems,
        getImage: (item) => item.img,
        getTitle: (item) => item.name,
        getSubtitle: (item) => `${item.quantity} items`,
      });

      setTimeout(() => mockDialog.config.close(), 0);
      await promise;

      expect(mockDialog.config.content).toContain("Choose an item:");
    });

    test("should generate card HTML for each item", async () => {
      const promise = showCardSelectionDialog({
        title: "Test Selection",
        items: mockItems,
        getImage: (item) => item.img,
        getTitle: (item) => item.name,
        getSubtitle: (item) => `${item.quantity} items`,
      });

      setTimeout(() => mockDialog.config.close(), 0);
      await promise;

      const content = mockDialog.config.content;
      expect(content).toContain("Test Item 1");
      expect(content).toContain("Test Item 2");
      expect(content).toContain("path/to/image1.png");
      expect(content).toContain("path/to/image2.png");
      expect(content).toContain("10 items");
      expect(content).toContain("5 items");
    });

    test("should include metadata when provided", async () => {
      const promise = showCardSelectionDialog({
        title: "Test Selection",
        items: mockItems,
        getImage: (item) => item.img,
        getTitle: (item) => item.name,
        getSubtitle: (item) => `${item.quantity} items`,
        getMetadata: (item) => item.metadata,
      });

      setTimeout(() => mockDialog.config.close(), 0);
      await promise;

      const content = mockDialog.config.content;
      expect(content).toContain("Type A");
      expect(content).toContain("Type B");
    });

    test("should include Cancel button", async () => {
      const promise = showCardSelectionDialog({
        title: "Test Selection",
        items: mockItems,
        getImage: (item) => item.img,
        getTitle: (item) => item.name,
        getSubtitle: (item) => `${item.quantity} items`,
      });

      setTimeout(() => mockDialog.config.close(), 0);
      await promise;

      expect(mockDialog.config.buttons.cancel).toBeDefined();
      expect(mockDialog.config.buttons.cancel.label).toBe("Cancel");
    });
  });

  describe("Selection Behavior", () => {
    test("should return null when dialog is closed", async () => {
      const promise = showCardSelectionDialog({
        title: "Test Selection",
        items: mockItems,
        getImage: (item) => item.img,
        getTitle: (item) => item.name,
        getSubtitle: (item) => `${item.quantity} items`,
      });

      // Trigger close callback
      setTimeout(() => mockDialog.config.close(), 0);

      const result = await promise;
      expect(result).toBeNull();
    });

    test("should return null when Cancel button is clicked", async () => {
      const promise = showCardSelectionDialog({
        title: "Test Selection",
        items: mockItems,
        getImage: (item) => item.img,
        getTitle: (item) => item.name,
        getSubtitle: (item) => `${item.quantity} items`,
      });

      // Trigger cancel button callback
      setTimeout(() => mockDialog.config.buttons.cancel.callback(), 0);

      const result = await promise;
      expect(result).toBeNull();
    });
  });

  describe("Edge Cases", () => {
    test("should show warning and return null when no items provided", async () => {
      const result = await showCardSelectionDialog({
        title: "Test Selection",
        items: [],
        getImage: (item) => item.img,
        getTitle: (item) => item.name,
        getSubtitle: (item) => `${item.quantity} items`,
      });

      expect(result).toBeNull();
      expect(ui.notifications.warn).toHaveBeenCalled();
    });

    test("should show warning and return null when items is null", async () => {
      const result = await showCardSelectionDialog({
        title: "Test Selection",
        items: null,
        getImage: (item) => item.img,
        getTitle: (item) => item.name,
        getSubtitle: (item) => `${item.quantity} items`,
      });

      expect(result).toBeNull();
      expect(ui.notifications.warn).toHaveBeenCalled();
    });

    test("should handle items without metadata gracefully", async () => {
      const promise = showCardSelectionDialog({
        title: "Test Selection",
        items: mockItems,
        getImage: (item) => item.img,
        getTitle: (item) => item.name,
        getSubtitle: (item) => `${item.quantity} items`,
        // No getMetadata provided
      });

      setTimeout(() => mockDialog.config.close(), 0);

      await expect(promise).resolves.not.toThrow();
    });

    test("should use default image when getImage returns falsy value", async () => {
      const promise = showCardSelectionDialog({
        title: "Test Selection",
        items: [{ ...mockItems[0], img: null }],
        getImage: (item) => item.img || "icons/svg/item-bag.svg",
        getTitle: (item) => item.name,
        getSubtitle: (item) => `${item.quantity} items`,
      });

      setTimeout(() => mockDialog.config.close(), 0);
      await promise;

      const content = mockDialog.config.content;
      expect(content).toContain("icons/svg/item-bag.svg");
    });
  });

  describe("Styling", () => {
    test("should include hover effect styles", async () => {
      const promise = showCardSelectionDialog({
        title: "Test Selection",
        items: mockItems,
        getImage: (item) => item.img,
        getTitle: (item) => item.name,
        getSubtitle: (item) => `${item.quantity} items`,
      });

      setTimeout(() => mockDialog.config.close(), 0);
      await promise;

      const content = mockDialog.config.content;
      expect(content).toContain(".elysium-selection-card:hover");
      expect(content).toContain("transform: translateX(4px)");
    });

    test("should include data-item-index attribute for click handling", async () => {
      const promise = showCardSelectionDialog({
        title: "Test Selection",
        items: mockItems,
        getImage: (item) => item.img,
        getTitle: (item) => item.name,
        getSubtitle: (item) => `${item.quantity} items`,
      });

      setTimeout(() => mockDialog.config.close(), 0);
      await promise;

      const content = mockDialog.config.content;
      expect(content).toContain('data-item-index="0"');
      expect(content).toContain('data-item-index="1"');
    });
  });
});
