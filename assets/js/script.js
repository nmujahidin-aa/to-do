const STORAGE_TASKS = "risetask_tasks";
const STORAGE_PROFILE = "risetask_profile";
const MAX_TASK_LEN = 200;
const MIN_TASK_LEN = 3;

const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

let tasks = loadData(STORAGE_TASKS, []);
let profile = loadData(STORAGE_PROFILE, null);
let filterDate = "";

const $ = (id) => document.getElementById(id);

const el = {
  avatar: $("avatar"), profileName: $("profileName"), profileRole: $("profileRole"),
  editProfileBtn: $("editProfileBtn"),
  currentDay: $("currentDay"), currentDate: $("currentDate"), currentTime: $("currentTime"),

  taskForm: $("taskForm"), taskInput: $("taskInput"), charCount: $("charCount"),
  dueInput: $("dueInput"),

  filterDate: $("filterDate"), filterInfo: $("filterInfo"),
  todayFilterBtn: $("todayFilterBtn"), clearFilterBtn: $("clearFilterBtn"),
  deleteAllBtn: $("deleteAllBtn"),

  todoList: $("todoList"), overdueList: $("overdueList"), doneList: $("doneList"),
  todoCount: $("todoCount"), overdueCount: $("overdueCount"), doneCount: $("doneCount"),

  profileModal: $("profileModal"), profileForm: $("profileForm"),
  nameInput: $("nameInput"), roleInput: $("roleInput"),
  cancelProfileBtn: $("cancelProfileBtn"),

  toast: $("toast"),
};

function loadData(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveData(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    showToast("Gagal menyimpan data di browser", true);
  }
}

function toISODate(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatTanggal(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return `${HARI[date.getDay()]}, ${d} ${BULAN[m - 1]} ${y}`;
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

let toastTimer;
function showToast(message, isError = false) {
  el.toast.textContent = message;
  el.toast.classList.toggle("error", isError);
  el.toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.toast.classList.remove("show"), 2500);
}

function updateClock() {
  const now = new Date();
  el.currentDay.textContent = HARI[now.getDay()];
  el.currentDate.textContent = `${now.getDate()} ${BULAN[now.getMonth()]} ${now.getFullYear()}`;
  el.currentTime.textContent = now.toLocaleTimeString("id-ID", { hour12: false });

  // Kalau hari berganti saat app terbuka, update status overdue
  const today = toISODate(now);
  if (updateClock.lastDay && updateClock.lastDay !== today) render();
  updateClock.lastDay = today;
}

// =========================================================
//                     FORM VALIDATION
// =========================================================

function setFieldState(fieldId, errorId, message) {
  const field = $(fieldId);
  const error = $(errorId);
  error.textContent = message || "";
  field.classList.toggle("invalid", Boolean(message));
  field.classList.toggle("valid", !message);
  return !message;
}

function clearFieldState(fieldId, errorId) {
  $(fieldId).classList.remove("invalid", "valid");
  $(errorId).textContent = "";
}

function validateTask() {
  const value = el.taskInput.value.trim();
  let msg = "";

  if (value === "") {
    msg = "Tugas wajib diisi.";
  } else if (value.length < MIN_TASK_LEN) {
    msg = `Tugas minimal ${MIN_TASK_LEN} karakter.`;
  } else if (value.length > MAX_TASK_LEN) {
    msg = `Tugas maksimal ${MAX_TASK_LEN} karakter.`;
  } else if (!/[a-zA-Z]/.test(value)) {
    msg = "Tugas harus mengandung huruf, bukan hanya angka/simbol.";
  } else if (isDuplicate(value, el.dueInput.value)) {
    msg = "Tugas yang sama sudah ada di tanggal tersebut.";
  }
  return setFieldState("taskField", "taskError", msg);
}

function isDuplicate(text, due) {
  const normalized = text.toLowerCase().replace(/\s+/g, " ");
  return tasks.some((t) =>
    !t.done &&
    t.due === due &&
    t.text.toLowerCase().replace(/\s+/g, " ") === normalized
  );
}

function getPriority() {
  const checked = el.taskForm.querySelector('input[name="priority"]:checked');
  return checked ? checked.value : "";
}

function validatePriority() {
  const msg = getPriority() ? "" : "Pilih salah satu level prioritas.";
  return setFieldState("priorityField", "priorityError", msg);
}

function validateDue() {
  const value = el.dueInput.value;
  let msg = "";

  if (!value) {
    msg = "Tanggal wajib diisi.";
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || isNaN(new Date(value))) {
    msg = "Format tanggal tidak valid.";
  } else if (value < toISODate()) {
    msg = "Tanggal tidak boleh sebelum hari ini.";
  }
  return setFieldState("dueField", "dueError", msg);
}

const NAME_REGEX = /^[A-Za-zÀ-ÿ\s.'-]+$/;

function validateName() {
  const value = el.nameInput.value.trim();
  let msg = "";
  if (value === "") msg = "Nama wajib diisi.";
  else if (value.length < 2) msg = "Nama minimal 2 karakter.";
  else if (!NAME_REGEX.test(value)) msg = "Nama hanya boleh berisi huruf, spasi, titik, atau tanda petik.";
  return setFieldState("nameField", "nameError", msg);
}

function validateRole() {
  const value = el.roleInput.value.trim();
  let msg = "";
  if (value === "") msg = "Jabatan wajib diisi.";
  else if (value.length < 2) msg = "Jabatan minimal 2 karakter.";
  else if (!/[a-zA-Z]/.test(value)) msg = "Jabatan harus mengandung huruf.";
  return setFieldState("roleField", "roleError", msg);
}

// =========================================================
//                        PROFILE
// =========================================================
function renderProfile() {
  if (profile) {
    el.profileName.textContent = profile.name;
    el.profileRole.textContent = profile.role;
    el.avatar.textContent = profile.name
      .split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  } else {
    el.profileName.textContent = "Belum diisi";
    el.profileRole.textContent = "Jabatan belum diisi";
    el.avatar.textContent = "?";
  }
}

function openProfileModal() {
  el.nameInput.value = profile ? profile.name : "";
  el.roleInput.value = profile ? profile.role : "";
  clearFieldState("nameField", "nameError");
  clearFieldState("roleField", "roleError");
  el.cancelProfileBtn.hidden = !profile;
  el.profileModal.hidden = false;
  el.nameInput.focus();
}

function closeProfileModal() {
  el.profileModal.hidden = true;
}

el.profileForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const okName = validateName();
  const okRole = validateRole();
  if (!okName || !okRole) {
    (okName ? el.roleInput : el.nameInput).focus();
    return;
  }

  profile = {
    name: el.nameInput.value.trim().replace(/\s+/g, " "),
    role: el.roleInput.value.trim().replace(/\s+/g, " "),
  };
  saveData(STORAGE_PROFILE, profile);
  renderProfile();
  closeProfileModal();
  showToast(`Halo, ${profile.name.split(" ")[0]}!`);
});

