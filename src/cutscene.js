'use strict';
// ---------------------------------------------------------------------------
// Scripted scenes. A scene is a list of steps run one after another while the
// game is in the 'cutscene' state. Each step may have start(g, s), update(g, s, t)
// (return true when finished; no update = finished at once) and end(g, s).
// ---------------------------------------------------------------------------
const advance = () => Input.pressed('jump') || Input.pressed('attack') || Input.pressed('call');

const Cut = {
  wait: (n) => ({ update: (g, s, t) => t >= n }),
  run: (fn) => ({ start: fn }),
  say: (who, text, cls, n = 90) => ({ start: (g) => g.say(g[who], text, cls, n), update: (g, s, t) => t >= n }),
  // message window with a speaker name; waits for a button / tap
  talk: (name, text) => ({
    start: (g) => g.showTalk(name, text),
    update: (g, s, t) => t > 12 && advance(),
    end: (g) => g.hideTalk(),
  }),
  walk: (who, tx, speed = 1) => ({ update: (g) => g.cutWalk(g[who], tx * TILE + 8, speed) }),
  face: (who, dir) => ({ start: (g) => { g[who].facing = dir; } }),
  pose: (who, frame) => ({ start: (g) => { g[who].pose = frame; } }),
  emote: (who, ch, n = 50) => ({ start: (g) => g[who].emote(ch, n) }),
  fade: (to, n) => ({
    start: (g, s) => { s.from = g.black; },
    update: (g, s, t) => { g.black = lerp(s.from, to, Math.min(1, t / n)); return t >= n; },
  }),
  letter: (html, from) => ({
    start: (g) => {
      g.showCenter(`<div class="letter">${from ? '<canvas class="portrait"></canvas>' : ''}${html}<div class="more">▼</div></div>`, true);
      if (from) g.paintPortrait('npc', from + '0');
    },
    update: (g, s, t) => t > 30 && (advance() || Input.pressed('start')),
    end: (g) => g.hideCenter(),
  }),
  // cutscene characters: npc('marta', 'marta', 12, 16, {lit: true}) / npcOff('marta')
  npc: (key, name, tx, ty, opt) => ({ start: (g) => g.addNpc(key, name, tx * TILE + 8, ty * TILE, opt) }),
  npcOff: (key) => ({ start: (g) => g.removeNpc(key) }),
  // a full-screen picture (skipped if the file is not there)
  image: (src) => ({
    start: (g, s) => {
      s.ok = true;
      g.showCenter(`<img class="memory" src="${src}" alt="">`, true);
      const img = g.ui.center.querySelector('img');
      img.onerror = () => { s.ok = false; };
    },
    update: (g, s, t) => !s.ok || (t > 40 && advance()),
    end: (g) => g.hideCenter(),
  }),
  // a line of text on the black screen ("that night...")
  caption: (text, n = 150) => ({
    start: (g) => g.showCenter(`<div class="caption">${text}</div>`, true),
    update: (g, s, t) => t >= n || (t > 40 && advance()),
    end: (g) => g.hideCenter(),
  }),
  chapter: (num, title) => ({
    start: (g) => g.showChapter(num, title),
    update: (g, s, t) => t >= 170,
  }),
};

class Cutscene {
  constructor(game, steps, onEnd) {
    this.g = game; this.steps = steps; this.onEnd = onEnd;
    this.i = -1; this.t = 0; this.done = false;
    this.next();
  }
  next() {
    const prev = this.steps[this.i];
    if (prev && prev.end) prev.end(this.g, prev);
    this.i++; this.t = 0;
    const s = this.steps[this.i];
    if (!s) { this.done = true; this.onEnd(); return; }
    if (s.start) s.start(this.g, s);
    if (!s.update) this.next();
  }
  update() {
    if (this.done) return;
    const s = this.steps[this.i];
    this.t++;
    if (s.update(this.g, s, this.t)) this.next();
  }
}

