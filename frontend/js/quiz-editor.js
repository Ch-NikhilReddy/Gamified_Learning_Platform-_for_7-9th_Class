/**
 * Quiz Editor — admin-only reusable component.
 * renderQuizEditor(container, quiz, onSave) draws an editable form for a
 * quiz's questions/options/correct-answer/passing-score and calls
 * onSave(payload) with { questions, passingScore } when the teacher saves.
 */

function emptyQuestion() {
  return { question: "", options: ["", ""], correctIndex: 0 };
}

function renderQuizEditor(container, quiz, onSave) {
  container.innerHTML = "";
  container.style.display = "block";

  const state = {
    passingScore: quiz.passingScore || 70,
    questions: quiz.questions && quiz.questions.length
      ? quiz.questions.map((q) => ({ question: q.question, options: [...q.options], correctIndex: q.correctIndex }))
      : [emptyQuestion()],
  };

  const heading = document.createElement("h3");
  heading.textContent = `Editing: ${quiz.lessonTitle}`;
  container.appendChild(heading);

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
  passInput.addEventListener("input", () => {
    state.passingScore = parseInt(passInput.value, 10) || 0;
  });
  passRow.appendChild(passInput);
  container.appendChild(passRow);

  const questionsHost = document.createElement("div");
  container.appendChild(questionsHost);

  function renderQuestions() {
    questionsHost.innerHTML = "";
    state.questions.forEach((q, qIndex) => {
      const block = document.createElement("div");
      block.className = "card";
      block.style.marginBottom = "12px";

      const qLabel = document.createElement("label");
      qLabel.style.display = "block";
      qLabel.textContent = `Question ${qIndex + 1}`;
      const qInput = document.createElement("input");
      qInput.className = "input";
      qInput.type = "text";
      qInput.value = q.question;
      qInput.placeholder = "Question text";
      qInput.addEventListener("input", () => { q.question = qInput.value; });
      qLabel.appendChild(qInput);
      block.appendChild(qLabel);

      q.options.forEach((option, oIndex) => {
        const optRow = document.createElement("div");
        optRow.style.display = "flex";
        optRow.style.alignItems = "center";
        optRow.style.gap = "8px";
        optRow.style.marginBottom = "6px";

        const radio = document.createElement("input");
        radio.type = "radio";
        radio.name = `correct-${qIndex}`;
        radio.checked = q.correctIndex === oIndex;
        radio.title = "Mark as correct answer";
        radio.addEventListener("change", () => { q.correctIndex = oIndex; });

        const optInput = document.createElement("input");
        optInput.className = "input";
        optInput.style.marginBottom = "0";
        optInput.type = "text";
        optInput.value = option;
        optInput.placeholder = `Option ${oIndex + 1}`;
        optInput.addEventListener("input", () => { q.options[oIndex] = optInput.value; });

        const removeOptBtn = document.createElement("button");
        removeOptBtn.type = "button";
        removeOptBtn.className = "btn secondary";
        removeOptBtn.textContent = "×";
        removeOptBtn.disabled = q.options.length <= 2;
        removeOptBtn.addEventListener("click", () => {
          q.options.splice(oIndex, 1);
          if (q.correctIndex >= q.options.length) q.correctIndex = 0;
          renderQuestions();
        });

        optRow.appendChild(radio);
        optRow.appendChild(optInput);
        optRow.appendChild(removeOptBtn);
        block.appendChild(optRow);
      });

      const addOptBtn = document.createElement("button");
      addOptBtn.type = "button";
      addOptBtn.className = "btn secondary";
      addOptBtn.textContent = "+ Add Option";
      addOptBtn.addEventListener("click", () => {
        q.options.push("");
        renderQuestions();
      });
      block.appendChild(addOptBtn);

      const removeQBtn = document.createElement("button");
      removeQBtn.type = "button";
      removeQBtn.className = "btn secondary";
      removeQBtn.style.marginLeft = "8px";
      removeQBtn.textContent = "Remove Question";
      removeQBtn.disabled = state.questions.length <= 1;
      removeQBtn.addEventListener("click", () => {
        state.questions.splice(qIndex, 1);
        renderQuestions();
      });
      block.appendChild(removeQBtn);

      questionsHost.appendChild(block);
    });
  }

  renderQuestions();

  const addQBtn = document.createElement("button");
  addQBtn.type = "button";
  addQBtn.className = "btn secondary";
  addQBtn.textContent = "+ Add Question";
  addQBtn.addEventListener("click", () => {
    state.questions.push(emptyQuestion());
    renderQuestions();
  });
  container.appendChild(addQBtn);

  const actionRow = document.createElement("div");
  actionRow.style.marginTop = "16px";

  const saveBtn = document.createElement("button");
  saveBtn.className = "btn";
  saveBtn.textContent = "Save Quiz";
  saveBtn.addEventListener("click", () => onSave({ questions: state.questions, passingScore: state.passingScore }));

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
  errorEl.id = "quiz-editor-error";

  actionRow.appendChild(saveBtn);
  actionRow.appendChild(cancelBtn);
  container.appendChild(actionRow);
  container.appendChild(errorEl);
}
