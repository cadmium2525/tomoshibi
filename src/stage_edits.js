'use strict';
// Stages changed in the stage editor (editor.html). Written by the editor's 「保存」 - edit there, not here.
// Each entry replaces that chapter's build(). Remove an entry (or use 「オリジナルに戻す」 → 保存) to go back.
for (const [n, d] of Object.entries({
})) { STAGE_EDITS[n] = d; applyStageTexts(+n, d); }
