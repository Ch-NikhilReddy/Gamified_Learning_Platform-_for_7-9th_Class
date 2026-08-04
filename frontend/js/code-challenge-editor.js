/**
 * Code Challenge Editor — admin-only reusable component.
 * renderCodeChallengeEditor(container, challenge, checkTypes, onSave) draws an
 * editable form for instructions/starter code/checks/passing-score and calls
 * onSave(payload) with { instructions, starterHtml, starterCss, checks, passingScore }.
 */

const CHECK_FIELD_SPECS = {
  contains: [{ key: "text", label: "Text to find" }, { key: "source", label: "Source (html/css)" }],
  hasTag: [{ key: "tag", label: "Tag (e.g. h1)" }],
  hasTagWithText: [{ key: "tag", label: "Tag (e.g. p)" }, { key: "text", label: "Must contain text" }],
  hasAttribute: [{ key: "tag", label: "Tag (e.g. img)" }, { key: "attribute", label: "Attribute (e.g. src)" }],
  cssHasSelector: [{ key: "selector", label: "Selector (e.g. .card)" }],
  cssHasProperty: [{ key: "selector", label: "Selector" }, { key: "property", label: "Property (e.g. color)" }],
};

function emptyCheck(checkTypes) {
  return { type: checkTypes[0], description: "", source: "html" };
}

function renderCodeChallengeEditor(container, challenge, checkTypes, onSave) {
  container.innerHTML = "";
  container.style.display = "block";

  const state = {
    instructions: challenge.instructions || "",
    starterHtml: challenge.starterHtml || "",
    starterCss: challenge.starterCss || "",
    passingScore: challenge.passingScore || 100,
    checks: challenge.checks && challenge.checks.length
      ? challenge.checks.map((c) => ({ ...c }))
      : [emptyCheck(checkTypes)],
  };

  const heading = document.createElement("h3");
  heading.textContent = `Editing: ${challenge.lessonTitle}`;
  container.appendChild(heading);

  const instrLabel = document.createElement("label");
  instrLabel.style.display = "block";
  instrLabel.textContent = "Instructions (shown to student)";
  const instrArea = document.createElement("textarea");
  instrArea.className = "input";
  instrArea.style.height = "70px";
  instrArea.value = state.instructions;
  instrArea.addEventListener("input", () => { state.instructions = instrArea.value; });
  instrLabel.appendChild(instrArea);
  container.appendChild(instrLabel);

  const starterRow = document.createElement("div");
  starterRow.style.cssText = "display:flex; gap:16px; margin-bottom:12px;";

  const htmlCol = document.createElement("div");
  htmlCol.style.flex = "1";
  htmlCol.innerHTML = `<label style="display:block;">Starter HTML</label>`;
  const htmlArea = document.createElement("textarea");
  htmlArea.className = "input";
  htmlArea.style.cssText = "height:100px; font-family:monospace;";
  htmlArea.value = state.starterHtml;
  htmlArea.addEventListener("input", () => { state.starterHtml = htmlArea.value; });
  htmlCol.appendChild(htmlArea);
  starterRow.appendChild(htmlCol);

  const cssCol = document.createElement("div");
  cssCol.style.flex = "1";
  cssCol.innerHTML = `<label style="display:block;">Starter CSS</label>`;
  const cssArea = document.createElement("textarea");
  cssArea.className = "input";
  cssArea.style.cssText = "height:100px; font-family:monospace;";
  cssArea.value = state.starterCss;
  cssArea.addEventListener("input", () => { state.starterCss = cssArea.value; });
  cssCol.appendChild(cssArea);
  starterRow.appendChild(cssCol);

  container.appendChild(starterRow);

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

  const checksHost = document.createElement("div");
  container.appendChild(checksHost);

  function renderChecks() {
    checksHost.innerHTML = "";

    const title = document.createElement("h4");
    title.textContent = "Checks";
    checksHost.appendChild(title);

    state.checks.forEach((check, cIndex) => {
      const block = document.createElement("div");
      block.className = "card";
      block.style.marginBottom = "10px";

      const typeRow = document.createElement("div");
      typeRow.style.cssText = "display:flex; gap:8px; align-items:center; margin-bottom:8px;";

      const typeSelect = document.createElement("select");
      checkTypes.forEach((t) => {
        const opt = document.createElement("option");
        opt.value = t;
        opt.textContent = t;
        if (check.type === t) opt.selected = true;
        typeSelect.appendChild(opt);
      });
      typeSelect.addEventListener("change", () => {
        const fresh = emptyCheck(checkTypes);
        fresh.type = typeSelect.value;
        fresh.description = check.description;
        state.checks[cIndex] = fresh;
        renderChecks();
      });

      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "btn secondary";
      removeBtn.textContent = "Remove Check";
      removeBtn.disabled = state.checks.length <= 1;
      removeBtn.addEventListener("click", () => {
        state.checks.splice(cIndex, 1);
        renderChecks();
      });

      typeRow.appendChild(typeSelect);
      typeRow.appendChild(removeBtn);
      block.appendChild(typeRow);

      const descInput = document.createElement("input");
      descInput.className = "input";
      descInput.type = "text";
      descInput.placeholder = "Description shown to student (e.g. 'Page has an h1 heading')";
      descInput.value = check.description;
      descInput.addEventListener("input", () => { check.description = descInput.value; });
      block.appendChild(descInput);

      (CHECK_FIELD_SPECS[check.type] || []).forEach((field) => {
        const fieldInput = document.createElement("input");
        fieldInput.className = "input";
        fieldInput.type = "text";
        fieldInput.placeholder = field.label;
        fieldInput.value = check[field.key] || (field.key === "source" ? "html" : "");
        fieldInput.addEventListener("input", () => { check[field.key] = fieldInput.value; });
        block.appendChild(fieldInput);
      });

      checksHost.appendChild(block);
    });

    const addCheckBtn = document.createElement("button");
    addCheckBtn.type = "button";
    addCheckBtn.className = "btn secondary";
    addCheckBtn.textContent = "+ Add Check";
    addCheckBtn.addEventListener("click", () => {
      state.checks.push(emptyCheck(checkTypes));
      renderChecks();
    });
    checksHost.appendChild(addCheckBtn);
  }

  renderChecks();

  const actionRow = document.createElement("div");
  actionRow.style.marginTop = "16px";

  const saveBtn = document.createElement("button");
  saveBtn.className = "btn";
  saveBtn.textContent = "Save Challenge";
  saveBtn.addEventListener("click", () => onSave({
    instructions: state.instructions,
    starterHtml: state.starterHtml,
    starterCss: state.starterCss,
    passingScore: state.passingScore,
    checks: state.checks,
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
  errorEl.id = "code-challenge-editor-error";

  actionRow.appendChild(saveBtn);
  actionRow.appendChild(cancelBtn);
  container.appendChild(actionRow);
  container.appendChild(errorEl);
}
