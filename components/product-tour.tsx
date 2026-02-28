"use client";

import { useCallback, useEffect } from "react";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";

// ─── Tour steps ───────────────────────────────────────────────────────────────

const TOUR_STEPS = [
  {
    element: "[data-tour='prompt-input']",
    popover: {
      title: "Start with a visual concept",
      description:
        "Type a specific, visceral moment — a body part, a before/after, a problem someone feels. The AI will ideate and ask 1–2 quick questions before generating. <br/><br/><em>Try: \"cracked heels on tile floor\" or \"puffy under-eye bags, unflattering morning selfie\"</em>",
      side: "top" as const,
      align: "start" as const,
    },
  },
  {
    element: "[data-tour='model-selector']",
    popover: {
      title: "Choose your model",
      description:
        "Pick the AI model used for generation. <strong>Nano Banana 2</strong> is the default — fast and photorealistic. <strong>Seedream</strong> and <strong>Ideogram</strong> are great alternatives with different strengths.",
      side: "top" as const,
      align: "start" as const,
    },
  },
  {
    element: "[data-tour='batch-count']",
    popover: {
      title: "Generate multiple at once",
      description:
        "1×, 2×, or 4× — run the same prompt multiple times in one go to get variations. Great for quickly finding which composition works best.",
      side: "top" as const,
      align: "start" as const,
    },
  },
  {
    element: "[data-tour='brief-button']",
    popover: {
      title: "Creative Brief mode",
      description:
        "Have a full campaign ready? Fill in product, audience, benefit, and emotional angle — the AI generates and queues up to 8 distinct concepts at once.",
      side: "top" as const,
      align: "start" as const,
    },
  },
  {
    element: "[data-tour='gallery-link']",
    popover: {
      title: "Every image is saved here",
      description:
        "Your Gallery stores every generated image automatically. Select images and click <strong>Create deck</strong> to build a shareable link you can send to clients — no login required on their end.",
      side: "bottom" as const,
      align: "end" as const,
    },
  },
];

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useProductTour() {
  // Pre-load driver.js CSS without a visible flash
  useEffect(() => {}, []);

  const startTour = useCallback(() => {
    const driverObj = driver({
      showProgress: true,
      animate: true,
      smoothScroll: true,
      allowClose: true,
      overlayOpacity: 0.55,
      stagePadding: 6,
      stageRadius: 8,
      popoverClass: "native-ads-tour-popover",
      overlayColor: "rgba(0,0,0,0.6)",
      progressText: "{{current}} of {{total}}",
      nextBtnText: "Next →",
      prevBtnText: "← Back",
      doneBtnText: "Done",
      steps: TOUR_STEPS,
      onPopoverRender: (popover) => {
        // Inject custom footer note on last step
        const isLast = driverObj.isLastStep();
        if (isLast) {
          const note = document.createElement("p");
          note.className = "tour-footer-note";
          note.style.cssText =
            "margin-top:10px; font-size:11px; color: var(--color-muted-foreground, #888); line-height:1.5;";
          note.textContent =
            "Tip: Press ⌘K anywhere to quickly switch chats, change model, or copy the last image URL.";
          popover.wrapper.appendChild(note);
        }
      },
    });

    driverObj.drive();
  }, []);

  return { startTour };
}
