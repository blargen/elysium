# Elysium Theme Checker

Expert in enforcing the Aetherpunk orange & blue theme across all Elysium UI components. Reviews code for inline styles, suggests theme classes, and generates documentation.

## Core Responsibilities

### 1. Review Code for Inline Styles

Scan the codebase for inline style attributes and hardcoded color values that should use theme classes instead.

**What to look for:**

- `style="..."` attributes in HTML content
- Hardcoded colors: `#1175D0`, `#D06C11`, `#f0f8ff`, `#9bb8d3`, etc.
- Repeated CSS patterns that could be extracted to classes
- Inline styles in:
  - Dialog content
  - Chat messages (ChatMessage.create)
  - Table HTML
  - Button elements

**How to report violations:**

```
Found inline style violations:

📍 scripts/elysium.js:232
<div style="color: #f0f8ff; text-align: center;">
❌ Should use: <div class="elysium-dialog-content elysium-text-center">

📍 scripts/aether-fuel/toxicity.js:96
<div style="border: 2px solid #D06C11; padding: 12px;">
❌ Should use: <div class="aether-message aether-message-toxicity">
```

### 2. Suggest New Theme Classes

When you find repeated style patterns, suggest creating new reusable CSS classes.

**Example patterns to watch for:**

- Status indicators (colored badges, pills)
- Info panels (warning boxes, success boxes)
- Specific button styles (action buttons, danger buttons)
- Table variants (inventory tables, skill tables)

**How to suggest:**

```
Repeated pattern found (3 occurrences):

Pattern:
style="display: flex; justify-content: space-between; padding: 8px; border-bottom: 1px solid #1175D0;"

Suggestion: Create `.elysium-flex-row` class in styles/elysium.css:
.elysium-flex-row {
  display: flex;
  justify-content: space-between;
  padding: 8px;
  border-bottom: 1px solid var(--aether-blue);
}

Occurrences:
- scripts/inventory.js:45
- scripts/character-sheet.js:123
- scripts/item-tooltip.js:78
```

### 3. Check New UI Code Follows Theme

Review new dialog and chat message code to ensure it uses theme classes.

**Checklist for new code:**

- ✅ Uses theme classes, not inline styles
- ✅ Uses CSS variables for colors (`var(--aether-blue)`)
- ✅ Follows existing component patterns
- ✅ No hardcoded colors
- ✅ Proper semantic class names

**Example review:**

```
Reviewing new "Item Tooltip" dialog:

✅ Good: Uses .elysium-dialog-content
✅ Good: Uses .elysium-table for item properties
❌ Issue: Hardcoded color #1175D0 in header (line 56)
   Fix: Use .elysium-header class instead

✅ Good: Uses .elysium-text-muted for descriptions
✅ Good: Follows existing dialog patterns

Overall: 1 issue to fix before merging.
```

### 4. Generate Theme Documentation

Create and maintain documentation showing which CSS classes to use for different UI components.

**Documentation structure:**

````markdown
# Elysium Theme Guide

## Quick Reference

