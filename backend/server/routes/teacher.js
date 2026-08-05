const express = require("express");
const { COURSE, getAllModules, findModuleById } = require("../courseData");
const { load, save } = require("../dataStore");
const { CHECK_TYPES } = require("../codeChecks");
const { BADGE_DEFS } = require("../badges");

const router = express.Router();

function validateContentPayload(body) {
  const { body: text } = body || {};
  if (typeof text !== "string" || !text.trim()) {
    return { error: "body text is required" };
  }
  return { value: { body: text.trim() } };
}

function validateQuizPayload(body) {
  const { questions, passingScore } = body || {};

  if (!Array.isArray(questions) || questions.length === 0) {
    return { error: "questions must be a non-empty array" };
  }

  for (const [i, q] of questions.entries()) {
    if (!q || typeof q.question !== "string" || !q.question.trim()) {
      return { error: `Question ${i + 1}: question text is required` };
    }
    if (!Array.isArray(q.options) || q.options.length < 2) {
      return { error: `Question ${i + 1}: at least 2 options are required` };
    }
    if (q.options.some((o) => typeof o !== "string" || !o.trim())) {
      return { error: `Question ${i + 1}: options cannot be empty` };
    }
    if (!Number.isInteger(q.correctIndex) || q.correctIndex < 0 || q.correctIndex >= q.options.length) {
      return { error: `Question ${i + 1}: correctIndex must point at one of the options` };
    }
  }

  if (passingScore !== undefined && (!Number.isInteger(passingScore) || passingScore < 0 || passingScore > 100)) {
    return { error: "passingScore must be an integer between 0 and 100" };
  }

  return {
    value: {
      passingScore: passingScore !== undefined ? passingScore : 70,
      questions: questions.map((q, i) => ({
        id: `q${i + 1}`,
        question: q.question.trim(),
        options: q.options.map((o) => o.trim()),
        correctIndex: q.correctIndex,
      })),
    },
  };
}

// Zones and items reference each other by array index (correctZoneIndex),
// mirroring the quiz engine's correctIndex-into-options pattern — no id
// bookkeeping needed in the editor UI.
function validateDragdropPayload(body) {
  const { mode, zones, items, passingScore } = body || {};

  if (!["sort", "sequence"].includes(mode)) {
    return { error: "mode must be 'sort' or 'sequence'" };
  }
  if (!Array.isArray(zones) || zones.length < 2) {
    return { error: "at least 2 zones are required" };
  }
  if (zones.some((z) => !z || typeof z.label !== "string" || !z.label.trim())) {
    return { error: "every zone needs a label" };
  }
  if (!Array.isArray(items) || items.length === 0) {
    return { error: "items must be a non-empty array" };
  }

  for (const [i, item] of items.entries()) {
    if (!item || typeof item.label !== "string" || !item.label.trim()) {
      return { error: `Item ${i + 1}: label is required` };
    }
    if (!Number.isInteger(item.correctZoneIndex) || item.correctZoneIndex < 0 || item.correctZoneIndex >= zones.length) {
      return { error: `Item ${i + 1}: correctZoneIndex must point at one of the zones` };
    }
  }

  if (passingScore !== undefined && (!Number.isInteger(passingScore) || passingScore < 0 || passingScore > 100)) {
    return { error: "passingScore must be an integer between 0 and 100" };
  }

  return {
    value: {
      mode,
      passingScore: passingScore !== undefined ? passingScore : 80,
      zones: zones.map((z) => ({ label: z.label.trim() })),
      items: items.map((item, i) => ({
        id: `i${i + 1}`,
        label: item.label.trim(),
        correctZoneIndex: item.correctZoneIndex,
      })),
    },
  };
}