// ---------------------------------------------------------------------------
// Through the sealed door: the passage beyond, and the cathedral caving in.
// ---------------------------------------------------------------------------
function collapseScript(retry) {
  const setup = Cut.run((g) => { g.hero.setState('scripted'); g.heroine.setState('scripted'); g.hero.vx = g.heroine.vx = 0; });
  const intro = retry
    ? [setup, Cut.run((g) => { g.black = 1; g.placeAtEscape(); }), Cut.fade(0, 30)]
    : [setup, Cut.fade(1, 36), Cut.run((g) => g.placeAtEscape()), Cut.fade(0, 36), Cut.say('heroine', '……ここは？', 'her', 60)];
  return [
    ...intro,
    Cut.run((g) => { g.shake = 6; Sfx.play('door'); Sfx.play('block'); g.heroine.emote('!', 60); }),
    Cut.wait(30),
    Cut.talk('グレイ', '地鳴り……！ 聖堂が 崩れはじめている！'),
    Cut.run((g) => { g.shake = 8; Sfx.play('block'); }),
    Cut.talk('ルミナ', 'グレイさん……！'),
    Cut.face('hero', -1),
    Cut.talk('グレイ', 'ルミナ、手を！ ……離すんじゃないぞ。 走れ！'),
    Cut.face('hero', 1),
  ];
}

// ---------------------------------------------------------------------------
// Chapter 3: Marta at the sanatorium, then the bells.
// ---------------------------------------------------------------------------
function martaScript(spot) {
  return [
    Cut.run((g) => {
      g.hero.setState('scripted'); g.heroine.setState('scripted'); g.hero.vx = g.heroine.vx = 0;
      g.heroine.hooded = false;
      g.addNpc('marta', 'marta', spot.x, spot.y);
    }),
    Cut.walk('hero', 311, 0.6),
    Cut.walk('heroine', 312.4, 0.6),
    Cut.talk('マルタ', '……その 光は。 ……ルミナ？ ルミナ なのね。'),
    Cut.talk('ルミナ', 'マルタ……！ ずっと、会いたかった。'),
    Cut.run((g) => g.heroine.emote('♥', 80)),
    Cut.talk('マルタ', '大きく なったねえ……。 グレイ、あなたが 連れてきて くれたのね。'),
    Cut.talk('グレイ', '約束だからな。 ……体は どうだ。'),
    Cut.talk('マルタ', 'わたしのことは いいの。 それより、女王様が 灯狩りを 急がせている。 この街も 長くは いられないわ。'),
    Cut.talk('マルタ', 'ルミナ、これを。 わたしが ずっと 胸に つけていた 小さな灯り。'),
    Cut.run((g) => { Sfx.play('save'); g.particles.burst(g.heroine.x, g.heroine.y - 20, 14, { col: '#ffe0a0', life: 30, max: 1.2 }); }),
    Cut.talk('マルタ', '小さな灯りで いいの。 消さずに、持って いきなさい。'),
    Cut.talk('ルミナ', '……うん。 ぜったい、消さない。'),
    Cut.run((g) => { Sfx.play('lever'); g.shake = 3; }),
    Cut.wait(20),
    Cut.run((g) => { Sfx.play('lever'); g.shake = 3; }),
    Cut.talk('グレイ', '……鐘だ。 窓から 光が 漏れたか。'),
    Cut.talk('マルタ', '裏の 階段から 屋根へ 出られるわ。 北の門まで 屋根伝いに 行きなさい。 ……さあ、早く！'),
  ];
}

function bellsScript(retry) {
  const setup = Cut.run((g) => { g.hero.setState('scripted'); g.heroine.setState('scripted'); g.hero.vx = g.heroine.vx = 0; });
  return [
    setup,
    Cut.run((g) => { if (retry) g.black = 1; }),
    ...(retry ? [] : [Cut.fade(1, 30)]),
    Cut.run((g) => g.placeAtEscape()),
    Cut.fade(0, 30),
    Cut.run((g) => { Sfx.play('lever'); g.shake = 3; }),
    Cut.say('hero', 'ルミナ、手を！ 北の門まで 走るぞ！', 'hero', 90),
  ];
}

