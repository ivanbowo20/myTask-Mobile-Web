const fs = require('fs');
const path = require('path');
const swc = require('next/dist/build/swc');

console.log('====================================================');
console.log('   DEEP AUDIT & BUG HUNTER SUITE (TaskFlow v2)      ');
console.log('====================================================\n');

let totalIssues = 0;
const findings = [];

function recordIssue(severity, file, message) {
  totalIssues++;
  findings.push({ severity, file, message });
  console.log(`[${severity}] ${file}: ${message}`);
}

// 1. COLLECT ALL SOURCE FILES
function getAllFiles(dir, exts = ['.js', '.jsx']) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.next' && file !== 'graphify-out') {
        results = results.concat(getAllFiles(fullPath, exts));
      }
    } else {
      if (exts.includes(path.extname(file))) {
        results.push(fullPath.replace(/\\/g, '/'));
      }
    }
  });
  return results;
}

const sourceFiles = [
  ...getAllFiles('app'),
  ...getAllFiles('components'),
  ...getAllFiles('lib')
];

console.log(`Total source files to scan: ${sourceFiles.length}\n`);

// 2. AST PARSE & SYNTAX CHECK
console.log('--- 1. AST & SYNTAX COMPILATION SCAN ---');
sourceFiles.forEach(file => {
  try {
    const code = fs.readFileSync(file, 'utf8');
    swc.transformSync(code, {
      filename: file,
      jsc: { parser: { syntax: 'ecmascript', jsx: true } }
    });
  } catch (err) {
    recordIssue('CRITICAL', file, `Syntax/AST Error: ${err.message}`);
  }
});
console.log('✓ AST Check completed.\n');

// 3. INTERNAL IMPORT RESOLUTION SCAN (Check for broken @/ imports)
console.log('--- 2. INTERNAL IMPORT RESOLUTION SCAN ---');
sourceFiles.forEach(file => {
  const code = fs.readFileSync(file, 'utf8');
  const importRegex = /(?:import\s+(?:[\w*\s{},]+)\s+from\s+["'](@\/[^"']+)["'])|(?:import\s*["'](@\/[^"']+)["'])/g;
  let match;
  while ((match = importRegex.exec(code)) !== null) {
    const importPath = match[1] || match[2];
    const relPath = importPath.replace(/^@\//, '');
    
    // Check possible extensions: .js, .jsx, /index.js, or direct
    const candidates = [
      relPath,
      relPath + '.js',
      relPath + '.jsx',
      path.join(relPath, 'index.js').replace(/\\/g, '/'),
      path.join(relPath, 'index.jsx').replace(/\\/g, '/')
    ];
    
    const exists = candidates.some(c => fs.existsSync(c));
    if (!exists) {
      recordIssue('ERROR', file, `Broken internal import "${importPath}" (file not found)`);
    }
  }
});
console.log('✓ Internal import resolution completed.\n');

// 4. UNUSED LUCIDE ICONS & MISSING KEY IN MAP SCAN
console.log('--- 3. UNUSED IMPORTS & MISSING KEYS SCAN ---');
sourceFiles.forEach(file => {
  const code = fs.readFileSync(file, 'utf8');
  
  // Lucide icons
  const lucideMatch = code.match(/import\s*\{([^}]+)\}\s*from\s*["']lucide-react["']/);
  if (lucideMatch) {
    const icons = lucideMatch[1].split(',').map(s => s.trim()).filter(Boolean);
    const body = code.replace(lucideMatch[0], '');
    icons.forEach(icon => {
      const reg = new RegExp(`\\b${icon}\\b`);
      if (!reg.test(body)) {
        recordIssue('WARNING', file, `Unused Lucide icon imported: "${icon}"`);
      }
    });
  }

  // Missing key in .map() rendering JSX
  const mapRegex = /\.map\s*\(\s*(?:\([^)]*\)|[a-zA-Z0-9_]+)\s*=>\s*(?:\(?\s*<([A-Za-z0-9_]+)[^>]*>)/g;
  let mapMatch;
  while ((mapMatch = mapRegex.exec(code)) !== null) {
    const snippet = mapMatch[0];
    if (!snippet.includes('key=') && !snippet.includes('key =')) {
      // Small heuristic check on the next 150 characters to see if key is further down in the opening tag
      const startIdx = mapMatch.index;
      const nearbySlice = code.slice(startIdx, startIdx + 200);
      const tagOpenEnd = nearbySlice.indexOf('>');
      const openingTag = tagOpenEnd !== -1 ? nearbySlice.slice(0, tagOpenEnd + 1) : nearbySlice;
      if (!openingTag.includes('key=') && !openingTag.includes('key =')) {
        recordIssue('WARNING', file, `Possible missing "key" prop in .map() callback around tag: <${mapMatch[1]}>`);
      }
    }
  }
});
console.log('✓ Unused imports & map keys completed.\n');

// 5. HYDRATION HAZARDS SCAN (window / localStorage without SSR guard)
console.log('--- 4. SSR HYDRATION HAZARDS SCAN ---');
sourceFiles.forEach(file => {
  const code = fs.readFileSync(file, 'utf8');
  // Check if file is a server component or client component
  const isClient = code.includes("'use client'") || code.includes('"use client"');
  
  if (!isClient && (code.includes('window.') || code.includes('document.') || code.includes('localStorage.'))) {
    // Check if protected by typeof window !== 'undefined'
    const hasGuard = code.includes("typeof window !== 'undefined'") || code.includes('typeof window != "undefined"');
    if (!hasGuard) {
      recordIssue('ERROR', file, `Server component accesses browser global (window/document/localStorage) without client directive`);
    }
  }
});
console.log('✓ Hydration scan completed.\n');

// 6. ROUTE LINK VALIDATION SCAN (All href="/..." links must point to valid pages)
console.log('--- 5. ROUTE LINK VALIDITY SCAN ---');
const knownRoutes = [
  '/',
  '/dashboard',
  '/tugas',
  '/tugas/hari-ini',
  '/tugas/penting',
  '/tugas/selesai',
  '/kategori',
  '/notifikasi',
  '/pengaturan',
  '/login',
  '/register'
];

sourceFiles.forEach(file => {
  const code = fs.readFileSync(file, 'utf8');
  const hrefRegex = /href:\s*["']([^"']+)["']|href=["']([^"']+)["']/g;
  let m;
  while ((m = hrefRegex.exec(code)) !== null) {
    const link = m[1] || m[2];
    if (link.startsWith('/') && !link.startsWith('/#') && !link.startsWith('/_')) {
      // Strip query or hash
      const cleanPath = link.split('?')[0].split('#')[0];
      if (!knownRoutes.includes(cleanPath)) {
        recordIssue('WARNING', file, `Link points to unmapped route: "${link}"`);
      }
    }
  }
});
console.log('✓ Route link validation completed.\n');

// SUMMARY
console.log('====================================================');
console.log(`SCAN FINISHED WITH ${totalIssues} ISSUE(S) DETECTED.`);
console.log('====================================================\n');

if (totalIssues > 0) {
  console.log('Findings Breakdown:');
  findings.forEach(f => console.log(` - [${f.severity}] ${f.file}: ${f.message}`));
  process.exit(1);
} else {
  console.log('ALL AUDIT CHECKS PASSED WITH 0 ISSUES! 🚀');
  process.exit(0);
}

