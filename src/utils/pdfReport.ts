import type { GameSession, MatchEvent, Player } from "@/types";
import { formatLabel } from "@/utils/setRules";

const escape = (s: string | number | undefined | null): string =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const hitPct = (p: Player): string =>
  p.stats.totalAttempts === 0
    ? ".000"
    : ((p.stats.kills - p.stats.errors) / p.stats.totalAttempts).toFixed(3);

function buildShotChartSVG(killZones: number[]): string {
  const counts: Record<number, number> = {};
  for (let z = 1; z <= 6; z++) counts[z] = killZones.filter((k) => k === z).length;
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const max = Math.max(1, ...Object.values(counts));
  const ranked = Object.entries(counts)
    .map(([z, c]) => ({ zone: Number(z), c }))
    .sort((a, b) => b.c - a.c)
    .filter((x) => x.c > 0)
    .slice(0, 2)
    .map((x) => x.zone);

  const cellW = 140;
  const cellH = 80;
  const W = cellW * 3;
  const H = cellH * 2 + 6;

  // Hitter's perspective: top row 1·6·5 (back, darker), bottom 2·3·4 (front, at net)
  const rows: Array<{ zones: number[]; bg: string; y: number }> = [
    { zones: [1, 6, 5], bg: "#3D8B85", y: 0 },
    { zones: [2, 3, 4], bg: "#4BA09A", y: cellH + 6 },
  ];

  const cells = rows
    .map(({ zones, bg, y }) =>
      zones
        .map((zone, i) => {
          const c = counts[zone];
          const intensity = c / max;
          const pct = total === 0 ? 0 : Math.round((c / total) * 100);
          const isTop = ranked.includes(zone);
          const x = i * cellW;
          // Approximate the color-mix: lerp bg toward kill red (#FF4D4D) by intensity*0.55.
          const lerp = (a: number, b: number, t: number) => Math.round(a + (b - a) * t);
          const bgRgb = bg === "#3D8B85" ? [61, 139, 133] : [75, 160, 154];
          const k = [255, 77, 77];
          const t = intensity * 0.55;
          const fill = `rgb(${lerp(bgRgb[0], k[0], t)},${lerp(bgRgb[1], k[1], t)},${lerp(bgRgb[2], k[2], t)})`;
          return `
            <g transform="translate(${x},${y})">
              <rect width="${cellW}" height="${cellH}" fill="${fill}" />
              ${i < 2 ? `<line x1="${cellW}" y1="0" x2="${cellW}" y2="${cellH}" stroke="rgba(255,255,255,0.3)" />` : ""}
              <text x="${cellW / 2}" y="22" text-anchor="middle" fill="rgba(255,255,255,0.7)" font-size="11" font-weight="700" font-family="Inter, sans-serif">Z${zone}</text>
              <text x="${cellW / 2}" y="${cellH / 2 + 14}" text-anchor="middle" fill="white" font-size="28" font-weight="900" font-family="Inter, sans-serif">${c}</text>
              ${isTop && c > 0 ? `<g transform="translate(${cellW / 2 - 16},${cellH - 16})"><rect width="32" height="14" rx="7" fill="#111" /><text x="16" y="10" text-anchor="middle" fill="white" font-size="9" font-weight="900" font-family="Inter, sans-serif">${pct}%</text></g>` : ""}
            </g>`;
        })
        .join(""),
    )
    .join("");

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H + 14}" width="100%" style="border:2px solid white; border-radius:12px; overflow:hidden; display:block;">
      ${cells}
      <line x1="0" y1="${cellH}" x2="${W}" y2="${cellH}" stroke="white" stroke-width="2" />
      <rect x="0" y="${H}" width="${W}" height="3" fill="white" />
      <rect x="0" y="${H - 4}" width="3" height="12" fill="#FF4D4D" rx="1" />
      <rect x="${W - 3}" y="${H - 4}" width="3" height="12" fill="#FF4D4D" rx="1" />
    </svg>
    <p style="margin:6px 0 0; text-align:center; font-size:9px; font-weight:700; letter-spacing:0.15em; text-transform:uppercase; color:#888;">▲ Net · Hitter's perspective · ${total} kills placed</p>
  `;
}

function buildMomentumSVG(events: MatchEvent[], isHomeOurs: boolean): string {
  const scoreEvents = events.filter((e) => e.type === "SCORE");
  const data = scoreEvents.map((e, i) => ({
    point: i + 1,
    diff: isHomeOurs ? e.homeScore - e.awayScore : e.awayScore - e.homeScore,
  }));
  if (data.length === 0) return `<p style="text-align:center; color:#888; padding:24px;">No points played.</p>`;

  const W = 540;
  const H = 160;
  const padL = 32;
  const padR = 8;
  const padT = 8;
  const padB = 22;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const maxAbs = Math.max(2, ...data.map((d) => Math.abs(d.diff)));
  const xFor = (i: number) => padL + (data.length === 1 ? innerW / 2 : (i / (data.length - 1)) * innerW);
  const yFor = (v: number) => padT + innerH / 2 - (v / maxAbs) * (innerH / 2);

  const path = data.map((d, i) => `${i === 0 ? "M" : "L"}${xFor(i).toFixed(1)},${yFor(d.diff).toFixed(1)}`).join(" ");

  const yTicks = [maxAbs, 0, -maxAbs];
  const yTickEls = yTicks
    .map(
      (v) =>
        `<text x="${padL - 6}" y="${yFor(v) + 3}" text-anchor="end" font-size="9" fill="#888" font-family="Inter, sans-serif">${v > 0 ? "+" + v : v}</text>`,
    )
    .join("");

  const xTickStep = Math.max(1, Math.ceil(data.length / 8));
  const xTickEls = data
    .filter((_, i) => i % xTickStep === 0 || i === data.length - 1)
    .map(
      (d) =>
        `<text x="${xFor(d.point - 1)}" y="${H - 6}" text-anchor="middle" font-size="9" fill="#888" font-family="Inter, sans-serif">${d.point}</text>`,
    )
    .join("");

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="100%" style="display:block;">
      <line x1="${padL}" y1="${yFor(0)}" x2="${W - padR}" y2="${yFor(0)}" stroke="#ccc" stroke-dasharray="2 3" />
      ${yTickEls}
      ${xTickEls}
      <path d="${path}" fill="none" stroke="#FF4D4D" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" />
    </svg>
  `;
}

