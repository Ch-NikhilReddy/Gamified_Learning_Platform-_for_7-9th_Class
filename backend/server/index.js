const express = require("express");
const path = require("path");

const courseRoutes = require("./routes/course");
const studentRoutes = require("./routes/students");
const teacherRoutes = require("./routes/teacher");

const app = express();
const PORT = process.env.PORT || 3000;
const FRONTEND_DIR = path.join(__dirname, "..", "..", "frontend");

app.use(express.json());

app.use("/api", courseRoutes);
app.use("/api", studentRoutes);
app.use("/api", teacherRoutes);

app.use(express.static(FRONTEND_DIR));

app.listen(PORT, () => {
  console.log(`2Carvn Academy running at http://localhost:${PORT}`);
});
