const SUPABASE_URL = "https://phbguhhmfdxgdbrtmijg.supabase.co";
const SUPABASE_KEY = "sb_publishable_uCEqBHisCoijis0BOWFkOA_DruDz-m6";
const TABLE = "hep_ui_notes";
const REPLIES_TABLE = "hep_ui_replies";
const IMAGES_TABLE = "hep_ui_note_images";
const IMAGES_BUCKET = "hep-ui-item-images";
const MAX_NOTE_IMAGES = 3;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const DEV_FLAG = "hep-ui-dev";
const EDIT_FLAG = "hep-ui-edit";
const VIEW_FLAG = "hep-ui-view";
const TEMP_KEY = "hep-ui-temp-done";
const AUTHOR_KEY = "hep-ui-author";
const CLIENT_ID_KEY = "hep-ui-client-id";
const ADD_PANEL_FLAG = "hep-ui-add-panel";

const VIEW_KEYS = ["open", "done", "archive"];

let view = initView();
let items = [];
let editingId = null;
let editingDraft = null;
let savingId = null;
let skipEditBlur = false;
const isDev = initDevMode();
let editEnabled = initEditMode();

let repliesOpenId = null;
let repliesCache = {};
let replyDraft = "";
let replySaving = false;
let replyLoading = false;
let replyDeletingId = null;
let authorModalResolve = null;
let confirmModalResolve = null;

let imagesCache = {};
let imagesGridOpen = false;
let imageUploading = false;
let imageDeletingId = null;
let textExpandedId = null;

function getClientId() {
  try {
    let id = localStorage.getItem(CLIENT_ID_KEY);
    if (id && id.trim()) return id.trim();
    id =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : "c-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
    localStorage.setItem(CLIENT_ID_KEY, id);
    return id;
  } catch (err) {
    return null;
  }
}

function isOwnReply(reply) {
  const clientId = getClientId();
  return !!(
    clientId &&
    reply &&
    reply.author_client_id &&
    String(reply.author_client_id) === String(clientId)
  );
}

function isOwnImage(image) {
  const clientId = getClientId();
  return !!(
    clientId &&
    image &&
    image.author_client_id &&
    String(image.author_client_id) === String(clientId)
  );
}

function closeReplies() {
  repliesOpenId = null;
  replyDraft = "";
  replySaving = false;
  replyLoading = false;
  imagesGridOpen = false;
  imageUploading = false;
  imageDeletingId = null;
}

function getAuthor() {
  try {
    const name = (localStorage.getItem(AUTHOR_KEY) || "").trim();
    return name || null;
  } catch (err) {
    return null;
  }
}

function setAuthor(name) {
  const trimmed = String(name || "").trim();
  if (!trimmed) return null;
  try {
    localStorage.setItem(AUTHOR_KEY, trimmed);
  } catch (err) {}
  return trimmed;
}

function clearAuthor() {
  try {
    localStorage.removeItem(AUTHOR_KEY);
  } catch (err) {}
}

function closeAuthorModal(result) {
  const modal = document.getElementById("author-modal");
  if (modal) modal.hidden = true;
  const resolve = authorModalResolve;
  authorModalResolve = null;
  if (resolve) resolve(result);
}

function openAuthorModal() {
  return new Promise(function (resolve) {
    const modal = document.getElementById("author-modal");
    const input = document.getElementById("author-input");
    if (!modal || !input) {
      resolve(null);
      return;
    }
    if (authorModalResolve) {
      authorModalResolve(null);
    }
    authorModalResolve = resolve;
    input.value = "";
    modal.hidden = false;
    input.focus();
  });
}

async function ensureAuthor() {
  const existing = getAuthor();
  if (existing) return existing;
  const name = await openAuthorModal();
  if (!name) return null;
  return setAuthor(name);
}

function closeConfirmModal(result) {
  const modal = document.getElementById("confirm-modal");
  if (modal) modal.hidden = true;
  const resolve = confirmModalResolve;
  confirmModalResolve = null;
  if (resolve) resolve(!!result);
}

function openConfirmModal(options) {
  return new Promise(function (resolve) {
    const modal = document.getElementById("confirm-modal");
    const titleEl = document.getElementById("confirm-modal-title");
    const textEl = document.getElementById("confirm-modal-text");
    const okBtn = document.getElementById("confirm-modal-ok");
    if (!modal || !titleEl || !textEl || !okBtn) {
      resolve(false);
      return;
    }
    if (confirmModalResolve) confirmModalResolve(false);
    confirmModalResolve = resolve;
    titleEl.textContent = options.title || "Onay";
    textEl.textContent = options.message || "Emin misiniz?";
    okBtn.textContent = options.confirmLabel || "Sil";
    modal.hidden = false;
    okBtn.focus();
  });
}

function isAddPanelOpen() {
  return document.documentElement.classList.contains("add-panel-open");
}

