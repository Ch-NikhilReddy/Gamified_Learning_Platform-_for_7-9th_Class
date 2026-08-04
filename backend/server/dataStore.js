const fs = require("fs");
const path = require("path");
const { getAllModules } = require("./courseData");

const DATA_FILE = path.join(__dirname, "data", "data.json");

function defaultData() {
  return {
    students: [],
    sections: [
      { id: "sec-a", className: "Class 7", sectionName: "A", currentWeek: 1 },
      { id: "sec-b", className: "Class 7", sectionName: "B", currentWeek: 1 },
    ],
    teachers: [
      { id: "teacher-1", name: "Admin", sections: ["sec-a", "sec-b"] },
    ],
    // module publish/week overrides, keyed by module id — seeded from courseData
    moduleOverrides: getAllModules().reduce((acc, m) => {
      acc[m.id] = { status: m.status, weekNumber: m.weekNumber };
      return acc;
    }, {}),
    // teacher-edited quiz content ({ questions, passingScore }), keyed by module id.
    // Absent entry = falls back to the courseData default (or "not written yet").
    quizOverrides: {},
    // teacher-edited drag-and-drop content ({ mode, zones, items, passingScore }), keyed by module id.
    dragdropOverrides: {},
    // teacher-edited code challenge content ({ instructions, starterHtml, starterCss, checks, passingScore }), keyed by module id.
    codeOverrides: {},
    // teacher-edited plain lesson text ({ body }), keyed by module id.
    contentOverrides: {},
  };
}

function load() {
  if (!fs.existsSync(DATA_FILE)) {
    save(defaultData());
  }
  const raw = fs.readFileSync(DATA_FILE, "utf-8");
  const data = JSON.parse(raw);
  // backfill fields for data.json written before this override existed
  if (!data.quizOverrides) data.quizOverrides = {};
  if (!data.dragdropOverrides) data.dragdropOverrides = {};
  if (!data.codeOverrides) data.codeOverrides = {};
  if (!data.contentOverrides) data.contentOverrides = {};
  for (const student of data.students) {
    if (!student.streak) student.streak = { current: 0, longest: 0, lastActiveDate: null };
  }
  return data;
}

function save(data) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
}

module.exports = { load, save, DATA_FILE };