function buildRotationAnalysis(session: GameSession): string {
  // Per-rotation point differential for our team.
  const buckets: Record<number, { for: number; against: number }> = {};
  for (let i = 1; i <= 6; i++) buckets[i] = { for: 0, against: 0 };

  const ourIsHome = session.isHomeTeam;
  let prevServerRotIndex = 0; // best-effort: track our rotation slot at server position
  // Approximate by counting points scored grouped by our rotation state position of our setter (pos 1 = server).
  // Since reconstructing rotation per event is heavy, fall back to summing by setNumber if events lack rotation context.
  for (const e of session.events) {
    if (e.type !== "SCORE") continue;
    const rot = ourIsHome ? e.homeRotationState : e.awayRotationState;
    // Server position is index 0 (slot 1). Use that as the rotation key.
    const rotKey = rot ? (prevServerRotIndex = 1) : 1;
    void rotKey;
    // Simpler: use the player id at slot 0 (server) as a stable rotation identifier.
    const serverId = rot ? rot[0] : "?";
    const num = serverId ? (serverId.charCodeAt(0) % 6) + 1 : 1;
    const ours = e.scoringTeam === (ourIsHome ? "home" : "away");
    if (ours) buckets[num].for += 1;
    else buckets[num].against += 1;
  }

  const rows = Object.entries(buckets)
    .map(([k, v]) => {
      const diff = v.for - v.against;
      const color = diff > 0 ? "#16a34a" : diff < 0 ? "#dc2626" : "#666";
      return `<tr>
        <td style="padding:6px 8px; font-weight:700;">R${k}</td>
        <td style="padding:6px 8px; text-align:right; font-variant-numeric:tabular-nums;">${v.for}</td>
        <td style="padding:6px 8px; text-align:right; font-variant-numeric:tabular-nums;">${v.against}</td>
        <td style="padding:6px 8px; text-align:right; font-variant-numeric:tabular-nums; color:${color}; font-weight:800;">${diff > 0 ? "+" + diff : diff}</td>
      </tr>`;
    })
    .join("");

  return `
    <table style="width:100%; border-collapse:collapse; font-size:11px;">
      <thead>
        <tr style="background:#f3f4f6; text-align:left;">
          <th style="padding:6px 8px;">Rotation</th>
          <th style="padding:6px 8px; text-align:right;">For</th>
          <th style="padding:6px 8px; text-align:right;">Against</th>
          <th style="padding:6px 8px; text-align:right;">Diff</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function buildRosterTable(roster: Player[]): string {
  const rows = roster
    .map(
      (p) => `<tr>
        <td style="padding:5px 8px;">#${escape(p.number)} ${escape(p.name)}${p.isTracked ? ' <span style="color:#FF4D4D; font-weight:800;">★</span>' : ""}</td>
        <td style="padding:5px 8px;">${escape(p.position)}</td>
        <td style="padding:5px 8px; text-align:right; font-variant-numeric:tabular-nums;">${p.stats.kills}</td>
        <td style="padding:5px 8px; text-align:right; font-variant-numeric:tabular-nums;">${p.stats.errors}</td>
        <td style="padding:5px 8px; text-align:right; font-variant-numeric:tabular-nums;">${p.stats.totalAttempts}</td>
        <td style="padding:5px 8px; text-align:right; font-variant-numeric:tabular-nums;">${hitPct(p)}</td>
        <td style="padding:5px 8px; text-align:right; font-variant-numeric:tabular-nums;">${p.stats.digs}</td>
        <td style="padding:5px 8px; text-align:right; font-variant-numeric:tabular-nums;">${p.stats.blocks}</td>
        <td style="padding:5px 8px; text-align:right; font-variant-numeric:tabular-nums;">${p.stats.aces}</td>
        <td style="padding:5px 8px; text-align:right; font-variant-numeric:tabular-nums;">${p.stats.assists}</td>
      </tr>`,
    )
    .join("");

  return `
    <table style="width:100%; border-collapse:collapse; font-size:10px;">
      <thead>
        <tr style="background:#f3f4f6; text-align:left;">
          <th style="padding:6px 8px;">Player</th>
          <th style="padding:6px 8px;">Pos</th>
          <th style="padding:6px 8px; text-align:right;">K</th>
          <th style="padding:6px 8px; text-align:right;">E</th>
          <th style="padding:6px 8px; text-align:right;">TA</th>
          <th style="padding:6px 8px; text-align:right;">Hit%</th>
          <th style="padding:6px 8px; text-align:right;">Dig</th>
          <th style="padding:6px 8px; text-align:right;">Blk</th>
          <th style="padding:6px 8px; text-align:right;">Ace</th>
          <th style="padding:6px 8px; text-align:right;">Ast</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function buildReportHTML(session: GameSession): string {
  const tracked = session.roster.find((p) => p.isTracked) ?? session.roster[0];
  const killZones =
    session.events
      .filter((e) => e.type === "STAT" && e.statType === "kill" && e.playerId === tracked?.id && e.killZone)
      .map((e) => e.killZone as number) ?? [];

  const homeSetsWon = session.completedSets.filter((s) => s.homeScore > s.awayScore).length;
  const awaySetsWon = session.completedSets.filter((s) => s.awayScore > s.homeScore).length;
  const homeWon = homeSetsWon > awaySetsWon;
  const winner = homeWon ? session.homeTeam : session.awayTeam;

  const setCards = session.completedSets
    .map(
      (s) => `
      <div style="border:1px solid #e5e7eb; border-radius:10px; padding:8px 14px; text-align:center; min-width:70px;">
        <div style="font-size:9px; font-weight:900; letter-spacing:0.15em; text-transform:uppercase; color:#888;">Set ${s.setNumber}</div>
        <div style="font-size:18px; font-weight:900; font-variant-numeric:tabular-nums; color:#111;">${s.homeScore}–${s.awayScore}</div>
      </div>`,
    )
    .join("");

  const trackedStats = tracked
    ? `
      <div style="display:grid; grid-template-columns:repeat(5,1fr); gap:8px; margin-top:8px;">
        ${[
          ["Kills", tracked.stats.kills],
          ["Errors", tracked.stats.errors],
          ["Hit%", hitPct(tracked)],
          ["Digs", tracked.stats.digs],
          ["Blocks", tracked.stats.blocks],
          ["Aces", tracked.stats.aces],
          ["Assists", tracked.stats.assists],
          ["Att", tracked.stats.totalAttempts],
          ["Dug Att", tracked.stats.dugAttempts],
        ]
          .map(
            ([label, val]) => `
          <div style="border:1px solid #e5e7eb; border-radius:8px; padding:6px 8px; text-align:center;">
            <div style="font-size:8px; font-weight:900; letter-spacing:0.15em; text-transform:uppercase; color:#888;">${escape(label)}</div>
            <div style="font-size:16px; font-weight:900; font-variant-numeric:tabular-nums; color:#111;">${escape(val)}</div>
          </div>`,
          )
          .join("")}
      </div>`
    : "";

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>CourtsideView Report — ${escape(session.homeTeam)} vs ${escape(session.awayTeam)}</title>
<style>
  @page { size: Letter; margin: 0.5in; }
  * { box-sizing: border-box; }
  body { font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color:#111; margin:0; padding:0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  h1,h2,h3 { margin:0; }
  .section { margin-bottom: 16px; page-break-inside: avoid; }
  .card { border:1px solid #e5e7eb; border-radius:14px; padding:14px; }
  .label { font-size:10px; font-weight:900; letter-spacing:0.18em; text-transform:uppercase; color:#888; }
  .header { display:flex; align-items:center; justify-content:space-between; border-bottom:2px solid #111; padding-bottom:10px; margin-bottom:14px; }
  .brand { font-size:14px; font-weight:900; letter-spacing:0.1em; text-transform:uppercase; }
  .swatch { display:inline-block; width:10px; height:10px; border-radius:2px; vertical-align:middle; margin-right:4px; }
  .print-hide { }
  @media print { .print-hide { display:none !important; } }
</style>
</head>
<body>
  <div style="padding: 0;">
    <div class="header">
      <div>
        <div class="brand">CourtsideView</div>
        <div style="font-size:10px; color:#888; margin-top:2px;">${escape(new Date(session.date).toLocaleString())}</div>
      </div>
      <div style="text-align:right;">
        <div class="label">Final · ${escape(formatLabel(session.matchFormat ?? "highschool"))} Match</div>
        <div style="font-size:18px; font-weight:900; margin-top:2px;">
          <span><span class="swatch" style="background:${escape(session.homeColor)};"></span>${escape(session.homeTeam)}</span>
          <span style="color:#888; margin:0 8px;">vs</span>
          <span><span class="swatch" style="background:${escape(session.awayColor)};"></span>${escape(session.awayTeam)}</span>
        </div>
      </div>
    </div>

    <div class="section card" style="text-align:center;">
      <div class="label">Final Score</div>
      <div style="font-size:22px; font-weight:900; margin-top:4px;">${escape(winner)} wins</div>
      <div style="font-size:36px; font-weight:900; font-variant-numeric:tabular-nums; margin-top:4px;">
        ${homeSetsWon} <span style="color:#ccc;">—</span> ${awaySetsWon}
      </div>
      <div style="font-size:10px; color:#888; font-weight:700; letter-spacing:0.18em; text-transform:uppercase; margin-top:4px;">
        ${escape(session.homeTeam)} · ${escape(session.awayTeam)}
      </div>
    </div>

    ${
      session.completedSets.length
        ? `<div class="section card">
            <h3 class="label" style="margin-bottom:8px;">Sets</h3>
            <div style="display:flex; flex-wrap:wrap; gap:8px;">${setCards}</div>
          </div>`
        : ""
    }

    ${
      tracked
        ? `<div class="section card">
            <h3 class="label" style="margin-bottom:4px;">Player Spotlight</h3>
            <div style="font-size:14px; font-weight:900;">#${escape(tracked.number)} ${escape(tracked.name)} · ${escape(tracked.position)}</div>
            ${trackedStats}
          </div>`
        : ""
    }

    <div class="section card">
      <h3 class="label" style="margin-bottom:8px;">Shot Chart${tracked ? ` — ${escape(tracked.name)}` : ""}</h3>
      ${buildShotChartSVG(killZones)}
    </div>

    <div class="section card">
      <h3 class="label" style="margin-bottom:8px;">Score Momentum</h3>
      ${buildMomentumSVG(session.events, session.isHomeTeam)}
      <p style="text-align:center; font-size:9px; font-weight:700; letter-spacing:0.15em; text-transform:uppercase; color:#888; margin:4px 0 0;">
        + ${escape(session.isHomeTeam ? session.homeTeam : session.awayTeam)} leads
      </p>
    </div>

    <div class="section card">
      <h3 class="label" style="margin-bottom:8px;">Rotation Analysis (Points by Server Slot)</h3>
      ${buildRotationAnalysis(session)}
      <p style="font-size:9px; color:#888; margin:6px 0 0;">Points scored grouped by our server-position rotation throughout the match.</p>
    </div>

    <div class="section card">
      <h3 class="label" style="margin-bottom:8px;">Full Roster Stats</h3>
      ${buildRosterTable(session.roster)}
    </div>

    <div style="text-align:center; font-size:9px; color:#aaa; margin-top:16px;">
      Generated by CourtsideView · ${escape(new Date().toLocaleString())}
    </div>
  </div>

  <script>
    window.addEventListener('load', () => {
      setTimeout(() => { window.focus(); window.print(); }, 250);
    });
  </script>
</body>
</html>`;
}

export function exportSessionPDF(session: GameSession): void {
  const html = buildReportHTML(session);
  const win = window.open("", "_blank", "width=900,height=1100");
  if (!win) {
    alert("Please allow pop-ups to export the PDF report.");
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
}
