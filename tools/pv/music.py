"""PV music (46 s, 120 BPM, one bar = 2 s): the game's minor arpeggio (Sfx.startBgm),
growing into a chiptune piece, a hush, then a warm ending. -> pv/music.wav
Sections (bars): 0-1 hook drone | 2-7 theme, bass | 8-15 full, drums | 14-15 bosses
| 16-17 hush | 18-22 title, major."""
import os, wave
import numpy as np

SR = 44100
BPM = 120
BEAT = 60 / BPM
BAR = BEAT * 4
LEN = 46.0
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
out = np.zeros(int(SR * (LEN + 2)))
rng = np.random.default_rng(7)


def f(m): return 440.0 * 2 ** ((m - 69) / 12)


def env(n, a=0.005, d=None, sustain=True):
    t = np.arange(n) / SR
    e = np.minimum(1, t / a)
    if d is not None:
        e = e * np.exp(-t / d)
    return e


def osc(kind, freq, n, freq2=None):
    t = np.arange(n) / SR
    fr = freq if freq2 is None else freq * (freq2 / freq) ** (t / (n / SR))
    ph = np.cumsum(fr) / SR
    if kind == 'tri':
        return 2 * np.abs(2 * (ph % 1) - 1) - 1
    if kind == 'sq':
        return np.where((ph % 1) < 0.5, 1.0, -1.0) * 0.6
    if kind == 'pulse':
        return np.where((ph % 1) < 0.25, 1.0, -1.0) * 0.5
    if kind == 'saw':
        return (2 * (ph % 1) - 1) * 0.7
    return np.sin(2 * np.pi * ph)


def add(t0, sig, vol=1.0, pan=0):
    i = int(t0 * SR)
    if i >= len(out): return
    sig = sig[: len(out) - i]
    out[i:i + len(sig)] += sig * vol


def note(t0, m, dur, kind='tri', vol=0.2, decay=None, a=0.005, rel=0.05):
    n = int((dur + rel) * SR)
    e = env(n, a, decay)
    k = int(dur * SR)
    if k < n: e[k:] *= np.linspace(1, 0, n - k)
    add(t0, osc(kind, f(m), n) * e, vol)


def noise(t0, dur, vol, lp=None, hp=None, decay=0.05):
    n = int(dur * SR)
    s = rng.uniform(-1, 1, n)
    if hp:   # crude high-pass: difference
        s = np.diff(np.concatenate([[0], s])) * hp
    if lp:   # crude low-pass: moving average
        k = max(1, int(lp)); s = np.convolve(s, np.ones(k) / k, 'same')
    add(t0, s * env(n, 0.001, decay), vol)


def kick(t0, vol=0.55):
    n = int(0.25 * SR); add(t0, osc('sine', 150, n, 40) * env(n, 0.001, 0.07), vol)


def snare(t0, vol=0.22):
    noise(t0, 0.18, vol, lp=3, decay=0.06); note(t0, 50, 0.06, 'tri', vol * 0.6, decay=0.04)


def hat(t0, vol=0.07): noise(t0, 0.05, vol, hp=1.0, decay=0.015)


def bar(b): return b * BAR


# ---- the theme (as in the game): Am then F -> E, 16 notes -------------------------------
THEME = [57, 60, 64, 67, 64, 60, 57, 55, 53, 57, 60, 65, 60, 57, 55, 52]
BASS = [45, 45, 41, 40]

# hook: a low drone, heartbeats, the shadow rising
n = int(bar(2) * SR)
add(0, (osc('saw', f(33), n) * 0.5 + osc('tri', f(45), n)) * np.minimum(1, np.arange(n) / SR / 1.2) * np.linspace(1, 0.6, n), 0.16)
for t in [0.4, 1.4, 2.4, 3.2]:
    note(t, 28, 0.12, 'sine', 0.95, decay=0.08); note(t + 0.18, 26, 0.14, 'sine', 0.8, decay=0.09)
noise(0.0, 4.0, 0.05, lp=40, decay=3.0)

# story: the theme in eighths, bass from bar 4, a kick building in bars 6-7, a fill
for b in range(2, 8):
    for i in range(8):
        m = THEME[((b - 2) % 2) * 8 + i]
        note(bar(b) + i * BEAT / 2, m + 12, 0.45, 'tri', 0.10 if b < 4 else 0.12, decay=0.35)
    if b >= 4:
        for q in range(2):
            note(bar(b) + q * BAR / 2, BASS[((b - 2) % 2) * 2 + q], BAR / 2 - 0.05, 'tri', 0.09, decay=1.2)
    if b >= 6:
        for q in range(4): kick(bar(b) + q * BEAT, 0.35 + 0.1 * (b - 6))
