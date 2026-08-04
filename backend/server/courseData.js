/**
 * Source of truth for course content structure (Course > Units > Lessons > Modules).
 * Lesson titles come directly from the confirmed PRD (Master Prompt v2).
 * Module `content` bodies are intentionally empty placeholders — the teacher
 * writes/approves real explanations, quiz questions, and challenge wording;
 * do NOT ship fabricated lesson content here.
 *
 * weekNumber defaults to the unit's position in the course (1 unit ~= 1 week).
 * This is a starting default, not a pacing decision — the teacher should
 * adjust per-section currentWeek / per-module weekNumber via the admin UI.
 */

const RAW_UNITS = [
  { title: "Welcome to Computers", lessons: ["Welcome Explorer", "What is a Computer?", "Computer Components", "Hardware vs Software", "Input Devices", "Output Devices", "Unit Challenge"] },
  { title: "How Computers Work", lessons: ["Binary Numbers", "CPU", "Memory", "Storage", "Electricity to Screen", "Computer Quiz"] },
  { title: "Internet Adventure", lessons: ["Internet Basics", "Websites vs Apps", "Browsers", "Search Engines", "How Data Travels", "Internet Safety", "Unit Challenge"] },
  { title: "Programming Logic", lessons: ["What is Programming?", "Algorithms", "Sequence", "Flowcharts", "Pseudocode", "Daily Life Logic", "Challenge"] },
  { title: "Coding Logic", lessons: ["Conditions", "If Else", "Loops", "Nested Logic", "Debug Logic", "Challenge"] },
  { title: "HTML Basics", lessons: ["First Website", "HTML Tags", "Headings", "Paragraphs", "Comments", "Challenge"] },
  { title: "Building Webpages", lessons: ["Images", "Hyperlinks", "Lists", "Tables", "Divisions", "Mini Website"] },
  { title: "Forms", lessons: ["Forms", "Input Fields", "Buttons", "Labels", "Validation", "Registration Page"] },
  { title: "CSS Foundations", lessons: ["Introduction to CSS", "Colors", "Fonts", "Backgrounds", "Borders", "Challenge"] },
  { title: "CSS Layout", lessons: ["Margin", "Padding", "Box Model", "Display", "Flexbox", "Profile Card"] },
  { title: "Debugging Lab", lessons: ["HTML Errors", "CSS Errors", "Broken Layouts", "Console Basics", "Bug Hunt", "Final Debug Challenge"] },
  { title: "Final Project", lessons: ["Planning", "Wireframe", "HTML Development", "CSS Styling", "Testing", "Presentation", "Graduation"] },
];

