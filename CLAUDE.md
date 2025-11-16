# Elysium - FoundryVTT Module

## Project Overview

**Elysium** is a FoundryVTT module for D&D 5e featuring a unique fantasy/cyberpunk fusion world. Players experience a full adventure with custom items, NPCs, journals, maps, and story elements.

### Core Concept
A fantasy world enhanced with cyberpunk-like technology and modifications, all powered by a mystical resource called **aether**.

---

## The Aether System (Core Mechanic)

**Aether** is the fuel that powers all modifications and enhancements in Elysium.

### Aether Quality Tiers

Elysium features multiple aether qualities, each with different properties:

1. **Unrefined Aether**
   - Raw, toxic aether with dangerous side effects
   - Implements toxicity system with escalating risks
   - Tracking: `dailyDoses` and `atl` (Aether Toxicity Level) flags
   - CON saves with increasing DC (8 + 2 * doses)
   - Progressive conditions: poisoned → blinded → paralyzed
   - Can cause exhaustion, Aether Madness, stunned
   - Resets on long rest

2. **Basic Refined Aether**
   - Clean, safe aether with no adverse effects
   - Standard fuel source for most modifications
   - No toxicity tracking needed

3. **Rarefied Aether**
   - Higher quality refined aether
   - Enhanced power with minimal risks
   - (Design in progress)

4. **Prometheum**
   - Premium aether quality
   - Most powerful stable aether
   - (Design in progress)

5. **Wild Aether**
   - Unstable, unpredictable aether
   - Roll on Wild Magic table when used
   - High variance in effects (can be very powerful or very dangerous)

### Core Aether Mechanics

**Toxicity System (Unrefined only):**
- Track daily doses on actor: `actor.getFlag("elysium", "dailyDoses")`
- Track ATL (Aether Toxicity Level): `actor.getFlag("elysium", "atl")`
- Each dose requires CON save (DC = 8 + 2 * newDailyDoses)
- Failed saves increase ATL and apply cumulative effects
- Long rest resets toxicity counters and removes conditions

**Item Consumption:**
- All aether items track uses: `item.system.uses.value`
- Module handles consumption automatically (not in macros)
- Store aether type in item flags: `flags.elysium.aetherType`

### Design Guidelines:
- Store all aether data in `flags.elysium.aether` object
- Module should handle effects via hooks, not item macros
- Effects should integrate with midi-qol when possible
- Use actor flags for tracking consumption and toxicity
- Provide clear visual/chat feedback for aether usage

---

## Technology Stack

- **Platform**: FoundryVTT v13+
- **Game System**: D&D 5e (dnd5e system)
- **Language**: JavaScript/TypeScript (prefer TypeScript for new code)
- **Automation**: midi-qol for combat/item workflows
- **Build**: Modern build system (TypeScript compilation, SCSS preprocessing)
- **Quality**: ESLint + Prettier

---

## Project Structure

```
elysium/
├── scripts/                  # Module source code (TypeScript)
│   ├── elysium.js           # Main entry point (minimal, just hooks)
│   ├── aether-system.js     # Aether fuel system logic
│   ├── toxicity.js          # Toxicity tracking and effects
│   ├── ui/                  # UI components
│   │   ├── dialogs.js       # Dialog helpers
│   │   └── chat.js          # Chat message helpers
│   └── utils/               # Utility functions
│       ├── flags.js         # Flag management
│       └── calculations.js  # Pure calculation functions
├── styles/                  # SCSS stylesheets
├── templates/               # Handlebars templates for UI
├── lang/                    # Localization files (i18n)
├── packs/                   # Compendiums (items, NPCs, journals, etc.)
├── assets/                  # Images, icons, maps
├── tests/                   # Test files (mirrors src structure)
│   ├── aether-system.test.js
│   ├── toxicity.test.js
│   └── utils/
│       └── calculations.test.js
├── .claude/                 # Claude Code configuration
├── module.json              # FoundryVTT module manifest
├── package.json             # NPM dependencies and scripts
├── jest.config.js           # Jest testing configuration
└── CLAUDE.md                # This file
```

**Key Principles:**
- **Small files**: Each file has one clear purpose
- **Separation**: Business logic separate from Foundry API calls
- **Testable**: Pure functions in `utils/`, easy to test
- **Organized**: Group related code (ui/, utils/)
- **Mirrored tests**: Test structure mirrors source structure

---

## Coding Standards

