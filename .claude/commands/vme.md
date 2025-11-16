# Release Command

You're creating a new release of the Elysium module for distribution.

## Your Task

1. **Ask the user what type of version bump:**
   - **patch** (0.1.0 → 0.1.1) - Bug fixes, small changes
   - **minor** (0.1.0 → 0.2.0) - New features, backwards compatible
   - **major** (0.1.0 → 1.0.0) - Breaking changes

2. **Read current version from module.json**

3. **Calculate new version** based on user's choice

4. **Update module.json** with new version

5. **Run tests** to ensure everything works:
   ```bash
   npm test
   ```

6. **Commit the version bump:**
   ```bash
   git add module.json
   git commit -m "chore: bump version to X.X.X"
   ```

7. **Merge current branch to main:**
   ```bash
   git checkout main
   git merge <current-branch>
   ```

8. **Push to GitHub:**
   ```bash
   git push origin main
   git push origin main --tags
   ```

9. **Inform the user:**
   - New version number
   - That GitHub Actions will create the release automatically
   - Users can update via Foundry's module installer in a few minutes

## Important Notes

- ALWAYS run tests before releasing
- If tests fail, STOP and fix them first
- The GitHub Actions workflow will handle creating the actual GitHub release
- Make sure you're on a feature branch before running this (not already on main)
