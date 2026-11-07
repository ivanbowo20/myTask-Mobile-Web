const fs = require('fs');
const path = require('path');

function getFiles(dir, exts) {
  let res = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.next') {
        res = res.concat(getFiles(fullPath, exts));
      }
    } else if (exts.some(ext => file.endsWith(ext))) {
      res.push(fullPath);
    }
  });
  return res;
}

const files = getFiles('components', ['.js', '.jsx']).concat(getFiles('app', ['.js', '.jsx']));

console.log('Auditing', files.length, 'UI files for common React, Framer, and Next.js hooks imports...');

const hooksToCheck = [
  'useReducedMotion',
  'useDesktopMotion',
  'useMotionValue',
  'useSpring',
  'useTransform',
  'useState',
  'useEffect',
  'useMemo',
  'useCallback',
  'useRef',
  'useContext',
  'usePathname',
  'useRouter',
  'useSearchParams'
];

let issues = 0;

files.forEach(file => {
  const code = fs.readFileSync(file, 'utf8');
  hooksToCheck.forEach(hook => {
    // Regex matching hook as a function call
    const usageRegex = new RegExp('\\b' + hook + '\\s*\\(', 'g');
    const importRegex = new RegExp('\\b' + hook + '\\b');
    
    // Check if used in code body
    if (usageRegex.test(code)) {
      // Check if declared or imported
      const hasImport = code.split('\n').some(line => line.includes('import ') && importRegex.test(line));
      const hasDeclaration = new RegExp('(function\\s+' + hook + '|const\\s+' + hook + '|let\\s+' + hook + '|var\\s+' + hook + ')').test(code);
      
      if (!hasImport && !hasDeclaration) {
        console.error('❌ [MISSING_IMPORT] In file:', file, 'Identifier:', hook);
        issues++;
      }
    }
  });
});

if (issues === 0) {
  console.log('✅ ALL', files.length, 'files PASSED! Zero missing hook imports detected across entire project.');
} else {
  console.error('⚠️ Found', issues, 'issues!');
  process.exit(1);
}
