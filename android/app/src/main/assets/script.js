const STORAGE_KEY = "d";
const BOXES = ["iu", "inu", "niu", "ninu", "inbox", "done"];
const FILTERS = {
  all: () => true,
  today: (task) => task.deadline && isSameDay(task.deadline, Date.now()),
  upcoming: (task) => !task.done && task.deadline && task.deadline > Date.now(),
  overdue: (task) => !task.done && task.deadline && task.deadline <= Date.now()
};

let tasks = loadTasks();
let currentFilter = "all";
let searchTerm = "";
let dragTaskId = null;
let openMenuId = null;

const els = {
  body: document.body,
  splash: document.getElementById("splash"),
  notify: document.getElementById("notify"),
  menu: document.getElementById("menu"),
  mobileDateLabel: document.getElementById("mobileDateLabel"),
  mobileBackdrop: document.getElementById("mobileBackdrop"),
  mobileSheet: document.getElementById("mobileSheet"),
  menuToggle: document.getElementById("menuToggle"),
  menuClose: document.getElementById("menuClose"),
  sheetThemeToggle: document.getElementById("sheetThemeToggle"),
  taskInput: document.getElementById("taskInput"),
  deadlineInput: document.getElementById("deadlineInput"),
  boxInput: document.getElementById("boxInput"),
  addBtn: document.getElementById("addBtn"),
  clearDoneBtn: document.getElementById("clearDoneBtn"),
  themeToggle: document.getElementById("themeToggle"),
  searchInput: document.getElementById("searchInput"),
  todayLabel: document.getElementById("todayLabel"),
  activeCount: document.getElementById("activeCount"),
  todayCount: document.getElementById("todayCount"),
  overdueCount: document.getElementById("overdueCount"),
  doneCount: document.getElementById("doneCount")
};

function loadTasks() {
  const raw = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];

  return raw.map((task, index) => ({
    id: task.id || `task-${Date.now()}-${index}-${Math.random().toString(16).slice(2, 6)}`,
    t: task.t || "",
    box: BOXES.includes(task.box) ? task.box : "inbox",
    deadline: task.deadline || null,
    created: task.created || Date.now(),
    completed: task.completed || null,
    done: Boolean(task.done || task.box === "done"),
    alerted: Boolean(task.alerted)
  }));
}

function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function notify(message) {
  const toast = document.createElement("div");
  toast.className = "note";
  toast.textContent = message;
  els.notify.appendChild(toast);

  window.setTimeout(() => {
    toast.remove();
  }, 2800);
}

