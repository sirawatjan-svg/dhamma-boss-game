// เสียงเอฟเฟกต์และเพลงประกอบแบบเกมพิกเซล สร้างด้วย Web Audio ไม่ต้องใช้ไฟล์เสียง
const Sfx = (() => {
  let ctx = null;
  let muted = false;
  try { muted = localStorage.getItem('dbg-muted') === '1'; } catch (e) { /* โหมดส่วนตัว */ }

  function ac() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function playAt(freq, t, dur, type, vol, slide = 0) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(ctx.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  function noiseAt(t, dur, vol) {
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const src = ctx.createBufferSource();
    const g = ctx.createGain();
    src.buffer = buf;
    g.gain.value = vol;
    src.connect(g).connect(ctx.destination);
    src.start(t);
  }

  function tone(freq, dur, { type = 'square', vol = 0.1, slide = 0, delay = 0 } = {}) {
    if (muted) return;
    playAt(freq, ac().currentTime + delay, dur, type, vol, slide);
  }

  function noise(dur, vol = 0.15, delay = 0) {
    if (muted) return;
    noiseAt(ac().currentTime + delay, dur, vol);
  }

  // ---------- เพลงประกอบตอนสู้บอส: วน 4 ห้อง (Am F G E) ----------
  const CHORDS = [[45, [69, 72, 76]], [41, [65, 69, 72]], [43, [67, 71, 74]], [40, [64, 68, 71]]];
  const BASS = [0, 0, 12, 0, 0, 12, 7, 12];                          // ทุกโน้ตเขบ็ต 1 ชั้น
  const LEAD = [0, -1, 1, -1, 2, -1, 1, 2, 0, -1, 1, -1, 2, 1, 0, -1]; // -1 = เว้น
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
  let music = null;

  function musicStep(i, t, dur) {
    const s = i % 16;
    const [root, tones] = CHORDS[Math.floor(i / 16) % 4];
    if (s % 2 === 0) playAt(mtof(root + BASS[s / 2]), t, dur * 1.8, 'triangle', 0.09);
    if (LEAD[s] >= 0) playAt(mtof(tones[LEAD[s]]), t, dur * 0.9, 'square', 0.025);
    if (s % 8 === 0) playAt(150, t, 0.12, 'sine', 0.18, -110);   // กลองเบส
    if (s === 4 || s === 12) noiseAt(t, 0.1, 0.07);              // สแนร์
    if (s % 4 === 2) noiseAt(t, 0.04, 0.035);                    // ไฮแฮต
  }

  function startMusic(bpm) {
    stopMusic();
    const a = ac();
    const m = { step: 0, next: a.currentTime + 0.1, dur: 60 / bpm / 4 };
    m.timer = setInterval(() => {
      // ถ้าแท็บถูกพักไว้นาน ไม่เล่นโน้ตที่ค้างทีเดียวพร้อมกัน
      if (m.next < ctx.currentTime) m.next = ctx.currentTime + 0.05;
      while (m.next < ctx.currentTime + 0.15) {
        if (!muted) musicStep(m.step, m.next, m.dur);
        m.step++;
        m.next += m.dur;
      }
    }, 30);
    music = m;
  }

  function stopMusic() {
    if (music) clearInterval(music.timer);
    music = null;
  }

  return {
    correct: () => { tone(523, 0.08); tone(784, 0.14, { delay: 0.08 }); },
    wrong: () => tone(220, 0.25, { type: 'sawtooth', slide: -120 }),
    hit: () => { noise(0.15, 0.2); tone(180, 0.12, { slide: -100 }); },
    hurt: () => { noise(0.2, 0.25); tone(140, 0.2, { type: 'sawtooth', slide: -80 }); },
    block: () => { tone(880, 0.1, { type: 'triangle' }); tone(1320, 0.15, { type: 'triangle', delay: 0.08 }); },
    land: () => { noise(0.12, 0.2); tone(90, 0.15, { slide: -40 }); },
    tick: () => tone(1000, 0.03, { vol: 0.05 }),
    // ฟ้าร้อง: เสียงแตกเปรี้ยง ตามด้วยเสียงคำรามต่ำ ๆ
    thunder: () => {
      noise(0.08, 0.5);
      noise(1.4, 0.3, 0.05);
      tone(55, 1.2, { type: 'sawtooth', slide: -20, vol: 0.14, delay: 0.05 });
    },
    rumble: () => tone(42, 2.2, { type: 'sawtooth', slide: -8, vol: 0.06 }),
    explode: () => { noise(0.6, 0.3); tone(120, 0.5, { type: 'sawtooth', slide: -90, vol: 0.12 }); },
    pop: () => { noise(0.15, 0.15); tone(600, 0.1, { slide: 400, vol: 0.06 }); },
    // เพลงฉลองสั้น ๆ บอสตัวสุดท้ายยาวขึ้น
    victory: (final) => {
      const notes = final ? [523, 659, 784, 1047, 784, 1047, 1319] : [523, 659, 784, 1047];
      notes.forEach((f, i) => tone(f, 0.13, { delay: i * 0.11 }));
      const end = notes.length * 0.11;
      [523, 659, 784].forEach((f) => tone(f, 0.6, { type: 'triangle', vol: 0.08, delay: end }));
    },
    // เสียง "วา วา วาา" ไล่ลง
    lose: () => {
      [392, 370, 349].forEach((f, i) => tone(f, 0.3, { type: 'triangle', slide: -20, delay: i * 0.35 }));
      tone(330, 0.9, { type: 'sawtooth', slide: -110, vol: 0.08, delay: 1.05 });
    },
    startMusic,
    stopMusic,
    isMuted: () => muted,
    setMuted(m) {
      muted = m;
      try { localStorage.setItem('dbg-muted', m ? '1' : '0'); } catch (e) { /* ไม่เป็นไร */ }
    },
  };
})();
