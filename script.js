const STORAGE_KEY = "daily-todo-list-v1";
const STATUSES = ["pending", "active", "completed"];
const FILTERS = ["all", "completed", "active", "pending"];
const STATUS_LABELS = {
  pending: "대기",
  active: "진행 중",
  completed: "완료",
};

const form = document.querySelector("#todo-form");
const input = document.querySelector("#todo-input");
const dateInput = document.querySelector("#todo-date");
const formMessage = document.querySelector("#form-message");
const todoList = document.querySelector("#todo-list");
const filterTabs = document.querySelector("#filter-tabs");
const progressLabel = document.querySelector("#progress-label");
const progressBar = document.querySelector("#progress-bar");
const progressContainer = document.querySelector('[role="progressbar"]');
const remainingCount = document.querySelector("#remaining-count");

let todos = [];
let currentFilter = "all";

function isTodo(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    (typeof value.id === "string" || typeof value.id === "number") &&
    typeof value.text === "string" &&
    STATUSES.includes(value.status) &&
    typeof value.createdAt === "number" &&
    (value.dueDate === undefined || value.dueDate === "" || /^\d{4}-\d{2}-\d{2}$/.test(value.dueDate))
  );
}

function loadState() {
  const storedValue = localStorage.getItem(STORAGE_KEY);
  if (storedValue === null) return;

  const state = JSON.parse(storedValue);
  if (
    state === null ||
    typeof state !== "object" ||
    !Array.isArray(state.todos) ||
    !state.todos.every(isTodo) ||
    !FILTERS.includes(state.filter)
  ) {
    throw new Error("저장된 할 일 데이터의 형식이 올바르지 않습니다.");
  }

  todos = state.todos;
  currentFilter = state.filter;
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ todos, filter: currentFilter }));
  } catch (error) {
    console.error("할 일 목록을 저장하지 못했습니다.", error);
    formMessage.textContent = "저장 공간에 접근할 수 없어 변경 사항을 저장하지 못했습니다.";
    formMessage.classList.remove("hidden");
  }
}

function createButton(label, className, onClick, title = label) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.textContent = label;
  button.title = title;
  button.setAttribute("aria-label", title);
  button.addEventListener("click", onClick);
  return button;
}

function getFilteredTodos() {
  if (currentFilter === "all") return todos;
  if (currentFilter === "active") return todos.filter((todo) => todo.status !== "completed");
  return todos.filter((todo) => todo.status === currentFilter);
}

function updateProgress() {
  const completedCount = todos.filter((todo) => todo.status === "completed").length;
  const percentage = todos.length === 0 ? 0 : Math.round((completedCount / todos.length) * 100);

  progressLabel.textContent = `${completedCount}/${todos.length} 완료`;
  progressBar.style.width = `${percentage}%`;
  progressContainer.setAttribute("aria-valuenow", String(percentage));
  remainingCount.textContent = `남은 할 일 ${todos.length - completedCount}개`;
}

function renderFilters() {
  filterTabs.querySelectorAll("[data-filter]").forEach((tab) => {
    const selected = tab.dataset.filter === currentFilter;
    tab.setAttribute("aria-selected", String(selected));
    tab.tabIndex = selected ? 0 : -1;
  });
}

function renderEmptyState(message) {
  const emptyState = document.createElement("div");
  emptyState.className = "flex min-h-72 flex-col items-center justify-center px-4 text-center";

  const icon = document.createElement("div");
  icon.className = "mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-2xl text-indigo-500";
  icon.setAttribute("aria-hidden", "true");
  icon.textContent = "✓";

  const text = document.createElement("p");
  text.className = "text-sm leading-6 text-slate-500";
  text.textContent = message;
  emptyState.append(icon, text);
  todoList.replaceChildren(emptyState);
}

function renderTodo(todo) {
  const item = document.createElement("article");
  item.className = "flex min-h-[4.5rem] items-center gap-3 border-b border-slate-100 py-3 last:border-b-0 sm:gap-4";

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = todo.status === "completed";
  checkbox.className = "h-5 w-5 shrink-0 cursor-pointer accent-indigo-600";
  checkbox.setAttribute("aria-label", `${todo.text} 완료`);
  checkbox.addEventListener("change", () => {
    todo.status = checkbox.checked ? "completed" : "pending";
    saveState();
    render();
  });

  const content = document.createElement("div");
  content.className = "flex min-w-0 flex-1 items-center gap-2";

  const text = document.createElement("p");
  text.className = `todo-text min-w-0 flex-1 text-sm leading-6 ${todo.status === "completed" ? "text-slate-400 line-through" : "text-slate-700"}`;
  text.textContent = todo.text;
  content.append(text);

  if (todo.dueDate) {
    const dueDate = document.createElement("time");
    dueDate.className = "shrink-0 text-xs text-slate-400";
    dueDate.dateTime = todo.dueDate;
    dueDate.textContent = formatDate(todo.dueDate);
    content.append(dueDate);
  }

  const statusButton = createButton(
    STATUS_LABELS[todo.status],
    `min-h-10 shrink-0 rounded-lg px-2.5 text-xs font-semibold transition sm:px-3 ${
      todo.status === "completed"
        ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
        : todo.status === "active"
          ? "bg-amber-50 text-amber-700 hover:bg-amber-100"
          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
    }`,
    () => {
      const nextStatus = STATUSES[(STATUSES.indexOf(todo.status) + 1) % STATUSES.length];
      todo.status = nextStatus;
      saveState();
      render();
    },
    `상태 변경: ${STATUS_LABELS[todo.status]}`
  );
  statusButton.classList.add("status-button");

  const actions = document.createElement("div");
  actions.className = "flex shrink-0 items-center gap-1";
  actions.append(
    createButton("수정", "min-h-10 rounded-lg px-2 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 sm:px-3", () => beginEditing(todo), `${todo.text} 수정`),
    createButton("삭제", "min-h-10 rounded-lg px-2 text-xs font-semibold text-rose-500 transition hover:bg-rose-50 sm:px-3", () => deleteTodo(todo), `${todo.text} 삭제`)
  );

  item.append(checkbox, content, statusButton, actions);
  return item;
}