function slug(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

const QUIZ_TITLE_PATTERN = /challenge|quiz/i;

// Exact-title matches for drag-and-drop lessons: "sort" (items into labeled bins)
// and "sequence" (items into a correct order) are the two reused shapes.
const DRAGDROP_LESSON_MODES = {
  "Hardware vs Software": "sort",
  "Sequence": "sequence",
};

// Units 6-11 are the hands-on HTML/CSS units — every lesson there that isn't a
// quiz/dragdrop gets a live HTML+CSS code editor instead of a plain "content" module.
const CODE_UNIT_ORDERS = new Set([6, 7, 8, 9, 10, 11]);

// Sample quiz for Unit 1's Unit Challenge only, so the course is testable/usable
// out of the box (Unit 1 is auto-published). Straightforward general-knowledge
// questions about computer basics — still teacher-drafted content and should be
// reviewed/edited by the teacher before students rely on it for real.
const SEED_QUIZZES = {
  "u1-l7-m1": {
    passingScore: 70,
    questions: [
      {
        id: "q1",
        question: "Which of these is an example of computer hardware?",
        options: ["A web browser", "A keyboard", "A song file", "A game app"],
        correctIndex: 1,
      },
      {
        id: "q2",
        question: "What do we call instructions that tell a computer what to do?",
        options: ["Hardware", "Software", "Monitor", "Mouse"],
        correctIndex: 1,
      },
      {
        id: "q3",
        question: "Which device is used to display output from a computer?",
        options: ["Keyboard", "Mouse", "Monitor", "Microphone"],
        correctIndex: 2,
      },
    ],
  },
};

// Sample sort activity for Unit 1's "Hardware vs Software" only (same rationale
// as SEED_QUIZZES — Unit 1 is auto-published and must be usable out of the box).
// Teacher-drafted, flagged for review before relied on for real.
// Zones/items reference each other by array index (correctZoneIndex),
// mirroring the quiz engine's correctIndex-into-options pattern.
const SEED_DRAGDROPS = {
  "u1-l4-m1": {
    mode: "sort",
    passingScore: 80,
    zones: [
      { label: "Hardware" }, // index 0
      { label: "Software" }, // index 1
    ],
    items: [
      { id: "i1", label: "Keyboard", correctZoneIndex: 0 },
      { id: "i2", label: "Monitor", correctZoneIndex: 0 },
      { id: "i3", label: "Web Browser", correctZoneIndex: 1 },
      { id: "i4", label: "Video Game App", correctZoneIndex: 1 },
      { id: "i5", label: "Mouse", correctZoneIndex: 0 },
      { id: "i6", label: "Word Processor", correctZoneIndex: 1 },
    ],
  },
};

// Real draft text for Unit 1's plain "content" lessons (Unit 1 is auto-published
// and must be usable out of the box, same rationale as SEED_QUIZZES/SEED_DRAGDROPS).
// AI-drafted for a Grade 6-9 audience — flagged for teacher review before final.
const SEED_CONTENT = {
  "u1-l1-m1": {
    body: "Welcome to 2Carvn Academy! Over the next few months you're going to go from \"what even is a computer\" all the way to building your own webpages with HTML and CSS.\n\nHere's how the course works: each unit is a topic, each topic has a few short lessons, and each lesson ends with a quick activity — a quiz, a sorting game, or (later on) actual code you write yourself. Finish an activity and you earn XP. Finish every lesson in a unit and you get certified in that unit.\n\nYou don't need to know anything about computers to start. That's the whole point of Unit 1 — we're starting from zero. Let's go!",
  },
  "u1-l2-m1": {
    body: "A computer is a machine that takes in information, follows instructions, and produces a result. That's really it — a phone, a laptop, a game console, and even a smartwatch are all computers by that definition.\n\nThe key idea is that a computer doesn't \"think\" on its own. It follows instructions, step by step, exactly as written. Those instructions are called a program, and the people who write them are called programmers — which is what you're starting to become!\n\nComputers are fast and accurate, but they only do what they're told. If the instructions are wrong, the computer will still follow them perfectly and get the wrong result. Remembering that will make debugging a lot less frustrating later in this course.",
  },
  "u1-l3-m1": {
    body: "Every computer, no matter how big or small, is built from a few key parts:\n\n- The CPU (Central Processing Unit) is the \"brain\" — it does the actual thinking, following instructions one at a time, incredibly fast.\n- Memory (RAM) is short-term storage the computer uses while it's working. It's fast, but it forgets everything when the power turns off.\n- Storage (like a hard drive or SSD) is long-term — it keeps your files and programs even after you shut the computer down.\n- Input and output devices are how the computer talks to you and you talk back to it (more on those in the next two lessons).\n\nYou'll see these same four ideas — process, remember-for-now, remember-forever, and communicate — show up again in Unit 2 when we go one level deeper into how computers actually work.",
  },
  "u1-l5-m1": {
    body: "Input devices are how you send information into a computer. Anything you use to give the computer instructions or data counts as input.\n\nCommon examples: a keyboard (typing text), a mouse or trackpad (pointing and clicking), a microphone (recording sound), a touchscreen (tapping and swiping), and a camera (capturing images or video).\n\nA good way to spot an input device: ask \"does this send information TO the computer?\" If yes, it's input.",
  },
  "u1-l6-m1": {
    body: "Output devices are how a computer sends information back out to you — the opposite direction from input.\n\nCommon examples: a monitor or screen (showing images and text), speakers or headphones (playing sound), and a printer (putting words and pictures on paper).\n\nSome devices do both! A touchscreen is input (you tap it) and output (it shows you things) at the same time. Don't worry about memorizing a strict list — focus on the direction information is flowing: into the computer (input) or out of it (output).",
  },
};

function buildCourse() {
  return RAW_UNITS.map((unit, unitIndex) => {
    const unitOrder = unitIndex + 1;
    const unitId = `u${unitOrder}`;
    const isUnit1 = unitOrder === 1;

    return {
      id: unitId,
      title: unit.title,
      order: unitOrder,
      lessons: unit.lessons.map((lessonTitle, lessonIndex) => {
        const lessonOrder = lessonIndex + 1;
        const lessonId = `${unitId}-l${lessonOrder}`;
        const moduleId = `${lessonId}-m1`;
        const isQuiz = QUIZ_TITLE_PATTERN.test(lessonTitle);
        const dragdropMode = DRAGDROP_LESSON_MODES[lessonTitle];
        const isCodeUnit = CODE_UNIT_ORDERS.has(unitOrder);
        const seedQuiz = SEED_QUIZZES[moduleId];
        const seedDragdrop = SEED_DRAGDROPS[moduleId];

        const seedContent = SEED_CONTENT[moduleId];
        let type = "content";
        let content = { title: lessonTitle, body: seedContent ? seedContent.body : null }; // teacher-authored; null = not yet written

        if (isQuiz) {
          type = "quiz";
          content = {
            title: lessonTitle,
            passingScore: seedQuiz ? seedQuiz.passingScore : 70,
            questions: seedQuiz ? seedQuiz.questions : null, // teacher-authored; null = not yet written
          };
        } else if (dragdropMode) {
          type = "dragdrop";
          content = {
            title: lessonTitle,
            mode: dragdropMode,
            passingScore: seedDragdrop ? seedDragdrop.passingScore : 80,
            // teacher-authored; null = zones/items not written yet
            zones: seedDragdrop ? seedDragdrop.zones : null,
            items: seedDragdrop ? seedDragdrop.items : null,
          };
        } else if (isCodeUnit) {
          type = "code";
          content = {
            title: lessonTitle,
            passingScore: 100,
            // teacher-authored; null = not yet written
            instructions: null,
            starterHtml: null,
            starterCss: null,
            checks: null,
          };
        }

        return {
          id: lessonId,
          title: lessonTitle,
          order: lessonOrder,
          modules: [
            {
              id: moduleId,
              unitId,
              lessonId,
              type,
              // Unit 1 auto-published at seed time; everything else starts as draft
              // until the teacher publishes it from the admin dashboard.
              status: isUnit1 ? "published" : "draft",
              weekNumber: unitOrder,
              content,
            },
          ],
        };
      }),
    };
  });
}

const COURSE = buildCourse();

function getAllModules() {
  const modules = [];
  for (const unit of COURSE) {
    for (const lesson of unit.lessons) {
      for (const module of lesson.modules) {
        modules.push(module);
      }
    }
  }
  return modules;
}

function findModuleById(moduleId) {
  return getAllModules().find((m) => m.id === moduleId) || null;
}

module.exports = { COURSE, getAllModules, findModuleById, slug };
