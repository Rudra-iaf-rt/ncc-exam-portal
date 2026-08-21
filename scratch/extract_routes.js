const fs = require('fs');
const path = require('path');
const routesDir = 'backend/src/routes';
const files = fs.readdirSync(routesDir).filter(f => f.endsWith('.js'));
let out = '';
for(let file of files) {
  const content = fs.readFileSync(path.join(routesDir, file), 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    // try to match a basic route definition
    const match = line.match(/router\.(get|post|put|patch|delete)\(\s*['"`]([^'"`]+)['"`]/);
    if(match) {
      let fullStatement = line;
      let j = idx;
      while(!fullStatement.includes(';') && !fullStatement.includes(')') && j < lines.length - 1) {
        j++;
        fullStatement += ' ' + lines[j].trim();
      }
      
      const ctrlMatch = fullStatement.match(/([a-zA-Z0-9_]+Controller\.[a-zA-Z0-9_]+)/);
      const ctrl = ctrlMatch ? ctrlMatch[1] : 'NOT FOUND (Inline or custom)';
      
      let guards = [];
      if (fullStatement.includes('authenticate')) guards.push('authenticate');
      if (fullStatement.includes('requireStudent')) guards.push('requireStudent');
      if (fullStatement.includes('requireStaff')) guards.push('requireStaff');
      if (fullStatement.includes('requireAdmin')) guards.push('requireAdmin');
      if (fullStatement.includes('requireExamCreator')) guards.push('requireExamCreator');
      
      out += `File: ${file}:${idx+1} | Method: ${match[1].toUpperCase()} | Path: ${match[2]} | Guards: ${guards.join(', ')} | Controller: ${ctrl}\n`;
    }
  });
}
console.log(out);
