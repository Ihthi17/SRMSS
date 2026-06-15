import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";

const API = "http://localhost:5000/api/settings";

// ── Reusable Alert ──────────────────────────────
function Alert({ config }) {
  if (!config.isOpen) return null;
  const ok = config.type === "success";
  return (
    <div className="fixed top-5 right-5 z-[100] max-w-sm w-[90%] sm:w-full bg-neutral-900 border rounded-xl shadow-2xl p-4 flex items-start gap-3 border-neutral-800">
      <div className={`p-1 rounded-lg border ${ok ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"}`}>
        {ok
          ? <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
          : <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}
      </div>
      <div className="flex-1">
        <p className="text-sm font-bold text-white">{ok ? "Success" : "Error"}</p>
        <p className="text-xs text-neutral-400 mt-0.5">{config.message}</p>
      </div>
    </div>
  );
}

// ── Section Card ────────────────────────────────
function Card({ title, subtitle, icon, children }) {
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-xl">
      <div className="px-6 py-4 border-b border-neutral-800 flex items-center gap-3">
        <span className="text-xl">{icon}</span>
        <div>
          <h2 className="text-base font-bold text-white tracking-wide">{title}</h2>
          {subtitle && <p className="text-xs text-neutral-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

// ── Label + Input helper ─────────────────────────
function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-amber-500 uppercase tracking-wider mb-1.5">{label}</label>
      {children}
    </div>
  );
}

const inputCls = "w-full px-3 py-2 text-sm bg-neutral-950 border border-neutral-700 rounded-lg text-white focus:ring-1 focus:ring-amber-500 focus:outline-none";

