/* ============================================================
   Luca Di Giacomo — Personal website scripts
   Language switching · starfield · scroll reveals · PDF export
   ============================================================ */

(function () {
  "use strict";

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ----------------------------------------------------------
     Language switching (EN / IT)
     ---------------------------------------------------------- */
  const LANG_KEY = "ldg-lang";
  const btnEn = document.getElementById("btn-en");
  const btnIt = document.getElementById("btn-it");

  function setLang(lang) {
    const html = document.documentElement;
    html.setAttribute("data-lang", lang);
    html.setAttribute("lang", lang);
    btnEn.classList.toggle("active", lang === "en");
    btnIt.classList.toggle("active", lang === "it");
    btnEn.setAttribute("aria-pressed", String(lang === "en"));
    btnIt.setAttribute("aria-pressed", String(lang === "it"));
    try {
      localStorage.setItem(LANG_KEY, lang);
    } catch (_) {
      /* storage unavailable — ignore */
    }
  }

  btnEn.addEventListener("click", () => setLang("en"));
  btnIt.addEventListener("click", () => setLang("it"));

  // Restore saved language, or detect from browser
  (function initLang() {
    let saved = null;
    try {
      saved = localStorage.getItem(LANG_KEY);
    } catch (_) { /* ignore */ }
    if (saved === "en" || saved === "it") {
      setLang(saved);
    } else if ((navigator.language || "").toLowerCase().startsWith("it")) {
      setLang("it");
    } else {
      setLang("en");
    }
  })();

  /* ----------------------------------------------------------
     Mobile navigation
     ---------------------------------------------------------- */
  const burger = document.getElementById("nav-burger");
  const navLinks = document.querySelector(".nav-links");

  burger.addEventListener("click", () => {
    burger.classList.toggle("open");
    navLinks.classList.toggle("open");
  });

  navLinks.querySelectorAll("a").forEach((a) =>
    a.addEventListener("click", () => {
      burger.classList.remove("open");
      navLinks.classList.remove("open");
    })
  );

  /* ----------------------------------------------------------
     Scroll reveal animations
     ---------------------------------------------------------- */
  const revealEls = document.querySelectorAll(".reveal");

  if (prefersReducedMotion || !("IntersectionObserver" in window)) {
    revealEls.forEach((el) => el.classList.add("visible"));
  } else {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    revealEls.forEach((el) => io.observe(el));
  }

  /* ----------------------------------------------------------
     Starfield background (subtle twinkle + slow drift)
     ---------------------------------------------------------- */
  (function starfield() {
    const canvas = document.getElementById("starfield");
    const ctx = canvas.getContext("2d");
    let stars = [];
    let w = 0;
    let h = 0;
    let rafId = null;

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildStars();
    }

    function buildStars() {
      const count = Math.min(220, Math.floor((w * h) / 6500));
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 1.3 + 0.25,
        base: Math.random() * 0.55 + 0.25,
        phase: Math.random() * Math.PI * 2,
        speed: Math.random() * 0.9 + 0.35,
        drift: Math.random() * 0.016 + 0.004,
      }));
    }

    function draw(t) {
      ctx.clearRect(0, 0, w, h);
      const time = t / 1000;
      for (const s of stars) {
        const twinkle = prefersReducedMotion
          ? s.base
          : s.base * (0.72 + 0.28 * Math.sin(time * s.speed + s.phase));
        ctx.globalAlpha = twinkle;
        ctx.fillStyle = "#dbe2ee";
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();

        if (!prefersReducedMotion) {
          s.y += s.drift;
          if (s.y > h + 2) s.y = -2;
        }
      }
      ctx.globalAlpha = 1;
      if (!prefersReducedMotion) rafId = requestAnimationFrame(draw);
    }

    window.addEventListener("resize", () => {
      resize();
      if (prefersReducedMotion) draw(0);
    });

    document.addEventListener("visibilitychange", () => {
      if (prefersReducedMotion) return;
      if (document.hidden) {
        if (rafId) cancelAnimationFrame(rafId);
        rafId = null;
      } else if (!rafId) {
        rafId = requestAnimationFrame(draw);
      }
    });

    resize();
    if (prefersReducedMotion) {
      draw(0);
    } else {
      rafId = requestAnimationFrame(draw);
    }
  })();

  /* ----------------------------------------------------------
     Footer year
     ---------------------------------------------------------- */
  const year = String(new Date().getFullYear());
  const yearEn = document.getElementById("year");
  const yearIt = document.getElementById("year-it");
  if (yearEn) yearEn.textContent = year;
  if (yearIt) yearIt.textContent = year;

  /* ----------------------------------------------------------
     CV PDF download
     The PDFs are pre-generated from assets/cv-page.html with
     Puppeteer (see scripts/generate-cv-pdf.js, run locally via
     `npm run generate:pdf` and automatically in the GitHub
     Pages deploy workflow). Here we simply download the file
     matching the currently selected language.
     ---------------------------------------------------------- */
  const CV_FILES = {
    en: "assets/CV_Luca_Di_Giacomo_EN.pdf",
    it: "assets/CV_Luca_Di_Giacomo_IT.pdf",
  };

  function downloadCv() {
    const lang = document.documentElement.getAttribute("data-lang") || "en";
    const href = CV_FILES[lang] || CV_FILES.en;

    const link = document.createElement("a");
    link.href = href;
    link.download = href.split("/").pop();
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  document.querySelectorAll("#download-cv, #download-cv-footer").forEach((btn) => {
    btn.addEventListener("click", downloadCv);
  });
})();
