"use strict";

const MUSIC_LIBRARY = [
  {
    title: "All Too Well (10 Minute Version)",
    artist: "Taylor Swift",
    file: "alltowelll.mp3",
    cover: "taylor.jpeg"
  },
  {
    title: "Menari-nari",
    artist: "Raim Laode",
    file: "menari.mp3",
    cover: "raim.jpeg"
  },
  {
    title: "Kita Lewati Berdua",
    artist: "Over night",
    file: "over.mp3",
    cover: "kita.jpeg"
  },
  {
    title: "Panasea",
    artist: "Rumah Sakit",
    file: "panasea.mp3",
    cover: "pa.jpeg"
  },
  {
    title: "Purple Rain",
    artist: "Koleksi YPEDIA",
    file: "p.mp3",
    cover: "purple.jpeg"
  },
  {
    title: "Please Don't Call",
    artist: "Bleachers",
    file: "m.mp3",
    cover: "mer.jpeg"
  },
  {
    title: "Backburner",
    artist: "Niki",
    file: "n.mp3",
    cover: "back.jpeg"
  }
];

window.YpediaMusic = (() => {
  let currentIndex = 0;
  let audio = null;
  let isPlaying = false;
  let isBound = false;

  const $ = (selector) => document.querySelector(selector);

  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]);
  }

  function formatTime(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) {
      return "0:00";
    }

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);

    return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
  }

  function getCurrentTrack() {
    return MUSIC_LIBRARY[currentIndex] || MUSIC_LIBRARY[0];
  }

  function render() {
    const container = $("#musicContent");

    if (!container) return;

    if (MUSIC_LIBRARY.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          Belum ada lagu di koleksi musikmu.
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="music-list">
        ${MUSIC_LIBRARY.map((track, index) => `
          <article
            class="music-card ${index === currentIndex ? "active" : ""}"
            data-music-card="${index}"
          >
            <img
              class="music-cover"
              src="${escapeHTML(track.cover)}"
              alt="Cover ${escapeHTML(track.title)}"
              onerror="this.onerror=null;this.src='album1.jpg'"
            >

            <div class="music-info">
              <h3>${escapeHTML(track.title)}</h3>
              <p>${escapeHTML(track.artist)}</p>
            </div>

            <span class="music-number">
              ${String(index + 1).padStart(2, "0")}
            </span>

            <button
              class="music-play-button"
              type="button"
              data-play-track="${index}"
              aria-label="Putar ${escapeHTML(track.title)}"
            >
              ${index === currentIndex && isPlaying ? "Ⅱ" : "▶"}
            </button>
          </article>
        `).join("")}
      </div>
    `;

    container.querySelectorAll("[data-play-track]").forEach((button) => {
      button.addEventListener("click", () => {
        const index = Number(button.dataset.playTrack);

        if (index === currentIndex) {
          togglePlay();
        } else {
          playTrack(index);
        }
      });
    });
  }

  function updatePlayer() {
    const track = getCurrentTrack();

    const title = $("#playerTitle");
    const artist = $("#playerArtist");
    const cover = $("#playerCover");
    const playButton = $("#playPause");

    if (title) {
      title.textContent = track.title;
    }

    if (artist) {
      artist.textContent = track.artist;
    }

    if (cover) {
      cover.src = track.cover;
      cover.alt = `Cover ${track.title}`;

      cover.onerror = () => {
        cover.onerror = null;
        cover.src = "album1.jpg";
      };
    }

    if (playButton) {
      playButton.textContent = isPlaying ? "Ⅱ" : "▶";

      playButton.setAttribute(
        "aria-label",
        isPlaying ? "Jeda lagu" : "Putar lagu"
      );
    }

    renderActiveTrack();
  }

  function renderActiveTrack() {
    document.querySelectorAll("[data-music-card]").forEach((card) => {
      const index = Number(card.dataset.musicCard);
      const active = index === currentIndex;

      card.classList.toggle("active", active);

      const button = card.querySelector("[data-play-track]");

      if (button) {
        button.textContent = active && isPlaying ? "Ⅱ" : "▶";
      }
    });
  }

  function updateProgress() {
    if (!audio) return;

    const progressBar = $("#progressBar");
    const currentTime = $("#currentTime");
    const duration = $("#duration");

    const current = audio.currentTime || 0;
    const total = audio.duration || 0;

    if (currentTime) {
      currentTime.textContent = formatTime(current);
    }

    if (duration) {
      duration.textContent = formatTime(total);
    }

    if (progressBar) {
      progressBar.max = total > 0 ? total : 100;
      progressBar.value = total > 0 ? current : 0;
    }
  }

  async function playTrack(index) {
    if (!Number.isInteger(index)) return;

    if (index < 0 || index >= MUSIC_LIBRARY.length) return;

    if (!audio) {
      audio = $("#audioElement");
    }

    if (!audio) {
      console.error("Elemen audioElement tidak ditemukan.");
      return;
    }

    currentIndex = index;

    const track = getCurrentTrack();

    audio.pause();
    audio.src = track.file;
    audio.load();

    isPlaying = false;

    updatePlayer();
    updateProgress();

    try {
      await audio.play();
    } catch (error) {
      isPlaying = false;
      updatePlayer();

      console.warn("Lagu tidak dapat diputar:", error);

      if (typeof window.showToast === "function") {
        window.showToast(
          `Tidak dapat memutar ${track.title}. Periksa file musiknya.`,
          "error"
        );
      }
    }
  }

  async function togglePlay() {
    if (!audio) {
      audio = $("#audioElement");
    }

    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      return;
    }

    if (!audio.src) {
      await playTrack(currentIndex);
      return;
    }

    try {
      await audio.play();
    } catch (error) {
      isPlaying = false;
      updatePlayer();

      console.warn("Gagal memutar lagu:", error);
    }
  }

  function nextTrack() {
    if (MUSIC_LIBRARY.length === 0) return;

    const nextIndex = (currentIndex + 1) % MUSIC_LIBRARY.length;

    playTrack(nextIndex);
  }

  function previousTrack() {
    if (MUSIC_LIBRARY.length === 0) return;

    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }

    const previousIndex =
      (currentIndex - 1 + MUSIC_LIBRARY.length) % MUSIC_LIBRARY.length;

    playTrack(previousIndex);
  }

  function bindPlayer() {
    if (isBound) return;

    audio = $("#audioElement");

    if (!audio) {
      console.warn("Elemen audioElement tidak ditemukan.");
      return;
    }

    isBound = true;

    audio.addEventListener("play", () => {
      isPlaying = true;
      updatePlayer();
    });

    audio.addEventListener("pause", () => {
      isPlaying = false;
      updatePlayer();
    });

    audio.addEventListener("ended", () => {
      nextTrack();
    });

    audio.addEventListener("timeupdate", updateProgress);
    audio.addEventListener("loadedmetadata", updateProgress);
    audio.addEventListener("durationchange", updateProgress);

    audio.addEventListener("error", () => {
      isPlaying = false;
      updatePlayer();
      updateProgress();

      console.warn(
        "File musik tidak ditemukan atau tidak dapat dibaca."
      );
    });

    $("#playPause")?.addEventListener("click", togglePlay);
    $("#nextTrack")?.addEventListener("click", nextTrack);
    $("#previousTrack")?.addEventListener("click", previousTrack);

    $("#progressBar")?.addEventListener("input", (event) => {
      if (!audio || !Number.isFinite(audio.duration)) return;

      audio.currentTime = Number(event.target.value);
    });
  }

  function init() {
    bindPlayer();
    updatePlayer();
    updateProgress();
    render();

    return Promise.resolve();
  }

  return {
    init,
    render,
    playTrack,
    togglePlay,
    nextTrack,
    previousTrack,
    updatePlayer,
    renderActiveTrack,
    formatTime,

    getTracks: () => MUSIC_LIBRARY.map((track) => ({ ...track })),
    getTrackCount: () => MUSIC_LIBRARY.length,
    getCurrentIndex: () => currentIndex
  };
})();