"""Shadow creature sprites (the enemies that kidnap the heroine)."""
import math
from pixlib import SS, snap, outline, polar

W, H = 52, 58
AX, AY = 24, 56

K0 = (10, 6, 16, 255)
K1 = (28, 16, 42, 255)
K2 = (58, 34, 88, 255)
K3 = (104, 66, 146, 255)
EYE1 = (255, 244, 180, 255)
EYE2 = (255, 176, 80, 255)
PALETTE = [c[:3] for c in (K0, K1, K2, K3, EYE1, EYE2)]
D = math.radians


def draw(bob=0.0, lean=0.0, leg=0.0, arm_f=D(20), elb_f=D(10), arm_b=D(10), elb_b=D(10),
         wisp=0.0, eyes=True, carry=False, hurt=False):
    c = SS(W, H)
    ox = AX + (-3 if hurt else 0)
    hip = (ox, 43 + bob)
    sh = (ox + 4 + lean * 6, 22 + bob + abs(lean) * 2)
    head = (sh[0] + 6 + lean * 3, sh[1] - 1)
    back = (ox - 6, sh[1] - 1)

    def body(col, dx=0.0, dy=0.0):
        pts = [(hip[0] - 5, hip[1] + 1), (back[0] - 1, back[1] + 8), (back[0], back[1]),
               (back[0] + 5, back[1] - 5), (sh[0] + 3, sh[1] - 4), (head[0] + 3, head[1] + 2),
               (sh[0] + 5, sh[1] + 6), (hip[0] + 6, hip[1] - 4), (hip[0] + 5, hip[1] + 1)]
        c.poly([(x + dx, y + dy) for x, y in pts], col)
        c.ellipse(head[0] + dx, head[1] + dy, 4.6, 4.2, col)
        # wisps (flame-like spikes)
        for i, (bx, by, ang, ln) in enumerate([
                (head[0] - 2, head[1] - 3, -55, 9), (head[0] + 1, head[1] - 4, -30, 7),
                (back[0] + 2, back[1] - 3, -70, 6), (back[0] - 1, back[1] + 4, -95, 7),
                (hip[0] - 4, hip[1] - 2, -120, 6)]):
            a = D(ang) + math.sin(wisp + i * 1.7) * D(10 if i < 2 else 22) + D(180)
            tip = polar((bx, by), a, ln + math.sin(wisp * 1.3 + i) * 1.5)
            n = (math.cos(a) * 1.8, -math.sin(a) * 1.8)
            c.poly([(bx - n[0] + dx, by - n[1] + dy), (tip[0] + dx, tip[1] + dy), (bx + n[0] + dx, by + n[1] + dy)], col)

    def limb(p0, a1, l1, a2, l2, w, col, dx=0.0, dy=0.0, claw=False):
        p1 = polar(p0, a1, l1)
        p2 = polar(p1, a1 + a2, l2)
        c.line([(p0[0] + dx, p0[1] + dy), (p1[0] + dx, p1[1] + dy), (p2[0] + dx, p2[1] + dy)], w, col)
        if claw:
            for k in (-1, 0, 1):
                t = polar(p2, a1 + a2 + D(28 * k), 3.2)
                c.line([(p2[0] + dx, p2[1] + dy), (t[0] + dx, t[1] + dy)], 1.0, col)
        return p2

    # back limbs
    limb((hip[0] - 2, hip[1]), -leg, 6, D(10), 6.5, 3.4, K1)
    limb((sh[0] - 3, sh[1] + 1), arm_b, 11, elb_b, 12, 2.8, K1, claw=True)
    # rim light then body
    body(K3, -1, -1)
    body(K2, -0.5, -0.5)
    body(K0)
    # a darker core so the silhouette reads as volume
    c.ellipse(hip[0] + 1, hip[1] - 10 + bob * 0.3, 5, 8, K1)
    # front limbs
    limb((hip[0] + 2, hip[1]), leg, 6, D(10), 6.5, 3.6, K2, -0.5, -0.5)
    limb((hip[0] + 2, hip[1]), leg, 6, D(10), 6.5, 3.4, K0)
    limb((sh[0] + 1, sh[1] + 1), arm_f, 11, elb_f, 12, 3.0, K2, -0.5, -0.5, claw=True)
    limb((sh[0] + 1, sh[1] + 1), arm_f, 11, elb_f, 12, 2.8, K0, claw=True)

    arr = snap(c.down(), PALETTE)
    arr = outline(arr, (6, 3, 10), grow=False)
    if eyes:
        ex, ey = int(head[0] + 1.5), int(head[1] - 0.5)
        col = EYE2 if hurt else EYE1
        for x, y in ((ex, ey), (ex + 3, ey), (ex, ey + 1), (ex + 3, ey + 1)):
            if 0 <= x < W and 0 <= y < H:
                arr[y, x] = col
    carry_pt = (int(round(sh[0] - 2)), int(round(sh[1] - 4)))
    return arr, carry_pt


def frames():
    F, carry = {}, {}
    for i in range(4):
        t = i / 4 * 2 * math.pi
        F[f"walk{i}"], _ = draw(bob=abs(math.sin(t)) * 1.2, leg=D(22) * math.sin(t),
                                arm_f=D(28) + D(14) * math.sin(t), arm_b=D(12) - D(14) * math.sin(t), elb_f=D(-12), elb_b=D(-8),
                                wisp=t)
    for i in range(2):
        F[f"reach{i}"], _ = draw(lean=0.8 + 0.2 * i, arm_f=D(80 + 10 * i), elb_f=D(0), arm_b=D(70), elb_b=D(10),
                                 leg=D(12), wisp=i * 2)
    for i in range(4):
        t = i / 4 * 2 * math.pi
        F[f"carry{i}"], carry[f"carry{i}"] = draw(
            bob=abs(math.sin(t)) * 1.0, leg=D(20) * math.sin(t), lean=-0.3,
            arm_f=D(165), elb_f=D(-60), arm_b=D(150), elb_b=D(-50), wisp=t)
    F["hurt"], _ = draw(lean=-0.6, arm_f=D(-30), elb_f=D(-20), arm_b=D(-50), elb_b=D(-10), hurt=True, wisp=1)
    return F, carry


if __name__ == "__main__":
    import os
    from PIL import Image
    F, carry = frames()
    names = list(F)
    sheet = Image.new("RGBA", (len(names) * W, H), (90, 96, 120, 255))
    for i, n in enumerate(names):
        sheet.alpha_composite(Image.fromarray(F[n], "RGBA"), (i * W, 0))
    sheet.resize((sheet.width * 4, sheet.height * 4), Image.NEAREST).save(
        os.path.join(os.path.dirname(__file__), "_shadow.png"))
    print(names, carry)
