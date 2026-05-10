import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Star, Radio, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type {
  FanviewFeedItem,
  FanviewMeta,
  FanviewState,
  FanviewSummary,
} from "@/lib/fanview";
import { cn } from "@/lib/utils";
import { readableTextColor } from "@/lib/colorContrast";
import { fireWinConfetti } from "@/utils/winConfetti";
import { formatLabel, maxSets } from "@/utils/setRules";
import { getPositionGroup, passAverage, dumpHittingPct, type Position } from "@/types";

/** Pull team text colors from meta with auto-contrast applied. */
function teamTextColors(meta: FanviewMeta) {
  return {
    homeText: readableTextColor(meta.homeColor),
    awayText: readableTextColor(meta.awayColor),
  };
}

export const Route = createFileRoute("/fanview/$sessionId")({
  head: ({ params }) => ({
    meta: [
      { title: "FanView — CourtsideView" },
      { name: "description", content: "Follow this volleyball match live." },
      { property: "og:title", content: "CourtsideView FanView — Live Match" },
      { property: "og:description", content: "Follow the game in real time, no app required." },
    ],
  }),
  component: FanviewPage,
});

interface SessionRow {
  id: string;
  meta: FanviewMeta;
  state: FanviewState;
  feed: FanviewFeedItem[];
  summary: FanviewSummary | null;
  is_live: boolean;
}