function formatDateTime(timestamp) {
  return new Date(timestamp).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function formatDuration(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h ${minutes}m left`;
  return `${minutes}m left`;
}

function formatCompletionTime(task) {
  if (!task.completed || !task.created || task.completed < task.created) {
    return "Completed";
  }

  const elapsed = task.completed - task.created;
  const hours = Math.floor(elapsed / 3600000);
  const minutes = Math.floor((elapsed % 3600000) / 60000);
  return `Completed in ${hours}h ${minutes}m`;
}

function isSameDay(a, b) {
  return new Date(a).toDateString() === new Date(b).toDateString();
}

function getTaskState(task) {
  if (task.done) return "done";
  if (!task.deadline) return "normal";

  const diff = task.deadline - Date.now();
  if (diff <= 0) return "overdue";
  if (diff <= 3600000 * 24) return "due-soon";
  return "normal";
}

function getVisibleTasks() {
  const filterFn = FILTERS[currentFilter] || FILTERS.all;

  return tasks
    .filter((task) => filterFn(task))
    .filter((task) => task.t.toLowerCase().includes(searchTerm))
    .sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return a.deadline - b.deadline;
    });
}

function updateHeader() {
  const formatted = new Date().toLocaleDateString([], {
    weekday: "long",
    month: "long",
    day: "numeric"
  });
  els.todayLabel.textContent = formatted;
  if (els.mobileDateLabel) {
    els.mobileDateLabel.textContent = formatted;
  }

  const active = tasks.filter((task) => !task.done).length;
  const dueToday = tasks.filter((task) => !task.done && task.deadline && isSameDay(task.deadline, Date.now())).length;
  const overdue = tasks.filter((task) => !task.done && task.deadline && task.deadline <= Date.now()).length;
  const completed = tasks.filter((task) => task.done).length;

  els.activeCount.textContent = String(active);
  els.todayCount.textContent = String(dueToday);
  els.overdueCount.textContent = String(overdue);
  els.doneCount.textContent = String(completed);
}

function renderEmptyState(container, message) {
  const empty = document.createElement("div");
  empty.className = "empty-state";
  empty.textContent = message;
  container.appendChild(empty);
}

function buildMetaPill(label, className = "") {
  const pill = document.createElement("span");
  pill.className = `meta-pill ${className}`.trim();
  pill.textContent = label;
  return pill;
}

function getInitials(text) {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join("") || "T";
}

function getTaskSubtitle(task, taskState) {
  if (task.done) {
    return "Completed and stored in your momentum archive.";
  }

  if (taskState === "overdue") {
    return "This item has crossed its deadline and needs immediate action.";
  }

  if (taskState === "due-soon") {
    return "Deadline approaching soon. Keep this one visible.";
  }

  if (task.deadline) {
    return "Scheduled with a deadline and ready to be prioritized.";
  }

  return "Open-ended task waiting for your next move.";
}

function getProgressWidth(task, taskState) {
  if (task.done) return 100;
  if (taskState === "overdue") return 100;
  if (taskState === "due-soon") return 82;
  if (task.deadline) return 56;
  return 26;
}

function createTaskCard(task) {
  const card = document.createElement("article");
  const taskState = getTaskState(task);
  card.className = `task-card ${taskState === "overdue" ? "task-overdue" : ""} ${taskState === "due-soon" ? "task-due-soon" : ""} ${task.done ? "task-done" : ""}`.trim();
  card.draggable = true;
  card.dataset.id = task.id;

  card.addEventListener("dragstart", () => {
    dragTaskId = task.id;
  });

  card.addEventListener("dragend", () => {
    dragTaskId = null;
  });

  const main = document.createElement("div");
  main.className = "task-main";

  const top = document.createElement("div");
  top.className = "task-top";

  const mark = document.createElement("div");
  mark.className = "task-mark";
  mark.textContent = getInitials(task.t);

  const textWrap = document.createElement("div");

  const title = document.createElement("h4");
  title.className = "task-title";
  title.textContent = task.t;

  const subtitle = document.createElement("p");
  subtitle.className = "task-subtitle";
  subtitle.textContent = getTaskSubtitle(task, taskState);

  const actions = document.createElement("div");
  actions.className = "task-actions";

  const doneBtn = document.createElement("button");
  doneBtn.className = "icon-button primary";
  doneBtn.type = "button";
  doneBtn.textContent = task.done ? "↺" : "✓";
  doneBtn.title = task.done ? "Restore task" : "Complete task";
  doneBtn.addEventListener("click", () => toggleDone(task.id));

  const menuBtn = document.createElement("button");
  menuBtn.className = "icon-button";
  menuBtn.type = "button";
  menuBtn.textContent = "⋯";
  menuBtn.title = "Task options";
  menuBtn.addEventListener("click", (event) => toggleMenu(task.id, event.currentTarget));

  actions.append(doneBtn, menuBtn);
  textWrap.append(title, subtitle);
  top.append(mark, textWrap, actions);

  const meta = document.createElement("div");
  meta.className = "task-meta";
  meta.appendChild(buildMetaPill(labelForBox(task.box)));

  if (task.deadline) {
    if (taskState === "overdue") {
      meta.appendChild(buildMetaPill(`Overdue since ${formatDateTime(task.deadline)}`, "is-danger"));
    } else {
      meta.appendChild(buildMetaPill(`Due ${formatDateTime(task.deadline)}`));
    }
  } else {
    meta.appendChild(buildMetaPill("No deadline"));
  }

  if (task.done) {
    meta.appendChild(buildMetaPill(formatCompletionTime(task), "is-success"));
  }

  const footer = document.createElement("div");
  footer.className = "task-footer";

  const time = document.createElement("span");
  time.className = "task-time";
  time.textContent = buildFooterText(task, taskState);

  const progress = document.createElement("div");
  progress.className = "task-progress";

  const progressFill = document.createElement("span");
  progressFill.style.width = `${getProgressWidth(task, taskState)}%`;
  progress.appendChild(progressFill);

  footer.append(time, progress);
  main.append(top, meta, footer);
  card.appendChild(main);

  return card;
}

function buildFooterText(task, taskState) {
  if (task.done) {
    return `Created ${formatDateTime(task.created)}`;
  }

  if (taskState === "overdue" && task.deadline) {
    return "Needs attention immediately";
  }

  if (task.deadline) {
    return formatDuration(task.deadline - Date.now());
  }

  return `Created ${formatDateTime(task.created)}`;
}

function labelForBox(box) {
  const labels = {
    iu: "Important & Urgent",
    inu: "Important & Not Urgent",
    niu: "Not Important & Urgent",
    ninu: "Not Important & Not Urgent",
    inbox: "Inbox",
    done: "Completed"
  };

  return labels[box] || "Inbox";
}

function render() {
  updateHeader();
  hideMenu();

  BOXES.forEach((box) => {
    const lane = document.getElementById(box);
    lane.innerHTML = "";
  });

  const visibleTasks = getVisibleTasks();
  const visibleIds = new Set(visibleTasks.map((task) => task.id));

  BOXES.forEach((box) => {
    const lane = document.getElementById(box);
    const items = visibleTasks.filter((task) => task.box === box);

    if (items.length === 0) {
      const emptyMessage = visibleIds.size === 0
        ? "No tasks match the current filter."
        : box === "done"
          ? "Completed tasks will appear here."
          : "Drop a task here or add a new one.";
      renderEmptyState(lane, emptyMessage);
    }

    items.forEach((task) => lane.appendChild(createTaskCard(task)));

    const count = tasks.filter((task) => task.box === box).length;
    document.getElementById(`count-${box}`).textContent = String(count);
  });
}

function addTask() {
  const title = els.taskInput.value.trim();
  if (!title) {
    notify("Add a task title first.");
    els.taskInput.focus();
    return;
  }

  const deadlineValue = els.deadlineInput.value;

  tasks.unshift({
    id: `task-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    t: title,
    box: els.boxInput.value,
    deadline: deadlineValue ? new Date(deadlineValue).getTime() : null,
    created: Date.now(),
    completed: null,
    done: false,
    alerted: false
  });

  els.taskInput.value = "";
  els.deadlineInput.value = "";
  els.boxInput.value = "inbox";

  saveTasks();
  render();
  notify("Task added.");
}

