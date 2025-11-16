# Elysium Development Setup

Expert in setting up and maintaining the Elysium development environment. Handles symlinks, cache issues, Foundry integration, and local testing workflows.

## Core Responsibilities

### 1. Symlink Setup (Development Mode)

The Elysium module is developed in `/Users/eben/code/elysium` but Foundry loads modules from `~/Library/Application Support/FoundryVTT/Data/modules/`.

**Symlink allows instant updates**: Changes in the dev folder immediately appear in Foundry (after cache refresh).

**Setup Command:**
```bash
# Navigate to Foundry modules directory
cd ~/Library/Application\ Support/FoundryVTT/Data/modules/

# Create symlink to dev folder
ln -s /Users/eben/code/elysium elysium

# Verify symlink
ls -la | grep elysium
# Should show: elysium -> /Users/eben/code/elysium
```

**Verify Symlink:**
```bash
# Check if symlink exists
ls -la ~/Library/Application\ Support/FoundryVTT/Data/modules/ | grep elysium

# Should see:
# elysium -> /Users/eben/code/elysium (in blue/cyan color)
```

**Remove Symlink (if needed):**
```bash
# Navigate to modules directory
cd ~/Library/Application\ Support/FoundryVTT/Data/modules/

# Remove symlink (does NOT delete source code)
rm elysium

# Verify it's gone
ls -la | grep elysium
```

---

### 2. Cache Clearing (Critical for Testing)

**The Problem**: Foundry/browser caches JavaScript files. After making code changes, the old code still runs until cache is cleared.

**Symptoms**:
- Code changes don't appear in-game
- Still seeing old bugs after fixing them
- Console logs show old behavior

**Solutions (in order of preference):**

#### Option A: Hard Refresh (Fastest)
```
Mac: Cmd + Shift + R
Windows: Ctrl + Shift + F5
```

#### Option B: DevTools Cache Clear (Most Reliable)
1. Open DevTools: **Cmd+Option+I** (Mac) or **F12** (Windows)
2. Right-click the refresh button in browser
3. Select **"Empty Cache and Hard Reload"**

#### Option C: Disable Cache During Development (Best for Active Dev)
1. Open DevTools: **Cmd+Option+I** (Mac) or **F12** (Windows)
2. Go to **Network** tab
3. Check **"Disable cache"** checkbox
4. **Keep DevTools open** while testing (cache only disabled when DevTools is open)

#### Option D: Clear All Site Data (Nuclear Option)
1. Open DevTools: **Cmd+Option+I** (Mac) or **F12** (Windows)
2. Go to **Application** tab
3. Click **"Clear storage"** in left sidebar
4. Click **"Clear site data"** button
5. Refresh page

---

### 3. Verify Code is Loaded

**Check if module is active:**
```javascript
// In browser console (F12)
game.modules.get('elysium').active
// Should return: true
```

**Check which file is loaded:**
```javascript
// In browser console
console.log(game.modules.get('elysium'))
// Look at the 'path' property
```

**Force reload a specific script:**
```javascript
// In browser console - find the script and check its path
document.querySelector('script[src*="consumption.js"]')?.src
// Should show the symlinked path
```

---

### 4. Development Workflow

**Standard workflow for code changes:**

1. **Make changes** in `/Users/eben/code/elysium`
2. **Run tests** (if applicable): `npm test`
3. **Commit changes**: `git add ...` then `git commit -m "..."`
4. **Clear cache** in Foundry (Cmd+Shift+R)
5. **Test in-game**
6. **Repeat** until working

**Best practice workflow (with cache disabled):**

1. **Open Foundry** with DevTools open
2. **Disable cache** in Network tab (keeps it off during session)
3. **Make changes** in code
4. **Run tests**: `npm test`
5. **Refresh Foundry** (normal refresh is fine with cache disabled)
6. **Test in-game**
7. **Commit when working**

---

### 5. Troubleshooting Common Issues

#### Issue: "Changes aren't showing up in Foundry"

**Checklist:**
1. ✅ Symlink is set up correctly
   ```bash
   ls -la ~/Library/Application\ Support/FoundryVTT/Data/modules/ | grep elysium
   ```
2. ✅ Cache has been cleared (Cmd+Shift+R)
3. ✅ File was saved in editor
4. ✅ No syntax errors in console (F12)
5. ✅ Module is active in Foundry world settings

#### Issue: "Module won't activate in Foundry"

**Checklist:**
1. ✅ `module.json` is valid JSON (no trailing commas, proper quotes)
2. ✅ All required dependencies are installed (dnd5e system)
3. ✅ Check Foundry console (F12) for error messages
4. ✅ Symlink points to correct directory
5. ✅ Foundry version is compatible (check `module.json` compatibility)

#### Issue: "Tests pass but in-game behavior is different"

**Possible causes:**
1. **Cache issue** - Clear cache and try again
2. **Different code path** - Tests might not cover the exact in-game flow
3. **FoundryVTT API differences** - Mocks in tests may not match real API
4. **Timing issues** - Async operations may behave differently in-game

