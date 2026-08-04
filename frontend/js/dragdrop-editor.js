/**
 * Drag-and-Drop Editor — admin-only reusable component.
 * renderDragdropEditor(container, dragdrop, onSave) draws an editable form for
 * a dragdrop module's mode/zones/items/passing-score and calls onSave(payload)
 * with { mode, zones, items, passingScore } when the teacher saves.
 */

function renderDragdropEditor(container, dragdrop, onSave) {
  container.innerHTML = "";
  container.style.display = "block";

  const state = {
    mode: dragdrop.mode || "sort",
    passingScore: dragdrop.passingScore || 80,
    zones: dragdrop.zones && dragdrop.zones.length
      ? dragdrop.zones.map((z) => ({ label: z.label }))
      : [{ label: "" }, { label: "" }],
    items: dragdrop.items && dragdrop.items.length
      ? dragdrop.items.map((i) => ({ label: i.label, correctZoneIndex: i.correctZoneIndex }))
      : [{ label: "", correctZoneIndex: 0 }],
  };

  const heading = document.createElement("h3");
  heading.textContent = `Editing: ${dragdrop.lessonTitle}`;
  container.appendChild(heading);

  const modeLabel = document.createElement("label");
  modeLabel.style.display = "block";
  modeLabel.style.marginBottom = "12px";
  modeLabel.textContent = "Mode: ";
  const modeSelect = document.createElement("select");
  modeSelect.innerHTML = `<option value="sort">Sort into bins</option><option value="sequence">Order into sequence</option>`;
  modeSelect.value = state.mode;
  modeSelect.addEventListener("change", () => {
    state.mode = modeSelect.value;
    renderZones();
  });
  modeLabel.appendChild(modeSelect);
  container.appendChild(modeLabel);

  const passRow = document.createElement("label");
  passRow.style.display = "block";
  passRow.style.marginBottom = "16px";
  passRow.textContent = "Passing score (%): ";
  const passInput = document.createElement("input");
  passInput.type = "number";
  passInput.min = "0";
  passInput.max = "100";
  passInput.value = state.passingScore;
  passInput.style.width = "70px";
  passInput.style.marginLeft = "8px";
  passInput.addEventListener("input", () => { state.passingScore = parseInt(passInput.value, 10) || 0; });
  passRow.appendChild(passInput);
  container.appendChild(passRow);

  const zonesHost = document.createElement("div");
  container.appendChild(zonesHost);

  function zoneNounFor(index) {
    return state.mode === "sequence" ? `Step ${index + 1}` : `Bin ${index + 1}`;
  }

  function renderZones() {
    zonesHost.innerHTML = "";

    const zonesTitle = document.createElement("h4");
    zonesTitle.textContent = state.mode === "sequence" ? "Steps (in correct order)" : "Bins";
    zonesHost.appendChild(zonesTitle);

    state.zones.forEach((zone, zIndex) => {
      const row = document.createElement("div");
      row.style.cssText = "display:flex; gap:8px; align-items:center; margin-bottom:6px;";

      const label = document.createElement("input");
      label.className = "input";
      label.style.marginBottom = "0";
      label.type = "text";
      label.value = zone.label;
      label.placeholder = zoneNounFor(zIndex);
      label.addEventListener("input", () => { zone.label = label.value; });

      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "btn secondary";
      removeBtn.textContent = "×";
      removeBtn.disabled = state.zones.length <= 2;
      removeBtn.addEventListener("click", () => {
        state.zones.splice(zIndex, 1);
        state.items.forEach((item) => {
          if (item.correctZoneIndex >= state.zones.length) item.correctZoneIndex = 0;
        });
        renderZones();
        renderItems();
      });

      row.appendChild(label);
      row.appendChild(removeBtn);
      zonesHost.appendChild(row);
    });

    const addZoneBtn = document.createElement("button");
    addZoneBtn.type = "button";
    addZoneBtn.className = "btn secondary";
    addZoneBtn.textContent = state.mode === "sequence" ? "+ Add Step" : "+ Add Bin";
    addZoneBtn.addEventListener("click", () => {
      state.zones.push({ label: "" });
      renderZones();
      renderItems();
    });
    zonesHost.appendChild(addZoneBtn);

    renderItems();
  }

  const itemsHost = document.createElement("div");
  itemsHost.style.marginTop = "16px";
  container.appendChild(itemsHost);

  function renderItems() {
    itemsHost.innerHTML = "";

    const itemsTitle = document.createElement("h4");
    itemsTitle.textContent = "Items";
    itemsHost.appendChild(itemsTitle);

    state.items.forEach((item, iIndex) => {
      const row = document.createElement("div");
      row.style.cssText = "display:flex; gap:8px; align-items:center; margin-bottom:6px;";

      const label = document.createElement("input");
      label.className = "input";
      label.style.marginBottom = "0";
      label.style.flex = "1";
      label.type = "text";
      label.value = item.label;
      label.placeholder = "Item text";
      label.addEventListener("input", () => { item.label = label.value; });

      const zoneSelect = document.createElement("select");
      zoneSelect.title = state.mode === "sequence" ? "Correct step" : "Correct bin";
      state.zones.forEach((zone, zIndex) => {
        const opt = document.createElement("option");
        opt.value = zIndex;
        opt.textContent = zone.label || zoneNounFor(zIndex);
        if (item.correctZoneIndex === zIndex) opt.selected = true;
        zoneSelect.appendChild(opt);
      });
      zoneSelect.addEventListener("change", () => { item.correctZoneIndex = parseInt(zoneSelect.value, 10); });

      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "btn secondary";
      removeBtn.textContent = "×";
      removeBtn.disabled = state.items.length <= 1;
      removeBtn.addEventListener("click", () => {
        state.items.splice(iIndex, 1);
        renderItems();
      });

      row.appendChild(label);
      row.appendChild(zoneSelect);
      row.appendChild(removeBtn);
      itemsHost.appendChild(row);
    });

    const addItemBtn = document.createElement("button");
    addItemBtn.type = "button";
    addItemBtn.className = "btn secondary";
    addItemBtn.textContent = "+ Add Item";
    addItemBtn.addEventListener("click", () => {
      state.items.push({ label: "", correctZoneIndex: 0 });
      renderItems();
    });
    itemsHost.appendChild(addItemBtn);
  }

  renderZones();

  const actionRow = document.createElement("div");
  actionRow.style.marginTop = "16px";

  const saveBtn = document.createElement("button");
  saveBtn.className = "btn";
  saveBtn.textContent = "Save Activity";
  saveBtn.addEventListener("click", () => onSave({
    mode: state.mode,
    passingScore: state.passingScore,
    zones: state.zones,
    items: state.items,
  }));

  const cancelBtn = document.createElement("button");
  cancelBtn.className = "btn secondary";
  cancelBtn.style.marginLeft = "8px";
  cancelBtn.textContent = "Cancel";
  cancelBtn.addEventListener("click", () => {
    container.style.display = "none";
    container.innerHTML = "";
  });

  const errorEl = document.createElement("p");
  errorEl.className = "error";
  errorEl.id = "dragdrop-editor-error";

  actionRow.appendChild(saveBtn);
  actionRow.appendChild(cancelBtn);
  container.appendChild(actionRow);
  container.appendChild(errorEl);
}
