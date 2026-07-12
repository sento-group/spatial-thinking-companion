"use client";

import { ArrowRight, Compass } from "lucide-react";
import { FormEvent, useState } from "react";

export default function AccessPage() {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const response = await fetch("/api/access", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    setBusy(false);
    if (!response.ok) {
      setError("アクセスコードを確認してください。");
      return;
    }
    const next = new URLSearchParams(window.location.search).get("next");
    window.location.assign(next || "/");
  }

  return (
    <main className="access-shell paper-grid">
      <section className="access-card">
        <div className="access-mark"><Compass size={22} /><span className="font-data">SENTO.GROUP / THINKING OS</span></div>
        <p className="panel-kicker">SPATIAL THINKING COMPANION</p>
        <h1 className="font-heading">文章を、判断できる地図へ。</h1>
        <p>本筋を見失わず、時間・抽象度・関係を行き来するための思考ワークスペースです。</p>
        <form onSubmit={submit}>
          <label htmlFor="access-code">共通アクセスコード</label>
          <div><input id="access-code" type="password" value={code} onChange={(event) => setCode(event.target.value)} autoFocus /><button type="submit" disabled={busy || !code}>{busy ? "確認中" : "入る"}<ArrowRight size={15} /></button></div>
          {error ? <p className="access-error" role="alert">{error}</p> : null}
        </form>
      </section>
    </main>
  );
}
