"use client";

import clsx from "clsx";
import { useRouter } from "next/navigation";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import type { EpisodeView, SeasonCard } from "@/content/types";
import { useImmersive } from "@/lib/immersive";
import { duePausePoint, effectiveDuration, initialTriggered } from "@/lib/playback";
import { resumePosition } from "@/lib/progress";
import { timeUpNow, useUsageTicker } from "@/lib/screen-time";
import { nextAfter } from "@/lib/recommend";
import { getStore, useDocumentTitle, useHydrated, useLang, useLearningState, usePick, useT } from "@/lib/store";
import { PlayerState, type YTPlayer } from "@/lib/youtube";
import { BigControls } from "./BigControls";
import { EndScreen } from "./EndScreen";
import { FriendlyError } from "./FriendlyError";
import { Backdrop } from "./kid/Scene";
import { QuestionHomeLink } from "./QuestionHomeLink";
import { QuestionPanel } from "./QuestionPanel";
import { TimesUp } from "./TimesUp";
import { YouTubePlayer, type PlayerError } from "./YouTubePlayer";

type Phase = "video" | "question" | "ended" | "timesup" | "error";

const POLL_MS = 500;
const AUTOPLAY_GRACE_MS = 1800;

/** Leave YouTube's fullscreen so our question / end screen (in the page) can be seen and tapped. */
function leaveFullscreen() {
  const d = document as Document & { webkitFullscreenElement?: Element | null; webkitExitFullscreen?: () => void };
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  else if (d.webkitFullscreenElement) d.webkitExitFullscreen?.();
}

