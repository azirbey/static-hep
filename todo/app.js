const SUPABASE_URL = "https://phbguhhmfdxgdbrtmijg.supabase.co";
const SUPABASE_KEY = "sb_publishable_uCEqBHisCoijis0BOWFkOA_DruDz-m6";
const TABLE = "hep_ui_notes";
const DEV_FLAG = "hep-ui-dev";
const EDIT_FLAG = "hep-ui-edit";
const TEMP_KEY = "hep-ui-temp-done";

let view = "open";
let items = [];
let editingId = null;
let editingDraft = null;
let savingId = null;
let skipEditBlur = false;
let editEnabled = initEditMode();
const isDev = initDevMode();

const VIEW_LABELS = {
  open: "Açık",
  done: "Tamamlanan",
  archive: "Arşiv",
};

const EMPTY_MESSAGES = {
  open: {
    title: "Açık madde yok",
    text: "Henüz açık bir madde bulunmuyor.",
  },
  done: {
    title: "Tamamlanan madde yok",
    text: "Tamamlanan bir madde bulunamadı.",
  },
  archive: {
    title: "Arşiv boş",
    text: "Arşivlenmiş madde bulunamadı.",
  },
};

function resetEditingState() {
  editingId = null;
  editingDraft = null;
  savingId = null;
}

function closeViewDropdown() {
  const dropdown = document.getElementById("view-dropdown");
  const trigger = document.getElementById("view-dropdown-trigger");
  const menu = document.getElementById("view-dropdown-menu");
  if (!dropdown || !trigger || !menu) return;
  dropdown.classList.remove("is-open");
  trigger.setAttribute("aria-expanded", "false");
  menu.hidden = true;
}

function openViewDropdown() {
  const dropdown = document.getElementById("view-dropdown");
  const trigger = document.getElementById("view-dropdown-trigger");
  const menu = document.getElementById("view-dropdown-menu");
  if (!dropdown || !trigger || !menu) return;
  dropdown.classList.add("is-open");
  trigger.setAttribute("aria-expanded", "true");
  menu.hidden = false;
}

function toggleViewDropdown() {
  const menu = document.getElementById("view-dropdown-menu");
  if (!menu) return;
  if (menu.hidden) openViewDropdown();
  else closeViewDropdown();
}

function updateViewDropdown() {
  const label = document.getElementById("view-dropdown-label");
  if (label) label.textContent = VIEW_LABELS[view];
  document.querySelectorAll(".view-dropdown-option").forEach(function (btn) {
    const active = btn.getAttribute("data-view") === view;
    btn.classList.toggle("active", active);
    btn.setAttribute("aria-selected", active ? "true" : "false");
  });
}

function setView(nextView) {
  closeViewDropdown();
  if (view === nextView) return;
  resetEditingState();
  view = nextView;
  load();
}

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

function initEditMode() {
  const enabled = localStorage.getItem(EDIT_FLAG) === "1";
  document.documentElement.classList.toggle("edit-enabled", enabled);
  const input = document.getElementById("edit-enabled");
  if (input) input.checked = enabled;
  return enabled;
}

function updateEditModeUi() {
  document.getElementById("edit-enabled").checked = editEnabled;
}

