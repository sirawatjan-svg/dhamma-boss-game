// ตัวละครพิกเซล: ตัวอักษร 1 ตัว = 1 พิกเซล, "." = โปร่งใส
// สีของแต่ละตัวเลขกำหนดใน palette (บอสใช้ลายเดียวกัน เปลี่ยนแค่สี)
const Sprites = (() => {
  const PLAYER = [
    '...11111....',
    '..1555551...',
    '.155555551..',
    '.155522221..',
    '.152221221..',
    '.152222221..',
    '..1222221...',
    '...111111...',
    '..13333331..',
    '.1333333331.',
    '.1233333321.',
    '..14444441..',
    '..14411441..',
    '..14411441..',
    '..12211221..',
    '..111..111..',
  ];

  const BOSS = [
    '..7..........7..',
    '..77........77..',
    '..177111111771..',
    '.13333333333331.',
    '.13333333333331.',
    '1331111331111331',
    '1331441331441331',
    '1331111331111331',
    '1333333333333331',
    '1335555555555331',
    '1335656565655331',
    '1333555555553331',
    '.13333333333331.',
    '.13331....13331.',
    '.11111....11111.',
  ];

  const HEART = [
    '.22.22.',
    '2222222',
    '2222222',
    '.22222.',
    '..222..',
    '...2...',
  ];

  const SHIELD = [
    '1111111',
    '1333331',
    '1344431',
    '1344431',
    '1334331',
    '.13331.',
    '..131..',
    '...1...',
  ];

  const PLAYER_PALETTE = { 1: '#1a1c2c', 2: '#f2c49b', 3: '#f4f4f4', 4: '#29366f', 5: '#3b2a20' };

  function register(scene) {
    const t = scene.textures;
    t.generate('player', { data: PLAYER, pixelWidth: 6, palette: PLAYER_PALETTE });
    CONFIG.bosses.forEach((b) => t.generate('boss-' + b.id, { data: BOSS, pixelWidth: 8, palette: b.palette }));
    t.generate('heart', { data: HEART, pixelWidth: 4, palette: { 2: '#e43b44' } });
    t.generate('heart-empty', { data: HEART, pixelWidth: 4, palette: { 2: '#3a4466' } });
    t.generate('px', { data: ['1'], pixelWidth: 4, palette: { 1: '#ffffff' } }); // เศษพิกเซลสำหรับระเบิดและกระดาษสี
    t.generate('shield', { data: SHIELD, pixelWidth: 4, palette: { 1: '#1a1c2c', 3: '#5fc8e8', 4: '#e8fbff' } });
  }

  return { register, PLAYER, BOSS, HEART };
})();
