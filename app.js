/* =====================================================
   YPEDIA — APP.JS
   Ivory Champagne Edition
===================================================== */

"use strict";

(() => {
  const Store = window.YpediaStorage;

  const $ = (selector, parent = document) =>
    parent.querySelector(selector);

  const $$ = (selector, parent = document) =>
    [...parent.querySelectorAll(selector)];

  const PAGE_TITLES = {
    dashboard: "Dashboard",
    summaries: "Rangkuman",
    schedule: "Jadwal",
    music: "Koleksi Musik",
    memories: "Kenangan",
    journal: "Jurnal Pribadi",
    favorites: "Favorit",
    progress: "Progres Belajar",
    profile: "Profil Saya",
    settings: "Pengaturan"
  };

  const state = {
    currentPage: "dashboard",
    summaries: [],
    schedules: [],
    memories: [],
    journals: [],
    favorites: [],
    progress: [],
    profile: { name: "Yogi", bio: "", school: "" },
    settings: { theme: "light" }
  };

  const objectURLs = new Set();

  function createId() {
    return window.crypto?.randomUUID?.() ||
      `ypedia-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]);
  }

  function formatDate(value) {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";

    return date.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric"
    });
  }

  function showToast(message, type = "success") {
    let toast = $("#ypediaToast");

    if (!toast) {
      toast = document.createElement("div");
      toast.id = "ypediaToast";
      toast.className = "toast";
      document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.dataset.type = type;
    toast.classList.add("show");

    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => {
      toast.classList.remove("show");
    }, 2800);
  }

  window.showToast = showToast;

  function saveData(key) {
    const result = Store?.saveData(key, state[key]);

    if (!result) {
      showToast("Gagal menyimpan data. Periksa ruang penyimpanan.", "error");
      return false;
    }

    return true;
  }

  function loadAllData() {
    if (!Store) return;

    const keys = [
      "summaries", "schedules", "memories", "journals",
      "favorites", "progress", "profile", "settings"
    ];

    keys.forEach(key => {
      const saved = Store.getData(key, null);
      if (saved !== null && saved !== undefined) {
        state[key] = saved;
      }
    });

    [
      "summaries", "schedules", "memories", "journals",
      "favorites", "progress"
    ].forEach(key => {
      if (!Array.isArray(state[key])) state[key] = [];
    });

    if (!state.profile || typeof state.profile !== "object") {
      state.profile = { name: "Yogi", bio: "", school: "" };
    }

    if (!state.settings || typeof state.settings !== "object") {
      state.settings = { theme: "light" };
    }

    if (!["light", "dark"].includes(state.settings.theme)) {
      state.settings.theme = "light";
    }
  }

  function containerFor(id) {
    return $(`#${id}`);
  }

  function emptyState(message) {
    return `<p class="empty-state">${escapeHTML(message)}</p>`;
  }

  function cardActions(buttons) {
    return `<div class="card-actions">${buttons}</div>`;
  }

  function openModal(title, content) {
    let modal = $("#ypediaModal");

    if (!modal) {
      modal = document.createElement("div");
      modal.id = "ypediaModal";
      modal.className = "modal-overlay";
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
      <div class="modal-content" role="dialog" aria-modal="true">
        <div class="modal-header">
          <h2>${escapeHTML(title)}</h2>
          <button type="button" data-action="close-modal"
            aria-label="Tutup">×</button>
        </div>
        <div class="modal-body">${content}</div>
      </div>
    `;

    modal.classList.add("active");
  }

  function closeModal() {
    $("#ypediaModal")?.classList.remove("active");
  }

  function openReader(title, content) {
    openModal(
      title,
      `
        <article class="reader-content">
          <div class="reader-text">${escapeHTML(content).replace(/\n/g, "<br>")}</div>
          <button type="button" class="primary-button"
            data-action="close-modal">Tutup Bacaan</button>
        </article>
      `
    );
  }

  function openEditor(title, formHTML) {
    openModal(title, formHTML);
  }

  // LOGIN DAN LOADING

  function showLogin() {
    $("#loadingScreen")?.classList.add("hidden");

    const loading = $("#loadingScreen");
    if (loading) loading.style.display = "none";

    const app = $("#appScreen");
    if (app) {
      app.classList.add("hidden");
      app.style.display = "none";
    }

    const login = $("#loginScreen");
    if (login) {
      login.classList.remove("hidden");
      login.style.display = "flex";
    }
  }

  function showApp() {
    const loading = $("#loadingScreen");
    if (loading) {
      loading.classList.add("hidden");
      loading.style.display = "none";
    }

    const login = $("#loginScreen");
    if (login) {
      login.classList.add("hidden");
      login.style.display = "none";
    }

    const app = $("#appScreen");

    if (app) {
      app.classList.remove("hidden");
      app.style.display = "flex";
    }

    renderAll();
    openPage(state.currentPage);

    window.YpediaMusic?.init();
  }

  function setupLogin() {
    $("#togglePassword")?.addEventListener("click", () => {
      const input = $("#password");
      if (!input) return;

      const hidden = input.type === "password";
      input.type = hidden ? "text" : "password";
      $("#togglePassword").textContent = hidden ? "Sembunyikan" : "Lihat";
    });

    $("#loginForm")?.addEventListener("submit", event => {
      event.preventDefault();

      const username = $("#username")?.value.trim();
      const password = $("#password")?.value;
      const error = $("#loginError");

      // Login sederhana untuk penggunaan lokal.
      if (username === "yogi" && password === "ypedia123") {
        sessionStorage.setItem("ypedia_logged_in", "true");
        if (error) error.textContent = "";
        showApp();
      } else if (error) {
        error.textContent = "Username atau password salah.";
      }
    });
  }

  function setupLoading() {
    const screen = $("#loadingScreen");

    if (!screen) {
      sessionStorage.getItem("ypedia_logged_in") === "true"
        ? showApp()
        : showLogin();
      return;
    }

    screen.classList.remove("hidden");
    screen.style.display = "flex";

    let progress = 0;

    const interval = setInterval(() => {
      progress = Math.min(progress + 10, 100);

      if ($("#loadingBar")) $("#loadingBar").style.width = `${progress}%`;
      if ($("#loadingPercent")) $("#loadingPercent").textContent = `${progress}%`;

      if ($("#loadingText")) {
        $("#loadingText").textContent =
          progress < 100 ? "Menyiapkan ruang digital..." : "Selesai!";
      }

      if (progress >= 100) {
        clearInterval(interval);

        sessionStorage.getItem("ypedia_logged_in") === "true"
          ? showApp()
          : showLogin();
      }
    }, 70);
  }

  function logout() {
    sessionStorage.removeItem("ypedia_logged_in");
    closeModal();
    showLogin();
    showToast("Kamu berhasil keluar.");
  }

  // NAVIGASI

  function closeSidebar() {
    $(".sidebar")?.classList.remove("open");
    $(".sidebar-overlay")?.classList.remove("active");
    $("#menuButton")?.setAttribute("aria-expanded", "false");
  }

  function openPage(page) {
    if (!PAGE_TITLES[page]) return;

    state.currentPage = page;

    $$(".page").forEach(section => section.classList.remove("active"));
    $(`#page-${page}`)?.classList.add("active");

    $$("[data-page]").forEach(button => {
      button.classList.toggle("active", button.dataset.page === page);
    });

    if ($("#pageTitle")) $("#pageTitle").textContent = PAGE_TITLES[page];

    closeSidebar();
    renderPage(page);
  }

  function setupNavigation() {
    $$("[data-page]").forEach(button => {
      button.addEventListener("click", () => openPage(button.dataset.page));
    });

    $$("[data-open]").forEach(button => {
      button.addEventListener("click", () => openPage(button.dataset.open));
    });

    $("#logoutButton")?.addEventListener("click", logout);

    const menu = $("#menuButton");
    const sidebar = $(".sidebar");
    const overlay = $(".sidebar-overlay");

    menu?.addEventListener("click", () => {
      const open = sidebar?.classList.toggle("open");
      overlay?.classList.toggle("active", Boolean(open));
      menu.setAttribute("aria-expanded", String(Boolean(open)));
    });

    overlay?.addEventListener("click", closeSidebar);

    window.addEventListener("resize", () => {
      if (window.innerWidth > 700) closeSidebar();
    });
  }

  // DASHBOARD

  function renderDashboard() {
    const setText = (id, value) => {
      if ($(`#${id}`)) $(`#${id}`).textContent = value;
    };

    setText("summaryCount", state.summaries.length);
    setText(
      "scheduleCount",
      state.schedules.filter(item => !item.completed).length
    );
    setText("memoryCount", state.memories.length);
    setText(
      "musicCount",
      window.YpediaMusic?.getTrackCount?.() ?? 7
    );

    const recent = $("#recentActivity");
    if (!recent) return;

    const activities = [
      ...state.summaries.map(item => ({
        title: item.title,
        type: "Catatan",
        date: item.createdAt
      })),
      ...state.journals.map(item => ({
        title: item.title,
        type: "Jurnal",
        date: item.createdAt
      })),
      ...state.memories.map(item => ({
        title: item.title,
        type: "Kenangan",
        date: item.createdAt
      }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);

    recent.innerHTML = activities.length
      ? activities.map(item => `
          <div class="activity-item">
            <strong>${escapeHTML(item.title)}</strong>
            <small>${escapeHTML(item.type)} · ${formatDate(item.date)}</small>
          </div>
        `).join("")
      : emptyState("Belum ada aktivitas. Mulai bangun ruang pribadimu.");
  }

  // CATATAN

  function renderSummaries() {
    const container = containerFor("summariesContent");
    if (!container) return;

    container.innerHTML = `
      <section class="content-form">
        <h2>Tambah Catatan</h2>
        <form data-form="summary">
          <input name="title" placeholder="Judul catatan"
            maxlength="100" required>
          <input name="category" placeholder="Kategori" maxlength="50">
          <textarea name="content" rows="5"
            placeholder="Tulis isi catatan..." required></textarea>
          <button type="submit" class="primary-button">Simpan Catatan</button>
        </form>
      </section>

      <section class="content-list">
        <h2>Daftar Catatan (${state.summaries.length})</h2>
        ${
          state.summaries.length
            ? state.summaries.map(item => `
              <article class="content-card">
                <h3>${escapeHTML(item.title)}</h3>
                <small>${escapeHTML(item.category || "Umum")} · ${formatDate(item.createdAt)}</small>
                <p>${escapeHTML(item.content.slice(0, 160))}${item.content.length > 160 ? "..." : ""}</p>
                ${cardActions(`
                  <button data-action="read-summary" data-id="${escapeHTML(item.id)}">Baca</button>
                  <button data-action="edit-summary" data-id="${escapeHTML(item.id)}">Edit</button>
                  <button data-action="favorite-summary" data-id="${escapeHTML(item.id)}">${item.favorite ? "Hapus Favorit" : "Jadikan Favorit"}</button>
                  <button data-action="delete-summary" data-id="${escapeHTML(item.id)}">Hapus</button>
                `)}
              </article>
            `).join("")
            : emptyState("Belum ada catatan.")
        }
      </section>
    `;
  }

  function addSummary(form) {
    const data = new FormData(form);

    state.summaries.unshift({
      id: createId(),
      title: data.get("title").trim(),
      category: data.get("category").trim(),
      content: data.get("content").trim(),
      createdAt: new Date().toISOString(),
      favorite: false
    });

    if (saveData("summaries")) {
      renderSummaries();
      renderDashboard();
      showToast("Catatan berhasil disimpan.");
    }
  }

  function editSummary(id) {
    const item = state.summaries.find(entry => entry.id === id);
    if (!item) return;

    openEditor("Edit Catatan", `
      <form data-form="edit-summary" data-id="${escapeHTML(id)}">
        <label>Judul</label>
        <input name="title" value="${escapeHTML(item.title)}" required>
        <label>Kategori</label>
        <input name="category" value="${escapeHTML(item.category || "")}">
        <label>Isi catatan</label>
        <textarea name="content" rows="8" required>${escapeHTML(item.content)}</textarea>
        <div class="card-actions">
          <button type="submit" class="primary-button">Simpan</button>
          <button type="button" data-action="close-modal">Batal</button>
        </div>
      </form>
    `);
  }

  function toggleSummaryFavorite(id) {
    const item = state.summaries.find(entry => entry.id === id);
    if (!item) return;

    item.favorite = !item.favorite;

    if (item.favorite) {
      state.favorites.push({
        id: createId(),
        sourceId: item.id,
        type: "summary",
        title: item.title,
        description: item.content,
        createdAt: new Date().toISOString()
      });
    } else {
      state.favorites = state.favorites.filter(
        favorite => favorite.sourceId !== item.id
      );
    }

    saveData("summaries");
    saveData("favorites");
    renderSummaries();
    renderFavorites();
    showToast("Favorit diperbarui.");
  }

  // JADWAL

  function renderSchedule() {
    const container = containerFor("scheduleContent");
    if (!container) return;

    container.innerHTML = `
      <section class="content-form">
        <h2>Tambah Jadwal</h2>
        <form data-form="schedule">
          <input name="title" placeholder="Nama kegiatan" maxlength="100" required>
          <textarea name="description" rows="3" placeholder="Keterangan kegiatan"></textarea>
          <input name="date" type="date" required>
          <button type="submit" class="primary-button">Simpan Jadwal</button>
        </form>
      </section>

      <section class="content-list">
        <h2>Daftar Jadwal</h2>
        ${
          state.schedules.length
            ? state.schedules.map(item => `
              <article class="content-card ${item.completed ? "completed" : ""}">
                <h3>${escapeHTML(item.title)}</h3>
                <small>${formatDate(item.date)}</small>
                <p>${escapeHTML(item.description || "")}</p>
                ${cardActions(`
                  <button data-action="complete-schedule" data-id="${escapeHTML(item.id)}">${item.completed ? "Batalkan Selesai" : "Tandai Selesai"}</button>
                  <button data-action="edit-schedule" data-id="${escapeHTML(item.id)}">Edit</button>
                  <button data-action="delete-schedule" data-id="${escapeHTML(item.id)}">Hapus</button>
                `)}
              </article>
            `).join("")
            : emptyState("Belum ada jadwal.")
        }
      </section>
    `;
  }

  function addSchedule(form) {
    const data = new FormData(form);

    state.schedules.push({
      id: createId(),
      title: data.get("title").trim(),
      description: data.get("description").trim(),
      date: data.get("date"),
      completed: false
    });

    if (saveData("schedules")) {
      renderSchedule();
      renderDashboard();
      showToast("Jadwal berhasil ditambahkan.");
    }
  }

  function editSchedule(id) {
    const item = state.schedules.find(entry => entry.id === id);
    if (!item) return;

    openEditor("Edit Jadwal", `
      <form data-form="edit-schedule" data-id="${escapeHTML(id)}">
        <label>Nama kegiatan</label>
        <input name="title" value="${escapeHTML(item.title)}" required>
        <label>Keterangan</label>
        <textarea name="description">${escapeHTML(item.description || "")}</textarea>
        <label>Tanggal</label>
        <input name="date" type="date" value="${escapeHTML(item.date)}" required>
        <div class="card-actions">
          <button type="submit" class="primary-button">Simpan</button>
          <button type="button" data-action="close-modal">Batal</button>
        </div>
      </form>
    `);
  }

  // KENANGAN

  async function renderMemories() {
    const container = containerFor("memoriesContent");
    if (!container) return;

    objectURLs.forEach(url => URL.revokeObjectURL(url));
    objectURLs.clear();

    container.innerHTML = `
      <section class="content-form">
        <h2>Simpan Kenangan</h2>
        <form data-form="memory">
          <input name="title" placeholder="Judul kenangan" maxlength="100" required>
          <textarea name="description" rows="3" placeholder="Ceritakan kenangan ini..."></textarea>
          <input name="file" type="file" accept="image/*">
          <button type="submit" class="primary-button">Simpan Kenangan</button>
        </form>
      </section>

      <section class="content-list">
        <h2>Galeri Kenangan</h2>
        <div class="memory-grid">
          ${
            state.memories.length
              ? state.memories.map(item => `
                <article class="content-card memory-card">
                  <div data-memory-image="${escapeHTML(item.id)}"></div>
                  <h3>${escapeHTML(item.title)}</h3>
                  <p>${escapeHTML(item.description || "")}</p>
                  <small>${formatDate(item.createdAt)}</small>
                  ${cardActions(`
                    <button data-action="read-memory" data-id="${escapeHTML(item.id)}">Baca</button>
                    <button data-action="edit-memory" data-id="${escapeHTML(item.id)}">Edit</button>
                    <button data-action="delete-memory" data-id="${escapeHTML(item.id)}">Hapus</button>
                  `)}
                </article>
              `).join("")
              : emptyState("Belum ada kenangan.")
          }
        </div>
      </section>
    `;

    for (const item of state.memories) {
      if (!item.fileId) continue;

      const target = $$("[data-memory-image]").find(
        element => element.dataset.memoryImage === item.id
      );

      if (!target) continue;

      const url = await Store?.getFileURL(item.fileId);

      if (url && target.isConnected) {
        objectURLs.add(url);

        const image = document.createElement("img");
        image.src = url;
        image.alt = item.title;
        image.className = "memory-image";
        target.replaceChildren(image);
      }
    }
  }

  async function addMemory(form) {
    const data = new FormData(form);
    const file = data.get("file");

    const memory = {
      id: createId(),
      title: data.get("title").trim(),
      description: data.get("description").trim(),
      fileId: null,
      createdAt: new Date().toISOString()
    };

    if (file && file.size > 0) {
      if (!file.type.startsWith("image/")) {
        showToast("File harus berupa gambar.", "error");
        return;
      }

      memory.fileId = `memory-${memory.id}`;
      const saved = await Store.saveFile(memory.fileId, file, "memory");

      if (!saved) {
        showToast("Gagal menyimpan gambar.", "error");
        return;
      }
    }

    state.memories.unshift(memory);

    if (saveData("memories")) {
      renderMemories();
      renderDashboard();
      showToast("Kenangan berhasil disimpan.");
    }
  }

  function editMemory(id) {
    const item = state.memories.find(entry => entry.id === id);
    if (!item) return;

    openEditor("Edit Kenangan", `
      <form data-form="edit-memory" data-id="${escapeHTML(id)}">
        <label>Judul</label>
        <input name="title" value="${escapeHTML(item.title)}" required>
        <label>Cerita</label>
        <textarea name="description" rows="6">${escapeHTML(item.description || "")}</textarea>
        <div class="card-actions">
          <button type="submit" class="primary-button">Simpan</button>
          <button type="button" data-action="close-modal">Batal</button>
        </div>
      </form>
    `);
  }

  // JURNAL

  function renderJournal() {
    const container = containerFor("journalContent");
    if (!container) return;

    container.innerHTML = `
      <section class="content-form">
        <h2>Tulis Jurnal</h2>
        <form data-form="journal">
          <input name="title" placeholder="Judul jurnal" maxlength="100" required>
          <textarea name="content" rows="6" placeholder="Ceritakan harimu..." required></textarea>
          <button type="submit" class="primary-button">Simpan Jurnal</button>
        </form>
      </section>

      <section class="content-list">
        <h2>Jurnal Saya</h2>
        ${
          state.journals.length
            ? state.journals.map(item => `
              <article class="content-card">
                <h3>${escapeHTML(item.title)}</h3>
                <small>${formatDate(item.createdAt)}</small>
                <p>${escapeHTML(item.content.slice(0, 160))}${item.content.length > 160 ? "..." : ""}</p>
                ${cardActions(`
                  <button data-action="read-journal" data-id="${escapeHTML(item.id)}">Baca</button>
                  <button data-action="edit-journal" data-id="${escapeHTML(item.id)}">Edit</button>
                  <button data-action="delete-journal" data-id="${escapeHTML(item.id)}">Hapus</button>
                `)}
              </article>
            `).join("")
            : emptyState("Belum ada jurnal.")
        }
      </section>
    `;
  }

  function addJournal(form) {
    const data = new FormData(form);

    state.journals.unshift({
      id: createId(),
      title: data.get("title").trim(),
      content: data.get("content").trim(),
      createdAt: new Date().toISOString()
    });

    if (saveData("journals")) {
      renderJournal();
      renderDashboard();
      showToast("Jurnal berhasil disimpan.");
    }
  }

  function editJournal(id) {
    const item = state.journals.find(entry => entry.id === id);
    if (!item) return;

    openEditor("Edit Jurnal", `
      <form data-form="edit-journal" data-id="${escapeHTML(id)}">
        <label>Judul</label>
        <input name="title" value="${escapeHTML(item.title)}" required>
        <label>Isi jurnal</label>
        <textarea name="content" rows="8" required>${escapeHTML(item.content)}</textarea>
        <div class="card-actions">
          <button type="submit" class="primary-button">Simpan</button>
          <button type="button" data-action="close-modal">Batal</button>
        </div>
      </form>
    `);
  }

  // FAVORIT

  function renderFavorites() {
    const container = containerFor("favoritesContent");
    if (!container) return;

    container.innerHTML = `
      <section class="content-list">
        <h2>Daftar Favorit</h2>
        ${
          state.favorites.length
            ? state.favorites.map(item => `
              <article class="content-card">
                <h3>${escapeHTML(item.title)}</h3>
                <small>${escapeHTML(item.type || "Favorit")}</small>
                <p>${escapeHTML((item.description || "").slice(0, 160))}</p>
                ${cardActions(`
                  ${item.type === "summary" ? `<button data-action="read-favorite" data-id="${escapeHTML(item.id)}">Baca</button>` : ""}
                  <button data-action="delete-favorite" data-id="${escapeHTML(item.id)}">Hapus Favorit</button>
                `)}
              </article>
            `).join("")
            : emptyState("Belum ada item favorit.")
        }
      </section>
    `;
  }

  // PROGRES

  function renderProgress() {
    const container = containerFor("progressContent");
    if (!container) return;

    const average = state.progress.length
      ? Math.round(
          state.progress.reduce(
            (total, item) => total + Number(item.percent || 0), 0
          ) / state.progress.length
        )
      : 0;

    container.innerHTML = `
      <section class="content-form">
        <h2>Tambah Progres</h2>
        <form data-form="progress">
          <input name="title" placeholder="Nama target" maxlength="100" required>
          <textarea name="description" rows="3" placeholder="Keterangan target"></textarea>
          <label>Persentase progres</label>
          <input name="percent" type="number" min="0" max="100" value="0" required>
          <button type="submit" class="primary-button">Simpan Progres</button>
        </form>
      </section>

      <section class="content-list">
        <h2>Rata-rata Progres: ${average}%</h2>
        ${
          state.progress.length
            ? state.progress.map(item => `
              <article class="content-card">
                <h3>${escapeHTML(item.title)}</h3>
                <p>${escapeHTML(item.description || "")}</p>
                <strong>${Number(item.percent)}%</strong>
                <progress value="${Number(item.percent)}" max="100"></progress>
                ${cardActions(`
                  <button data-action="edit-progress" data-id="${escapeHTML(item.id)}">Edit</button>
                  <button data-action="delete-progress" data-id="${escapeHTML(item.id)}">Hapus</button>
                `)}
              </article>
            `).join("")
            : emptyState("Belum ada progres.")
        }
      </section>
    `;
  }

  function addProgress(form) {
    const data = new FormData(form);

    state.progress.push({
      id: createId(),
      title: data.get("title").trim(),
      description: data.get("description").trim(),
      percent: Math.max(0, Math.min(100, Number(data.get("percent")))),
      createdAt: new Date().toISOString()
    });

    if (saveData("progress")) {
      renderProgress();
      showToast("Progres berhasil disimpan.");
    }
  }

  function editProgress(id) {
    const item = state.progress.find(entry => entry.id === id);
    if (!item) return;

    openEditor("Edit Progres", `
      <form data-form="edit-progress" data-id="${escapeHTML(id)}">
        <label>Nama target</label>
        <input name="title" value="${escapeHTML(item.title)}" required>
        <label>Keterangan</label>
        <textarea name="description">${escapeHTML(item.description || "")}</textarea>
        <label>Persentase</label>
        <input name="percent" type="number" min="0" max="100" value="${Number(item.percent)}" required>
        <div class="card-actions">
          <button type="submit" class="primary-button">Simpan</button>
          <button type="button" data-action="close-modal">Batal</button>
        </div>
      </form>
    `);
  }

  // PROFIL

  function renderProfile() {
    const container = containerFor("profileContent");
    if (!container) return;

    container.innerHTML = `
      <section class="content-form">
        <h2>Profil Saya</h2>
        <form data-form="profile">
          <label>Nama</label>
          <input name="name" value="${escapeHTML(state.profile.name || "")}" required>
          <label>Sekolah</label>
          <input name="school" value="${escapeHTML(state.profile.school || "")}">
          <label>Bio</label>
          <textarea name="bio" rows="4">${escapeHTML(state.profile.bio || "")}</textarea>
          <button type="submit" class="primary-button">Simpan Profil</button>
        </form>
      </section>
    `;
  }

  // PENGATURAN

  function renderSettings() {
    const container = containerFor("settingsContent");
    if (!container) return;

    container.innerHTML = `
      <section class="content-form">
        <h2>Tampilan</h2>
        <form data-form="settings">
          <label for="themeSelect">Tema aplikasi</label>
          <select id="themeSelect" name="theme">
            <option value="light" ${state.settings.theme === "light" ? "selected" : ""}>Ivory Champagne</option>
            <option value="dark" ${state.settings.theme === "dark" ? "selected" : ""}>Gelap</option>
          </select>
          <button type="submit" class="primary-button">Simpan Pengaturan</button>
        </form>
      </section>

      <section class="content-form">
        <h2>Backup Data</h2>
        <p>Simpan salinan data YPEDIA atau pulihkan dari file backup.</p>
        <button type="button" data-action="export-backup">Ekspor Backup</button>
        <label for="backupImport">Impor Backup</label>
        <input id="backupImport" type="file" accept=".json,application/json">
      </section>

      <section class="content-form">
        <h2>Akun</h2>
        <button type="button" data-action="logout">Keluar dari Akun</button>
      </section>
    `;
  }

  function applySettings() {
    const theme = state.settings.theme || "light";
    document.documentElement.dataset.theme = theme;
    document.body.dataset.theme = theme;
  }

  // BACKUP

  async function exportBackup() {
    try {
      const blob = await Store.exportBackup();

      if (!(blob instanceof Blob)) {
        throw new Error("Backup tidak berhasil dibuat.");
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = `ypedia-backup-${new Date().toISOString().slice(0, 10)}.json`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      setTimeout(() => URL.revokeObjectURL(url), 1000);
      showToast("Backup berhasil dibuat.");
    } catch (error) {
      console.error(error);
      showToast("Gagal membuat backup.", "error");
    }
  }

  async function importBackup(file) {
    try {
      const success = await Store.importBackup(file);

      if (!success) {
        throw new Error("File backup gagal dipulihkan.");
      }

      loadAllData();
      applySettings();
      renderAll();
      showToast("Backup berhasil dipulihkan.");
    } catch (error) {
      console.error(error);
      showToast("Gagal mengimpor backup.", "error");
    }
  }

  // FORM HANDLER

  function setupForms() {
    document.addEventListener("submit", async event => {
      const form = event.target.closest("[data-form]");
      if (!form) return;

      event.preventDefault();

      const type = form.dataset.form;
      const id = form.dataset.id;
      const data = new FormData(form);

      switch (type) {
        case "summary":
          addSummary(form);
          break;

        case "edit-summary": {
          const item = state.summaries.find(entry => entry.id === id);
          if (!item) return;

          item.title = data.get("title").trim();
          item.category = data.get("category").trim();
          item.content = data.get("content").trim();

          saveData("summaries");
          closeModal();
          renderSummaries();
          renderFavorites();
          showToast("Catatan diperbarui.");
          break;
        }

        case "schedule":
          addSchedule(form);
          break;

        case "edit-schedule": {
          const item = state.schedules.find(entry => entry.id === id);
          if (!item) return;

          item.title = data.get("title").trim();
          item.description = data.get("description").trim();
          item.date = data.get("date");

          saveData("schedules");
          closeModal();
          renderSchedule();
          renderDashboard();
          showToast("Jadwal diperbarui.");
          break;
        }

        case "memory":
          await addMemory(form);
          break;

        case "edit-memory": {
          const item = state.memories.find(entry => entry.id === id);
          if (!item) return;

          item.title = data.get("title").trim();
          item.description = data.get("description").trim();

          saveData("memories");
          closeModal();
          renderMemories();
          showToast("Kenangan diperbarui.");
          break;
        }

        case "journal":
          addJournal(form);
          break;

        case "edit-journal": {
          const item = state.journals.find(entry => entry.id === id);
          if (!item) return;

          item.title = data.get("title").trim();
          item.content = data.get("content").trim();

          saveData("journals");
          closeModal();
          renderJournal();
          renderDashboard();
          showToast("Jurnal diperbarui.");
          break;
        }

        case "progress":
          addProgress(form);
          break;

        case "edit-progress": {
          const item = state.progress.find(entry => entry.id === id);
          if (!item) return;

          item.title = data.get("title").trim();
          item.description = data.get("description").trim();
          item.percent = Math.max(0, Math.min(100, Number(data.get("percent"))));

          saveData("progress");
          closeModal();
          renderProgress();
          showToast("Progres diperbarui.");
          break;
        }

        case "profile":
          state.profile = {
            name: data.get("name").trim(),
            school: data.get("school").trim(),
            bio: data.get("bio").trim()
          };

          if (saveData("profile")) showToast("Profil diperbarui.");
          break;

        case "settings":
          state.settings.theme = data.get("theme") || "light";
          if (saveData("settings")) {
            applySettings();
            showToast("Pengaturan berhasil disimpan.");
          }
          break;
      }
    });

    document.addEventListener("change", async event => {
      if (event.target.id !== "backupImport") return;

      const input = event.target;
      const file = input.files?.[0];

      if (file && confirm("Pulihkan data dari file backup ini?")) {
        await importBackup(file);
      }

      input.value = "";
    });
  }

  // GLOBAL ACTIONS

  function setupGlobalEvents() {
    document.addEventListener("click", async event => {
      const button = event.target.closest("[data-action]");
      if (!button) return;

      const action = button.dataset.action;
      const id = button.dataset.id;

      switch (action) {
        case "close-modal":
          closeModal();
          break;

        case "read-summary": {
          const item = state.summaries.find(entry => entry.id === id);
          if (item) openReader(item.title, item.content);
          break;
        }

        case "read-journal": {
          const item = state.journals.find(entry => entry.id === id);
          if (item) openReader(item.title, item.content);
          break;
        }

        case "read-memory": {
          const item = state.memories.find(entry => entry.id === id);
          if (item) openReader(item.title, item.description || "Tidak ada keterangan.");
          break;
        }

        case "read-favorite": {
          const item = state.favorites.find(entry => entry.id === id);
          if (item) openReader(item.title, item.description || "");
          break;
        }

        case "edit-summary":
          editSummary(id);
          break;

        case "edit-schedule":
          editSchedule(id);
          break;

        case "edit-memory":
          editMemory(id);
          break;

        case "edit-journal":
          editJournal(id);
          break;

        case "edit-progress":
          editProgress(id);
          break;

        case "favorite-summary":
          toggleSummaryFavorite(id);
          break;

        case "complete-schedule": {
          const item = state.schedules.find(entry => entry.id === id);
          if (!item) break;

          item.completed = !item.completed;
          saveData("schedules");
          renderSchedule();
          renderDashboard();
          break;
        }

        case "delete-summary":
          if (confirm("Hapus catatan ini?")) {
            state.summaries = state.summaries.filter(entry => entry.id !== id);
            state.favorites = state.favorites.filter(entry => entry.sourceId !== id);
            saveData("summaries");
            saveData("favorites");
            renderSummaries();
            renderFavorites();
            renderDashboard();
            showToast("Catatan dihapus.");
          }
          break;

        case "delete-schedule":
          if (confirm("Hapus jadwal ini?")) {
            state.schedules = state.schedules.filter(entry => entry.id !== id);
            saveData("schedules");
            renderSchedule();
            renderDashboard();
            showToast("Jadwal dihapus.");
          }
          break;

        case "delete-memory": {
          if (!confirm("Hapus kenangan ini?")) break;

          const item = state.memories.find(entry => entry.id === id);

          if (item?.fileId) await Store.deleteFile(item.fileId);

          state.memories = state.memories.filter(entry => entry.id !== id);
          saveData("memories");
          renderMemories();
          renderDashboard();
          showToast("Kenangan dihapus.");
          break;
        }

        case "delete-journal":
          if (confirm("Hapus jurnal ini?")) {
            state.journals = state.journals.filter(entry => entry.id !== id);
            saveData("journals");
            renderJournal();
            renderDashboard();
            showToast("Jurnal dihapus.");
          }
          break;

        case "delete-favorite": {
          const favorite = state.favorites.find(entry => entry.id === id);
          if (!favorite) break;

          if (favorite.type === "summary" && favorite.sourceId) {
            const summary = state.summaries.find(
              entry => entry.id === favorite.sourceId
            );
            if (summary) summary.favorite = false;
            saveData("summaries");
          }

          state.favorites = state.favorites.filter(entry => entry.id !== id);
          saveData("favorites");
          renderFavorites();
          renderSummaries();
          showToast("Favorit dihapus.");
          break;
        }

        case "delete-progress":
          if (confirm("Hapus progres ini?")) {
            state.progress = state.progress.filter(entry => entry.id !== id);
            saveData("progress");
            renderProgress();
            showToast("Progres dihapus.");
          }
          break;

        case "export-backup":
          await exportBackup();
          break;

        case "logout":
          logout();
          break;
      }
    });

    $("#ypediaModal")?.addEventListener("click", event => {
      if (event.target.id === "ypediaModal") closeModal();
    });
  }

  // RENDER

  function renderPage(page) {
    const renderers = {
      dashboard: renderDashboard,
      summaries: renderSummaries,
      schedule: renderSchedule,
      music: () => window.YpediaMusic?.render(),
      memories: renderMemories,
      journal: renderJournal,
      favorites: renderFavorites,
      progress: renderProgress,
      profile: renderProfile,
      settings: renderSettings
    };

    renderers[page]?.();
  }

  function renderAll() {
    renderDashboard();
    renderSummaries();
    renderSchedule();
    renderMemories();
    renderJournal();
    renderFavorites();
    renderProgress();
    renderProfile();
    renderSettings();
    window.YpediaMusic?.render();
  }

  // INIT

  function init() {
    try {
      loadAllData();
      setupLogin();
      setupNavigation();
      setupForms();
      setupGlobalEvents();
      applySettings();

      if (sessionStorage.getItem("ypedia_logged_in") === "true") {
        showApp();
      } else {
        setupLoading();
      }
    } catch (error) {
      console.error("YPEDIA gagal dimulai:", error);
      showLogin();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();