// ---------------------------------------------------------------------------
// Chapter 4: the logbook, the flood of shadows, the great lamp.
// ---------------------------------------------------------------------------
const hold = () => Cut.run((g) => { g.hero.setState('scripted'); g.heroine.setState('scripted'); g.hero.vx = g.heroine.vx = 0; });
function logbookScript() {
  return [
    hold(),
    Cut.run((g) => { g.heroine.facing = 1; }),
    Cut.talk('ルミナ', 'グレイさん、これ……。 灯守りの 日誌？'),
    Cut.talk('グレイ', '……！ ルミナ、それは――'),
    Cut.talk('ルミナ', '「十三年前、大影の夜。 女王陛下の命により、王女殿下を 地下聖堂へ お運びする。 ――灯守り グレイ」'),
    Cut.image('assets/story/memory.webp'),
    Cut.talk('ルミナ', '……うそ。 グレイさんが……？'),
    Cut.talk('グレイ', '……本当だ。 あの夜、君を 聖堂へ 運んだのは、わたしだ。'),
    Cut.run((g) => { g.shake = 6; Sfx.play('emerge'); g.fade = 0.5; g.heroine.emote('!', 80); }),
    Cut.wait(40),
    Cut.talk('ルミナ', '……っ。 ……いまは、なにも 聞きたくない。'),
    Cut.talk('グレイ', '（ルミナの光が 揺らいでいる。 ……離れては いけない）'),
  ];
}
function bossStartScript() {
  return [
    hold(),
    Cut.run((g) => { g.shake = 4; Sfx.play('emerge'); g.heroine.emote('!', 80); }),
    { update: (g, s, t) => { g.moth.update(g); return g.moth.state === 'cruise' || t > 400; } },   // it comes down out of the dome
    Cut.talk('ルミナ', '……おおきな、ちょうちょ？'),
    Cut.talk('グレイ', '影蛾（かげが）だ……！ 火の消えた大灯に 巣くって、十三年、灯りを 待っていたのか。'),
    Cut.talk('グレイ', 'あれは 光に 群がる。 ルミナ、台座へ！ 光の筋で 翅を 焼くんだ。'),
    Cut.walk('heroine', 80, 1),
    Cut.talk('グレイ', '筋の向きは わたしが 変える。 ……落ちてきたら、灯竿の 出番だ。'),
  ];
}
function afterBossScript() {
  return [
    hold(),
    Cut.wait(40),
    Cut.talk('ルミナ', '……光の こなに なって、消えちゃった。 あの子も、ずっと 光が ほしかったのかな。'),
    Cut.talk('グレイ', '……ルミナ。 すまなかった。'),
    Cut.talk('グレイ', 'あの夜、君を 暗闇へ 運んだのは わたしだ。 許してほしくて 迎えに行ったんじゃない。'),
    Cut.talk('グレイ', '……ただ、君に 光のある場所を 見せたかった。'),
    Cut.talk('ルミナ', '……わたしを 連れて行ったのも、迎えに来てくれたのも、あなただったんだね。'),
    Cut.run((g) => g.heroine.emote('♥', 90)),
    Cut.talk('ルミナ', '……来てくれて、ありがとう。 グレイさん。'),
  ];
}
function lampScript() {
  return [
    hold(),
    Cut.talk('グレイ', 'この火を 最後に 消したのも、わたしだ。 ……十三年ぶりだな。'),
    Cut.run((g) => { g.fade = 1; Sfx.play('clear'); g.shake = 4; }),
    Cut.wait(60),
    Cut.talk('ルミナ', 'きれい……。 これが、グレイさんの 守ってた 灯り？'),
    Cut.talk('グレイ', 'ああ。 ……君の 光だよ。'),
    Cut.talk('ルミナ', 'みて……。 塔の影が、谷の ほうへ 伸びていく。'),
    Cut.talk('グレイ', '影の子らが 帰っていく。 ……あの谷へ。 行こう、ルミナ。'),
  ];
}

// ---------------------------------------------------------------------------
// Prologue: Marta's letter -> Grey climbs down into the forgotten cathedral ->
// finds Lumina talking to her own shadow -> she takes his hand -> the seal
// breaks and the shadows wake up.
// ---------------------------------------------------------------------------
const MARTA_LETTER = `
  <p>グレイ様</p>
  <p>病の床より 筆をとります。<br>十三年前の あの夜のことを、あなたも 忘れてはいないでしょう。</p>
  <p>地下聖堂の いちばん奥で、あの子は いまも ひとりで 灯っています。<br>名は ルミナ。</p>
  <p>わたしには もう、あの子のもとへ 降りていく力が ありません。<br>どうか あの子を、外へ 連れ出してください。<br>光のある場所へ。</p>
  <p class="sig">マルタ</p>`;