export default function Settings() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState("backup");
  const [alert, setAlert] = useState({ isOpen: false, message: "", type: "success" });

  const showAlert = (message, type = "success") => {
    setAlert({ isOpen: true, message, type });
    setTimeout(() => setAlert((p) => ({ ...p, isOpen: false })), 5000);
  };

  // ── BACKUP STATE ──
  const [backups, setBackups] = useState([]);
  const [backupLoading, setBackupLoading] = useState(false);
  const [listLoading, setListLoading] = useState(false);
  const [restoreTarget, setRestoreTarget] = useState(null);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // ── SMTP STATE ──
  const [smtp, setSmtp] = useState({
    smtp_host: "", smtp_port: "587", smtp_user: "", smtp_password: "",
    smtp_from_name: "SRMSS System", smtp_from_email: "",
    smtp_secure: "tls",
  });
  const [smtpConfigured, setSmtpConfigured] = useState(false);
  const [smtpLoading, setSmtpLoading] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [testLoading, setTestLoading] = useState(false);
  const [showSmtpPassword, setShowSmtpPassword] = useState(false);

  // ── Load on mount ──
  useEffect(() => {
    fetchBackups();
    fetchSmtp();
  }, []);

  // ─── BACKUP FUNCTIONS ─────────────────────────

  const fetchBackups = async () => {
    try {
      setListLoading(true);
      const res = await fetch(`${API}/backup/list`);
      const data = await res.json();
      if (data.success) setBackups(data.backups);
    } catch { showAlert("Failed to load backup list", "error"); }
    finally { setListLoading(false); }
  };

  const createBackup = async () => {
    try {
      setBackupLoading(true);
      const res = await fetch(`${API}/backup/create`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        showAlert(`Backup created: ${data.backup.filename}`);
        fetchBackups();
      } else { showAlert(data.error || "Backup failed", "error"); }
    } catch { showAlert("Failed to create backup", "error"); }
    finally { setBackupLoading(false); }
  };

  const restoreBackup = async () => {
    if (!restoreTarget) return;
    try {
      setRestoreLoading(true);
      const res = await fetch(`${API}/backup/restore`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: restoreTarget }),
      });
      const data = await res.json();
      if (data.success) { showAlert(data.message); setRestoreTarget(null); }
      else showAlert(data.error || "Restore failed", "error");
    } catch { showAlert("Restore failed", "error"); }
    finally { setRestoreLoading(false); }
  };

  const deleteBackup = async (filename) => {
    try {
      const res = await fetch(`${API}/backup/${encodeURIComponent(filename)}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) { showAlert("Backup deleted"); setDeleteTarget(null); fetchBackups(); }
      else showAlert(data.error || "Delete failed", "error");
    } catch { showAlert("Delete failed", "error"); }
  };

  // ─── SMTP FUNCTIONS ───────────────────────────

  const fetchSmtp = async () => {
    try {
      const res = await fetch(`${API}/smtp`);
      const data = await res.json();
      if (data.success) {
        setSmtp((p) => ({ ...p, ...data.smtp }));
        setSmtpConfigured(data.smtp.smtp_configured);
      }
    } catch { /* silent */ }
  };

  const saveSmtp = async (e) => {
    e.preventDefault();
    try {
      setSmtpLoading(true);
      const res = await fetch(`${API}/smtp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(smtp),
      });
      const data = await res.json();
      if (data.success) { showAlert("SMTP settings saved!"); fetchSmtp(); }
      else showAlert(data.error || "Save failed", "error");
    } catch { showAlert("Save failed", "error"); }
    finally { setSmtpLoading(false); }
  };

  const sendTestEmail = async () => {
    if (!testEmail) return showAlert("Enter a test email address", "error");
    try {
      setTestLoading(true);
      const res = await fetch(`${API}/smtp/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ test_email: testEmail }),
      });
      const data = await res.json();
      if (data.success) showAlert(data.message);
      else showAlert(data.error || "Test failed", "error");
    } catch { showAlert("Test failed", "error"); }
    finally { setTestLoading(false); }
  };

  // ─────────────────────────────────────────────
  //  RENDER
  // ─────────────────────────────────────────────
  const tabs = [
    { id: "backup", label: "Database Backup", icon: "🗄️" },
    { id: "smtp", label: "Mail / SMTP", icon: "📧" },
  ];

  return (
    <div className="flex min-h-screen bg-neutral-950 text-white overflow-x-hidden relative">
      <Alert config={alert} />

      <Sidebar isOpen={isSidebarOpen} />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} onLogout={() => (window.location.href = "/")} />

        <div className="p-6 max-w-5xl w-full mx-auto space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold tracking-wide">System Settings</h1>
            <p className="text-sm text-neutral-400 mt-1">Manage database backups and mail configuration</p>
          </div>

          {/* Tab Bar */}
          <div className="flex gap-2 bg-neutral-900 border border-neutral-800 p-1.5 rounded-xl w-fit">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                  activeTab === t.id
                    ? "bg-amber-500 text-neutral-950"
                    : "text-neutral-400 hover:text-white hover:bg-neutral-800"
                }`}
              >
                <span>{t.icon}</span> {t.label}
              </button>
            ))}
          </div>

          {/* ══ BACKUP TAB ══════════════════════════════════ */}
          {activeTab === "backup" && (
            <div className="space-y-5">
              <Card title="Create Backup" subtitle="Dump the entire srmss database to a .sql file" icon="💾">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="text-sm text-neutral-400 leading-relaxed">
                    Creates a full <span className="text-amber-400 font-mono">mysqldump</span> of the database and stores it in the{" "}
                    <span className="text-amber-400 font-mono">backend/backups/</span> folder with a timestamp.
                    <br />
                    <span className="text-xs text-neutral-500 mt-1 block">Requires <code className="text-amber-500">mysqldump</code> to be on your system PATH.</span>
                  </div>
                  <button
                    onClick={createBackup}
                    disabled={backupLoading}
                    className="shrink-0 bg-gradient-to-r from-amber-500 to-amber-600 disabled:opacity-50 text-neutral-950 font-bold px-6 py-2.5 rounded-lg text-sm hover:opacity-90 transition-opacity"
                  >
                    {backupLoading ? "Creating…" : "🗄️ Create Backup Now"}
                  </button>
                </div>
              </Card>

              <Card title="Backup Files" subtitle="Manage and restore previous backups" icon="📂">
                {listLoading ? (
                  <p className="text-neutral-500 text-sm py-4 text-center">Loading backups…</p>
                ) : backups.length === 0 ? (
                  <div className="text-center py-10">
                    <p className="text-4xl mb-3">📭</p>
                    <p className="text-neutral-500 text-sm">No backups found. Create one above.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-amber-500 text-xs uppercase font-semibold tracking-wider border-b border-neutral-800">
                          <th className="pb-3 text-left">Filename</th>
                          <th className="pb-3 text-left">Size</th>
                          <th className="pb-3 text-left">Created</th>
                          <th className="pb-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-800/50">
                        {backups.map((b) => (
                          <tr key={b.filename} className="hover:bg-neutral-800/30 transition-colors">
                            <td className="py-3 font-mono text-xs text-neutral-300">{b.filename}</td>
                            <td className="py-3 text-neutral-400">{b.size}</td>
                            <td className="py-3 text-neutral-400 text-xs">{new Date(b.created_at).toLocaleString()}</td>
                            <td className="py-3 text-right space-x-2">
                              <a
                                href={`${API}/backup/download/${encodeURIComponent(b.filename)}`}
                                download
                                className="text-xs text-emerald-400 hover:text-emerald-300 px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/20 transition-colors"
                              >
                                Download
                              </a>
                              <button
                                onClick={() => setRestoreTarget(b.filename)}
                                className="text-xs text-blue-400 hover:text-blue-300 px-2 py-1 rounded bg-blue-500/10 border border-blue-500/20 transition-colors"
                              >
                                Restore
                              </button>
                              <button
                                onClick={() => setDeleteTarget(b.filename)}
                                className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded bg-red-500/10 border border-red-500/20 transition-colors"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <div className="mt-4 flex justify-end">
                  <button onClick={fetchBackups} className="text-xs text-neutral-400 hover:text-white px-3 py-1.5 rounded bg-neutral-800 border border-neutral-700 transition-colors">
                    🔄 Refresh List
                  </button>
                </div>
              </Card>
            </div>
          )}

          {/* ══ SMTP TAB ════════════════════════════════════ */}
          {activeTab === "smtp" && (
            <div className="space-y-5">
              {/* Status Banner */}
              <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border text-sm ${smtpConfigured ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-amber-500/10 border-amber-500/20 text-amber-400"}`}>
                <span className="text-lg">{smtpConfigured ? "✅" : "⚠️"}</span>
                <span>{smtpConfigured ? "SMTP is configured and ready to send emails." : "SMTP is not configured. Fill in the settings below."}</span>
              </div>

              <Card title="SMTP Configuration" subtitle="Configure outgoing mail server settings" icon="⚙️">
                <form onSubmit={saveSmtp} className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label="SMTP Host">
                      <input type="text" value={smtp.smtp_host} onChange={(e) => setSmtp({ ...smtp, smtp_host: e.target.value })}
                        placeholder="smtp.gmail.com" className={inputCls} required />
                    </Field>
                    <Field label="SMTP Port">
                      <input type="number" value={smtp.smtp_port} onChange={(e) => setSmtp({ ...smtp, smtp_port: e.target.value })}
                        placeholder="587" className={inputCls} required />
                    </Field>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label="SMTP Username">
                      <input type="text" value={smtp.smtp_user} onChange={(e) => setSmtp({ ...smtp, smtp_user: e.target.value })}
                        placeholder="you@gmail.com" className={inputCls} required />
                    </Field>
                    <Field label="SMTP Password">
                      <div className="relative">
                        <input
                          type={showSmtpPassword ? "text" : "password"}
                          value={smtp.smtp_password}
                          onChange={(e) => setSmtp({ ...smtp, smtp_password: e.target.value })}
                          placeholder="App password or SMTP password"
                          className={inputCls + " pr-10"}
                        />
                        <button type="button" onClick={() => setShowSmtpPassword((v) => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white text-xs">
                          {showSmtpPassword ? "Hide" : "Show"}
                        </button>
                      </div>
                    </Field>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Field label="From Name">
                      <input type="text" value={smtp.smtp_from_name} onChange={(e) => setSmtp({ ...smtp, smtp_from_name: e.target.value })}
                        placeholder="SRMSS System" className={inputCls} />
                    </Field>
                    <Field label="From Email">
                      <input type="email" value={smtp.smtp_from_email} onChange={(e) => setSmtp({ ...smtp, smtp_from_email: e.target.value })}
                        placeholder="noreply@yourapp.com" className={inputCls} />
                    </Field>
                    <Field label="Security">
                      <select value={smtp.smtp_secure} onChange={(e) => setSmtp({ ...smtp, smtp_secure: e.target.value })} className={inputCls}>
                        <option value="tls">STARTTLS (port 587)</option>
                        <option value="ssl">SSL/TLS (port 465)</option>
                        <option value="none">None (port 25)</option>
                      </select>
                    </Field>
                  </div>

                  {/* Provider hints */}
                  <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-4 text-xs text-neutral-500 space-y-1.5">
                    <p className="text-neutral-400 font-semibold mb-2">💡 Common Provider Settings</p>
                    <p><span className="text-amber-400 font-mono">Gmail:</span> smtp.gmail.com · Port 587 · TLS · Use App Password (2FA required)</p>
                    <p><span className="text-amber-400 font-mono">Outlook:</span> smtp-mail.outlook.com · Port 587 · TLS</p>
                    <p><span className="text-amber-400 font-mono">Yahoo:</span> smtp.mail.yahoo.com · Port 587 · TLS · App Password needed</p>
                    <p><span className="text-amber-400 font-mono">Mailgun:</span> smtp.mailgun.org · Port 587 · TLS</p>
                  </div>

                  <div className="flex justify-end">
                    <button type="submit" disabled={smtpLoading}
                      className="bg-gradient-to-r from-amber-500 to-amber-600 disabled:opacity-50 text-neutral-950 font-bold px-6 py-2.5 rounded-lg text-sm hover:opacity-90 transition-opacity">
                      {smtpLoading ? "Saving…" : "💾 Save SMTP Settings"}
                    </button>
                  </div>
                </form>
              </Card>

              <Card title="Test Email" subtitle="Send a test email to verify your SMTP configuration" icon="🧪">
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="email" value={testEmail} onChange={(e) => setTestEmail(e.target.value)}
                    placeholder="recipient@example.com"
                    className={inputCls + " flex-1"}
                  />
                  <button onClick={sendTestEmail} disabled={testLoading || !smtpConfigured}
                    title={!smtpConfigured ? "Save SMTP settings first" : ""}
                    className="shrink-0 bg-gradient-to-r from-blue-500 to-blue-600 disabled:opacity-40 text-white font-bold px-5 py-2.5 rounded-lg text-sm hover:opacity-90 transition-opacity">
                    {testLoading ? "Sending…" : "📨 Send Test Email"}
                  </button>
                </div>
                {!smtpConfigured && (
                  <p className="text-xs text-amber-500 mt-2">⚠️ Configure and save SMTP settings before sending a test email.</p>
                )}
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* ── Restore Confirm Modal ── */}
      {restoreTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-xl p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-3">⚠️ Confirm Restore</h3>
            <p className="text-sm text-neutral-400 mb-2">
              This will overwrite the current database with:
            </p>
            <p className="font-mono text-amber-400 text-sm bg-neutral-950 px-3 py-2 rounded mb-4">{restoreTarget}</p>
            <p className="text-xs text-red-400 mb-5">All current data will be replaced. This action cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setRestoreTarget(null)} className="px-5 py-2 text-sm text-neutral-400 bg-neutral-950 border border-neutral-800 rounded-lg hover:text-white">Cancel</button>
              <button onClick={restoreBackup} disabled={restoreLoading}
                className="px-5 py-2 bg-gradient-to-r from-blue-500 to-blue-600 disabled:opacity-50 text-white font-bold rounded-lg text-sm hover:opacity-90">
                {restoreLoading ? "Restoring…" : "Restore Database"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-xl p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-3">Delete Backup</h3>
            <p className="text-sm text-neutral-400 mb-2">Are you sure you want to delete this backup file?</p>
            <p className="font-mono text-amber-400 text-sm bg-neutral-950 px-3 py-2 rounded mb-5">{deleteTarget}</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteTarget(null)} className="px-5 py-2 text-sm text-neutral-400 bg-neutral-950 border border-neutral-800 rounded-lg hover:text-white">Cancel</button>
              <button onClick={() => deleteBackup(deleteTarget)}
                className="px-5 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white font-bold rounded-lg text-sm hover:opacity-90">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
