# Library UI PR #27 Takeover Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the contributor-authored Library list prototype from PR #27 onto current `main`, resolve its review blockers, and publish a current, tested maintainer replacement PR that preserves contributor attribution.

**Architecture:** Keep the Library feature as an isolated client-side prototype backed by mock data. Reuse the contributor's dense and preview views, expose only quick actions that have real callbacks, use pressed-button group semantics for the view toggle, localize every user-facing string, and type the UI view model against the merged RFC 0001 file/artifact contract where that contract applies.

**Tech Stack:** React, TypeScript, Headless UI, React Testing Library, Jest, i18next, Vite 7/PWA runtime smoke.

## Global Constraints

- Start from public `main` at `f996b7ed685225d2655b57762fbbeb6ada7e82a9` or a later descendant containing PR #80.
- Preserve the original author metadata by cherry-picking contributor commits; do not squash-copy the feature.
- Do not import PR #27's stale merge commit `c000bf49353f99c07981e54625692c9f86a089f8`.
- Keep this slice mocked and contributor-safe: no production credentials, storage adapters, private endpoints, or deployment configuration.
- All user-facing text in `client/src/**/*` must use `useLocalize()` and new keys must be added only to `client/src/locales/en/translation.json`.
- Write or update a failing focused test before each behavior change, observe the expected failure, then implement the minimum fix.
- Preserve unrelated worktree changes.

---

### Task 1: Replay the contributor implementation and reproduce the reviewed failures

**Files:**
- Import: `.gitignore`
- Import: `client/src/components/Library/**/*`
- Import: `client/src/data/mockLibraryData.ts`
- Import: `client/src/types/library.ts`
- Test: `client/src/components/Library/__tests__/LibraryList.test.tsx`
- Test: `client/src/components/Library/__tests__/libraryUtils.test.ts`

**Interfaces:**
- Consumes: PR #27 commits `aa888afc664977550ad5efee578b93e99d2aca84`, `857c58384ae4c81262127ded0c0d61bd8ca9ebfe`, `81247c0ad19083b49f2e356b74e01a5eeef5894d`, and `9db1d77d2caf016288d602fd8890bbd3a3a8bb54`.
- Produces: the contributor's Library components and tests on the repaired current toolchain.

- [ ] **Step 1: Replay only the contributor-authored commits**

```bash
git cherry-pick aa888afc664977550ad5efee578b93e99d2aca84
git cherry-pick 857c58384ae4c81262127ded0c0d61bd8ca9ebfe
git cherry-pick 81247c0ad19083b49f2e356b74e01a5eeef5894d
git cherry-pick 9db1d77d2caf016288d602fd8890bbd3a3a8bb54
```

- [ ] **Step 2: Run the focused Library tests and verify the known red state**

Run:

```bash
cd client
npx jest src/components/Library/__tests__/LibraryList.test.tsx src/components/Library/__tests__/libraryUtils.test.ts --runInBand --coverage=false
```

Expected: `LibraryList › filters items by type` and `LibraryList › sorts items by name` fail because the actual dropdown buttons are not named “Filter by type” and “Sort library items”.

### Task 2: Correct accessible control and quick-action semantics

**Files:**
- Modify: `client/src/components/Library/__tests__/LibraryList.test.tsx`
- Modify: `client/src/components/Library/LibraryFilters.tsx`
- Modify: `client/src/components/Library/LibraryViewToggle.tsx`
- Modify: `client/src/components/Library/LibraryItemActions.tsx`
- Modify: `client/src/components/Library/LibraryListItem.tsx`
- Modify: `client/src/components/Library/LibraryPreviewCard.tsx`
- Modify: `client/src/components/Library/LibraryList.tsx`
- Modify: `client/src/types/library.ts`

**Interfaces:**
- Consumes: `LibraryList` items and optional item-level callbacks.
- Produces: correctly named filter/sort buttons; a `role="group"` pressed-button view toggle; and optional `onDownload`, `onShare`, and `onMore` callbacks that never render dead controls.

- [ ] **Step 1: Extend the interaction tests before changing components**

Add assertions equivalent to:

