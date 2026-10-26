const STORAGE_KEY = "daylog-todos-v1";
const STATUSES = ["pending", "active", "completed"];
const STATUS_LABELS = {
  pending: "대기",
  active: "진행 중",
  completed: "완료",
};

const elements = {
  date: document.querySelector("#today-date"),
  form: document.querySelector("#task-form"),
  input: document.querySelector("#task-input"),
  dateInput: document.querySelector("#task-date"),
  message: document.querySelector("#form-message"),
  list: document.querySelector("#task-list"),
  filters: document.querySelector(".filters"),
  progressFill: document.querySelector("#progress-fill"),
  progressTrack: document.querySelector("#progress-track"),
  progressPercent: document.querySelector("#progress-percent"),
  completedCount: document.querySelector("#completed-count"),
  totalCount: document.querySelector("#total-count"),
  listTotal: document.querySelector("#list-total"),
  remainingMessage: document.querySelector("#remaining-message"),
};

let todos = loadTodos();
let currentFilter = "all";
let editingId = null;

function isValidDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

function getLocalDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function loadTodos() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    if (!Array.isArray(saved)) return [];

    return saved
      .filter((item) => item && typeof item.text === "string" && item.text.trim())
      .map((item, index) => ({
        id: String(item.id ?? `${Date.now()}-${index}`),
        text: item.text.trim(),
        status: STATUSES.includes(item.status) ? item.status : "pending",
        createdAt: Number(item.createdAt) || Date.now(),
        dueDate: isValidDate(item.dueDate) ? item.dueDate : "",
      }));
  } catch {
    return [];
  }
}

function saveTodos() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
  } catch {
    elements.message.textContent = "브라우저 저장 공간에 접근할 수 없습니다.";
  }
}

function render() {
  const visibleTodos = todos.filter((todo) => {
    if (currentFilter === "all") return true;
    if (currentFilter === "active") return todo.status !== "completed";
    return todo.status === currentFilter;
  });
  const completed = todos.filter((todo) => todo.status === "completed").length;
  const percentage = todos.length ? Math.round((completed / todos.length) * 100) : 0;

  elements.progressFill.style.width = `${percentage}%`;
  elements.progressTrack.setAttribute("aria-valuenow", String(percentage));
  elements.progressPercent.textContent = `${percentage}%`;
  elements.completedCount.textContent = String(completed);
  elements.totalCount.textContent = String(todos.length);
  elements.listTotal.textContent = String(visibleTodos.length);
  elements.remainingMessage.textContent = todos.length && completed === todos.length
    ? "오늘의 할 일을 모두 해냈어요. 멋진 하루예요!"
    : `남은 할 일 ${todos.length - completed}개, 천천히 해봐요.`;

  if (visibleTodos.length === 0) {
    const message = todos.length === 0
      ? "등록된 할 일이 없습니다. 오늘 할 일을 추가해 보세요!"
      : "해당하는 할 일이 없습니다.";
    elements.list.replaceChildren(createEmptyState(message));
    return;
  }

  const fragment = document.createDocumentFragment();
  visibleTodos.forEach((todo) => fragment.append(createTaskRow(todo)));
  elements.list.replaceChildren(fragment);
}

function createEmptyState(message) {
  const wrapper = document.createElement("div");
  wrapper.className = "empty-state";
  const mark = document.createElement("span");
  mark.className = "empty-mark";
  mark.setAttribute("aria-hidden", "true");
  mark.textContent = "✳";
  const text = document.createElement("p");
  text.textContent = message;
  wrapper.append(mark, text);
  return wrapper;
}