function validateCheckPayload(check, i) {
  if (!check || !CHECK_TYPES.includes(check.type)) {
    return `Check ${i + 1}: type must be one of ${CHECK_TYPES.join(", ")}`;
  }
  if (typeof check.description !== "string" || !check.description.trim()) {
    return `Check ${i + 1}: description is required (shown to the student as a requirement)`;
  }

  switch (check.type) {
    case "contains":
      if (typeof check.text !== "string" || !check.text.trim()) return `Check ${i + 1}: text is required`;
      if (!["html", "css"].includes(check.source)) return `Check ${i + 1}: source must be 'html' or 'css'`;
      break;
    case "hasTag":
      if (typeof check.tag !== "string" || !check.tag.trim()) return `Check ${i + 1}: tag is required`;
      break;
    case "hasTagWithText":
      if (typeof check.tag !== "string" || !check.tag.trim()) return `Check ${i + 1}: tag is required`;
      if (typeof check.text !== "string" || !check.text.trim()) return `Check ${i + 1}: text is required`;
      break;
    case "hasAttribute":
      if (typeof check.tag !== "string" || !check.tag.trim()) return `Check ${i + 1}: tag is required`;
      if (typeof check.attribute !== "string" || !check.attribute.trim()) return `Check ${i + 1}: attribute is required`;
      break;
    case "cssHasSelector":
      if (typeof check.selector !== "string" || !check.selector.trim()) return `Check ${i + 1}: selector is required`;
      break;
    case "cssHasProperty":
      if (typeof check.selector !== "string" || !check.selector.trim()) return `Check ${i + 1}: selector is required`;
      if (typeof check.property !== "string" || !check.property.trim()) return `Check ${i + 1}: property is required`;
      break;
  }
  return null;
}

function validateCodePayload(body) {
  const { instructions, starterHtml, starterCss, checks, passingScore } = body || {};

  if (typeof instructions !== "string" || !instructions.trim()) {
    return { error: "instructions are required" };
  }
  if (!Array.isArray(checks) || checks.length === 0) {
    return { error: "checks must be a non-empty array" };
  }
  for (const [i, check] of checks.entries()) {
    const err = validateCheckPayload(check, i);
    if (err) return { error: err };
  }
  if (passingScore !== undefined && (!Number.isInteger(passingScore) || passingScore < 0 || passingScore > 100)) {
    return { error: "passingScore must be an integer between 0 and 100" };
  }

  return {
    value: {
      instructions: instructions.trim(),
      starterHtml: typeof starterHtml === "string" ? starterHtml : "",
      starterCss: typeof starterCss === "string" ? starterCss : "",
      passingScore: passingScore !== undefined ? passingScore : 100,
      checks: checks.map((check, i) => ({ ...check, id: `c${i + 1}`, description: check.description.trim() })),
    },
  };
}

// POST /api/teacher/login { name }
// MVP decision: teacher accounts are pre-seeded (see dataStore defaultData),
// matched by name only — no password. Flag to teacher: revisit before any
// multi-teacher / public deployment.
router.post("/teacher/login", (req, res) => {
  const { name } = req.body || {};
  const data = load();
  const teacher = data.teachers.find((t) => t.name.toLowerCase() === String(name || "").toLowerCase());
  if (!teacher) return res.status(404).json({ error: "Teacher not found" });
  res.json({ teacher });
});

// GET /api/teacher/roster?teacherId=...
// Live dashboard data: per-student xp, badges, certifications, and a simple
// grade derived from % of published-and-reachable modules completed.
router.get("/teacher/roster", (req, res) => {
  const { teacherId } = req.query;
  const data = load();
  const teacher = data.teachers.find((t) => t.id === teacherId);
  if (!teacher) return res.status(404).json({ error: "Teacher not found" });

  const sectionIds = new Set(teacher.sections);
  const sections = data.sections.filter((s) => sectionIds.has(s.id));
  const totalModules = getAllModules().length;

  const badgeNameById = Object.fromEntries(BADGE_DEFS.map((b) => [b.id, `${b.icon} ${b.name}`]));

  const roster = data.students
    .filter((s) => sectionIds.has(s.sectionId))
    .map((student) => {
      const section = data.sections.find((s) => s.id === student.sectionId);
      const grade = totalModules === 0 ? 0 : Math.round((student.completedModules.length / totalModules) * 100);
      return {
        id: student.id,
        name: student.name,
        section: section ? `${section.className} - ${section.sectionName}` : "Unknown",
        xp: student.xp,
        streak: student.streak ? student.streak.current : 0,
        badges: student.badges,
        badgeNames: student.badges.map((id) => badgeNameById[id] || id),
        certifications: student.certifications,
        grade,
      };
    });

  res.json({ sections, roster });
});

