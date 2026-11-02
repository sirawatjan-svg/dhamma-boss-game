// ฝังเอฟเฟกต์ใน assets/fx/ เป็นไฟล์เดียว js/fx-data.js สำหรับเปิดเกมตรงจากเครื่อง (file://)
// วิธีใช้: node tools/build-fx.js  (รันใหม่ทุกครั้งที่เพิ่มหรือเปลี่ยนเอฟเฟกต์)
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const dir = path.join(root, 'assets', 'fx');
const data = {};
for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.json'))) {
  const name = f.slice(0, -5);
  const png = path.join(dir, name + '.png');
  if (!fs.existsSync(png)) continue;
  data[name] = {
    png: 'data:image/png;base64,' + fs.readFileSync(png).toString('base64'),
    json: JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')),
  };
}

const out = '// สร้างด้วย tools/build-fx.js — อย่าแก้ไฟล์นี้ตรง ๆ\nwindow.FX_DATA = ' + JSON.stringify(data) + ';\n';
fs.writeFileSync(path.join(root, 'js', 'fx-data.js'), out);
console.log(`สร้าง js/fx-data.js แล้ว: ${Object.keys(data).length} เอฟเฟกต์, ${(out.length / 1048576).toFixed(1)} MB`);