function prologueScript() {
  return [
    Cut.run((g) => g.setupPrologue()),
    Cut.letter(MARTA_LETTER, 'marta'),
    Cut.fade(0, 70),
    Cut.wait(40),
    Cut.say('heroine', 'きょうも ふたりきり だね。', 'her', 120),
    Cut.run((g) => { g.wallShadow.wave = true; }),
    Cut.wait(70),
    Cut.run((g) => { g.wallShadow.wave = false; }),
    // Grey slides down the rope from the collapsed shaft
    {
      start: (g) => { g.hero.kinematic = true; g.hero.pose = 'jump7'; },
      update: (g, s, t) => {
        const k = Math.min(1, t / 110);
        g.hero.y = lerp(4 * TILE, 15 * TILE, k);
        if (k < 1) return false;
        g.hero.kinematic = false; g.hero.pose = 'jump13';
        Sfx.play('land');
        return true;
      },
    },
    Cut.wait(12),
    Cut.pose('hero', null),
    Cut.say('hero', '……ここが、忘れられた地下聖堂か。', 'hero', 110),
    Cut.walk('hero', 14.1, 0.9),
    Cut.face('hero', -1),
    Cut.say('hero', '……子ども？', 'hero', 70),
    Cut.run((g) => { Sfx.play('lever'); g.gates.find((x) => x.id === 'g0').locked = true; }),
    Cut.wait(46),
    Cut.run((g) => { g.heroine.facing = 1; g.heroine.emote('!', 60); }),
    Cut.wait(40),
    Cut.talk('ルミナ', '……あなたは、影じゃない人？'),
    Cut.talk('グレイ', 'ああ。わたしは グレイ。……君が、ルミナだね。'),
    Cut.talk('ルミナ', 'どうして わたしの名前を 知ってるの？'),
    Cut.talk('グレイ', 'マルタに 頼まれたんだ。君を 外へ連れ出してほしい、と。'),
    Cut.talk('ルミナ', 'マルタ……！ ずっと 来てくれなかったの。'),
    Cut.talk('グレイ', '病気でね。……さあ、行こう。'),
    Cut.walk('hero', 9.2, 0.8),
    Cut.face('hero', -1),
    Cut.pose('hero', 'jump1'),              // kneels and holds out his hand
    Cut.wait(40),
    Cut.walk('heroine', 8.1, 0.55),
    Cut.face('heroine', 1),
    Cut.pose('heroine', 'hand'),
    Cut.wait(30),
    Cut.run((g) => { Sfx.play('catch'); g.heroine.emote('♥', 70); }),
    Cut.wait(80),
    // the seal breaks: her shadow swells and scatters into the depths
    Cut.run((g) => g.awaken()),
    Cut.wait(100),
    Cut.run((g) => g.shatterShadow()),
    Cut.wait(80),
    Cut.pose('hero', null),
    Cut.pose('heroine', null),
    Cut.talk('ルミナ', '……影が、みんな……目を覚ました……。'),
    Cut.talk('グレイ', 'いかん、上の縄が……！ ……ほかの出口を 探すしかないな。'),
    Cut.talk('グレイ', 'ルミナ、わたしから 離れるんじゃないぞ。'),
    Cut.talk('ルミナ', 'うん……。……ねえ、グレイさん。そとって、どんなところ？'),
    Cut.talk('グレイ', '光のあるところさ。……行こう。'),
    Cut.face('hero', 1),
    Cut.chapter('第1章', '忘れられた地下聖堂'),
  ];
}

