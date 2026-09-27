# 第6章 決着の一枚絵 ― 画像生成プロンプト

場面：最終決戦の決着。暗くなった玉座の間で、大影（ルミナ自身の影）が最後にルミナを包み込もうとした瞬間、
女王ノクティアが 13 年ぶりに自分のランタンに灯をともす。ルミナの光、グレイの灯竿の火、女王のランタン ――
三つの光に照らされて、大影がほどけ、小さくやわらかな影に戻っていく。

ゲームでは決着の寸劇の中で、画面いっぱいに表示する（第 4 章の真相の一枚絵と同じ扱い）。
置き場所：`assets/story/finale.webp`（置けば表示され、無ければ飛ばす）。

## プロンプト（英語）

```
A single illustration in the style of a 16-bit SNES-era fantasy RPG cutscene, detailed pixel art, cinematic.
Night, a vast dark throne room of an old castle: tall pillars, a high vaulted ceiling, boarded-up windows,
a long navy carpet with gold embroidery leading to an empty throne. The room is almost black.
In the centre stands a 13-year-old girl with waist-length straight honey-blonde hair, a blue ribbon at the back
of her head, a white puff-sleeved dress with a blue sash and a large bow at the back; she glows softly with warm
golden-white light. Towering over her, filling the upper half of the picture, is an enormous shadow in the shape
of a child hugging its knees, with long flowing hair, made of violet-black mist; it is bending down to wrap
itself around the girl, and it is coming apart into soft light where the light touches it.
Three lights shine on the shadow from three directions:
from the left, an old lamplighter (grey hair, short grey beard, long brown trench coat) holds up a slender
wooden lamplighter's pole with a small bright flame at its tip;
from the right, a queen (long silver hair, a long veil, a jewelled diadem, a navy dress with gold embroidery)
holds up a small hand lantern that has just been lit, her face wet with tears;
and the girl's own glow from the centre.
The three beams meet on the shadow; at its heart a small, round, soft shadow creature with tiny ears and two
yellow dot eyes is appearing, reaching toward the girl.
Colour palette: deep indigo and near-black, violet shadow, three warm golden lights. Hopeful, tender mood.
No text, no logo, no frame.
Aspect ratio 16:9.
```

## 補足

- タイトル画面・第 4 章の一枚絵と同じ画風指定（16-bit SNES-era, detailed pixel art）。
- グレイは本編と同じ 62 歳の姿（灰色の髪とひげ）。第 4 章の一枚絵（13 年前）より年を取っている。
- 大影は「膝を抱えた子どもの影、長い髪」。第 5 章の谷の底で眠っていた姿と同じ。
- 影の中心に現れる小さな影は、エピローグの「影ぼうし」（丸い体に小さな耳、黄色い点の目）。
- 女王の外見はエピローグの一枚絵（`assets/story/epilogue.png`）に合わせている。
- 大影が怖くなりすぎる場合は、`it is bending down to wrap itself around the girl` を
  `it is bending down gently, as if to hold the girl` に差し替える。