function toggleDone(taskId) {
  const task = tasks.find((item) => item.id === taskId);
  if (!task) return;

  if (task.done) {
    task.done = false;
    task.completed = null;
    task.box = "inbox";
  } else {
    task.done = true;
    task.completed = Date.now();
    task.box = "done";
  }

  saveTasks();
  render();
}

function deleteTask(taskId) {
  tasks = tasks.filter((task) => task.id !== taskId);
  saveTasks();
  render();
  notify("Task deleted.");
}

function editTask(taskId) {
  const task = tasks.find((item) => item.id === taskId);
  if (!task) return;

  const nextTitle = window.prompt("Edit task", task.t);
  if (!nextTitle) return;

  task.t = nextTitle.trim() || task.t;
  saveTasks();
  render();
  notify("Task updated.");
}

function moveTask(taskId, targetBox) {
  const task = tasks.find((item) => item.id === taskId);
  if (!task || !BOXES.includes(targetBox)) return;

  task.box = targetBox;
  task.done = targetBox === "done";
  task.completed = targetBox === "done" ? task.completed || Date.now() : null;
  saveTasks();
  render();
}

function toggleMenu(taskId, anchor) {
  if (openMenuId === taskId) {
    hideMenu();
    return;
  }

  openMenuId = taskId;
  els.menu.innerHTML = "";

  const task = tasks.find((item) => item.id === taskId);
  if (!task) return;

  const edit = document.createElement("button");
  edit.className = "menu-item";
  edit.type = "button";
  edit.textContent = "Edit task";
  edit.addEventListener("click", () => {
    editTask(taskId);
    hideMenu();
  });

  const move = document.createElement("button");
  move.className = "menu-item";
  move.type = "button";
  move.textContent = task.box === "inbox" ? "Move to Focus Now" : "Move to Inbox";
  move.addEventListener("click", () => {
    moveTask(taskId, task.box === "inbox" ? "iu" : "inbox");
    hideMenu();
  });

  const remove = document.createElement("button");
  remove.className = "menu-item";
  remove.type = "button";
  remove.textContent = "Delete";
  remove.addEventListener("click", () => {
    deleteTask(taskId);
    hideMenu();
  });

  els.menu.append(edit, move, remove);

  const rect = anchor.getBoundingClientRect();
  els.menu.style.top = `${rect.bottom + 10}px`;
  els.menu.style.left = `${Math.max(14, rect.right - 180)}px`;
  els.menu.classList.remove("hidden");
}

