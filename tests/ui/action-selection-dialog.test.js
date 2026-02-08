/**
 * Action Selection Dialog Component Tests
 *
 * Tests for the reusable action selection dialog with optional overpower toggle.
 */

// Track dialog instances for tests
let lastDialogInstance = null;

// Mock Foundry globals
global.Dialog = class Dialog {
  constructor(config) {
    this.config = config;
    lastDialogInstance = this;  // Track this instance
  }

  render() {
    // Simulate rendering by calling the render callback
    if (this.config.render) {
      // Create a minimal mock HTML object with jQuery-like methods
      const mockHtml = {
        find: (selector) => {
          const elements = [];

          // Mock action option elements
          if (selector === ".elysium-action-option") {
            return {
              click: (handler) => {
                // Store handler for test access
                mockHtml._actionClickHandler = handler;
              }
            };
          }

          // Mock overpower toggle checkbox
          if (selector === "#overpower-toggle") {
            return {
              is: (checkValue) => {
                return checkValue === ":checked" && mockHtml._overpowerChecked;
              },
              change: (handler) => {
                mockHtml._overpowerChangeHandler = handler;
              }
            };
          }

          // Mock overpower warning div
          if (selector === ".elysium-overpower-warning") {
            return {
              show: () => { mockHtml._warningVisible = true; },
              hide: () => { mockHtml._warningVisible = false; }
            };
          }

          return {
            find: () => ({ click: () => {} }),
            closest: () => ({ find: () => ({ click: () => {} }) })
          };
        },
        closest: (selector) => ({
          find: () => ({
            click: () => {}  // Mock close button click
          })
        }),
        _overpowerChecked: false,
        _warningVisible: false
      };

      this.config.render(mockHtml);
      this._mockHtml = mockHtml;
    }
    return this;
  }

  // Helper method for tests to simulate user actions
  _simulateActionClick(actionId, isOverpowerChecked = false) {
    if (this._mockHtml && this._mockHtml._actionClickHandler) {
      this._mockHtml._overpowerChecked = isOverpowerChecked;

      const mockEvent = {
        currentTarget: {
          dataset: { action: actionId }
        }
      };

      this._mockHtml._actionClickHandler(mockEvent);
    }
  }

  _simulateOverpowerToggle(checked) {
    if (this._mockHtml && this._mockHtml._overpowerChangeHandler) {
      this._mockHtml._overpowerChecked = checked;

      const mockEvent = {
        target: { checked }
      };

      this._mockHtml._overpowerChangeHandler(mockEvent);
    }
  }
};

// Import module dynamically
let showActionSelectionDialog;
beforeAll(async () => {
  const module = await import("../../scripts/ui/action-selection-dialog.js");
  showActionSelectionDialog = module.showActionSelectionDialog;
});

