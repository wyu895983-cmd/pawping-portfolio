const loader = document.querySelector(".loader");
const cursor = document.querySelector(".cursor");
const progress = document.querySelector(".scroll-progress span");
const progressDog = document.querySelector(".progress-dog");
const particleCanvas = document.querySelector("#particle-field");
const ctx = particleCanvas.getContext("2d");
const reveals = document.querySelectorAll(".reveal");
const magneticItems = document.querySelectorAll(".magnetic");
const heroCharacter = document.querySelector(".hero-character");
const heroHeadButton = document.querySelector(".hero-head-button");
const characterButton = document.querySelector(".character-button");
const characterImage = document.querySelector(".character-button img");
const ribbonBurst = document.querySelector(".ribbon-burst");
const modal = document.querySelector(".modal");
const modalImage = document.querySelector(".modal img");
const modalClose = document.querySelector(".modal-close");
const modalTriggers = document.querySelectorAll("[data-modal]");
const heartButtons = document.querySelectorAll(".heart-button");
const soundToggle = document.querySelector(".sound-toggle");
const horizontalWrap = document.querySelector(".horizontal-wrap");
const horizontalTrack = document.querySelector(".horizontal-track");
const endingSection = document.querySelector(".ending");
const flowerField = document.querySelector(".flower-field");
const textTargets = document.querySelectorAll(
  "h1, h2, .kicker, .hero-copy p:not(.kicker), .story-line, .character-stage p"
);

const dogSources = [
  "./assets/source/dog-apple-story.webp",
  "./assets/source/dog-box.webp",
  "./assets/source/dog-brush.webp",
  "./assets/source/dog-running.webp",
];

let dogIndex = 0;
let audioContext;
let soundOn = false;
let scrollTicking = false;
let particles = [];
let dragStart = 0;
let trackX = 0;
let isDragging = false;
let dragMoved = false;
let dragStartClientX = 0;
let dragStartClientY = 0;
let pendingHorizontalTrigger = null;
let openedFromHorizontalPointer = false;
let flowersReady = false;

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function smoothstep(value) {
  const clamped = clamp(value);
  return clamped * clamped * (3 - 2 * clamped);
}

function splitTextElement(element) {
  if (element.dataset.textPrepared === "true") return;
  const original = element.textContent;
  element.dataset.textPrepared = "true";
  element.setAttribute("aria-label", original.trim());

  const isTitle = element.matches("h1, h2");
  if (!isTitle) {
    element.classList.add("text-block-reveal");
    return;
  }

  const unitClass = isTitle ? "split-char" : "split-word";
  const units = isTitle ? Array.from(original) : original.split(/(\s+)/);

  element.textContent = "";
  element.classList.add(isTitle ? "text-split" : "text-block-reveal");

  units.forEach((unit) => {
    const span = document.createElement("span");
    span.className = unitClass;
    span.setAttribute("aria-hidden", "true");
    span.textContent = unit === " " ? "\u00a0" : unit;
    if (!isTitle && /\s+/.test(unit)) span.style.width = "0.32em";
    element.appendChild(span);
  });
}

function animateTextElement(element) {
  if (element.dataset.textAnimated === "true") return;
  element.dataset.textAnimated = "true";

  const isTitle = element.matches("h1, h2");
  const targets = isTitle ? element.querySelectorAll(".split-char") : [element];
  const delay = element.matches(".hero-copy p:not(.kicker), .story-line, .character-stage p")
    ? 0.18
    : 0;

  if (window.gsap && targets.length) {
    window.gsap.fromTo(
      targets,
      {
        opacity: 0,
        y: isTitle ? 34 : 24,
        filter: "blur(8px)",
      },
      {
        opacity: 1,
        y: 0,
        filter: "blur(0px)",
        duration: isTitle ? 1.15 : 0.9,
        delay,
        stagger: isTitle ? 0.035 : 0.018,
        ease: "power3.out",
      }
    );
    return;
  }

  targets.forEach((target, index) => {
    target.animate(
      [
        { opacity: 0, transform: "translateY(28px)", filter: "blur(8px)" },
        { opacity: 1, transform: "translateY(0)", filter: "blur(0)" },
      ],
      {
        duration: isTitle ? 1050 : 850,
        delay: delay * 1000 + index * (isTitle ? 28 : 16),
        easing: "cubic-bezier(0.16, 1, 0.3, 1)",
        fill: "both",
      }
    );
  });
}

