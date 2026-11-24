const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;

const filesToCheck = [
  'lib/use-desktop-motion.js',
  'lib/dopamine-fx.js',
  'app/(dashboard)/template.js',
  'components/layout/DashboardShell.js',
  'components/layout/Sidebar.js',
  'components/ui/DesktopInteractiveCard.js',
  'components/ui/AnimatedContent.jsx',
  'components/ui/NumberTicker.js',
  'components/ui/BlurText.js',
  'app/(dashboard)/dashboard/page.js',
  'app/(dashboard)/notebook/page.js',
  'app/(dashboard)/kategori/page.js',
  'components/tugas/TaskCard.js',
  'components/tugas/AddTaskModal.js',
  'components/tugas/EditTaskModal.js',
  'lib/task-context.js',
  'app/(dashboard)/tugas/page.js',
  'components/kategori/CategoryCard.js',
  'components/notebook/NotebookCard.js',
  'lib/sync/contract.js',
  'lib/sync/subtasks.js',
  'lib/sync/ordering.js',
  'lib/modules/sync/sync.repository.js',
  'lib/modules/sync/sync.service.js',
  'app/api/sync/route.js',
  'lib/local/db.js',
  'lib/local/outbox.js',
  'lib/local/sync-engine.js',
  'lib/local/storage.js',
  'lib/local/feature-flag.js',
  'lib/local/session-snapshot.js',
  'lib/use-online-status.js',
  'components/pwa/OfflineStatusBadge.js',
  'lib/notebook-context.js',
  'components/ui/DesktopCardMotion.js',
  'components/ui/MotionContainer.js',
  'app/(dashboard)/tugas/hari-ini/page.js',
  'app/(dashboard)/tugas/penting/page.js',
  'app/(dashboard)/tugas/selesai/page.js',
  'app/(dashboard)/notifikasi/page.js',
  'app/(dashboard)/pengaturan/page.js',
  'app/api/notifications/dispatch/route.js',
  'app/api/notifications/test/route.js',
  'lib/pwa.js',
  'components/notifikasi/NotificationBanner.js',
  'lib/modules/tasks/task.service.js',
  'scripts/setup-supabase-cron.js',
];

const allowedGlobals = new Set([
  'window',
  'document',
  'setTimeout',
  'clearTimeout',
  'setInterval',
  'clearInterval',
  'Date',
  'Math',
  'Number',
  'String',
  'Boolean',
  'Array',
  'Object',
  'Set',
  'Map',
  'JSON',
  'console',
  'fetch',
  'requestAnimationFrame',
  'cancelAnimationFrame',
  'performance',
  'sessionStorage',
  'localStorage',
  'process',
  'React',
  'undefined',
  'null',
  'NaN',
  'isNaN',
  'parseInt',
  'parseFloat',
  'encodeURIComponent',
  'decodeURIComponent',
  'Intl',
  'Promise',
  'Error',
  'Event',
  'CustomEvent',
  'URL',
  'URLSearchParams',
  'FormData',
  'Blob',
  'File',
  'navigator',
  'location',
  'history',
  'globalThis',
  'Symbol',
  'crypto',
  'AbortController',
  'Buffer',
  'Uint8Array',
  'Notification',
  'require',
  '__dirname',
  '__filename',
]);

let totalErrors = 0;

console.log('=== MEMULAI STATIC AST SCOPE AUDIT ===\n');

for (const relPath of filesToCheck) {
  const fullPath = path.resolve(process.cwd(), relPath);
  if (!fs.existsSync(fullPath)) {
    console.error(`[ERROR] File tidak ditemukan: ${relPath}`);
    totalErrors++;
    continue;
  }

  const code = fs.readFileSync(fullPath, 'utf8');
  let ast;

  try {
    ast = parser.parse(code, {
      sourceType: 'module',
      plugins: ['jsx'],
    });
  } catch (err) {
    console.error(`[SYNTAX ERROR] Gagal parse ${relPath}:`, err.message);
    totalErrors++;
    continue;
  }

  const unboundIdentifiers = new Set();

  traverse(ast, {
    ReferencedIdentifier(identPath) {
      const name = identPath.node.name;
      if (allowedGlobals.has(name)) return;

      const binding = identPath.scope.getBinding(name);
      if (!binding) {
        // Abaikan jika properti object atau tipe khusus
        unboundIdentifiers.add(name);
      }
    },
    JSXIdentifier(jsxPath) {
      // Periksa apakah nama komponen JSX (huruf kapital) terdefinisi dalam scope
      const name = jsxPath.node.name;
      if (/^[A-Z]/.test(name)) {
        if (jsxPath.parentPath.isJSXMemberExpression() && jsxPath.parentPath.node.property === jsxPath.node) {
          return;
        }
        const binding = jsxPath.scope.getBinding(name);
        if (!binding && !allowedGlobals.has(name)) {
          unboundIdentifiers.add(name);
        }
      }
    },
  });

  if (unboundIdentifiers.size > 0) {
    console.error(`[SCOPE ERROR] ${relPath} memiliki identifier yang tidak terikat/undefined:`);
    for (const id of unboundIdentifiers) {
      console.error(`  - ${id}`);
    }
    totalErrors += unboundIdentifiers.size;
  } else {
    console.log(`[PASS] ${relPath} - AST & Scope 100% Valid.`);
  }
}

console.log('\n=== HASIL AUDIT AST ===');
if (totalErrors === 0) {
  console.log('SEMUA FILE LOLOS VERIFIKASI AST (0 undefined variables, 0 syntax error).');
  process.exit(0);
} else {
  console.error(`DITEMUKAN ${totalErrors} ERROR AST!`);
  process.exit(1);
}
