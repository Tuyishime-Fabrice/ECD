/**
 * Minimal YouTube IFrame Player API wrapper. The API script is loaded only
 * when a player page asks for it.
 */

export type YTPlayer = {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  getCurrentTime(): number;
  getDuration(): number;
  getPlayerState(): number;
  destroy(): void;
};

type YTEvent = { target: YTPlayer; data: number };

export type YTPlayerOptions = {
  host: string;
  videoId: string;
  width?: string | number;
  height?: string | number;
  playerVars: Record<string, string | number>;
  events: {
    onReady?: (e: YTEvent) => void;
    onStateChange?: (e: YTEvent) => void;
    onError?: (e: YTEvent) => void;
  };
};

type YTNamespace = { Player: new (el: HTMLElement, options: YTPlayerOptions) => YTPlayer };

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

export const PlayerState = { UNSTARTED: -1, ENDED: 0, PLAYING: 1, PAUSED: 2, BUFFERING: 3, CUED: 5 } as const;

/** Privacy-enhanced mode: no tracking cookies until the child presses play. */
export const YOUTUBE_HOST = "https://www.youtube-nocookie.com";

let loading: Promise<YTNamespace> | null = null;

export function loadYouTubeApi(timeoutMs = 15000): Promise<YTNamespace> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (loading) return loading;

  loading = new Promise<YTNamespace>((resolve, reject) => {
    const script = document.createElement("script");
    const previous = window.onYouTubeIframeAPIReady;
    const fail = (reason: string) => {
      clearTimeout(timer);
      loading = null;
      script.remove();
      // iframe_api leaves a `YT` stub (with YT.loading set) even when its second script fails;
      // left in place, it would make every retry a no-op until the page reloads.
      if (window.YT && !window.YT.Player) {
        delete window.YT;
        document.getElementById("www-widgetapi-script")?.remove();
      }
      window.onYouTubeIframeAPIReady = previous;
      reject(new Error(reason));
    };
    const timer = setTimeout(() => fail("YouTube API timed out"), timeoutMs);
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      clearTimeout(timer);
      if (window.YT?.Player) resolve(window.YT);
      else fail("YouTube API missing");
    };
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    script.onerror = () => fail("YouTube API could not load");
    document.head.appendChild(script);
  });
  return loading;
}
