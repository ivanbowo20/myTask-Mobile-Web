const fs = require('fs');
const swc = require('next/dist/build/swc');

console.log('=== TASK 4C VERIFICATION SUITE ===\n');

let allPassed = true;

// 1. AST PARSE CHECK
console.log('1. AST Parsing Check:');
const filesToTest = [
  'components/layout/Sidebar.js',
  'components/layout/Navbar.js',
  'components/layout/BottomNav.js',
  'app/(dashboard)/dashboard/page.js',
  'app/(dashboard)/tugas/page.js',
  'app/(dashboard)/tugas/hari-ini/page.js',
  'app/(dashboard)/tugas/penting/page.js',
  'app/(dashboard)/tugas/selesai/page.js',
  'app/(dashboard)/kategori/page.js',
  'app/(dashboard)/notifikasi/page.js',
  'app/(dashboard)/layout.js'
];

filesToTest.forEach(f => {
  try {
    const code = fs.readFileSync(f, 'utf8');
    swc.transformSync(code, {
      filename: f,
      jsc: { parser: { syntax: 'ecmascript', jsx: true } }
    });
    console.log(`  [PASS] AST parse: ${f}`);
  } catch (err) {
    allPassed = false;
    console.error(`  [FAIL] AST parse: ${f} -> ${err.message}`);
  }
});

// 2. SIDEBAR 4 ITEMS CHECK
console.log('\n2. Sidebar Navigation Items Check:');
const sidebarContent = fs.readFileSync('components/layout/Sidebar.js', 'utf8');
const hrefMatches = [];
const regex = /href:\s*["']([^"']+)["']/g;
let m;
while ((m = regex.exec(sidebarContent)) !== null) {
  hrefMatches.push(m[1]);
}
console.log(`  Found hrefs in Sidebar: ${JSON.stringify(hrefMatches)}`);
const expectedHrefs = ['/dashboard', '/tugas', '/kategori', '/pengaturan'];
const matchesExpected =
  hrefMatches.length === 4 &&
  expectedHrefs.every(h => hrefMatches.includes(h));

if (matchesExpected) {
  console.log('  [PASS] Sidebar has exactly 4 items: /dashboard, /tugas, /kategori, /pengaturan');
} else {
  allPassed = false;
  console.error(`  [FAIL] Sidebar items mismatch. Expected 4, got ${hrefMatches.length}`);
}

// 3. /notifikasi IN SIDEBAR CHECK
console.log('\n3. /notifikasi in Sidebar Check:');
if (sidebarContent.includes('/notifikasi')) {
  allPassed = false;
  console.error('  [FAIL] Sidebar still contains link to /notifikasi');
} else {
  console.log('  [PASS] Sidebar contains 0 links to /notifikasi');
}

// 3b. MOBILE BOTTOM NAV ITEMS CHECK
console.log('\n3b. Mobile Bottom Navigation Items Check:');
const bottomNavContent = fs.readFileSync('components/layout/BottomNav.js', 'utf8');
const bottomHrefs = [];
let bMatch;
const bRegex = /href:\s*["']([^"']+)["']/g;
while ((bMatch = bRegex.exec(bottomNavContent)) !== null) {
  bottomHrefs.push(bMatch[1]);
}
console.log(`  Found hrefs in BottomNav: ${JSON.stringify(bottomHrefs)}`);
if (bottomHrefs.length === 4 && expectedHrefs.every(h => bottomHrefs.includes(h))) {
  console.log('  [PASS] BottomNav has exactly 4 items: /dashboard, /tugas, /kategori, /pengaturan');
} else {
  allPassed = false;
  console.error(`  [FAIL] BottomNav items mismatch. Expected 4 items [${expectedHrefs.join(', ')}], got ${JSON.stringify(bottomHrefs)}`);
}

// 3c. REMINDER PICKER PURE BLACK CHECK
console.log('\n3c. ReminderPicker Pure Black Background Check:');
const reminderContent = fs.readFileSync('components/tugas/ReminderPicker.jsx', 'utf8');
if (reminderContent.includes('18120E')) {
  allPassed = false;
  console.error('  [FAIL] ReminderPicker still contains legacy brown color #18120E');
} else {
  console.log('  [PASS] ReminderPicker contains 0 remnants of #18120E (pure black gradients).');
}

