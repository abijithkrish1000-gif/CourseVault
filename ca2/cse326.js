const DB_KEY = "coursevault_demo_v1";

const starterData = {
  courses: [
    {id:"c1",name:"Python Programming",code:"CSE101",description:"Lecture notes, practicals, and assignments",emoji:"🐍"},
    {id:"c2",name:"Mathematics",code:"MTH165",description:"Calculus, matrices, and practice sheets",emoji:"📐"},
    {id:"c3",name:"Computer Networks",code:"CSE204",description:"Networking lectures and lab resources",emoji:"🌐"},
    {id:"c4",name:"Digital Electronics",code:"ECE110",description:"Logic gates, circuits, and reference notes",emoji:"⚡"}
  ],
  files: [
    {id:"f1",courseId:"c1",name:"Python_Unit_1.pdf",size:1240000,type:"PDF",archived:false,active:2,versions:[
      {number:1,date:"2026-10-20T10:00:00",notes:"Initial lecture notes"},
      {number:2,date:"2026-10-25T12:00:00",notes:"Added examples and practice questions"}
    ]},
    {id:"f2",courseId:"c2",name:"Matrices_Notes.pdf",size:860000,type:"PDF",archived:false,active:1,versions:[
      {number:1,date:"2026-10-24T09:30:00",notes:"First approved version"}
    ]},
    {id:"f3",courseId:"c3",name:"OSI_Model.pptx",size:2450000,type:"PPTX",archived:false,active:2,versions:[
      {number:1,date:"2026-10-18T11:00:00",notes:"Draft slides"},
      {number:2,date:"2026-10-26T14:15:00",notes:"Updated protocol diagrams"}
    ]},
    {id:"f4",courseId:"c4",name:"Logic_Gates.pdf",size:740000,type:"PDF",archived:true,active:1,versions:[
      {number:1,date:"2026-10-17T08:30:00",notes:"Reference sheet"}
    ]}
  ],
  activity: [
    {text:"Updated Python_Unit_1.pdf to version 2",date:"2026-10-25T12:00:00"},
    {text:"Added OSI_Model.pptx version 2",date:"2026-10-26T14:15:00"},
    {text:"Archived Logic_Gates.pdf",date:"2026-10-26T15:00:00"}
  ]
};

let data;
try {
  const saved = localStorage.getItem(DB_KEY);
  data = saved ? JSON.parse(saved) : structuredClone(starterData);
} catch (e) {
  data = structuredClone(starterData);
}

let currentPage = "dashboard";
let selectedCourse = "";
let toastTimer;

function save() {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(data));
  } catch (e) {
    notify("Browser storage is full. Try using smaller files.");
  }
}

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
  })[c]);
}

function courseById(id) {
  return data.courses.find(c => c.id === id);
}

function activeVersion(file) {
  return file.versions.find(v => v.number === file.active) || file.versions[file.versions.length - 1];
}

function dateText(value) {
  return new Date(value).toLocaleString([], {
    year:"numeric", month:"short", day:"numeric",
    hour:"2-digit", minute:"2-digit"
  });
}

