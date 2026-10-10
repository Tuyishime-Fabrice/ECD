/**
 * Reads a video's length with the YouTube IFrame API, in a small hidden player.
 * Only the story editor calls this, so the API script loads on that page alone.
 * Resolves null when YouTube can't be reached; the editor then asks for the length.
 */
import { loadYouTubeApi, YOUTUBE_HOST, type YTPlayer } from "@/lib/youtube";

const TIMEOUT_MS = 12_000;

export async function readVideoLength(videoId: string): Promise<number | null> {
  let YT: Awaited<ReturnType<typeof loadYouTubeApi>>;
  try {
    YT = await loadYouTubeApi(TIMEOUT_MS);
  } catch {
    return null;
  }
  const box = document.createElement("div");
  box.setAttribute("aria-hidden", "true");
  box.style.cssText = "position:fixed;left:-10000px;top:0;width:320px;height:180px;overflow:hidden;pointer-events:none";
  const mount = document.createElement("div");
  box.appendChild(mount);
  document.body.appendChild(box);

  return new Promise<number | null>((resolve) => {
    let player: YTPlayer | null = null;
    let finished = false;
    const finish = (seconds: number | null) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      try {
        player?.destroy();
      } catch {
        // Already gone.
      }
      box.remove();
      resolve(seconds && seconds > 0 ? Math.round(seconds) : null);
    };
    const timer = setTimeout(() => finish(null), TIMEOUT_MS);
    try {
      player = new YT.Player(mount, {
        host: YOUTUBE_HOST,
        videoId,
        width: 320,
        height: 180,
        playerVars: { autoplay: 0, controls: 0, rel: 0 },
        events: {
          onReady: (e) => {
            // The length can take a moment to arrive after the player is ready.
            let tries = 0;
            const check = () => {
              const seconds = e.target.getDuration();
              if (seconds > 0) finish(seconds);
              else if (++tries < 20) setTimeout(check, 250);
              else finish(null);
            };
            check();
          },
          onError: () => finish(null),
        },
      });
    } catch {
      finish(null);
    }
  });
}
