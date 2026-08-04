let teacherId = localStorage.getItem("teacherId");

function showTeacherError(message = "") {
  document.getElementById("teacher-action-error").textContent = message;
}

function showDashboard() {
  document.getElementById("login-card").style.display = "none";
  document.getElementById("dashboard").style.display = "block";
}

document.getElementById("teacher-login-btn").addEventListener("click", async () => {
  const name = document.getElementById("teacher-name").value.trim();
  try {
    const { teacher } = await apiPost("/teacher/login", { name });
    teacherId = teacher.id;
    localStorage.setItem("teacherId", teacherId);
    showDashboard();
    showTeacherError("");
    loadRoster();
    loadModules();
    loadQuizzes();
    loadDragdrops();
    loadCodeChallenges();
    loadContentLessons();
  } catch (err) {
    document.getElementById("teacher-login-error").textContent = err.message;
  }
});

async function loadRoster() {
  const { sections, roster } = await apiGet(`/teacher/roster?teacherId=${teacherId}`);

  const sectionsList = document.getElementById("sections-list");
  sectionsList.innerHTML = "";
  sections.forEach((section) => {
    const row = document.createElement("div");
    row.style.marginBottom = "8px";
    row.innerHTML = `
      <strong>${section.className} - ${section.sectionName}</strong>
      &nbsp; Current Week:
      <input type="number" min="1" value="${section.currentWeek}" style="width:60px" data-section-id="${section.id}" class="week-input" />
    `;
    sectionsList.appendChild(row);
  });

  sectionsList.querySelectorAll(".week-input").forEach((input) => {
    input.addEventListener("change", async (e) => {
      const sectionId = e.target.getAttribute("data-section-id");
      const currentWeek = parseInt(e.target.value, 10);
      try {
        await apiPut(`/teacher/sections/${sectionId}/week`, { currentWeek });
        showTeacherError("");
        loadRoster();
      } catch (err) {
        showTeacherError(err.message);
      }
    });
  });

  const rosterBody = document.getElementById("roster-body");
  rosterBody.innerHTML = "";
  roster.forEach((student) => {
    const tr = document.createElement("tr");
    const badgeTitle = student.badgeNames.join(", ") || "None yet";
    tr.innerHTML = `
      <td>${student.name}</td>
      <td>${student.section}</td>
      <td>${student.xp}</td>
      <td>${student.streak > 0 ? "🔥 " + student.streak : "—"}</td>
      <td title="${badgeTitle}">${student.badges.length}</td>
      <td>${student.certifications.length}</td>
      <td>${student.grade}%</td>
    `;
    rosterBody.appendChild(tr);
  });
}

async function loadModules() {
  const { modules, units } = await apiGet("/teacher/modules");
  const unitTitleById = Object.fromEntries(units.map((u) => [u.id, u.title]));

  const tbody = document.getElementById("modules-body");
  tbody.innerHTML = "";
  modules
    .filter((m) => m.unitId !== "u1")
    .forEach((module) => {
      const tr = document.createElement("tr");
      const toggleLabel = module.status === "published" ? "Set to Draft" : "Publish";
      tr.innerHTML = `
        <td>${unitTitleById[module.unitId]}</td>
        <td>${module.content.title}</td>
        <td>${module.status}</td>
        <td><button class="btn secondary" data-module-id="${module.id}" data-next-status="${module.status === "published" ? "draft" : "published"}">${toggleLabel}</button></td>
      `;
      tbody.appendChild(tr);
    });

  tbody.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      const moduleId = e.target.getAttribute("data-module-id");
      const nextStatus = e.target.getAttribute("data-next-status");
      try {
        await apiPut(`/teacher/modules/${moduleId}`, { status: nextStatus });
        showTeacherError("");
        loadModules();
      } catch (err) {
        showTeacherError(err.message);
      }
    });
  });
}

