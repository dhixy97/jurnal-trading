"use client";
import React, { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function HomePage() {
  const [modal, setModal] = useState(500);
  const [riskPct, setRiskPct] = useState(3);
  const [valuePerLot, setValuePerLot] = useState(100);
  const [trades, setTrades] = useState([]);
  const [form, setForm] = useState({
    position: "BUY",
    symbol: "XAUUSD",
    lot: 1,
    dateEntry: "",
    timeEntry: "",
    dateExit: "",
    timeExit: "",
    entry: "",
    sl: "",
    tp: "",
    exitReason: "TP",
    exit: "",
  });

  // Fetch trades from MongoDB
  const loadTrades = async () => {
    try {
      const res = await fetch("/api/trades");
      if (!res.ok) throw new Error("Failed to fetch trades");
      const data = (await res.json()).map(t => ({ ...t, _id: t._id.toString() }));
      setTrades(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadTrades();
  }, []);

  const formatUSD = (v) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v || 0);

  const calcPriceProfit = (t) => {
    const entry = Number(t.entry) || 0;
    const exit = Number(t.exit) || 0;
    return t.position.toUpperCase() === "SELL" ? entry - exit : exit - entry;
  };

  const calcPnlUSD = (t) => calcPriceProfit(t) * Number(t.lot || 0) * Number(valuePerLot || 0.1);

  const calcRR = (t) => {
    const riskUSD = ((Number(riskPct) || 0) / 100) * Number(modal || 0);
    if (riskUSD === 0) return 0;
    return calcPnlUSD(t) / riskUSD;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const exitPrice = form.exit || (form.exitReason === "TP" ? form.tp : form.sl);
    const payload = { ...form, lot: Number(form.lot), entry: Number(form.entry), sl: Number(form.sl), tp: Number(form.tp), exit: Number(exitPrice) || 0 };
    try {
      const res = await fetch("/api/trades", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error("Failed to save trade");
      // Reload trades after successful post
      await loadTrades();
      setForm({ position: "BUY", symbol: form.symbol, lot: 1, dateEntry: "", timeEntry: "", dateExit: "", timeExit: "", entry: "", sl: "", tp: "", exitReason: "TP", exit: "" });
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  };

  const handleDelete = async (id) => {
    try {
      const res = await fetch("/api/trades", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
      if (!res.ok) throw new Error("Delete failed");
      // Reload trades after delete
      await loadTrades();
    } catch (err) {
      console.error(err);
    }
  };

  const computeSeries = () => {
    const series = [];
    let equity = Number(modal || 0);
    series.push({ name: "Start", equity });
    trades.forEach((t, idx) => {
      const pnl = calcPnlUSD(t);
      equity += pnl;
      const label = t.dateExit && t.timeExit ? `${t.dateExit} ${t.timeExit}` : t.dateEntry && t.timeEntry ? `${t.dateEntry} ${t.timeEntry}` : t.dateEntry || `#${idx + 1}`;
      series.push({ name: label, equity: Number(equity.toFixed(2)) });
    });
    return series;
  };

  const series = computeSeries();
  const tradePnls = trades.map(calcPnlUSD);
  const wins = tradePnls.filter((p) => p > 0).length;
  const winRate = trades.length ? ((wins / trades.length) * 100).toFixed(1) : "0";
  const totalProfit = tradePnls.reduce((a, b) => a + b, 0);
  const avgRR = trades.length ? (trades.reduce((acc, t) => acc + calcRR(t), 0) / trades.length).toFixed(2) : "0";

  return (
    <main className="p-6 space-y-6">
      {/* Stats */}
      <Card>
        <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-center">
          <div className="flex flex-col">
            <label className="text-sm mb-1">Modal awal ($)</label>
            <Input type="number" value={modal} onChange={(e) => setModal(Number(e.target.value))} />
          </div>
          <div className="flex flex-col">
            <label className="text-sm mb-1">Risk per Trade (%)</label>
            <Input type="number" value={riskPct} onChange={(e) => setRiskPct(Number(e.target.value))} />
          </div>
          <div className="flex flex-col">
            <label className="text-sm mb-1">Value per Lot ($)</label>
            <Input type="number" value={valuePerLot} onChange={(e) => setValuePerLot(Number(e.target.value))} />
          </div>
          <div className="ml-auto flex flex-col items-end gap-1">
            <div className="text-sm">Win Rate: <strong>{winRate}%</strong></div>
            <div className="text-sm">Avg RR: <strong>{avgRR}</strong></div>
            <div className="text-sm">Net P/L: <strong>{formatUSD(totalProfit)}</strong></div>
          </div>
        </CardContent>
      </Card>

      {/* Form */}
      <Card>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-6 gap-3">
            <div className="col-span-1">
              <label className="text-xs">Pos</label>
              <div className="flex gap-2">
                <Button type="button" variant={form.position === "BUY" ? "default" : "outline"} onClick={() => setForm({ ...form, position: "BUY" })}>Buy</Button>
                <Button type="button" variant={form.position === "SELL" ? "default" : "outline"} onClick={() => setForm({ ...form, position: "SELL" })}>Sell</Button>
              </div>
            </div>
            <Input placeholder="Symbol" value={form.symbol} onChange={(e) => setForm({ ...form, symbol: e.target.value })} />
            <Input type="number" placeholder="Lot" value={form.lot} onChange={(e) => setForm({ ...form, lot: e.target.value })} />
            <Input type="date" value={form.dateEntry} onChange={(e) => setForm({ ...form, dateEntry: e.target.value })} />
            <Input type="time" value={form.timeEntry} onChange={(e) => setForm({ ...form, timeEntry: e.target.value })} />
            <Input type="date" value={form.dateExit} onChange={(e) => setForm({ ...form, dateExit: e.target.value })} />
            <Input type="time" value={form.timeExit} onChange={(e) => setForm({ ...form, timeExit: e.target.value })} />
            <Input type="number" placeholder="Entry price" value={form.entry} onChange={(e) => setForm({ ...form, entry: e.target.value })} />
            <Input type="number" placeholder="SL price" value={form.sl} onChange={(e) => setForm({ ...form, sl: e.target.value })} />
            <Input type="number" placeholder="TP price" value={form.tp} onChange={(e) => setForm({ ...form, tp: e.target.value })} />
            <div className="col-span-full flex items-center gap-2">
              <label className="text-sm">Close via:</label>
              <Button type="button" variant={form.exitReason === "TP" ? "default" : "outline"} onClick={() => setForm({ ...form, exitReason: "TP" })}>TP</Button>
              <Button type="button" variant={form.exitReason === "SL" ? "default" : "outline"} onClick={() => setForm({ ...form, exitReason: "SL" })}>SL</Button>
              <div className="ml-auto"><Button type="submit">+ Tambah Trade</Button></div>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Chart */}
      <Card>
        <CardContent>
          <div className="w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => formatUSD(value)} />
                <Line type="monotone" dataKey="equity" stroke="#4f46e5" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent>
          <table className="w-full text-sm text-center border-collapse">
            <thead>
              <tr className="border-b">
                <th>Symbol</th><th>Pos</th><th>Entry Date</th><th>Entry Time</th>
                <th>Exit Date</th><th>Exit Time</th><th>Lot</th><th>Entry</th><th>SL</th>
                <th>TP</th><th>Exit</th><th>P/L ($)</th><th>RR</th><th>Action</th>
              </tr>
            </thead>
            <tbody>
              {trades.map((t) => {
                const pnl = calcPnlUSD(t);
                const rr = calcRR(t);
                return (
                  <tr key={t._id} className="border-b">
                    <td>{t.symbol}</td><td>{t.position}</td><td>{t.dateEntry || "-"}</td><td>{t.timeEntry || "-"}</td>
                    <td>{t.dateExit || "-"}</td><td>{t.timeExit || "-"}</td><td>{t.lot}</td><td>{t.entry}</td>
                    <td>{t.sl}</td><td>{t.tp}</td><td>{t.exit}</td><td>{formatUSD(pnl)}</td><td>{Number(rr || 0).toFixed(2)}</td>
                    <td><Button variant="destructive" size="sm" onClick={() => handleDelete(t._id)}>x</Button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </main>
  );
}
