import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Radio } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { readableTextColor } from "@/lib/colorContrast";
import { formatLabel, maxSets } from "@/utils/setRules";
import { cn } from "@/lib/utils";
import type {
  ScoreOnlyFanviewState,
  ScoreOnlyFanviewMeta,
  ScoreOnlyFanviewFeedItem,
} from "@/hooks/useScoreOnlyFanview";

export const Route = createFileRoute("/fanview-score/$sessionId")({
  head: () => ({
    meta: [
      { title: "FanView Score — CourtsideView" },
      { name: "description", content: "Follow this match live — score only." },
      { property: "og:title", content: "CourtsideView FanView — Live Score" },
      { property: "og:description", content: "Follow the match score in real time." },
    ],
  }),
  component: FanviewScorePage,
});

interface Row {
  id: string;
  meta: ScoreOnlyFanviewMeta;
  state: ScoreOnlyFanviewState;
  feed: ScoreOnlyFanviewFeedItem[];
  is_live: boolean;
}

function FanviewScorePage() {
  const { sessionId } = Route.useParams();
  const [row, setRow] = useState<Row | null>(null);
  const [status, setStatus] = useState<"loading" | "ok" | "missing">("loading");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { data, error } = await supabase
        .from("fanview_sessions")
        .select("id, meta, state, feed, is_live")
        .eq("id", sessionId)
        .maybeSingle();
      if (cancelled) return;
      if (error || !data) {
        setStatus("missing");
        return;
      }
      setRow(data as unknown as Row);
      setStatus("ok");
    };
    load();
    const ch = supabase
      .channel(`fanview-score-${sessionId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "fanview_sessions", filter: `id=eq.${sessionId}` },
        (payload) => {
          const next = (payload.new ?? null) as unknown as Row | null;
          if (next) {
            setRow(next);
            setStatus("ok");
          }
        },
      )
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(ch);
    };
  }, [sessionId]);

  if (status === "loading") {
    return (
      <Shell>
        <div className="flex flex-1 flex-col items-center justify-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Connecting…</p>
        </div>
      </Shell>
    );
  }

  if (status === "missing" || !row) {
    return (
      <Shell>
        <div className="flex flex-1 items-center justify-center px-6 text-center">
          <p className="text-sm text-muted-foreground">
            This FanView link is no longer active or does not exist.
          </p>
        </div>
      </Shell>
    );
  }

  const isLive = row.is_live && row.state.isLive;
  return (
    <Shell isLive={isLive} matchFormat={row.meta.matchFormat}>
      <Body row={row} />
    </Shell>
  );
}

function Shell({
  children,
  isLive,
  matchFormat,
}: {
  children: React.ReactNode;
  isLive?: boolean;
  matchFormat?: ScoreOnlyFanviewMeta["matchFormat"];
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-popover px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-black tracking-wide">
          <Radio className="h-4 w-4 text-primary" />
          <span>🏐 FanView · Score Only</span>
          {matchFormat && (
            <>
              <span className="text-muted-foreground/60">·</span>
              <span className="text-xs font-bold text-muted-foreground">
                {formatLabel(matchFormat)}
              </span>
            </>
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
      <div className="mx-auto flex min-h-[calc(100vh-49px)] max-w-[640px] flex-col px-4 pb-6">
        {children}
        <footer className="mt-auto border-t border-border pt-4 text-center">
          <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
            Powered by CourtsideView
          </p>
        </footer>
      </div>
    </div>
  );
}

function Body({ row }: { row: Row }) {
  const { state, meta, feed } = row;
  const myTeamText = readableTextColor(meta.myTeamColor);
  const oppText = readableTextColor(meta.opponentColor);
  const myLeads = state.myTeamScore > state.opponentScore;
  const oppLeads = state.opponentScore > state.myTeamScore;
  const recent = useMemo(() => [...feed].reverse().slice(0, 50), [feed]);
  const total = maxSets(meta.matchFormat);

  return (
    <div className="flex-1 space-y-4 pt-4">
      <div className="text-center text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground">
        {state.isDeciding
          ? `Set ${state.currentSet} — Deciding · To ${state.setTarget}`
          : `Set ${state.currentSet} of ${total} · To ${state.setTarget}`}
      </div>

      <section className="rounded-2xl border border-border bg-card p-4">
        <div className="grid grid-cols-2 items-center gap-3">
          <TeamScore
            name={meta.myTeam}
            score={state.myTeamScore}
            color={meta.myTeamColor}
            text={myTeamText}
            leading={myLeads}
            serving={state.myTeamServing}
            sets={state.myTeamSetsWon}
          />
          <TeamScore
            name={meta.opponent}
            score={state.opponentScore}
            color={meta.opponentColor}
            text={oppText}
            leading={oppLeads}
            serving={!state.myTeamServing}
            sets={state.opponentSetsWon}
          />
        </div>
        <div className="mt-3 text-center text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
          {state.myTeamServing ? meta.myTeam : meta.opponent} serving
        </div>
        {state.completedSets.length > 0 && (
          <div className="mt-3 flex flex-wrap justify-center gap-1.5">
            {state.completedSets.map((s) => (
              <span
                key={s.setNumber}
                className="rounded-full border border-border bg-popover px-2 py-0.5 text-[10px] font-bold tabular-nums text-muted-foreground"
              >
                S{s.setNumber}: {s.myTeamScore}-{s.opponentScore}
              </span>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-2 text-[11px] font-black uppercase tracking-widest text-muted-foreground">
          Activity
        </div>
        <div className="space-y-1.5">
          {recent.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
              Waiting for the first point…
            </div>
          ) : (
            recent.map((it) => {
              const color =
                it.team === "myTeam"
                  ? meta.myTeamColor
                  : it.team === "opponent"
                    ? meta.opponentColor
                    : undefined;
              return (
                <div
                  key={it.id}
                  className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs"
                  style={color ? { borderLeftColor: color, borderLeftWidth: 3 } : undefined}
                >
                  <span className="flex-1 text-foreground">{it.message}</span>
                  <span className="text-[10px] text-muted-foreground tabular-nums">
                    {new Date(it.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}

function TeamScore({
  name,
  score,
  color,
  text,
  leading,
  serving,
  sets,
}: {
  name: string;
  score: number;
  color: string;
  text: string;
  leading: boolean;
  serving: boolean;
  sets: number;
}) {
  return (
    <div
      className="flex flex-col items-center justify-center rounded-xl py-3"
      style={{ backgroundColor: leading ? `${color}22` : "transparent" }}
    >
      <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
        <span>{name}</span>
        {serving && <span style={{ color }}>●</span>}
      </div>
      <div
        className={cn("font-black leading-none tabular-nums")}
        style={{
          fontSize: leading ? 88 : 64,
          color: leading ? (text === "#FFFFFF" ? color : color) : "var(--muted-foreground)",
        }}
      >
        {score}
      </div>
      <div className="mt-1 text-[10px] font-bold text-muted-foreground">Sets {sets}</div>
    </div>
  );
}