```tsx
expect(screen.getByRole('group', { name: 'Library view' })).toBeInTheDocument();
expect(screen.queryByRole('button', { name: 'Download' })).not.toBeInTheDocument();

const onOpen = jest.fn();
const onDownload = jest.fn();
render(<LibraryList items={[mockLibraryItems[0]]} status="populated" onItemClick={onOpen} onDownload={onDownload} />);
await userEvent.click(screen.getByRole('button', { name: 'Download' }));
expect(onDownload).toHaveBeenCalledWith(mockLibraryItems[0]);
```

- [ ] **Step 2: Run the focused component test and verify the new assertions fail**

Run:

```bash
cd client
npx jest src/components/Library/__tests__/LibraryList.test.tsx --runInBand --coverage=false
```

Expected: failures identify the radiogroup/pressed-button mismatch and dead quick-action buttons; the two existing dropdown tests remain red.

- [ ] **Step 3: Implement the minimum accessible behavior**

Implement these exact behavior rules:

```tsx
<SelectDropDown title={localize('com_ui_library_filter_by_type')} showLabel={false} />
<SelectDropDown title={localize('com_ui_library_sort_items')} showLabel={false} />
<div role="group" aria-label={localize('com_ui_library_view')}>
```

`LibraryItemActions` must return `null` when every callback is absent and render each button only when its corresponding callback exists. `LibraryList` must pass the selected `LibraryItem` to `onItemClick`, `onDownload`, `onShare`, and `onMore` without adding placeholder handlers.

- [ ] **Step 4: Run the focused component test and verify it passes**

Run:

```bash
cd client
npx jest src/components/Library/__tests__/LibraryList.test.tsx --runInBand --coverage=false
```

Expected: all Library component interaction tests pass.

- [ ] **Step 5: Commit the behavior fixes**

```bash
git add client/src/components/Library client/src/types/library.ts
git commit -m "fix: complete Library interaction semantics"
```

### Task 3: Align mock records with the RFC 0001 contract

**Files:**
- Modify: `client/src/components/Library/__tests__/libraryUtils.test.ts`
- Modify: `client/src/components/Library/LibraryPreviewCard.tsx`
- Modify: `client/src/data/mockLibraryData.ts`
- Modify: `client/src/types/library.ts`

**Interfaces:**
- Consumes: `FileRecord`, `ArtifactRecord`, `SupportedArtifactContentType`, and `isSupportedArtifactContentType` from `librechat-data-provider`.
- Produces: Library mock records whose IDs identify files/artifacts consistently and whose optional `contentType` values are accepted by the shared artifact contract.

- [ ] **Step 1: Add a failing contract-alignment test**

```tsx
it('keeps mock records aligned with shared file and artifact identifiers', () => {
  for (const item of mockLibraryItems) {
    expect(item.id).toMatch(item.kind === 'file' ? /^file_/ : /^artifact_/);
    if (item.contentType) {
      expect(isSupportedArtifactContentType(item.contentType)).toBe(true);
    }
  }
});
```

- [ ] **Step 2: Run the utility test and verify it fails on the `lib-*` IDs or unsupported MIME values**

Run:

```bash
cd client
npx jest src/components/Library/__tests__/libraryUtils.test.ts --runInBand --coverage=false
```

Expected: the new contract-alignment test fails against the imported mock records.

- [ ] **Step 3: Type and update the mock records**

Use shared types in the view model:

```ts
import type { ArtifactRecord, FileRecord, SupportedArtifactContentType } from 'librechat-data-provider';

export interface LibraryItem {
  id: FileRecord['id'] | ArtifactRecord['id'];
  name: FileRecord['name'] | ArtifactRecord['name'];
  contentType?: SupportedArtifactContentType;
}
```

Rename `mimeType` to `contentType`, change file IDs to `file_*`, change artifact IDs to `artifact_*`, keep `contentType` only for values supported by RFC 0001, and make preview detection read `contentType`.

- [ ] **Step 4: Run both focused Library suites and verify they pass**

Run:

```bash
cd client
npx jest src/components/Library/__tests__/LibraryList.test.tsx src/components/Library/__tests__/libraryUtils.test.ts --runInBand --coverage=false
```

Expected: both suites pass with zero failing tests.

- [ ] **Step 5: Commit the contract alignment**