export function WatchView({ episode, seasons }: { episode: EpisodeView; seasons: SeasonCard[] }) {
  const router = useRouter();
  const lang = useLang();
  const pick = usePick();
  const learning = useLearningState();
  // The player (and YouTube's script) starts only after the time-limit check has run.
  const hydrated = useHydrated();

  const [phase, setPhaseState] = useState<Phase>("video");
  // The same phase, readable immediately: player events can arrive before React re-renders.
  const phaseNow = useRef<Phase>("video");
  const setPhase = (next: Phase) => {
    phaseNow.current = next;
    setPhaseState(next);
  };
  const [ready, setReady] = useState(false);
  const [playerState, setPlayerState] = useState<number>(PlayerState.UNSTARTED);
  const [hasPlayed, setHasPlayed] = useState(false);
  /** The first seconds after "ready" are over and it still hasn't played. */
  const [graceOver, setGraceOver] = useState(false);
  const [questionIndex, setQuestionIndex] = useState<number | null>(null);
  const [error, setError] = useState<PlayerError | null>(null);
  const [attempt, setAttempt] = useState(0);

  // Buffering shows the Pause icon (the video is on its way), but only real playback counts as screen time.
  const playing = playerState === PlayerState.PLAYING || playerState === PlayerState.BUFFERING;
  // Autoplay blocked: make our Play button giant (never an overlay on the video). Derived from the
  // live player state, so a slow first buffer that ends in a block still gets the big button.
  const needsTap = graceOver && !hasPlayed && !playing;

  useDocumentTitle(pick(episode.title));
  useImmersive(phase === "video" || phase === "question");
  useUsageTicker(playerState === PlayerState.PLAYING && phase === "video");

  const player = useRef<YTPlayer | null>(null);
  const triggered = useRef<Set<number>>(new Set());
  const lastSaved = useRef(-1);
  /** Where a seek is heading; until the player reports that time, ignore what it says. */
  const seekTarget = useRef<number | null>(null);

  useEffect(() => {
    if (phase !== "video") leaveFullscreen();
  }, [phase]);

  const duration = (p: YTPlayer) => effectiveDuration(p.getDuration(), episode.durationSec);

  function handleReady(p: YTPlayer) {
    player.current = p;
    const start = resumePosition(getStore().getEpisodeProgress(episode.id), duration(p));
    triggered.current = initialTriggered(episode.pausePoints, start);
    if (start > 0) {
      seekTarget.current = start;
      p.seekTo(start, true);
    }
    // The child's tap on the card was the gesture; phones may still block this.
    p.playVideo();
    setReady(true);
  }

  function handleStateChange(state: number) {
    setPlayerState(state);
    if (state === PlayerState.PLAYING) {
      setHasPlayed(true);
      // The video must not run behind a question or the end screen (e.g. from iPhone's own player).
      if (phaseNow.current !== "video") player.current?.pauseVideo();
    }
    if (state === PlayerState.ENDED) {
      getStore().markEpisodeEnded(episode.id);
      // The episode always finishes; only then does the daily limit apply.
      setPhase(timeUpNow() ? "timesup" : "ended");
    }
  }

  function handleError(e: PlayerError) {
    setError(e);
    setPhase("error");
  }

  useEffect(() => {
    if (!ready || hasPlayed) return;
    const timer = setTimeout(() => setGraceOver(true), AUTOPLAY_GRACE_MS);
    return () => clearTimeout(timer);
  }, [ready, hasPlayed]);

  const tick = useEffectEvent(() => {
    const p = player.current;
    if (!p) return;
    const t = p.getCurrentTime();
    if (seekTarget.current !== null) {
      // Right after a seek the player may still report the old time; don't save it or fire a question.
      if (Math.abs(t - seekTarget.current) > 2) return;
      seekTarget.current = null;
    }
    if (Math.abs(t - lastSaved.current) >= 0.4) {
      getStore().saveEpisodePosition(episode.id, t, duration(p));
      lastSaved.current = t;
    }
    const due = duePausePoint(episode.pausePoints, t, triggered.current);
    if (due !== null) {
      triggered.current.add(due);
      p.pauseVideo();
      setQuestionIndex(due);
      setPhase("question");
    }
  });

  useEffect(() => {
    if (!playing || phase !== "video") return;
    const id = setInterval(tick, POLL_MS);
    return () => clearInterval(id);
  }, [playing, phase]);

  function resumeAfterQuestion() {
    setQuestionIndex(null);
    setPhase("video");
    player.current?.playVideo();
  }

  function togglePlay() {
    const p = player.current;
    if (!p) return;
    if (playing && !needsTap) p.pauseVideo();
    else p.playVideo();
  }

  function replay() {
    const p = player.current;
    if (!p) return;
    // Starting over is a new viewing: once today's time is used up, it's time to play outside.
    if (timeUpNow()) {
      p.pauseVideo();
      setPhase("timesup");
      return;
    }
    triggered.current = new Set();
    lastSaved.current = -1;
    seekTarget.current = 0;
    setPhase("video");
    p.seekTo(0, true);
    p.playVideo();
  }

  function retry() {
    player.current = null;
    setError(null);
    setReady(false);
    setHasPlayed(false);
    setGraceOver(false);
    setPlayerState(PlayerState.UNSTARTED);
    setPhase("video");
    setAttempt((a) => a + 1);
  }

  const question = questionIndex !== null ? episode.pausePoints[questionIndex]?.question : undefined;
  const showVideo = phase === "video";

  return (
    <div className="relative min-h-[calc(100dvh-5rem)] pb-40 short:min-h-0 short:pb-2">
      {/* The world around the player: sky above, hills along the bottom of the screen. */}
      <Backdrop scene="watch" sceneClassName="h-36 md:h-56" />

      <div className="relative mx-auto w-full max-w-5xl px-3 sm:px-4">
        <h1 className="sr-only">{pick(episode.title)}</h1>

        {/* The player stays mounted; while a question or the end screen shows, it is hidden, not covered. */}
        <div
          aria-hidden={!showVideo}
          className={clsx(
            "mx-auto w-full max-w-[calc((100dvh-290px)*16/9+16px)] rounded-[26px] bg-paper p-2 shadow-e2 shadow-rim",
            "short:max-w-[calc((100dvh-100px)*16/9)] short:rounded-none short:bg-transparent short:p-0 short:shadow-none",
            showVideo ? "relative" : "pointer-events-none invisible absolute inset-x-3 top-0",
          )}
        >
          <div className="relative aspect-video overflow-hidden rounded-[18px] bg-black short:rounded-none">
            <img
              src={episode.thumbnail}
              alt=""
              width={320}
              height={180}
              className="absolute inset-0 size-full object-cover opacity-60"
            />
            {hydrated && phase !== "error" && (
              <YouTubePlayer
                key={attempt}
                videoId={episode.videoId}
                lang={lang}
                onReady={handleReady}
                onStateChange={handleStateChange}
                onError={handleError}
              />
            )}
          </div>
        </div>

        {showVideo && <StoryCaption number={episode.number} title={pick(episode.title)} />}

        {showVideo && (
          <BigControls
            ready={ready}
            playing={playing}
            needsTap={needsTap}
            onHome={() => router.push("/")}
            onTogglePlay={togglePlay}
            onReplay={replay}
          />
        )}

        {phase === "question" && question && (
          <div className="py-4 short:py-2">
            <QuestionHomeLink className="mb-2 ml-4" />
            <QuestionPanel key={question.id} question={question} onComplete={resumeAfterQuestion} />
          </div>
        )}

        {phase === "ended" && (
          <EndScreen
            homeActivity={episode.homeActivity}
            next={nextAfter(seasons, episode.id, learning)}
            onWatchAgain={replay}
          />
        )}

        {phase === "timesup" && <TimesUp homeActivity={episode.homeActivity} onExtended={() => setPhase("ended")} />}

        {phase === "error" && <FriendlyError offline={error === "offline"} onRetry={retry} />}
      </div>
    </div>
  );
}

/** Which story is playing, under the player (hidden on phones held sideways). */
function StoryCaption({ number, title }: { number: number; title: string }) {
  const t = useT();
  return (
    <div aria-hidden className="mx-auto mt-3 max-w-2xl text-center short:hidden">
      <p className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-ink-2">{t("episodeN", { n: number })}</p>
      <p className="line-clamp-1 font-display text-[22px] font-extrabold leading-tight text-ink">{title}</p>
    </div>
  );
}