function setEditMode(on) {
  editEnabled = on;
  localStorage.setItem(EDIT_FLAG, on ? "1" : "0");
  document.documentElement.classList.toggle("edit-enabled", on);
  updateEditModeUi();
  if (!on && editingId) cancelEdit();
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

function clearTempDone(id) {
  setTempDone(id, false);
}

function pruneTempDone() {
  const ids = getTempDone();
  let changed = false;
  items.forEach(function (item) {
    if (ids.has(item.id) && (item.done || item.archived)) {
      ids.delete(item.id);
      changed = true;
    }
  });
  if (changed) {
    localStorage.setItem(TEMP_KEY, JSON.stringify(Array.from(ids)));
  }
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

function escapeTextarea(value) {
  return escapeHtml(value);
}

function autoResizeTextarea(textarea) {
  textarea.style.height = "auto";
  textarea.style.height = textarea.scrollHeight + "px";
}

function focusEditor() {
  if (!editingId) return;
  const textarea = document.querySelector(
    '.item-edit[data-id="' + editingId + '"]'
  );
  if (!textarea) return;
  textarea.focus();
  textarea.setSelectionRange(textarea.value.length, textarea.value.length);
  autoResizeTextarea(textarea);
}

function bodyHtml(item, viewMode) {
  if (viewMode === null && editingId === item.id) {
    const text = editingDraft !== null ? editingDraft : item.body;
    return (
      '<div class="item-body" data-id="' +
      item.id +
      '">' +
      '<textarea class="item-edit" data-id="' +
      item.id +
      '" rows="1"' +
      (savingId === item.id ? " disabled" : "") +
      ">" +
      escapeTextarea(text) +
      "</textarea>" +
      "</div>"
    );
  }
  if (viewMode === null) {
    return (
      '<div class="item-body" data-id="' +
      item.id +
      '">' +
      '<p class="item-text">' +
      escapeHtml(item.body) +
      "</p>" +
      "</div>"
    );
  }
  return "<div><p>" + escapeHtml(item.body) + "</p></div>";
}

async function saveItemBody(id, text) {
  const res = await fetch(SUPABASE_URL + "/rest/v1/" + TABLE + "?id=eq." + id, {
    method: "PATCH",
    headers: headers(),
    body: JSON.stringify({ body: text }),
  });
  if (!res.ok) return false;
  return true;
}

function setSaveLoading(loading, id) {
  const btn = document.querySelector('.num-save[data-id="' + id + '"]');
  const textarea = document.querySelector('.item-edit[data-id="' + id + '"]');
  if (btn) {
    btn.disabled = loading;
    btn.classList.toggle("is-loading", loading);
    btn.setAttribute("aria-busy", loading ? "true" : "false");
  }
  if (textarea) textarea.disabled = loading;
}

async function commitEdit(id) {
  if (editingId !== id || savingId) return;

  const textarea = document.querySelector('.item-edit[data-id="' + id + '"]');
  if (!textarea) return;

  const item = items.find(function (entry) {
    return entry.id === id;
  });
  const text = textarea.value.trim();

  if (!item) {
    editingId = null;
    editingDraft = null;
    render();
    return;
  }

  if (!text) {
    editingId = null;
    editingDraft = null;
    render();
    return;
  }

  if (text === item.body) {
    editingId = null;
    editingDraft = null;
    render();
    return;
  }

  savingId = id;
  setSaveLoading(true, id);

  const saved = await saveItemBody(id, text);
  savingId = null;
  setSaveLoading(false, id);

  if (!saved) {
    editingDraft = text;
    focusEditor();
    return;
  }

  editingId = null;
  editingDraft = null;
  await load();
}

function cancelEdit() {
  editingId = null;
  editingDraft = null;
  savingId = null;
  render();
}

function startEdit(id) {
  if (!editEnabled || view !== "open" || editingId === id) return;
  if (editingId) {
    editingId = null;
    editingDraft = null;
  }
  const item = items.find(function (entry) {
    return entry.id === id;
  });
  if (!item) return;
  editingId = id;
  editingDraft = item.body;
  render();
  focusEditor();
}

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function datePopoverHtml(item, viewMode) {
  let html =
    '<span class="num-popover-row">' +
    '<span class="num-popover-label">Eklenme Tarihi</span>' +
    '<span class="num-popover-value">' +
    formatDate(item.created_at) +
    "</span>" +
    "</span>" +
    '<span class="num-popover-row">' +
    '<span class="num-popover-label">Tamamlanma Tarihi</span>' +
    '<span class="num-popover-value">' +
    formatDate(item.completed_at) +
    "</span>" +
    "</span>";

  if (viewMode === "archive" || item.archived_at) {
    html +=
      '<span class="num-popover-row">' +
      '<span class="num-popover-label">Arşivleme Tarihi</span>' +
      '<span class="num-popover-value">' +
      formatDate(item.archived_at) +
      "</span>" +
      "</span>";
  }

  return html;
}

const EMPTY_LUCIDE_ICONS = {
  open: "clipboard-x",
  done: "package-x",
  archive: "trash-2",
};

function emptyStateIcon(viewMode) {
  const name = EMPTY_LUCIDE_ICONS[viewMode] || EMPTY_LUCIDE_ICONS.open;
  return (
    '<i data-lucide="' +
    name +
    '" class="icon icon--empty" aria-hidden="true"></i>'
  );
}

function hydrateIcons(root) {
  if (!window.lucide) return;
  lucide.createIcons({
    root: root || document.body,
    attrs: {
      "stroke-width": 1.5,
    },
  });
}

function emptyStateHtml(viewMode) {
  const message = EMPTY_MESSAGES[viewMode] || EMPTY_MESSAGES.open;
  return (
    '<div class="list-empty" role="status">' +
    '<div class="list-empty-icon-wrap">' +
    emptyStateIcon(viewMode) +
    "</div>" +
    '<p class="list-empty-title">' +
    escapeHtml(message.title) +
    "</p>" +
    '<p class="list-empty-text">' +
    escapeHtml(message.text) +
    "</p>" +
    "</div>"
  );
}

function itemHtml(item, checked, viewMode) {
  const showTemp = isDev && viewMode === null;
  const tempChecked = showTemp && isTempDone(item);
  const tempBox = showTemp
    ? '<label class="check-wrap" title="Geçici (yalnızca bu tarayıcı)">' +
      '<input type="checkbox" data-temp="1" data-id="' +
      item.id +
      '"' +
      (tempChecked ? " checked" : "") +
      ">" +
      '<span class="check check-temp"></span>' +
      "</label>"
    : "";
  const numHtml =
    viewMode === "done" || viewMode === "archive"
      ? '<span class="num num-dates" tabindex="0">' +
        item.sort_order +
        '<span class="num-popover" role="tooltip">' +
        datePopoverHtml(item, viewMode) +
        "</span>" +
        "</span>"
      : viewMode === null && editingId === item.id
        ? '<button type="button" class="num num-save' +
          (savingId === item.id ? " is-loading" : "") +
          '" data-id="' +
          item.id +
          '" title="Kaydet" aria-label="Kaydet" aria-busy="' +
          (savingId === item.id ? "true" : "false") +
          '"' +
          (savingId === item.id ? " disabled" : "") +
          ">" +
          '<span class="num-save-icon" aria-hidden="true"></span>' +
          '<span class="num-save-spinner" aria-hidden="true"></span>' +
          "</button>"
        : '<span class="num">' + item.sort_order + "</span>";
  return (
    '<div class="item' +
    (tempChecked ? " item-temp" : "") +
    (viewMode === null && editingId === item.id ? " item-editing" : "") +
    '">' +
    numHtml +
    bodyHtml(item, viewMode) +
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
    return !item.done && !item.archived;
  });
  const doneItems = items.filter(function (item) {
    return item.done && !item.archived;
  });
  const archivedItems = items.filter(function (item) {
    return item.archived;
  });

  updateViewDropdown();

  const shown =
    view === "open"
      ? openItems
      : view === "done"
        ? doneItems
        : archivedItems;

  const hasItems = shown.length > 0;
  const countMeta = document.querySelector(".count-meta");
  if (countMeta) countMeta.hidden = !hasItems;

  document.getElementById("count").textContent = shown.length + " madde";
  const bulkBtn = document.getElementById("btn-archive-all");
  const showBulkAction =
    hasItems &&
    ((view === "done" && doneItems.length > 0) ||
      (view === "archive" && archivedItems.length > 0));
  document.getElementById("count-sep").hidden = !showBulkAction;
  bulkBtn.hidden = !showBulkAction;
  bulkBtn.textContent = view === "archive" ? "Tümünü Geri Al" : "Tümünü Arşive Taşı";

  const dateView = view === "done" || view === "archive" ? view : null;

  if (editingId) {
    const textarea = document.querySelector(
      '.item-edit[data-id="' + editingId + '"]'
    );
    if (textarea) editingDraft = textarea.value;
  }

  list.innerHTML = shown.length
    ? shown
        .map(function (item) {
          return itemHtml(item, item.done || item.archived, dateView);
        })
        .join("")
    : emptyStateHtml(view);

  if (!shown.length) hydrateIcons(list);

  focusEditor();
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
    pruneTempDone();
    render();
  } catch (err) {
    document.getElementById("list").textContent = "Liste yüklenemedi.";
  }
}