textTargets.forEach(splitTextElement);

window.addEventListener("load", () => {
  window.setTimeout(() => loader.classList.add("is-hidden"), 900);
});

function resizeParticles() {
  const ratio = window.devicePixelRatio || 1;
  particleCanvas.width = Math.floor(window.innerWidth * ratio);
  particleCanvas.height = Math.floor(window.innerHeight * ratio);
  particleCanvas.style.width = `${window.innerWidth}px`;
  particleCanvas.style.height = `${window.innerHeight}px`;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  particles = Array.from({ length: window.innerWidth < 700 ? 34 : 68 }, () => ({
    x: Math.random() * window.innerWidth,
    y: Math.random() * window.innerHeight,
    r: Math.random() * 1.8 + 0.5,
    vx: (Math.random() - 0.5) * 0.18,
    vy: (Math.random() - 0.5) * 0.18,
  }));
}

function drawParticles() {
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  ctx.fillStyle = "rgba(138, 5, 5, 0.18)";
  particles.forEach((p) => {
    p.x += p.vx;
    p.y += p.vy;
    if (p.x < 0 || p.x > window.innerWidth) p.vx *= -1;
    if (p.y < 0 || p.y > window.innerHeight) p.vy *= -1;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  });
  window.requestAnimationFrame(drawParticles);
}

function getAudio() {
  if (!audioContext) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    audioContext = new AudioContextClass();
  }
  return audioContext;
}

function tone(type = "tap") {
  if (!soundOn) return;
  const audio = getAudio();
  if (!audio) return;
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  const now = audio.currentTime;
  const freq = type === "hover" ? 420 : 150;
  osc.type = type === "hover" ? "triangle" : "sine";
  osc.frequency.setValueAtTime(freq, now);
  osc.frequency.exponentialRampToValueAtTime(type === "hover" ? 520 : 84, now + 0.16);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(type === "hover" ? 0.018 : 0.04, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
  osc.connect(gain);
  gain.connect(audio.destination);
  osc.start(now);
  osc.stop(now + 0.2);
}

soundToggle.addEventListener("click", async () => {
  const audio = getAudio();
  if (audio) await audio.resume();
  soundOn = !soundOn;
  soundToggle.classList.toggle("is-on", soundOn);
  soundToggle.textContent = soundOn ? "声音 ON" : "声音 OFF";
  tone("tap");
});

function updateScroll() {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  const ratio = max > 0 ? window.scrollY / max : 0;
  const progressRatio = Math.min(ratio, 1);
  progress.style.width = `${progressRatio * 100}%`;
  if (progressDog) {
    const dogWidth = progressDog.getBoundingClientRect().width || 48;
    const dogX = progressRatio * Math.max(window.innerWidth - dogWidth, 0);
    const dogStep = Math.sin(progressRatio * Math.PI * 18) * 2;
    progressDog.style.transform = `translate3d(${dogX}px, ${dogStep}px, 0)`;
  }

  const heroOffset = Math.min(window.scrollY * 0.16, 90);
  if (heroCharacter) heroCharacter.style.transform = `translate3d(0, ${heroOffset}px, 0)`;

  scrollTicking = false;
}

window.addEventListener(
  "scroll",
  () => {
    if (!scrollTicking) {
      window.requestAnimationFrame(updateScroll);
      scrollTicking = true;
    }
  },
  { passive: true }
);

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) entry.target.classList.add("is-visible");
    });
  },
  { threshold: 0.15 }
);

