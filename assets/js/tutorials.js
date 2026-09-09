(function () {
  "use strict";

  const validVideoId = /^[A-Za-z0-9_-]{11}$/;
  const supportedPlayerLanguages = new Set(["en", "fr", "es"]);

  function getPlayerLanguage() {
    const pageLanguage = (document.documentElement.lang || "en").toLowerCase().split("-")[0];
    return supportedPlayerLanguages.has(pageLanguage) ? pageLanguage : "en";
  }

  function closeYoutubeModal() {
    const modal = document.getElementById("youtube-modal");
    const player = document.getElementById("youtube-modal-player");
    if (!modal || !player) return;
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
    player.src = "about:blank";
  }

  document.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-youtube-id]");
    if (!trigger) return;

    const videoId = trigger.dataset.youtubeId || "";
    const modal = document.getElementById("youtube-modal");
    const player = document.getElementById("youtube-modal-player");
    if (!validVideoId.test(videoId) || !modal || !player) return;

    player.title = trigger.getAttribute("aria-label") || "Tutoriel vidéo Wires";
    player.src = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&hl=${getPlayerLanguage()}`;
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
  });

  document.addEventListener("click", (event) => {
    if (event.target.closest("[data-youtube-close]")) closeYoutubeModal();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeYoutubeModal();
  });
})();