function setAddPanelOpen(on) {
  document.documentElement.classList.toggle("add-panel-open", on);
  const btn = document.getElementById("btn-add");
  const panel = document.getElementById("col-add");
  const isMobile = window.matchMedia("(max-width: 860px)").matches;
  if (btn) {
    btn.setAttribute("aria-expanded", on ? "true" : "false");
    btn.disabled = !!(on && isMobile);
  }
  if (panel) panel.classList.toggle("active", on);
  try {
    localStorage.setItem(ADD_PANEL_FLAG, on ? "1" : "0");
  } catch (err) {}
}

function initAddPanel() {
  let open = false;
  try {
    const saved = localStorage.getItem(ADD_PANEL_FLAG);
    if (saved === "1") open = true;
    else if (saved === "0") open = false;
    else open = window.matchMedia("(min-width: 861px)").matches;
  } catch (err) {
    open = window.matchMedia("(min-width: 861px)").matches;
  }
  setAddPanelOpen(open);
  window.matchMedia("(max-width: 860px)").addEventListener("change", function () {
    setAddPanelOpen(isAddPanelOpen());
  });
}

async function loadReplies(noteId) {
  const res = await fetch(
    SUPABASE_URL +
      "/rest/v1/" +
      REPLIES_TABLE +
      "?note_id=eq." +
      noteId +
      "&deleted=eq.false&select=*&order=created_at.asc",
    {
      headers: headers(),
      cache: "no-store",
    }
  );
  if (!res.ok) return null;
  return res.json();
}

async function loadRepliesForNotes(noteIds) {
  if (!noteIds || !noteIds.length) return {};
  const res = await fetch(
    SUPABASE_URL +
      "/rest/v1/" +
      REPLIES_TABLE +
      "?note_id=in.(" +
      noteIds.join(",") +
      ")&deleted=eq.false&select=*&order=created_at.asc",
    {
      headers: headers(),
      cache: "no-store",
    }
  );
  if (!res.ok) return null;
  const rows = await res.json();
  const byNote = {};
  noteIds.forEach(function (id) {
    byNote[id] = [];
  });
  rows.forEach(function (row) {
    if (!byNote[row.note_id]) byNote[row.note_id] = [];
    byNote[row.note_id].push(row);
  });
  return byNote;
}

async function createReply(noteId, body, author) {
  const text = String(body || "").trim();
  const name = String(author || "").trim();
  const clientId = getClientId();
  if (!noteId || !text || !name || !clientId) return null;
  const res = await fetch(SUPABASE_URL + "/rest/v1/" + REPLIES_TABLE, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      note_id: noteId,
      body: text,
      author: name,
      author_client_id: clientId,
      deleted: false,
    }),
  });
  if (!res.ok) return null;
  const rows = await res.json();
  return rows[0] || null;
}

async function softDeleteReply(replyId) {
  const clientId = getClientId();
  if (!clientId) return false;
  const res = await fetch(
    SUPABASE_URL +
      "/rest/v1/" +
      REPLIES_TABLE +
      "?id=eq." +
      replyId +
      "&author_client_id=eq." +
      encodeURIComponent(clientId),
    {
      method: "PATCH",
      headers: headers(),
      body: JSON.stringify({
        deleted: true,
        deleted_at: new Date().toISOString(),
      }),
    }
  );
  if (!res.ok) return false;
  const rows = await res.json();
  return Array.isArray(rows) && rows.length > 0;
}

function imagePublicUrl(path) {
  return (
    SUPABASE_URL +
    "/storage/v1/object/public/" +
    IMAGES_BUCKET +
    "/" +
    path
  );
}

function makeImagePath(noteId, ext) {
  const id =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
  return noteId + "/" + id + "." + (ext || "jpg");
}

function getImageFileInfo(file) {
  if (!file) return null;
  const type = String(file.type || "").toLowerCase();
  const name = String(file.name || "").toLowerCase();
  if (
    type === "image/jpeg" ||
    type === "image/jpg" ||
    name.endsWith(".jpg") ||
    name.endsWith(".jpeg")
  ) {
    return { mime: "image/jpeg", ext: "jpg" };
  }
  if (type === "image/png" || name.endsWith(".png")) {
    return { mime: "image/png", ext: "png" };
  }
  return null;
}

async function loadImagesForNotes(noteIds) {
  if (!noteIds || !noteIds.length) return {};
  const res = await fetch(
    SUPABASE_URL +
      "/rest/v1/" +
      IMAGES_TABLE +
      "?note_id=in.(" +
      noteIds.join(",") +
      ")&deleted=eq.false&select=*&order=created_at.asc",
    {
      headers: headers(),
      cache: "no-store",
    }
  );
  if (!res.ok) return null;
  const rows = await res.json();
  const byNote = {};
  noteIds.forEach(function (id) {
    byNote[id] = [];
  });
  rows.forEach(function (row) {
    if (!byNote[row.note_id]) byNote[row.note_id] = [];
    byNote[row.note_id].push(row);
  });
  return byNote;
}

