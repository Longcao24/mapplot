import React, { useMemo, useState } from "react";
import "./CustomerManagementPage.css";   // reuse your existing styles
import "./CRMDashboard.css";            // reuse your existing styles
// (no extra CSS file required; a tiny chip style is inlined at bottom)

export default function SendRegistrationMail() {
  const [mode, setMode] = useState("paste"); // "paste" | "csv"
  const [raw, setRaw] = useState("");
  const [rows, setRows] = useState([]);      // [{email, selected, status, note}]
  const [search, setSearch] = useState("");
  const [expiresInDays, setExpiresInDays] = useState(14);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState(null);

  const isEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  const normalize = (arr) =>
    Array.from(new Set(arr.map(s => s.trim().toLowerCase())))
      .filter(Boolean)
      .filter(isEmail)
      .map(email => ({ email, selected: true, status: "New", note: "" }));

  const parseFromText = () => {
    const emails = raw.split(/[\n,;,]+/g);
    setRows(normalize(emails));
    setPage(1);
  };

  const parseFromCsvText = (t) => {
    const lines = t.split(/\r?\n/).filter(Boolean);
    const emails = lines.flatMap(line => {
      const parts = line.split(/[;,]/).map(x => x.trim());
      const hit = parts.find(isEmail);
      return hit ? [hit] : [];
    });
    setRows(normalize(emails));
    setPage(1);
  };

  const onCsvFile = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const text = await f.text();
    parseFromCsvText(text);
  };

  // table helpers
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(r => r.email.includes(q));
  }, [rows, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const start = (page - 1) * itemsPerPage;
  const pageRows = filtered.slice(start, start + itemsPerPage);

  const toggleAll = () => {
    const allSelected = rows.length > 0 && rows.every(r => r.selected);
    setRows(prev => prev.map(r => ({ ...r, selected: !allSelected })));
  };

  const toggleOne = (idx) =>
    setRows(prev => prev.map((r, i) => (i === idx ? { ...r, selected: !r.selected } : r)));

  // send
  const sendInvites = async () => {
    const emails = rows.filter(r => r.selected).map(r => r.email);
    if (emails.length === 0) return setResults({ error: "Select at least one email." });

    setBusy(true);
    setResults(null);
    setRows(prev => prev.map(r => (r.selected ? { ...r, status: "Sending…" } : r)));

    try {
      const res = await fetch("http://localhost:3001/invite-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emails, expiresInDays })
      });
      const json = await res.json();
      setResults(json);

      if (json?.results?.length) {
        const map = new Map(json.results.map(x => [x.email.toLowerCase(), x]));
        setRows(prev =>
          prev.map(r => {
            const hit = map.get(r.email.toLowerCase());
            if (!hit) return r;
            return { ...r, status: hit.ok ? "Sent" : "Error", note: hit.ok ? "" : (hit.error || "Failed") };
          })
        );
      }
    } catch (e) {
      setResults({ error: String(e) });
      setRows(prev => prev.map(r => (r.selected ? { ...r, status: "Error", note: "Network error" } : r)));
    } finally {
      setBusy(false);
    }
  };

  const clearAll = () => {
    setMode("paste");
    setRaw("");
    setRows([]);
    setSearch("");
    setItemsPerPage(50);
    setExpiresInDays(14);
    setPage(1);
    setResults(null);
  };

  return (
    <div className="customer-page-content">
      {/* Header (matches CustomerManagement) */}
      <div className="crm-page-header">
        <div className="page-header-content">
          <div>
            <h1>Registration Mail</h1>
            <p>
              Total: {rows.length} | Page {page} of {totalPages}
            </p>
          </div>

          <div className="page-filters">
            {/* Mode toggle styled like your small buttons */}
            <div className="seg">
              <button
                className={`btn-action seg-btn ${mode === "paste" ? "seg-active" : ""}`}
                onClick={() => setMode("paste")}
                disabled={busy}
              >
                Paste
              </button>
              <button
                className={`btn-action seg-btn ${mode === "csv" ? "seg-active" : ""}`}
                onClick={() => setMode("csv")}
                disabled={busy}
              >
                Import CSV
              </button>
            </div>

            <button onClick={clearAll} className="btn-action">Reset</button>
            <button
              onClick={sendInvites}
              className="btn-action"
              style={{ background: "#10b981", borderColor: "#10b981", color: "white" }}
              disabled={busy || rows.every(r => !r.selected)}
            >
              {busy ? "Sending…" : `Send Invites (${rows.filter(r => r.selected).length})`}
            </button>
          </div>
        </div>
      </div>

      {/* Filters row (reuse your pattern) */}
      <div className="crm-filters-section">
        <div className="search-container">
          <input
            type="text"
            placeholder="Search emails…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="search-input"
          />
        </div>

        <div className="filter-row">
          <select
            value={expiresInDays}
            onChange={(e) => setExpiresInDays(parseInt(e.target.value || "14", 10))}
            className="filter-select"
          >
            <option value={7}>7 days</option>
            <option value={14}>14 days</option>
            <option value={30}>30 days</option>
            <option value={90}>90 days</option>
          </select>

          <select
            value={itemsPerPage}
            onChange={(e) => { setItemsPerPage(Number(e.target.value)); setPage(1); }}
            className="filter-select"
          >
            <option value={25}>25 per page</option>
            <option value={50}>50 per page</option>
            <option value={100}>100 per page</option>
          </select>
        </div>
      </div>

      {/* Single input area — either Paste OR CSV */}
      <div className="crm-table-container" style={{ padding: 16 }}>
        {mode === "paste" ? (
          <div className="form-group full-width">
            <label style={{ fontWeight: 600 }}>Paste emails (one per line or comma-separated)</label>
            <textarea
              rows={6}
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              placeholder={`jane@acme.com\njohn@acme.com`}
              className="notes-text"
              style={{ minHeight: 140 }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
              <button className="btn-action" onClick={parseFromText} disabled={!raw || busy}>Parse</button>
            </div>
          </div>
        ) : (
          <div className="form-group full-width">
            <label style={{ fontWeight: 600 }}>Upload CSV</label>
            <label className="dropzone-like">
              <input type="file" accept=".csv,.txt" onChange={onCsvFile} />
              <div>Drop file here or <span>browse</span></div>
              <div className="hint">Accepts “email” or “name,email” per line</div>
            </label>
          </div>
        )}
      </div>

      {/* Table (same structure as CustomerManagement) */}
      <div className="crm-table-container">
        <table className="customer-table">
          <thead>
            <tr>
              <th style={{ width: 40 }}>
                <input
                  type="checkbox"
                  title="Select All"
                  className="customer-checkbox"
                  checked={rows.length > 0 && rows.every(r => r.selected)}
                  onChange={toggleAll}
                />
              </th>
              <th>Email</th>
              <th style={{ width: 140 }}>Status</th>
              <th>Note</th>
            </tr>
          </thead>

          <tbody>
            {pageRows.length === 0 && (
              <tr>
                <td colSpan={4}>
                  <div className="no-results">No emails yet. {mode === "paste" ? "Paste and Parse" : "Upload a CSV"} to begin.</div>
                </td>
              </tr>
            )}

            {pageRows.map((r, i) => {
              const idx = start + i;
              return (
                <tr key={r.email} className="customer-row">
                  <td style={{ textAlign: "center" }}>
                    <input
                      type="checkbox"
                      className="customer-checkbox"
                      checked={r.selected}
                      onChange={() => toggleOne(idx)}
                    />
                  </td>
                  <td>
                    <div className="customer-name">
                      <strong>{r.email}</strong>
                      <div className="customer-email">{r.email}</div>
                    </div>
                  </td>
                  <td>
                    <span
                      className={`mini-chip ${
                        r.status === "Sent" ? "chip-success" :
                        r.status === "Error" ? "chip-danger" :
                        r.status.startsWith("Sending") ? "chip-info" : "chip-muted"
                      }`}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="customer-email">{r.note}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Footer / pagination */}
        {filtered.length > 0 && (
          <div className="crm-pagination">
            <span className="pagination-info">
              Showing {start + 1}–{Math.min(start + itemsPerPage, filtered.length)} of {filtered.length}
            </span>
            <div>
              <button
                className="pagination-button"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </button>
              <span className="pagination-info" style={{ margin: "0 10px" }}>
                {page} / {totalPages}
              </span>
              <button
                className="pagination-button"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Batch result banner (uses your note styles) */}
      {results && (
        <div style={{
          marginTop: 12,
          padding: "10px 12px",
          borderRadius: 12,
          border: "1px solid #e5e7eb",
          background: results.error ? "#fde8e8" : "#e8f0fe",
          color: "#111827"
        }}>
          {results.error ? (
            results.error
          ) : (
            <>
              <strong>Batch complete.</strong>{" "}
              {results.results?.filter(r => r.ok).length || 0} sent,{" "}
              {results.results?.filter(r => !r.ok).length || 0} failed.
            </>
          )}
        </div>
      )}

      {/* tiny page-local styles that piggyback your theme */}
      <style>{`
        .seg { display:inline-flex; border-radius:10px; overflow:hidden; border:1px solid #e5e7eb; }
        .seg-btn { border:none; background:#fff; }
        .seg-btn.seg-active { background:#e8f0fe; color:#2563eb; }

        .dropzone-like { position:relative; border:1px dashed #e5e7eb; border-radius:12px; padding:28px; text-align:center; color:#6b7280; background:#fff; }
        .dropzone-like input { position:absolute; inset:0; opacity:0; cursor:pointer; }
        .dropzone-like span { color:#2563eb; font-weight:600; }
        .hint { font-size:12px; color:#9ca3af; margin-top:4px; }

        .mini-chip { display:inline-block; padding:4px 8px; font-size:12px; border-radius:999px; border:1px solid #e5e7eb; background:#fff; }
        .chip-success{ background:#eaf8ef; color:#16a34a; border-color:#eaf8ef; }
        .chip-danger{ background:#fde8e8; color:#dc2626; border-color:#fde8e8; }
        .chip-info{ background:#e8f0fe; color:#2563eb; border-color:#e8f0fe; }
        .chip-muted{ color:#9ca3af; }
      `}</style>
    </div>
  );
}