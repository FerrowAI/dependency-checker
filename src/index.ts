// Issue found during analysis
export interface Issue {
  severity: 'info' | 'warning' | 'error';
  category: string;
  message: string;
  package?: string;
}

// Analysis result
export interface AnalysisResult {
  total: number;
  direct: number;
  dev: number;
  peer: number;
  issues: Issue[];
}

// Semver range patterns
const SEMVER_PATTERN = /^(\^|~|>=|<=|>|<|=)?\d+(\.\d+)?(\.\d+)?$/;
const LOOSE_PATTERNS = [/^\*$/, /^latest$/];

// Check if a version range is valid semver
function isValidSemver(version: string): boolean {
  if (version === '*' || version === 'latest') return false; // Too loose
  if (version.match(/^(https?|file):\/\//)) return false; // Non-npm specifier
  if (version.match(/^git\+/)) return false; // Git specifier
  return true;
}

// Validate semver range (basic check)
function validateSemverRange(range: string): boolean {
  // Allow common patterns: ^1.0.0, ~1.0.0, >=1.0.0, 1.0.0, etc.
  if (SEMVER_PATTERN.test(range)) return true;
  if (LOOSE_PATTERNS.some(p => p.test(range))) return false;
  // Allow comma-separated ranges
  if (range.includes('||')) return true;
  if (range.includes(' ')) {
    return range.split(' ').every(r => r === '' || SEMVER_PATTERN.test(r) || r === '-');
  }
  return false;
}

export class DependencyChecker {
  private fetch?: (url: string) => Promise<any>;

  constructor(fetchFn?: (url: string) => Promise<any>) {
    this.fetch = fetchFn;
  }

  // Analyze a package.json for issues
  async analyze(packageJson: {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    peerDependencies?: Record<string, string>;
    engines?: Record<string, string>;
  }): Promise<AnalysisResult> {
    const issues: Issue[] = [];
    const deps = packageJson.dependencies || {};
    const devDeps = packageJson.devDependencies || {};
    const peerDeps = packageJson.peerDependencies || {};

    // Count total dependencies
    const total = new Set([...Object.keys(deps), ...Object.keys(devDeps), ...Object.keys(peerDeps)]).size;

    // 1. Check for loose version ranges
    for (const [pkg, version] of Object.entries(deps)) {
      if (version === '*' || version === 'latest') {
        issues.push({
          severity: 'warning',
          category: 'loose-version',
          message: `Dependency "${pkg}" uses too loose version range: "${version}"`,
          package: pkg,
        });
      }
      if (!isValidSemver(version)) {
        issues.push({
          severity: 'warning',
          category: 'non-npm-specifier',
          message: `Dependency "${pkg}" uses non-npm specifier: "${version}"`,
          package: pkg,
        });
      }
      if (!validateSemverRange(version)) {
        issues.push({
          severity: 'warning',
          category: 'invalid-semver',
          message: `Dependency "${pkg}" has invalid semver range: "${version}"`,
          package: pkg,
        });
      }
    }

    // 2. Check for duplicates in deps and devDeps
    for (const pkg of Object.keys(deps)) {
      if (pkg in devDeps) {
        issues.push({
          severity: 'warning',
          category: 'duplicate-dep',
          message: `Package "${pkg}" is in both dependencies and devDependencies`,
          package: pkg,
        });
      }
    }

    // 3. Check engines version compatibility
    if (packageJson.engines?.node) {
      const nodeVersion = packageJson.engines.node;
      if (!validateSemverRange(nodeVersion)) {
        issues.push({
          severity: 'info',
          category: 'engines',
          message: `Node.js engine specification may be invalid: "${nodeVersion}"`,
        });
      }
    }

    // 4. Check for empty or suspicious patterns
    for (const [pkg, version] of Object.entries({ ...deps, ...devDeps, ...peerDeps })) {
      if (version.startsWith('>=') && !version.includes('.')) {
        issues.push({
          severity: 'info',
          category: 'loose-min-version',
          message: `Package "${pkg}" has a minimum version without patch: "${version}"`,
          package: pkg,
        });
      }
    }

    return {
      total,
      direct: Object.keys(deps).length,
      dev: Object.keys(devDeps).length,
      peer: Object.keys(peerDeps).length,
      issues,
    };
  }
}

export default DependencyChecker;