document.getElementById("list").addEventListener("dblclick", function (e) {
  const textEl = e.target.closest(".item-text");
  if (!textEl || !editEnabled || view !== "open") return;
  const bodyEl = textEl.closest(".item-body");
  if (!bodyEl) return;
  startEdit(Number(bodyEl.getAttribute("data-id")));
});

document.getElementById("list").addEventListener("mousedown", function (e) {
  if (e.target.closest(".num-save")) skipEditBlur = true;
});

document.getElementById("list").addEventListener("click", function (e) {
  const saveBtn = e.target.closest(".num-save");
  if (!saveBtn) return;
  commitEdit(Number(saveBtn.getAttribute("data-id")));
});

document.getElementById("list").addEventListener(
  "blur",
  function (e) {
    if (!e.target.classList.contains("item-edit")) return;
    const id = Number(e.target.getAttribute("data-id"));
    setTimeout(function () {
      if (skipEditBlur) {
        skipEditBlur = false;
        return;
      }
      if (editingId !== id) return;
      cancelEdit();
    }, 0);
  },
  true
);

document.getElementById("list").addEventListener("input", function (e) {
  if (!e.target.classList.contains("item-edit")) return;
  editingDraft = e.target.value;
  autoResizeTextarea(e.target);
});

document.getElementById("list").addEventListener("keydown", function (e) {
  if (!e.target.classList.contains("item-edit")) return;
  if (e.key === "Escape") {
    e.preventDefault();
    cancelEdit();
  }
});