el.nameInput.addEventListener("input", validateName);
el.roleInput.addEventListener("input", validateRole);
el.editProfileBtn.addEventListener("click", openProfileModal);
el.cancelProfileBtn.addEventListener("click", closeProfileModal);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !el.profileModal.hidden && profile) closeProfileModal();
});

// =========================================================
//                     TAMBAH TUGAS
// =========================================================
el.taskForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const okDue = validateDue();
  const okTask = validateTask();
  const okPriority = validatePriority();

  if (!okTask || !okPriority || !okDue) {
    showToast("Periksa kembali form kamu", true);
    if (!okTask) el.taskInput.focus();
    else if (!okPriority) el.taskForm.querySelector('input[name="priority"]').focus();
    else el.dueInput.focus();
    return;
  }

  tasks.push({
    id: generateId(),
    text: el.taskInput.value.trim().replace(/\s+/g, " "),
    priority: getPriority(),
    due: el.dueInput.value,
    createdAt: new Date().toISOString(),
    done: false,
    doneAt: null,
  });
  saveData(STORAGE_TASKS, tasks);

  resetTaskForm();
  render();
  showToast("Tugas berhasil ditambahkan");
});

function resetTaskForm() {
  el.taskForm.reset();
  el.dueInput.value = toISODate(); 
  el.charCount.textContent = "0";
  clearFieldState("taskField", "taskError");
  clearFieldState("priorityField", "priorityError");
  clearFieldState("dueField", "dueError");
}

el.taskInput.addEventListener("input", () => {
  el.charCount.textContent = el.taskInput.value.length;
  validateTask();
});
el.taskForm.querySelectorAll('input[name="priority"]').forEach((radio) =>
  radio.addEventListener("change", validatePriority)
);
el.dueInput.addEventListener("change", () => {
  validateDue();
  if (el.taskInput.value.trim()) validateTask(); // cek ulang duplikat
});

el.taskInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) el.taskForm.requestSubmit();
});

// =========================================================
//                   AKSI PADA TUGAS
// =========================================================
function toggleTask(id) {
  const task = tasks.find((t) => t.id === id);
  if (!task) return;
  task.done = !task.done;
  task.doneAt = task.done ? new Date().toISOString() : null;
  saveData(STORAGE_TASKS, tasks);

  setTimeout(render, 350);
  showToast(task.done ? "Tugas selesai! Mantap" : "Tugas dikembalikan ke To Do");
}