function createTaskRow(todo) {
  const row = document.createElement("article");
  row.className = "task-row";
  row.dataset.id = todo.id;

  const main = document.createElement("div");
  main.className = "task-main";
  const statusButton = document.createElement("button");
  statusButton.className = `status-button status-${todo.status}`;
  statusButton.type = "button";
  statusButton.dataset.action = "cycle-status";
  statusButton.setAttribute("aria-label", `상태 변경, 현재 ${STATUS_LABELS[todo.status]}`);
  statusButton.title = `상태 변경: ${STATUS_LABELS[todo.status]}`;
  const dot = document.createElement("span");
  dot.className = "status-dot";
  dot.setAttribute("aria-hidden", "true");
  const label = document.createElement("span");
  label.className = "status-label";
  label.textContent = STATUS_LABELS[todo.status];
  statusButton.append(dot, label);

  if (editingId === todo.id) {
    const editInput = document.createElement("input");
    editInput.className = "edit-input";
    editInput.type = "text";
    editInput.maxLength = 500;
    editInput.value = todo.text;
    editInput.setAttribute("aria-label", "할 일 내용 수정");
    const editDate = document.createElement("input");
    editDate.className = "edit-date-input";
    editDate.type = "date";
    editDate.value = todo.dueDate || "";
    editDate.setAttribute("aria-label", "할 일 날짜 수정");
    const content = document.createElement("div");
    content.className = "task-content editing-content";
    content.append(editInput, editDate);
    main.append(statusButton, content);
    queueMicrotask(() => {
      editInput.focus();
      editInput.select();
    });
  } else {
    const text = document.createElement("span");
    text.className = "task-text";
    text.textContent = todo.text;
    const content = document.createElement("div");
    content.className = "task-content";
    content.append(text);
    if (todo.dueDate) {
      const dateLabel = document.createElement("time");
      const dueDate = new Date(`${todo.dueDate}T00:00:00`);
      dateLabel.className = "task-date-label";
      dateLabel.dateTime = todo.dueDate;
      dateLabel.textContent = new Intl.DateTimeFormat("ko-KR", {
        month: "long",
        day: "numeric",
        weekday: "short",
      }).format(dueDate);
      if (todo.status !== "completed" && todo.dueDate < getLocalDateString()) {
        dateLabel.classList.add("is-overdue");
        dateLabel.textContent += " · 기한 지남";
      }
      content.append(dateLabel);
    }
    main.append(statusButton, content);
  }

  const actions = document.createElement("div");
  actions.className = "task-actions";
  actions.append(
    createActionButton(editingId === todo.id ? "save" : "edit", editingId === todo.id ? "저장" : "수정"),
    createActionButton("delete", "삭제"),
  );
  row.append(main, actions);
  return row;
}

function createActionButton(action, label) {
  const button = document.createElement("button");
  button.className = `task-action ${action === "delete" ? "delete" : ""}`;
  button.type = "button";
  button.dataset.action = action;
  button.setAttribute("aria-label", label);
  button.title = label;
  const icon = document.createElement("span");
  icon.setAttribute("aria-hidden", "true");
  icon.textContent = action === "delete" ? "×" : action === "save" ? "✓" : "↗";
  button.append(icon);
  return button;
}

function addTodo(text, dueDate) {
  todos.unshift({
    id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    text,
    status: "pending",
    createdAt: Date.now(),
    dueDate,
  });
  saveTodos();
  render();
}

function saveEdit(row) {
  const todo = todos.find((item) => item.id === row.dataset.id);
  const input = row.querySelector(".edit-input");
  const text = input.value.trim();
  if (!text) {
    input.setCustomValidity("할 일 내용을 입력해 주세요.");
    input.reportValidity();
    return;
  }
  if (todo) todo.text = text;
  if (todo) todo.dueDate = row.querySelector(".edit-date-input").value;
  editingId = null;
  saveTodos();
  render();
}

elements.date.textContent = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "long",
  day: "numeric",
  weekday: "long",
}).format(new Date());

elements.form.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = elements.input.value.trim();
  if (!text) {
    elements.message.textContent = "할 일 내용을 입력해 주세요.";
    elements.input.focus();
    return;
  }
  elements.message.textContent = "";
  addTodo(text, elements.dateInput.value);
  elements.input.value = "";
  elements.dateInput.value = "";
  elements.input.focus();
});

elements.input.addEventListener("input", () => {
  if (elements.input.value.trim()) elements.message.textContent = "";
});

elements.filters.addEventListener("click", (event) => {
  const button = event.target.closest("[data-filter]");
  if (!button) return;
  currentFilter = button.dataset.filter;
  elements.filters.querySelectorAll("[data-filter]").forEach((filterButton) => {
    const selected = filterButton === button;
    filterButton.classList.toggle("is-selected", selected);
    filterButton.setAttribute("aria-pressed", String(selected));
  });
  render();
});

elements.list.addEventListener("click", (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const row = button.closest(".task-row");
  const todo = todos.find((item) => item.id === row.dataset.id);
  if (!todo) return;

  switch (button.dataset.action) {
    case "cycle-status": {
      const next = (STATUSES.indexOf(todo.status) + 1) % STATUSES.length;
      todo.status = STATUSES[next];
      saveTodos();
      render();
      break;
    }
    case "edit":
      editingId = todo.id;
      render();
      break;
    case "save":
      saveEdit(row);
      break;
    case "delete":
      todos = todos.filter((item) => item.id !== todo.id);
      if (editingId === todo.id) editingId = null;
      saveTodos();
      render();
      break;
  }
});

elements.list.addEventListener("keydown", (event) => {
  if (!event.target.matches(".edit-input")) return;
  if (event.key === "Enter") {
    event.preventDefault();
    saveEdit(event.target.closest(".task-row"));
  }
  if (event.key === "Escape") {
    editingId = null;
    render();
  }
});

elements.list.addEventListener("focusout", (event) => {
  if (event.target.matches(".edit-input, .edit-date-input")) {
    const row = event.target.closest(".task-row");
    if (row && !row.contains(event.relatedTarget) && editingId === row.dataset.id) {
      editingId = null;
      render();
    }
  }
});

render();