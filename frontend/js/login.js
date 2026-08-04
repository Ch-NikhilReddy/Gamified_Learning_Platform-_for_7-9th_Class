document.getElementById("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = document.getElementById("name").value.trim();
  const className = document.getElementById("className").value.trim();
  const sectionName = document.getElementById("sectionName").value.trim();
  const errorEl = document.getElementById("login-error");
  errorEl.textContent = "";

  try {
    const { student, section } = await apiPost("/students/login", { name, className, sectionName });
    localStorage.setItem("studentId", student.id);
    localStorage.setItem("studentName", student.name);
    localStorage.setItem("sectionLabel", `${section.className} - ${section.sectionName}`);
    window.location.href = "pages/course-map.html";
  } catch (err) {
    errorEl.textContent = err.message;
  }
});
