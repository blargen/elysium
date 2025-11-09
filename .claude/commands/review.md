---
description: Review Elysium code for module hooks best practices
---

Review the code with focus on Elysium-specific patterns:

**Check for:**
- ✅ Using module hooks instead of item macros
- ✅ Storing data in `flags.elysium`
- ✅ Proper aether quality tiers
- ✅ Toxicity tracking on actor flags
- ✅ Long rest reset hooks
- ✅ Dramatic UX (warnings, styled chat messages)
- ✅ No hardcoded values
- ❌ Item macros (should be in module scripts)
- ❌ Missing flag structures
- ❌ Skipped warnings for dangerous choices

**Review for:**
1. FoundryVTT best practices
2. D&D 5e balance
3. Module hook architecture
4. Elysium theme consistency
5. Security issues

Provide actionable feedback with code examples.
