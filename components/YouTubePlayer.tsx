"use client";

import { useEffect, useEffectEvent, useRef } from "react";
import { loadYouTubeApi, YOUTUBE_HOST, type YTPlayer } from "@/lib/youtube";

export type PlayerError = "offline" | "unavailable";

/** If YouTube hasn't said "ready" by then (e.g. the connection dropped), show the friendly error.
 *  Generous, because a working player can take this long on 2G/3G. */
const READY_TIMEOUT_MS = 45000;

/**
 * iPhones have no element fullscreen: YouTube's button opens the native player,
 * which hides our questions and end screen and can't be closed from the page.
 * Offer YouTube's fullscreen button only where we can bring the child back.
 */
function fullscreenSupported() {
  const d = document as Document & { webkitFullscreenEnabled?: boolean };
  return Boolean(document.fullscreenEnabled || d.webkitFullscreenEnabled);
}

type Props = {
  videoId: string;
  lang: string;
  onReady: (player: YTPlayer) => void;
  onStateChange: (state: number, player: YTPlayer) => void;
  onError: (error: PlayerError) => void;
};

/**
 * Embeds the YouTube player (privacy-enhanced host). The iframe is created
 * inside a container React doesn't manage, so YouTube can replace nodes
 * freely. Nothing is ever drawn on top of it.
 */
export function YouTubePlayer({ videoId, lang, onReady, onStateChange, onError }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  const ready = useEffectEvent((p: YTPlayer) => onReady(p));
  const changed = useEffectEvent((state: number, p: YTPlayer) => onStateChange(state, p));
  const failed = useEffectEvent((e: PlayerError) => onError(e));

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let cancelled = false;
    let player: YTPlayer | null = null;
    let readyTimer: ReturnType<typeof setTimeout> | undefined;
    const fail = () => {
      if (!cancelled) failed(navigator.onLine ? "unavailable" : "offline");
    };

    loadYouTubeApi()
      .then((YT) => {
        if (cancelled) return;
        // The API can already be in memory from an earlier episode while the device is offline.
        if (!navigator.onLine) {
          fail();
          return;
        }
        // An iframe that can't load never reports ready or error, so don't wait forever.
        readyTimer = setTimeout(fail, READY_TIMEOUT_MS);
        const target = document.createElement("div");
        container.appendChild(target);
        player = new YT.Player(target, {
          host: YOUTUBE_HOST,
          videoId,
          width: "100%",
          height: "100%",
          playerVars: {
            rel: 0,
            playsinline: 1,
            controls: 1,
            iv_load_policy: 3,
            fs: fullscreenSupported() ? 1 : 0,
            enablejsapi: 1,
            origin: window.location.origin,
            hl: lang,
          },
          events: {
            onReady: (e) => {
              clearTimeout(readyTimer);
              if (!cancelled) ready(e.target);
            },
            onStateChange: (e) => !cancelled && changed(e.data, e.target),
            // 2 bad id, 5 HTML5 error, 100 removed/private, 101/150 embedding not allowed.
            onError: () => {
              clearTimeout(readyTimer);
              fail();
            },
          },
        });
      })
      .catch(fail);

    return () => {
      cancelled = true;
      clearTimeout(readyTimer);
      try {
        player?.destroy();
      } catch {
        // Player was never fully created.
      }
      container.replaceChildren();
    };
  }, [videoId, lang]);

  return <div ref={containerRef} className="absolute inset-0 [&>iframe]:block [&>iframe]:size-full" />;
}
