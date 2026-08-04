/**
 * Drag-and-Drop Engine — reusable component. Two modes:
 *   "sort"     — items get placed into labeled bins (e.g. Hardware vs Software)
 *   "sequence" — items get arranged into a single ordered list (e.g. algorithm steps)
 *
 * Supports both real drag (HTML5 DnD) and click-to-place/reorder as a fallback
 * (touch devices, keyboard-only use, and simpler automated testing).
 *
 * renderDragDrop(container, content, onSubmit) — content: { mode, zones: [{label}], items: [{id,label}] }
 * onSubmit(placements) is called with [{ itemId, zoneIndex }, ...] when submitted.
 *
 * renderDragDropResults(container, content, gradeResponse, onSubmit) shows per-item
 * feedback after the server grades it, with a Retry button on failure.
 */

let selectedItemId = null;

function renderDragDrop(container, content, onSubmit) {
  container.innerHTML = "";
  selectedItemId = null;

  if (content.mode === "sequence") {
    renderSequenceMode(container, content, onSubmit);
  } else {
    renderSortMode(container, content, onSubmit);
  }
}

function makeItemChip(item, extraStyle) {
  const chip = document.createElement("div");
  chip.textContent = item.label;
  chip.draggable = true;
  chip.dataset.itemId = item.id;
  chip.style.cssText = `
    padding: 8px 14px; border-radius: 10px; background: var(--color-primary);
    color: #fff; cursor: grab; user-select: none; font-weight: 600;
    ${extraStyle || ""}
  `;
  chip.addEventListener("dragstart", (e) => {
    e.dataTransfer.setData("text/plain", item.id);
  });
  return chip;
}

function renderSortMode(container, content, onSubmit) {
  const placements = {}; // itemId -> zoneIndex

  const instructions = document.createElement("p");
  instructions.style.color = "var(--color-muted)";
  instructions.textContent = "Drag each item into the correct bin (or click an item, then click a bin).";
  container.appendChild(instructions);

  const bank = document.createElement("div");
  bank.style.cssText = "display:flex; flex-wrap:wrap; gap:10px; min-height:50px; padding:12px; border:2px dashed var(--color-border); border-radius:12px; margin-bottom:20px;";
  bank.dataset.zoneIndex = "-1";
  container.appendChild(bank);

  const zonesRow = document.createElement("div");
  zonesRow.style.cssText = "display:flex; gap:16px; flex-wrap:wrap;";
  container.appendChild(zonesRow);

  const zoneEls = content.zones.map((zone, zIndex) => {
    const zoneEl = document.createElement("div");
    zoneEl.dataset.zoneIndex = String(zIndex);
    zoneEl.style.cssText = "flex:1; min-width:160px; min-height:120px; padding:12px; border:2px solid var(--color-border); border-radius:12px; background: var(--color-surface);";
    const label = document.createElement("h4");
    label.textContent = zone.label;
    label.style.margin = "0 0 8px 0";
    zoneEl.appendChild(label);
    zonesRow.appendChild(zoneEl);
    return zoneEl;
  });

  const allDropTargets = [bank, ...zoneEls];

  function moveItem(itemId, zoneIndex) {
    const chip = container.querySelector(`[data-item-id="${itemId}"]`);
    if (!chip) return;
    if (zoneIndex === -1) {
      delete placements[itemId];
      bank.appendChild(chip);
    } else {
      placements[itemId] = zoneIndex;
      zoneEls[zoneIndex].appendChild(chip);
    }
    if (selectedItemId === itemId) {
      chip.style.outline = "";
      selectedItemId = null;
    }
  }

  allDropTargets.forEach((target) => {
    target.addEventListener("dragover", (e) => e.preventDefault());
    target.addEventListener("drop", (e) => {
      e.preventDefault();
      const itemId = e.dataTransfer.getData("text/plain");
      moveItem(itemId, parseInt(target.dataset.zoneIndex, 10));
    });
    target.addEventListener("click", () => {
      if (selectedItemId) moveItem(selectedItemId, parseInt(target.dataset.zoneIndex, 10));
    });
  });

  content.items.forEach((item) => {
    const chip = makeItemChip(item);
    chip.addEventListener("click", (e) => {
      e.stopPropagation();
      container.querySelectorAll("[data-item-id]").forEach((c) => (c.style.outline = ""));
      selectedItemId = item.id;
      chip.style.outline = "3px solid var(--color-accent)";
    });
    bank.appendChild(chip);
  });

  const submitBtn = document.createElement("button");
  submitBtn.className = "btn";
  submitBtn.style.marginTop = "20px";
  submitBtn.textContent = "Submit";
  submitBtn.addEventListener("click", () => {
    const result = content.items.map((item) => ({
      itemId: item.id,
      zoneIndex: placements[item.id] !== undefined ? placements[item.id] : -1,
    }));
    onSubmit(result);
  });
  container.appendChild(submitBtn);
}

