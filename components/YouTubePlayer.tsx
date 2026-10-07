"use client";

import { useEffect, useEffectEvent, useRef } from "react";
import { loadYouTubeApi, YOUTUBE_HOST, type YTPlayer } from "@/lib/youtube";

export type PlayerError = "offline" | "unavailable";

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

    loadYouTubeApi()
      .then((YT) => {
        if (cancelled) return;
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
            fs: 1,
            enablejsapi: 1,
            origin: window.location.origin,
            hl: lang,
          },
          events: {
            onReady: (e) => !cancelled && ready(e.target),
            onStateChange: (e) => !cancelled && changed(e.data, e.target),
            // 2 bad id, 5 HTML5 error, 100 removed/private, 101/150 embedding not allowed.
            onError: () => !cancelled && failed(navigator.onLine ? "unavailable" : "offline"),
          },
        });
      })
      .catch(() => {
        if (!cancelled) failed(navigator.onLine ? "unavailable" : "offline");
      });

    return () => {
      cancelled = true;
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
