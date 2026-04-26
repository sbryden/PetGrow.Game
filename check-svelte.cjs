const fs = require('fs');
const src = fs.readFileSync('src/screens/PetGame.svelte', 'utf8');
const match = src.match(/<script[^>]*>([\s\S]*?)<\/script>/);
if (!match) { console.log('No script block found'); process.exit(1); }
try {
  new Function(match[1].replace(/\$:/g, 'void ').replace(/import\s[^;]+;/g, ''));
  console.log('Script parse OK');
} catch (e) {
  console.error('PARSE ERROR:', e.message);
  process.exit(1);
}
