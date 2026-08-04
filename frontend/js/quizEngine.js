/**
 * Quiz Engine — reusable component.
 * Renders a list of { id, question, options } into `container` and calls
 * onSubmit(answers) with an array of selected option indexes (same order as
 * `questions`) when the student submits. Grading happens server-side.
 *
 * showResults(container, { results, score, passed, correctCount, total }) renders
 * per-question feedback after the server responds.
 */

function renderQuiz(container, questions, onSubmit) {
  container.innerHTML = "";

  const form = document.createElement("form");
  form.id = "quiz-form";

  questions.forEach((q, qIndex) => {
    const block = document.createElement("div");
    block.className = "quiz-question";
    block.style.marginBottom = "20px";

    const title = document.createElement("p");
    title.style.fontWeight = "700";
    title.textContent = `${qIndex + 1}. ${q.question}`;
    block.appendChild(title);

    q.options.forEach((option, oIndex) => {
      const label = document.createElement("label");
      label.style.display = "block";
      label.style.marginBottom = "6px";
      label.style.cursor = "pointer";

      const radio = document.createElement("input");
      radio.type = "radio";
      radio.name = `q-${q.id}`;
      radio.value = oIndex;
      radio.required = true;
      radio.style.marginRight = "8px";

      label.appendChild(radio);
      label.appendChild(document.createTextNode(option));
      block.appendChild(label);
    });

    form.appendChild(block);
  });

  const submitBtn = document.createElement("button");
  submitBtn.type = "submit";
  submitBtn.className = "btn";
  submitBtn.textContent = "Submit Quiz";
  form.appendChild(submitBtn);

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const answers = questions.map((q) => {
      const selected = form.querySelector(`input[name="q-${q.id}"]:checked`);
      return selected ? parseInt(selected.value, 10) : -1;
    });
    onSubmit(answers);
  });

  container.appendChild(form);
}

function renderQuizResults(container, questions, gradeResponse, onSubmit) {
  container.innerHTML = "";

  const summary = document.createElement("p");
  summary.style.fontWeight = "700";
  summary.textContent = gradeResponse.passed
    ? `Passed! Score: ${gradeResponse.score}% (${gradeResponse.correctCount}/${gradeResponse.total})`
    : `Not quite — Score: ${gradeResponse.score}% (${gradeResponse.correctCount}/${gradeResponse.total}). Try again.`;
  summary.style.color = gradeResponse.passed ? "var(--color-success)" : "#d64545";
  container.appendChild(summary);

  questions.forEach((q, i) => {
    const result = gradeResponse.results[i];
    const line = document.createElement("p");
    line.textContent = `${i + 1}. ${q.question} — ${result.correct ? "Correct" : `Incorrect (correct answer: ${q.options[result.correctIndex]})`}`;
    line.style.color = result.correct ? "var(--color-success)" : "#d64545";
    container.appendChild(line);
  });

  if (!gradeResponse.passed) {
    const retryBtn = document.createElement("button");
    retryBtn.className = "btn";
    retryBtn.textContent = "Retry Quiz";
    retryBtn.addEventListener("click", () => renderQuiz(container, questions, onSubmit));
    container.appendChild(retryBtn);
  }
}
