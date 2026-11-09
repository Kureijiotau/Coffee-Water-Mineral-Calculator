import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import postcss from "postcss";
import ts from "typescript";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(scriptDirectory, "..");
const sourceRoot = path.join(packageRoot, "src");
const archivedSourceNames = new Set([
  "BrewerPrepMethodSelector.tsx",
  "brewerSaltGroups.ts",
  "TastePreferenceModal.tsx",
  "TasteProfileCard.tsx",
  "WorkframeProfileBuilder.tsx",
]);

export function isArchivedSource(filePath) {
  const normalizedPath = filePath.replaceAll("\\", "/");
  return [...archivedSourceNames].some(
    (fileName) =>
      normalizedPath === fileName || normalizedPath.endsWith(`/${fileName}`),
  );
}

function decodeCssEscape(selector, start) {
  let index = start + 1;
  if (index >= selector.length) return { value: "", next: index };

  if (/[0-9a-f]/i.test(selector[index])) {
    const hexStart = index;
    while (
      index < selector.length &&
      index - hexStart < 6 &&
      /[0-9a-f]/i.test(selector[index])
    ) {
      index += 1;
    }
    const codePoint = Number.parseInt(selector.slice(hexStart, index), 16);
    if (/\s/.test(selector[index] ?? "")) index += 1;
    return {
      value: String.fromCodePoint(
        codePoint === 0 || codePoint > 0x10ffff ? 0xfffd : codePoint,
      ),
      next: index,
    };
  }

  if (
    selector[index] === "\n" ||
    selector[index] === "\r" ||
    selector[index] === "\f"
  ) {
    return { value: "", next: index + 1 };
  }
  return { value: selector[index], next: index + 1 };
}

function isCssNameCharacter(character) {
  return Boolean(character && /[-_a-zA-Z0-9\u0080-\uFFFF]/u.test(character));
}

export function extractClassNamesFromSelector(selector) {
  const classNames = new Set();
  let bracketDepth = 0;
  let quote = null;

  for (let index = 0; index < selector.length; index += 1) {
    const character = selector[index];
    if (character === "\\") {
      index = decodeCssEscape(selector, index).next - 1;
      continue;
    }
    if (quote) {
      if (character === quote) quote = null;
      continue;
    }
    if (bracketDepth > 0) {
      if (character === '"' || character === "'") quote = character;
      else if (character === "[") bracketDepth += 1;
      else if (character === "]") bracketDepth -= 1;
      continue;
    }
    if (character === "[") {
      bracketDepth = 1;
      continue;
    }
    if (character !== ".") continue;

    let className = "";
    let nameIndex = index + 1;
    while (nameIndex < selector.length) {
      const nameCharacter = selector[nameIndex];
      if (nameCharacter === "\\") {
        const escaped = decodeCssEscape(selector, nameIndex);
        className += escaped.value;
        nameIndex = escaped.next;
      } else if (isCssNameCharacter(nameCharacter)) {
        className += nameCharacter;
        nameIndex += 1;
      } else {
        break;
      }
    }
    if (className) classNames.add(className);
    index = nameIndex - 1;
  }

  return classNames;
}

function splitSelectorList(selectorList) {
  const selectors = [];
  let selectorStart = 0;
  let bracketDepth = 0;
  let parenthesisDepth = 0;
  let quote = null;

  for (let index = 0; index < selectorList.length; index += 1) {
    const character = selectorList[index];
    if (character === "\\") {
      index = decodeCssEscape(selectorList, index).next - 1;
      continue;
    }
    if (quote) {
      if (character === quote) quote = null;
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
    } else if (character === "[") {
      bracketDepth += 1;
    } else if (character === "]") {
      bracketDepth -= 1;
    } else if (character === "(") {
      parenthesisDepth += 1;
    } else if (character === ")") {
      parenthesisDepth -= 1;
    } else if (
      character === "," &&
      bracketDepth === 0 &&
      parenthesisDepth === 0
    ) {
      selectors.push(selectorList.slice(selectorStart, index).trim());
      selectorStart = index + 1;
    }
  }

  selectors.push(selectorList.slice(selectorStart).trim());
  return selectors.filter(Boolean);
}

function extractSourceTokens(text) {
  return new Set(text.match(/[\p{L}\p{N}_-]+(?:\/[\p{L}\p{N}_-]+)*/gu) ?? []);
}

export function findUnusedCssSelectors(cssText, sourceFiles) {
  const liveTokens = new Set();
  const archivedTokens = new Set();
  for (const sourceFile of sourceFiles) {
    const target = isArchivedSource(sourceFile.path)
      ? archivedTokens
      : liveTokens;
    for (const token of extractSourceTokens(sourceFile.text)) target.add(token);
  }

  const unusedClasses = new Set();
  postcss.parse(cssText).walkRules((rule) => {
    for (const selector of splitSelectorList(rule.selector)) {
      const classNames = extractClassNamesFromSelector(selector);
      for (const className of classNames) {
        if (liveTokens.has(className) || archivedTokens.has(className))
          continue;
        unusedClasses.add(className);
      }
    }
  });

  return [...unusedClasses].sort();
}

