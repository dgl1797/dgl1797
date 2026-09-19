/* ============================================================
   Luca Di Giacomo — Personal website scripts
   Language switching · starfield · scroll reveals · contact modal
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
     Comet trail — a glowing head with fading particles trailing
     the cursor. Disabled for reduced motion and touch pointers.
     ---------------------------------------------------------- */
  (function cometTrail() {
    const precisePointer = window.matchMedia("(pointer: fine)").matches;
    if (prefersReducedMotion || !precisePointer) return;

    const canvas = document.getElementById("cursor-trail");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const MAX_PARTICLES = 180;
    const particles = [];

    let w = 0;
    let h = 0;
    let rafId = null;
    let lastT = 0;
    let curX = null;
    let curY = null;
    let prevX = null;
    let prevY = null;

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function spawn(x, y) {
      if (particles.length >= MAX_PARTICLES) return;
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 0.28;
      particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.05,
        r: Math.random() * 1.5 + 0.9,
        life: 0,
        max: Math.random() * 0.55 + 0.45,
      });
    }

    function draw(t) {
      const now = t / 1000;
      const dt = Math.min(now - lastT, 0.05) || 0;
      lastT = now;

      ctx.clearRect(0, 0, w, h);

      if (curX !== null && prevX !== null) {
        const dx = curX - prevX;
        const dy = curY - prevY;
        const dist = Math.hypot(dx, dy);
        const steps = Math.min(Math.floor(dist / 5), 8);
        for (let i = 1; i <= steps; i++) {
          const k = i / steps;
          spawn(prevX + dx * k, prevY + dy * k);
        }
      }
      prevX = curX;
      prevY = curY;

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life += dt;
        if (p.life >= p.max) {
          particles.splice(i, 1);
          continue;
        }
        p.x += p.vx;
        p.y += p.vy;

        const k = 1 - p.life / p.max;
        const radius = p.r * (0.4 + 0.6 * k);

        ctx.globalAlpha = 0.2 * k;
        ctx.fillStyle = "#8fa3ff";
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius * 3.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = 0.85 * k;
        ctx.fillStyle = "#e8edf5";
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      rafId = requestAnimationFrame(draw);
    }

    window.addEventListener("pointermove", (e) => {
      curX = e.clientX;
      curY = e.clientY;
    });

    window.addEventListener("pointerout", (e) => {
      if (!e.relatedTarget) {
        curX = null;
        curY = null;
        prevX = null;
        prevY = null;
      }
    });

    window.addEventListener("resize", resize);

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        if (rafId) cancelAnimationFrame(rafId);
        rafId = null;
      } else if (!rafId) {
        lastT = 0;
        rafId = requestAnimationFrame(draw);
      }
    });

    resize();
    rafId = requestAnimationFrame(draw);
  })();

  /* ----------------------------------------------------------
     Cosmic dust on CTA borders — randomise each button's cycle
     (9–12s) and delay so they never pulse in lockstep.
     ---------------------------------------------------------- */
  (function cosmicDust() {
    if (prefersReducedMotion) return;
    document.querySelectorAll(".btn, .hero-card-glow").forEach((btn) => {
      const duration = 9 + Math.random() * 3;
      btn.style.setProperty("--dust-duration", duration.toFixed(2) + "s");
      btn.style.setProperty("--dust-delay", (-Math.random() * duration).toFixed(2) + "s");
    });
  })();

  /* ----------------------------------------------------------
     Section stepping — the mouse wheel scrolls natively, while
     the arrow keys jump straight to the next/previous section.
     ---------------------------------------------------------- */
  (function sectionStepping() {
    if (prefersReducedMotion) return;

    const NAV = 90;
    const LOCK_MS = 750;

    const sections = Array.from(document.querySelectorAll(".hero, .section"));
    if (!sections.length) return;

    let lockUntil = 0;

    function maxScroll() {
      return document.documentElement.scrollHeight - window.innerHeight;
    }

    function sectionTops() {
      return sections.map((s) => s.getBoundingClientRect().top + window.scrollY);
    }

    function currentIndex(y, tops) {
      let idx = 0;
      for (let i = 0; i < tops.length; i++) {
        if (tops[i] <= y + NAV + 2) idx = i;
      }
      return idx;
    }

    function step(dir) {
      const now = performance.now();
      if (now < lockUntil) return;
      lockUntil = now + LOCK_MS;

      const y = window.scrollY;
      const tops = sectionTops();
      const idx = currentIndex(y, tops);
      let target;

      if (dir > 0) {
        target = idx < tops.length - 1 ? tops[idx + 1] - NAV : maxScroll();
      } else {
        target = idx > 0 ? tops[idx - 1] - NAV : 0;
      }

      window.scrollTo({
        top: Math.max(0, Math.min(target, maxScroll())),
        behavior: "smooth",
      });
    }

    window.addEventListener("keydown", (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
      const el = e.target;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        step(1);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        step(-1);
      }
    });
  })();

  /* ----------------------------------------------------------
     Timeline progress — a scroll-driven snake. A glowing head
     rides the timeline with the viewport, trailing a lit bar,
     and each experience marker stays lit once scrolled past.
     ---------------------------------------------------------- */
  (function timelineProgress() {
    const timeline = document.querySelector(".timeline");
    if (!timeline) return;

    const items = Array.from(timeline.querySelectorAll(".timeline-item"));
    const headEl = timeline.querySelector(".timeline-head");
    let rafId = null;

    function railX() {
      const marker = timeline.querySelector(".timeline-marker");
      if (!marker) return timeline.offsetWidth / 2;
      const tr = timeline.getBoundingClientRect();
      const mr = marker.getBoundingClientRect();
      return mr.left + mr.width / 2 - tr.left;
    }

    function update() {
      rafId = null;
      const rect = timeline.getBoundingClientRect();
      const vh = window.innerHeight;
      const lineTop = 8;
      const lineLen = rect.height - 16;
      const headY = vh * 0.55 - rect.top;

      const progress = Math.max(0, Math.min(1, (headY - lineTop) / lineLen));
      timeline.style.setProperty("--progress", progress.toFixed(4));
      timeline.style.setProperty("--rail-x", railX() + "px");

      if (headEl) {
        const visible = headY >= lineTop && headY <= lineTop + lineLen;
        headEl.classList.toggle("on", visible);
        headEl.style.setProperty("--head-top", headY + "px");
      }

      items.forEach((item) => {
        const marker = item.querySelector(".timeline-marker");
        if (!marker) return;
        const m = marker.getBoundingClientRect();
        const markerY = m.top + m.height / 2;
        item.classList.toggle("read", markerY <= headY);
        item.classList.toggle("active", Math.abs(markerY - headY) <= vh * 0.18);
      });
    }

    function onScroll() {
      if (rafId === null) rafId = requestAnimationFrame(update);
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    update();
  })();

  /* ----------------------------------------------------------
     Nav scroll-spy — the link for the section currently in view
     gets a persistent glowing underline.
     ---------------------------------------------------------- */
  (function navSpy() {
    const links = Array.from(document.querySelectorAll(".nav-links a[href^='#']"));
    if (!links.length) return;

    const NAV = 90;
    const targets = links
      .map((link) => {
        const id = link.getAttribute("href").slice(1);
        const section = document.getElementById(id);
        if (!section) return null;
        let prev = section.previousElementSibling;
        while (prev && !prev.classList.contains("separator")) {
          prev = prev.previousElementSibling;
        }
        return { link, section, trigger: prev || section };
      })
      .filter(Boolean);
    if (!targets.length) return;

    let rafId = null;

    function update() {
      rafId = null;
      const line = window.scrollY + NAV + 2;
      const atBottom = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2;

      let active = null;
      for (const t of targets) {
        const top = t.trigger.getBoundingClientRect().top + window.scrollY;
        if (top <= line) active = t;
      }
      if (atBottom) active = targets[targets.length - 1];

      targets.forEach((t) => t.link.classList.toggle("active", t === active));
    }

    function onScroll() {
      if (rafId === null) rafId = requestAnimationFrame(update);
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    update();
  })();

  /* ----------------------------------------------------------
     Contact modal — opens the Formspree form; closes on the ×
     button, a backdrop click, or Escape (handled natively).
     ---------------------------------------------------------- */
  const contactModal = document.getElementById("contact-modal");

  function closeContactModal() {
    if (!contactModal || !contactModal.open || contactModal.classList.contains("closing")) return;
    if (prefersReducedMotion) {
      contactModal.close();
      return;
    }

    contactModal.classList.add("closing");
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      contactModal.removeEventListener("animationend", onEnd);
      contactModal.classList.remove("closing");
      contactModal.close();
    };
    const onEnd = (e) => {
      if (e.target === contactModal) finish();
    };
    contactModal.addEventListener("animationend", onEnd);
    setTimeout(finish, 400);
  }

  document.querySelectorAll("[data-open-contact]").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (contactModal && !contactModal.open && typeof contactModal.showModal === "function") {
        contactModal.showModal();
      }
    });
  });

  if (contactModal) {
    contactModal.querySelectorAll("[data-close-contact]").forEach((btn) => {
      btn.addEventListener("click", closeContactModal);
    });

    contactModal.addEventListener("cancel", (e) => {
      e.preventDefault();
    });
  }

  /* ----------------------------------------------------------
     Contact form — submits to Formspree via fetch so the modal
     stays put and the visitor gets inline feedback.
     ---------------------------------------------------------- */
  (function contactForm() {
    const form = document.getElementById("contact-form");
    if (!form) return;

    const status = document.getElementById("form-status");
    const submit = form.querySelector('button[type="submit"]');
    const isIt = () => document.documentElement.getAttribute("data-lang") === "it";

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (submit) submit.disabled = true;
      if (status) {
        status.className = "form-status";
        status.textContent = isIt() ? "Invio in corso…" : "Sending…";
      }

      try {
        const res = await fetch(form.action, {
          method: "POST",
          body: new FormData(form),
          headers: { Accept: "application/json" },
        });
        if (!res.ok) throw new Error("request failed");
        form.reset();
        if (status) {
          status.className = "form-status ok";
          status.textContent = isIt()
            ? "Messaggio inviato. Grazie!"
            : "Message sent. Thank you!";
        }
      } catch (_) {
        if (status) {
          status.className = "form-status err";
          status.textContent = isIt()
            ? "Invio non riuscito. Riprova più tardi."
            : "Sending failed. Please try again later.";
        }
      } finally {
        if (submit) submit.disabled = false;
      }
    });
  })();
})();
