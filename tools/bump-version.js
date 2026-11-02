// เพิ่มเลขเวอร์ชันของเกมทุกที่พร้อมกัน ก่อนอัปเดตขึ้นเว็บทุกครั้ง
// วิธีใช้: node tools/bump-version.js
// เปลี่ยน: version.json, CONFIG.version ใน js/config.js, PAGE_VERSION และ ?v= ใน index.html
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const cfgPath = path.join(root, 'js', 'config.js');
const cfg = fs.readFileSync(cfgPath, 'utf8');
const cur = Number((cfg.match(/version: '(\d+)'/) || [])[1]);
if (!cur) { console.error('ไม่พบ version ใน js/config.js'); process.exit(1); }
const next = String(cur + 1);

fs.writeFileSync(cfgPath, cfg.replace(/version: '\d+'/, `version: '${next}'`));
const htmlPath = path.join(root, 'index.html');
fs.writeFileSync(htmlPath, fs.readFileSync(htmlPath, 'utf8')
  .replace(/var PAGE_VERSION = '\d+'/, `var PAGE_VERSION = '${next}'`)
  .replace(/\?v=\d+"/g, `?v=${next}"`));
fs.writeFileSync(path.join(root, 'version.json'), JSON.stringify({ v: next }) + '\n');
console.log(`เวอร์ชัน ${cur} → ${next}`);