function FanviewPage() {
  const { sessionId } = Route.useParams();
  const [row, setRow] = useState<SessionRow | null>(null);
  const [status, setStatus] = useState<"loading" | "ok" | "missing">("loading");

  // FanView always respects watcher's browser preference (prefers-color-scheme),
  // independent of the app user's chosen theme. Mark the document so CSS scopes apply.
  useEffect(() => {
    const html = document.documentElement;
    const hadLight = html.classList.contains("light");
    html.setAttribute("data-fanview", "1");
    html.classList.remove("light"); // let prefers-color-scheme decide
    return () => {
      html.removeAttribute("data-fanview");
      if (hadLight) html.classList.add("light");
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const fetchRow = async () => {
      const { data, error } = await supabase
        .from("fanview_sessions")
        .select("id, meta, state, feed, summary, is_live")
        .eq("id", sessionId)
        .maybeSingle();
      if (cancelled) return;
      if (error || !data) {
        setStatus("missing");
        return;
      }
      setRow(data as unknown as SessionRow);
      setStatus("ok");
    };
    fetchRow();

    const channel = supabase
      .channel(`fanview-${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "fanview_sessions",
          filter: `id=eq.${sessionId}`,
        },
        (payload) => {
          const next = (payload.new ?? null) as unknown as SessionRow | null;
          if (next) {
            setRow(next);
            setStatus("ok");
          }
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  if (status === "loading") {
    return (
      <Shell>
        <div className="flex flex-1 flex-col items-center justify-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Connecting to FanView…</p>
        </div>
      </Shell>
    );
  }

  if (status === "missing" || !row) {
    return (
      <Shell>
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
          <p className="text-sm text-muted-foreground">
            This FanView link is no longer active or does not exist.
          </p>
        </div>
      </Shell>
    );
  }

  const isFinal = !row.is_live || !row.state.isLive;

  return (
    <Shell isLive={!isFinal} homeColor={row.meta.homeColor} awayColor={row.meta.awayColor} matchFormat={row.meta.matchFormat}>
      {isFinal ? <SummaryView row={row} /> : <LiveView row={row} />}
      <Footer />
    </Shell>
  );
}

/* ------------------------------ shell ------------------------------ */

function Shell({
  children,
  isLive,
  homeColor,
  awayColor,
  matchFormat,
}: {
  children: React.ReactNode;
  isLive?: boolean;
  homeColor?: string;
  awayColor?: string;
  matchFormat?: import("@/types").MatchFormat;
}) {
  const styleVars = {
    ["--home-color" as string]: homeColor ?? "#F4B400",
    ["--away-color" as string]: awayColor ?? "#3B82F6",
  } as React.CSSProperties;
  return (
    <div className="min-h-screen bg-background text-foreground" style={styleVars}>
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-popover px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-black tracking-wide">
          <Radio className="h-4 w-4 text-primary" />
          <span>🏐 FanView</span>
          {matchFormat && (
            <span className="text-muted-foreground/60">·</span>
          )}
          {matchFormat && (
            <span className="text-xs font-bold text-muted-foreground">
              {formatLabel(matchFormat)}
            </span>
          )}
        </div>
        {isLive === undefined ? null : isLive ? (
          <span className="flex items-center gap-1.5 rounded-full bg-destructive/15 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-destructive">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-destructive" />
            </span>
            Live
          </span>
        ) : (
          <span className="rounded-full bg-card px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            Final
          </span>
        )}
      </header>
      <div className="mx-auto flex min-h-[calc(100vh-49px)] max-w-[640px] flex-col">{children}</div>
    </div>
  );
}

function Footer() {
  return (
    <footer className="mt-6 border-t border-border px-4 py-5 text-center">
      <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
        Powered by CourtsideView
      </p>
      <p className="mt-1 text-[11px] text-muted-foreground">
        You are viewing a live read-only FanView.
      </p>
    </footer>
  );
}

/* ------------------------------ live view ------------------------------ */

function LiveView({ row }: { row: SessionRow }) {
  const { state, feed, meta } = row;
  const recent = useMemo(() => [...feed].reverse().slice(0, 50), [feed]);

  return (
    <div className="flex-1 px-4 pb-4">
      <Scoreboard state={state} meta={meta} />
      <Court state={state} meta={meta} />
      <TrackedStatsBar state={state} />
      <ActivityFeed items={recent} meta={meta} />
    </div>
  );
}

function Scoreboard({ state, meta }: { state: FanviewState; meta: FanviewMeta }) {
  const homeLeads = state.homeScore > state.awayScore;
  const awayLeads = state.awayScore > state.homeScore;
  const servingColor = state.isHomeServing ? meta.homeColor : meta.awayColor;
  const { homeText, awayText } = teamTextColors(meta);
  return (
    <section
      className="mt-4 rounded-2xl border bg-card p-4"
      style={{ borderColor: `color-mix(in oklab, ${servingColor} 35%, var(--border))` }}
    >
      <div className="grid grid-cols-3 items-center gap-2">
        <TeamCell
          name={meta.homeTeam}
          sets={state.homeSetsWon}
          serving={state.isHomeServing}
          align="left"
          color={meta.homeColor}
          textColor={homeText}
        />
        <div className="text-center">
          <div className="flex items-baseline justify-center gap-2 tabular-nums">
            <span
              className={cn("font-black leading-none", homeLeads ? "text-5xl" : "text-4xl text-muted-foreground")}
              style={homeLeads ? { color: homeText } : undefined}
            >
              {state.homeScore}
            </span>
            <span className="text-xl font-black text-muted-foreground">:</span>
            <span
              className={cn("font-black leading-none", awayLeads ? "text-5xl" : "text-4xl text-muted-foreground")}
              style={awayLeads ? { color: awayText } : undefined}
            >
              {state.awayScore}
            </span>
          </div>
        </div>
        <TeamCell
          name={meta.awayTeam}
          sets={state.awaySetsWon}
          serving={!state.isHomeServing}
          align="right"
          color={meta.awayColor}
          textColor={awayText}
        />
      </div>
      <div className="mt-3 flex items-center justify-center gap-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
        <span>Set {state.currentSet} of {maxSets(meta.matchFormat ?? "highschool")}</span>
        {state.isDeciding && (
          <span
            className="rounded-full px-2 py-0.5 text-[10px]"
            style={{ backgroundColor: "rgba(245,158,11,0.18)", color: "#F59E0B" }}
          >
            DECIDING SET
          </span>
        )}
        <span>·</span>
        <span>
          {meta.homeTeam} {state.homeSetsWon} — {state.awaySetsWon} {meta.awayTeam}
        </span>
      </div>
      <div className="mt-2 flex items-center justify-center gap-1.5">
        {Array.from({ length: maxSets(meta.matchFormat ?? "highschool") }).map((_, i) => {
          const num = i + 1;
          const fill =
            num <= state.homeSetsWon
              ? meta.homeColor
              : num <= state.homeSetsWon + state.awaySetsWon
                ? meta.awayColor
                : "color-mix(in oklab, var(--muted-foreground) 30%, transparent)";
          return <span key={i} className="h-2 w-2 rounded-full" style={{ backgroundColor: fill }} />;
        })}
      </div>
      <div
        className="mt-1 flex items-center justify-center gap-1.5 text-[11px] font-black uppercase tracking-widest"
        style={{ color: state.isHomeServing ? homeText : awayText }}
      >
        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: servingColor }} />
        {(state.isHomeServing ? meta.homeTeam : meta.awayTeam)} serving
      </div>
    </section>
  );
}

function TeamCell({
  name,
  sets,
  serving,
  align,
  color,
  textColor,
}: {
  name: string;
  sets: number;
  serving: boolean;
  align: "left" | "right";
  color: string;
  textColor: string;
}) {
  return (
    <div className={cn("min-w-0", align === "right" && "text-right")}>
      <div
        className="truncate text-xs font-black uppercase tracking-widest"
        style={{ color: textColor }}
      >
        {name}
      </div>
      <div className="mt-1 text-[10px] font-bold text-muted-foreground">
        Sets: {sets}
        {serving && (
          <span className="ml-1" style={{ color }}>●</span>
        )}
      </div>
    </div>
  );
}

function Court({ state, meta }: { state: FanviewState; meta: FanviewMeta }) {
  const cellOrder = [3, 2, 1, 4, 5, 0]; // front L→R, back L→R
  // Our team owns the displayed court; serve indicator only relevant when WE serve.
  const ourColor = meta.isHomeTeam ? meta.homeColor : meta.awayColor;
  const weServe = meta.isHomeTeam ? state.isHomeServing : !state.isHomeServing;
  return (
    <section className="mt-4">
      <div className="mb-2 text-[11px] font-black uppercase tracking-widest text-muted-foreground">
        Court — Live Rotation
      </div>
      <div className="rounded-2xl border border-border bg-popover p-3">
        {/* NET bar — top of court */}
        <div
          className="relative mb-2 flex h-[14px] items-center justify-center"
          style={{
            backgroundColor: "#1A5C58",
            borderTop: "2px solid #FFFFFF",
            borderBottom: "2px solid #FFFFFF",
          }}
        >
          <span aria-hidden className="absolute left-0 top-1/2 h-3 w-1 -translate-y-1/2" style={{ backgroundColor: "#FF4D4D" }} />
          <span aria-hidden className="absolute right-0 top-1/2 h-3 w-1 -translate-y-1/2" style={{ backgroundColor: "#FF4D4D" }} />
          <span className="text-[9px] font-bold uppercase" style={{ letterSpacing: "2px", color: "rgba(255,255,255,0.5)" }}>
            NET
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {cellOrder.map((rotIdx, gridIdx) => {
            const id = state.rotationState[rotIdx];
            const p = id ? state.players[id] : undefined;
            const isServer = rotIdx === 0 && weServe;
            const isFront = gridIdx < 3;
            const liberoCell = p?.position === "L";
            return (
              <div
                key={gridIdx}
                className={cn(
                  "relative flex aspect-square flex-col items-center justify-center rounded-xl border bg-card px-1 py-2 text-center transition-all duration-300",
                  isServer ? "vp-serving" : "border-border",
                )}
                style={
                  liberoCell
                    ? { backgroundColor: "rgba(0, 172, 193, 0.15)", borderColor: "#00ACC1" }
                    : isServer
                      ? { borderColor: ourColor }
                      : undefined
                }
              >
                {p?.isTracked && (
                  <Star className="absolute right-1.5 top-1.5 h-3.5 w-3.5 fill-primary text-primary" strokeWidth={1.5} />
                )}
                {isServer && (
                  <span
                    className="absolute left-1.5 top-1.5 h-2 w-2 rounded-full"
                    style={{ backgroundColor: ourColor }}
                  />
                )}
                <span className="text-[20px] font-black leading-none tabular-nums">
                  {p?.number ?? "—"}
                </span>
                <span className="mt-0.5 max-w-full truncate text-[10px] font-medium text-muted-foreground">
                  {p?.name?.split(" ")[0] ?? "Empty"}
                </span>
                {liberoCell ? (
                  <span className="mt-0.5 text-[9px] font-black uppercase tracking-wider text-[#00ACC1]">
                    LIB · P{rotIdx + 1}
                  </span>
                ) : (
                  <span className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground/70">
                    P{rotIdx + 1} · {isFront ? "Front" : "Back"}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function TrackedStatsBar({ state }: { state: FanviewState }) {
  const trackedId = Object.entries(state.players).find(([, p]) => p.isTracked)?.[0];
  const tracked = trackedId ? state.players[trackedId] : undefined;
  const s = state.trackedStats;
  if (!tracked) return null;
  return (
    <section className="mt-4 rounded-2xl border border-border bg-card p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-black text-foreground">
          {tracked.name} <span className="text-muted-foreground">#{tracked.number}</span>{" "}
          <span className="text-xs font-bold text-muted-foreground">· {tracked.position}</span>
        </div>
        {s.isServingNow && (
          <span className="flex items-center gap-1 rounded-full bg-[var(--ace)]/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-[var(--ace)] animate-pulse">
            🟡 Serving Now
          </span>
        )}
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-black tabular-nums">
        {s.positionGroup === "setter" ? (
          <>
            <Chip label="Ast" value={s.assists} />
            <Chip label="DmpK" value={s.dumpKills} />
            <Chip label="SetE" value={s.settingErrors} />
            <Chip label="D" value={s.digs} />
            <Chip label="Dmp%" value={s.dumpHittingPct} accent />
          </>
        ) : s.positionGroup === "defensive" ? (
          <>
            <Chip label="Pass" value={s.passAttempts} />
            <Chip label="D" value={s.digs} />
            <Chip label="A" value={s.aces} />
            <Chip label="Ast" value={s.assists} />
            <Chip label="PassAvg" value={s.passAvg} accent />
          </>
        ) : (
          <>
            <Chip label="K" value={s.kills} />
            <Chip label="D" value={s.digs} />
            <Chip label="B" value={s.blocks} />
            <Chip label="A" value={s.aces} />
            <Chip label="Hit%" value={s.hittingPct} accent />
          </>
        )}
      </div>
    </section>
  );
}

function Chip({ label, value, accent }: { label: string; value: number | string; accent?: boolean }) {
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-1 uppercase tracking-widest",
        accent ? "bg-primary/15 text-primary" : "bg-popover text-foreground",
      )}
    >
      {label}: {value}
    </span>
  );
}

function ActivityFeed({ items, meta }: { items: FanviewFeedItem[]; meta: FanviewMeta }) {
  return (
    <section className="mt-4">
      <div className="mb-2 text-[11px] font-black uppercase tracking-widest text-muted-foreground">
        Live Activity
      </div>
      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
          Waiting for the first play…
        </div>
      ) : (
        <ul className="space-y-1.5">
          {items.map((it) => (
            <FeedRow key={it.id} item={it} meta={meta} />
          ))}
        </ul>
      )}
    </section>
  );
}

function FeedRow({ item, meta }: { item: FanviewFeedItem; meta: FanviewMeta }) {
  // Team color trumps tone color when the event has a team.
  const teamColor = item.team
    ? item.team === "home"
      ? meta.homeColor
      : meta.awayColor
    : null;
  const fallbackBorder = {
    kill: "border-l-[var(--kill)]",
    error: "border-l-[var(--error)]",
    score: "border-l-[var(--gold)]",
    rotation: "border-l-[#00B4FF]",
    set: "border-l-[#8B5CF6]",
    libero: "border-l-[#00ACC1]",
    neutral: "border-l-border",
    deciding: "border-l-[#F59E0B]",
  }[item.tone];
  return (
    <li
      className={cn(
        "rounded-xl border border-border border-l-4 bg-card px-3 py-2",
        !teamColor && fallbackBorder,
      )}
      style={teamColor ? { borderLeftColor: teamColor } : undefined}
    >
      <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        Set {item.setNumber} · {item.homeScore}-{item.awayScore}
      </div>
      <div className="mt-0.5 text-sm text-foreground">{item.message}</div>
    </li>
  );
}

/* ------------------------------ summary view ------------------------------ */

function SummaryView({ row }: { row: SessionRow }) {
  const summary = row.summary;
  const meta = row.meta;
  const { homeText, awayText } = teamTextColors(meta);
  const homeWon =
    (summary?.finalScore.homeSetsWon ?? 0) > (summary?.finalScore.awaySetsWon ?? 0);
  const awayWon =
    (summary?.finalScore.awaySetsWon ?? 0) > (summary?.finalScore.homeSetsWon ?? 0);
  const winnerColor = homeWon ? meta.homeColor : awayWon ? meta.awayColor : undefined;
  const winnerText = homeWon ? homeText : awayWon ? awayText : undefined;

  // Celebrate on the watcher's screen ONLY when the match is fully completed.
  // SummaryView mounts only after is_live=false (match end), AND we re-verify
  // a real winner exists in the summary — never fires for a set being completed.
  useEffect(() => {
    if (row.is_live) return; // match still in progress — never celebrate
    if (!summary) return;
    if (!homeWon && !awayWon) return; // tie / no winner → no confetti
    fireWinConfetti(winnerColor ?? "#F4B400");
    // Only run once per mount of the summary view.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="flex-1 px-4 pb-4">
      <section
        className="mt-4 rounded-2xl border bg-card p-4 text-center"
        style={{
          borderColor: winnerColor
            ? `color-mix(in oklab, ${winnerColor} 45%, var(--border))`
            : undefined,
        }}
      >
        <div
          className="flex items-center justify-center gap-2"
          style={{ color: winnerText ?? "var(--gold)" }}
        >
          <Trophy className="h-5 w-5" />
          <span className="text-xs font-black uppercase tracking-widest">Final</span>
        </div>
        <div
          className="mt-2 text-lg font-black"
          style={{ color: winnerText ?? "var(--foreground)" }}
        >
          {summary?.winner ?? "Match ended"}
        </div>
        <div className="mt-3 grid grid-cols-3 items-center gap-2">
          <div
            className="text-left text-xs font-black uppercase tracking-widest"
            style={{ color: homeText }}
          >
            {meta.homeTeam}
          </div>
          <div className="text-3xl font-black tabular-nums">
            <span style={{ color: homeWon ? homeText : "var(--muted-foreground)" }}>
              {summary?.finalScore.homeSetsWon ?? 0}
            </span>
            <span className="text-muted-foreground"> : </span>
            <span style={{ color: awayWon ? awayText : "var(--muted-foreground)" }}>
              {summary?.finalScore.awaySetsWon ?? 0}
            </span>
          </div>
          <div
            className="text-right text-xs font-black uppercase tracking-widest"
            style={{ color: awayText }}
          >
            {meta.awayTeam}
          </div>
        </div>
        {summary && summary.finalScore.sets.length > 0 && (
          <div className="mt-4 overflow-hidden rounded-xl border border-border">
            <table className="w-full text-xs">
              <thead className="bg-popover text-muted-foreground">
                <tr>
                  <th className="px-2 py-1.5 text-left font-bold">Set</th>
                  <th
                    className="px-2 py-1.5 text-right font-bold"
                    style={{ color: homeText }}
                  >
                    {meta.homeTeam}
                  </th>
                  <th
                    className="px-2 py-1.5 text-right font-bold"
                    style={{ color: awayText }}
                  >
                    {meta.awayTeam}
                  </th>
                </tr>
              </thead>
              <tbody>
                {summary.finalScore.sets.map((s) => (
                  <tr key={s.setNumber} className="border-t border-border">
                    <td className="px-2 py-1.5 font-bold">{s.setNumber}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums">{s.homeScore}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums">{s.awayScore}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {summary?.trackedPlayer && (() => {
        const tp = summary.trackedPlayer;
        const group = getPositionGroup(tp.position as Position);
        return (
          <section className="mt-4 rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-black text-foreground">
                {tp.name} <span className="text-muted-foreground">#{tp.number}</span>
              </div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                {tp.position}
              </div>
            </div>

            {group === "attacker" && (
              <>
                <div className="mt-3 grid grid-cols-2 gap-2 text-center">
                  <StatBox label="Kills" value={tp.stats.kills} />
                  <StatBox label="Digs" value={tp.stats.digs} />
                  <StatBox label="Blocks" value={tp.stats.blocks} />
                  <StatBox label="Aces" value={tp.stats.aces} />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-center">
                  <div className="rounded-xl bg-popover py-2">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      Opp. Digs (Att)
                    </div>
                    <div className="text-lg font-black tabular-nums text-foreground">
                      {tp.stats.dugAttempts}
                    </div>
                  </div>
                  <div className="rounded-xl bg-primary/10 py-2">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-primary">
                      Hitting %
                    </div>
                    <div className="text-lg font-black tabular-nums text-primary">
                      {tp.hittingPct}
                    </div>
                  </div>
                </div>
              </>
            )}

            {group === "setter" && (
              <>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <StatBox label="Assists" value={tp.stats.assists} />
                  <StatBox label="Dump K" value={tp.stats.dumpKills ?? 0} />
                  <StatBox label="Set Err" value={tp.stats.settingErrors ?? 0} />
                  <StatBox label="Dump Att" value={tp.stats.dumpAttempts ?? 0} />
                  <StatBox label="Dump Err" value={tp.stats.dumpErrors ?? 0} />
                  <div className="rounded-xl bg-primary/10 py-2">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-primary">
                      Dump %
                    </div>
                    <div className="text-lg font-black tabular-nums text-primary">
                      {dumpHittingPct(tp.stats)}
                    </div>
                  </div>
                </div>
              </>
            )}

            {group === "defensive" && (
              <>
                <div className="mt-3 grid grid-cols-2 gap-2 text-center">
                  <div className="rounded-xl bg-primary/10 py-2">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-primary">
                      Pass Avg
                    </div>
                    <div className="text-lg font-black tabular-nums text-primary">
                      {passAverage(tp.stats)}
                    </div>
                  </div>
                  <StatBox label="Passes" value={tp.stats.passAttempts ?? 0} />
                  <StatBox label="Digs" value={tp.stats.digs} />
                  <StatBox label="Aces" value={tp.stats.aces} />
                </div>
                <div className="mt-3 grid grid-cols-4 gap-1.5 text-center">
                  <PassPill grade="3" value={tp.stats.passGrade3 ?? 0} color="#39FF14" />
                  <PassPill grade="2" value={tp.stats.passGrade2 ?? 0} color="#22D3EE" />
                  <PassPill grade="1" value={tp.stats.passGrade1 ?? 0} color="#F4B400" />
                  <PassPill grade="0" value={tp.stats.passGrade0 ?? 0} color="#FF4D4D" />
                </div>
              </>
            )}
          </section>
        );
      })()}

      <section className="mt-4">
        <div className="mb-2 text-[11px] font-black uppercase tracking-widest text-muted-foreground">
          Full Activity Log
        </div>
        <ul className="space-y-1.5">
          {[...row.feed].reverse().map((it) => (
            <FeedRow key={it.id} item={it} meta={meta} />
          ))}
        </ul>
      </section>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl bg-popover py-2">
      <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      <div className="text-xl font-black tabular-nums text-foreground">{value}</div>
    </div>
  );
}

function PassPill({ grade, value, color }: { grade: string; value: number; color: string }) {
  return (
    <div className="rounded-lg bg-popover py-1.5">
      <div className="text-base font-black tabular-nums" style={{ color }}>
        {value}
      </div>
      <div className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
        Gr {grade}
      </div>
    </div>
  );
}
