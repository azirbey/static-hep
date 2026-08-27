const STORAGE_KEY = "hepbet-ui-todos-v3";

let view = "open";

function defaultState() {
  return {
    items: TODOS.slice(),
    done: [],
    nextId: TODOS.length + 1,
  };
}

function load() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (!data || !data.items) return defaultState();
    return data;
  } catch {
    return defaultState();
  }
}

function save(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function itemHtml(item, checked) {
  return (
    '<div class="item">' +
    '<span class="num">' +
    item.id +
    "</span>" +
    "<div>" +
    "<p>" +
    item.text +
    "</p>" +
    "</div>" +
    '<label class="check-wrap">' +
    '<input type="checkbox" data-id="' +
    item.id +
    '"' +
    (checked ? " checked" : "") +
    ">" +
    '<span class="check"></span>' +
    "</label>" +
    "</div>"
  );
}

function render() {
  const state = load();
  const list = document.getElementById("list");
  const openItems = state.items.filter(function (item) {
    return state.done.indexOf(item.id) === -1;
  });
  const doneItems = state.items.filter(function (item) {
    return state.done.indexOf(item.id) !== -1;
  });

  document.getElementById("btn-open").className =
    "nav-btn" + (view === "open" ? " active" : "");
  document.getElementById("btn-done").className =
    "nav-btn" + (view === "done" ? " active" : "");

  document.getElementById("count").textContent =
    view === "open"
      ? openItems.length + " madde"
      : doneItems.length + " madde";

  const shown = view === "open" ? openItems : doneItems;
  const checked = view === "done";

  list.innerHTML = shown
    .map(function (item) {
      return itemHtml(item, checked);
    })
    .join("");
}

document.getElementById("list").addEventListener("change", function (e) {
  if (e.target.type !== "checkbox") return;
  const id = Number(e.target.getAttribute("data-id"));
  const state = load();
  if (e.target.checked) {
    if (state.done.indexOf(id) === -1) state.done.push(id);
  } else {
    state.done = state.done.filter(function (n) {
      return n !== id;
    });
  }
  save(state);
  render();
});

document.getElementById("btn-open").addEventListener("click", function () {
  view = "open";
  render();
});

document.getElementById("btn-done").addEventListener("click", function () {
  view = "done";
  render();
});

document.getElementById("form").addEventListener("submit", function (e) {
  e.preventDefault();
  const text = document.getElementById("text").value.trim();
  if (!text) return;
  const state = load();
  state.items.push({
    id: state.nextId,
    text: text,
  });
  state.nextId += 1;
  save(state);
  document.getElementById("form").reset();
  view = "open";
  render();
});

render();