// 4. HEADER "Tambah Tugas" DUPLICATION CHECK
console.log('\n4. Header "Tambah Tugas" Duplication Check:');
const taskHeaderFiles = [
  'app/(dashboard)/tugas/page.js',
  'app/(dashboard)/tugas/hari-ini/page.js',
  'app/(dashboard)/tugas/penting/page.js',
  'app/(dashboard)/tugas/selesai/page.js'
];

taskHeaderFiles.forEach(f => {
  const code = fs.readFileSync(f, 'utf8');
  // Check if there is an Add Task button in the header section
  const headerMatch = code.match(/\{\/\*\s*Header\s*\*\/\}[\s\S]*?(?=\{\/\*|$)/);
  if (headerMatch && (headerMatch[0].includes('Tambah Tugas') || headerMatch[0].includes('openAddTask'))) {
    allPassed = false;
    console.error(`  [FAIL] Header of ${f} contains "Tambah Tugas" button!`);
  } else {
    console.log(`  [PASS] ${f} has 0 "Tambah Tugas" button in header.`);
  }
});

// 5. NAVBAR TAMBAH TUGAS & NOTIF BELL CHECK
console.log('\n5. Navbar Tambah Tugas & Bell Check:');
const navbarContent = fs.readFileSync('components/layout/Navbar.js', 'utf8');
if (navbarContent.includes('Tambah Tugas') && navbarContent.includes('NotifDropdown')) {
  console.log('  [PASS] Navbar has "Tambah Tugas" button and NotifDropdown (bell).');
} else {
  allPassed = false;
  console.error('  [FAIL] Navbar missing required Tambah Tugas or NotifDropdown.');
}

// 6. STAT CARDS IN DASHBOARD CHECK
console.log('\n6. Dashboard Stat Cards Check:');
const dashboardContent = fs.readFileSync('app/(dashboard)/dashboard/page.js', 'utf8');
const hasBadges = /["']Semua["']|["']Jatuh Tempo["']|["']Prioritas["']|["']Beres["']/.test(
  dashboardContent.slice(dashboardContent.indexOf('{/* 4 Stat Cards */}'), dashboardContent.indexOf('{/* Section: Tenggat Waktu'))
);
if (hasBadges) {
  allPassed = false;
  console.error('  [FAIL] Stat cards still contain legacy badges ("Semua", "Jatuh Tempo", "Prioritas", "Beres")');
} else {
  console.log('  [PASS] Stat cards have 0 legacy badges.');
}

// Check 4 stat cards exist
const hasTotal = dashboardContent.includes('Total Tugas');
const hasHariIni = dashboardContent.includes('Hari Ini');
const hasPenting = dashboardContent.includes('Penting');
const hasSelesai = dashboardContent.includes('Selesai');
if (hasTotal && hasHariIni && hasPenting && hasSelesai) {
  console.log('  [PASS] 4 Stat Cards present: Total Tugas, Hari Ini, Penting, Selesai.');
} else {
  allPassed = false;
  console.error('  [FAIL] Missing stat card.');
}

// 7. UNUSED IMPORTS CHECK ACROSS MODIFIED FILES
console.log('\n7. Unused Lucide Icons & Component Imports Check:');
filesToTest.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  const lucideMatch = content.match(/import\s*\{([^}]+)\}\s*from\s*["']lucide-react["']/);
  if (lucideMatch) {
    const icons = lucideMatch[1].split(',').map(s => s.trim()).filter(Boolean);
    const body = content.replace(lucideMatch[0], '');
    icons.forEach(icon => {
      const reg = new RegExp(`\\b${icon}\\b`);
      if (!reg.test(body)) {
        allPassed = false;
        console.error(`  [FAIL] ${f} has unused icon import: ${icon}`);
      }
    });
  }
});
console.log('  [PASS] Checked all Lucide icon imports.');

console.log('\n=== VERIFICATION RESULT ===');
console.log(allPassed ? 'ALL CHECKS PASSED PERFECTLY!' : 'SOME CHECKS FAILED!');
process.exit(allPassed ? 0 : 1);

