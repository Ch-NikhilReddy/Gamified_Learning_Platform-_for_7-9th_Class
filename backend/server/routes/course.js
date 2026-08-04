const express = require("express");
const { COURSE, findModuleById } = require("../courseData");
const { computeUnlockedMap } = require("../unlock");
const { load, save } = require("../dataStore");
const { runCheck } = require("../codeChecks");
const { evaluateBadges, updateStreak, BADGE_DEFS } = require("../badges");

const router = express.Router();

// Marks a module complete for a student (idempotent), awards XP, updates their
// activity streak, grants unit certification if that was the unit's last
// module, and evaluates badges. Shared by the plain completion route and every
// engine's submit route (only called after a pass). Returns newly-earned badge
// ids so the caller can surface a "badge earned!" notice.
function markModuleComplete(data, student, moduleId) {
  if (!student.completedModules.includes(moduleId)) {
    student.completedModules.push(moduleId);
    student.xp += 10; // flat XP per module for now — tune once XP/badge design is scoped
  }

  const unit = COURSE.find((u) => u.id === moduleId.split("-")[0]);
  if (unit) {
    const allUnitModuleIds = unit.lessons.flatMap((l) => l.modules.map((m) => m.id));
    const unitComplete = allUnitModuleIds.every((id) => student.completedModules.includes(id));
    if (unitComplete && !student.certifications.includes(unit.id)) {
      student.certifications.push(unit.id);
    }
  }

  updateStreak(student);
  return evaluateBadges(student);
}

// Teacher-edited content (dataStore.quizOverrides / dragdropOverrides) takes
// precedence over the courseData default so admin edits show up without a
// code change/restart.
function resolveModuleContent(module, data) {
  if (module.type === "quiz") return data.quizOverrides[module.id] || module.content;
  if (module.type === "dragdrop") return data.dragdropOverrides[module.id] || module.content;
  if (module.type === "code") return data.codeOverrides[module.id] || module.content;
  if (module.type === "content") return data.contentOverrides[module.id] || module.content;
  return module.content;
}

// Never send answers to the client — grading happens server-side.
// Quiz: strips correctIndex off each question. Dragdrop: strips correctZoneId off each item.
function sanitizeModuleForStudent(module, data) {
  const content = resolveModuleContent(module, data);

  if (module.type === "quiz" && content.questions) {
    return {
      ...module,
      content: {
        ...content,
        questions: content.questions.map(({ id, question, options }) => ({ id, question, options })),
      },
    };
  }

  if (module.type === "dragdrop" && content.items) {
    return {
      ...module,
      content: {
        ...content,
        items: content.items.map(({ id, label }) => ({ id, label })),
      },
    };
  }

  return { ...module, content };
}

// GET /api/course -> raw structure (titles only, no lock state)
router.get("/course", (req, res) => {
  res.json({ course: COURSE });
});

// GET /api/course/map?studentId=... -> course with lock/complete state for this student
router.get("/course/map", (req, res) => {
  const { studentId } = req.query;
  const data = load();
  const student = data.students.find((s) => s.id === studentId);
  if (!student) return res.status(404).json({ error: "Student not found" });

  const section = data.sections.find((s) => s.id === student.sectionId);
  const unlockedMap = computeUnlockedMap(COURSE, section, student, data.moduleOverrides);

  const course = COURSE.map((unit) => ({
    ...unit,
    lessons: unit.lessons.map((lesson) => ({
      ...lesson,
      modules: lesson.modules.map((m) => sanitizeModuleForStudent({ ...m, ...unlockedMap[m.id] }, data)),
    })),
  }));

  res.json({
    course,
    xp: student.xp,
    badges: student.badges,
    certifications: student.certifications,
    streak: student.streak || { current: 0, longest: 0, lastActiveDate: null },
  });
});

// POST /api/progress/complete { studentId, moduleId }
router.post("/progress/complete", (req, res) => {
  const { studentId, moduleId } = req.body || {};
  if (!studentId || !moduleId) {
    return res.status(400).json({ error: "studentId and moduleId are required" });
  }

  const data = load();
  const student = data.students.find((s) => s.id === studentId);
  if (!student) return res.status(404).json({ error: "Student not found" });

  const section = data.sections.find((s) => s.id === student.sectionId);
  const unlockedMap = computeUnlockedMap(COURSE, section, student, data.moduleOverrides);
  const moduleState = unlockedMap[moduleId];

  if (!moduleState || !moduleState.unlocked) {
    return res.status(403).json({ error: "Module is locked" });
  }

  const newBadges = markModuleComplete(data, student, moduleId);

  save(data);
  res.json({ xp: student.xp, badges: student.badges, certifications: student.certifications, newBadges });
});

