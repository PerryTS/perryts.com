// Motion from "Motion notes (for dev)": explain, never decorate. Everything here is skipped
// under prefers-reduced-motion, and the markup is complete without it.
//
// Hooks (add to markup):
//   data-reveal              fade up 8px when visible; stagger with style="--i: n"
//   data-grow="x" | "y"      scale in from 0 on that axis when visible (bars, pixel columns)
//   data-count               count the number up to its rendered text, once
//   data-typing              reveal [data-line] children one after another, once
//   data-copy="text"         button that copies text to the clipboard
//   data-cycle="once|loop"   highlight [data-cycle-item] children one at a time (.is-current, earlier
//                            ones get .is-past); "once" stops on the last item, "loop" runs only
//                            while visible. Interval via data-cycle-interval (ms, default 600).

const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function countUp(el: HTMLElement) {
  const final = el.textContent ?? "";
  const match = final.match(/[\d.,]+/);
  if (!match) return;
  const digits = match[0];
  const decimals = /[.,]\d$/.test(digits) ? 1 : 0;
  const target = Number(digits.replace(/[.,](?=\d{3}\b)/g, "").replace(",", "."));
  if (!Number.isFinite(target)) return;
  const lang = document.documentElement.lang || "en";
  const fmt = new Intl.NumberFormat(lang, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  const start = performance.now();
  const duration = 800;
  const frame = (now: number) => {
    // rAF timestamps can predate `start`; clamp so the first frame never goes negative.
    const t = Math.min(1, Math.max(0, (now - start) / duration));
    const eased = 1 - Math.pow(1 - t, 3);
    el.textContent = t < 1 ? final.replace(digits, fmt.format(target * eased)) : final;
    if (t < 1) requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

function typeLines(el: HTMLElement) {
  const lines = Array.from(el.querySelectorAll<HTMLElement>("[data-line]"));
  lines.forEach((line, i) => {
    window.setTimeout(() => line.classList.add("is-in"), 180 * i);
  });
}

function startCycle(el: HTMLElement): () => void {
  const items = Array.from(el.querySelectorAll<HTMLElement>("[data-cycle-item]"));
  const loop = el.dataset.cycle === "loop";
  const interval = Number(el.dataset.cycleInterval ?? 600);
  let index = 0;
  const step = () => {
    items.forEach((item, i) => {
      item.classList.toggle("is-current", i === index);
      item.classList.toggle("is-past", i < index);
    });
    if (index === items.length - 1 && !loop) return window.clearInterval(timer);
    index = (index + 1) % items.length;
  };
  const timer = window.setInterval(step, interval);
  step();
  return () => window.clearInterval(timer);
}

if (!reduced) {
  // Cycles start when visible; looping ones stop when scrolled away so nothing animates off-screen.
  const stops = new Map<Element, () => void>();
  const cycles = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      const el = entry.target as HTMLElement;
      if (entry.isIntersecting && !stops.has(el)) {
        stops.set(el, startCycle(el));
        if (el.dataset.cycle !== "loop") cycles.unobserve(el);
      } else if (!entry.isIntersecting && el.dataset.cycle === "loop") {
        stops.get(el)?.();
        stops.delete(el);
      }
    }
  }, { threshold: 0.4 });
  document.querySelectorAll("[data-cycle]").forEach((el) => cycles.observe(el));

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const el = entry.target as HTMLElement;
        el.classList.add("is-in");
        if (el.hasAttribute("data-count")) countUp(el);
        if (el.hasAttribute("data-typing")) typeLines(el);
        observer.unobserve(el);
      }
    },
    { rootMargin: "0px 0px -10% 0px" },
  );
  document
    .querySelectorAll("[data-reveal], [data-count], [data-typing]")
    .forEach((el) => observer.observe(el));

  // [data-grow] elements start scaled to zero, and a zero-size box inside a clipping ancestor
  // never reports as intersecting. Observe their parent (which keeps its size) instead.
  const growParents = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.querySelectorAll(":scope > [data-grow]").forEach((el) => el.classList.add("is-in"));
        growParents.unobserve(entry.target);
      }
    },
    { rootMargin: "0px 0px -10% 0px" },
  );
  new Set(Array.from(document.querySelectorAll("[data-grow]"), (el) => el.parentElement!)).forEach((parent) =>
    growParents.observe(parent),
  );
} else {
  document.querySelectorAll("[data-line]").forEach((el) => el.classList.add("is-in"));
}

document.addEventListener("click", async (event) => {
  const button = (event.target as Element).closest<HTMLElement>("[data-copy]");
  if (!button) return;
  try {
    await navigator.clipboard.writeText(button.dataset.copy ?? "");
    button.dataset.copied = "true";
    window.setTimeout(() => delete button.dataset.copied, 1600);
  } catch {
    // Clipboard blocked (insecure context or permissions): the command stays selectable.
  }
});