**Debug approach:**
1. Add `console.log()` statements in the suspect code
2. Clear cache and test in-game
3. Check browser console (F12) for logs
4. Verify the code path being executed

#### Issue: "Symlink broke after macOS update"

macOS sometimes removes symlinks during updates.

**Re-create symlink:**
```bash
cd ~/Library/Application\ Support/FoundryVTT/Data/modules/
ln -s /Users/eben/code/elysium elysium
```

---

### 6. Local Testing Setup

**Run all tests:**
```bash
cd /Users/eben/code/elysium
npm test
```

**Run specific test file:**
```bash
npm test -- tests/aether-fuel/consumption.test.js
```

**Run tests in watch mode:**
```bash
npm test -- --watch
```

**Run tests with coverage:**
```bash
npm test -- --coverage
```

---

### 7. File Paths Reference

**Development directory:**
```
/Users/eben/code/elysium
```

**Foundry modules directory:**
```
~/Library/Application Support/FoundryVTT/Data/modules/
```

**Symlink path:**
```
~/Library/Application Support/FoundryVTT/Data/modules/elysium -> /Users/eben/code/elysium
```

**Foundry data directory (full):**
```
~/Library/Application Support/FoundryVTT/Data/
```

**Worlds location:**
```
~/Library/Application Support/FoundryVTT/Data/worlds/
```

---

### 8. Quick Commands

**Check symlink status:**
```bash
ls -la ~/Library/Application\ Support/FoundryVTT/Data/modules/ | grep elysium
```

**Run tests before committing:**
```bash
cd /Users/eben/code/elysium && npm test
```

**Create new skill/command:**
```bash
# Skills
mkdir -p /Users/eben/code/elysium/.claude/skills/[skill-name]
touch /Users/eben/code/elysium/.claude/skills/[skill-name]/SKILL.md

# Commands
touch /Users/eben/code/elysium/.claude/commands/[command-name].md
```

**Grep for specific code:**
```bash
cd /Users/eben/code/elysium
grep -r "pattern" scripts/
```

---

### 9. Development Checklist

Before committing code changes:
- [ ] Tests pass (`npm test`)
- [ ] Code follows theme classes (no inline styles)
- [ ] Console has no errors in Foundry (F12)
- [ ] Tested in-game with cache cleared
- [ ] Commit message follows conventional commits

Before pushing to GitHub:
- [ ] All tests passing
- [ ] Version updated in `module.json` (if releasing)
- [ ] CLAUDE.md updated (if adding features)
- [ ] README updated (if needed)

---

### 10. When to Activate

Activate when user:
- Says "symlink" or "symbolic link"
- Says "changes aren't showing up"
- Says "cache" or "refresh"
- Asks "how do I test locally?"
- Mentions "development setup" or "dev environment"
- Reports code changes not appearing in Foundry
- Asks about Foundry file paths
- Needs help with local testing workflow

---

## Common Workflows

### Workflow 1: Testing a Bug Fix

```bash
# 1. Write failing test (TDD)
npm test -- tests/aether-fuel/consumption.test.js

# 2. Fix the bug in code
# (edit scripts/aether-fuel/consumption.js)

# 3. Verify test passes
npm test

# 4. Test in-game
# - Open Foundry
# - Clear cache (Cmd+Shift+R)
# - Test the specific feature

# 5. Commit
git add scripts/aether-fuel/consumption.js tests/aether-fuel/consumption.test.js
git commit -m "fix: description of bug fix"
```

### Workflow 2: Adding a New Feature

```bash
# 1. Write tests first (TDD)
# Create tests/[feature]/[feature].test.js

# 2. Run tests to see them fail (Red)
npm test

# 3. Implement feature
# Create scripts/[feature]/[feature].js

# 4. Run tests until green
npm test

# 5. Test in-game
# - Clear cache
# - Test feature thoroughly

# 6. Update documentation
# - Update CLAUDE.md if needed
# - Add skill if it's a major feature

# 7. Commit everything
git add [files]
git commit -m "feat: description"
```

### Workflow 3: Refactoring with Confidence

```bash
# 1. Ensure existing tests pass
npm test

# 2. Refactor code
# (make changes while keeping tests green)

# 3. Run tests frequently
npm test -- --watch

# 4. When all tests green, test in-game
# - Clear cache
# - Verify no behavior changes

# 5. Commit
git add [files]
git commit -m "refactor: description"
```

---

## Pro Tips

### Keep DevTools Open During Development
- Disable cache in Network tab
- Monitor console for errors
- See network requests in real-time
- Debug with breakpoints

### Use Watch Mode for Tests
```bash
npm test -- --watch
```
Tests re-run automatically when files change.

### Quick Symlink Check
```bash
# One-liner to verify symlink
[ -L ~/Library/Application\ Support/FoundryVTT/Data/modules/elysium ] && echo "✅ Symlink exists" || echo "❌ No symlink"
```

### Clear Cache Keyboard Shortcut
Set up a browser bookmark with this JavaScript:
```javascript
javascript:location.reload(true)
```
Click it for instant hard refresh.

---

**Remember**: The symlink means your code changes are instantly available to Foundry. But you must clear the cache for Foundry to load the new code!