```bash
git add client/src/components/Library client/src/data/mockLibraryData.ts client/src/types/library.ts
git commit -m "refactor: align Library mocks with artifact contracts"
```

### Task 4: Localize the Library surface and remove literal-string exemptions

**Files:**
- Modify: `client/src/components/Library/*.tsx`
- Modify: `client/src/components/Library/libraryUtils.ts`
- Modify: `client/src/components/Library/__tests__/LibraryList.test.tsx`
- Modify: `client/src/components/Library/__tests__/libraryUtils.test.ts`
- Modify: `client/src/locales/en/translation.json`

**Interfaces:**
- Consumes: `useLocalize()` and `TranslationKeys`.
- Produces: localized labels, descriptions, counts, dates, storage text, action names, and type/sort options with English defaults in the canonical locale file.

- [ ] **Step 1: Run ESLint against the imported Library files and record the literal-string red state**

Run:

```bash
npx eslint 'client/src/components/Library/**/*.{ts,tsx}' 'client/src/data/mockLibraryData.ts' 'client/src/types/library.ts'
```

Expected: the imported components report literal user-facing strings or other current-main lint violations.

- [ ] **Step 2: Add canonical English translation keys**

Add `com_ui_library_*` keys for search, filter/sort, item types, sort choices, list counts, empty/error/loading states, storage usage, view modes, source labels, and quick actions. Reuse existing `com_ui_download`, `com_ui_share`, `com_ui_retry`, and `com_ui_clear_search` where their wording is exact.

- [ ] **Step 3: Route every user-facing Library string through `useLocalize()`**

`libraryUtils.ts` must store translation-key maps and accept a `LocalizeFunction` when building labels/options. Components must call `useLocalize()` and remove all `i18next/no-literal-string` disable comments. Tests must import `render` from `~/test/layout-test-utils` so Recoil/i18n providers are present.

- [ ] **Step 4: Run lint and focused tests**

Run:

```bash
npx eslint 'client/src/components/Library/**/*.{ts,tsx}' 'client/src/data/mockLibraryData.ts' 'client/src/types/library.ts'
cd client
npx jest src/components/Library/__tests__/LibraryList.test.tsx src/components/Library/__tests__/libraryUtils.test.ts --runInBand --coverage=false
```

Expected: ESLint exits zero and both focused suites pass.

- [ ] **Step 5: Commit localization**

```bash
git add client/src/components/Library client/src/locales/en/translation.json
git commit -m "feat: localize Library prototype"
```

### Task 5: Verify the current-main integration and publish the replacement PR

**Files:**
- Verify: all changed files
- Update: PR description only through GitHub after local verification

**Interfaces:**
- Consumes: completed Library prototype and public CI commands.
- Produces: a pushed maintainer branch and replacement PR referencing #27 and #20.

- [ ] **Step 1: Run focused, full-client, build, config, and diff checks**

```bash
cd client
npx jest src/components/Library/__tests__/LibraryList.test.tsx src/components/Library/__tests__/libraryUtils.test.ts --runInBand --coverage=false
npm test -- --runInBand
cd ..
node --test bharatcode/test/config.test.mjs
npm run frontend:ci
git diff --check origin/main...HEAD
git status --short
```

Expected: all commands exit zero, no test failures occur, the production runtime smoke passes, and only intended files are changed.

- [ ] **Step 2: Review the commit range against this plan**

```bash
git diff --stat origin/main...HEAD
git log --oneline --reverse origin/main..HEAD
```

Expected: four contributor-authored commits plus focused maintainer commits; no private deployment files or stale merge commit.

- [ ] **Step 3: Push and create the replacement PR**

```bash
git push -u origin codex/takeover-library-ui-pr27
gh pr create --repo BharatCode-ai/chat --base main --head codex/takeover-library-ui-pr27 --title "feat: complete accessible Library list prototype" --body-file /tmp/pr-body.md
```

The PR body must reference PR #27, close issue #20, credit the contributor commits, summarize the accessibility/action/contract/localization work, and list the exact verification commands.

- [ ] **Step 4: Wait for current CI and perform final maintainer review**

Expected required checks: BharatCode config tests, Gitleaks, shared packages/API build, shared packages/client build including the production-runtime smoke.
