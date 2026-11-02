// กติกาเกมและลำดับหน้าจอ: หน้าเริ่ม → ต่อสู้บอส → (ชนะ) บอสถัดไป → หน้าผลลัพธ์
(() => {
  const $ = (id) => document.getElementById(id);
  const screen = $('screen');
  let battle = null;
  let timeLimit = CONFIG.timePerQuestion;
  let s = null; // สถานะของการเล่นรอบนี้

  // ลิงก์ทดสอบสำหรับครู: ?boss=3 เริ่มที่บอสตัวที่ 3 เลย (ผลจะติดป้าย "โหมดทดสอบ")
  const testBoss = Math.min(CONFIG.bosses.length,
    Math.max(1, Number(new URLSearchParams(location.search).get('boss')) || 1)) - 1;

  window.onBattleReady = (scene) => { battle = scene; showTitle(); };

  const boss = () => CONFIG.bosses[s.bossIndex];

  function fmtTime(sec) {
    const t = Math.round(sec);
    return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0');
  }

  function showScreen(html) { screen.innerHTML = html; screen.hidden = false; }
  function hideScreen() { screen.hidden = true; screen.innerHTML = ''; }

  function showTitle() {
    Quiz.hide();
    Sfx.stopMusic();
    $('boss-label').textContent = '';
    $('stats').textContent = '';
    showScreen(`
      <h1>นักธรรมปราบกิเลส</h1>
      <p class="sub">ตอบคำถามธรรมศึกษาชั้นตรี เพื่อปราบกิเลส 3 ตน: โลภะ โทสะ โมหะ</p>
      <ul class="rules">
        <li>ตอบถูก = โจมตีบอส</li>
        <li>ตอบผิดหรือหมดเวลา = บอสตีกลับ เสีย 1 หัวใจ</li>
        <li>หัวใจหมด = เกมจบ แต่ถ้าชนะบอสแล้วจะสู้ต่อจากจุดบันทึกได้</li>
      </ul>
      <div class="form">
        <label>ชื่อ / กลุ่ม <input id="player-name" maxlength="30" placeholder="เช่น กลุ่ม 3"></label>
        <label>เวลาต่อข้อ
          <select id="time-select">${CONFIG.timeOptions.map((t) =>
            `<option value="${t}"${t === timeLimit ? ' selected' : ''}>${t} วินาที</option>`).join('')}</select>
        </label>
      </div>
      ${testBoss ? `<p class="note">โหมดทดสอบ: เริ่มที่บอส ${testBoss + 1}</p>` : ''}
      <button class="big" id="start-btn">เริ่มเกม ▶</button>`);
    $('start-btn').onclick = () => {
      timeLimit = Number($('time-select').value);
      newRun($('player-name').value.trim());
      s.test = testBoss > 0;
      s.checkpoint = testBoss;
      startBoss(testBoss);
    };
  }

  function newRun(name) {
    s = {
      name: name || 'ไม่ระบุชื่อ',
      bossIndex: 0, bossHp: 0,
      hearts: CONFIG.playerHearts,
      score: 0, correct: 0, answered: 0, timeUsed: 0,
      used: new Set(),
      shields: 0,                          // โล่ที่ถืออยู่ (ใช้อัตโนมัติเมื่อตอบผิด)
      buff: { double: false, bonusTime: 0 }, // รางวัลจากวงล้อ ใช้กับบอสถัดไปบอสเดียว
      checkpoint: 0,   // บอสที่จะเริ่มต่อเมื่อหัวใจหมด
      retries: 0,      // จำนวนครั้งที่เริ่มจากจุดบันทึก
    };
  }

  function startBoss(i) {
    hideScreen();
    s.bossIndex = i;
    s.bossHp = boss().hp;
    // บอสตัวสุดท้ายมีฉากเปิดตัวก่อน เพลงและคำถามจึงเริ่มช้ากว่า
    const final = i === CONFIG.bosses.length - 1;
    const intro = final ? CONFIG.lastBossIntroMs : 0;
    Sfx.stopMusic();
    const bpm = boss().bpm;
    if (intro) setTimeout(() => Sfx.startMusic(bpm), intro - 600);
    else Sfx.startMusic(bpm);
    battle.resetPlayer();
    battle.setBoss(boss(), final);
    refreshHud();
    if (s.rewardFx) {
      const id = s.rewardFx;
      s.rewardFx = null;
      setTimeout(() => battle.rewardFx(id), 700 + intro);
    }
    setTimeout(nextQuestion, 900 + intro);
  }

  function refreshHud() {
    const b = boss();
    $('boss-label').textContent = `บอส ${s.bossIndex + 1}/${CONFIG.bosses.length} · ${b.name} ${b.title} · หมวด${b.category}`;
    const tags = [`คะแนน ${s.score}`, `ถูก ${s.correct}/${s.answered}`];
    if (s.buff.double) tags.push('×2 คะแนน');
    if (s.buff.bonusTime) tags.push(`⏱ +${s.buff.bonusTime} วิ`);
    if (s.shields) tags.push(`🛡 โล่ ${s.shields}`);
    $('stats').textContent = tags.join(' · ');
    battle.drawHUD(s.hearts, Math.max(s.hearts, CONFIG.playerHearts), s.bossHp, b.hp, s.shields);
  }

  // สุ่มคำถามในหมวดของบอสโดยไม่ซ้ำในรอบเดียว ถ้าหมดหมวดแล้วค่อยวนใหม่
  function pickQuestion(category) {
    const inCat = QUESTION_BANK.filter((q) => q.category === category);
    let pool = inCat.filter((q) => !s.used.has(q));
    if (!pool.length) {
      inCat.forEach((q) => s.used.delete(q));
      pool = inCat;
    }
    const q = pool[Math.floor(Math.random() * pool.length)];
    s.used.add(q);
    return q;
  }

  function nextQuestion() {
    const q = pickQuestion(boss().category);
    Quiz.show(q, timeLimit + s.buff.bonusTime, `ข้อที่ ${s.answered + 1} · หมวด${q.category}`, (res) => onAnswer(q, res));
  }

  function onAnswer(q, res) {
    s.answered++;
    s.timeUsed += res.elapsed;
    if (res.correct) Sfx.correct(); else Sfx.wrong();
    if (res.correct) {
      s.correct++;
      s.score += s.buff.double ? 2 : 1;   // ×2 มีผลกับคะแนนเกมเท่านั้น ไม่กระทบความแม่นยำ
      s.bossHp--;
      battle.playerAttack(() => {
        refreshHud();
        if (s.bossHp <= 0) bossDefeated();
        else setTimeout(nextQuestion, 300);
      });
    } else {
      const blocked = s.shields > 0;
      if (blocked) s.shields--;
      else s.hearts--;
      battle.bossAttack(() => {
        refreshHud();
        const title = (res.timedOut ? 'หมดเวลา!' : 'ตอบผิด') + (blocked ? ' (โล่ช่วยไว้)' : '');
        Quiz.explain(title, q.explain, CONFIG.explainMs,
          () => (s.hearts <= 0 ? gameOver() : nextQuestion()));
      }, blocked);
    }
  }

  function bossDefeated() {
    Quiz.hide();
    Sfx.stopMusic();
    // รางวัลจากวงล้อครั้งก่อนใช้กับบอสที่เพิ่งชนะไปแล้ว จึงล้างทิ้ง (โล่ยังเก็บไว้)
    s.buff = { double: false, bonusTime: 0 };
    battle.bossDefeat(() => {
      if (s.bossIndex === CONFIG.bosses.length - 1) return showResults(true);
      s.checkpoint = s.bossIndex + 1;
      showWheel();
    }, s.bossIndex === CONFIG.bosses.length - 1);
  }

  // วงล้อ 4 ช่อง: ช่องที่สว่างวนตามเข็มนาฬิกา ช้าลงเรื่อย ๆ แล้วหยุดแบบสุ่ม
  function showWheel() {
    const R = CONFIG.rewards;
    const next = CONFIG.bosses[s.checkpoint];
    const cell = (i) => `<div class="slot" data-i="${i}"><b>${R[i].icon}</b><span>${R[i].name}</span></div>`;
    // เรียงในตาราง 2x2 เป็น บนซ้าย บนขวา ล่างซ้าย ล่างขวา = ช่อง 0 1 3 2 ให้ลำดับ 0→1→2→3 วนตามเข็มนาฬิกา
    showScreen(`
      <h2>ปราบ${boss().name}สำเร็จ!</h2>
      <p class="note">บันทึกจุดแล้ว ถ้าหัวใจหมดจะสู้ต่อที่บอส ${s.checkpoint + 1} ได้</p>
      <div class="wheel">${[0, 1, 3, 2].map(cell).join('')}</div>
      <p id="wheel-result">หมุนวงล้อเพื่อรับรางวัล 1 อย่าง</p>
      <button class="big" id="spin-btn">หมุนวงล้อ!</button>`);
    const slots = [...screen.querySelectorAll('.slot')].sort((a, b) => a.dataset.i - b.dataset.i);
    const btn = $('spin-btn');

    btn.onclick = () => {
      btn.disabled = true;
      const target = Math.floor(Math.random() * R.length);
      const total = 3 * R.length + target; // วนอย่างน้อย 3 รอบ แล้วไปหยุดที่ช่องเป้าหมาย
      let k = 0;
      const step = () => {
        slots.forEach((el, i) => el.classList.toggle('lit', i === k % R.length));
        Sfx.tick();
        if (k === total) return landed(slots[target], R[target]);
        k++;
        setTimeout(step, 50 + Math.pow(k / total, 2) * 320);
      };
      step();
    };

    function landed(el, reward) {
      el.classList.add('win');
      Sfx.correct();
      $('wheel-result').textContent = applyReward(reward);
      btn.disabled = false;
      btn.textContent = `สู้กับ${next.name} ▶`;
      btn.onclick = () => startBoss(s.checkpoint);
    }
  }

  function applyReward(r) {
    s.rewardFx = r.id;   // เล่นเอฟเฟกต์รางวัลตอนเริ่มสู้บอสถัดไป
    if (r.id === 'double') { s.buff.double = true; return 'ได้คะแนนคูณ 2 ตลอดการสู้บอสถัดไป!'; }
    if (r.id === 'shield') { s.shields++; return 'ได้โล่! ตอบผิดครั้งต่อไปจะไม่เสียหัวใจ'; }
    if (r.id === 'time') { s.buff.bonusTime += 10; return 'เวลาต่อข้อเพิ่ม 10 วินาทีตลอดการสู้บอสถัดไป!'; }
    if (s.hearts >= CONFIG.maxHearts) return `หัวใจเต็มแล้ว (สูงสุด ${CONFIG.maxHearts} ดวง)`;
    s.hearts++;
    return 'ได้หัวใจเพิ่ม 1 ดวง!';
  }

  function gameOver() {
    Quiz.hide();
    Sfx.stopMusic();
    battle.playerDefeat(() => showResults(false));
  }

  function showResults(won) {
    Quiz.hide();
    const total = CONFIG.bosses.length;
    const acc = s.answered ? Math.round((s.correct * 100) / s.answered) : 0;
    const reached = won ? total : s.bossIndex + 1;
    const summary = [
      s.name,
      `คะแนน ${s.score}`,
      `ถูก ${s.correct}/${s.answered} (${acc}%)`,
      `เวลา ${fmtTime(s.timeUsed)}`,
      won ? `ชนะครบ ${total} บอส` : `ถึงบอส ${reached}/${total}`,
      s.retries ? `เริ่มจากจุดบันทึก ${s.retries} ครั้ง` : '',
      s.test ? 'โหมดทดสอบ' : '',
    ].filter(Boolean).join(' | ');

    showScreen(`
      <h2>${won ? 'ปราบกิเลสครบแล้ว!' : 'หัวใจหมดแล้ว'}</h2>
      <p class="who"></p>
      <div class="results">
        <div><b>${s.score}</b><span>คะแนน</span></div>
        <div><b>${acc}%</b><span>ความแม่นยำ (${s.correct}/${s.answered})</span></div>
        <div><b>${fmtTime(s.timeUsed)}</b><span>เวลาที่ใช้</span></div>
        <div><b>${reached}/${total}</b><span>บอสที่ไปถึง</span></div>
      </div>
      <div class="row">
        ${!won && s.checkpoint > 0 ? `<button class="big" id="resume-btn">สู้ต่อที่บอส ${s.checkpoint + 1} ▶</button>` : ''}
        <button id="copy-btn">คัดลอกผล</button>
        <button id="restart-btn">เริ่มใหม่ทั้งหมด</button>
      </div>`);
    screen.querySelector('.who').textContent =
      s.name + (s.retries ? ` · เริ่มจากจุดบันทึก ${s.retries} ครั้ง` : '') + (s.test ? ' · โหมดทดสอบ' : '');

    const resume = $('resume-btn');
    if (resume) resume.onclick = () => {
      s.hearts = CONFIG.playerHearts;
      s.retries++;
      startBoss(s.checkpoint);
    };
    $('copy-btn').onclick = (e) => {
      const btn = e.currentTarget;
      navigator.clipboard.writeText(summary)
        .then(() => { btn.textContent = 'คัดลอกแล้ว ✓'; })
        .catch(() => window.prompt('คัดลอกข้อความนี้', summary));
    };
    $('restart-btn').onclick = showTitle;
  }

  // ย่อขยายกรอบ 1280x720 ให้พอดีจอ ไม่ต้องเลื่อน
  const app = $('app');
  function fit() {
    const k = Math.min(window.innerWidth / 1280, window.innerHeight / 720);
    app.style.transform = `translate(-50%, -50%) scale(${k})`;
  }
  window.addEventListener('resize', fit);
  fit();

  const muteBtn = $('mute-btn');
  const drawMute = () => { muteBtn.textContent = Sfx.isMuted() ? '🔇' : '🔊'; };
  muteBtn.onclick = () => { Sfx.setMuted(!Sfx.isMuted()); drawMute(); muteBtn.blur(); };
  drawMute();

  const boot = () => new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: 640,
    height: 216,
    pixelArt: true,
    backgroundColor: '#000000',
    // ขนาดบนจอให้ CSS จัดการ เพราะกรอบทั้งเกมถูกย่อขยายด้วย transform อยู่แล้ว
    scale: { mode: Phaser.Scale.NONE },
    scene: [BattleScene],
  });
  // เปิดไฟล์ตรงจากเครื่องโหลดเอฟเฟกต์แบบไฟล์แยกไม่ได้ จึงโหลดไฟล์ที่ฝังเอฟเฟกต์ไว้แทน (?embed ใช้ทดสอบ)
  const needEmbed = location.protocol === 'file:' || /[?&]embed\b/.test(location.search);
  const fxData = needEmbed
    ? new Promise((done) => {
      const sc = document.createElement('script');
      sc.src = 'js/fx-data.js?v=' + CONFIG.version;
      sc.onload = sc.onerror = done;
      document.body.appendChild(sc);
    })
    : Promise.resolve();

  // รอฟอนต์ไทยโหลดก่อน ตัวหนังสือในฉากจะได้ไม่เป็นฟอนต์สำรอง
  const fonts = (document.fonts ? document.fonts.load('20px Kanit') : Promise.resolve()).catch(() => {});
  Promise.all([fonts, fxData]).then(boot);
})();