function deleteTask(id, itemEl) {
  const task = tasks.find((t) => t.id === id);
  if (!task) return;
  if (!confirm(`Hapus tugas "${task.text}"?`)) return;

  itemEl.classList.add("removing");
  setTimeout(() => {
    tasks = tasks.filter((t) => t.id !== id);
    saveData(STORAGE_TASKS, tasks);
    render();
    showToast("Tugas dihapus");
  }, 250);
}

el.deleteAllBtn.addEventListener("click", () => {
  if (tasks.length === 0) {
    showToast("Belum ada tugas untuk dihapus", true);
    return;
  }
  if (!confirm(`Yakin ingin menghapus SEMUA (${tasks.length}) tugas? Tindakan ini tidak bisa dibatalkan.`)) return;
  tasks = [];
  saveData(STORAGE_TASKS, tasks);
  render();
  showToast("Semua tugas telah dihapus");
});

// =========================================================
//                        FILTER
// =========================================================
function setFilter(value) {
  filterDate = value;
  el.filterDate.value = value;
  render();
}

el.filterDate.addEventListener("change", () => setFilter(el.filterDate.value));
el.todayFilterBtn.addEventListener("click", () => setFilter(toISODate()));
el.clearFilterBtn.addEventListener("click", () => setFilter(""));

// =========================================================
//                        RENDER
// =========================================================
const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };

function isOverdue(task) {
  return !task.done && task.due < toISODate();
}

function createTaskItem(task) {
  const li = document.createElement("li");
  li.className = `task p-${task.priority}${task.done ? " is-done" : ""}`;

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = task.done;
  checkbox.setAttribute("aria-label", `Tandai "${task.text}" selesai`);
  checkbox.addEventListener("change", () => {
    li.classList.toggle("is-done", checkbox.checked); 
    toggleTask(task.id);
  });

  const body = document.createElement("div");
  body.className = "task-body";

  const text = document.createElement("p");
  text.className = "task-text";
  text.textContent = task.text; 

  const meta = document.createElement("div");
  meta.className = "task-meta";

  const badge = document.createElement("span");
  badge.className = `badge badge-${task.priority}`;
  badge.textContent = task.priority;

  const date = document.createElement("span");
  date.textContent = "📅 " + formatTanggal(task.due);

  meta.append(badge, date);

  if (isOverdue(task)) {
    const late = document.createElement("span");
    late.className = "badge badge-late";
    late.textContent = "Late";
    meta.append(late);
  }

  if (task.done && task.doneAt) {
    const doneAt = document.createElement("span");
    doneAt.textContent = "✔ " + formatTanggal(toISODate(new Date(task.doneAt)));
    meta.append(doneAt);
  }

  body.append(text, meta);

  const delBtn = document.createElement("button");
  delBtn.type = "button";
  delBtn.className = "btn-delete";
  delBtn.innerHTML = "&#10005;";
  delBtn.title = "Hapus tugas";
  delBtn.setAttribute("aria-label", `Hapus tugas "${task.text}"`);
  delBtn.addEventListener("click", () => deleteTask(task.id, li));

  li.append(checkbox, body, delBtn);
  return li;
}

function fillList(listEl, countEl, items, emptyText) {
  listEl.innerHTML = "";
  countEl.textContent = items.length;
  if (items.length === 0) {
    const li = document.createElement("li");
    li.className = "empty";
    li.textContent = emptyText;
    listEl.append(li);
    return;
  }
  items.forEach((t) => listEl.append(createTaskItem(t)));
}

function render() {
  const visible = filterDate ? tasks.filter((t) => t.due === filterDate) : tasks;

  const byDueThenPriority = (a, b) =>
    a.due.localeCompare(b.due) || PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];

  const todo = visible.filter((t) => !t.done && !isOverdue(t)).sort(byDueThenPriority);
  const overdue = visible.filter(isOverdue).sort(byDueThenPriority);
  const done = visible.filter((t) => t.done)
    .sort((a, b) => (b.doneAt || "").localeCompare(a.doneAt || ""));

  fillList(el.todoList, el.todoCount, todo, "Belum ada tugas. Tambahkan di atas!");
  fillList(el.overdueList, el.overdueCount, overdue, "Tidak ada tugas yang terlambat 🎉");
  fillList(el.doneList, el.doneCount, done, "Belum ada tugas yang selesai.");

  el.filterInfo.textContent = filterDate
    ? `Menampilkan tugas untuk ${formatTanggal(filterDate)}`
    : "Menampilkan semua tugas";
  el.deleteAllBtn.disabled = tasks.length === 0;
}

// =========================================================
//                         INIT HEHE
// =========================================================
function init() {
  updateClock();
  setInterval(updateClock, 1000);

  const today = toISODate();
  el.dueInput.value = today;
  el.dueInput.min = today;

  renderProfile();
  render();

  if (!profile) openProfileModal();
}

init();