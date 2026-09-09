# Superseded observation — not the final behavior

The center-ray mismatch capture belongs to the intermediate 756e3b9 runtime. The jet visibly cleared the ledge at the target's upper body, but a separate ray toward its center prevented wetness. An initial state assertion accepted that zero result; image inspection correctly rejected it.

Regression and fix in de7563e use the actual jet height for obstruction. Compare the final `validated/02a-upper-jet-clears-ledge` image/JSON: the visible hit now applies wetness. A separate low-shot unit regression still confirms true ledge blocking. This preserves the failed iteration as evidence rather than presenting it as a valid rule.
