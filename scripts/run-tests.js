#!/usr/bin/env node

/**
 * Test Runner Utility
 * Provides easy access to all test scripts
 */

const { execSync } = require('child_process');
const path = require('path');

function showHelp() {
  console.log('🧪 EVM Rescue Bot - Test Runner');
  console.log('===============================');
  console.log('');
  console.log('Usage: node scripts/run-tests.js [test-type]');
  console.log('');
  console.log('Available test types:');
  console.log('  websocket     - Test WebSocket connectivity');
  console.log('  balance       - Check wallet balance');
  console.log('  sepolia       - Full Sepolia validation');
  console.log('  setup         - Setup Sepolia environment');
  console.log('  debug         - Debug WebSocket issues');
  console.log('  unit          - Run unit tests');
  console.log('  integration   - Run integration tests');
  console.log('  all           - Run all tests');
  console.log('');
  console.log('Examples:');
  console.log('  node scripts/run-tests.js websocket');
  console.log('  node scripts/run-tests.js balance');
  console.log('  node scripts/run-tests.js sepolia');
  console.log('');
}

function runScript(scriptPath) {
  try {
    console.log(`🚀 Running: ${scriptPath}`);
    console.log(''.repeat(50));

    execSync(`node ${scriptPath}`, {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    });

    console.log('✅ Script completed successfully');

  } catch (error) {
    console.error('❌ Script failed:', error.message);
    process.exit(1);
  }
}

function runNpmScript(scriptName) {
  try {
    console.log(`🚀 Running npm script: ${scriptName}`);
    console.log(''.repeat(50));

    execSync(`npm run ${scriptName}`, {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    });

    console.log('✅ Script completed successfully');

  } catch (error) {
    console.error('❌ Script failed:', error.message);
    process.exit(1);
  }
}

// Main execution
const testType = process.argv[2];

if (!testType) {
  showHelp();
  process.exit(1);
}

const testDir = path.join(__dirname, '..', 'tests');

switch (testType.toLowerCase()) {
  case 'websocket':
    runScript(path.join(testDir, 'scripts', 'test-websocket-simple.js'));
    break;

  case 'websocket-enhanced':
    runScript(path.join(testDir, 'scripts', 'test-enhanced-websocket.js'));
    break;

  case 'balance':
    runScript(path.join(testDir, 'scripts', 'quick-balance-check.js'));
    break;

  case 'sepolia':
    runScript(path.join(testDir, 'validation', 'validate-sepolia.js'));
    break;

  case 'setup':
    runScript(path.join(testDir, 'scripts', 'setup-sepolia.sh'));
    break;

  case 'debug':
    runScript(path.join(testDir, 'debug', 'debug-websocket.js'));
    break;

  case 'unit':
    runNpmScript('test:unit');
    break;

  case 'integration':
    runNpmScript('test:integration');
    break;

  case 'all':
    console.log('🧪 Running All Tests');
    console.log('====================');

    // Run unit tests
    console.log('\n📦 1. Unit Tests');
    runNpmScript('test:unit');

    // Run WebSocket test
    console.log('\n🌐 2. WebSocket Test');
    runScript(path.join(testDir, 'scripts', 'test-websocket-simple.js'));

    // Run balance check
    console.log('\n💰 3. Balance Check');
    runScript(path.join(testDir, 'scripts', 'quick-balance-check.js'));

    console.log('\n🎉 All tests completed!');
    break;

  case 'help':
  case '--help':
  case '-h':
    showHelp();
    break;

  default:
    console.error(`❌ Unknown test type: ${testType}`);
    console.log('Run "node scripts/run-tests.js help" for available options');
    process.exit(1);
}