const fs = require('fs');
const p = 'src/components/GallerySection.tsx';
let code = fs.readFileSync(p, 'utf8');

code = code.replace(/ \/>/g, '/>');
code = code.replace(/ cx="50%" cy="50%"/g, '');
code = code.replace(/offset="0%"/g, 'offset="0"');
code = code.replace(/offset="100%"/g, 'offset="1"');

fs.writeFileSync(p, code);
console.log('done gallery');
