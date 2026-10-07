"use client";

import { useState } from "react";

/** Replayable one-shot animation: call `trigger()`, spread `props` on the element. */
export function useOneShot(animationClass: string) {
  const [on, setOn] = useState(false);
  return {
    trigger: () => setOn(true),
    className: on ? animationClass : "",
    props: { onAnimationEnd: () => setOn(false) },
  };
}
