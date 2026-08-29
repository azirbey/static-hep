const SUPABASE_URL = "https://phbguhhmfdxgdbrtmijg.supabase.co";
const SUPABASE_KEY = "sb_publishable_uCEqBHisCoijis0BOWFkOA_DruDz-m6";
const TABLE = "hep_ui_notes";
const DEV_FLAG = "hep-ui-dev";
const TEMP_KEY = "hep-ui-temp-done";

let view = "open";
let items = [];
const isDev = initDevMode();

function headers() {
  return {
    apikey: SUPABASE_KEY,
    Authorization: "Bearer " + SUPABASE_KEY,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  };
}

function initDevMode() {
  const params = new URLSearchParams(location.search);
  const devParam = params.get("dev");
  if (devParam === "1") {
    localStorage.setItem(DEV_FLAG, "1");
    params.delete("dev");
    const next = params.toString();
    history.replaceState(
      {},
      "",
      location.pathname + (next ? "?" + next : "") + location.hash
    );
  } else if (devParam === "0") {
    localStorage.removeItem(DEV_FLAG);
    params.delete("dev");
    const next = params.toString();
    history.replaceState(
      {},
      "",
      location.pathname + (next ? "?" + next : "") + location.hash
    );
  }
  const enabled = localStorage.getItem(DEV_FLAG) === "1";
  document.body.classList.toggle("is-dev", enabled);
  return enabled;
}

function getTempDone() {
  try {
    return new Set(JSON.parse(localStorage.getItem(TEMP_KEY) || "[]"));
  } catch (err) {
    return new Set();
  }
}

function setTempDone(id, on) {
  const ids = getTempDone();
  if (on) ids.add(id);
  else ids.delete(id);
  localStorage.setItem(TEMP_KEY, JSON.stringify(Array.from(ids)));
}

function isTempDone(item) {
  return isDev && getTempDone().has(item.id);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function itemHtml(item, checked) {
  const tempChecked = isTempDone(item);
  const tempBox = isDev
    ? '<label class="check-wrap" title="Geçici (yalnızca bu tarayıcı)">' +
      '<input type="checkbox" data-temp="1" data-id="' +
      item.id +
      '"' +
      (tempChecked ? " checked" : "") +
      ">" +
      '<span class="check check-temp"></span>' +
      "</label>"
    : "";
  return (
    '<div class="item' +
    (tempChecked ? " item-temp" : "") +
    '">' +
    '<span class="num">' +
    item.sort_order +
    "</span>" +
    "<div>" +
    "<p>" +
    escapeHtml(item.body) +
    "</p>" +
    "</div>" +
    tempBox +
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
  const list = document.getElementById("list");
  const openItems = items.filter(function (item) {
    return !item.done;
  });
  const doneItems = items.filter(function (item) {
    return item.done;
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

  list.innerHTML = shown
    .map(function (item) {
      return itemHtml(item, item.done);
    })
    .join("");
}

async function load() {
  try {
    const res = await fetch(
      SUPABASE_URL + "/rest/v1/" + TABLE + "?select=*&order=sort_order.asc",
      {
        headers: headers(),
        cache: "no-store",
      }
    );
    if (!res.ok) {
      document.getElementById("list").textContent = "Liste yüklenemedi.";
      return;
    }
    items = await res.json();
    render();
  } catch (err) {
    document.getElementById("list").textContent = "Liste yüklenemedi.";
  }
}

document.getElementById("list").addEventListener("change", async function (e) {
  if (e.target.type !== "checkbox") return;
  const id = Number(e.target.getAttribute("data-id"));
  if (e.target.getAttribute("data-temp") === "1") {
    setTempDone(id, e.target.checked);
    render();
    return;
  }
  const done = e.target.checked;
  const res = await fetch(
    SUPABASE_URL + "/rest/v1/" + TABLE + "?id=eq." + id,
    {
      method: "PATCH",
      headers: headers(),
      body: JSON.stringify({ done: done }),
    }
  );
  if (!res.ok) {
    e.target.checked = !done;
    return;
  }
  await load();
});

document.getElementById("btn-open").addEventListener("click", function () {
  view = "open";
  load();
});

document.getElementById("btn-done").addEventListener("click", function () {
  view = "done";
  load();
});

document.getElementById("btn-add").addEventListener("click", function () {
  this.classList.toggle("active");
  document.querySelector(".col-add").classList.toggle("active");
});

document.getElementById("form").addEventListener("submit", async function (e) {
  e.preventDefault();
  const text = document.getElementById("text").value.trim();
  if (!text) return;
  const maxSort = items.reduce(function (max, item) {
    return item.sort_order > max ? item.sort_order : max;
  }, 0);
  const res = await fetch(SUPABASE_URL + "/rest/v1/" + TABLE, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      body: text,
      done: false,
      sort_order: maxSort + 1,
    }),
  });
  if (!res.ok) return;
  document.getElementById("form").reset();
  view = "open";
  await load();
});

load();