async function uploadNoteImage(noteId, file) {
  const clientId = getClientId();
  if (!noteId || !file || !clientId) {
    return { error: "Yükleme başlatılamadı." };
  }

  const current = imagesCache[noteId] || [];
  if (current.length >= MAX_NOTE_IMAGES) {
    return { error: "En fazla " + MAX_NOTE_IMAGES + " görsel eklenebilir." };
  }
  const info = getImageFileInfo(file);
  if (!info) {
    return { error: "Sadece JPG veya PNG yüklenebilir." };
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return { error: "Görsel en fazla 5 MB olabilir." };
  }

  const path = makeImagePath(noteId, info.ext);
  const uploadRes = await fetch(
    SUPABASE_URL + "/storage/v1/object/" + IMAGES_BUCKET + "/" + path,
    {
      method: "POST",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: "Bearer " + SUPABASE_KEY,
        "Content-Type": info.mime,
        "x-upsert": "false",
      },
      body: file,
    }
  );
  if (!uploadRes.ok) {
    return { error: "Dosya yüklenemedi." };
  }

  const metaRes = await fetch(SUPABASE_URL + "/rest/v1/" + IMAGES_TABLE, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      note_id: noteId,
      path: path,
      name: file.name || "image." + info.ext,
      size: file.size,
      mime: info.mime,
      author_client_id: clientId,
      deleted: false,
    }),
  });
  if (!metaRes.ok) {
    return { error: "Görsel kaydı oluşturulamadı." };
  }
  const rows = await metaRes.json();
  return { row: rows[0] || null };
}

async function hardDeleteNoteImage(image) {
  const clientId = getClientId();
  if (!clientId || !image || !image.id) return false;

  const res = await fetch(
    SUPABASE_URL +
      "/rest/v1/" +
      IMAGES_TABLE +
      "?id=eq." +
      image.id +
      "&author_client_id=eq." +
      encodeURIComponent(clientId),
    {
      method: "DELETE",
      headers: headers(),
    }
  );
  if (!res.ok) return false;
  const rows = await res.json().catch(function () {
    return null;
  });
  if (Array.isArray(rows) && rows.length === 0) return false;

  if (image.path) {
    await fetch(
      SUPABASE_URL +
        "/storage/v1/object/" +
        IMAGES_BUCKET +
        "/" +
        String(image.path)
          .split("/")
          .map(encodeURIComponent)
          .join("/"),
      {
        method: "DELETE",
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: "Bearer " + SUPABASE_KEY,
        },
      }
    );
  }

  return true;
}

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
  if (view === "open") {
    delete document.documentElement.dataset.view;
  } else {
    document.documentElement.dataset.view = view;
  }
  document.querySelectorAll(".view-dropdown-option").forEach(function (btn) {
    const active = btn.getAttribute("data-view") === view;
    btn.classList.toggle("active", active);
    btn.setAttribute("aria-selected", active ? "true" : "false");
  });
}

function initView() {
  try {
    const saved = localStorage.getItem(VIEW_FLAG);
    if (VIEW_KEYS.indexOf(saved) !== -1) return saved;
  } catch (err) {}
  return "open";
}

function saveView(nextView) {
  view = nextView;
  try {
    localStorage.setItem(VIEW_FLAG, nextView);
  } catch (err) {}
  if (nextView === "open") {
    delete document.documentElement.dataset.view;
  } else {
    document.documentElement.dataset.view = nextView;
  }
}

