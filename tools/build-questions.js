// แปลง data/questions.csv เป็น js/questions.js ที่เกมอ่าน
// วิธีใช้: node tools/build-questions.js
// ครูแก้คำถามใน CSV (เปิดด้วย Excel ได้) แล้วรันคำสั่งนี้อีกครั้งเพื่ออัปเดตเกม
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const text = fs.readFileSync(path.join(root, 'data', 'questions.csv'), 'utf8').replace(/^﻿/, '');

// อ่าน CSV ที่มีเครื่องหมายคำพูดและ "" แทน " ในช่อง
function parseCsv(src) {
  const rows = [];
  let row = [], cell = '', quoted = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      if (row.some((c) => c.trim())) rows.push(row);
      row = [];
    } else cell += ch;
  }
  if (cell || row.length) { row.push(cell); if (row.some((c) => c.trim())) rows.push(row); }
  return rows;
}

const [head, ...body] = parseCsv(text);
const col = Object.fromEntries(head.map((h, i) => [h.trim(), i]));
const need = ['หมวด', 'คำถาม', 'ก', 'ข', 'ค', 'ง', 'เฉลย', 'คำอธิบาย'];
const missing = need.filter((n) => !(n in col));
if (missing.length) { console.error('ไม่พบคอลัมน์: ' + missing.join(', ')); process.exit(1); }

const LETTERS = ['ก', 'ข', 'ค', 'ง'];
const CATEGORIES = ['พุทธประวัติ', 'ธรรมะ', 'วินัย'];
const errors = [];
const bank = body.map((r, i) => {
  const get = (n) => (r[col[n]] || '').trim();
  const where = `แถว ${i + 2} (${get('หมวด')} ${col['ข้อที่'] !== undefined ? get('ข้อที่') : ''})`;
  const choices = LETTERS.map(get);
  const answer = LETTERS.indexOf(get('เฉลย'));
  if (!CATEGORIES.includes(get('หมวด'))) errors.push(`${where}: หมวดต้องเป็น ${CATEGORIES.join(' / ')}`);
  if (!get('คำถาม')) errors.push(`${where}: ไม่มีคำถาม`);
  if (choices.some((c) => !c)) errors.push(`${where}: ตัวเลือกไม่ครบ 4 ข้อ`);
  if (answer < 0) errors.push(`${where}: เฉลยต้องเป็น ก ข ค หรือ ง`);
  return { category: get('หมวด'), q: get('คำถาม'), choices, answer, explain: get('คำอธิบาย') };
});

if (errors.length) { console.error(errors.join('\n')); process.exit(1); }

const header = `// สร้างจาก data/questions.csv ด้วย tools/build-questions.js — อย่าแก้ไฟล์นี้ตรง ๆ
// answer = ลำดับของตัวเลือกที่ถูก เริ่มนับจาก 0 (ระบบสลับตำแหน่งตัวเลือกให้เองตอนแสดง)
`;
fs.writeFileSync(path.join(root, 'js', 'questions.js'), header + 'const QUESTION_BANK = ' + JSON.stringify(bank, null, 2) + ';\n');

const count = {};
bank.forEach((b) => (count[b.category] = (count[b.category] || 0) + 1));
console.log(`สร้าง js/questions.js แล้ว ${bank.length} ข้อ`, JSON.stringify(count));
