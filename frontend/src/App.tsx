import React, { useEffect, useMemo, useState } from "react";
import Chart from "chart.js/auto";
// @ts-ignore
import annotationPlugin from "chartjs-plugin-annotation";
// @ts-ignore
import zoomPlugin from "chartjs-plugin-zoom";

Chart.register(annotationPlugin as any, zoomPlugin as any);

const API = (path: string) => `http://127.0.0.1:8000${path}`;

type SeriesItem = { date: string; osa_pct: number };
type WorstItem = { barcode: string; osa_pct: number };
type KPIResponse = {
  total: number;
  osa_pct: number;
  oos_pct: number;
  series: SeriesItem[];
  worst_sku?: WorstItem[];
};

export default function App() {
  // --- auth ---
  const [loggedIn, setLoggedIn] = useState(false);
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [msg, setMsg] = useState("");

  // --- data + charts ---
  const [kpis, setKpis] = useState<KPIResponse | null>(null);
  const [lineChart, setLineChart] = useState<Chart | null>(null);
  const [pieChart, setPieChart] = useState<Chart | null>(null);
  const [loading, setLoading] = useState(false);

  // --- filtros / visual ---
  const [store, setStore] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [groupBy, setGroupBy] = useState<"day" | "week" | "month">("day");
  const [showMA, setShowMA] = useState(true);
  const [target, setTarget] = useState<number>(95);

  // ---- helpers de fechas/agrupación ----
  const parseD = (s: string) => {
    const [y, m, d] = s.split("-").map((x) => parseInt(x, 10));
    return new Date(y, (m || 1) - 1, d || 1);
  };

  const keyWeek = (dt: Date) => {
    // ISO week (aproximado)
    const tmp = new Date(Date.UTC(dt.getFullYear(), dt.getMonth(), dt.getDate()));
    const dayNum = tmp.getUTCDay() || 7;
    tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil(((+tmp - +yearStart) / 86400000 + 1) / 7);
    return `${tmp.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
    // ejemplo: 2025-W34
  };

  const groupSeries = (series: SeriesItem[], mode: "day" | "week" | "month"): SeriesItem[] => {
    if (mode === "day") return series;
    const buckets = new Map<string, number[]>();
    for (const it of series) {
      const d = parseD(it.date);
      const key = mode === "week" ? keyWeek(d) : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key)!.push(it.osa_pct);
    }
    return Array.from(buckets.entries())
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([key, arr]) => ({
        date: key,
        osa_pct: Math.round((arr.reduce((s, x) => s + x, 0) / arr.length) * 100) / 100,
      }));
  };

  const movingAverage = (arr: number[], win = 7) => {
    const out: number[] = [];
    for (let i = 0; i < arr.length; i++) {
      const start = Math.max(0, i - win + 1);
      const slice = arr.slice(start, i + 1);
      out.push(Math.round((slice.reduce((s, x) => s + x, 0) / slice.length) * 100) / 100);
    }
    return out;
  };

  // ---- login ----
  const handleLogin = async () => {
    try {
      const r = await fetch(API("/api/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: user, password: pass }),
      });
      if (!r.ok) {
        const t = await r.text().catch(() => "");
        throw new Error(`Credenciales inválidas (${r.status}) ${t || ""}`);
      }
      setMsg("");
      setLoggedIn(true);
    } catch (e: any) {
      setMsg(e.message || "Error al iniciar sesión");
    }
  };

  const handleLogout = () => {
    setLoggedIn(false);
    setKpis(null);
    if (lineChart) {
      lineChart.destroy();
      setLineChart(null);
    }
    if (pieChart) {
      pieChart.destroy();
      setPieChart(null);
    }
  };

  // ---- cargar KPIs + dibujar charts ----
  const applyFilters = async () => {
    if (!loggedIn) return;
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (store.trim()) query.set("store", store.trim());
      if (dateFrom) query.set("date_from", dateFrom);
      if (dateTo) query.set("date_to", dateTo);
      const url = API(`/api/kpis${query.toString() ? `?${query}` : ""}`);
      const res = await fetch(url);
      if (!res.ok) throw new Error("Error cargando KPIs");
      const data: KPIResponse = await res.json();
      setKpis(data);

      // preparar series (agrupadas + MA opcional)
      const series = groupSeries(data.series || [], groupBy);
      const labels = series.map((x) => x.date);
      const values = series.map((x) => x.osa_pct);
      const valuesMA = showMA ? movingAverage(values, 7) : [];

      // LINE
      const lineEl = document.getElementById("lineChart") as HTMLCanvasElement | null;
      if (lineChart) {
        lineChart.destroy();
        setLineChart(null);
      }
      if (lineEl) {
        const lc = new Chart(lineEl, {
          type: "line",
          data: {
            labels,
            datasets: [
              {
                label: "OSA %",
                data: values,
                tension: 0.35,
                pointRadius: 2,
                borderWidth: 2,
              },
              ...(showMA
                ? [
                    {
                      label: "Media móvil (7)",
                      data: valuesMA,
                      borderDash: [6, 6],
                      pointRadius: 0,
                      borderWidth: 2,
                    },
                  ]
                : []),
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              tooltip: {
                callbacks: {
                  label: (ctx: any) => `${ctx.dataset.label}: ${ctx.parsed.y?.toFixed?.(2) ?? ctx.parsed.y}%`,
                },
              },
              legend: { position: "top" as const },
              annotation: {
                annotations: {
                  targetLine: {
                    type: "line" as const,
                    yMin: target,
                    yMax: target,
                    borderWidth: 2,
                    borderColor: "rgba(200,0,0,0.6)",
                    label: {
                      display: true,
                      content: `Meta ${target}%`,
                      position: "start",
                      backgroundColor: "rgba(200,0,0,0.1)",
                    },
                  },
                },
              } as any,
              zoom: {
                zoom: {
                  wheel: { enabled: true },
                  pinch: { enabled: true },
                  mode: "x" as const,
                },
                pan: { enabled: true, mode: "x" as const },
              } as any,
            },
            scales: {
              y: { beginAtZero: true, max: 100, ticks: { callback: (v: any) => `${v}%` } },
              x: { ticks: { maxRotation: 0, autoSkip: true } },
            },
          } as any,
        });
        setLineChart(lc);
      }

      // PIE
      const pieEl = document.getElementById("pieChart") as HTMLCanvasElement | null;
      if (pieChart) {
        pieChart.destroy();
        setPieChart(null);
      }
      if (pieEl) {
        const pc = new Chart(pieEl, {
          type: "doughnut",
          data: {
            labels: ["OSA %", "OOS %"],
            datasets: [{ data: [data.osa_pct, data.oos_pct] }],
          },
          options: { responsive: true } as any,
        });
        setPieChart(pc);
      }
    } catch (err: any) {
      setMsg(err.message || "Error cargando KPIs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!loggedIn) return;
    applyFilters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loggedIn]);

  // recalcular cuando cambie solo visual (groupBy, showMA, target), sin refetch
  useEffect(() => {
    if (!loggedIn || !kpis) return;
    (async () => {
      // rehacer charts con datos locales
      const data = kpis;
      const series = groupSeries(data.series || [], groupBy);
      const labels = series.map((x) => x.date);
      const values = series.map((x) => x.osa_pct);
      const valuesMA = showMA ? movingAverage(values, 7) : [];

      if (lineChart) {
        lineChart.data.labels = labels as any;
        lineChart.data.datasets[0].data = values as any;
        if (showMA) {
          if (lineChart.data.datasets[1]) {
            lineChart.data.datasets[1].data = valuesMA as any;
          } else {
            lineChart.data.datasets.push({
              label: "Media móvil (7)",
              data: valuesMA,
              borderDash: [6, 6],
              pointRadius: 0,
              borderWidth: 2,
            } as any);
          }
        } else if (lineChart.data.datasets[1]) {
          lineChart.data.datasets.splice(1, 1);
        }
        // meta
        (lineChart.options.plugins as any)?.annotation?.annotations &&
          ((lineChart.options.plugins as any).annotation.annotations.targetLine.yMin = target,
           (lineChart.options.plugins as any).annotation.annotations.targetLine.yMax = target);
        lineChart.update();
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupBy, showMA, target]);

  // export CSV de la serie actual (post-agrupación)
  const exportCSV = () => {
    if (!kpis) return;
    const series = groupSeries(kpis.series || [], groupBy);
    const rows = [["date", "osa_pct"], ...series.map((r) => [r.date, String(r.osa_pct)])];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `osa_series_${groupBy}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // worst table memo
  const worst = useMemo(() => kpis?.worst_sku || [], [kpis]);

  // ---- render ----
  if (!loggedIn) {
    return (
      <div id="login" className="view" style={{ maxWidth: 420, margin: "60px auto" }}>
        <h1>OSA Dashboard</h1>
        <div className="card" style={{ padding: 16 }}>
          <input value={user} onChange={(e) => setUser(e.target.value)} placeholder="Usuario" />
          <input value={pass} onChange={(e) => setPass(e.target.value)} placeholder="Contraseña" type="password" />
          <button onClick={handleLogin} style={{ marginTop: 8 }}>Ingresar</button>
          {msg && <p className="msg">{msg}</p>}
        </div>
      </div>
    );
  }

  return (
    <div id="app" className="view" style={{ padding: 16 }}>
      <header className="header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>Dashboard OSA</h2>
        <button onClick={handleLogout} className="btn-logout">Salir</button>
      </header>

      {/* Barra de filtros/controles */}
      <section className="card" style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(6, minmax(120px, 1fr))", alignItems: "end", padding: 12 }}>
        <div>
          <label>PV</label>
          <input value={store} onChange={(e) => setStore(e.target.value)} placeholder="Tienda (PV)" />
        </div>
        <div>
          <label>Desde</label>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </div>
        <div>
          <label>Hasta</label>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </div>
        <div>
          <label>Agrupar</label>
          <select value={groupBy} onChange={(e) => setGroupBy(e.target.value as any)}>
            <option value="day">Día</option>
            <option value="week">Semana</option>
            <option value="month">Mes</option>
          </select>
        </div>
        <div>
          <label>Meta OSA %</label>
          <input type="number" min={0} max={100} value={target} onChange={(e) => setTarget(Number(e.target.value))} />
        </div>
        <div>
          <label>Opciones</label>
          <div style={{ display: "flex", gap: 8 }}>
            <label><input type="checkbox" checked={showMA} onChange={(e) => setShowMA(e.target.checked)} /> MA(7)</label>
            <button onClick={exportCSV}>Exportar CSV</button>
            <button onClick={applyFilters} disabled={loading}>{loading ? "Cargando..." : "Aplicar"}</button>
          </div>
        </div>
      </section>

      {/* KPIs */}
      {kpis && (
        <section className="kpis" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginTop: 12 }}>
          <div className="kpi card"><div className="kpi-title">Total</div><div className="kpi-value">{kpis.total}</div></div>
          <div className="kpi card"><div className="kpi-title">OSA %</div><div className="kpi-value">{kpis.osa_pct}</div></div>
          <div className="kpi card"><div className="kpi-title">OOS %</div><div className="kpi-value">{kpis.oos_pct}</div></div>
        </section>
      )}

      {/* Charts */}
      <section className="charts-wrap" style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12, marginTop: 12 }}>
        <div className="charts card" style={{ height: 360 }}><canvas id="lineChart"></canvas></div>
        <div className="charts card" style={{ height: 360 }}><canvas id="pieChart"></canvas></div>
      </section>

      {/* Worst SKUs */}
      {worst.length > 0 && (
        <section className="card" style={{ marginTop: 12 }}>
          <h3>Top 5 SKU con peor OSA</h3>
          <table id="tblWorst" style={{ width: "100%" }}>
            <thead><tr><th>Barcode</th><th>OSA %</th></tr></thead>
            <tbody>
              {worst.map((w, i) => (
                <tr key={i}><td>{w.barcode}</td><td>{w.osa_pct}</td></tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