// ---------------------------------------------------------------------------
// Chapter 5: the wall of shadow plays, the whale, the great shadow wakes and goes.
// ---------------------------------------------------------------------------
function playwallScript(lit) {
  return [
    hold(),
    Cut.talk('ルミナ', '……この かべ。'),
    Cut.run((g) => g.heroine.emote('!', 70)),
    Cut.talk('ルミナ', 'うさぎ、ことり、きつね……くじら。 これ、わたしが つくったの。 ひとりで、まいばん。'),
    Cut.talk('ルミナ', '聖堂の かべに てを かざして、ろうそくの あかりで……。 みんなに なまえも つけたの。'),
    Cut.talk('グレイ', '……影の子らは、君の 影絵から 生まれたのか。'),
    Cut.talk('ルミナ', 'みんな、わたしを つれていこうと してたんじゃ ないんだね。 ……さみしかったんだ。 わたしと おなじで。'),
    ...(lit > 0 ? [Cut.talk('ルミナ', `${lit} まいの 絵に、あかりが ともってる……。 ひろってきた かけらの ぶんだけ。`)] : []),
    Cut.talk('グレイ', '……谷の 奥へ 行こう。 あの子らが 帰っていった 先へ。'),
  ];
}
function whaleStartScript() {
  return [
    hold(),
    Cut.run((g) => { g.shake = 3; Sfx.play('emerge'); }),
    Cut.wait(70),
    Cut.talk('ルミナ', '……くじら？'),
    Cut.talk('グレイ', '影の海に 棲む影か……。 奥で 眠っている 何かを 守っているようだ。'),
    Cut.talk('グレイ', 'ルミナ、この岩の上で 待っていてくれ。 君の光の中へ、あれを 打ち上げてやる。'),
    Cut.walk('heroine', 343, 0.8),
    Cut.talk('グレイ', '（波紋が 足元に 集まったら、跳び出してくる合図だ）'),
  ];
}
function whaleEndScript() {
  return [
    hold(),
    Cut.wait(40),
    Cut.talk('ルミナ', '……ちいさく なった。'),
    Cut.run((g) => g.heroine.emote('!', 70)),
    Cut.talk('ルミナ', 'くじらさん……？ ……わたしが いちばん さいしょに つくった 影絵。'),
    Cut.talk('ルミナ', 'ずっと、ここで まってたの？ ……ごめんね。 もう、ひとりじゃないよ。'),
    Cut.talk('グレイ', '影を 消すのは 闇じゃない。 ……もうひとつの 光だ。 君が 照らしたから、あの子は 還れたんだ。'),
    Cut.run((g) => { if (g.ookage) g.ookage.state = 'wake'; g.shake = 4; Sfx.play('emerge'); }),
    Cut.wait(130),
    Cut.talk('ルミナ', '……！ あれも……わたし？'),
    Cut.talk('グレイ', 'ルミナ、下がれ！'),
    Cut.run((g) => { if (g.ookage) g.ookage.state = 'go'; g.shake = 8; Sfx.play('fall'); }),
    Cut.wait(130),
    Cut.talk('グレイ', '……王城の ほうへ 行った。'),
    Cut.run((g) => { g.shake = 6; Sfx.play('block'); }),
    Cut.talk('グレイ', '谷が 崩れる……！'),
  ];
}
function valleyEscapeScript(retry) {
  const setup = Cut.run((g) => { g.hero.setState('scripted'); g.heroine.setState('scripted'); g.hero.vx = g.heroine.vx = 0; });
  return [
    setup,
    Cut.run((g) => { if (retry) g.black = 1; if (g.ookage) g.ookage.alpha = 0; }),
    ...(retry ? [] : [Cut.fade(1, 30)]),
    Cut.run((g) => g.placeAtEscape()),
    Cut.fade(0, 30),
    Cut.run((g) => { Sfx.play('block'); g.shake = 4; }),
    Cut.say('hero', 'ルミナ、手を！ 上まで 駆け上がるぞ！', 'hero', 90),
  ];
}

// ---------------------------------------------------------------------------
// Opening (before the prologue): how the country of lamps went dark. Four scenes
// drawn by hand on the canvas, a few lines of narration each. Buttons show the
// rest of the lines / go on; the skip key goes straight to the prologue.
// ---------------------------------------------------------------------------
const OPENING = [
  { kind: 'town', dur: 560, lines: [
    'むかし、灯（ともしび）の国の夜は、たくさんの 灯りに 満ちていた。',
    '灯守りたちが 毎晩 街灯に 火を入れ、人々は 灯の巫女の 祈りのもとで 暮らしていた。'] },
  { kind: 'night', dur: 680, lines: [
    '十三年前。 王女が 生まれた夜、城から 光が あふれ――',
    'その光が 落とした 巨大な影が、王都を 呑みこんだ。',
    '王は、行方知れずと なった。'] },
  { kind: 'curfew', dur: 600, lines: [
    '影を 恐れた女王は、国じゅうの 灯りを 消すよう 命じた。',
    '「光がなければ、影も 生まれない」'] },
  { kind: 'chapel', dur: 560, lines: [
    'それから、十三年。',
    '地図にない 地下聖堂の 奥で、ひとつの 小さな光が、壁の影と 話していた。'] },
];

