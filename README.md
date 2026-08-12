# dependency-checker

Offline static analyzer for `package.json`. Detects loose version ranges (`*`, `latest`), duplicate dependencies, invalid semver, non-npm specifiers (git/file/http), and engine misconfigurations. Works without network.

## Quickstart

```typescript
import { DependencyChecker } from 'dependency-checker';

const checker = new DependencyChecker();

const result = await checker.analyze({
  dependencies: {
    'lodash': '*',           // Too loose
    'axios': '^1.0.0',       // OK
    'mypkg': 'git+https://...' // Non-npm
  },
  devDependencies: {
    'lodash': '^4.0.0',      // Duplicate!
    'jest': '^29.0.0'        // OK
  }
});

console.log(result.issues);
// [
//   { severity: 'warning', category: 'loose-version', package: 'lodash', message: '...' },
//   { severity: 'warning', category: 'duplicate-dep', package: 'lodash', message: '...' },
//   { severity: 'warning', category: 'non-npm-specifier', package: 'mypkg', message: '...' }
// ]
```

## API

### Constructor

```typescript
new DependencyChecker(fetchFn?: (url: string) => Promise<any>)
```

Optional `fetchFn` enables online checks (e.g., fetch latest versions from npm registry). If omitted, only offline analysis runs.

### Methods

#### `analyze(packageJson)`

Analyze `package.json` structure and return issues.

```typescript
const result = await checker.analyze(packageJson);
```

Returns:
```typescript
{
  total: number;           // Unique packages across all dep types
  direct: number;          // Count of dependencies
  dev: number;             // Count of devDependencies
  peer: number;            // Count of peerDependencies
  issues: Issue[];         // Detected problems
}
```

## Issue Categories

- **loose-version** (warning) — Version is `*` or `latest`
- **non-npm-specifier** (warning) — Version is git/file/http URL
- **invalid-semver** (warning) — Range doesn't parse as valid semver
- **duplicate-dep** (warning) — Package in both deps and devDeps
- **loose-min-version** (info) — Min version like `>=1` without patch
- **engines** (info) — Invalid Node.js engine specification

## Scope & Limits

- **Offline by default** — no network calls unless fetch is provided
- **Static analysis only** — doesn't install or validate actual versions
- **Package.json structure only** — doesn't examine lock files or installed packages
- **Basic semver validation** — recognizes common patterns; complex ranges may report false positives
- **No vulnerability data** — doesn't check npm advisory database
- **No update suggestions** — reports issues, not "consider upgrading to X"

## Example: Synthetic Package.json

```typescript
const pkg = {
  dependencies: {
    'express': '^4.18.0',
    'lodash': '*',
    'custom': 'git+https://github.com/example/custom.git'
  },
  devDependencies: {
    'lodash': '4.17.x',      // Duplicate in deps
    '@types/node': '^20.0.0',
    'jest': 'latest'         // Too loose
  },
  peerDependencies: {
    'react': '^18.0.0'
  },
  engines: {
    'node': '>=18'
  }
};

const result = await checker.analyze(pkg);
console.log(`Issues: ${result.issues.length}`); // 4
console.log(`Total packages: ${result.total}`);  // 6
```

## License

MIT

---

Sponsored by [Ferrow](https://ferrow.ai)