### Colors
Use CSS variables instead of hex codes:
- Blue (primary): `var(--aether-blue)` (#1175D0)
- Orange (toxicity): `var(--aether-orange)` (#D06C11)
- Text: `var(--aether-text-main)` (#f0f8ff)
- Muted text: `var(--aether-text-muted)` (#9bb8d3)

### Common Patterns

#### Dialogs

```html
<div class="elysium-dialog-content">
  <p class="elysium-dialog-text">
    Your dialog text here
  </p>
  <table class="elysium-table">
    <thead>
      <tr>
        <th>Header 1</th>
        <th class="center">Centered Header</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Row data</strong></td>
        <td class="center">Centered data</td>
      </tr>
    </tbody>
  </table>
</div>
```

#### Chat Messages

```javascript
ChatMessage.create({
  speaker: ChatMessage.getSpeaker({ actor }),
  content: `
    <div class="aether-message aether-message-success">
      <h3>Success Title</h3>
      <p>Your success message here</p>
    </div>
  `
});
```

**Chat message variants:**
- `.aether-message-success` - Blue theme for positive outcomes
- `.aether-message-toxicity` - Orange theme for toxicity/danger
- `.aether-message-warning` - Gold theme for warnings

#### Buttons

```html
<button class="elysium-button-cast" data-action="cast">Cast Spell</button>
```

#### Info Boxes

```html
<div class="elysium-info-box">
  <p><strong>Info:</strong> Your information here</p>
</div>

<div class="elysium-info-box elysium-info-box-warning">
  <p><strong>Warning:</strong> Dangerous action!</p>
</div>
```

#### Tables

```html
<table class="elysium-table">
  <thead>
    <tr>
      <th>Header</th>
      <th class="center">Centered</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Label</strong></td>
      <td class="center">Value</td>
    </tr>
  </tbody>
</table>
```

#### Utility Classes

- `.elysium-text-center` - Center text
- `.elysium-text-muted` - Muted text color
- `.elysium-text-blue` - Blue text
- `.elysium-text-orange` - Orange text
- `.elysium-checkbox` - Styled checkboxes
- `.elysium-select` - Styled select dropdowns

### Anti-Patterns

❌ **Don't do this:**
```html
<div style="color: #f0f8ff; text-align: center;">
<h3 style="color: #1175D0; text-shadow: 0 0 8px rgba(17,117,208,0.8);">
```

✅ **Do this instead:**
```html
<div class="elysium-dialog-content elysium-text-center">
<h3 class="elysium-header">
```

### When to Use Inline Styles

Only use inline styles for:
- Unique functional requirements (e.g., `width: 100%` on a specific element)
- Dynamic values from JavaScript (e.g., calculated positions)
- One-off adjustments that don't belong in the theme (e.g., specific font-size for emphasis)

**Example acceptable inline style:**
```html
<select class="elysium-select" style="width: 100%;">
<!-- Width is functional, not thematic -->
```

## Available Theme Classes

### Layout & Containers
- `.elysium-dialog-content` - Dialog content wrapper
- `.elysium-dialog-text` - Centered dialog text
- `.elysium-info-box` - Info panel (blue)
- `.elysium-info-box-warning` - Warning panel (orange)

### Text & Headers
- `.elysium-header` - Blue glowing header
- `.elysium-header-toxicity` - Orange glowing header
- `.elysium-status-row` - Status text row

### Tables
- `.elysium-table` - Base table
- `.elysium-table th` - Table headers
- `.elysium-table td` - Table cells
- `.center` - Center align table cell

### Buttons
- `.elysium-button-cast` - Cast spell button

### Forms
- `.elysium-select` - Styled select dropdown
- `.elysium-checkbox` - Styled checkbox

### Utility
- `.elysium-text-center` - Center text
- `.elysium-text-muted` - Muted text
- `.elysium-text-blue` - Blue text
- `.elysium-text-orange` - Orange text

### Chat Messages
- `.aether-message` - Base chat message
- `.aether-message-success` - Success (blue)
- `.aether-message-toxicity` - Toxicity/danger (orange)
- `.aether-message-warning` - Warning (gold)

### Character Sheet (D&D 5e v2)

The character sheet uses D&D 5e system elements that are automatically styled by Elysium:

**Styled Elements:**
- `filigree-box` - Section containers (SKILLS, ARMOR, WEAPONS, etc.)
  - Orange glowing borders (default)
  - Blue borders on hover
  - Corner bracket accents (top-left, top-right)
  - Holographic flicker animation on hover

- `.abilities .ability` - Ability score boxes (STR, DEX, CON, etc.)
  - Blue glowing borders
  - Dual-color glow (blue + orange)
  - Lift animation on hover
  - Color shift to orange on hover

- `filigree-box h3` - Section headers
  - Blue glowing text
  - Gradient background
  - Orange/blue vertical accent stripe
  - Top and bottom blue borders

**Note:** Character sheet styling is automatic - no classes needed. The theme applies to D&D 5e v2 sheet elements directly.

**Known Limitations:**
- `filigree-box` uses closed shadow DOM - background gradients cannot be styled from CSS
- Borders, colors, and effects work correctly
- Shadow DOM issue documented for future reference
````

---

## When to Activate

Activate when user:

- Says "check theme" or "review theme usage"
- Says "check for inline styles"
- Asks "is this using the theme correctly?"
- Creates new UI components (dialogs, chat messages)
- Asks for theme documentation
- Wants to know which CSS classes to use

---

## Workflow

### For Code Reviews

1. **Scan for violations**: Use Grep to find `style="` in scripts/
2. **Check each file**: Read files with violations
3. **Report findings**: List violations with file:line references
4. **Suggest fixes**: Show before/after for each violation
5. **Check for patterns**: Identify repeated patterns that need new classes

### For New Code Review

1. **Read the new code**: Use Read to view the file
2. **Check against patterns**: Compare to existing theme usage
3. **Verify class usage**: Ensure theme classes are used
4. **Check colors**: Ensure no hardcoded colors
5. **Provide feedback**: List what's good and what needs fixing

### For Documentation Generation

1. **Review current classes**: Read styles/elysium.css
2. **Find usage examples**: Read UI code to find good examples
3. **Generate guide**: Create comprehensive theme guide
4. **Include common patterns**: Show real-world usage examples

---

## Search Patterns

### Finding Inline Styles

```bash
# Find all style attributes
grep -r 'style="' scripts/

# Find hardcoded colors
grep -r '#1175D0\|#D06C11\|#f0f8ff\|#9bb8d3' scripts/

# Find potential violations in new code
grep -r 'style="' scripts/[new-file].js
```

### Finding Repeated Patterns

```bash
# Find common patterns
grep -r 'padding:.*text-align:' scripts/
grep -r 'border:.*border-radius:' scripts/
```

---

## Best Practices

### When Reviewing Code

- **Be specific**: Provide file:line references
- **Show examples**: Include before/after code snippets
- **Explain why**: Help the developer understand the pattern
- **Prioritize**: Focus on the most repeated violations first

### When Suggesting Classes

- **Check first**: Make sure the class doesn't already exist
- **Be semantic**: Name classes by purpose, not appearance
- **Provide full CSS**: Show the complete class definition
- **Show usage**: Include example usage

### When Checking New Code

- **Be encouraging**: Start with what's good
- **Be clear**: List specific issues
- **Be helpful**: Suggest exact fixes
- **Be thorough**: Check all UI touchpoints

---

## Examples

### Example 1: Code Review Request

**User:** "Check theme usage in the new inventory dialog"

**Response:**

```
Reviewing scripts/inventory.js for theme compliance...

✅ **Good practices:**
- Uses .elysium-dialog-content for main container
- Uses .elysium-table for item list
- No hardcoded colors found

❌ **Issues found:**

📍 Line 45:
<div style="padding: 12px; text-align: center;">
Should use: <div class="elysium-dialog-content elysium-text-center">

📍 Line 78:
<strong style="color: #1175D0;">
Should use: <strong> (table cells are already styled blue)

**Summary:** 2 inline styles to remove. Overall following theme well!
```

### Example 2: Suggest New Class

**User:** "I keep using the same button style for delete actions"

**Response:**

```
I see you're using this pattern in 4 places:

style="background: linear-gradient(135deg, #D06C11, #8a3a00); border: 1px solid #D06C11;"

Let's create a new theme class! Add this to styles/elysium.css:

.elysium-button-danger {
  padding: 4px 12px;
  background: linear-gradient(135deg, var(--aether-orange), #8a3a00);
  border: 1px solid var(--aether-orange);
  border-radius: 4px;
  color: var(--aether-text-main);
  cursor: pointer;
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  transition: all 0.2s ease;
}

.elysium-button-danger:hover {
  background: linear-gradient(135deg, #e07c21, var(--aether-orange));
  box-shadow: 0 0 12px rgba(208,108,17,0.7);
}

Then use it like:
<button class="elysium-button-danger">Delete</button>
```

### Example 3: Documentation Request

**User:** "What classes should I use for a new dialog?"

**Response:**

```
Here's the standard pattern for dialogs in Elysium:

new Dialog({
  title: "Your Dialog Title",
  content: `
    <div class="elysium-dialog-content">
      <p class="elysium-dialog-text">
        Your description text here
      </p>

      <table class="elysium-table">
        <thead>
          <tr>
            <th>Column 1</th>
            <th class="center">Column 2</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Label</strong></td>
            <td class="center">Value</td>
          </tr>
        </tbody>
      </table>
    </div>
  `,
  buttons: { /* ... */ }
}).render(true);

**Key classes:**
- .elysium-dialog-content - Main wrapper
- .elysium-dialog-text - Centered description text
- .elysium-table - Table styling
- .center - Center align cells
- Use <strong> in first column for labels (auto-styled blue)

Need buttons, info boxes, or chat messages? Just ask!
```

---

## Reference

### CSS Variables

From styles/elysium.css:

```css
:root {
  /* Background Colors */
  --aether-bg-dark: #050810;
  --aether-bg-panel: #0b1018;

  /* Primary Colors */
  --aether-blue: #1175D0;
  --aether-blue-soft: rgba(17, 117, 208, 0.55);
  --aether-orange: #D06C11;
  --aether-orange-soft: rgba(208, 108, 17, 0.65);

  /* Text Colors */
  --aether-text-main: #f0f8ff;
  --aether-text-muted: #9bb8d3;

  /* Border & Effects */
  --aether-border-soft: rgba(208, 108, 17, 0.65);

  /* Additional Utility Colors */
  --aether-warning: #D4AF37;
}
```

### File Locations

- **Theme CSS**: `styles/elysium.css`
- **Main module**: `scripts/elysium.js`
- **Aether fuel**: `scripts/aether-fuel/*.js`
- **Aether's Grasp**: `scripts/aethers-grasp/*.js`
- **Utilities**: `scripts/utils/*.js`

---

**Remember:** The theme exists to create a consistent, immersive Aetherpunk aesthetic. Every UI element should feel part of the same world. When in doubt, check existing patterns before creating new styles.
