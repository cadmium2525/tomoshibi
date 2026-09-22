'use strict';
// ---------------------------------------------------------------------------
// On-screen controls for phones / tablets: a stick (4-way, push far = dash)
// and jump / attack / call buttons. They feed Input.virt.
// ---------------------------------------------------------------------------
const Touch = {
  enabled: false,
  onChange: null,

  init(onChange) {
    this.onChange = onChange;
    const coarse = matchMedia('(pointer: coarse)').matches;
    if (coarse) this.enable();
    addEventListener('touchstart', () => this.enable(), { passive: true });
    addEventListener('keydown', () => { if (!matchMedia('(pointer: coarse)').matches) this.disable(); });
    // no long-press menus / pinch zoom while playing
    document.addEventListener('contextmenu', (e) => e.preventDefault());
    document.addEventListener('gesturestart', (e) => e.preventDefault());
    this.setupPad();
    for (const b of document.querySelectorAll('#touch .tb')) this.setupButton(b, b.dataset.a);
    this.setupButton(document.getElementById('bPause'), 'start');
    const full = document.getElementById('bFull');
    if (!document.documentElement.requestFullscreen || matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches) {
      full.style.display = 'none';
    }
    full.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      Sfx.unlock();
      if (document.fullscreenElement) document.exitFullscreen();
      else document.documentElement.requestFullscreen().then(() => screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape').catch(() => {})).catch(() => {});
    });
  },

  enable() {
    if (this.enabled) return;
    this.enabled = true;
    document.body.classList.add('touch');
    if (this.onChange) this.onChange();
  },
  disable() {
    if (!this.enabled) return;
    this.enabled = false;
    document.body.classList.remove('touch');
    Input.virt = {};
    if (this.onChange) this.onChange();
  },

  setupButton(el, action) {
    let id = null;
    const up = (e) => {
      if (e.pointerId !== id) return;
      id = null; el.classList.remove('on'); Input.release(action);
    };
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      Sfx.unlock();
      id = e.pointerId;
      el.setPointerCapture(id);
      el.classList.add('on');
      Input.press(action);
    });
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('lostpointercapture', up);
  },

  setupPad() {
    const pad = document.getElementById('pad'), knob = document.getElementById('knob');
    let id = null;
    const dirs = ['left', 'right', 'up', 'down', 'dash'];
    const set = (state) => {
      for (const d of dirs) {
        if (state[d]) Input.press(d); else Input.release(d);
      }
      pad.classList.toggle('dash', !!state.dash);
    };
    const move = (e) => {
      const r = pad.getBoundingClientRect();
      let dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
      let dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
      const len = Math.hypot(dx, dy);
      if (len > 1) { dx /= len; dy /= len; }
      knob.style.transform = `translate(${dx * r.width * 0.3}px, ${dy * r.height * 0.3}px)`;
      const horiz = Math.abs(dx) >= Math.abs(dy);
      set({
        left: horiz && dx < -0.28, right: horiz && dx > 0.28,
        up: !horiz && dy < -0.35, down: !horiz && dy > 0.35,
        dash: horiz && Math.abs(dx) > 0.8,
      });
    };
    const end = (e) => {
      if (e.pointerId !== id) return;
      id = null; knob.style.transform = ''; set({});
    };
    pad.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      Sfx.unlock();
      id = e.pointerId;
      pad.setPointerCapture(id);
      move(e);
    });
    pad.addEventListener('pointermove', (e) => { if (e.pointerId === id) move(e); });
    pad.addEventListener('pointerup', end);
    pad.addEventListener('pointercancel', end);
    pad.addEventListener('lostpointercapture', end);
  },
};