for k in range(8): snare(bar(7) + 1.0 + k * BEAT / 4, 0.08 + 0.02 * k)
noise(bar(7) + 1.0, 1.0, 0.0, lp=2)

# full: bars 8-15 (the montage), melody over the theme, drums
MEL = [(76, 1), (74, .5), (72, .5), (71, 1), (72, 1), (69, 1.5), (72, .5), (71, 2)]      # 2 bars, in beats
MEL2 = [(79, 1), (77, .5), (76, .5), (74, 1), (76, 1), (72, 1.5), (74, .5), (76, 2)]
for b in range(8, 16):
    half = (b - 8) % 2
    for i in range(8):
        note(bar(b) + i * BEAT / 2, THEME[half * 8 + i] + 12, 0.3, 'tri', 0.09, decay=0.25)
    for i in range(8):                      # driving bass in eighths
        bm = BASS[half * 2 + i // 4]
        note(bar(b) + i * BEAT / 2, bm - (0 if i % 2 else 12) + 12, 0.2, 'tri', 0.16, decay=0.3)
    for q in range(4):
        kick(bar(b) + q * BEAT, 0.5 if q in (0, 2) else 0.3)
        if q in (1, 3): snare(bar(b) + q * BEAT)
        hat(bar(b) + q * BEAT + BEAT / 2)
    if half == 0 and b < 14:
        t = bar(b)
        for m, d in (MEL if b < 12 else MEL2):
            note(t, m, d * BEAT * 0.9, 'pulse', 0.09, a=0.01); t += d * BEAT
    if b in (8, 12, 14):
        noise(bar(b), 1.2, 0.12, hp=0.6, decay=0.5)       # crash
# bosses (14-15): low stabs on every half bar
for k in range(4):
    t = bar(14) + k * BAR / 2
    for m in (45, 52, 57): note(t, m - 12, 0.4, 'saw', 0.07, decay=0.25)
    noise(t, 0.3, 0.12, lp=6, decay=0.12)
for k in range(6): snare(bar(15) + 1.25 + k * BEAT / 8, 0.1 + 0.03 * k)

# hush: bars 16-17, a bell-like theme alone
for i, m in enumerate([69, 72, 76, 74, 72, 71]):
    note(bar(16) + 0.3 + i * 0.55, m + 12, 1.0, 'tri', 0.08, decay=0.7)
n = int(bar(2) * SR)
pad = sum(osc('tri', f(m), n) for m in (57, 60, 64)) / 3
add(bar(16), pad * np.minimum(1, np.arange(n) / SR / 0.8) * 0.9, 0.07)

# title: C - G - Am - F, the lantern jingle on the reveal, a gentle arpeggio to the end
for i, fr in enumerate([784, 988, 1175, 1568]):
    add(bar(18) + i * 0.08, osc('tri', fr, int(0.5 * SR)) * env(int(0.5 * SR), 0.003, 0.25), 0.10)
CH = [(48, [60, 64, 67]), (43, [59, 62, 67]), (45, [57, 60, 64]), (41, [57, 60, 65]), (48, [60, 64, 67])]
for k, (bs, tri) in enumerate(CH):
    t = bar(18) + k * BAR
    note(t, bs, BAR - 0.1, 'tri', 0.08, decay=1.5)
    for i in range(8):
        note(t + i * BEAT / 2, tri[i % 3] + 12 + (12 if i in (3, 7) else 0), 0.5, 'tri', 0.08, decay=0.4)
    nn = int(BAR * SR)
    add(t, sum(osc('tri', f(m), nn) for m in tri) / 3 * np.minimum(1, np.arange(nn) / SR / 0.3), 0.03)
    if k < 3: kick(t, 0.25)

# a small echo, fade in/out, soft limit
d = int(0.28 * SR)
wet = np.zeros_like(out); wet[d:] = out[:-d] * 0.28; wet[2 * d:] += out[:-2 * d] * 0.12
mix = out + wet
t = np.arange(len(mix)) / SR
mix *= np.clip((LEN - t) / 2.5, 0, 1)
mix = np.tanh(mix * 1.4) * 0.8
mix = mix[: int(LEN * SR)]
os.makedirs(os.path.join(ROOT, 'pv'), exist_ok=True)
with wave.open(os.path.join(ROOT, 'pv', 'music.wav'), 'wb') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((mix * 32767).astype(np.int16).tobytes())
print('pv/music.wav', LEN, 's, peak', float(np.abs(mix).max()))