function renderSequenceMode(container, content, onSubmit) {
  const instructions = document.createElement("p");
  instructions.style.color = "var(--color-muted)";
  instructions.textContent = "Put the steps in the correct order — drag to reorder, or use the arrows.";
  container.appendChild(instructions);

  const list = document.createElement("div");
  list.style.cssText = "display:flex; flex-direction:column; gap:8px; max-width:420px;";
  container.appendChild(list);

  let order = content.items.map((item) => item.id);
  const itemById = Object.fromEntries(content.items.map((item) => [item.id, item]));

  function renderList() {
    list.innerHTML = "";
    order.forEach((itemId, index) => {
      const row = document.createElement("div");
      row.draggable = true;
      row.dataset.itemId = itemId;
      row.style.cssText = "display:flex; align-items:center; gap:10px; padding:10px 14px; border-radius:10px; background: var(--color-primary); color:#fff; cursor:grab;";

      const posLabel = document.createElement("span");
      posLabel.style.fontWeight = "700";
      posLabel.textContent = `${index + 1}.`;
      row.appendChild(posLabel);

      const label = document.createElement("span");
      label.style.flex = "1";
      label.textContent = itemById[itemId].label;
      row.appendChild(label);

      const upBtn = document.createElement("button");
      upBtn.type = "button";
      upBtn.className = "btn secondary";
      upBtn.textContent = "↑";
      upBtn.disabled = index === 0;
      upBtn.addEventListener("click", () => {
        [order[index - 1], order[index]] = [order[index], order[index - 1]];
        renderList();
      });

      const downBtn = document.createElement("button");
      downBtn.type = "button";
      downBtn.className = "btn secondary";
      downBtn.textContent = "↓";
      downBtn.disabled = index === order.length - 1;
      downBtn.addEventListener("click", () => {
        [order[index + 1], order[index]] = [order[index], order[index + 1]];
        renderList();
      });

      row.appendChild(upBtn);
      row.appendChild(downBtn);

      row.addEventListener("dragstart", (e) => {
        e.dataTransfer.setData("text/plain", itemId);
      });
      row.addEventListener("dragover", (e) => e.preventDefault());
      row.addEventListener("drop", (e) => {
        e.preventDefault();
        const draggedId = e.dataTransfer.getData("text/plain");
        const fromIndex = order.indexOf(draggedId);
        const toIndex = order.indexOf(itemId);
        order.splice(fromIndex, 1);
        order.splice(toIndex, 0, draggedId);
        renderList();
      });

      list.appendChild(row);
    });
  }

  renderList();

  const submitBtn = document.createElement("button");
  submitBtn.className = "btn";
  submitBtn.style.marginTop = "20px";
  submitBtn.textContent = "Submit";
  submitBtn.addEventListener("click", () => {
    const result = order.map((itemId, index) => ({ itemId, zoneIndex: index }));
    onSubmit(result);
  });
  container.appendChild(submitBtn);
}

function renderDragDropResults(container, content, gradeResponse, onSubmit) {
  container.innerHTML = "";

  const summary = document.createElement("p");
  summary.style.fontWeight = "700";
  summary.textContent = gradeResponse.passed
    ? `Passed! Score: ${gradeResponse.score}% (${gradeResponse.correctCount}/${gradeResponse.total})`
    : `Not quite — Score: ${gradeResponse.score}% (${gradeResponse.correctCount}/${gradeResponse.total}). Try again.`;
  summary.style.color = gradeResponse.passed ? "var(--color-success)" : "#d64545";
  container.appendChild(summary);

  const itemById = Object.fromEntries(content.items.map((item) => [item.id, item]));
  gradeResponse.results.forEach((result) => {
    const item = itemById[result.id];
    const line = document.createElement("p");
    const correctLabel = content.mode === "sort"
      ? content.zones[result.correctZoneIndex].label
      : `position ${result.correctZoneIndex + 1}`;
    line.textContent = result.correct
      ? `${item.label} — Correct`
      : `${item.label} — Incorrect (should be: ${correctLabel})`;
    line.style.color = result.correct ? "var(--color-success)" : "#d64545";
    container.appendChild(line);
  });

  if (!gradeResponse.passed) {
    const retryBtn = document.createElement("button");
    retryBtn.className = "btn";
    retryBtn.style.marginTop = "12px";
    retryBtn.textContent = "Retry";
    retryBtn.addEventListener("click", () => renderDragDrop(container, content, onSubmit));
    container.appendChild(retryBtn);
  }
}