// POST /api/progress/quiz-submit { studentId, moduleId, answers: [selectedIndex, ...] }
// Grading happens server-side against courseData — the client never sees or
// sends correct answers, only the option index the student picked.
router.post("/progress/quiz-submit", (req, res) => {
  const { studentId, moduleId, answers } = req.body || {};
  if (!studentId || !moduleId || !Array.isArray(answers)) {
    return res.status(400).json({ error: "studentId, moduleId and answers[] are required" });
  }

  const data = load();
  const student = data.students.find((s) => s.id === studentId);
  if (!student) return res.status(404).json({ error: "Student not found" });

  const module = findModuleById(moduleId);
  if (!module || module.type !== "quiz") {
    return res.status(400).json({ error: "Module is not a quiz" });
  }

  const content = resolveModuleContent(module, data);
  if (!content.questions) {
    return res.status(409).json({ error: "This quiz has no questions yet — teacher hasn't authored it" });
  }

  const section = data.sections.find((s) => s.id === student.sectionId);
  const unlockedMap = computeUnlockedMap(COURSE, section, student, data.moduleOverrides);
  const moduleState = unlockedMap[moduleId];
  if (!moduleState || !moduleState.unlocked) {
    return res.status(403).json({ error: "Module is locked" });
  }

  const { questions, passingScore } = content;
  const results = questions.map((q, i) => ({
    id: q.id,
    correct: answers[i] === q.correctIndex,
    correctIndex: q.correctIndex,
  }));
  const correctCount = results.filter((r) => r.correct).length;
  const score = Math.round((correctCount / questions.length) * 100);
  const passed = score >= (passingScore || 70);

  let newBadges = [];
  if (passed) {
    newBadges = markModuleComplete(data, student, moduleId);
    save(data);
  }

  res.json({
    score,
    correctCount,
    total: questions.length,
    passed,
    results,
    xp: student.xp,
    certifications: student.certifications,
    newBadges,
  });
});

// POST /api/progress/dragdrop-submit { studentId, moduleId, placements: [{ itemId, zoneIndex }] }
// Works for both "sort" (zoneIndex = bin index) and "sequence" (zoneIndex = final
// position — the client computes it from the item's final order in the list)
// since grading is identical either way: does the submitted zoneIndex match the
// item's correctZoneIndex? Grading happens server-side; the client never sees it.
router.post("/progress/dragdrop-submit", (req, res) => {
  const { studentId, moduleId, placements } = req.body || {};
  if (!studentId || !moduleId || !Array.isArray(placements)) {
    return res.status(400).json({ error: "studentId, moduleId and placements[] are required" });
  }

  const data = load();
  const student = data.students.find((s) => s.id === studentId);
  if (!student) return res.status(404).json({ error: "Student not found" });

  const module = findModuleById(moduleId);
  if (!module || module.type !== "dragdrop") {
    return res.status(400).json({ error: "Module is not a drag-and-drop activity" });
  }

  const content = resolveModuleContent(module, data);
  if (!content.items) {
    return res.status(409).json({ error: "This activity has no items yet — teacher hasn't authored it" });
  }

  const section = data.sections.find((s) => s.id === student.sectionId);
  const unlockedMap = computeUnlockedMap(COURSE, section, student, data.moduleOverrides);
  const moduleState = unlockedMap[moduleId];
  if (!moduleState || !moduleState.unlocked) {
    return res.status(403).json({ error: "Module is locked" });
  }

  const { items, passingScore } = content;
  const submittedByItemId = Object.fromEntries(placements.map((p) => [p.itemId, p.zoneIndex]));
  const results = items.map((item) => ({
    id: item.id,
    correct: submittedByItemId[item.id] === item.correctZoneIndex,
    correctZoneIndex: item.correctZoneIndex,
  }));
  const correctCount = results.filter((r) => r.correct).length;
  const score = Math.round((correctCount / items.length) * 100);
  const passed = score >= (passingScore || 80);

  let newBadges = [];
  if (passed) {
    newBadges = markModuleComplete(data, student, moduleId);
    save(data);
  }

  res.json({
    score,
    correctCount,
    total: items.length,
    passed,
    results,
    xp: student.xp,
    certifications: student.certifications,
    newBadges,
  });
});

// POST /api/progress/code-submit { studentId, moduleId, html, css }
// Grading runs each teacher-defined check (see codeChecks.js) against the
// student's submitted source server-side. Checks/instructions are visible to
// the student up front (they're a requirements checklist, not a secret
// answer) — what's graded server-side is whether their actual code satisfies
// them, so seeing the checklist doesn't let them skip writing real code.
router.post("/progress/code-submit", (req, res) => {
  const { studentId, moduleId, html, css } = req.body || {};
  if (!studentId || !moduleId || typeof html !== "string" || typeof css !== "string") {
    return res.status(400).json({ error: "studentId, moduleId, html and css are required" });
  }

  const data = load();
  const student = data.students.find((s) => s.id === studentId);
  if (!student) return res.status(404).json({ error: "Student not found" });

  const module = findModuleById(moduleId);
  if (!module || module.type !== "code") {
    return res.status(400).json({ error: "Module is not a code challenge" });
  }

  const content = resolveModuleContent(module, data);
  if (!content.checks) {
    return res.status(409).json({ error: "This challenge has no checks yet — teacher hasn't authored it" });
  }

  const section = data.sections.find((s) => s.id === student.sectionId);
  const unlockedMap = computeUnlockedMap(COURSE, section, student, data.moduleOverrides);
  const moduleState = unlockedMap[moduleId];
  if (!moduleState || !moduleState.unlocked) {
    return res.status(403).json({ error: "Module is locked" });
  }

  const { checks, passingScore } = content;
  const results = checks.map((check) => ({
    id: check.id,
    description: check.description,
    correct: runCheck(check, { html, css }),
  }));
  const correctCount = results.filter((r) => r.correct).length;
  const score = Math.round((correctCount / checks.length) * 100);
  const passed = score >= (passingScore || 100);

  let newBadges = [];
  if (passed) {
    newBadges = markModuleComplete(data, student, moduleId);
    save(data);
  }

  res.json({
    score,
    correctCount,
    total: checks.length,
    passed,
    results,
    xp: student.xp,
    certifications: student.certifications,
    newBadges,
  });
});

// GET /api/badges -> catalog of all badge definitions (id, name, icon, description)
// for the client to render earned badges without hardcoding the list.
router.get("/badges", (req, res) => {
  res.json({ badges: BADGE_DEFS.map(({ id, name, icon, description }) => ({ id, name, icon, description })) });
});

module.exports = router;