function fileSize(bytes) {
  if (!bytes) return "0 B";
  return bytes < 1024 * 1024
    ? (bytes / 1024).toFixed(0) + " KB"
    : (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function logActivity(text) {
  data.activity.unshift({text, date:new Date().toISOString()});
  data.activity = data.activity.slice(0, 100);
}

function notify(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.add("hidden"), 2800);
}

function canEdit() {
  return document.getElementById("roleSelect").value !== "Viewer";
}

function isAdmin() {
  return document.getElementById("roleSelect").value === "Admin";
}

function requireEdit() {
  if (!canEdit()) {
    notify("Viewer access: changes are disabled.");
    return false;
  }
  return true;
}

function requireAdmin() {
  if (!isAdmin()) {
    notify("Only the Admin demo role can do this.");
    return false;
  }
  return true;
}

function showPage(page) {
  currentPage = page;
  document.querySelectorAll(".nav").forEach(n =>
    n.classList.toggle("active", n.dataset.page === page)
  );

  document.querySelectorAll(".content > section").forEach(s => s.classList.add("hidden"));
  document.getElementById(page + "Page").classList.remove("hidden");

  renderAll();
  window.scrollTo({top:0,behavior:"smooth"});
}

document.querySelectorAll(".nav").forEach(n => {
  n.addEventListener("click", () => showPage(n.dataset.page));
});

document.getElementById("roleSelect").addEventListener("change", () => {
  document.getElementById("avatar").textContent =
    document.getElementById("roleSelect").value[0];
  renderAll();
  notify("Previewing " + document.getElementById("roleSelect").value + " permissions.");
});

function renderAll() {
  const nonArchived = data.files.filter(f => !f.archived);

  document.getElementById("statCourses").textContent = data.courses.length;
  document.getElementById("statFiles").textContent = nonArchived.length;
  document.getElementById("statVersions").textContent =
    data.files.reduce((sum, f) => sum + f.versions.length, 0);
  document.getElementById("statArchived").textContent =
    data.files.filter(f => f.archived).length;

  renderCourseGrid("dashboardCourses", true);
  renderCourseGrid("allCourses", false);
  renderRecentFiles();
  renderActivity("recentActivity", 5);
  renderMaterials();
  renderArchive();
  renderActivity("activityList");
  renderPermissions();
  updateCourseOptions();
}

function renderCourseGrid(targetId, limit) {
  const target = document.getElementById(targetId);
  let courses = data.courses;
  if (limit) courses = courses.slice(0, 4);

  if (!courses.length) {
    target.innerHTML = '<div class="empty">No course folders yet. Create your first course.</div>';
    return;
  }

  target.innerHTML = courses.map(c => {
    const files = data.files.filter(f => f.courseId === c.id && !f.archived);
    const versions = files.reduce((sum, f) => sum + f.versions.length, 0);

    return `<div class="course" onclick="openCourseMaterials('${c.id}')">
      <div class="course-emoji">${esc(c.emoji || "📚")}</div>
      <h3>${esc(c.name)}</h3>
      <p>${esc(c.description || "Teaching resources")}</p>
      <div class="course-bottom">
        <span>${esc(c.code || "No course code")}</span>
        <span>${files.length} files · ${versions} versions</span>
      </div>
    </div>`;
  }).join("");
}

function openCourseMaterials(id) {
  selectedCourse = id;
  showPage("materials");
  document.getElementById("courseFilter").value = id;
  renderMaterials();
}

function renderRecentFiles() {
  const files = data.files
    .filter(f => !f.archived)
    .sort((a,b) => new Date(activeVersion(b).date) - new Date(activeVersion(a).date))
    .slice(0,5);

  document.getElementById("recentFiles").innerHTML = files.length
    ? files.map(fileRow).join("")
    : '<div class="empty">No materials uploaded yet.</div>';
}

function fileRow(file) {
  const course = courseById(file.courseId);
  const version = activeVersion(file);
  const role = document.getElementById("roleSelect").value;

  return `<div class="file-row">
    <div class="file-icon">${esc(file.type || "FILE")}</div>
    <div class="file-info">
      <strong>${esc(file.name)}</strong>
      <small>${esc(course ? course.name : "Unknown course")} · ${fileSize(file.size)} · ${dateText(version.date)}</small>
      <small>Active version: v${file.active} · ${esc(version.notes || "No change notes")}</small>
    </div>
    <div class="file-actions">
      <span class="badge">${file.archived ? "Archived" : "● Active v" + file.active}</span>
      <button class="btn btn-small" onclick="showHistory('${file.id}')">History</button>
      ${file.archived
        ? `<button class="btn btn-small" onclick="restoreFile('${file.id}')">Restore</button>`
        : `<button class="btn btn-small" onclick="openUpload('${file.id}')" ${role === "Viewer" ? "disabled" : ""}>New version</button>`}
      ${!file.archived && currentPage === "materials"
        ? `<button class="btn btn-small btn-danger" onclick="archiveFile('${file.id}')" ${role === "Viewer" ? "disabled" : ""}>Archive</button>`
        : ""}
    </div>
  </div>`;
}

function renderMaterials() {
  const target = document.getElementById("materialsList");
  if (!target) return;

  const query = (document.getElementById("searchInput")?.value || "").toLowerCase().trim();
  const courseId = document.getElementById("courseFilter")?.value || "";
  const status = document.getElementById("statusFilter")?.value || "active";

  const files = data.files.filter(f => {
    const course = courseById(f.courseId);
    const matchesQuery = [f.name, course?.name, course?.code,
      ...f.versions.map(v => v.notes)].join(" ").toLowerCase().includes(query);
    const matchesCourse = !courseId || f.courseId === courseId;
    const matchesStatus = status === "all" ||
      (status === "archived" ? f.archived : !f.archived);

    return matchesQuery && matchesCourse && matchesStatus;
  }).sort((a,b) => a.name.localeCompare(b.name));

  target.innerHTML = files.length
    ? files.map(fileRow).join("")
    : '<div class="empty">No matching materials found.</div>';
}

function renderArchive() {
  const files = data.files.filter(f => f.archived);
  document.getElementById("archiveList").innerHTML = files.length
    ? files.map(fileRow).join("")
    : '<div class="empty">Your archive is empty.</div>';
}

function renderActivity(targetId, limit) {
  const target = document.getElementById(targetId);
  if (!target) return;

  const entries = limit ? data.activity.slice(0,limit) : data.activity;
  target.innerHTML = entries.length
    ? entries.map(a => `<div class="activity">
        <div class="activity-dot"></div>
        <div><p>${esc(a.text)}</p><small>${dateText(a.date)}</small></div>
      </div>`).join("")
    : '<div class="empty">No activity recorded yet.</div>';
}

function updateCourseOptions() {
  const filter = document.getElementById("courseFilter");
  const upload = document.getElementById("uploadCourse");

  const previousFilter = filter.value;
  const previousUpload = upload.value;

  filter.innerHTML = '<option value="">All courses</option>' +
    data.courses.map(c => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join("");

  upload.innerHTML = data.courses.map(c =>
    `<option value="${esc(c.id)}">${esc(c.name)}</option>`
  ).join("");

  if (data.courses.some(c => c.id === previousFilter)) filter.value = previousFilter;
  else if (data.courses.some(c => c.id === selectedCourse)) filter.value = selectedCourse;

  if (data.courses.some(c => c.id === previousUpload)) upload.value = previousUpload;
}

function openModal(id) {
  document.getElementById(id).classList.remove("hidden");
}

function closeModal(id) {
  document.getElementById(id).classList.add("hidden");
}

function openUpload(fileId) {
  if (!requireEdit()) return;
  if (!data.courses.length) {
    notify("Create a course folder before uploading.");
    return;
  }

  const form = document.getElementById("uploadForm");
  form.reset();
  updateCourseOptions();

  if (fileId) {
    const file = data.files.find(f => f.id === fileId);
    if (!file) return;
    document.getElementById("uploadCourse").value = file.courseId;
    document.getElementById("uploadNotes").value = "";
    document.getElementById("makeActive").checked = true;
    form.dataset.existingFile = fileId;
  } else {
    delete form.dataset.existingFile;
    if (selectedCourse) document.getElementById("uploadCourse").value = selectedCourse;
  }

  openModal("uploadModal");
}

document.getElementById("uploadForm").addEventListener("submit", event => {
  event.preventDefault();
  if (!requireEdit()) return;

  const input = document.getElementById("fileInput");
  const selectedFile = input.files[0];
  if (!selectedFile) return;

  const courseId = document.getElementById("uploadCourse").value;
  const notes = document.getElementById("uploadNotes").value.trim() || "No change notes provided";
  const makeActive = document.getElementById("makeActive").checked;
  const existingId = event.currentTarget.dataset.existingFile;

  let file = existingId
    ? data.files.find(f => f.id === existingId)
    : data.files.find(f =>
        !f.archived &&
        f.courseId === courseId &&
        f.name.toLowerCase() === selectedFile.name.toLowerCase()
      );

  if (file && file.courseId !== courseId) {
    notify("This filename already belongs to another course. Choose another file name.");
    return;
  }

  const isNew = !file;

  if (!file) {
    file = {
      id:"f" + Date.now() + Math.random().toString(16).slice(2,6),
      courseId,
      name:selectedFile.name,
      size:selectedFile.size,
      type:(selectedFile.name.split(".").pop() || "FILE").toUpperCase().slice(0,6),
      archived:false,
      active:0,
      versions:[]
    };
    data.files.push(file);
  }

  const number = file.versions.length
    ? Math.max(...file.versions.map(v => v.number)) + 1
    : 1;

  file.size = selectedFile.size;
  file.type = (selectedFile.name.split(".").pop() || "FILE").toUpperCase().slice(0,6);
  file.archived = false;
  file.versions.push({
    number,
    date:new Date().toISOString(),
    notes
  });

  if (makeActive || !file.active) file.active = number;

  logActivity(`${isNew ? "Uploaded" : "Added version " + number + " of"} ${file.name}${makeActive ? " and marked v" + number + " active" : ""}`);

  save();
  closeModal("uploadModal");
  renderAll();
  notify("Version saved successfully.");
});

function openCourse() {
  if (!requireEdit()) return;
  document.getElementById("courseForm").reset();
  openModal("courseModal");
}

document.getElementById("courseForm").addEventListener("submit", event => {
  event.preventDefault();
  if (!requireEdit()) return;

  const name = document.getElementById("courseName").value.trim();
  const code = document.getElementById("courseCode").value.trim();

  if (data.courses.some(c => c.name.toLowerCase() === name.toLowerCase())) {
    notify("A course with this name already exists.");
    return;
  }

  data.courses.push({
    id:"c" + Date.now(),
    name,
    code,
    description:document.getElementById("courseDescription").value.trim(),
    emoji:"📚"
  });

  logActivity("Created course folder: " + name);
  save();
  closeModal("courseModal");
  renderAll();
  notify("Course folder created.");
});

function showHistory(fileId) {
  const file = data.files.find(f => f.id === fileId);
  if (!file) return;

  document.getElementById("historyTitle").textContent = file.name + " · Versions";

  const history = [...file.versions].sort((a,b) => b.number - a.number);

  document.getElementById("historyContent").innerHTML = history.map(v => `
    <div class="history-item">
      <div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap">
        <strong>Version ${v.number}</strong>
        ${file.active === v.number
          ? '<span class="badge">● Active version</span>'
          : '<span class="badge neutral">Previous version</span>'}
      </div>
      <p>${esc(v.notes || "No change notes")}</p>
      <small>${dateText(v.date)}</small>
      <div style="margin-top:10px;display:flex;gap:7px;flex-wrap:wrap">
        ${file.active !== v.number && !file.archived && canEdit()
          ? `<button class="btn btn-small" onclick="setActive('${file.id}',${v.number})">Make active</button>`
          : ""}
      </div>
    </div>`).join("");

  openModal("historyModal");
}

function setActive(fileId, versionNumber) {
  if (!requireEdit()) return;
  const file = data.files.find(f => f.id === fileId);
  if (!file || !file.versions.some(v => v.number === versionNumber)) return;

  file.active = versionNumber;
  logActivity(`Marked ${file.name} version ${versionNumber} as active`);
  save();
  renderAll();
  showHistory(fileId);
  notify("Active version updated.");
}

function archiveFile(fileId) {
  if (!requireEdit()) return;
  const file = data.files.find(f => f.id === fileId);
  if (!file || file.archived) return;

  if (!confirm(`Archive "${file.name}"? You can restore it later.`)) return;

  file.archived = true;
  logActivity("Archived " + file.name);
  save();
  renderAll();
  notify("Material archived.");
}

function restoreFile(fileId) {
  if (!requireEdit()) return;
  const file = data.files.find(f => f.id === fileId);
  if (!file || !file.archived) return;

  file.archived = false;
  logActivity("Restored " + file.name);
  save();
  renderAll();
  notify("Material restored.");
}

function renderPermissions() {
  const role = document.getElementById("roleSelect").value;

  const permissions = [
    ["View course folders", true, "All roles"],
    ["Search and view materials", true, "All roles"],
    ["View version history", true, "All roles"],
    ["Upload new versions", role !== "Viewer", "Editor and Admin"],
    ["Mark active versions", role !== "Viewer", "Editor and Admin"],
    ["Archive and restore", role !== "Viewer", "Editor and Admin"],
    ["Create course folders", role !== "Viewer", "Editor and Admin"],
    ["Manage workspace roles", role === "Admin", "Admin only"]
  ];

  document.getElementById("permissionList").innerHTML = `
    <div class="activity">
      <div class="activity-dot"></div>
      <div><p><strong>Current preview role: ${esc(role)}</strong></p>
      <small>This is a client-side demo role, not a verified user identity.</small></div>
    </div>
    ${permissions.map(([name,allowed,who]) => `
      <div class="file-row">
        <div class="file-info"><strong>${esc(name)}</strong><small>${esc(who)}</small></div>
        <span class="badge ${allowed ? "" : "archived"}">${allowed ? "Allowed" : "Restricted"}</span>
      </div>`).join("")}
    <div style="margin-top:20px">
      <h3>Role descriptions</h3>
      <p class="subtitle"><strong>Admin:</strong> Full demo access.</p>
      <p class="subtitle"><strong>Editor:</strong> Manage teaching materials and versions.</p>
      <p class="subtitle"><strong>Viewer:</strong> Browse files and view version history.</p>
    </div>`;
}

document.querySelectorAll(".modal").forEach(modal => {
  modal.addEventListener("click", event => {
    if (event.target === modal) modal.classList.add("hidden");
  });
});

renderAll();
