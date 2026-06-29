/* Escritorio de corrección — interacciones por palabra.
   Mejora progresiva: sin JS, las palabras dudosas siguen visibles (solo no editables). */
(function () {
  "use strict";

  const player = document.getElementById("player");
  let openPop = null;

  // ── Reproducir un tramo concreto (segmento o palabra) ────────────────────
  let stopAt = null;
  function playRange(startMs, endMs) {
    if (!player) return;
    player.currentTime = startMs / 1000;
    stopAt = endMs != null ? endMs / 1000 : null;
    player.play();
  }
  if (player) {
    player.addEventListener("timeupdate", function () {
      if (stopAt != null && player.currentTime >= stopAt) {
        player.pause();
        stopAt = null;
      }
    });
  }

  // ── Saltar al tiempo de un segmento ──────────────────────────────────────
  document.addEventListener("click", function (e) {
    const t = e.target.closest(".seg__time");
    if (t) playRange(parseInt(t.dataset.ms, 10), null);
  });

  // ── Abrir la decisión sobre una palabra dudosa ───────────────────────────
  function closePop() {
    if (openPop) { openPop.remove(); openPop = null; }
  }

  function openDecision(word) {
    closePop();
    const segEl = word.closest(".seg");
    const segId = segEl.dataset.segId;
    const idx = word.dataset.idx;
    const original = word.textContent;

    const pop = document.createElement("div");
    pop.className = "pop";
    pop.innerHTML =
      '<input class="w-edit" type="text" value="' + original.replace(/"/g, "&quot;") + '" ' +
        'aria-label="Corrige la palabra" size="' + Math.max(original.length, 4) + '">' +
      '<span class="pop__actions">' +
        '<button class="btn btn--ghost" data-act="hear" title="Oír esta palabra" type="button">🔊 Oír</button>' +
        '<button class="btn btn--primary" data-act="commit" type="button">Confirmar</button>' +
      '</span>' +
      '<span class="pop__hint">Enter para confirmar · Esc para cancelar</span>';

    document.body.appendChild(pop);
    const r = word.getBoundingClientRect();
    pop.style.top = (window.scrollY + r.bottom + 6) + "px";
    pop.style.left = (window.scrollX + r.left) + "px";
    openPop = pop;

    const input = pop.querySelector(".w-edit");
    input.focus();
    input.select();

    pop.querySelector('[data-act="hear"]').addEventListener("click", function () {
      playRange(parseInt(word.dataset.start, 10), parseInt(word.dataset.end, 10));
      input.focus();
    });
    pop.querySelector('[data-act="commit"]').addEventListener("click", () => commit());
    input.addEventListener("keydown", function (ev) {
      if (ev.key === "Enter") { ev.preventDefault(); commit(); }
      else if (ev.key === "Escape") { ev.preventDefault(); closePop(); word.focus(); }
    });

    function commit() {
      const text = input.value.trim() || original;
      seal(word, segId, idx, text);
      closePop();
    }
  }

  document.addEventListener("click", function (e) {
    const w = e.target.closest(".w--doubt");
    if (w) { e.preventDefault(); openDecision(w); }
    else if (openPop && !e.target.closest(".pop")) closePop();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && e.target.classList.contains("w--doubt")) {
      e.preventDefault(); openDecision(e.target);
    }
  });

  // ── Sellar una palabra: persistir + actualizar la vista ──────────────────
  function seal(word, segId, idx, text) {
    const body = new URLSearchParams({ idx: idx, text: text });
    fetch("/segments/" + segId + "/word", { method: "POST", body: body })
      .then((r) => r.json())
      .then((data) => {
        if (!data.ok) return;
        word.textContent = text;
        word.className = "w w--sealed";
        word.removeAttribute("tabindex");
        word.removeAttribute("role");
        const segEl = word.closest(".seg");
        const left = Math.max(0, parseInt(segEl.dataset.doubts, 10) - 1);
        segEl.dataset.doubts = left;
        if (left === 0) segEl.classList.add("is-resolved");
        updateTally(data.session_doubts_left);
      })
      .catch(() => {});
  }

  // ── Tablero de progreso ──────────────────────────────────────────────────
  function updateTally(left) {
    const count = document.querySelector("[data-doubts-left]");
    if (count) {
      count.textContent = left;
      count.classList.toggle("is-clear", left === 0);
    }
    const meter = document.querySelector(".meter");
    const total = meter ? parseInt(meter.getAttribute("aria-valuemax"), 10) : 0;
    const done = total - left;
    if (meter) {
      meter.setAttribute("aria-valuenow", done);
      const fill = meter.querySelector("[data-meter-fill]");
      if (fill) fill.style.width = (total ? (done / total * 100) : 0) + "%";
      const doneEl = meter.querySelector("[data-meter-done]");
      if (doneEl) doneEl.textContent = done;
    }
    const label = document.querySelector(".tally__label");
    if (label && left === 0 && total > 0) label.textContent = "todas las dudas resueltas";

    const nextBtn = document.getElementById("next-doubt");
    if (nextBtn && left === 0) {
      nextBtn.textContent = "✓ Sin dudas pendientes";
      nextBtn.setAttribute("disabled", "");
    }
    if (left === 0 && total > 0) {
      const cta = document.getElementById("finish-cta");
      if (cta) cta.hidden = false;
    }
  }

  // ── Navegar a la siguiente duda ──────────────────────────────────────────
  const nextBtn = document.getElementById("next-doubt");
  if (nextBtn) {
    nextBtn.addEventListener("click", function () {
      const doubts = Array.from(document.querySelectorAll(".w--doubt"));
      if (!doubts.length) return;
      const y = window.scrollY + 120;
      const next = doubts.find((d) => (window.scrollY + d.getBoundingClientRect().top) > y) || doubts[0];
      next.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => openDecision(next), 280);
    });
  }
})();
