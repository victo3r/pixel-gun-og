// your account: level, XP and coins. Saved in the browser, kept between matches (separate from the zombie-run shop coins).
// XP needed to go from level L to L+1: XP_BASE + XP_STEP * (L - 1). So 50 for level 2, 75 for level 3, 100 for level 4...
const XP_BASE = 50, XP_STEP = 25;
const xpNeed = lv => XP_BASE + XP_STEP * (lv - 1);
let prof = { lv: 1, xp: 0, coins: 0 }; // xp = progress toward the next level
try { const s = JSON.parse(localStorage.getItem('pgog-profile')); if (s) prof = { ...prof, ...s }; } catch {}
const saveProf = () => { try { localStorage.setItem('pgog-profile', JSON.stringify(prof)); } catch {} };

// adds XP and coins, levels up as many times as it fills. Returns how many levels you gained.
function grant(xp, coins) {
  let ups = 0;
  prof.xp += xp; prof.coins += coins;
  while (prof.xp >= xpNeed(prof.lv)) { prof.xp -= xpNeed(prof.lv); prof.lv++; ups++; }
  saveProf(); showProf();
  return ups;
}
const xpBar = () => `<div class="xpbar"><div style="width:${Math.min(100, prof.xp / xpNeed(prof.lv) * 100)}%"></div></div>`;
function showProf() { // level, XP bar and coins in the lobby
  $('prof').innerHTML = `<div class="pl"><b>LVL ${prof.lv}</b><span>${prof.xp} / ${xpNeed(prof.lv)} XP</span><span class="pc">◆ ${prof.coins}</span></div>${xpBar()}`;
}
showProf();
