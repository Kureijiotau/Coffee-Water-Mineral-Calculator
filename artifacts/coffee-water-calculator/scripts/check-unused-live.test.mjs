import assert from "node:assert/strict";
import test from "node:test";
import ts from "typescript";
import {
  diagnosticIsUnusedImport,
  extractClassNamesFromSelector,
  findUnusedCssSelectors,
  isArchivedSource,
} from "./check-unused-live.mjs";

test("accepts TypeScript unused-import diagnostics but not unused locals", () => {
  const sourceFile = ts.createSourceFile(
    "src/App.tsx",
    'import { Missing } from "./missing";\nconst local = 1;',
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const importDiagnostic = {
    code: 6133,
    start: sourceFile.text.indexOf("Missing"),
  };
  const localDiagnostic = {
    code: 6133,
    start: sourceFile.text.indexOf("local"),
  };

  assert.equal(diagnosticIsUnusedImport(importDiagnostic, sourceFile), true);
  assert.equal(diagnosticIsUnusedImport(localDiagnostic, sourceFile), false);
});

test("extracts escaped class names without reading attribute values", () => {
  const classes = extractClassNamesFromSelector(
    '.recipe-concentrate-bottle.border-sky-400\\/25:hover, [data-class=".ignored"]',
  );

  assert.deepEqual([...classes].sort(), [
    "border-sky-400/25",
    "recipe-concentrate-bottle",
  ]);
});

test("excludes archived Brewer and Workframe sources", () => {
  assert.equal(isArchivedSource("src/BrewerPrepMethodSelector.tsx"), true);
  assert.equal(isArchivedSource("src/brewerSaltGroups.ts"), true);
  assert.equal(isArchivedSource("src/TasteProfileCard.tsx"), true);
  assert.equal(isArchivedSource("src/TastePreferenceModal.tsx"), true);
  assert.equal(isArchivedSource("src/WorkframeProfileBuilder.tsx"), true);
  assert.equal(isArchivedSource("src/App.tsx"), false);
});

test("ignores archive-only selectors and reports classes absent from all source", () => {
  const unused = findUnusedCssSelectors(
    ".present { color: red } .missing { color: blue } .archived-only, .also-missing { color: green } .archived-only .nested-missing { color: orange }",
    [
      { path: "src/App.tsx", text: 'const className = "present";' },
      {
        path: "src/WorkframeProfileBuilder.tsx",
        text: 'const className = "archived-only";',
      },
    ],
  );

  assert.deepEqual(unused, ["also-missing", "missing", "nested-missing"]);
});
