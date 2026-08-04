const studentId = localStorage.getItem("studentId");
if (!studentId) window.location.href = "../index.html";

const params = new URLSearchParams(window.location.search);
const moduleId = params.get("moduleId");

async function load() {
  try {
    const { course } = await apiGet(`/course/map?studentId=${studentId}`);
    let found = null;
    for (const unit of course) {
      for (const lesson of unit.lessons) {
        const module = lesson.modules.find((m) => m.id === moduleId);
        if (module) found = { module, lesson, unit };
      }
    }

    if (!found) {
      document.getElementById("lesson-title").textContent = "Lesson not found";
      document.getElementById("content-card").style.display = "none";
      return;
    }

    document.getElementById("lesson-title").textContent = `${found.unit.title} · ${found.lesson.title}`;

    if (!found.module.unlocked) {
      document.getElementById("lesson-body").textContent = "This lesson is locked.";
      document.getElementById("complete-btn").disabled = true;
      return;
    }

    if (found.module.type === "quiz") {
      setupQuiz(found.module);
      return;
    }

    if (found.module.type === "dragdrop") {
      setupDragDrop(found.module);
      return;
    }

    if (found.module.type === "code") {
      setupCodeChallenge(found.module);
      return;
    }

    setupContent(found.module);
  } catch (err) {
    document.getElementById("lesson-error").textContent = err.message;
  }
}

async function showBadgeNotice(container, newBadges) {
  if (!newBadges || newBadges.length === 0) return;
  const { badges: catalog } = await apiGet("/badges");
  const byId = Object.fromEntries(catalog.map((b) => [b.id, b]));

  newBadges.forEach((id) => {
    const badge = byId[id];
    if (!badge) return;
    const notice = document.createElement("p");
    notice.style.fontWeight = "700";
    notice.style.color = "var(--color-text)";
    notice.textContent = `🎉 New badge earned: ${badge.icon} ${badge.name} — ${badge.description}`;
    container.appendChild(notice);
  });
}

function setupContent(module) {
  document.getElementById("lesson-body").textContent =
    module.content && module.content.body
      ? module.content.body
      : "Content for this lesson has not been written yet — teacher review pending.";

  if (module.complete) {
    document.getElementById("complete-btn").textContent = "Completed";
    document.getElementById("complete-btn").disabled = true;
  }

  document.getElementById("complete-btn").addEventListener("click", async () => {
    try {
      await apiPost("/progress/complete", { studentId, moduleId });
      window.location.href = "course-map.html";
    } catch (err) {
      document.getElementById("lesson-error").textContent = err.message;
    }
  });
}

function setupQuiz(module) {
  document.getElementById("content-card").style.display = "none";
  document.getElementById("quiz-card").style.display = "block";
  const container = document.getElementById("quiz-container");

  if (!module.content.questions) {
    container.textContent = "This quiz has not been written yet — teacher review pending.";
    return;
  }

  if (module.complete) {
    container.textContent = "You've already passed this quiz.";
    return;
  }

  const onSubmit = async (answers) => {
    try {
      const gradeResponse = await apiPost("/progress/quiz-submit", { studentId, moduleId, answers });
      renderQuizResults(container, module.content.questions, gradeResponse, onSubmit);
      if (gradeResponse.passed) {
        await showBadgeNotice(container, gradeResponse.newBadges);
        const backLink = document.createElement("div");
        backLink.style.marginTop = "12px";
        backLink.innerHTML = `<a class="btn" href="course-map.html">Back to Course Map</a>`;
        container.appendChild(backLink);
      }
    } catch (err) {
      document.getElementById("lesson-error").textContent = err.message;
    }
  };

  renderQuiz(container, module.content.questions, onSubmit);
}

function setupDragDrop(module) {
  document.getElementById("content-card").style.display = "none";
  document.getElementById("dragdrop-card").style.display = "block";
  const container = document.getElementById("dragdrop-container");

  if (!module.content.items) {
    container.textContent = "This activity has not been written yet — teacher review pending.";
    return;
  }

  if (module.complete) {
    container.textContent = "You've already completed this activity.";
    return;
  }

  const onSubmit = async (placements) => {
    try {
      const gradeResponse = await apiPost("/progress/dragdrop-submit", { studentId, moduleId, placements });
      renderDragDropResults(container, module.content, gradeResponse, onSubmit);
      if (gradeResponse.passed) {
        await showBadgeNotice(container, gradeResponse.newBadges);
        const backLink = document.createElement("div");
        backLink.style.marginTop = "12px";
        backLink.innerHTML = `<a class="btn" href="course-map.html">Back to Course Map</a>`;
        container.appendChild(backLink);
      }
    } catch (err) {
      document.getElementById("lesson-error").textContent = err.message;
    }
  };

  renderDragDrop(container, module.content, onSubmit);
}

function setupCodeChallenge(module) {
  document.getElementById("content-card").style.display = "none";
  document.getElementById("code-card").style.display = "block";
  const container = document.getElementById("code-container");

  if (!module.content.checks) {
    container.textContent = "This challenge has not been written yet — teacher review pending.";
    return;
  }

  if (module.complete) {
    container.textContent = "You've already passed this challenge.";
    return;
  }

  const onSubmit = async ({ html, css }) => {
    try {
      const gradeResponse = await apiPost("/progress/code-submit", { studentId, moduleId, html, css });
      renderCodeResults(container, module.content, gradeResponse, onSubmit, html, css);
      if (gradeResponse.passed) {
        await showBadgeNotice(container, gradeResponse.newBadges);
        const backLink = document.createElement("div");
        backLink.style.marginTop = "12px";
        backLink.innerHTML = `<a class="btn" href="course-map.html">Back to Course Map</a>`;
        container.appendChild(backLink);
      }
    } catch (err) {
      document.getElementById("lesson-error").textContent = err.message;
    }
  };

  renderCodeEditor(container, module.content, onSubmit);
}

load();
