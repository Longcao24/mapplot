import React, { useEffect, useMemo, useRef, useState } from "react";
import Papa from "papaparse";
import { apiImportCSVData } from "../lib/api";

const LS_KEY = (url) => `formSync:lastTimestamp:${url}`;

function parseTimestamp(s) {
  if (!s) return null;
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})[ ,T]+(\d{1,2}):(\d{2})(?::(\d{2}))?/.exec(s);
  if (m) {
    const [_, mm, dd, yyyy, HH, MM, SS = "00"] = m;
    return new Date(+yyyy, +mm - 1, +dd, +HH, +MM, +SS);
  }
  const d = new Date(s);
  return isNaN(d) ? null : d;
}

function normalizeRow(row) {
  const first = row.FirstName || row.first_name || row["First Name"] || "";
  const last  = row.LastName  || row.last_name  || row["Last Name"]  || "";
  const tsRaw = row.Timestamp || row.timestamp  || row["Time"]       || row.registered_at || "";
  return {
    first_name: first,
    last_name: last,
    email: row.Email || row.email || "",
    phone: row.Phone || row.phone || "",
    company: row.Company || row.company || "",
    address: row.Address || row.address || "",
    city: row.City || row.city || "",
    state: row.State || row.state || "",
    zip_code: row.Zip || row.ZIP || row.zip || row.zip_code || row.postal_code || "",
    status: row.Status || row.status || "lead",
    registered_at: tsRaw,
    // Optional: captured but ignored by your current importer
    products_interested: row["Product Interest"] || row.products_interested || "",
  };
}

async function fetchCSV(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
  const text = await res.text();
  const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
  if (parsed.errors?.length) console.warn("CSV parse errors:", parsed.errors.slice(0, 3));
  return parsed.data;
}

export default function CSVImportFromLink({ onClose, onImportComplete, defaultProduct = "AudioSight" }) {
  const [url, setUrl] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(defaultProduct);
  const [preview, setPreview] = useState([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const [live, setLive] = useState(false);
  const [intervalSec, setIntervalSec] = useState(60);
  const timerRef = useRef(null);

  const lastTimestamp = useMemo(() => {
    if (!url) return null;
    const s = localStorage.getItem(LS_KEY(url));
    return s ? new Date(s) : null;
  }, [url]);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  async function handlePreview() {
    try {
      setLoading(true);
      setStatus("Fetching CSV…");
      const data = await fetchCSV(url);
      const rows = data.map(normalizeRow);
      setPreview(rows.slice(0, 10));
      setStatus(`Fetched ${data.length} rows. Showing first 10.`);
    } catch (e) {
      setStatus(`Error: ${e.message}`);
      setPreview([]);
    } finally {
      setLoading(false);
    }
  }

  function filterNewRows(rows) {
    if (!rows.length) return rows;
    const haveTs = rows.some(r => r.registered_at);
    if (!haveTs) return rows;
    const last = lastTimestamp;
    if (!last) return rows;
    return rows.filter(r => {
      const d = parseTimestamp(r.registered_at);
      return d ? d > last : true;
    });
  }

  async function importOnce() {
    if (!url) { setStatus("Paste a published CSV link."); return; }
    try {
      setLoading(true);
      setStatus("Downloading and parsing…");
      const data = await fetchCSV(url);
      const normalized = data.map(normalizeRow);
      const fresh = filterNewRows(normalized);

      if (fresh.length === 0) { setStatus("No new rows to import."); return; }

      setStatus(`Importing ${fresh.length} row(s)…`);
      const result = await apiImportCSVData(fresh, selectedProduct);

      const maxTs = normalized
        .map(r => parseTimestamp(r.registered_at))
        .filter(Boolean)
        .sort((a, b) => b - a)[0];
      if (maxTs) localStorage.setItem(LS_KEY(url), maxTs.toISOString());

      setStatus(`Imported ${result.imported_count} (geocoded ${result.geocoded_count}).`);
      onImportComplete?.();
    } catch (e) {
      setStatus(`Import failed: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  function startLive() {
    if (!url) { setStatus("Paste a link before starting live sync."); return; }
    if (timerRef.current) clearInterval(timerRef.current);
    setLive(true);
    importOnce();
    timerRef.current = setInterval(importOnce, Math.max(10, intervalSec) * 1000);
    setStatus(`Live sync started (every ${Math.max(10, intervalSec)}s). Keep this page open.`);
  }

  function stopLive() {
    setLive(false);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    setStatus("⏹ Live sync stopped.");
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 800 }}>
        <div className="modal-header">
          <h3>Import from Google Form Link</h3>
          <button onClick={onClose} className="close-button">×</button>
        </div>

        <div className="modal-body">
          <label className="block" style={{ fontWeight: 600, marginBottom: 6 }}>Published CSV URL</label>
          <input
            type="url"
            className="search-input"
            placeholder="https://docs.google.com/spreadsheets/d/.../export?format=csv&gid=..."
            value={url}
            onChange={(e) => setUrl(e.target.value.trim())}
          />

          <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            {["AudioSight", "SATE", "Both"].map(p => (
              <button
                key={p}
                onClick={() => setSelectedProduct(p)}
                className="btn-import"
                style={{
                  borderColor: selectedProduct === p ? '#111' : '#e5e7eb',
                  background: selectedProduct === p ? '#111' : '#fff',
                  color: selectedProduct === p ? '#fff' : '#111'
                }}
              >
                {p}
              </button>
            ))}
            <button onClick={handlePreview} disabled={!url || loading} className="btn-secondary">Preview first 10</button>
            <button onClick={importOnce} disabled={!url || loading} className="btn-primary">Import once</button>
          </div>

          <div className="detail-section" style={{ marginTop: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <strong>Live Sync:</strong>
              <input
                type="number"
                min={10}
                value={intervalSec}
                onChange={(e) => setIntervalSec(parseInt(e.target.value || "60", 10))}
                style={{ width: 80 }}
              />
              <span>seconds</span>
              {!live ? (
                <button onClick={startLive} disabled={!url || loading} className="btn-primary">Start</button>
              ) : (
                <button onClick={stopLive} className="btn-secondary">Stop</button>
              )}
            </div>
            <div style={{ marginTop: 6, fontSize: 12, color: '#6b7280' }}>
              Last imported after: {lastTimestamp ? lastTimestamp.toLocaleString() : '—'}
            </div>
          </div>

          {status && (
            <div className="detail-section" style={{ marginTop: 12 }}>
              <div className="notes-text">{status}</div>
            </div>
          )}

          {preview.length > 0 && (
            <div className="detail-section" style={{ marginTop: 12 }}>
              <div className="products-detail" style={{ overflow: 'auto', maxHeight: 280 }}>
                <table className="customer-table">
                  <thead>
                    <tr>
                      {Object.keys(preview[0]).map((k) => (
                        <th key={k}>{k}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((r, i) => (
                      <tr key={i}>
                        {Object.keys(preview[0]).map((k) => (
                          <td key={k}>{String(r[k] ?? "")}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="btn-secondary">Close</button>
        </div>
      </div>
    </div>
  );
}
