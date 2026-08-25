const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'views', 'teacher', 'dashboard.ejs');
let content = fs.readFileSync(filePath, 'utf8');

// Fix string splits across line breaks inside <% ... %>
content = content.replace(/<%([\s\S]*?)%>/g, (match, code) => {
  // Fix multiline strings inside code
  const fixedCode = code.replace(/'([^'\r\n]*)\r?\n\s*([^'\r\n]*)'/g, "'$1 $2'");
  return '<%' + fixedCode + '%>';
});

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed multiline string breaks in scriptlets!');
