#!/usr/bin/env node

/**
 * Simple SQL syntax validator for the pricing migration
 * This doesn't execute the SQL but checks for basic syntax issues
 */

const fs = require('fs');
const path = require('path');

function validateSQL() {
  console.log('🔍 Validating SQL syntax for pricing migration...\n');

  const sqlPath = path.join(__dirname, 'db', '035_flexible_pricing_system.sql');

  if (!fs.existsSync(sqlPath)) {
    console.error('❌ Migration file not found');
    process.exit(1);
  }

  const sql = fs.readFileSync(sqlPath, 'utf8');

  // Basic syntax checks
  const checks = [
    {
      name: 'No EXCLUDE constraints with WHERE',
      pattern: /EXCLUDE WHERE/g,
      shouldExist: false
    },
    {
      name: 'Has CREATE TABLE statements',
      pattern: /CREATE TABLE/g,
      shouldExist: true
    },
    {
      name: 'Has pricing_tiers table creation',
      pattern: /CREATE TABLE.*pricing_tiers/g,
      shouldExist: true
    },
    {
      name: 'Has service_pricing_overrides table creation',
      pattern: /CREATE TABLE.*service_pricing_overrides/g,
      shouldExist: true
    },
    {
      name: 'Has calculate_payment function',
      pattern: /CREATE.*FUNCTION calculate_payment/g,
      shouldExist: true
    },
    {
      name: 'Has trigger functions',
      pattern: /CREATE.*TRIGGER/g,
      shouldExist: true
    },
    {
      name: 'Has RLS policies',
      pattern: /CREATE POLICY/g,
      shouldExist: true
    }
  ];

  let allPassed = true;

  checks.forEach(check => {
    const matches = sql.match(check.pattern);
    const exists = matches && matches.length > 0;

    if (check.shouldExist && !exists) {
      console.error(`❌ FAILED: ${check.name} - Pattern not found`);
      allPassed = false;
    } else if (!check.shouldExist && exists) {
      console.error(`❌ FAILED: ${check.name} - Pattern should not exist but found ${matches.length} matches`);
      allPassed = false;
    } else {
      console.log(`✅ PASSED: ${check.name}`);
    }
  });

  // Check for balanced parentheses in CREATE TABLE statements
  const tableMatches = sql.match(/CREATE TABLE[\s\S]*?\);/g);
  if (tableMatches) {
    tableMatches.forEach((tableSql, index) => {
      const openParens = (tableSql.match(/\(/g) || []).length;
      const closeParens = (tableSql.match(/\)/g) || []).length;

      if (openParens !== closeParens) {
        console.error(`❌ FAILED: Unbalanced parentheses in table ${index + 1}`);
        allPassed = false;
      } else {
        console.log(`✅ PASSED: Balanced parentheses in table ${index + 1}`);
      }
    });
  }

  if (allPassed) {
    console.log('\n🎉 All syntax checks passed! Migration is ready for execution.');
  } else {
    console.log('\n❌ Some syntax checks failed. Please review the migration file.');
    process.exit(1);
  }
}

validateSQL();