function hideMenu() {
  openMenuId = null;
  els.menu.classList.add("hidden");
}

function scrollToSection(sectionId) {
  const target = document.getElementById(sectionId);
  if (!target) return;
  target.scrollIntoView({ behavior: "smooth", block: "start" });
}

function openMobileMenu() {
  els.body.classList.add("mobile-menu-open");
}

function closeMobileMenu() {
  els.body.classList.remove("mobile-menu-open");
}

function clearCompleted() {
  const doneCount = tasks.filter((task) => task.done).length;
  tasks = tasks.filter((task) => !task.done);
  saveTasks();
  render();

  if (doneCount > 0) {
    notify("Completed tasks cleared.");
  }
}

function checkAlerts() {
  let changed = false;

  tasks.forEach((task) => {
    if (!task.done && task.deadline && task.deadline <= Date.now() && !task.alerted) {
      task.alerted = true;
      changed = true;
      notify(`"${task.t}" is overdue.`);
    }
  });

  if (changed) saveTasks();
}

function bindLanes() {
  BOXES.forEach((box) => {
    const lane = document.getElementById(box);

    lane.addEventListener("dragover", (event) => {
      event.preventDefault();
      lane.classList.add("drag-over");
    });

    lane.addEventListener("dragleave", () => {
      lane.classList.remove("drag-over");
    });

    lane.addEventListener("drop", (event) => {
      event.preventDefault();
      lane.classList.remove("drag-over");
      if (!dragTaskId) return;
      moveTask(dragTaskId, box);
      dragTaskId = null;
    });
  });
}

function setFilter(filter) {
  currentFilter = filter;
  document.querySelectorAll(".filter-chip").forEach((chip) => {
    chip.classList.toggle("active", chip.dataset.filter === filter);
  });
  render();
}

function toggleTheme() {
  els.body.classList.toggle("theme-light");
  els.body.classList.toggle("theme-dark");
  const isLight = els.body.classList.contains("theme-light");
  els.themeToggle.textContent = isLight ? "Dark Mode" : "Light Mode";
  if (els.sheetThemeToggle) {
    els.sheetThemeToggle.textContent = isLight ? "Switch to Dark Mode" : "Switch to Light Mode";
  }
  localStorage.setItem("theme", isLight ? "light" : "dark");
}

function loadTheme() {
  const theme = localStorage.getItem("theme");
  if (theme === "light") {
    els.body.classList.remove("theme-dark");
    els.body.classList.add("theme-light");
    els.themeToggle.textContent = "Dark Mode";
  }
  if (els.sheetThemeToggle) {
    const isLight = els.body.classList.contains("theme-light");
    els.sheetThemeToggle.textContent = isLight ? "Switch to Dark Mode" : "Switch to Light Mode";
  }
}

function revealExperience() {
  window.setTimeout(() => {
    els.body.classList.add("is-ready");
  }, 120);

  window.setTimeout(() => {
    if (els.splash) {
      els.splash.classList.add("hidden");
    }
  }, 850);
}

function tick() {
  render();
  checkAlerts();
}

els.addBtn.addEventListener("click", addTask);
els.clearDoneBtn.addEventListener("click", clearCompleted);
els.themeToggle.addEventListener("click", toggleTheme);
els.sheetThemeToggle?.addEventListener("click", () => {
  toggleTheme();
  closeMobileMenu();
});
els.menuToggle?.addEventListener("click", openMobileMenu);
els.menuClose?.addEventListener("click", closeMobileMenu);
els.mobileBackdrop?.addEventListener("click", closeMobileMenu);
els.searchInput.addEventListener("input", (event) => {
  searchTerm = event.target.value.trim().toLowerCase();
  render();
});

els.taskInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") addTask();
});

els.deadlineInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") addTask();
});

document.querySelectorAll(".filter-chip").forEach((chip) => {
  chip.addEventListener("click", () => setFilter(chip.dataset.filter));
});

document.querySelectorAll("[data-scroll-target]").forEach((button) => {
  button.addEventListener("click", () => {
    scrollToSection(button.dataset.scrollTarget);
    closeMobileMenu();
  });
});

document.addEventListener("click", (event) => {
  if (!els.menu.contains(event.target) && !event.target.classList.contains("icon-button")) {
    hideMenu();
  }
});

window.addEventListener("scroll", hideMenu);

bindLanes();
loadTheme();
render();
checkAlerts();
revealExperience();
window.setInterval(tick, 60000);
