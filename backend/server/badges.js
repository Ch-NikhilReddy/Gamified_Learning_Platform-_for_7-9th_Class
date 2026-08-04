const { getAllModules } = require("./courseData");

// Requires 2+ engine types feeding completedModules before badges are meaningful
// to award (quiz-whiz/sorter-supreme/code-ninja each need real activity data) —
// that's now true with quiz + dragdrop + code all live.
const BADGE_DEFS = [
  { id: "first-steps", name: "First Steps", icon: "🐾", description: "Complete your first module", check: (s) => s.completedModules.length >= 1 },
  { id: "quiz-whiz", name: "Quiz Whiz", icon: "🧠", description: "Pass 3 quizzes", check: (s, ctx) => ctx.countByType(s, "quiz") >= 3 },
  { id: "sorter-supreme", name: "Sorter Supreme", icon: "🗂️", description: "Complete 3 drag-and-drop activities", check: (s, ctx) => ctx.countByType(s, "dragdrop") >= 3 },
  { id: "code-ninja", name: "Code Ninja", icon: "💻", description: "Pass 3 code challenges", check: (s, ctx) => ctx.countByType(s, "code") >= 3 },
  { id: "unit-1-graduate", name: "Unit 1 Graduate", icon: "🎓", description: "Certify in Unit 1: Welcome to Computers", check: (s) => s.certifications.includes("u1") },
  { id: "on-fire-3", name: "On Fire", icon: "🔥", description: "3-day activity streak", check: (s) => (s.streak ? s.streak.current : 0) >= 3 },
  { id: "unstoppable-7", name: "Unstoppable", icon: "⚡", description: "7-day activity streak", check: (s) => (s.streak ? s.streak.current : 0) >= 7 },
  { id: "century-club", name: "Century Club", icon: "⭐", description: "Earn 100 XP", check: (s) => s.xp >= 100 },
];

function countByType(student, type) {
  const modulesById = countByType._cache || (countByType._cache = Object.fromEntries(getAllModules().map((m) => [m.id, m])));
  return student.completedModules.filter((id) => modulesById[id] && modulesById[id].type === type).length;
}

// Mutates student.badges in place; returns the list of badge ids newly earned
// this call (so callers can surface a "badge earned!" notice).
function evaluateBadges(student) {
  const ctx = { countByType };
  const newlyEarned = [];
  for (const badge of BADGE_DEFS) {
    if (!student.badges.includes(badge.id) && badge.check(student, ctx)) {
      student.badges.push(badge.id);
      newlyEarned.push(badge.id);
    }
  }
  return newlyEarned;
}

// Mutates student.streak in place. One activity per calendar day counts;
// missing a day resets the current streak. Server-local date, which is a
// simplification worth flagging if the class spans multiple timezones.
function updateStreak(student) {
  const today = new Date().toISOString().slice(0, 10);
  if (!student.streak) student.streak = { current: 0, longest: 0, lastActiveDate: null };
  if (student.streak.lastActiveDate === today) return;

  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  student.streak.current = student.streak.lastActiveDate === yesterday ? student.streak.current + 1 : 1;
  student.streak.longest = Math.max(student.streak.longest, student.streak.current);
  student.streak.lastActiveDate = today;
}

module.exports = { BADGE_DEFS, evaluateBadges, updateStreak };