reveals.forEach((item) => observer.observe(item));

const textObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        animateTextElement(entry.target);
        textObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.35, rootMargin: "0px 0px -10% 0px" }
);

textTargets.forEach((item) => textObserver.observe(item));

const endingObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        createEndingFlowers();
        endingSection.classList.add("is-visible");
        endingObserver.unobserve(endingSection);
      }
    });
  },
  { threshold: 0.42 }
);

if (endingSection) endingObserver.observe(endingSection);

function burstFlower(flower) {
  if (!flower || flower.classList.contains("is-bursting")) return;
  flower.classList.add("is-bursting");

  const count = 14;
  Array.from({ length: count }).forEach((_, index) => {
    const particle = document.createElement("span");
    const angle = (Math.PI * 2 * index) / count + Math.random() * 0.35;
    const distance = 28 + Math.random() * 36;
    particle.className = "flower-particle";
    particle.style.setProperty("--px", `${Math.cos(angle) * distance}px`);
    particle.style.setProperty("--py", `${Math.sin(angle) * distance}px`);
    particle.style.setProperty("--p-size", `${4 + Math.random() * 5}px`);
    flower.appendChild(particle);
  });

  window.setTimeout(() => flower.remove(), 560);
}

function createEndingFlowers() {
  if (!flowerField || flowersReady) return;
  flowersReady = true;
  const flowerCount = window.innerWidth < 700 ? 12 : 22;

  Array.from({ length: flowerCount }).forEach((_, index) => {
    const flower = document.createElement("button");
    const img = document.createElement("img");
    const x = 4 + ((index * 37) % 92) + (Math.random() * 4 - 2);
    const size = window.innerWidth < 700 ? 24 + Math.random() * 16 : 32 + Math.random() * 22;
    const duration = 10 + Math.random() * 9;
    const delay = -Math.random() * duration;
    const drift = (Math.random() - 0.5) * 110;
    const sway = 8 + Math.random() * 20;
    const spin = 120 + Math.random() * 220;

    flower.className = "falling-flower";
    flower.type = "button";
    flower.setAttribute("aria-label", "PawPing falling flower");
    flower.style.setProperty("--x", `${x}%`);
    flower.style.setProperty("--size", `${size}px`);
    flower.style.setProperty("--duration", `${duration}s`);
    flower.style.setProperty("--delay", `${delay}s`);
    flower.style.setProperty("--drift", `${drift}px`);
    flower.style.setProperty("--sway", `${sway}px`);
    flower.style.setProperty("--r", `${Math.random() * 90 - 45}deg`);
    flower.style.setProperty("--spin", `${spin}deg`);

    img.src = "./assets/source/falling-flower.webp";
    img.alt = "";
    img.draggable = false;
    flower.appendChild(img);
    flower.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      burstFlower(flower);
      tone("tap");
    });
    flowerField.appendChild(flower);
  });
}

window.addEventListener("mousemove", (event) => {
  cursor.style.left = `${event.clientX}px`;
  cursor.style.top = `${event.clientY}px`;

  if (heroCharacter) {
    const x = event.clientX / window.innerWidth - 0.5;
    const y = event.clientY / window.innerHeight - 0.5;
    heroCharacter.style.translate = `${x * 18}px ${y * 12}px`;
  }
});

magneticItems.forEach((item) => {
  item.addEventListener("mousemove", (event) => {
    const rect = item.getBoundingClientRect();
    const x = event.clientX - rect.left - rect.width / 2;
    const y = event.clientY - rect.top - rect.height / 2;
    item.style.transform = `translate(${x * 0.14}px, ${y * 0.14}px)`;
  });
  item.addEventListener("mouseleave", () => {
    item.style.transform = "";
  });
});

const interactiveSelector = [
  "a[href]",
  "button",
  "[data-modal]",
  "[role='button']",
  "[tabindex]:not([tabindex='-1'])",
  ".heart-button",
  ".falling-flower",
].join(", ");

