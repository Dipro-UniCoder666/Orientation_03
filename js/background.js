/**
 * background.js
 * -------------
 * Builds the ambient 0/1 grid seen behind the app: a fixed grid of
 * characters that twinkle in brightness in place (not falling),
 * matching the reference clip. Rebuilds on resize so it always
 * fills the viewport.
 */

(function () {
  "use strict";

  const container = document.getElementById("bit-grid");
  if (!container) return;

  const CELL_W = 24; // px
  const CELL_H = 26; // px

  function pickTier() {
    const r = Math.random();
    if (r < 0.05) return "bit-bright"; // rare, stands out
    if (r < 0.25) return "bit-mid"; // occasional
    return "bit-dim"; // majority, barely-there
  }

  function buildGrid() {
    const cols = Math.ceil(window.innerWidth / CELL_W) + 1;
    const rows = Math.ceil(window.innerHeight / CELL_H) + 1;

    container.style.gridTemplateColumns = "repeat(" + cols + ", " + CELL_W + "px)";
    container.style.gridAutoRows = CELL_H + "px";

    const total = cols * rows;
    const frag = document.createDocumentFragment();

    for (let i = 0; i < total; i++) {
      const cell = document.createElement("span");
      cell.className = "bit-cell " + pickTier();
      cell.textContent = Math.random() < 0.5 ? "0" : "1";
      cell.style.animationDelay = (Math.random() * 6).toFixed(2) + "s";
      cell.style.animationDuration = (3 + Math.random() * 3).toFixed(2) + "s";
      frag.appendChild(cell);
    }

    container.innerHTML = "";
    container.appendChild(frag);
  }

  let resizeTimer;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(buildGrid, 200);
  });

  buildGrid();
})();
