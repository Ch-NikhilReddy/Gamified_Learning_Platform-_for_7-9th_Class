const studentId = localStorage.getItem("studentId");
if (!studentId) window.location.href = "../index.html";

document.getElementById("student-name").textContent = `Hi, ${localStorage.getItem("studentName")}!`;

function nodeClass(module) {
  if (module.complete) return "node complete";
  if (module.unlocked) return "node unlocked";
  return "node locked";
}

function renderCourse(course) {
  const container = document.getElementById("course-container");
  container.innerHTML = "";

  course.forEach((unit) => {
    const unitEl = document.createElement("div");
    unitEl.className = "unit-block card";

    const heading = document.createElement("h2");
    heading.textContent = `Unit ${unit.order}: ${unit.title}`;
    unitEl.appendChild(heading);

    const row = document.createElement("div");
    row.className = "node-row";

    unit.lessons.forEach((lesson) => {
      lesson.modules.forEach((module) => {
        const btn = document.createElement("button");
        btn.className = nodeClass(module);
        btn.textContent = lesson.title;
        btn.disabled = !module.unlocked;
        btn.addEventListener("click", () => {
          window.location.href = `lesson.html?moduleId=${module.id}`;
        });
        row.appendChild(btn);
      });
    });

    unitEl.appendChild(row);
    container.appendChild(unitEl);
  });
}

async function renderBadges(badgeIds) {
  const badgesCard = document.getElementById("badges-card");
  const badgesList = document.getElementById("badges-list");
  badgesList.innerHTML = "";

  if (!badgeIds || badgeIds.length === 0) {
    badgesCard.style.display = "none";
    return;
  }
  badgesCard.style.display = "block";

  const { badges: catalog } = await apiGet("/badges");
  const byId = Object.fromEntries(catalog.map((b) => [b.id, b]));

  badgeIds.forEach((id) => {
    const badge = byId[id];
    if (!badge) return;
    const pill = document.createElement("span");
    pill.className = "pill";
    pill.style.background = "var(--color-accent)";
    pill.title = badge.description;
    pill.textContent = `${badge.icon} ${badge.name}`;
    badgesList.appendChild(pill);
  });
}

async function renderLeaderboard() {
  const { leaderboard } = await apiGet(`/students/leaderboard?studentId=${studentId}`);
  const card = document.getElementById("leaderboard-card");
  const list = document.getElementById("leaderboard-list");
  list.innerHTML = "";

  if (!leaderboard || leaderboard.length === 0) {
    card.style.display = "none";
    return;
  }
  card.style.display = "block";

  leaderboard.forEach((entry) => {
    const li = document.createElement("li");
    li.textContent = `${entry.name} — ${entry.xp} XP`;
    if (entry.id === studentId) li.style.fontWeight = "700";
    list.appendChild(li);
  });
}

async function load() {
  try {
    const { course, xp, badges, certifications, streak } = await apiGet(`/course/map?studentId=${studentId}`);
    document.getElementById("xp-pill").textContent = `${xp} XP`;

    const streakPill = document.getElementById("streak-pill");
    streakPill.style.marginLeft = "8px";
    streakPill.textContent = streak && streak.current > 0 ? `🔥 ${streak.current} day streak` : "";

    const certContainer = document.getElementById("cert-pills");
    certContainer.innerHTML = "";
    (certifications || []).forEach((unitId) => {
      const unit = course.find((u) => u.id === unitId);
      const pill = document.createElement("span");
      pill.className = "pill cert";
      pill.style.marginLeft = "8px";
      pill.textContent = `Certified: ${unit ? unit.title : unitId}`;
      certContainer.appendChild(pill);
    });

    renderCourse(course);
    renderBadges(badges);
    renderLeaderboard();
  } catch (err) {
    document.getElementById("course-container").textContent = `Error: ${err.message}`;
  }
}

load();
