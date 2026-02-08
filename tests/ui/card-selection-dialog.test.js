/**
 * Card Selection Dialog Tests
 *
 * Tests for pure functions only - dialog itself is manually tested in Foundry
 */

import { describe, test, expect } from "@jest/globals";
import { buildOverclockSectionHtml } from "../../scripts/ui/card-selection-dialog.js";

describe("Card Selection Dialog - Pure Functions", () => {
  describe("buildOverclockSectionHtml", () => {
    test("should return empty string when config not provided", () => {
      // We'll need to extract this function and export it
      // For now, just verify the dialog doesn't include overclock HTML
      const result = buildOverclockSectionHtml();
      expect(result).toBe("");
    });

    test("should return empty string when enabled is false", () => {
      const result = buildOverclockSectionHtml({ enabled: false });
      expect(result).toBe("");
    });

    test("should include overclock card when enabled is true", () => {
      const result = buildOverclockSectionHtml({
        enabled: true,
        name: "Overclock",
        description: "Deal more damage",
        warning: "Results in toxicity!",
      });

      expect(result).toContain("elysium-overclock-card");
      expect(result).toContain("overclock-toggle");
      expect(result).toContain("OVERCLOCK");
      expect(result).toContain("Deal more damage");
      expect(result).toContain("Results in toxicity!");
      expect(result).toContain("elysium-divider");
    });

    test("should have checkbox unchecked by default", () => {
      const result = buildOverclockSectionHtml({
        enabled: true,
        label: "Test",
      });

      expect(result).toContain('type="checkbox"');
      expect(result).not.toContain("checked");
    });

    test("should have checkbox checked when defaultChecked is true", () => {
      const result = buildOverclockSectionHtml({
        enabled: true,
        label: "Test",
        defaultChecked: true,
      });

      expect(result).toContain("checked");
    });

    test("should include hazard icon", () => {
      const result = buildOverclockSectionHtml({
        enabled: true,
        name: "Overclock",
        image: "icons/svg/hazard.svg",
      });

      expect(result).toContain("icons/svg/hazard.svg");
      expect(result).toContain("elysium-overclock-icon");
    });

    test("should use custom image when provided", () => {
      const result = buildOverclockSectionHtml({
        enabled: true,
        name: "Overclock",
        image: "custom/overclock-icon.png",
      });

      expect(result).toContain("custom/overclock-icon.png");
    });

    test("should use default name when not provided", () => {
      const result = buildOverclockSectionHtml({
        enabled: true,
      });

      expect(result).toContain("OVERCLOCK");
    });
  });
});
