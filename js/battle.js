// ฉากต่อสู้ (Phaser): ฉากหลัง ตัวละคร หัวใจ แถบพลังบอส และแอนิเมชันโจมตี
// main.js เป็นผู้สั่งงานผ่านเมธอดของคลาสนี้ ฉากไม่รู้กติกาเกมเอง
class BattleScene extends Phaser.Scene {
  constructor() { super('battle'); }

  create() {
    Sprites.register(this);
    this.groundY = 185;
    this.playerHome = 170;
    this.bossHome = 470;

    this.bg = this.add.graphics();
    this.add.ellipse(this.playerHome, this.groundY, 70, 12, 0x000000, 0.35);
    this.add.ellipse(this.bossHome, this.groundY, 130, 16, 0x000000, 0.35);
    this.player = this.add.image(this.playerHome, this.groundY, 'player').setOrigin(0.5, 1).setDepth(5);
    this.boss = this.add.image(this.bossHome, this.groundY, 'boss-' + CONFIG.bosses[0].id)
      .setOrigin(0.5, 1).setDepth(5).setVisible(false);
    this.dim = this.add.rectangle(320, 108, 640, 216, 0x3a0008).setDepth(3).setVisible(false);

    this.hud = this.add.graphics().setDepth(10);
    this.heartIcons = [];
    this.bossName = this.add.text(620, 12, '', {
      fontFamily: 'Kanit', fontSize: '20px', color: '#ffffff', stroke: '#000000', strokeThickness: 5,
    }).setOrigin(1, 0).setDepth(10);

    this.bob = this.tweens.add({ targets: this.player, y: this.groundY - 4, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.drawBackground(CONFIG.bosses[0]);
    if (window.onBattleReady) window.onBattleReady(this);
  }

  drawBackground(cfg) {
    const C = Phaser.Display.Color;
    const g = this.bg;
    g.clear();

    // ท้องฟ้าไล่สีเป็นแถบ ๆ แบบพิกเซล
    const top = C.HexStringToColor(cfg.sky[0]);
    const bot = C.HexStringToColor(cfg.sky[1]);
    const bands = 10;
    const h = this.groundY / bands;
    for (let i = 0; i < bands; i++) {
      const c = C.Interpolate.ColorWithColor(top, bot, bands - 1, i);
      g.fillStyle(C.GetColor(c.r, c.g, c.b)).fillRect(0, Math.floor(i * h), 640, Math.ceil(h) + 1);
    }

    // เจดีย์ไกล ๆ เป็นเงาขั้นบันได
    g.fillStyle(C.HexStringToColor(cfg.silhouette).color);
    let y = this.groundY;
    [[110, 18], [86, 16], [62, 22], [40, 20], [24, 18], [10, 34]].forEach(([w, hh]) => {
      y -= hh;
      g.fillRect(320 - w / 2, y, w, hh);
    });

    // พื้น
    const ground = C.HexStringToColor(cfg.ground).color;
    g.fillStyle(ground).fillRect(0, this.groundY, 640, this.scale.height - this.groundY);
    g.fillStyle(0xffffff, 0.12).fillRect(0, this.groundY, 640, 3);
    g.fillStyle(0x000000, 0.18);
    for (let x = 0; x < 640; x += 32) g.fillRect(x + ((x / 32) % 2) * 8, this.groundY + 10, 12, 3);
    for (let x = 16; x < 640; x += 32) g.fillRect(x, this.groundY + 21, 8, 3);
  }

  setBoss(cfg) {
    this.bossCfg = cfg;
    this.dim.setVisible(false);
    this.drawBackground(cfg);
    this.bossName.setText(cfg.name);
    const b = this.boss;
    this.tweens.killTweensOf(b);
    b.setTexture('boss-' + cfg.id).setVisible(true).setAlpha(1).setAngle(0).setScale(1).clearTint();
    b.x = this.bossHome;
    b.y = -40;
    this.tweens.add({
      targets: b, y: this.groundY, duration: 600, ease: 'Bounce.out',
      onComplete: () => {
        Sfx.land();
        this.cameras.main.shake(150, 0.01);
        this.tweens.add({ targets: b, scaleY: 0.95, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      },
    });
  }

  drawHUD(hearts, heartSlots, bossHp, bossMax, shields) {
    this.heartIcons.forEach((h) => h.destroy());
    this.heartIcons = [];
    for (let i = 0; i < heartSlots; i++) {
      this.heartIcons.push(this.add.image(20 + i * 34, 16, i < hearts ? 'heart' : 'heart-empty').setOrigin(0, 0).setDepth(10));
    }
    for (let j = 0; j < shields; j++) {
      this.heartIcons.push(this.add.image(28 + (heartSlots + j) * 34, 12, 'shield').setOrigin(0, 0).setDepth(10));
    }

    // แถบพลังบอสแบบแบ่งช่อง ช่องละ 1 ข้อที่ต้องตอบถูก
    const g = this.hud;
    g.clear();
    const w = 200, x = 620 - w, y = 44, gap = 4;
    const seg = (w - gap * (bossMax - 1)) / bossMax;
    for (let i = 0; i < bossMax; i++) {
      const sx = x + i * (seg + gap);
      g.fillStyle(0x000000, 0.7).fillRect(sx - 2, y - 2, seg + 4, 18);
      g.fillStyle(i < bossHp ? 0xe43b44 : 0x3a4466).fillRect(sx, y, seg, 14);
    }
  }

  playerAttack(done) {
    this.tweens.add({
      targets: this.player, x: this.bossHome - 100, duration: 180, ease: 'Quad.in', yoyo: true, hold: 60,
      onYoyo: () => {
        Sfx.hit();
        this.hitFlash(this.boss, 0xffffff);
        this.cameras.main.shake(120, 0.008);
        this.floatText(this.boss.x, this.groundY - 130, '-1', '#ffd23f');
      },
      onComplete: () => this.time.delayedCall(250, done),
    });
  }

  // blocked = ผู้เล่นใช้โล่กันไว้ ไม่เสียหัวใจ
  bossAttack(done, blocked) {
    this.tweens.add({
      targets: this.boss, x: this.playerHome + 110, duration: 220, ease: 'Quad.in', yoyo: true, hold: 80,
      onYoyo: () => {
        if (blocked) {
          Sfx.block();
          this.cameras.main.shake(120, 0.006);
          this.hitFlash(this.player, 0x9ef0ff);
          this.floatText(this.player.x, this.groundY - 120, 'โล่กันได้!', '#9ef0ff');
          return;
        }
        Sfx.hurt();
        this.cameras.main.shake(200, 0.015);
        this.hitFlash(this.player, 0xff4040);
        this.floatText(this.player.x, this.groundY - 120, '-1 ♥', '#ff6b6b');
      },
      onComplete: () => this.time.delayedCall(250, done),
    });
  }

  // ฉากชนะ: สั่นและระเบิดย่อย → ระเบิดใหญ่ → ฉลอง (final = บอสตัวสุดท้าย มีพลุเพิ่ม)
  bossDefeat(done, final) {
    const b = this.boss;
    const p = this.bossCfg.palette;
    const colors = [p[3], p[4], p[7], '#ffd23f', '#ffffff'].map((c) => parseInt(c.slice(1), 16));
    this.tweens.killTweensOf(b);
    b.setScale(1);

    this.tweens.add({ targets: b, x: b.x + 4, duration: 40, yoyo: true, repeat: 12 });
    for (let i = 0; i < 4; i++) {
      this.time.delayedCall(i * 150, () => {
        Sfx.hit();
        this.hitFlash(b, 0xffffff);
        this.burst(b.x + Phaser.Math.Between(-50, 50), this.groundY - Phaser.Math.Between(30, 110), colors, 12, 140);
      });
    }

    this.time.delayedCall(650, () => {
      Sfx.explode();
      this.cameras.main.flash(250, 255, 255, 255);
      this.cameras.main.shake(400, 0.025);
      this.burst(b.x, this.groundY - 60, colors, 90, 320);
      this.tweens.add({ targets: b, scaleX: 1.4, scaleY: 0.2, alpha: 0, duration: 250, ease: 'Quad.in' });
    });

    this.time.delayedCall(1000, () => {
      Sfx.victory(final);
      this.bigText(final ? 'ปราบกิเลสครบแล้ว!' : 'ชนะ!', '#ffd23f');
      this.confetti();
      this.bob.pause();
      this.tweens.add({
        targets: this.player, y: this.groundY - 34, duration: 220, yoyo: true, repeat: 2, ease: 'Quad.out',
        onComplete: () => this.bob.resume(),
      });
      if (final) {
        const sky = [0xffd23f, 0xe43b44, 0x5fc8e8, 0x3dff6e, 0xffffff];
        for (let i = 0; i < 4; i++) {
          this.time.delayedCall(300 + i * 350, () => {
            Sfx.pop();
            this.burst(Phaser.Math.Between(120, 520), Phaser.Math.Between(30, 90), sky, 50, 200);
          });
        }
      }
    });

    this.time.delayedCall(final ? 3200 : 2600, done);
  }

  // ฉากแพ้: ผู้เล่นกระเด็นล้ม ฉากมืดลง บอสหัวเราะ
  playerDefeat(done) {
    const pl = this.player;
    this.bob.pause();
    Sfx.lose();
    this.hitFlash(pl, 0xff4040);
    this.cameras.main.shake(300, 0.02);
    this.tweens.add({
      targets: pl, x: pl.x - 40, y: this.groundY, angle: -90, duration: 500, ease: 'Quad.out',
      onComplete: () => pl.setTint(0x666666),
    });
    this.dim.setAlpha(0).setVisible(true);
    this.tweens.add({ targets: this.dim, alpha: 0.5, duration: 800 });

    this.time.delayedCall(500, () => {
      this.floatText(this.boss.x, this.groundY - 130, 'ฮ่า ฮ่า ฮ่า!', '#ffffff', 26);
      this.tweens.add({ targets: this.boss, y: this.groundY - 14, duration: 140, yoyo: true, repeat: 3, ease: 'Quad.out' });
    });
    this.time.delayedCall(900, () => this.bigText('พ่ายแพ้...', '#c9c3d9'));
    this.time.delayedCall(2600, done);
  }

  resetPlayer() {
    this.player.x = this.playerHome;
    this.player.y = this.groundY;
    this.player.setAngle(0).setAlpha(1).clearTint();
    this.bob.resume();
    this.dim.setVisible(false);
  }

  burst(x, y, colors, count, speed) {
    const em = this.add.particles(x, y, 'px', {
      speed: { min: speed * 0.3, max: speed },
      angle: { min: 0, max: 360 },
      lifespan: { min: 500, max: 1000 },
      scale: { start: 1, end: 0 },
      gravityY: 250,
      tint: colors,
      emitting: false,
    }).setDepth(15);
    em.explode(count);
    this.time.delayedCall(1200, () => em.destroy());
  }

  confetti() {
    const em = this.add.particles(0, -10, 'px', {
      x: { min: 0, max: 640 },
      speedY: { min: 60, max: 140 },
      speedX: { min: -30, max: 30 },
      lifespan: 2500,
      rotate: { min: 0, max: 360 },
      tint: [0xffd23f, 0xe43b44, 0x3dff6e, 0x5fc8e8, 0xffffff],
      frequency: 30,
      quantity: 2,
    }).setDepth(15);
    this.time.delayedCall(1400, () => em.stop());
    this.time.delayedCall(4000, () => em.destroy());
  }

  bigText(text, color) {
    const t = this.add.text(320, 80, text, {
      fontFamily: 'Kanit', fontSize: '48px', color, stroke: '#000000', strokeThickness: 8,
    }).setOrigin(0.5).setDepth(25).setScale(0);
    this.tweens.add({ targets: t, scale: 1, duration: 400, ease: 'Back.out' });
    this.tweens.add({ targets: t, alpha: 0, delay: 1700, duration: 400, onComplete: () => t.destroy() });
  }

  hitFlash(target, color) {
    target.setTintFill(color);
    this.time.delayedCall(90, () => target.clearTint());
    this.time.delayedCall(180, () => target.setTintFill(color));
    this.time.delayedCall(270, () => target.clearTint());
  }

  floatText(x, y, text, color, size = 30) {
    const t = this.add.text(x, y, text, {
      fontFamily: 'Kanit', fontSize: size + 'px', color, stroke: '#000000', strokeThickness: 6,
    }).setOrigin(0.5).setDepth(20);
    this.tweens.add({ targets: t, y: y - 40, alpha: 0, duration: 900, ease: 'Quad.out', onComplete: () => t.destroy() });
  }
}
