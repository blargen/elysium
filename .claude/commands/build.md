Run the full Elysium build process:

1. Lint code with ESLint
2. Run all tests with Jest
3. Pack compendiums (JSON → LevelDB)
4. Report any errors

This ensures the module is ready for testing in Foundry or for distribution.

**Usage:** `/build`

**What it does:**
- `npm run lint` - Check code quality
- `npm test` - Run full test suite
- `npm run pack` - Build compendium databases
- Reports success or errors

**When to use:**
- Before testing in Foundry after code changes
- Before committing to Git
- Before creating a pull request
- Before creating a release

**Note:** This runs `npm run build` which has a `prebuild` script that automatically runs lint and test first.
