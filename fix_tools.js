const fs = require('fs');

// Read the workspaceTools.js file
let content = fs.readFileSync('/home/ben/Desktop/tutor_ai/backend/src/utils/workspaceTools.js', 'utf8');

// Fix the tools format by removing the nested "function" wrapper
content = content.replace(/function: \{[\s\n]*name:/g, 'name:');

// Remove extra closing braces
content = content.replace(/\}[\s\n]*\}[\s\n]*,[\s\n]*\{[\s\n]*type: "function"/g, '},\n  {\n    type: "function"');

// Fix the end of the array
content = content.replace(/\}[\s\n]*\}[\s\n]*\]/, '}\n];');

// Write the fixed content back
fs.writeFileSync('/home/ben/Desktop/tutor_ai/backend/src/utils/workspaceTools.js', content);

console.log('Fixed workspace tools format');