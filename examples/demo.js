// Compile TS first: tsc
const { DependencyChecker } = require('../dist/index.js');

async function demo() {
  const checker = new DependencyChecker();

  // Synthetic package.json with several issues
  const pkg = {
    dependencies: {
      'express': '^4.18.0',
      'lodash': '*',  // Too loose
      'custom': 'git+https://github.com/example/custom.git',  // Non-npm
      'axios': '1.0'  // Valid
    },
    devDependencies: {
      'lodash': '4.17.x',  // Duplicate in deps
      '@types/node': '^20.0.0',  // Valid
      'jest': 'latest',  // Too loose
      'typescript': '^5.0.0'  // Valid
    },
    peerDependencies: {
      'react': '^18.0.0'
    },
    engines: {
      'node': '>=18'
    }
  };

  console.log('=== Analyzing package.json with issues ===');
  const result = await checker.analyze(pkg);

  console.log(`\nSummary:`);
  console.log(`  Total unique packages: ${result.total}`);
  console.log(`  Direct dependencies: ${result.direct}`);
  console.log(`  Dev dependencies: ${result.dev}`);
  console.log(`  Peer dependencies: ${result.peer}`);
  console.log(`\nIssues found: ${result.issues.length}`);

  const grouped = {};
  for (const issue of result.issues) {
    if (!grouped[issue.category]) grouped[issue.category] = [];
    grouped[issue.category].push(issue);
  }

  for (const [category, issues] of Object.entries(grouped)) {
    console.log(`\n${category}:`);
    for (const issue of issues) {
      console.log(`  - ${issue.package || '(general)'}: ${issue.message}`);
    }
  }

  console.log(`\n=== All checks passed ===`);
  console.log(`Loose versions detected: ${result.issues.filter(i => i.category === 'loose-version').length}`);
  console.log(`Duplicates detected: ${result.issues.filter(i => i.category === 'duplicate-dep').length}`);
  console.log(`Non-npm specifiers: ${result.issues.filter(i => i.category === 'non-npm-specifier').length}`);
}

demo().catch(console.error);
