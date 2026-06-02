#!/usr/bin/env node
/**
 * Plan system test runner — `npm run test:plans`
 */
import 'reflect-metadata';
import '../bootstrap-env';
import { bootstrapPlanTests, type TestResult } from './plans.test';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

function printHeader() {
  console.log(`${CYAN}${BOLD}=================================${RESET}`);
  console.log(`${CYAN}${BOLD}  PLAN SYSTEM TEST SUITE${RESET}`);
  console.log(`${CYAN}${BOLD}=================================${RESET}\n`);
}

function printResult(r: TestResult) {
  const icon = r.pass ? `${GREEN}✅ PASS${RESET}` : `${RED}❌ FAIL${RESET}`;
  console.log(`${icon}  ${r.name}${r.error ? ` — ${RED}${r.error}${RESET}` : ''}`);
}

function printSummary(results: TestResult[]) {
  const passed = results.filter((r) => r.pass).length;
  const total = results.length;
  console.log(`\n${CYAN}${BOLD}=================================${RESET}`);
  if (passed === total) {
    console.log(`${GREEN}${BOLD}RESULTS: ${passed}/${total} tests passed ✅${RESET}`);
    console.log(`${GREEN}All plan limits working correctly!${RESET}`);
  } else {
    console.log(`${RED}${BOLD}RESULTS: ${passed}/${total} tests passed${RESET}`);
  }
  console.log(`${CYAN}${BOLD}=================================${RESET}\n`);
}

async function main() {
  printHeader();
  let app;
  try {
    const boot = await bootstrapPlanTests();
    app = boot.app;
    const { results } = boot;

    let section = '';
    for (const r of results) {
      const lower = r.name.toLowerCase();
      let newSection = '';
      if (lower.includes('silver')) newSection = 'SILVER PLAN TESTS';
      else if (lower.includes('gold')) newSection = 'GOLD PLAN TESTS';
      else if (lower.includes('expir') || lower.includes('reminder')) newSection = 'EXPIRY TESTS';
      else if (
        lower.includes('payment') ||
        lower.includes('downgrade') ||
        lower.includes('accessible')
      ) {
        newSection = 'EDGE CASE TESTS';
      } else if (section === '') newSection = 'FREE PLAN TESTS';

      if (newSection && newSection !== section) {
        section = newSection;
        console.log(`\n${BOLD}${section}:${RESET}`);
      }
      printResult(r);
    }

    const passed = results.filter((r) => r.pass).length;
    printSummary(results);
    process.exit(passed === results.length ? 0 : 1);
  } catch (err) {
    console.error(`${RED}Test suite failed to start:${RESET}`, err);
    process.exit(1);
  } finally {
    await app?.close();
  }
}

void main();
