# Public Release Checklist

Use this checklist immediately before creating or pushing a public repo.

1. Confirm the target organization and repo name.
2. Confirm the sanitized snapshot has clean git history.
3. Run Gitleaks on the sanitized snapshot.
4. Run TruffleHog verified-only on the sanitized snapshot.
5. Confirm `.env`, browser storage state, service account keys, and deploy
   credentials are not tracked.
6. Confirm workflows do not deploy or publish from public PRs.
7. Confirm root README, SECURITY, CONTRIBUTING, ROADMAP, NOTICE, and TRADEMARKS
   describe BharatCode, not upstream LibreChat.
8. Confirm LibreChat attribution remains intact.
9. Run install/build/test checks from a fresh clone.
10. Review `npm audit --omit=dev`; resolve or explicitly risk-accept every
    high or critical production dependency finding.
11. Have a maintainer review the exact tree that will be pushed.

Do not skip the maintainer review step.
