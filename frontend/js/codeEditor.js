/**
 * Code Editor — reusable in-lesson component for HTML/CSS challenges.
 * Plain textareas (no syntax highlighting — keeps the "no build step, no
 * framework" stack) + a live preview iframe updated as the student types.
 *
 * renderCodeEditor(container, content, onSubmit) — content: { instructions,
 * starterHtml, starterCss, checks: [{id, description}] }. onSubmit({html, css})
 * fires when the student clicks "Check My Code".
 *
 * renderCodeResults(container, content, gradeResponse, onSubmit) shows
 * per-check pass/fail after grading, with a Retry button that reopens the
 * editor prefilled with what the student last submitted (not the starter code).
 */

function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

function buildPreviewDoc(html, css) {
  return `<!DOCTYPE html><html><head><style>${css}</style></head><body>${html}</body></html>`;
}

function renderCodeEditor(container, content, onSubmit, initialHtml, initialCss) {
  container.innerHTML = "";

  const instructions = document.createElement("p");
  instructions.textContent = content.instructions;
  container.appendChild(instructions);

  const checklist = document.createElement("ul");
  checklist.style.color = "var(--color-muted)";
  content.checks.forEach((check) => {
    const li = document.createElement("li");
    li.textContent = check.description;
    checklist.appendChild(li);
  });
  container.appendChild(checklist);

  const editorRow = document.createElement("div");
  editorRow.style.cssText = "display:flex; gap:16px; flex-wrap:wrap; margin-top:16px;";
  container.appendChild(editorRow);

  const htmlCol = document.createElement("div");
  htmlCol.style.cssText = "flex:1; min-width:260px;";
  htmlCol.innerHTML = `<label style="display:block; font-weight:700; margin-bottom:6px;">HTML</label>`;
  const htmlArea = document.createElement("textarea");
  htmlArea.className = "input";
  htmlArea.style.cssText = "height:200px; font-family:monospace; margin-bottom:0;";
  htmlArea.value = initialHtml !== undefined ? initialHtml : (content.starterHtml || "");
  htmlCol.appendChild(htmlArea);
  editorRow.appendChild(htmlCol);

  const cssCol = document.createElement("div");
  cssCol.style.cssText = "flex:1; min-width:260px;";
  cssCol.innerHTML = `<label style="display:block; font-weight:700; margin-bottom:6px;">CSS</label>`;
  const cssArea = document.createElement("textarea");
  cssArea.className = "input";
  cssArea.style.cssText = "height:200px; font-family:monospace; margin-bottom:0;";
  cssArea.value = initialCss !== undefined ? initialCss : (content.starterCss || "");
  cssCol.appendChild(cssArea);
  editorRow.appendChild(cssCol);

  const previewCol = document.createElement("div");
  previewCol.style.cssText = "flex:1; min-width:260px;";
  previewCol.innerHTML = `<label style="display:block; font-weight:700; margin-bottom:6px;">Preview</label>`;
  const iframe = document.createElement("iframe");
  iframe.sandbox = ""; // HTML/CSS preview only — no script execution, no navigation, no popups
  iframe.style.cssText = "width:100%; height:200px; border:1px solid var(--color-border); border-radius:8px; background:#fff;";
  previewCol.appendChild(iframe);
  editorRow.appendChild(previewCol);

  const updatePreview = debounce(() => {
    iframe.srcdoc = buildPreviewDoc(htmlArea.value, cssArea.value);
  }, 300);
  htmlArea.addEventListener("input", updatePreview);
  cssArea.addEventListener("input", updatePreview);
  updatePreview();

  const submitBtn = document.createElement("button");
  submitBtn.className = "btn";
  submitBtn.style.marginTop = "16px";
  submitBtn.textContent = "Check My Code";
  submitBtn.addEventListener("click", () => onSubmit({ html: htmlArea.value, css: cssArea.value }));
  container.appendChild(submitBtn);
}

function renderCodeResults(container, content, gradeResponse, onSubmit, submittedHtml, submittedCss) {
  container.innerHTML = "";

  const summary = document.createElement("p");
  summary.style.fontWeight = "700";
  summary.textContent = gradeResponse.passed
    ? `Passed! Score: ${gradeResponse.score}% (${gradeResponse.correctCount}/${gradeResponse.total})`
    : `Not quite — Score: ${gradeResponse.score}% (${gradeResponse.correctCount}/${gradeResponse.total}). Keep going.`;
  summary.style.color = gradeResponse.passed ? "var(--color-success)" : "#d64545";
  container.appendChild(summary);

  gradeResponse.results.forEach((result) => {
    const line = document.createElement("p");
    line.textContent = `${result.correct ? "✓" : "✗"} ${result.description}`;
    line.style.color = result.correct ? "var(--color-success)" : "#d64545";
    container.appendChild(line);
  });

  if (!gradeResponse.passed) {
    const retryBtn = document.createElement("button");
    retryBtn.className = "btn";
    retryBtn.style.marginTop = "12px";
    retryBtn.textContent = "Keep Editing";
    retryBtn.addEventListener("click", () => renderCodeEditor(container, content, onSubmit, submittedHtml, submittedCss));
    container.appendChild(retryBtn);
  }
}
