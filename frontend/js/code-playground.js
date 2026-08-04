/**
 * Standalone Code Editor (free practice) — separate from the in-lesson Code
 * Editor: no grading, no unlock gating, just an HTML/CSS/JS scratchpad with a
 * live preview and lightweight autocomplete. Autosaves to localStorage so
 * work survives a reload on the same browser (no server persistence — this
 * isn't part of course progress).
 *
 * Autocomplete here is a plain-textarea suggestion list positioned at the
 * caret using the standard "mirror div" measurement technique — not a real
 * code-editor library (no CodeMirror/Monaco), since pulling one in would mean
 * an external dependency/CDN script, which conflicts with this project's
 * "no build step" stack decision. This is a lighter-weight approximation.
 */

const HTML_TAGS = [
  "a", "abbr", "b", "blockquote", "body", "br", "button", "caption", "code", "div",
  "em", "footer", "form", "h1", "h2", "h3", "h4", "h5", "h6", "head", "header",
  "hr", "html", "i", "iframe", "img", "input", "label", "li", "link", "main",
  "nav", "ol", "option", "p", "pre", "script", "section", "select", "small",
  "span", "strong", "style", "table", "tbody", "td", "textarea", "th", "thead",
  "title", "tr", "ul", "video",
];

const CSS_PROPERTIES = [
  "align-items", "background", "background-color", "border", "border-radius",
  "box-shadow", "box-sizing", "color", "cursor", "display", "flex",
  "flex-direction", "font-family", "font-size", "font-weight", "gap", "height",
  "justify-content", "left", "letter-spacing", "line-height", "margin",
  "margin-bottom", "margin-left", "margin-right", "margin-top", "max-width",
  "min-height", "opacity", "overflow", "padding", "position", "text-align",
  "text-decoration", "top", "transform", "transition", "vertical-align",
  "visibility", "width", "z-index",
];

function getCaretCoordinates(textarea, position) {
  const mirror = document.createElement("div");
  const style = getComputedStyle(textarea);
  const props = [
    "boxSizing", "width", "borderTopWidth", "borderRightWidth", "borderBottomWidth",
    "borderLeftWidth", "borderStyle", "paddingTop", "paddingRight", "paddingBottom",
    "paddingLeft", "fontStyle", "fontVariant", "fontWeight", "fontSize", "lineHeight",
    "fontFamily", "textAlign", "textTransform", "textIndent", "letterSpacing", "wordSpacing",
  ];
  mirror.style.position = "absolute";
  mirror.style.visibility = "hidden";
  mirror.style.whiteSpace = "pre-wrap";
  mirror.style.wordWrap = "break-word";
  document.body.appendChild(mirror);
  props.forEach((prop) => { mirror.style[prop] = style[prop]; });
  mirror.textContent = textarea.value.substring(0, position);
  const span = document.createElement("span");
  span.textContent = textarea.value.substring(position) || ".";
  mirror.appendChild(span);
  const { offsetLeft: left, offsetTop: top } = span;
  document.body.removeChild(mirror);
  return { left, top, lineHeight: parseInt(style.lineHeight, 10) || 18 };
}

