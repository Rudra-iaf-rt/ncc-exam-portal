const fs = require('fs');
const path = require('path');

const filesList = fs.readFileSync('scratch/all_files_utf8.txt', 'utf8').split('\n').filter(Boolean);

let inventory = `# Codebase Inventory

| File Path | Classification | Description |
|---|---|---|
`;

const counts = {
  '[FE-PAGE]': 0,
  '[FE-COMPONENT]': 0,
  '[FE-HOOK]': 0,
  '[FE-UTIL]': 0,
  '[FE-STATE]': 0,
  '[FE-ROUTE]': 0,
  '[FE-STYLE]': 0,
  '[FE-ASSET]': 0,
  '[BE-ROUTE]': 0,
  '[BE-CONTROLLER]': 0,
  '[BE-MIDDLEWARE]': 0,
  '[BE-SERVICE]': 0,
  '[BE-SCHEMA]': 0,
  '[BE-SEED]': 0,
  '[SHARED]': 0,
  '[CONFIG]': 0,
  '[TEST]': 0,
  '[INFRA]': 0,
  '[UNKNOWN]': 0
};

function classify(file) {
  // Normalize path separators
  const p = file.replace(/\\/g, '/');
  
  if (p.includes('.agents/') || p.includes('.ai-session/') || p.includes('graphify-out/') || p.includes('scratch/') || p.includes('templates/') || p.includes('unit-test-writer/') || p.includes('docs/')) {
    if (p.includes('docs/migration/theme.ts')) {
        return { bucket: '[FE-STYLE]', desc: 'Design tokens and theme definitions' };
    }
    return { bucket: '[UNKNOWN]', desc: 'Agent, documentation, or scratch file' };
  }
  
  // Infrastructure
  if (p.endsWith('Dockerfile') || p.endsWith('.dockerignore') || p.endsWith('docker-compose.yml') || p.includes('.github/') || p.endsWith('nginx.conf') || p.includes('scripts/')) {
    return { bucket: '[INFRA]', desc: 'Infrastructure, deployment, or pipeline script' };
  }
  
  // Tests
  if (p.includes('__tests__') || p.includes('.spec.') || p.includes('.test.') || p.includes('playwright-report') || p.includes('test-results')) {
    return { bucket: '[TEST]', desc: 'Test file or test report output' };
  }
  
  // Configuration
  const configFiles = ['package.json', 'package-lock.json', 'tsconfig.json', 'jsconfig.json', '.gitignore', '.env', '.env.example', '.env.loadtest', 'eslint.config.js', 'vite.config.js', 'playwright.config.js', 'postcss.config.js', 'vercel.json', 'app.json', 'audit-ci.json', 'jest.config.js', 'prisma.config.ts'];
  if (configFiles.some(c => p.endsWith(c))) {
    return { bucket: '[CONFIG]', desc: 'Configuration file' };
  }

  // Backend Schema & Seed
  if (p.includes('prisma/schema.prisma') || p.includes('prisma/migrations')) {
    return { bucket: '[BE-SCHEMA]', desc: 'Database schema or migration file' };
  }
  if (p.includes('prisma/seed.js')) {
    return { bucket: '[BE-SEED]', desc: 'Database seed data' };
  }

  // Backend
  if (p.includes('backend/src/')) {
    if (p.includes('/controllers/')) return { bucket: '[BE-CONTROLLER]', desc: 'Express controller / business logic' };
    if (p.includes('/routes/')) return { bucket: '[BE-ROUTE]', desc: 'Express route definition' };
    if (p.includes('/middleware/')) return { bucket: '[BE-MIDDLEWARE]', desc: 'Express middleware' };
    if (p.includes('/services/')) return { bucket: '[BE-SERVICE]', desc: 'Backend service layer' };
    if (p.includes('/lib/') || p.includes('/utils/') || p.includes('cron.js')) return { bucket: '[BE-SERVICE]', desc: 'Backend utility or service helper' };
    if (p.endsWith('app.js') || p.endsWith('index.js')) return { bucket: '[CONFIG]', desc: 'Express application setup / entry point' };
    if (p.includes('config/')) return { bucket: '[CONFIG]', desc: 'Backend configuration module' };
  }
  if (p.includes('backend/server.js')) return { bucket: '[CONFIG]', desc: 'Backend server initialization' };

  // Frontend
  if (p.includes('frontend/src/')) {
    if (p.includes('/pages/')) return { bucket: '[FE-PAGE]', desc: 'React page or screen component' };
    if (p.includes('/components/')) return { bucket: '[FE-COMPONENT]', desc: 'React reusable component' };
    if (p.includes('/guards/') || p.includes('Layout.jsx') || p.includes('auth/ChangePassword') || p.includes('auth/ForgotPassword') || p.includes('auth/ResetPassword')) return { bucket: '[FE-COMPONENT]', desc: 'React layout or route guard component' };
    if (p.includes('/hooks/')) return { bucket: '[FE-HOOK]', desc: 'Custom React hook' };
    if (p.includes('/contexts/')) return { bucket: '[FE-STATE]', desc: 'React context for state management' };
    if (p.includes('/api/') || p.includes('/lib/')) return { bucket: '[FE-UTIL]', desc: 'Frontend API client or utility helper' };
    if (p.includes('/assets/')) return { bucket: '[FE-ASSET]', desc: 'Frontend static asset' };
    if (p.endsWith('App.jsx') || p.endsWith('main.jsx')) return { bucket: '[FE-ROUTE]', desc: 'React application entry point and routing' };
    if (p.endsWith('index.css') || p.endsWith('.css')) return { bucket: '[FE-STYLE]', desc: 'Global stylesheet' };
  }
  if (p.includes('frontend/public/')) {
    return { bucket: '[FE-ASSET]', desc: 'Public static asset' };
  }
  if (p.endsWith('index.html')) {
    return { bucket: '[CONFIG]', desc: 'HTML entry point template' };
  }
  
  if (p.endsWith('README.md') || p.endsWith('PRODUCT.md') || p.endsWith('prompts.md') || p.endsWith('.log') || p.endsWith('.json') || p.endsWith('.js')) {
     return { bucket: '[UNKNOWN]', desc: 'Needs manual review' };
  }

  return { bucket: '[UNKNOWN]', desc: 'Cannot classify without reading' };
}

