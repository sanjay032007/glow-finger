const fs = require('fs');
const p = 'src/components/Onboarding.tsx';
let code = fs.readFileSync(p, 'utf8');

const oldCode = /  useEffect\(\(\) => \{\s*if \(\!handStateRef\) return;\s*const interval = setInterval\(\(\) => \{\s*setCurrentGesture\(handStateRef\.current\.gesture\);\s*\}, 100\);\s*return \(\) => clearInterval\(interval\);\s*\}, \[handStateRef\]\);/;

const newCode = `  useEffect(() => {
    if (!handStateRef || dismissed || activeTab !== 0) return;
    const interval = setInterval(() => {
      setCurrentGesture(handStateRef.current.gesture);
    }, 100);
    return () => clearInterval(interval);
  }, [handStateRef, dismissed, activeTab]);`;

code = code.replace(oldCode, newCode);

fs.writeFileSync(p, code);
console.log('done onboarding');