document.querySelectorAll(interactiveSelector).forEach((item) => {
  item.addEventListener("mouseenter", () => {
    cursor.classList.add("is-interactive");
    tone("hover");
  });
  item.addEventListener("mouseleave", () => {
    cursor.classList.remove("is-interactive");
  });
  item.addEventListener("click", () => tone("tap"));
});

document.addEventListener("pointerover", (event) => {
  const target = event.target.closest(interactiveSelector);
  if (!target) return;
  cursor.classList.add("is-interactive");
});

document.addEventListener("pointerout", (event) => {
  const target = event.target.closest(interactiveSelector);
  if (!target) return;
  if (event.relatedTarget && target.contains(event.relatedTarget)) return;
  cursor.classList.remove("is-interactive");
});

heroHeadButton?.addEventListener("click", () => {
  heroCharacter.classList.remove("slogan-visible");
  void heroCharacter.offsetWidth;
  heroCharacter.classList.add("slogan-visible");
});

characterButton?.addEventListener("click", () => {
  dogIndex = (dogIndex + 1) % dogSources.length;
  characterImage.src = dogSources[dogIndex];
  characterButton.classList.remove("is-switching");
  void characterButton.offsetWidth;
  characterButton.classList.add("is-switching");
  window.setTimeout(() => characterButton.classList.remove("is-switching"), 560);
  createRibbonBurst();
});

function createRibbonBurst() {
  if (!ribbonBurst) return;
  ribbonBurst.textContent = "";
  const angles = [-160, -118, -74, -28, 18, 52, 96, 138];
  angles.forEach((angle, index) => {
    const ribbon = document.createElement("i");
    ribbon.style.setProperty("--angle", `${angle + (Math.random() * 12 - 6)}deg`);
    ribbon.style.setProperty("--distance", `${120 + Math.random() * 90}px`);
    ribbon.style.setProperty("--w", `${58 + Math.random() * 76}px`);
    ribbon.style.setProperty("--delay", `${index * 24}ms`);
    ribbonBurst.appendChild(ribbon);
  });
  window.setTimeout(() => {
    ribbonBurst.textContent = "";
  }, 980);
}

function openModalFromTrigger(trigger) {
  if (!trigger?.dataset?.modal) return;
  const modalMode = trigger.dataset.modalMode || "";

  modal.classList.remove("is-floating-cans", "is-food-detail", "is-logo-construction");
  modalImage.src = `./assets/${trigger.dataset.modal}`;
  modal.classList.toggle("is-floating-cans", modalMode === "floating-cans");
  modal.classList.toggle("is-food-detail", modalMode === "food-detail");
  modal.classList.toggle("is-logo-construction", modalMode === "logo-construction");
  modal.hidden = false;

  if (modalMode === "logo-construction") {
    document.querySelectorAll(".logo-build-layer").forEach((layer) => {
      layer.style.animation = "none";
      void layer.offsetWidth;
      layer.style.animation = "";
    });
  }

  if (modalMode === "food-detail") {
    document.querySelectorAll(".food-reveal-layer").forEach((layer) => {
      layer.style.animation = "none";
      void layer.offsetWidth;
      layer.style.animation = "";
    });
  }

  document.body.style.overflow = "hidden";
}

modalTriggers.forEach((trigger) => {
  trigger.addEventListener("click", (event) => {
    if (trigger.closest(".horizontal-wrap")) {
      event.preventDefault();
      event.stopPropagation();
      if (openedFromHorizontalPointer) return;
    }
    openModalFromTrigger(trigger);
  });

  trigger.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    openModalFromTrigger(trigger);
  });
});