describe("Action Selection Dialog Component", () => {

  describe("Basic Functionality", () => {

    it("should return selected action when action card is clicked", async () => {
      const config = {
        title: "Test Dialog",
        actions: [
          { id: "action1", name: "Action 1", img: "icon1.png", description: "First action" },
          { id: "action2", name: "Action 2", img: "icon2.png", description: "Second action" }
        ]
      };

      // Start the dialog
      const resultPromise = showActionSelectionDialog(config);

      // Give it time to render
      await new Promise(resolve => setTimeout(resolve, 10));

      // Get the dialog instance
      const dialogInstance = lastDialogInstance;

      // Simulate clicking action1
      dialogInstance._simulateActionClick("action1");

      const result = await resultPromise;

      expect(result).toEqual({
        actionId: "action1",
        isOverpower: false
      });
    });

    it("should return null when dialog is cancelled", async () => {
      const config = {
        title: "Test Dialog",
        actions: [
          { id: "action1", name: "Action 1", img: "icon1.png", description: "First action" }
        ]
      };

      // Mock Dialog to immediately call cancel callback
      global.Dialog = class Dialog {
        constructor(config) {
          // Immediately call cancel callback
          if (config.buttons?.cancel?.callback) {
            setTimeout(() => config.buttons.cancel.callback(), 0);
          }
        }
        render() { return this; }
      };

      const result = await showActionSelectionDialog(config);

      expect(result).toBeNull();
    });

  });

  describe("Overpower Toggle", () => {

    beforeEach(() => {
      // Reset tracking
      lastDialogInstance = null;

      // Reset Dialog mock
      global.Dialog = class Dialog {
        constructor(config) {
          this.config = config;
          lastDialogInstance = this;  // Track instance
        }
        render() {
          if (this.config.render) {
            const mockHtml = {
              find: (selector) => {
                if (selector === ".elysium-action-option") {
                  return { click: (handler) => { mockHtml._actionClickHandler = handler; } };
                }
                if (selector === "#overpower-toggle") {
                  return {
                    is: (checkValue) => checkValue === ":checked" && mockHtml._overpowerChecked,
                    change: (handler) => { mockHtml._overpowerChangeHandler = handler; }
                  };
                }
                if (selector === ".elysium-overpower-warning") {
                  return {
                    show: () => { mockHtml._warningVisible = true; },
                    hide: () => { mockHtml._warningVisible = false; }
                  };
                }
                return { find: () => ({ click: () => {} }), closest: () => ({ find: () => ({ click: () => {} }) }) };
              },
              closest: () => ({ find: () => ({ click: () => {} }) }),
              _overpowerChecked: false,
              _warningVisible: false
            };
            this.config.render(mockHtml);
            this._mockHtml = mockHtml;
          }
          return this;
        }
        _simulateActionClick(actionId, isOverpowerChecked = false) {
          if (this._mockHtml && this._mockHtml._actionClickHandler) {
            this._mockHtml._overpowerChecked = isOverpowerChecked;
            const mockEvent = { currentTarget: { dataset: { action: actionId } } };
            this._mockHtml._actionClickHandler(mockEvent);
          }
        }
      };
    });

    it("should not show overpower section when not enabled", async () => {
      const config = {
        title: "Test Dialog",
        actions: [
          { id: "action1", name: "Action 1", img: "icon1.png", description: "First action" }
        ],
        overpower: {
          enabled: false
        }
      };

      const resultPromise = showActionSelectionDialog(config);
      await new Promise(resolve => setTimeout(resolve, 10));

      lastDialogInstance._simulateActionClick("action1", false);

      const result = await resultPromise;

      expect(result.isOverpower).toBe(false);
    });

    it("should return isOverpower=true when checkbox is checked", async () => {
      const config = {
        title: "Test Dialog",
        actions: [
          { id: "fire", name: "Fire", img: "fire.png", description: "Fire weapon" }
        ],
        overpower: {
          enabled: true,
          label: "Overpower Mode",
          description: "Warning: Increases toxicity!"
        }
      };

      const resultPromise = showActionSelectionDialog(config);
      await new Promise(resolve => setTimeout(resolve, 10));

      // Simulate clicking action with overpower checked
      lastDialogInstance._simulateActionClick("fire", true);

      const result = await resultPromise;

      expect(result).toEqual({
        actionId: "fire",
        isOverpower: true
      });
    });

    it("should return isOverpower=false when checkbox is unchecked", async () => {
      const config = {
        title: "Test Dialog",
        actions: [
          { id: "fire", name: "Fire", img: "fire.png", description: "Fire weapon" }
        ],
        overpower: {
          enabled: true,
          label: "Overpower Mode"
        }
      };

      const resultPromise = showActionSelectionDialog(config);
      await new Promise(resolve => setTimeout(resolve, 10));

      // Simulate clicking action with overpower unchecked
      lastDialogInstance._simulateActionClick("fire", false);

      const result = await resultPromise;

      expect(result).toEqual({
        actionId: "fire",
        isOverpower: false
      });
    });

  });

  describe("HTML Content Generation", () => {

    it("should include description text when provided", async () => {
      const config = {
        title: "Test Dialog",
        description: "Choose your action wisely!",
        actions: [
          { id: "action1", name: "Action 1", img: "icon1.png", description: "First action" }
        ]
      };

      global.Dialog = class Dialog {
        constructor(config) {
          expect(config.content).toContain("Choose your action wisely!");
        }
        render() { return this; }
      };

      showActionSelectionDialog(config);
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    it("should not include description paragraph when not provided", async () => {
      const config = {
        title: "Test Dialog",
        actions: [
          { id: "action1", name: "Action 1", img: "icon1.png", description: "First action" }
        ]
      };

      global.Dialog = class Dialog {
        constructor(config) {
          expect(config.content).not.toContain("<p class=\"elysium-dialog-text\">");
        }
        render() { return this; }
      };

      showActionSelectionDialog(config);
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    it("should generate action cards for all actions", async () => {
      const config = {
        title: "Test Dialog",
        actions: [
          { id: "action1", name: "Action 1", img: "icon1.png", description: "First action" },
          { id: "action2", name: "Action 2", img: "icon2.png", description: "Second action" },
          { id: "action3", name: "Action 3", img: "icon3.png", description: "Third action" }
        ]
      };

      global.Dialog = class Dialog {
        constructor(config) {
          expect(config.content).toContain('data-action="action1"');
          expect(config.content).toContain('data-action="action2"');
          expect(config.content).toContain('data-action="action3"');
          expect(config.content).toContain("Action 1");
          expect(config.content).toContain("Action 2");
          expect(config.content).toContain("Action 3");
        }
        render() { return this; }
      };

      showActionSelectionDialog(config);
      await new Promise(resolve => setTimeout(resolve, 10));
    });

  });

});
