const express = require("express");
const crypto = require("crypto");
const { load, save } = require("../dataStore");

const router = express.Router();

// POST /api/students/login { name, className, sectionName }
// No password — lightweight identity for 11-14 year olds, per confirmed spec.
// Creates the student on first login, reuses on repeat logins (matched by name+class+section).
router.post("/students/login", (req, res) => {
  const { name, className, sectionName } = req.body || {};
  if (!name || !className || !sectionName) {
    return res.status(400).json({ error: "name, className and sectionName are required" });
  }

  const data = load();
  const section = data.sections.find(
    (s) => s.className.toLowerCase() === String(className).toLowerCase() &&
           s.sectionName.toLowerCase() === String(sectionName).toLowerCase()
  );
  if (!section) {
    return res.status(404).json({ error: "No matching class/section found" });
  }

  let student = data.students.find(
    (s) => s.name.toLowerCase() === String(name).toLowerCase() && s.sectionId === section.id
  );

  if (!student) {
    student = {
      id: `stu-${crypto.randomUUID()}`,
      name,
      sectionId: section.id,
      xp: 0,
      badges: [],
      certifications: [],
      completedModules: [],
      streak: { current: 0, longest: 0, lastActiveDate: null },
    };
    data.students.push(student);
    save(data);
  }

  res.json({ student, section });
});

// GET /api/sections -> for the login form dropdowns
router.get("/sections", (req, res) => {
  const data = load();
  res.json({ sections: data.sections });
});

// GET /api/students/leaderboard?studentId=... -> top 10 XP within the student's
// own section (a leaderboard across sections wouldn't be a fair comparison
// since different sections can be on different weeks).
router.get("/students/leaderboard", (req, res) => {
  const { studentId } = req.query;
  const data = load();
  const student = data.students.find((s) => s.id === studentId);
  if (!student) return res.status(404).json({ error: "Student not found" });

  const leaderboard = data.students
    .filter((s) => s.sectionId === student.sectionId)
    .map((s) => ({ id: s.id, name: s.name, xp: s.xp }))
    .sort((a, b) => b.xp - a.xp)
    .slice(0, 10);

  res.json({ leaderboard });
});

module.exports = router;
