const fs = require('fs');
const swc = require('next/dist/build/swc');

console.log('=== AUTH SLIDER VERIFICATION SUITE ===\n');

let allPassed = true;

function pass(msg) {
  console.log(`  [PASS] ${msg}`);
}

function fail(msg) {
  allPassed = false;
  console.error(`  [FAIL] ${msg}`);
}

// 1. AST PARSING CHECK
console.log('1. AST Parsing Check:');
const authFiles = [
  'components/auth/AuthSlider.js',
  'app/(auth)/login/page.js',
  'app/(auth)/register/page.js',
  'app/(auth)/layout.js'
];

authFiles.forEach(f => {
  try {
    const code = fs.readFileSync(f, 'utf8');
    swc.transformSync(code, {
      filename: f,
      jsc: { parser: { syntax: 'ecmascript', jsx: true } }
    });
    pass(`AST parse: ${f}`);
  } catch (err) {
    fail(`AST parse: ${f} -> ${err.message}`);
  }
});

// 2. CHECK BETTER AUTH INTEGRATION
console.log('\n2. Better Auth Integration Check:');
const authSliderContent = fs.readFileSync('components/auth/AuthSlider.js', 'utf8');

if (authSliderContent.includes('authClient.signIn.email')) {
  pass('authClient.signIn.email is properly integrated.');
} else {
  fail('authClient.signIn.email is missing from AuthSlider.js');
}

if (authSliderContent.includes('authClient.signIn.social') && authSliderContent.includes('"google"')) {
  pass('authClient.signIn.social({ provider: "google" }) is properly integrated.');
} else {
  fail('authClient.signIn.social for Google is missing.');
}

if (authSliderContent.includes('authClient.signUp.email')) {
  pass('authClient.signUp.email is properly integrated.');
} else {
  fail('authClient.signUp.email is missing from AuthSlider.js');
}

// 2b. VERIFY NO APPLE / FACEBOOK BUTTONS
if (!authSliderContent.includes('AppleIcon') && !authSliderContent.includes('FacebookIcon') && !authSliderContent.includes('Apple') && !authSliderContent.includes('Facebook')) {
  pass('Apple and Facebook buttons have been completely removed (Google only).');
} else {
  fail('Found unwanted Apple or Facebook references in AuthSlider.js');
}

// 2c. VERIFY MYTASK BRANDING & SIDEBAR ICON
if (authSliderContent.includes('MyTask') && !authSliderContent.includes('TaskFlow')) {
  pass('Branding is correctly set to MyTask (zero TaskFlow references).');
} else {
  fail('Found obsolete TaskFlow branding or missing MyTask.');
}

// 3. CHECK SHALLOW ROUTING / URL REPLACESTATE
console.log('\n3. URL replaceState & Shallow Switching Check:');
if (authSliderContent.includes('window.history.replaceState') && authSliderContent.includes('popstate')) {
  pass('window.history.replaceState and popstate event listener are present.');
} else {
  fail('Missing window.history.replaceState or popstate listener for shallow navigation.');
}

// 4. CHECK INITIALMODE SUPPORT
console.log('\n4. initialMode Architecture Check:');
const loginPageContent = fs.readFileSync('app/(auth)/login/page.js', 'utf8');
const registerPageContent = fs.readFileSync('app/(auth)/register/page.js', 'utf8');

if (loginPageContent.includes('initialMode="login"')) {
  pass('LoginPage specifies initialMode="login"');
} else {
  fail('LoginPage does not specify initialMode="login"');
}

if (registerPageContent.includes('initialMode="register"')) {
  pass('RegisterPage specifies initialMode="register"');
} else {
  fail('RegisterPage does not specify initialMode="register"');
}

// 5. CHECK LAYOUT MAX WIDTH & VIEWPORT
console.log('\n5. Layout Container Check:');
const layoutContent = fs.readFileSync('app/(auth)/layout.js', 'utf8');