document.getElementById("list").addEventListener("change", async function (e) {
  if (e.target.type !== "checkbox") return;
  const id = Number(e.target.getAttribute("data-id"));
  if (e.target.getAttribute("data-temp") === "1") {
    setTempDone(id, e.target.checked);
    render();
    return;
  }
  const done = e.target.checked;
  const item = items.find(function (entry) {
    return entry.id === id;
  });
  const patch = done
    ? { done: true, completed_at: new Date().toISOString() }
    : item && item.archived
      ? { done: true, archived: false }
      : { done: false, archived: false, completed_at: null, archived_at: null };
  const res = await fetch(
    SUPABASE_URL + "/rest/v1/" + TABLE + "?id=eq." + id,
    {
      method: "PATCH",
      headers: headers(),
      body: JSON.stringify(patch),
    }
  );
  if (!res.ok) {
    e.target.checked = !done;
    return;
  }
  clearTempDone(id);
  editingId = null;
  editingDraft = null;
  await load();
});

document.getElementById("edit-enabled").addEventListener("change", function () {
  setEditMode(this.checked);
});

document.getElementById("view-dropdown-trigger").addEventListener("click", function (e) {
  e.stopPropagation();
  toggleViewDropdown();
});

document.getElementById("view-dropdown-trigger").addEventListener("keydown", function (e) {
  if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    openViewDropdown();
    const active = document.querySelector(".view-dropdown-option.active");
    if (active) active.focus();
  }
  if (e.key === "Escape") closeViewDropdown();
});

document.getElementById("view-dropdown-menu").addEventListener("click", function (e) {
  const option = e.target.closest(".view-dropdown-option");
  if (!option) return;
  setView(option.getAttribute("data-view"));
});

document.getElementById("view-dropdown-menu").addEventListener("keydown", function (e) {
  const options = Array.from(document.querySelectorAll(".view-dropdown-option"));
  const current = document.activeElement;
  const index = options.indexOf(current);
  if (e.key === "Escape") {
    closeViewDropdown();
    document.getElementById("view-dropdown-trigger").focus();
  }
  if (e.key === "ArrowDown" && index > -1) {
    e.preventDefault();
    options[(index + 1) % options.length].focus();
  }
  if (e.key === "ArrowUp" && index > -1) {
    e.preventDefault();
    options[(index - 1 + options.length) % options.length].focus();
  }
  if (e.key === "Enter" || e.key === " ") {
    const option = e.target.closest(".view-dropdown-option");
    if (!option) return;
    e.preventDefault();
    setView(option.getAttribute("data-view"));
  }
});

document.addEventListener("click", function (e) {
  if (!e.target.closest("#view-dropdown")) closeViewDropdown();
});

document.addEventListener("keydown", function (e) {
  if (e.key !== "Escape") return;
  const menu = document.getElementById("view-dropdown-menu");
  if (menu && !menu.hidden) closeViewDropdown();
});

document
  .getElementById("btn-archive-all")
  .addEventListener("click", async function () {
    const btn = this;
    btn.disabled = true;

    if (view === "archive") {
      const res = await fetch(
        SUPABASE_URL + "/rest/v1/" + TABLE + "?archived=eq.true",
        {
          method: "PATCH",
          headers: headers(),
          body: JSON.stringify({
            done: true,
            archived: false,
          }),
        }
      );
      btn.disabled = false;
      if (!res.ok) return;
      view = "done";
      resetEditingState();
      await load();
      return;
    }

    const res = await fetch(
      SUPABASE_URL +
        "/rest/v1/" +
        TABLE +
        "?done=eq.true&archived=eq.false",
      {
        method: "PATCH",
        headers: headers(),
        body: JSON.stringify({
          archived: true,
          archived_at: new Date().toISOString(),
        }),
      }
    );
    btn.disabled = false;
    if (!res.ok) return;
    items
      .filter(function (item) {
        return item.done && !item.archived;
      })
      .forEach(function (item) {
        clearTempDone(item.id);
      });
    view = "archive";
    resetEditingState();
    await load();
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
      archived: false,
      sort_order: maxSort + 1,
    }),
  });
  if (!res.ok) return;
  document.getElementById("form").reset();
  view = "open";
  await load();
});

load();
updateEditModeUi();
