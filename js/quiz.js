// แผงคำถาม (HTML): แสดงคำถาม ตัวเลือก ตัวจับเวลา และคำอธิบายหลังตอบผิด
// ตอบได้ทั้งคลิกและกดแป้น 1-4
const Quiz = (() => {
  const $ = (id) => document.getElementById(id);
  const LABELS = ['ก', 'ข', 'ค', 'ง'];
  let current = null;
  let raf = 0;
  let explainTimer = 0;
  let explainDone = null;

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // onAnswer({ correct, timedOut, elapsed }) — elapsed เป็นวินาที
  function show(q, seconds, meta, onAnswer) {
    // ตัวเลือก "ถูกทุกข้อ" ต้องอยู่ท้ายสุดเสมอ ถ้าสลับขึ้นมาข้างหน้าความหมายจะผิด
    const idx = q.choices.map((_, i) => i);
    const pinned = idx.filter((i) => q.choices[i].trim() === 'ถูกทุกข้อ');
    const order = shuffle(idx.filter((i) => !pinned.includes(i))).concat(pinned);
    current = { q, order, onAnswer, start: performance.now(), limit: seconds * 1000, done: false, lastSec: -1 };
    $('quiz').hidden = false;
    $('quiz').classList.remove('explaining');
    $('explain').hidden = true;
    $('q-meta').textContent = meta;
    $('q-text').textContent = q.q;

    const box = $('choices');
    box.innerHTML = '';
    order.forEach((ci, i) => {
      const b = document.createElement('button');
      b.className = 'choice';
      b.dataset.ci = ci;
      const key = document.createElement('span');
      key.className = 'key';
      key.textContent = LABELS[i];
      const label = document.createElement('span');
      label.textContent = q.choices[ci];
      b.append(key, label);
      b.onclick = () => answer(ci);
      box.appendChild(b);
    });
    tick();
  }

  function tick() {
    const c = current;
    const left = c.limit - (performance.now() - c.start);
    $('timer-fill').style.width = Math.max(0, left / c.limit) * 100 + '%';
    const sec = Math.ceil(Math.max(0, left) / 1000);
    $('timer-text').textContent = sec + ' วิ';
    $('timer').classList.toggle('danger', left <= 5000);
    if (sec !== c.lastSec) {
      if (c.lastSec !== -1 && sec <= 5 && sec > 0) Sfx.tick();
      c.lastSec = sec;
    }
    if (left <= 0) return answer(-1);
    raf = requestAnimationFrame(tick);
  }

  function answer(ci) {
    const c = current;
    if (!c || c.done) return;
    c.done = true;
    cancelAnimationFrame(raf);
    const elapsed = Math.min(c.limit, performance.now() - c.start) / 1000;
    document.querySelectorAll('.choice').forEach((b) => {
      b.disabled = true;
      const v = Number(b.dataset.ci);
      if (v === c.q.answer) b.classList.add('right');
      else if (v === ci) b.classList.add('wrong');
    });
    c.onAnswer({ correct: ci === c.q.answer, timedOut: ci === -1, elapsed });
  }

  function explain(title, text, ms, onDone) {
    $('explain-title').textContent = title;
    $('explain-text').textContent = text;
    $('explain').hidden = false;
    $('quiz').classList.add('explaining');
    explainDone = onDone;
    explainTimer = setTimeout(finishExplain, ms);
  }

  function finishExplain() {
    clearTimeout(explainTimer);
    const done = explainDone;
    explainDone = null;
    if (done) done();
  }

  function hide() {
    cancelAnimationFrame(raf);
    clearTimeout(explainTimer);
    explainDone = null;
    current = null;
    $('quiz').hidden = true;
  }

  $('explain-next').onclick = finishExplain;
  document.addEventListener('keydown', (e) => {
    if (explainDone && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); return finishExplain(); }
    if (!current || current.done) return;
    const i = '1234'.indexOf(e.key);
    if (i >= 0 && i < current.order.length) answer(current.order[i]);
  });

  return { show, explain, hide };
})();