function setView(nextView) {
  closeViewDropdown();
  if (view === nextView) return;
  resetEditingState();
  closeReplies();
  saveView(nextView);
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
  if (!isDev) {
    try {
      localStorage.removeItem(EDIT_FLAG);
    } catch (err) {}
    document.documentElement.classList.remove("edit-enabled");
    const input = document.getElementById("edit-enabled");
    if (input) input.checked = false;
    return false;
  }
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

function getTempDoneCount(openItems) {
  if (!isDev) return 0;
  const ids = getTempDone();
  return openItems.filter(function (item) {
    return ids.has(item.id);
  }).length;
}

function openCountBadgeHtml(openCount, tempDoneCount) {
  let html = "";
  if (isDev && tempDoneCount > 0) {
    html +=
      '<span class="count-badge-part">' +
      '<span class="count-badge-num">' +
      tempDoneCount +
      '</span><span class="count-badge-icon-dev" aria-hidden="true">' +
      '<i data-lucide="circle-dashed" class="icon icon--count icon--count-dev"></i>' +
      '<i data-lucide="check" class="icon icon--count-dev-mark"></i>' +
      "</span></span>" +
      '<span class="count-badge-sep" aria-hidden="true">-</span>';
  }
  html +=
    '<span class="count-badge-part">' +
    '<span class="count-badge-num">' +
    openCount +
    '</span><i data-lucide="circle-check" class="icon icon--count" aria-hidden="true"></i>' +
    "</span>";
  return html;
}

function bulkActionBtnHtml(icon, label, count) {
  const text = count != null ? label + " ( " + count + " )" : label;
  return (
    '<i data-lucide="' +
    icon +
    '" class="icon icon--bulk" aria-hidden="true"></i>' +
    "<span>" +
    escapeHtml(text) +
    "</span>"
  );
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

function focusReplyEditor() {
  if (!repliesOpenId || editingId) return;
  const textarea = document.querySelector(
    '.reply-edit[data-id="' + repliesOpenId + '"]'
  );
  if (!textarea) return;
  autoResizeTextarea(textarea);
  textarea.focus();
  textarea.setSelectionRange(textarea.value.length, textarea.value.length);
}

function formatReplyDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function replyItemHtml(reply) {
  const canDelete = isOwnReply(reply);
  const deleting = replyDeletingId === reply.id;
  const deleteBtn = canDelete
    ? '<button type="button" class="reply-delete' +
      (deleting ? " is-loading" : "") +
      '" data-reply-id="' +
      reply.id +
      '" data-note-id="' +
      reply.note_id +
      '" title="Sil" aria-label="Cevabı sil"' +
      (deleting ? " disabled" : "") +
      ">" +
      '<i data-lucide="trash-2" class="icon icon--reply-delete" aria-hidden="true"></i>' +
      '<span class="reply-delete-spinner" aria-hidden="true"></span>' +
      "</button>"
    : "";

  return (
    '<div class="reply-item">' +
    '<div class="reply-meta">' +
    '<span class="reply-author">' +
    escapeHtml(reply.author) +
    "</span>" +
    '<span class="reply-meta-right">' +
    '<span class="reply-date">' +
    escapeHtml(formatReplyDate(reply.created_at)) +
    "</span>" +
    deleteBtn +
    "</span>" +
    "</div>" +
    '<p class="reply-body">' +
    escapeHtml(reply.body) +
    "</p>" +
    "</div>"
  );
}

function noteImageItemHtml(image) {
  const canDelete = isOwnImage(image);
  const deleting = imageDeletingId === image.id;
  const url = imagePublicUrl(image.path);
  const deleteBtn = canDelete
    ? '<button type="button" class="note-image-delete' +
      (deleting ? " is-loading" : "") +
      '" data-image-id="' +
      image.id +
      '" data-note-id="' +
      image.note_id +
      '" title="Sil" aria-label="Görseli sil"' +
      (deleting ? " disabled" : "") +
      ">" +
      '<i data-lucide="trash-2" class="icon icon--note-image-delete" aria-hidden="true"></i>' +
      '<span class="note-image-delete-spinner" aria-hidden="true"></span>' +
      "</button>"
    : "";

  return (
    '<div class="note-image-item' +
    (canDelete ? " is-own" : "") +
    '">' +
    '<button type="button" class="note-image-open" data-url="' +
    escapeHtml(url) +
    '" data-name="' +
    escapeHtml(image.name || "Görsel") +
    '" title="Önizle" aria-label="Görseli önizle">' +
    '<img src="' +
    escapeHtml(url) +
    '" alt="' +
    escapeHtml(image.name || "Görsel") +
    '" loading="lazy" />' +
    "</button>" +
    deleteBtn +
    "</div>"
  );
}

function openImagePreview(url, name) {
  const modal = document.getElementById("image-modal");
  const img = document.getElementById("image-modal-img");
  const fullBtn = document.getElementById("image-modal-full");
  if (!modal || !img || !fullBtn || !url) return;
  img.src = url;
  img.alt = name || "Görsel";
  fullBtn.href = url;
  modal.hidden = false;
}

function closeImagePreview() {
  const modal = document.getElementById("image-modal");
  const img = document.getElementById("image-modal-img");
  const fullBtn = document.getElementById("image-modal-full");
  if (modal) modal.hidden = true;
  if (img) {
    img.removeAttribute("src");
    img.alt = "";
  }
  if (fullBtn) fullBtn.removeAttribute("href");
}

function noteImagesSectionHtml(item) {
  const images = imagesCache[item.id] || [];
  const count = images.length;
  const isFull = count >= MAX_NOTE_IMAGES;
  const canAdd = !isFull && !imageUploading;
  const toggleLabel = isFull
    ? "Görseller"
    : "Görsel Ekle · " + count + "/" + MAX_NOTE_IMAGES;

  let gridHtml = "";
  if (imagesGridOpen) {
    const cells = images.map(noteImageItemHtml).join("");
    const addCell = canAdd
      ? '<button type="button" class="note-image-add" data-id="' +
        item.id +
        '" title="Görsel ekle" aria-label="Görsel ekle"' +
        (imageUploading ? " disabled" : "") +
        ">" +
        '<i data-lucide="plus" class="icon icon--note-image-add" aria-hidden="true"></i>' +
        "<span>Ekle</span>" +
        "</button>"
      : "";
    const hintHtml = !isFull
      ? '<p class="note-images-hint">JPG / PNG · max ' +
        MAX_NOTE_IMAGES +
        " · 5 MB</p>"
      : "";
    gridHtml =
      '<div class="note-images-grid">' +
      cells +
      addCell +
      (imageUploading
        ? '<div class="note-images-uploading">Yükleniyor...</div>'
        : "") +
      "</div>" +
      hintHtml;
  }

  return (
    '<div class="note-images">' +
    '<button type="button" class="note-images-toggle' +
    (imagesGridOpen ? " is-open" : "") +
    '" data-id="' +
    item.id +
    '" aria-expanded="' +
    (imagesGridOpen ? "true" : "false") +
    '">' +
    '<i data-lucide="image" class="icon icon--note-images" aria-hidden="true"></i>' +
    "<span>" +
    escapeHtml(toggleLabel) +
    "</span>" +
    '<i data-lucide="chevron-down" class="icon icon--note-images-chevron" aria-hidden="true"></i>' +
    "</button>" +
    gridHtml +
    '<input type="file" class="note-image-file" data-id="' +
    item.id +
    '" accept="image/jpeg,image/png,.jpg,.jpeg,.png" hidden />' +
    "</div>"
  );
}

function repliesPanelHtml(item) {
  if (repliesOpenId !== item.id) return "";

  const cached = repliesCache[item.id];
  let listHtml = "";
  if (replyLoading && cached == null) {
    listHtml = '<p class="replies-status">Yükleniyor...</p>';
  } else if (!cached || !cached.length) {
    listHtml = '<p class="replies-status">Henüz cevap yok.</p>';
  } else {
    listHtml =
      '<div class="replies-list">' +
      cached.map(replyItemHtml).join("") +
      "</div>";
  }

  const canSend = !!replyDraft.trim() && !replySaving;
  const replyFormHtml =
    view === "archive"
      ? ""
      : '<div class="reply-form">' +
        '<textarea class="reply-edit" data-id="' +
        item.id +
        '" rows="1" placeholder="Cevap yaz..."' +
        (replySaving ? " disabled" : "") +
        ">" +
        escapeTextarea(replyDraft) +
        "</textarea>" +
        '<button type="button" class="reply-send' +
        (replySaving ? " is-loading" : "") +
        '" data-id="' +
        item.id +
        '" title="Gönder" aria-label="Gönder"' +
        (canSend ? "" : " disabled") +
        ">" +
        '<i data-lucide="send" class="icon icon--reply-send" aria-hidden="true"></i>' +
        '<span class="reply-send-spinner" aria-hidden="true"></span>' +
        "</button>" +
        "</div>";

  return (
    '<div class="item-replies">' +
    noteImagesSectionHtml(item) +
    listHtml +
    replyFormHtml +
    "</div>"
  );
}

async function toggleReplies(id) {
  if (repliesOpenId === id) {
    closeReplies();
    render();
    return;
  }

  repliesOpenId = id;
  replyDraft = "";
  replySaving = false;
  imagesGridOpen = false;

  if (repliesCache[id] != null) {
    render();
    focusReplyEditor();
    return;
  }

  replyLoading = true;
  render();
  const rows = await loadReplies(id);
  if (repliesOpenId !== id) return;
  replyLoading = false;
  repliesCache[id] = rows || [];
  render();
  focusReplyEditor();
}

function toggleImagesGrid() {
  imagesGridOpen = !imagesGridOpen;
  render();
}

async function handleNoteImageSelected(noteId, file) {
  if (!file || imageUploading || repliesOpenId !== noteId) return;

  imageUploading = true;
  render();

  const result = await uploadNoteImage(noteId, file);
  imageUploading = false;

  if (result.error || !result.row) {
    render();
    if (result.error) window.alert(result.error);
    return;
  }

  if (!imagesCache[noteId]) imagesCache[noteId] = [];
  const row = result.row;
  if (row && !row.author_client_id) {
    row.author_client_id = getClientId();
  }
  imagesCache[noteId].push(row);
  imagesGridOpen = true;
  render();
}

async function deleteNoteImage(imageId, noteId) {
  if (imageDeletingId) return;
  const list = imagesCache[noteId] || [];
  const image = list.find(function (entry) {
    return entry.id === imageId;
  });
  if (!image || !isOwnImage(image)) return;

  const confirmed = await openConfirmModal({
    title: "Görseli sil",
    message: "Bu görseli silmek istediğine emin misin?",
    confirmLabel: "Sil",
  });
  if (!confirmed) return;

  imageDeletingId = imageId;
  render();

  const ok = await hardDeleteNoteImage(image);
  imageDeletingId = null;

  if (!ok) {
    render();
    return;
  }

  imagesCache[noteId] = list.filter(function (entry) {
    return entry.id !== imageId;
  });
  render();
}

async function submitReply(id) {
  if (replySaving || repliesOpenId !== id) return;

  const textarea = document.querySelector('.reply-edit[data-id="' + id + '"]');
  const text = (textarea ? textarea.value : replyDraft).trim();
  if (!text) return;

  replyDraft = text;
  const author = await ensureAuthor();
  if (!author) {
    focusReplyEditor();
    return;
  }

  replySaving = true;
  render();

  const row = await createReply(id, text, author);
  replySaving = false;

  if (!row) {
    render();
    focusReplyEditor();
    return;
  }

  if (!repliesCache[id]) repliesCache[id] = [];
  repliesCache[id].push(row);
  replyDraft = "";
  const liveTextarea = document.querySelector('.reply-edit[data-id="' + id + '"]');
  if (liveTextarea) liveTextarea.value = "";
  render();
  focusReplyEditor();
}

async function deleteReply(replyId, noteId) {
  if (replyDeletingId) return;
  const list = repliesCache[noteId] || [];
  const reply = list.find(function (entry) {
    return entry.id === replyId;
  });
  if (!reply || !isOwnReply(reply)) return;

  const confirmed = await openConfirmModal({
    title: "Cevabı sil",
    message: "Bu cevabı silmek istediğine emin misin?",
    confirmLabel: "Sil",
  });
  if (!confirmed) return;

  replyDeletingId = replyId;
  render();

  const ok = await softDeleteReply(replyId);
  replyDeletingId = null;

  if (!ok) {
    render();
    return;
  }

  repliesCache[noteId] = list.filter(function (entry) {
    return entry.id !== replyId;
  });
  render();
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
  archive: "archive-x",
};

const VIEW_LUCIDE_ICONS = {
  open: "clipboard",
  done: "package",
  archive: "archive",
};

function emptyStateIcon(viewMode, iconName) {
  const name =
    iconName || EMPTY_LUCIDE_ICONS[viewMode] || EMPTY_LUCIDE_ICONS.open;
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

function itemHtml(item, checked, viewMode, displayOrder) {
  const showTemp = isDev && viewMode === null;
  const tempChecked = showTemp && isTempDone(item);
  const isArchiveView = viewMode === "archive";
  const isDoneView = viewMode === "done";
  const replyOpen = repliesOpenId === item.id;
  const replyCount = (repliesCache[item.id] || []).length;
  const tempBox = showTemp
    ? '<label class="check-wrap" title="Geçici (yalnızca bu tarayıcı)">' +
      '<input type="checkbox" data-temp="1" data-id="' +
      item.id +
      '"' +
      (tempChecked ? " checked" : "") +
      ">" +
      '<span class="check check-temp">' +
      '<i data-lucide="check" class="icon icon--temp-check" aria-hidden="true"></i>' +
      "</span>" +
      "</label>"
    : "";
  const numHtml =
    viewMode === "done" || viewMode === "archive"
      ? '<span class="num num-dates" tabindex="0">' +
        displayOrder +
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
        : '<span class="num">' + displayOrder + "</span>";
  let checkClass = "check";
  let checkInner = "";
  let checkTitle = "";

  if (isArchiveView) {
    checkClass = "check check-undo";
    checkInner =
      '<i data-lucide="package-check" class="icon icon--item-action" aria-hidden="true"></i>';
    checkTitle = "Geri al";
  } else if (isDoneView) {
    checkClass = "check check-restore";
    checkInner =
      '<i data-lucide="clipboard-copy" class="icon icon--item-action" aria-hidden="true"></i>';
    checkTitle = "Açığa al";
  }

  const replyBtn = isArchiveView
    ? ""
    : '<button type="button" class="reply-toggle' +
      (replyOpen ? " is-open" : "") +
      '" data-id="' +
      item.id +
      '" title="Cevaplar" aria-label="Cevaplar" aria-expanded="' +
      (replyOpen ? "true" : "false") +
      '">' +
      '<i data-lucide="message-circle" class="icon icon--reply" aria-hidden="true"></i>' +
      (replyCount > 0
        ? '<span class="reply-count">' + replyCount + "</span>"
        : "") +
      "</button>";

  return (
    '<div class="item' +
    (tempChecked ? " item-temp" : "") +
    (viewMode === null && editingId === item.id ? " item-editing" : "") +
    (!isArchiveView && replyOpen ? " item-replies-open" : "") +
    (textExpandedId === item.id ? " item-text-expanded" : "") +
    '">' +
    '<div class="item-row">' +
    numHtml +
    bodyHtml(item, viewMode) +
    tempBox +
    '<label class="check-wrap"' +
    (checkTitle ? ' title="' + checkTitle + '"' : "") +
    ">" +
    '<input type="checkbox" data-id="' +
    item.id +
    '"' +
    (checked ? " checked" : "") +
    ">" +
    '<span class="' +
    checkClass +
    '">' +
    checkInner +
    "</span>" +
    "</label>" +
    replyBtn +
    "</div>" +
    (isArchiveView ? "" : repliesPanelHtml(item)) +
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
  const countEl = document.getElementById("count");
  const bulkBtn = document.getElementById("btn-archive-all");
  const showBulkAction =
    hasItems &&
    ((view === "done" && doneItems.length > 0) ||
      (view === "archive" && archivedItems.length > 0));
  const showOpenCount = hasItems && view === "open";

  if (countMeta) countMeta.hidden = !showOpenCount && !showBulkAction;

  if (showOpenCount) {
    const tempDoneCount = getTempDoneCount(openItems);
    let ariaLabel = shown.length + " madde";
    if (tempDoneCount > 0) {
      ariaLabel = tempDoneCount + " geçici tamamlanan, " + ariaLabel;
    }
    countEl.hidden = false;
    countEl.classList.add("is-visible");
    countEl.setAttribute("aria-label", ariaLabel);
    countEl.innerHTML = openCountBadgeHtml(shown.length, tempDoneCount);
    hydrateIcons(countEl);
  } else {
    countEl.hidden = true;
    countEl.classList.remove("is-visible");
    countEl.removeAttribute("aria-label");
    countEl.innerHTML = "";
  }

  bulkBtn.hidden = !showBulkAction;
  if (view === "archive") {
    bulkBtn.innerHTML = bulkActionBtnHtml(
      "package-plus",
      "Geri Al",
      archivedItems.length
    );
    hydrateIcons(bulkBtn);
  } else if (view === "done") {
    bulkBtn.innerHTML = bulkActionBtnHtml(
      "archive-restore",
      "Arşive Taşı",
      doneItems.length
    );
    hydrateIcons(bulkBtn);
  } else {
    bulkBtn.innerHTML = bulkActionBtnHtml("archive-restore", "Arşive Taşı");
    hydrateIcons(bulkBtn);
  }

  const dateView = view === "done" || view === "archive" ? view : null;

  if (editingId) {
    const textarea = document.querySelector(
      '.item-edit[data-id="' + editingId + '"]'
    );
    if (textarea) editingDraft = textarea.value;
  }

  list.innerHTML = shown.length
    ? shown
        .map(function (item, index) {
          return itemHtml(
            item,
            item.done || item.archived,
            dateView,
            index + 1
          );
        })
        .join("")
    : emptyStateHtml(view);

  hydrateIcons(list);

  focusEditor();
  if (!editingId) focusReplyEditor();
}

function showListLoading() {
  const list = document.getElementById("list");
  const countMeta = document.querySelector(".count-meta");
  if (countMeta) countMeta.hidden = true;
  list.innerHTML =
    '<div class="list-empty list-loading" role="status" aria-live="polite" aria-busy="true">' +
    '<span class="list-loading-spinner" aria-hidden="true"></span>' +
    '<span class="list-loading-text">Yükleniyor...</span>' +
    "</div>";
}

async function load() {
  showListLoading();
  try {
    const res = await fetch(
      SUPABASE_URL + "/rest/v1/" + TABLE + "?select=*&order=sort_order.asc",
      {
        headers: headers(),
        cache: "no-store",
      }
    );
    if (!res.ok) {
      document.getElementById("list").innerHTML =
        '<p class="list-error">Liste yüklenemedi.</p>';
      return;
    }
    items = await res.json();
    pruneTempDone();

    const ids = items.map(function (item) {
      return item.id;
    });
    if (repliesOpenId != null && ids.indexOf(repliesOpenId) === -1) {
      closeReplies();
    }

    const byNote = await loadRepliesForNotes(ids);
    if (byNote) repliesCache = byNote;

    const byImages = await loadImagesForNotes(ids);
    if (byImages) imagesCache = byImages;

    render();
  } catch (err) {
    document.getElementById("list").innerHTML =
      '<p class="list-error">Liste yüklenemedi.</p>';
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
  if (saveBtn) {
    commitEdit(Number(saveBtn.getAttribute("data-id")));
    return;
  }

  const textEl = e.target.closest(".item-text");
  if (textEl && (!editEnabled || view !== "open")) {
    const bodyEl = textEl.closest(".item-body");
    if (bodyEl) {
      const id = Number(bodyEl.getAttribute("data-id"));
      textExpandedId = textExpandedId === id ? null : id;
      render();
      return;
    }
  }

  const replyToggle = e.target.closest(".reply-toggle");
  if (replyToggle) {
    toggleReplies(Number(replyToggle.getAttribute("data-id")));
    return;
  }

  const replySend = e.target.closest(".reply-send");
  if (replySend) {
    submitReply(Number(replySend.getAttribute("data-id")));
    return;
  }

  const replyDelete = e.target.closest(".reply-delete");
  if (replyDelete) {
    deleteReply(
      Number(replyDelete.getAttribute("data-reply-id")),
      Number(replyDelete.getAttribute("data-note-id"))
    );
    return;
  }

  const imagesToggle = e.target.closest(".note-images-toggle");
  if (imagesToggle) {
    toggleImagesGrid();
    return;
  }

  const imageAdd = e.target.closest(".note-image-add");
  if (imageAdd) {
    const noteId = Number(imageAdd.getAttribute("data-id"));
    const input = document.querySelector(
      '.note-image-file[data-id="' + noteId + '"]'
    );
    if (input && !imageUploading) input.click();
    return;
  }

  const imageOpen = e.target.closest(".note-image-open");
  if (imageOpen) {
    openImagePreview(
      imageOpen.getAttribute("data-url"),
      imageOpen.getAttribute("data-name")
    );
    return;
  }

  const imageDelete = e.target.closest(".note-image-delete");
  if (imageDelete) {
    e.preventDefault();
    e.stopPropagation();
    deleteNoteImage(
      Number(imageDelete.getAttribute("data-image-id")),
      Number(imageDelete.getAttribute("data-note-id"))
    );
  }
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
  if (e.target.classList.contains("item-edit")) {
    editingDraft = e.target.value;
    autoResizeTextarea(e.target);
    return;
  }
  if (e.target.classList.contains("reply-edit")) {
    replyDraft = e.target.value;
    autoResizeTextarea(e.target);
    const sendBtn = e.target
      .closest(".reply-form")
      .querySelector(".reply-send");
    if (sendBtn && !replySaving) {
      sendBtn.disabled = !replyDraft.trim();
    }
  }
});

document.getElementById("list").addEventListener("keydown", function (e) {
  if (e.target.classList.contains("item-edit")) {
    if (e.key === "Escape") {
      e.preventDefault();
      cancelEdit();
    }
    return;
  }
  if (!e.target.classList.contains("reply-edit")) return;
  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
    e.preventDefault();
    submitReply(Number(e.target.getAttribute("data-id")));
  }
});

document.getElementById("list").addEventListener("change", async function (e) {
  if (e.target.classList.contains("note-image-file")) {
    const noteId = Number(e.target.getAttribute("data-id"));
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (file) handleNoteImageSelected(noteId, file);
    return;
  }
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
  if (repliesOpenId === id) closeReplies();
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

  const confirmModal = document.getElementById("confirm-modal");
  if (confirmModal && !confirmModal.hidden) {
    closeConfirmModal(false);
    return;
  }

  const imageModal = document.getElementById("image-modal");
  if (imageModal && !imageModal.hidden) {
    closeImagePreview();
    return;
  }

  const authorModal = document.getElementById("author-modal");
  if (authorModal && !authorModal.hidden) {
    closeAuthorModal(null);
    return;
  }

  const menu = document.getElementById("view-dropdown-menu");
  if (menu && !menu.hidden) {
    closeViewDropdown();
  }
});

document.getElementById("author-modal-cancel").addEventListener("click", function () {
  closeAuthorModal(null);
});

document.getElementById("author-modal-save").addEventListener("click", function () {
  const input = document.getElementById("author-input");
  const name = input ? input.value.trim() : "";
  if (!name) {
    if (input) input.focus();
    return;
  }
  closeAuthorModal(name);
});

document.getElementById("author-form").addEventListener("submit", function (e) {
  e.preventDefault();
  document.getElementById("author-modal-save").click();
});

document.getElementById("author-modal").addEventListener("click", function (e) {
  if (e.target === this) closeAuthorModal(null);
});

document.getElementById("confirm-modal-cancel").addEventListener("click", function () {
  closeConfirmModal(false);
});

document.getElementById("confirm-modal-ok").addEventListener("click", function () {
  closeConfirmModal(true);
});

document.getElementById("confirm-modal").addEventListener("click", function (e) {
  if (e.target === this) closeConfirmModal(false);
});

document.getElementById("image-modal-close").addEventListener("click", function () {
  closeImagePreview();
});

document.getElementById("image-modal").addEventListener("click", function (e) {
  if (e.target === this) closeImagePreview();
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
      saveView("done");
      resetEditingState();
      closeReplies();
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
    saveView("archive");
    resetEditingState();
    closeReplies();
    await load();
  });

document.getElementById("btn-add").addEventListener("click", function () {
  if (this.disabled) return;
  setAddPanelOpen(true);
});

document.getElementById("btn-add-close").addEventListener("click", function () {
  setAddPanelOpen(false);
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
  saveView("open");
  await load();
});

getClientId();
initAddPanel();
load();
updateEditModeUi();
hydrateIcons(document.querySelector(".page-title"));
hydrateIcons(document.getElementById("view-dropdown"));
hydrateIcons(document.querySelector(".edit-mode"));
hydrateIcons(document.getElementById("btn-add"));
hydrateIcons(document.getElementById("col-add"));