// the town on its hill below the castle, with (some of) its lamps
const OP_LAMPS = Array.from({ length: 34 }, (_, i) => {
  const r = (n) => { const v = Math.sin(i * 127.1 + n * 311.7) * 43758.5453; return v - Math.floor(v); };
  return { x: 12 + r(1) * 360, y: 132 + r(2) * 58 + (r(1) > 0.62 ? -18 : 0), off: r(3) };
});
function drawOpening(ctx, op) {
  const S = OPENING[op.i], t = op.t, k = Math.min(1, t / S.dur);
  const W = VW, Hh = VH;
  const sky = (top, bot) => { const g = ctx.createLinearGradient(0, 0, 0, Hh); g.addColorStop(0, top); g.addColorStop(1, bot); ctx.fillStyle = g; ctx.fillRect(0, 0, W, Hh); };
  const stars = (a) => {
    for (let i = 0; i < 46; i++) {
      const r = (n) => { const v = Math.sin(i * 91.7 + n * 47.3) * 24634.6345; return v - Math.floor(v); };
      ctx.fillStyle = `rgba(220,220,255,${a * (0.5 + 0.5 * Math.sin(t * 0.03 + i))})`; ctx.fillRect(Math.floor(r(1) * W), Math.floor(r(2) * 120), 1, 1);
    }
  };
  const pan = -t * 0.05;
  const castle = (col) => {                          // on its hill, left of centre
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.moveTo(0, 150); ctx.quadraticCurveTo(110, 96, 230, 140); ctx.lineTo(W, 150); ctx.lineTo(W, Hh); ctx.lineTo(0, Hh); ctx.fill();
    const cx = 118 + pan;
    ctx.fillRect(cx - 30, 78, 60, 40); ctx.fillRect(cx - 40, 64, 14, 54); ctx.fillRect(cx + 26, 60, 14, 58); ctx.fillRect(cx - 8, 40, 16, 40);
    ctx.beginPath(); ctx.moveTo(cx - 42, 64); ctx.lineTo(cx - 33, 48); ctx.lineTo(cx - 24, 64); ctx.fill();
    ctx.beginPath(); ctx.moveTo(cx + 24, 60); ctx.lineTo(cx + 33, 42); ctx.lineTo(cx + 42, 60); ctx.fill();
    ctx.beginPath(); ctx.moveTo(cx - 10, 40); ctx.lineTo(cx, 22); ctx.lineTo(cx + 10, 40); ctx.fill();
    return cx;
  };
  const roofs = (col) => {
    ctx.fillStyle = col;
    for (let i = 0; i < 16; i++) {
      const x = (i * 26 + pan * 2) % (W + 40) - 20, h = 22 + ((i * 37) % 20);
      ctx.fillRect(x, Hh - 30 - h, 22, h + 30);
      ctx.beginPath(); ctx.moveTo(x - 2, Hh - 30 - h); ctx.lineTo(x + 11, Hh - 42 - h); ctx.lineTo(x + 24, Hh - 30 - h); ctx.fill();
    }
  };
  const lamps = (lit) => {
    for (const L of OP_LAMPS) {
      if (!lit(L)) continue;
      const tw = 0.75 + 0.25 * Math.sin(t * 0.08 + L.off * 20);
      ctx.fillStyle = `rgba(255,200,110,${0.12 * tw})`; ctx.fillRect(L.x - 6, L.y - 6, 14, 14);
      ctx.fillStyle = `rgba(255,200,110,${0.25 * tw})`; ctx.fillRect(L.x - 2, L.y - 2, 6, 6);
      ctx.fillStyle = `rgba(255,236,170,${tw})`; ctx.fillRect(L.x, L.y, 2, 2);
    }
  };
  switch (S.kind) {
    case 'town':
      sky('#1a1840', '#4a3060'); stars(0.8);
      castle('#241c38'); lamps(() => true); roofs('#16122a'); lamps((L) => L.y > 175);
      break;
    case 'night': {
      sky('#141230', '#302040'); stars(0.6);
      const cx = castle('#1e1830'); lamps(() => true); roofs('#140f24');
      // a burst of light from the castle, then the shadow it throws, over everything
      const f = clamp((t - 90) / 60, 0, 1), s = clamp((t - 170) / 260, 0, 1);
      if (f > 0) {
        const r = 10 + f * 220, a = 0.95 * clamp(1 - s * 3, 0, 1);
        if (a > 0) {
          const g = ctx.createRadialGradient(cx, 70, 2, cx, 70, r);
          g.addColorStop(0, `rgba(255,250,230,${a})`); g.addColorStop(1, 'rgba(255,240,200,0)');
          ctx.fillStyle = g; ctx.fillRect(0, 0, W, Hh);
        }
      }
      if (s > 0) {
        // a mass of shadow welling up out of the castle and rolling out over the town
        for (let i = 0; i < 26; i++) {
          const a = i / 26 * Math.PI * 2, d = s * (60 + (i % 5) * 40), rr = 14 + s * (30 + (i * 7) % 26);
          const x = cx + Math.cos(a) * d * 1.6 + Math.sin(t * 0.02 + i) * 4, y = 64 + Math.sin(a) * d * 0.7;
          const c = `${10 + (i % 3) * 8},${6 + (i % 3) * 4},${22 + (i % 3) * 10}`;
          const g = ctx.createRadialGradient(x, y, 0, x, y, rr * 1.4);                  // soft-edged, like smoke
          g.addColorStop(0, `rgba(${c},${0.6 + 0.3 * s})`); g.addColorStop(0.6, `rgba(${c},${0.35 * s + 0.2})`); g.addColorStop(1, `rgba(${c},0)`);
          ctx.fillStyle = g; ctx.fillRect(x - rr * 1.4, y - rr * 1.4, rr * 2.8, rr * 2.8);
        }
        ctx.fillStyle = `rgba(6,3,12,${0.6 * s})`; ctx.fillRect(0, 0, W, Hh);
        // two yellow points, far up in it
        if (s > 0.6) { ctx.fillStyle = `rgba(255,233,168,${(s - 0.6) * 2})`; ctx.fillRect(cx + 20, 46, 2, 2); ctx.fillRect(cx + 34, 46, 2, 2); }
      }
      break;
    }
    case 'curfew':
      sky('#0e0c20', '#1e1830'); stars(0.4);
      castle('#18142a');
      // the lamps go out one after another
      lamps((L) => L.off > k * 1.15);
      roofs('#100c1e');
      if ((t >> 5) % 2 === 0 && k < 0.9) { ctx.fillStyle = 'rgba(160,150,190,0.3)'; ctx.fillRect(0, 0, W, 1); }
      break;
    case 'chapel': {
      ctx.fillStyle = '#05040a'; ctx.fillRect(0, 0, W, Hh);
      const x = W / 2, y = Hh - 60;
      const g = ctx.createRadialGradient(x, y - 14, 2, x, y - 14, 70);
      g.addColorStop(0, 'rgba(255,236,190,0.5)'); g.addColorStop(1, 'rgba(255,236,190,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, Hh);
      ctx.fillStyle = '#1a1624'; ctx.fillRect(0, y, W, 60);
      // her shadow on the wall behind her, bigger than she is
      const [sx, sy, w, hh, ax, ay] = Sheets.heroine.f.idle0;
      ctx.save(); ctx.globalAlpha = 0.6 + Math.sin(t * 0.05) * 0.05; ctx.translate(x + 30, y); ctx.scale(-2.2, 2.2);
      ctx.drawImage(Sheets.heroine.dark, sx, sy, w, hh, -ax, -ay, w, hh);
      ctx.restore();
      drawSprite(ctx, 'heroine', 'idle0', x, y, false);
      break;
    }
  }
  // fade in / out of each scene
  const edge = Math.min(t, S.dur - t);
  if (edge < 40) { ctx.fillStyle = `rgba(0,0,0,${1 - edge / 40})`; ctx.fillRect(0, 0, W, Hh); }
}