// POST /api/teacher/sections { teacherId, className, sectionName, currentWeek }
router.post("/teacher/sections", (req, res) => {
  const { teacherId, className, sectionName, currentWeek = 1 } = req.body || {};
  if (!teacherId || !className || !sectionName) {
    return res.status(400).json({ error: "teacherId, className and sectionName are required" });
  }

  const trimmedClass = String(className).trim();
  const trimmedSection = String(sectionName).trim();
  if (!trimmedClass || !trimmedSection) {
    return res.status(400).json({ error: "className and sectionName cannot be empty" });
  }
  if (!Number.isInteger(currentWeek) || currentWeek < 1) {
    return res.status(400).json({ error: "currentWeek must be a positive integer" });
  }

  const data = load();
  const teacher = data.teachers.find((t) => t.id === teacherId);
  if (!teacher) return res.status(404).json({ error: "Teacher not found" });

  const existing = data.sections.find(
    (s) => s.className.toLowerCase() === trimmedClass.toLowerCase() &&
           s.sectionName.toLowerCase() === trimmedSection.toLowerCase()
  );
  if (existing) {
    return res.status(409).json({ error: "This class and section already exist" });
  }

  let sectionId = `sec-${trimmedClass.replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase()}-${trimmedSection.replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase()}`;
  sectionId = sectionId.replace(/-+/g, "-").replace(/(^-|-$)/g, "");
  while (data.sections.some((s) => s.id === sectionId)) {
    sectionId = `${sectionId}-${Math.random().toString(36).slice(2, 5)}`;
  }

  const section = {
    id: sectionId,
    className: trimmedClass,
    sectionName: trimmedSection,
    currentWeek,
  };
  data.sections.push(section);
  teacher.sections.push(section.id);
  save(data);

  res.status(201).json({ section });
});

// DELETE /api/teacher/sections/:id?teacherId=...
router.delete("/teacher/sections/:id", (req, res) => {
  const { teacherId } = req.query || {};
  const sectionId = req.params.id;
  if (!teacherId) {
    return res.status(400).json({ error: "teacherId is required" });
  }

  const data = load();
  const teacher = data.teachers.find((t) => t.id === teacherId);
  if (!teacher) return res.status(404).json({ error: "Teacher not found" });
  if (!teacher.sections.includes(sectionId)) {
    return res.status(403).json({ error: "You do not have permission to delete this section" });
  }

  const sectionIndex = data.sections.findIndex((s) => s.id === sectionId);
  if (sectionIndex === -1) {
    return res.status(404).json({ error: "Section not found" });
  }

  data.sections.splice(sectionIndex, 1);
  teacher.sections = teacher.sections.filter((id) => id !== sectionId);
  for (const student of data.students) {
    if (student.sectionId === sectionId) {
      student.sectionId = null;
    }
  }

  save(data);
  res.json({ success: true });
});

// PUT /api/teacher/sections/:id/week { currentWeek }
// Unit 1 modules ignore this (always published) per unlock.js.
router.put("/teacher/modules/:id", (req, res) => {
  const { status } = req.body || {};
  if (!["draft", "published"].includes(status)) {
    return res.status(400).json({ error: "status must be 'draft' or 'published'" });
  }
  const data = load();
  const moduleId = req.params.id;
  if (!data.moduleOverrides[moduleId]) {
    return res.status(404).json({ error: "Module not found" });
  }
  data.moduleOverrides[moduleId].status = status;
  save(data);
  res.json({ moduleId, status });
});

// GET /api/teacher/modules -> full module list with current status, for the publish-toggle UI
router.get("/teacher/modules", (req, res) => {
  const data = load();
  const modules = getAllModules().map((m) => ({
    ...m,
    status: data.moduleOverrides[m.id] ? data.moduleOverrides[m.id].status : m.status,
    weekNumber: data.moduleOverrides[m.id] ? data.moduleOverrides[m.id].weekNumber : m.weekNumber,
  }));
  res.json({ modules, units: COURSE.map((u) => ({ id: u.id, title: u.title })) });
});

// GET /api/teacher/quizzes -> all quiz modules with their current (override-resolved)
// content, including correctIndex — this is the admin editing view.
router.get("/teacher/quizzes", (req, res) => {
  const data = load();
  const unitTitleById = Object.fromEntries(COURSE.map((u) => [u.id, u.title]));

  const quizzes = getAllModules()
    .filter((m) => m.type === "quiz")
    .map((m) => {
      const content = data.quizOverrides[m.id] || m.content;
      return {
        id: m.id,
        unitId: m.unitId,
        unitTitle: unitTitleById[m.unitId],
        lessonTitle: m.content.title,
        passingScore: content.passingScore || 70,
        questions: content.questions || [],
      };
    });

  res.json({ quizzes });
});