### TypeScript
- Use TypeScript for all new code
- Enable strict type checking
- Document complex types with comments

### Code Style
- Use Prettier for formatting (automatic via hooks)
- Follow ESLint rules
- Use async/await over promises
- Prefer const over let, avoid var

### Modularity & Testing Philosophy

**🚨 CRITICAL: Test-Driven Development (TDD) 🚨**

**⚠️ ALWAYS WRITE TESTS FIRST - NO EXCEPTIONS ⚠️**

This is a hard requirement for this project. Before writing any new feature or function:
1. **STOP** - Do not write implementation code yet
2. **WRITE THE TEST FIRST** - Create the test file and test cases
3. **RUN THE TEST** - Verify it fails (Red)
4. **IMPLEMENT** - Write the minimal code to pass the test (Green)
5. **REFACTOR** - Clean up while keeping tests green

**Test-Driven Development (TDD):**
- **ALWAYS use TDD when possible** - write tests first, then implement
- Red → Green → Refactor cycle
- Tests document expected behavior and requirements
- Makes refactoring safe and fearless
- Catches bugs early in development

**TDD Workflow:**
1. **Red**: Write a failing test for the next small piece of functionality
2. **Green**: Write the minimal code to make the test pass
3. **Refactor**: Clean up the code while keeping tests green
4. Repeat

**Prefer small, focused modules:**
- Break code into small, single-purpose functions
- Each file should have one clear responsibility
- Functions should do one thing well
- Aim for functions under 50 lines when possible

**Make code testable:**
- Write pure functions where possible (same input = same output)
- Avoid side effects in business logic
- Separate data transformation from Foundry API calls
- Export functions for testing
- Mock Foundry globals in tests

**Test coverage:**
- Write tests for all business logic
- Test aether consumption logic
- Test toxicity calculations
- Test item flag parsing
- Test flag management utilities
- Use Jest testing framework
- Mock Foundry API (`game`, `actor`, `item`, etc.)

**Change with confidence:**
- If it has tests, you can refactor fearlessly
- Tests document expected behavior
- Catch regressions early

### FoundryVTT Conventions
- Register settings in `init` hook
- Initialize features in `ready` hook
- Document all Foundry hooks used
- Use libWrapper for safe function patching
- Prefix module-specific flags with `elysium.`

### D&D 5e System
- Always check system version compatibility
- Use proper D&D 5e data models
- Handle character types (PCs, NPCs, monsters)
- Respect system hooks and workflows

### Aether Items
- **NO item macros**: All logic goes in module scripts, not individual item macros
- Always specify aether quality when creating modified items
- Store aether type in `flags.elysium.aetherType`
- Use actor flags for tracking toxicity and consumption
- Module hooks should detect and handle aether item usage automatically
- Document positive and negative effects clearly
- Test with various quality tiers

---

## Development Workflow

1. **Create Feature Branch**: Work on focused features
2. **Write Tests First**: TDD approach when possible
3. **Implement Feature**: Following standards above
4. **Run Quality Checks**: Linting, type checking, tests
5. **Update Documentation**: Keep docs in sync with code
6. **Create PR**: Review before merging

### Git Workflow
- Add files individually (not `git add .`)
- Write clear, descriptive commit messages
- Follow conventional commits (feat:, fix:, docs:, etc.)

---

## Item Creation Guidelines

Items are the **core feature** of Elysium.

### Standard Item Properties
- Name, description, rarity
- D&D 5e stats and properties
- Icon/image assets
- Localization strings

### Aether-Fueled Modifications
- **Aether Quality**: Specify tier/level
- **Positive Effects**: Benefits granted by mod
- **Negative Effects**: Risks or drawbacks
- **Activation**: How the mod activates
- **Resource Cost**: Aether consumption if applicable

### midi-qol Integration
- Define workflow flags for automation
- Test automation with various character builds
- Handle edge cases (immunities, resistances, etc.)
- Document workflow timing

---

## Key Dependencies

- **midi-qol**: Combat and item automation
- **libWrapper**: Safe function patching/hooks
- **dnd5e system**: Base game system

**Dev Dependencies:**
- **Jest**: Testing framework
- **@testing-library**: For testing utilities
- **TypeScript**: Type safety
- **ESLint**: Code linting
- **Prettier**: Code formatting

---

## Testing Setup

### Jest Configuration

Create `jest.config.js`:

```javascript
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.js'],
  collectCoverageFrom: [
    'scripts/**/*.js',
    '!scripts/elysium.js'  // Exclude main hook file
  ],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js']
};
```

