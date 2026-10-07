"use client";

import clsx from "clsx";
import { useRouter } from "next/navigation";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import type { EpisodeView, SeasonCard } from "@/content/types";
import { duePausePoint, effectiveDuration, initialTriggered } from "@/lib/playback";
import { resumePosition } from "@/lib/progress";
import { nextAfter } from "@/lib/recommend";
import { getStore, useLang, useLearningState, usePick } from "@/lib/store";
import { PlayerState, type YTPlayer } from "@/lib/youtube";
import { BigControls } from "./BigControls";
import { EndScreen } from "./EndScreen";
import { FriendlyError } from "./FriendlyError";
import { QuestionPanel } from "./QuestionPanel";
import { YouTubePlayer, type PlayerError } from "./YouTubePlayer";

type Phase = "video" | "question" | "ended" | "error";

const POLL_MS = 500;
const AUTOPLAY_GRACE_MS = 1800;

export function WatchView({ episode, seasons }: { episode: EpisodeView; seasons: SeasonCard[] }) {
  const router = useRouter();
  const lang = useLang();
  const pick = usePick();
  const learning = useLearningState();

  const [phase, setPhase] = useState<Phase>("video");
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [hasPlayed, setHasPlayed] = useState(false);
  const [needsTap, setNeedsTap] = useState(false);
  const [questionIndex, setQuestionIndex] = useState<number | null>(null);
  const [error, setError] = useState<PlayerError | null>(null);
  const [attempt, setAttempt] = useState(0);

  const player = useRef<YTPlayer | null>(null);
  const triggered = useRef<Set<number>>(new Set());
  const lastSaved = useRef(-1);

  const duration = (p: YTPlayer) => effectiveDuration(p.getDuration(), episode.durationSec);

  function handleReady(p: YTPlayer) {
    player.current = p;
    const start = resumePosition(getStore().getEpisodeProgress(episode.id), duration(p));
    triggered.current = initialTriggered(episode.pausePoints, start);
    if (start > 0) p.seekTo(start, true);
    // The child's tap on the card was the gesture; phones may still block this.
    p.playVideo();
    setReady(true);
  }

  function handleStateChange(state: number) {
    const isPlaying = state === PlayerState.PLAYING || state === PlayerState.BUFFERING;
    setPlaying(isPlaying);
    if (state === PlayerState.PLAYING) {
      setHasPlayed(true);
      setNeedsTap(false);
    }
    if (state === PlayerState.ENDED) {
      getStore().markEpisodeEnded(episode.id);
      setPhase("ended");
    }
  }

  function handleError(e: PlayerError) {
    setError(e);
    setPhase("error");
  }

  // Autoplay blocked? Make our Play button giant (never an overlay on the video).
  useEffect(() => {
    if (!ready || hasPlayed || phase !== "video") return;
    const timer = setTimeout(() => setNeedsTap(true), AUTOPLAY_GRACE_MS);
    return () => clearTimeout(timer);
  }, [ready, hasPlayed, phase]);

  const tick = useEffectEvent(() => {
    const p = player.current;
    if (!p) return;
    const t = p.getCurrentTime();
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
    if (playing) p.pauseVideo();
    else p.playVideo();
  }

  function replay() {
    const p = player.current;
    if (!p) return;
    triggered.current = new Set();
    lastSaved.current = -1;
    setPhase("video");
    p.seekTo(0, true);
    p.playVideo();
  }

  function retry() {
    player.current = null;
    setError(null);
    setReady(false);
    setHasPlayed(false);
    setNeedsTap(false);
    setPhase("video");
    setAttempt((a) => a + 1);
  }

  const question = questionIndex !== null ? episode.pausePoints[questionIndex]?.question : undefined;
  const showVideo = phase === "video";

  return (
    <div className="relative mx-auto w-full max-w-5xl sm:px-4">
      <h1 className="sr-only">{pick(episode.title)}</h1>

      {/* The player stays mounted; while a question or the end screen shows, it is hidden, not covered. */}
      <div
        aria-hidden={!showVideo}
        className={clsx(
          "mx-auto aspect-video w-full max-w-[calc((100dvh-232px)*16/9)] overflow-hidden bg-ink-900 sm:rounded-card",
          "short:max-w-[calc((100dvh-100px)*16/9)]",
          showVideo ? "relative" : "pointer-events-none invisible absolute inset-x-0 top-0",
        )}
      >
        <img
          src={episode.thumbnail}
          alt=""
          width={320}
          height={180}
          className="absolute inset-0 size-full object-cover opacity-60"
        />
        {phase !== "error" && (
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

      {phase === "error" && <FriendlyError offline={error === "offline"} onRetry={retry} />}
    </div>
  );
}