// PUT /api/teacher/quizzes/:id { questions, passingScore }
router.put("/teacher/quizzes/:id", (req, res) => {
  const moduleId = req.params.id;
  const module = findModuleById(moduleId);
  if (!module || module.type !== "quiz") {
    return res.status(404).json({ error: "Quiz module not found" });
  }

  const { value, error } = validateQuizPayload(req.body);
  if (error) return res.status(400).json({ error });

  const data = load();
  data.quizOverrides[moduleId] = value;
  save(data);

  res.json({ moduleId, ...value });
});

// GET /api/teacher/dragdrops -> all dragdrop modules with resolved content
// (including correctZoneIndex) — this is the admin editing view.
router.get("/teacher/dragdrops", (req, res) => {
  const data = load();
  const unitTitleById = Object.fromEntries(COURSE.map((u) => [u.id, u.title]));

  const dragdrops = getAllModules()
    .filter((m) => m.type === "dragdrop")
    .map((m) => {
      const content = data.dragdropOverrides[m.id] || m.content;
      return {
        id: m.id,
        unitId: m.unitId,
        unitTitle: unitTitleById[m.unitId],
        lessonTitle: m.content.title,
        mode: content.mode,
        passingScore: content.passingScore || 80,
        zones: content.zones || [],
        items: content.items || [],
      };
    });

  res.json({ dragdrops });
});

// PUT /api/teacher/dragdrops/:id { mode, zones, items, passingScore }
router.put("/teacher/dragdrops/:id", (req, res) => {
  const moduleId = req.params.id;
  const module = findModuleById(moduleId);
  if (!module || module.type !== "dragdrop") {
    return res.status(404).json({ error: "Drag-and-drop module not found" });
  }

  const { value, error } = validateDragdropPayload(req.body);
  if (error) return res.status(400).json({ error });

  const data = load();
  data.dragdropOverrides[moduleId] = value;
  save(data);

  res.json({ moduleId, ...value });
});

// GET /api/teacher/code-challenges -> all code modules with resolved content —
// this is the admin editing view (same content shape the student sees, since
// nothing here is a hidden answer).
router.get("/teacher/code-challenges", (req, res) => {
  const data = load();
  const unitTitleById = Object.fromEntries(COURSE.map((u) => [u.id, u.title]));

  const codeChallenges = getAllModules()
    .filter((m) => m.type === "code")
    .map((m) => {
      const content = data.codeOverrides[m.id] || m.content;
      return {
        id: m.id,
        unitId: m.unitId,
        unitTitle: unitTitleById[m.unitId],
        lessonTitle: m.content.title,
        instructions: content.instructions,
        starterHtml: content.starterHtml || "",
        starterCss: content.starterCss || "",
        passingScore: content.passingScore || 100,
        checks: content.checks || [],
      };
    });

  res.json({ codeChallenges, checkTypes: CHECK_TYPES });
});

// PUT /api/teacher/code-challenges/:id { instructions, starterHtml, starterCss, checks, passingScore }
router.put("/teacher/code-challenges/:id", (req, res) => {
  const moduleId = req.params.id;
  const module = findModuleById(moduleId);
  if (!module || module.type !== "code") {
    return res.status(404).json({ error: "Code challenge module not found" });
  }

  const { value, error } = validateCodePayload(req.body);
  if (error) return res.status(400).json({ error });

  const data = load();
  data.codeOverrides[moduleId] = value;
  save(data);

  res.json({ moduleId, ...value });
});

// GET /api/teacher/content -> all plain "content" modules with resolved body text
router.get("/teacher/content", (req, res) => {
  const data = load();
  const unitTitleById = Object.fromEntries(COURSE.map((u) => [u.id, u.title]));

  const lessons = getAllModules()
    .filter((m) => m.type === "content")
    .map((m) => {
      const content = data.contentOverrides[m.id] || m.content;
      return {
        id: m.id,
        unitId: m.unitId,
        unitTitle: unitTitleById[m.unitId],
        lessonTitle: m.content.title,
        body: content.body,
      };
    });

  res.json({ lessons });
});

// PUT /api/teacher/content/:id { body }
router.put("/teacher/content/:id", (req, res) => {
  const moduleId = req.params.id;
  const module = findModuleById(moduleId);
  if (!module || module.type !== "content") {
    return res.status(404).json({ error: "Content module not found" });
  }

  const { value, error } = validateContentPayload(req.body);
  if (error) return res.status(400).json({ error });

  const data = load();
  data.contentOverrides[moduleId] = value;
  save(data);

  res.json({ moduleId, ...value });
});

module.exports = router;