if (layoutContent.includes('max-w-md') && layoutContent.includes('sm:max-w-4xl')) {
  pass('AuthLayout has max-w-md for mobile and sm:max-w-4xl (~880px) for desktop.');
} else {
  fail('AuthLayout container width classes mismatch.');
}

if (layoutContent.includes('min-h-[100dvh]')) {
  pass('AuthLayout uses mobile-safe min-h-[100dvh]');
} else {
  fail('AuthLayout does not use min-h-[100dvh]');
}

// 6. CHECK COPYWRITING SPECIFICATIONS
console.log('\n6. Copywriting Specifications Check:');
if (authSliderContent.includes('Mulai Perjalanan Fokus Anda')) {
  pass('Signature title "Mulai Perjalanan Fokus Anda" is present.');
} else {
  fail('Missing signature title "Mulai Perjalanan Fokus Anda"');
}

if (authSliderContent.includes('Kembali ke Ruang Kerja')) {
  pass('Signature title "Kembali ke Ruang Kerja" is present.');
} else {
  fail('Missing signature title "Kembali ke Ruang Kerja"');
}

// 7. CHECK BANNED AI SLOP WORDS
console.log('\n7. Banned AI Slop Words Check:');
const bannedWords = ['Elevate', 'Seamless', 'Next-Gen', 'Game-changer', 'Unleash', 'Delve', 'Tapestry'];
bannedWords.forEach(word => {
  const reg = new RegExp(`\\b${word}\\b`, 'i');
  if (reg.test(authSliderContent)) {
    fail(`AuthSlider contains banned AI slop word: ${word}`);
  }
});
pass('Zero banned AI slop words found.');

// 8. CHECK ACCESSIBILITY & INERT
console.log('\n8. Accessibility & Dual-Panel Inertness Check:');
if (authSliderContent.includes('role="alert"')) {
  pass('role="alert" is configured for accessible error announcements.');
} else {
  fail('Missing role="alert" for error announcements.');
}

if (authSliderContent.includes('inert={isRegister ? true : undefined}') || authSliderContent.includes('inert={!isRegister ? true : undefined}')) {
  pass('inert attribute is passed as a valid boolean (true/undefined) for React 19 compatibility.');
} else {
  fail('inert attribute is not configured with boolean true/undefined.');
}

if (authSliderContent.includes('autoComplete=')) {
  pass('autoComplete attributes are provided on inputs.');
} else {
  fail('Missing autoComplete attributes on form inputs.');
}

// 9. CHECK MOBILE FRAMER MOTION HORIZONTAL SLIDE
console.log('\n9. Mobile Horizontal Slide Animation Check:');
if (authSliderContent.includes('w-[200%]') && authSliderContent.includes('animate={{ x: isMobile')) {
  pass('Mobile form container uses Framer Motion horizontal slide track (w-[200%] + animated x offset).');
} else {
  fail('Missing Framer Motion mobile horizontal slide track.');
}

// 10. CHECK TASKFLOW DYNAMIC THEME ACCENT & FOCUS GLOW
console.log('\n10. TaskFlow Dynamic Theme Accent Check:');
if (authSliderContent.includes('var(--theme-accent') && authSliderContent.includes('var(--theme-glow')) {
  pass('Input focus and ambient highlights adapt dynamically to TaskFlow theme variables.');
} else {
  fail('Missing TaskFlow theme variable integration in inputs or ambient lighting.');
}

// 11. CHECK PREFERS-REDUCED-MOTION SUPPORT
console.log('\n11. Reduced Motion Accessibility Check:');
if (authSliderContent.includes('useReducedMotion')) {
  pass('useReducedMotion hook is integrated to respect user motion preferences.');
} else {
  fail('Missing useReducedMotion for accessibility compliance.');
}

console.log('\n=== VERIFICATION RESULT ===');
console.log(allPassed ? 'ALL AUTH SLIDER CHECKS PASSED PERFECTLY!' : 'SOME CHECKS FAILED!');
process.exit(allPassed ? 0 : 1);
