/**
 * Lesson Content Editor — admin-only reusable component for plain "content"
 * modules (the non-graded Learn text). renderContentEditor(container, lesson,
 * onSave) draws a single textarea and calls onSave({ body }) on save.
 */

function renderContentEditor(container, lesson, onSave) {
  container.innerHTML = "";
  container.style.display = "block";

  const heading = document.createElement("h3");
  heading.textContent = `Editing: ${lesson.lessonTitle}`;
  container.appendChild(heading);

  const bodyArea = document.createElement("textarea");
  bodyArea.className = "input";
  bodyArea.style.height = "160px";
  bodyArea.value = lesson.body || "";
  bodyArea.placeholder = "Write the lesson explanation students will read...";
  container.appendChild(bodyArea);

  const actionRow = document.createElement("div");
  actionRow.style.marginTop = "12px";

  const saveBtn = document.createElement("button");
  saveBtn.className = "btn";
  saveBtn.textContent = "Save Lesson";
  saveBtn.addEventListener("click", () => onSave({ body: bodyArea.value }));

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
  errorEl.id = "content-editor-error";

  actionRow.appendChild(saveBtn);
  actionRow.appendChild(cancelBtn);
  container.appendChild(actionRow);
  container.appendChild(errorEl);
}