async function loadQuizzes() {
  const { quizzes } = await apiGet("/teacher/quizzes");

  const tbody = document.getElementById("quizzes-body");
  tbody.innerHTML = "";
  quizzes.forEach((quiz) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${quiz.unitTitle}</td>
      <td>${quiz.lessonTitle}</td>
      <td>${quiz.questions.length}</td>
      <td><button class="btn secondary" data-quiz-id="${quiz.id}">Edit</button></td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", () => {
      const quiz = quizzes.find((q) => q.id === btn.getAttribute("data-quiz-id"));
      const editorContainer = document.getElementById("quiz-editor");
      renderQuizEditor(editorContainer, quiz, async (payload) => {
        try {
          await apiPut(`/teacher/quizzes/${quiz.id}`, payload);
          editorContainer.style.display = "none";
          editorContainer.innerHTML = "";
          loadQuizzes();
        } catch (err) {
          document.getElementById("quiz-editor-error").textContent = err.message;
        }
      });
    });
  });
}

async function loadDragdrops() {
  const { dragdrops } = await apiGet("/teacher/dragdrops");

  const tbody = document.getElementById("dragdrops-body");
  tbody.innerHTML = "";
  dragdrops.forEach((dragdrop) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${dragdrop.unitTitle}</td>
      <td>${dragdrop.lessonTitle}</td>
      <td>${dragdrop.mode}</td>
      <td>${dragdrop.items.length}</td>
      <td><button class="btn secondary" data-dragdrop-id="${dragdrop.id}">Edit</button></td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", () => {
      const dragdrop = dragdrops.find((d) => d.id === btn.getAttribute("data-dragdrop-id"));
      const editorContainer = document.getElementById("dragdrop-editor");
      renderDragdropEditor(editorContainer, dragdrop, async (payload) => {
        try {
          await apiPut(`/teacher/dragdrops/${dragdrop.id}`, payload);
          editorContainer.style.display = "none";
          editorContainer.innerHTML = "";
          loadDragdrops();
        } catch (err) {
          document.getElementById("dragdrop-editor-error").textContent = err.message;
        }
      });
    });
  });
}

async function loadCodeChallenges() {
  const { codeChallenges, checkTypes } = await apiGet("/teacher/code-challenges");

  const tbody = document.getElementById("code-challenges-body");
  tbody.innerHTML = "";
  codeChallenges.forEach((challenge) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${challenge.unitTitle}</td>
      <td>${challenge.lessonTitle}</td>
      <td>${challenge.checks.length}</td>
      <td><button class="btn secondary" data-challenge-id="${challenge.id}">Edit</button></td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", () => {
      const challenge = codeChallenges.find((c) => c.id === btn.getAttribute("data-challenge-id"));
      const editorContainer = document.getElementById("code-challenge-editor");
      renderCodeChallengeEditor(editorContainer, challenge, checkTypes, async (payload) => {
        try {
          await apiPut(`/teacher/code-challenges/${challenge.id}`, payload);
          editorContainer.style.display = "none";
          editorContainer.innerHTML = "";
          loadCodeChallenges();
        } catch (err) {
          document.getElementById("code-challenge-editor-error").textContent = err.message;
        }
      });
    });
  });
}

async function loadContentLessons() {
  const { lessons } = await apiGet("/teacher/content");

  const tbody = document.getElementById("content-lessons-body");
  tbody.innerHTML = "";
  lessons.forEach((lesson) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${lesson.unitTitle}</td>
      <td>${lesson.lessonTitle}</td>
      <td>${lesson.body ? "Yes" : "No"}</td>
      <td><button class="btn secondary" data-lesson-id="${lesson.id}">Edit</button></td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", () => {
      const lesson = lessons.find((l) => l.id === btn.getAttribute("data-lesson-id"));
      const editorContainer = document.getElementById("content-editor");
      renderContentEditor(editorContainer, lesson, async (payload) => {
        try {
          await apiPut(`/teacher/content/${lesson.id}`, payload);
          editorContainer.style.display = "none";
          editorContainer.innerHTML = "";
          loadContentLessons();
        } catch (err) {
          document.getElementById("content-editor-error").textContent = err.message;
        }
      });
    });
  });
}

if (teacherId) {
  showDashboard();
  loadRoster();
  loadModules();
  loadQuizzes();
  loadDragdrops();
  loadCodeChallenges();
  loadContentLessons();
}
