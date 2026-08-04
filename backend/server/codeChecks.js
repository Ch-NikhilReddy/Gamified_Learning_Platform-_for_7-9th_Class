/**
 * Server-side grading for code-editor challenges. Deliberately simple
 * regex/substring checks rather than a full HTML/CSS parser — no new
 * dependency, and it's enough to verify "did you use this tag / attribute /
 * property" for teaching purposes. Flagged limitation: this can be fooled by
 * unusual formatting (e.g. attributes split across lines) or give a false
 * positive if the tag/text appears inside a comment. Good enough for an MVP
 * grading in-lesson HTML/CSS practice, not a substitute for real linting.
 */

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// "contains" checks either source (teacher picks via check.source); the HTML-tag
// checks always run against html, the CSS checks always run against css.
function runCheck(check, { html, css }) {
  html = html || "";
  css = css || "";

  switch (check.type) {
    case "contains": {
      const source = check.source === "css" ? css : html;
      return source.toLowerCase().includes(check.text.toLowerCase());
    }

    case "hasTag":
      return new RegExp(`<${escapeRegex(check.tag)}\\b`, "i").test(html);

    case "hasTagWithText": {
      const re = new RegExp(`<${escapeRegex(check.tag)}\\b[^>]*>([\\s\\S]*?)</${escapeRegex(check.tag)}>`, "gi");
      let match;
      while ((match = re.exec(html)) !== null) {
        if (match[1].toLowerCase().includes(check.text.toLowerCase())) return true;
      }
      return false;
    }

    case "hasAttribute":
      return new RegExp(`<${escapeRegex(check.tag)}\\b[^>]*\\b${escapeRegex(check.attribute)}\\s*=`, "i").test(html);

    case "cssHasSelector":
      return css.toLowerCase().includes(check.selector.toLowerCase());

    case "cssHasProperty": {
      const re = new RegExp(`${escapeRegex(check.selector)}\\s*\\{([^}]*)\\}`, "i");
      const match = re.exec(css);
      if (!match) return false;
      return new RegExp(`${escapeRegex(check.property)}\\s*:`, "i").test(match[1]);
    }

    default:
      return false;
  }
}

const CHECK_TYPES = ["contains", "hasTag", "hasTagWithText", "hasAttribute", "cssHasSelector", "cssHasProperty"];

module.exports = { runCheck, CHECK_TYPES };