function setupAutocomplete(textarea, { trigger, wordPattern, list, insert }) {
  const box = document.createElement("div");
  box.style.cssText = "position:absolute; background:var(--color-surface); border:1px solid var(--color-border); border-radius:8px; box-shadow:0 4px 12px rgba(0,0,0,0.15); max-height:160px; overflow-y:auto; display:none; z-index:50; min-width:120px;";
  document.body.appendChild(box);

  let activeMatches = [];
  let activeIndex = 0;
  let replaceStart = -1;

  function hide() {
    box.style.display = "none";
    activeMatches = [];
  }

  function renderBox() {
    box.innerHTML = "";
    activeMatches.forEach((item, i) => {
      const row = document.createElement("div");
      row.textContent = item;
      row.style.cssText = `padding:4px 10px; cursor:pointer; ${i === activeIndex ? "background:var(--color-primary); color:#fff;" : ""}`;
      row.addEventListener("mousedown", (e) => {
        e.preventDefault();
        commit(item);
      });
      box.appendChild(row);
    });
  }

  function commit(item) {
    const value = textarea.value;
    const caret = textarea.selectionStart;
    const newValue = value.slice(0, replaceStart) + insert(item) + value.slice(caret);
    textarea.value = newValue;
    const newCaret = replaceStart + insert(item).length;
    textarea.setSelectionRange(newCaret, newCaret);
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
    hide();
    textarea.focus();
  }

  textarea.addEventListener("input", () => {
    const caret = textarea.selectionStart;
    const beforeCaret = textarea.value.slice(0, caret);
    const match = wordPattern.exec(beforeCaret);
    if (!match) return hide();

    replaceStart = match.index;
    const typed = match[1] || "";
    activeMatches = list.filter((item) => item.startsWith(typed.toLowerCase())).slice(0, 8);
    activeIndex = 0;

    if (activeMatches.length === 0) return hide();

    const coords = getCaretCoordinates(textarea, caret);
    const rect = textarea.getBoundingClientRect();
    box.style.left = `${rect.left + window.scrollX + coords.left}px`;
    box.style.top = `${rect.top + window.scrollY + coords.top + coords.lineHeight - textarea.scrollTop}px`;
    box.style.display = "block";
    renderBox();
  });

  textarea.addEventListener("keydown", (e) => {
    if (box.style.display === "none") return;
    if (e.key === "ArrowDown") { e.preventDefault(); activeIndex = (activeIndex + 1) % activeMatches.length; renderBox(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); activeIndex = (activeIndex - 1 + activeMatches.length) % activeMatches.length; renderBox(); }
    else if (e.key === "Tab" || e.key === "Enter") { e.preventDefault(); commit(activeMatches[activeIndex]); }
    else if (e.key === "Escape") { hide(); }
  });

  textarea.addEventListener("blur", () => setTimeout(hide, 150));
}

function buildPreviewDoc(html, css, js) {
  return `<!DOCTYPE html><html><head><style>${css}</style></head><body>${html}<script>${js}<\/script></body></html>`;
}

function init() {
  const htmlArea = document.getElementById("playground-html");
  const cssArea = document.getElementById("playground-css");
  const jsArea = document.getElementById("playground-js");
  const iframe = document.getElementById("playground-preview");
  iframe.sandbox = "allow-scripts"; // free practice runs scripts, but no same-origin/forms/popups/navigation

  const STORAGE_KEYS = { html: "playground-html", css: "playground-css", js: "playground-js" };
  htmlArea.value = localStorage.getItem(STORAGE_KEYS.html) || "<h1>Hello, world!</h1>";
  cssArea.value = localStorage.getItem(STORAGE_KEYS.css) || "h1 {\n  color: #3E7BFA;\n}";
  jsArea.value = localStorage.getItem(STORAGE_KEYS.js) || "";

  let debounceTimer;
  function updatePreview() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      iframe.srcdoc = buildPreviewDoc(htmlArea.value, cssArea.value, jsArea.value);
      localStorage.setItem(STORAGE_KEYS.html, htmlArea.value);
      localStorage.setItem(STORAGE_KEYS.css, cssArea.value);
      localStorage.setItem(STORAGE_KEYS.js, jsArea.value);
    }, 300);
  }

  [htmlArea, cssArea, jsArea].forEach((area) => area.addEventListener("input", updatePreview));
  updatePreview();

  setupAutocomplete(htmlArea, {
    wordPattern: /<([a-zA-Z]*)$/,
    list: HTML_TAGS,
    insert: (tag) => `<${tag}`,
  });

  setupAutocomplete(cssArea, {
    wordPattern: /(?:^|[{;\s])([a-zA-Z-]{2,})$/,
    list: CSS_PROPERTIES,
    insert: (prop) => prop,
  });

  document.getElementById("playground-reset").addEventListener("click", () => {
    if (!confirm("Reset the playground to the starter example? This clears your current code.")) return;
    htmlArea.value = "<h1>Hello, world!</h1>";
    cssArea.value = "h1 {\n  color: #3E7BFA;\n}";
    jsArea.value = "";
    updatePreview();
  });
}

init();