### Test Setup (Mocking Foundry)

Create `tests/setup.js`:

```javascript
// Mock Foundry globals
global.game = {
  user: { id: 'test-user', character: null },
  settings: {
    get: jest.fn(),
    set: jest.fn(),
    register: jest.fn()
  },
  i18n: {
    localize: jest.fn(key => key),
    format: jest.fn((key, data) => key)
  }
};

global.ChatMessage = {
  create: jest.fn(),
  getSpeaker: jest.fn(() => ({}))
};

global.ui = {
  notifications: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
};
```

### Example Test

`tests/utils/calculations.test.js`:

```javascript
const { calculateToxicityDC, shouldApplyExhaustion } = require('../../scripts/utils/calculations');

describe('Toxicity Calculations', () => {
  test('calculateToxicityDC returns correct DC', () => {
    expect(calculateToxicityDC(0)).toBe(10);  // 8 + 2*1
    expect(calculateToxicityDC(1)).toBe(12);  // 8 + 2*2
    expect(calculateToxicityDC(5)).toBe(20);  // 8 + 2*6
  });

  test('shouldApplyExhaustion at correct ATL levels', () => {
    expect(shouldApplyExhaustion(1)).toBe(false);
    expect(shouldApplyExhaustion(2)).toBe(true);
    expect(shouldApplyExhaustion(3)).toBe(false);
    expect(shouldApplyExhaustion(4)).toBe(true);
  });
});
```

### NPM Scripts

Add to `package.json`:

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "lint": "eslint scripts/",
    "format": "prettier --write \"scripts/**/*.js\""
  }
}
```

### What to Test

**✅ Always test:**
- Pure calculation functions (DC calculations, damage rolls)
- Data transformations (flag parsing, item data extraction)
- Business logic (toxicity progression, aether selection rules)
- Edge cases (no aether available, ATL at max, etc.)

**⚠️ Hard to test (focus on integration):**
- Foundry hooks (test the functions they call)
- UI rendering (test dialog data generation)
- Chat messages (test message content generation)

**Example testable structure:**

```javascript
// ❌ Hard to test
Hooks.on('dnd5e.useItem', async (item) => {
  const dc = 8 + 2 * (actor.getFlag('elysium', 'dailyDoses') + 1);
  // ... more logic
});

// ✅ Easy to test
// utils/calculations.js
export function calculateToxicityDC(dailyDoses) {
  return 8 + 2 * (dailyDoses + 1);
}

// aether-system.js
Hooks.on('dnd5e.useItem', async (item) => {
  const dailyDoses = actor.getFlag('elysium', 'dailyDoses') || 0;
  const dc = calculateToxicityDC(dailyDoses);
  // ... use dc
});

// tests/utils/calculations.test.js
test('calculateToxicityDC', () => {
  expect(calculateToxicityDC(0)).toBe(10);
});
```

---

## Best Practices

### Scalability
- Write modular, reusable code
- Keep components focused and single-purpose
- Plan for future expansion of aether system
- Design for easy addition of new item types

### Performance
- Lazy-load heavy resources
- Cache computed values when appropriate
- Minimize DOM manipulation
- Use efficient data access patterns

### User Experience
- Localize all user-facing text
- Provide clear feedback (notifications, dialogs)
- Handle errors gracefully
- Respect user settings and permissions

### Accessibility
- Use semantic HTML in templates
- Provide keyboard navigation
- Ensure contrast for readability
- Test with screen readers when possible

---

## Module Architecture Notes

### Inspiration Sources
We're drawing patterns from:
- **Enhanced Combat HUD**: Build system, TypeScript, SCSS, i18n-first
- **Monk's Active Tiles**: Action-trigger pattern, extensibility

### Future Considerations
- Aether modification system is not fully designed yet
- Keep item structure flexible for future mod mechanics
- Plan for potential upgrade/progression systems
- Consider UI for aether management

---

## Quick Reference

### Common Tasks
- Create item: Use `/item` command
- Create NPC: Use `/npc` command
- Review code: Use `/review` command
- Run tests: `npm test`
- Build module: `npm run build`

### Important Files
- `module.json` - Module manifest (version, dependencies)
- `scripts/elysium.js` - Main module entry point
- `packs/` - Compendium content

### Getting Help
- FoundryVTT API: Use MCP docs server
- D&D 5e system API: Use MCP docs server
- midi-qol: Use MCP docs server