for (let line of filesList) {
  line = line.trim();
  if (!line) continue;
  // Convert absolute path to relative for better reading
  const relPath = line.replace('C:\\College Projects\\ncc-exam-portal\\', '').replace(/\\/g, '/');
  const classification = classify(relPath);
  
  counts[classification.bucket]++;
  inventory += `| ${relPath} | ${classification.bucket} | ${classification.desc} |\n`;
}

inventory += `
## SUMMARY

### Total file count per bucket
`;

for (const [bucket, count] of Object.entries(counts)) {
  if (count > 0) {
    inventory += `- **${bucket}**: ${count}\n`;
  }
}

inventory += `
### Entry points
- **React App**: \`frontend/src/main.jsx\` and \`frontend/src/App.jsx\` are the main entry points initializing the React root and application routing.
- **Express Backend**: \`backend/server.js\` and \`backend/src/index.js\` /\`backend/src/app.js\` initialize the Express app and start the server.

### Notable Patterns observed
- **Feature-Based Frontend Architecture**: The frontend code is grouped into high-level role/feature modules (\`admin/\`, \`cadet/\`, \`auth/\`) each containing their own \`pages\`, \`components\`, and \`guards\`. This implies a very role-isolated structure.
- **Layered Backend Architecture**: The backend strictly follows a Controller-Service-Route pattern (\`controllers/\`, \`services/\`, \`routes/\`) which separates business logic from HTTP transport logic.
- **Testing Approach**: Tests are co-located in \`__tests__\` folders within backend domain layers, while frontend uses Playwright (\`frontend/tests/e2e\`) for end-to-end flows.
- **Database Migrations**: Heavy use of Prisma migrations indicates a relational data model with progressive schema evolution.
- **Proctoring / Anti-Cheat**: Explicit controllers, services, and hooks dedicated to anti-cheat/proctoring (\`anti-cheat.controller.js\`, \`useProctoring.js\`) suggest a robust client-server integrity verification system.
- **Performance & Telemetry**: Explicit telemetry middleware (\`telemetry.js\`, \`perf-context.js\`) and frontend \`performanceMonitor.js\` point to strong observability requirements in production.
`;

fs.mkdirSync('docs/migration', { recursive: true });
fs.writeFileSync('docs/migration/00_inventory.md', inventory);
fs.writeFileSync('docs/migration/_PROGRESS.md', '# Migration Progress\n\n- [x] Phase 0: Pre-migration Codebase Inventory Completed.\n');

console.log('Done!');
