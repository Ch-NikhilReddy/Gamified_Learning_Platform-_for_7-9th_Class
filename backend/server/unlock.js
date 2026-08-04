/**
 * Server-side authoritative unlock rule:
 *   Student can access Module X if:
 *     Section.currentWeek >= Module.weekNumber
 *     AND Module.status === "published"   (Unit 1 modules bypass this — always published)
 *     AND the previous module in sequence is marked complete for this student
 */

function isUnit1(moduleId) {
  return moduleId.startsWith("u1-");
}

function effectiveStatus(moduleId, moduleDefaultStatus, overrides) {
  if (isUnit1(moduleId)) return "published";
  const override = overrides[moduleId];
  return override ? override.status : moduleDefaultStatus;
}

function effectiveWeek(moduleId, moduleDefaultWeek, overrides) {
  const override = overrides[moduleId];
  return override ? override.weekNumber : moduleDefaultWeek;
}

/**
 * Flattens the course into an ordered list of modules and computes
 * lock state for a given student + section.
 */
function computeUnlockedMap(course, section, student, overrides) {
  const flat = [];
  for (const unit of course) {
    for (const lesson of unit.lessons) {
      for (const module of lesson.modules) {
        flat.push({ ...module, unitTitle: unit.title, lessonTitle: lesson.title });
      }
    }
  }

  const completedSet = new Set((student && student.completedModules) || []);
  const result = {};
  let previousComplete = true; // first module has no predecessor

  for (const module of flat) {
    const status = effectiveStatus(module.id, module.status, overrides);
    const weekNumber = effectiveWeek(module.id, module.weekNumber, overrides);
    const weekOk = section ? section.currentWeek >= weekNumber : false;
    const published = status === "published";
    const unlocked = weekOk && published && previousComplete;

    result[module.id] = {
      unlocked,
      complete: completedSet.has(module.id),
      status,
      weekNumber,
    };

    previousComplete = completedSet.has(module.id);
  }

  return result;
}

module.exports = { computeUnlockedMap };
