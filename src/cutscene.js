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
function collapseScript() {
  return [
    Cut.run((g) => { g.hero.setState('scripted'); g.heroine.setState('scripted'); g.hero.vx = g.heroine.vx = 0; }),
    Cut.fade(1, 36),
    Cut.run((g) => g.placeAtEscape()),
    Cut.fade(0, 36),
    Cut.say('heroine', '……ここは？', 'her', 60),
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
