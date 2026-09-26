# 第4章 真相の一枚絵 ― 画像生成プロンプト

場面：13 年前の「大影の夜」。灯守りだった若いグレイが、女王の命で、生まれたばかりの王女（ルミナ）を
地下聖堂の奥へ運んでいく。赤子の光が石段を照らし、その光が作った大きな影が壁を這い上がっている。
グレイの顔には迷いと痛み。赤子は安らかに眠っている。

ゲームでは記録の間で日誌を読んだ直後に、画面いっぱいに表示する（タイトル画面と同じ扱い）。

## プロンプト（英語）

```
A single illustration in the style of a 16-bit SNES-era fantasy RPG cutscene, detailed pixel art, cinematic.
Night, 13 years ago. A long, narrow stone staircase spiralling down into an ancient underground cathedral,
carved pillars fading into darkness below.
Descending the stairs: a lamplighter in his late forties — dark brown hair with a first touch of grey,
short dark beard, a long brown trench coat with brass buttons, a lamplighter's pole slung across his back
(a slender wooden pole with a small brass lantern hook at the top, unlit).
In his arms he carries a newborn baby wrapped in a pale cream blanket; the baby is asleep and softly glowing
with a warm golden-white light, the only light source in the scene.
The baby's light throws a huge, wavering shadow of the man and the child up the stone wall behind them;
the shadow is too large and seems to lean toward the baby, as if alive.
The man's expression: torn, grieving, holding the child very carefully, looking down the dark stairs.
Colour palette: deep indigo and near-black stone, warm gold light on the man's face and hands,
violet-black shadow. No other people. No text, no logo, no frame.
Aspect ratio 16:9.
```

## 補足

- タイトル画面の一枚絵と並べて違和感がないよう、同じ画風指定（16-bit SNES-era, detailed pixel art）にしている。
- グレイの年齢：本編は 62 歳なので、13 年前は 49 歳前後。本編の灰色の髪に対して、この絵ではまだ焦げ茶に少し白髪。
- 灯竿は背負っていて、火は灯っていない（大影の夜、すでに灯りは恐れられている）。
- もし「影が生き物のよう」に描かれすぎて怖くなる場合は、`the shadow is too large and seems to lean toward the baby, as if alive`
  を `a large soft shadow stretches up the wall behind them` に差し替える。