function readTsConfig() {
  const tsconfigPath = path.join(packageRoot, "tsconfig.json");
  const configFile = ts.readConfigFile(tsconfigPath, ts.sys.readFile);
  if (configFile.error) {
    throw new Error(
      ts.flattenDiagnosticMessageText(configFile.error.messageText, "\n"),
    );
  }

  return ts.parseJsonConfigFileContent(
    configFile.config,
    ts.sys,
    packageRoot,
    {
      noUnusedLocals: true,
    },
    tsconfigPath,
  );
}

function importedModuleSpecifiers(sourceFile) {
  const specifiers = [];
  const visit = (node) => {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      specifiers.push(node.moduleSpecifier.text);
    } else if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments.length === 1 &&
      ts.isStringLiteral(node.arguments[0])
    ) {
      specifiers.push(node.arguments[0].text);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return specifiers;
}

function collectLiveSourceFiles(
  program,
  entryPath,
  compilerOptions,
  compilerHost,
) {
  const liveFiles = new Map();
  const pending = [path.resolve(entryPath)];

  while (pending.length > 0) {
    const filePath = pending.pop();
    const normalizedPath = path.resolve(filePath);
    if (
      liveFiles.has(normalizedPath) ||
      !normalizedPath.startsWith(`${sourceRoot}${path.sep}`)
    ) {
      continue;
    }
    const sourceFile = program.getSourceFile(normalizedPath);
    if (!sourceFile) continue;
    liveFiles.set(normalizedPath, sourceFile);

    for (const specifier of importedModuleSpecifiers(sourceFile)) {
      const resolvedModule = ts.resolveModuleName(
        specifier,
        normalizedPath,
        compilerOptions,
        compilerHost,
      ).resolvedModule;
      if (resolvedModule) pending.push(resolvedModule.resolvedFileName);
    }
  }

  return [...liveFiles.entries()].map(([filePath, sourceFile]) => ({
    path: path.relative(packageRoot, filePath).replaceAll("\\", "/"),
    filePath,
    sourceFile,
  }));
}

export function diagnosticIsUnusedImport(diagnostic, sourceFile) {
  if (
    (diagnostic.code !== 6133 && diagnostic.code !== 6192) ||
    diagnostic.start === undefined
  ) {
    return false;
  }

  return sourceFile.statements.some(
    (statement) =>
      ts.isImportDeclaration(statement) &&
      diagnostic.start >= statement.getStart(sourceFile) &&
      diagnostic.start < statement.end,
  );
}

function getUnusedImportDiagnostics(program, liveFiles) {
  const diagnostics = [];

  for (const liveFile of liveFiles) {
    if (isArchivedSource(liveFile.path)) continue;
    for (const diagnostic of ts.getPreEmitDiagnostics(
      program,
      liveFile.sourceFile,
    )) {
      if (!diagnosticIsUnusedImport(diagnostic, liveFile.sourceFile)) continue;
      const { line } = liveFile.sourceFile.getLineAndCharacterOfPosition(
        diagnostic.start,
      );
      diagnostics.push(
        `${liveFile.path}:${line + 1}: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, " ")}`,
      );
    }
  }

  return diagnostics;
}

function loadTextSource(liveFile) {
  return {
    path: liveFile.path,
    text: fs.readFileSync(liveFile.filePath, "utf8"),
  };
}

function loadArchivedCssSources() {
  return [...archivedSourceNames]
    .map((fileName) => {
      const filePath = path.join(sourceRoot, fileName);
      if (!fs.existsSync(filePath)) return null;
      return {
        path: `src/${fileName}`,
        text: fs.readFileSync(filePath, "utf8"),
      };
    })
    .filter(Boolean);
}

export function runCheck() {
  const parsedConfig = readTsConfig();
  const compilerHost = ts.createCompilerHost(parsedConfig.options);
  const program = ts.createProgram({
    rootNames: parsedConfig.fileNames,
    options: parsedConfig.options,
    projectReferences: parsedConfig.projectReferences,
    host: compilerHost,
  });
  const liveFiles = collectLiveSourceFiles(
    program,
    path.join(sourceRoot, "main.tsx"),
    parsedConfig.options,
    compilerHost,
  );
  const reportableFiles = liveFiles.filter(
    (file) => !isArchivedSource(file.path),
  );
  const importDiagnostics = getUnusedImportDiagnostics(program, liveFiles);
  const cssText = fs.readFileSync(path.join(sourceRoot, "index.css"), "utf8");
  const unusedCssClasses = findUnusedCssSelectors(cssText, [
    ...reportableFiles.map(loadTextSource),
    ...loadArchivedCssSources(),
  ]);

  if (importDiagnostics.length === 0 && unusedCssClasses.length === 0) {
    console.log(
      `Live source check passed (${reportableFiles.length} active source files checked).`,
    );
    return 0;
  }

  for (const diagnostic of importDiagnostics)
    console.error(`Unused import: ${diagnostic}`);
  for (const className of unusedCssClasses)
    console.error(`Unused custom CSS class: .${className}`);
  return 1;
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  process.exitCode = runCheck();
}