function beginEditing(todo) {
  const item = [...todoList.children].find((element) => element.dataset.todoId === String(todo.id));
  if (!item) return;

  const editor = document.createElement("form");
  editor.className = "flex min-w-0 flex-1 flex-wrap items-center gap-2";

  const editInput = document.createElement("input");
  editInput.className = "edit-input text-sm";
  editInput.type = "text";
  editInput.maxLength = 1000;
  editInput.value = todo.text;
  editInput.setAttribute("aria-label", "할 일 내용 수정");

  const editDate = document.createElement("input");
  editDate.className = "edit-date min-h-10 rounded-lg border border-slate-200 px-2 text-xs text-slate-600";
  editDate.type = "date";
  editDate.value = todo.dueDate || "";
  editDate.setAttribute("aria-label", "마감 날짜 수정");

  const saveButton = document.createElement("button");
  saveButton.type = "submit";
  saveButton.className = "min-h-10 shrink-0 rounded-lg bg-indigo-600 px-3 text-xs font-semibold text-white hover:bg-indigo-700";
  saveButton.textContent = "저장";

  const cancelButton = createButton(
    "취소",
    "min-h-10 shrink-0 rounded-lg px-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 sm:px-3",
    render
  );
  editor.append(editInput, editDate, saveButton, cancelButton);
  item.replaceChild(editor, item.children[1]);

  editor.addEventListener("submit", (event) => {
    event.preventDefault();
    const updatedText = editInput.value.trim();
    if (!updatedText) {
      editInput.setCustomValidity("할 일 내용을 입력해 주세요.");
      editInput.reportValidity();
      return;
    }
    todo.text = updatedText;
    todo.dueDate = editDate.value;
    saveState();
    render();
  });

  editInput.addEventListener("input", () => editInput.setCustomValidity(""));
  editInput.addEventListener("keydown", (event) => {
    if (event.key === "Escape") render();
  });
  editInput.focus();
  editInput.select();
}

function formatDate(dateValue) {
  const [year, month, day] = dateValue.split("-");
  return `${year}.${month}.${day}`;
}

function deleteTodo(todo) {
  todos = todos.filter((item) => item.id !== todo.id);
  saveState();
  render();
}

function render() {
  updateProgress();
  renderFilters();

  if (todos.length === 0) {
    renderEmptyState("등록된 할 일이 없습니다. 오늘 할 일을 추가해 보세요!");
    return;
  }

  const visibleTodos = getFilteredTodos();
  if (visibleTodos.length === 0) {
    renderEmptyState("해당하는 할 일이 없습니다.");
    return;
  }

  const items = visibleTodos.map((todo) => {
    const item = renderTodo(todo);
    item.dataset.todoId = String(todo.id);
    return item;
  });
  todoList.replaceChildren(...items);
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = input.value.trim();
  if (!text) {
    formMessage.textContent = "할 일 내용을 입력해 주세요.";
    formMessage.classList.remove("hidden");
    input.focus();
    return;
  }

  formMessage.textContent = "";
  formMessage.classList.add("hidden");
  todos.push({
    id: crypto.randomUUID(),
    text,
    status: "pending",
    createdAt: Date.now(),
    dueDate: dateInput.value,
  });
  input.value = "";
  dateInput.value = "";
  saveState();
  render();
  input.focus();
});

input.addEventListener("input", () => {
  formMessage.textContent = "";
  formMessage.classList.add("hidden");
});

filterTabs.addEventListener("click", (event) => {
  const tab = event.target.closest("[data-filter]");
  if (!tab || !FILTERS.includes(tab.dataset.filter)) return;
  currentFilter = tab.dataset.filter;
  saveState();
  render();
});

filterTabs.addEventListener("keydown", (event) => {
  if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
  const tabs = [...filterTabs.querySelectorAll("[data-filter]")];
  const currentIndex = tabs.findIndex((tab) => tab.dataset.filter === currentFilter);
  const direction = event.key === "ArrowRight" ? 1 : -1;
  const nextTab = tabs[(currentIndex + direction + tabs.length) % tabs.length];
  nextTab.focus();
  nextTab.click();
  event.preventDefault();
});

try {
  loadState();
} catch (error) {
  console.error("저장된 할 일 목록을 불러오지 못했습니다.", error);
  formMessage.textContent = "저장된 데이터를 불러오지 못했습니다. 브라우저 저장소 설정을 확인해 주세요.";
  formMessage.classList.remove("hidden");
}

render();
