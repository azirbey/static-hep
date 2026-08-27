const SUPABASE_URL = "https://phbguhhmfdxgdbrtmijg.supabase.co";
const SUPABASE_KEY = "sb_publishable_uCEqBHisCoijis0BOWFkOA_DruDz-m6";
const TABLE = "hep_ui_notes";

let view = "open";
let items = [];

function headers() {
  return {
    apikey: SUPABASE_KEY,
    Authorization: "Bearer " + SUPABASE_KEY,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  };
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function itemHtml(item, checked) {
  return (
    '<div class="item">' +
    '<span class="num">' +
    item.sort_order +
    "</span>" +
    "<div>" +
    "<p>" +
    escapeHtml(item.body) +
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
  const checked = view === "done";

  list.innerHTML = shown
    .map(function (item) {
      return itemHtml(item, checked);
    })
    .join("");
}

async function load() {
  const res = await fetch(
    SUPABASE_URL +
      "/rest/v1/" +
      TABLE +
      "?select=*&order=sort_order.asc&ts=" +
      Date.now(),
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
}

document.getElementById("list").addEventListener("change", async function (e) {
  if (e.target.type !== "checkbox") return;
  const id = Number(e.target.getAttribute("data-id"));
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
