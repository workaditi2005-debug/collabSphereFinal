// check-imports.js - Run this to find import issues
// Usage: node check-imports.js

import fs from 'fs';
import path from 'path';


const SRC_DIR = path.join(__dirname, 'src');
const ISSUES = [];

// Expected file locations
const EXPECTED_STRUCTURE = {
  pages: ['Home.jsx', 'Login.jsx', 'Dashboard.jsx', 'FindTeammates.jsx', 'Analytics.jsx', 'PeerReview.jsx'],
  components: ['Navbar.jsx', 'Footer.jsx', 'Notification.jsx', 'Profile.jsx'],
  utils: ['api.js', 'constants.js']
};

function checkFileExists(filePath) {
  return fs.existsSync(filePath);
}

function getAllJsxFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && !file.includes('node_modules')) {
      getAllJsxFiles(filePath, fileList);
    } else if (file.endsWith('.jsx') || file.endsWith('.js')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

function checkImportPath(filePath, importPath, lineNum) {
  const fileDir = path.dirname(filePath);
  const resolvedPath = path.resolve(fileDir, importPath);
  
  // Check with various extensions
  const extensions = ['.jsx', '.js', '.ts', '.tsx', ''];
  for (const ext of extensions) {
    if (checkFileExists(resolvedPath + ext)) {
      return { valid: true };
    }
  }
  
  // Check if it's index file
  if (checkFileExists(path.join(resolvedPath, 'index.jsx')) || 
      checkFileExists(path.join(resolvedPath, 'index.js'))) {
    return { valid: true };
  }
  
  return { 
    valid: false, 
    error: `Import path not found: ${importPath}`,
    line: lineNum,
    file: path.relative(SRC_DIR, filePath)
  };
}

function analyzeFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const relativePath = path.relative(SRC_DIR, filePath);
  
  console.log(`\n📄 Checking: ${relativePath}`);
  
  let hasIssues = false;
  
  lines.forEach((line, index) => {
    // Match import statements
    const importMatch = line.match(/import\s+.*\s+from\s+['"](.+)['"]/);
    if (importMatch) {
      const importPath = importMatch[1];
      
      // Only check relative imports
      if (importPath.startsWith('.')) {
        const result = checkImportPath(filePath, importPath, index + 1);
        if (!result.valid) {
          hasIssues = true;
          console.log(`  ❌ Line ${index + 1}: ${result.error}`);
          ISSUES.push({
            file: relativePath,
            line: index + 1,
            import: importPath,
            error: result.error
          });
        } else {
          console.log(`  ✅ Line ${index + 1}: ${importPath}`);
        }
      }
    }
  });
  
  if (!hasIssues) {
    console.log(`  ✅ All imports look good!`);
  }
}

function checkStructure() {
  console.log('\n🏗️  Checking folder structure...\n');
  
  for (const [folder, files] of Object.entries(EXPECTED_STRUCTURE)) {
    const folderPath = path.join(SRC_DIR, folder);
    
    if (!checkFileExists(folderPath)) {
      console.log(`❌ Missing folder: src/${folder}`);
      ISSUES.push({ error: `Missing folder: src/${folder}` });
    } else {
      console.log(`✅ Folder exists: src/${folder}`);
      
      files.forEach(file => {
        const filePath = path.join(folderPath, file);
        if (checkFileExists(filePath)) {
          console.log(`  ✅ ${file}`);
        } else {
          console.log(`  ⚠️  Missing: ${file}`);
        }
      });
    }
  }
}

function generateSummary() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 SUMMARY');
  console.log('='.repeat(60));
  
  if (ISSUES.length === 0) {
    console.log('\n🎉 No import issues found! Your imports are all correct.\n');
  } else {
    console.log(`\n⚠️  Found ${ISSUES.length} issue(s):\n`);
    
    ISSUES.forEach((issue, idx) => {
      console.log(`${idx + 1}. ${issue.file}${issue.line ? `:${issue.line}` : ''}`);
      console.log(`   ${issue.error}`);
      if (issue.import) {
        console.log(`   Import: ${issue.import}`);
      }
      console.log('');
    });
  }
}

// Main execution
console.log('🔍 CollabSphere Import Checker');
console.log('='.repeat(60));

checkStructure();

const jsxFiles = getAllJsxFiles(SRC_DIR);
console.log(`\n📦 Found ${jsxFiles.length} files to check`);

jsxFiles.forEach(file => {
  analyzeFile(file);
});

generateSummary();

console.log('='.repeat(60));
console.log('\n💡 Tips:');
console.log('  - Files in pages/ should import from ../components/');
console.log('  - Files in pages/ should import from ./OtherPage for other pages');
console.log('  - All files should import from ../utils/ for utilities');
console.log('\n');