function burstHeart(button) {
  button.classList.remove("is-popping");
  void button.offsetWidth;
  button.classList.add("is-liked", "is-popping");

  const angles = [-72, -45, -18, 10, 36, 64, 102, 136, 178];
  angles.forEach((angle, index) => {
    const particle = document.createElement("span");
    const distance = 22 + (index % 3) * 7;
    const radians = (angle * Math.PI) / 180;
    particle.className = "heart-particle";
    particle.style.setProperty("--x", `${Math.cos(radians) * distance}px`);
    particle.style.setProperty("--y", `${Math.sin(radians) * distance}px`);
    button.appendChild(particle);
    window.setTimeout(() => particle.remove(), 520);
  });

  window.setTimeout(() => button.classList.remove("is-popping"), 500);
}

heartButtons.forEach((button) => {
  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    burstHeart(button);
    tone("tap");
  });
});

function closeModal() {
  modal.hidden = true;
  modalImage.src = "";
  modal.classList.remove("is-floating-cans");
  modal.classList.remove("is-food-detail");
  modal.classList.remove("is-logo-construction");
  document.body.style.overflow = "";
}

modalClose.addEventListener("click", closeModal);
modal.addEventListener("click", (event) => {
  if (event.target === modal) closeModal();
});
window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !modal.hidden) closeModal();
});

horizontalWrap?.addEventListener("pointerdown", (event) => {
  isDragging = true;
  dragMoved = false;
  dragStart = event.clientX - trackX;
  dragStartClientX = event.clientX;
  dragStartClientY = event.clientY;
  pendingHorizontalTrigger = event.target.closest("[data-modal]");
  horizontalWrap.setPointerCapture(event.pointerId);
});

horizontalWrap?.addEventListener("pointermove", (event) => {
  if (!isDragging) return;
  const max = Math.max(0, horizontalTrack.scrollWidth - horizontalWrap.clientWidth);
  const nextX = Math.max(-max, Math.min(0, event.clientX - dragStart));
  if (
    Math.abs(nextX - trackX) > 4 ||
    Math.hypot(event.clientX - dragStartClientX, event.clientY - dragStartClientY) > 8
  ) {
    dragMoved = true;
  }
  trackX = nextX;
  horizontalTrack.style.transform = `translate3d(${trackX}px, 0, 0)`;
});

horizontalWrap?.addEventListener("pointerup", (event) => {
  isDragging = false;
  if (pendingHorizontalTrigger && horizontalWrap.contains(pendingHorizontalTrigger) && !dragMoved) {
    event.preventDefault();
    openedFromHorizontalPointer = true;
    openModalFromTrigger(pendingHorizontalTrigger);
    window.setTimeout(() => {
      openedFromHorizontalPointer = false;
    }, 0);
  }
  pendingHorizontalTrigger = null;
});

horizontalWrap?.addEventListener("click", (event) => {
  const trigger = event.target.closest("[data-modal]");
  if (!trigger || !horizontalWrap.contains(trigger)) return;
  if (openedFromHorizontalPointer) {
    event.preventDefault();
    event.stopPropagation();
    return;
  }
  if (dragMoved) {
    event.preventDefault();
    event.stopPropagation();
    dragMoved = false;
    return;
  }
  event.preventDefault();
  event.stopPropagation();
  openModalFromTrigger(trigger);
});

horizontalWrap?.addEventListener(
  "wheel",
  (event) => {
    event.preventDefault();
    const max = Math.max(0, horizontalTrack.scrollWidth - horizontalWrap.clientWidth);
    const delta = Math.abs(event.deltaY) > Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
    trackX = Math.max(-max, Math.min(0, trackX - delta * 1.18));
    horizontalTrack.style.transition = "transform 420ms cubic-bezier(0.16, 1, 0.3, 1)";
    horizontalTrack.style.transform = `translate3d(${trackX}px, 0, 0)`;
    window.clearTimeout(horizontalTrack._wheelTimer);
    horizontalTrack._wheelTimer = window.setTimeout(() => {
      horizontalTrack.style.transition = "";
    }, 430);
  },
  { passive: false }
);

window.addEventListener("resize", resizeParticles);
resizeParticles();
drawParticles();
updateScroll();
