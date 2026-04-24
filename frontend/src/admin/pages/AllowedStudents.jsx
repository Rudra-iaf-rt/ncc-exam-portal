import { useCallback, useEffect, useMemo, useState } from 'react';
import Papa from 'papaparse';
import { UploadCloud, RefreshCw, ShieldCheck, AlertCircle, Download, Plus, Trash2, Pencil, X } from 'lucide-react';

import { apiFetch } from '../../lib/api';
import { PageHeader } from '../components/Shared';
import '../admin.css';

function normalizeRegimentalNumber(value) {
  return String(value ?? '').trim();
}

function pickField(row, keys) {
  for (const k of keys) {
    if (row && row[k] != null && String(row[k]).trim() !== '') return String(row[k]).trim();
  }
  return '';
}

export default function AllowedStudents() {
  const [allowedStudents, setAllowedStudents] = useState([]);
  const [loadingList, setLoadingList] = useState(true);

  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all | approved | registered

  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');
  const [addForm, setAddForm] = useState({
    regimentalNumber: '',
    name: '',
    college: '',
    batch: '',
  });

  const [file, setFile] = useState(null);
  const [previewRows, setPreviewRows] = useState([]);
  const [parseError, setParseError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({
    regimentalNumber: '',
    name: '',
    college: '',
    batch: '',
  });
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');

  const fetchList = useCallback(async () => {
    setLoadingList(true);
    const { data, error } = await apiFetch('/admin/allowed-students');
    if (error) {
      setAllowedStudents([]);
    } else {
      setAllowedStudents(data?.allowedStudents ?? []);
    }
    setLoadingList(false);
  }, []);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const filteredAllowedStudents = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allowedStudents.filter((s) => {
      if (statusFilter === 'approved' && s.isRegistered) return false;
      if (statusFilter === 'registered' && !s.isRegistered) return false;
      if (!q) return true;
      const hay = [
        s.regimentalNumber,
        s.name,
        s.college,
        s.batch,
        String(s.id),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [allowedStudents, query, statusFilter]);

  const stats = useMemo(() => {
    const seen = new Set();
    let invalid = 0;
    let duplicateInFile = 0;
    let valid = 0;

    for (const r of previewRows) {
      const reg = normalizeRegimentalNumber(r.regimentalNumber);
      if (!reg) {
        invalid++;
        continue;
      }
      const key = reg.toLowerCase();
      if (seen.has(key)) {
        duplicateInFile++;
        continue;
      }
      seen.add(key);
      valid++;
    }

    return {
      received: previewRows.length,
      valid,
      invalid,
      duplicateInFile,
    };
  }, [previewRows]);

  async function onPickFile(f) {
    setResult(null);
    setParseError('');
    setPreviewRows([]);
    setFile(f ?? null);

    if (!f) return;

    Papa.parse(f, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => String(h || '').trim(),
      complete: (res) => {
        if (res.errors?.length) {
          setParseError(res.errors[0]?.message || 'Failed to parse CSV.');
          return;
        }

        const rows = (res.data || [])
          .slice(0, 5000)
          .map((row) => {
            const regimentalNumber = normalizeRegimentalNumber(
              pickField(row, ['regimentalNumber', 'regimental_number', 'regimentalNo', 'regimental_no'])
            );
            return {
              regimentalNumber,
              name: pickField(row, ['name']),
              college: pickField(row, ['college']),
              batch: pickField(row, ['batch']),
            };
          });

        setPreviewRows(rows);
      },
      error: () => setParseError('Failed to read CSV file.'),
    });
  }

  async function upload() {
    if (!file) return;
    setUploading(true);
    setParseError('');
    setResult(null);

    try {
      const form = new FormData();
      form.append('file', file);

      const { data, error } = await apiFetch('/admin/allowed-students/bulk-upload', {
        method: 'POST',
        body: form,
      });

      if (error) {
        setParseError(error);
        return;
      }
      setResult(data);
      await fetchList();
    } finally {
      setUploading(false);
    }
  }

  async function addSingle(e) {
    e.preventDefault();
    setAddError('');
    const reg = normalizeRegimentalNumber(addForm.regimentalNumber);
    if (!reg) {
      setAddError('Regimental number is required.');
      return;
    }
    setAdding(true);
    try {
      const { error } = await apiFetch('/admin/allowed-students/add', {
        method: 'POST',
        body: JSON.stringify({
          regimentalNumber: reg,
          name: addForm.name || undefined,
          college: addForm.college || undefined,
          batch: addForm.batch || undefined,
        }),
      });
      if (error) {
        setAddError(error);
        return;
      }
      setAddForm({ regimentalNumber: '', name: '', college: '', batch: '' });
      await fetchList();
    } finally {
      setAdding(false);
    }
  }

  async function deleteRow(id) {
    const ok = window.confirm('Delete this allowed student record?');
    if (!ok) return;
    const { error } = await apiFetch(`/admin/allowed-students/${id}`, { method: 'DELETE' });
    if (error) {
      setParseError(error);
      return;
    }
    await fetchList();
  }

  function startEdit(row) {
    setEditError('');
    setEditingId(row.id);
    setEditForm({
      regimentalNumber: row.regimentalNumber || '',
      name: row.name || '',
      college: row.college || '',
      batch: row.batch || '',
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditError('');
    setEditSaving(false);
  }

  async function saveEdit() {
    if (!editingId) return;
    setEditError('');
    const reg = normalizeRegimentalNumber(editForm.regimentalNumber);
    if (!reg) {
      setEditError('Regimental number cannot be empty.');
      return;
    }
    setEditSaving(true);
    try {
      const { error } = await apiFetch(`/admin/allowed-students/${editingId}`, {
        method: 'PUT',
        body: JSON.stringify({
          regimentalNumber: reg,
          name: editForm.name || null,
          college: editForm.college || null,
          batch: editForm.batch || null,
        }),
      });
      if (error) {
        setEditError(error);
        return;
      }
      await fetchList();
      cancelEdit();
    } finally {
      setEditSaving(false);
    }
  }

  const UploadAction = (
    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
      <a
        href="/allowed-students-template.csv"
        download="allowed-students-template.csv"
        className="adm-btn adm-btn-ghost"
        style={{ height: 34, fontSize: 12 }}
      >
        <Download size={14} strokeWidth={1.5} />
        <span>Template</span>
      </a>
      <button
        className="adm-btn adm-btn-ghost"
        onClick={fetchList}
        disabled={loadingList}
        style={{ height: 34, fontSize: 12 }}
      >
        <RefreshCw size={14} strokeWidth={1.5} />
        <span>Refresh</span>
      </button>
    </div>
  );

  return (
    <div>
      <PageHeader
        title="Allowed Students"
        subtitle="Only cadets pre-approved here can register in the student app."
        action={UploadAction}
      />

      <div className="adm-card" style={{ padding: 20, marginBottom: 24 }}>
        <div className="adm-label" style={{ marginBottom: 10 }}>
          Add single allowed student
        </div>
        <form onSubmit={addSingle} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 0.9fr auto', gap: 10 }}>
          <input
            className="adm-input"
            placeholder="Regimental number"
            value={addForm.regimentalNumber}
            onChange={(e) => setAddForm((s) => ({ ...s, regimentalNumber: e.target.value }))}
            disabled={adding}
          />
          <input
            className="adm-input"
            placeholder="Name (optional)"
            value={addForm.name}
            onChange={(e) => setAddForm((s) => ({ ...s, name: e.target.value }))}
            disabled={adding}
          />
          <input
            className="adm-input"
            placeholder="College (optional)"
            value={addForm.college}
            onChange={(e) => setAddForm((s) => ({ ...s, college: e.target.value }))}
            disabled={adding}
          />
          <input
            className="adm-input"
            placeholder="Batch (optional)"
            value={addForm.batch}
            onChange={(e) => setAddForm((s) => ({ ...s, batch: e.target.value }))}
            disabled={adding}
          />
          <button className="adm-btn adm-btn-primary" type="submit" disabled={adding}>
            <Plus size={16} strokeWidth={1.5} />
            <span>{adding ? 'Adding…' : 'Add'}</span>
          </button>
        </form>
        {addError ? (
          <div style={{ marginTop: 10, color: 'var(--crimson)', fontSize: 13, fontWeight: 500 }}>
            {addError}
          </div>
        ) : null}
      </div>

      <div className="adm-card" style={{ padding: 20, marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 260 }}>
            <div className="adm-label" style={{ marginBottom: 8 }}>
              Bulk upload (CSV)
            </div>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
              className="adm-input"
              style={{ padding: '10px' }}
              disabled={uploading}
            />
            <div style={{ marginTop: 10, fontSize: 12, color: 'var(--ink-4)' }}>
              Format: <code>regimentalNumber,name,college,batch</code>
            </div>
          </div>

          <div style={{ minWidth: 240 }}>
            <div className="adm-label" style={{ marginBottom: 8 }}>
              Preview stats
            </div>
            <div style={{ display: 'grid', gap: 8 }}>
              <div className="adm-badge adm-badge-neutral" style={{ justifyContent: 'space-between' }}>
                <span>Rows read</span>
                <strong>{stats.received}</strong>
              </div>
              <div className="adm-badge adm-badge-success" style={{ justifyContent: 'space-between' }}>
                <span>Valid</span>
                <strong>{stats.valid}</strong>
              </div>
              <div className="adm-badge adm-badge-danger" style={{ justifyContent: 'space-between' }}>
                <span>Invalid</span>
                <strong>{stats.invalid}</strong>
              </div>
              <div className="adm-badge adm-badge-neutral" style={{ justifyContent: 'space-between' }}>
                <span>Dupes (file)</span>
                <strong>{stats.duplicateInFile}</strong>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button
              className="adm-btn adm-btn-primary"
              onClick={upload}
              disabled={!file || uploading || stats.valid === 0}
              style={{ height: 38 }}
            >
              <UploadCloud size={16} strokeWidth={1.5} />
              <span>{uploading ? 'Uploading…' : 'Upload CSV'}</span>
            </button>
          </div>
        </div>

        {parseError ? (
          <div
            style={{
              marginTop: 16,
              background: '#FFF5F5',
              borderLeft: '4px solid var(--crimson)',
              color: 'var(--crimson)',
              padding: '12px 16px',
              borderRadius: 4,
              fontSize: 13,
              display: 'flex',
              gap: 10,
              alignItems: 'center',
              fontWeight: 500,
            }}
          >
            <AlertCircle size={16} />
            {parseError}
          </div>
        ) : null}

        {result ? (
          <div
            style={{
              marginTop: 16,
              background: 'rgba(16, 185, 129, 0.08)',
              borderLeft: '4px solid rgba(16, 185, 129, 0.6)',
              color: 'var(--navy)',
              padding: '12px 16px',
              borderRadius: 4,
              fontSize: 13,
              display: 'flex',
              gap: 10,
              alignItems: 'center',
              fontWeight: 500,
            }}
          >
            <ShieldCheck size={16} />
            Inserted <strong>{result.inserted}</strong> (received {result.received}, valid {result.valid}, invalid{' '}
            {result.invalid}, dupes-in-file {result.duplicateInFile}, skipped-in-db {result.skippedDuplicatesInDb})
          </div>
        ) : null}

        {previewRows.length > 0 ? (
          <div style={{ marginTop: 18 }}>
            <div className="adm-label" style={{ marginBottom: 10 }}>
              Preview (first {Math.min(previewRows.length, 25)} rows)
            </div>
            <div className="adm-table-wrap">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th>Regimental No.</th>
                    <th>Name</th>
                    <th>College</th>
                    <th>Batch</th>
                  </tr>
                </thead>
                <tbody>
                  {previewRows.slice(0, 25).map((r, idx) => {
                    const bad = !normalizeRegimentalNumber(r.regimentalNumber);
                    return (
                      <tr key={idx} style={bad ? { background: '#FFF5F5' } : undefined}>
                        <td style={bad ? { color: 'var(--crimson)', fontWeight: 600 } : undefined}>
                          {r.regimentalNumber || '(missing)'}
                        </td>
                        <td>{r.name}</td>
                        <td>{r.college}</td>
                        <td>{r.batch}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </div>

      <div className="adm-card" style={{ padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy)' }}>Allowed list</div>
          <div style={{ fontSize: 12, color: 'var(--ink-4)' }}>{filteredAllowedStudents.length} records</div>
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
          <input
            className="adm-input"
            placeholder="Search (regimental no, name, college, batch)…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ minWidth: 280, flex: 1 }}
          />
          <select
            className="adm-input"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ width: 180 }}
          >
            <option value="all">All</option>
            <option value="approved">Approved (not registered)</option>
            <option value="registered">Registered</option>
          </select>
        </div>

        {loadingList ? (
          <div style={{ color: 'var(--ink-4)', padding: '20px 0', fontFamily: 'var(--f-mono)', fontSize: 13 }}>
            Loading approved regimental numbers…
          </div>
        ) : (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th style={{ width: 90 }}>ID</th>
                  <th>Regimental No.</th>
                  <th>Name</th>
                  <th>College</th>
                  <th>Batch</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {allowedStudents.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: 40, color: 'var(--ink-4)' }}>
                      No allowed students yet. Upload a CSV to begin.
                    </td>
                  </tr>
                ) : (
                  filteredAllowedStudents.map((s) => {
                    const isEditing = editingId === s.id;
                    return (
                    <tr key={s.id}>
                      <td>
                        <code style={{ background: 'transparent', padding: 0 }}>#{String(s.id).padStart(3, '0')}</code>
                      </td>
                      <td style={{ fontWeight: 600, color: 'var(--navy)' }}>
                        {isEditing ? (
                          <input
                            className="adm-input"
                            value={editForm.regimentalNumber}
                            onChange={(e) => setEditForm((p) => ({ ...p, regimentalNumber: e.target.value }))}
                            style={{ height: 32 }}
                          />
                        ) : (
                          s.regimentalNumber
                        )}
                      </td>
                      <td>
                        {isEditing ? (
                          <input
                            className="adm-input"
                            value={editForm.name}
                            onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                            style={{ height: 32 }}
                          />
                        ) : (
                          s.name || '—'
                        )}
                      </td>
                      <td>
                        {isEditing ? (
                          <input
                            className="adm-input"
                            value={editForm.college}
                            onChange={(e) => setEditForm((p) => ({ ...p, college: e.target.value }))}
                            style={{ height: 32 }}
                          />
                        ) : (
                          s.college || '—'
                        )}
                      </td>
                      <td>
                        {isEditing ? (
                          <input
                            className="adm-input"
                            value={editForm.batch}
                            onChange={(e) => setEditForm((p) => ({ ...p, batch: e.target.value }))}
                            style={{ height: 32 }}
                          />
                        ) : (
                          s.batch || '—'
                        )}
                      </td>
                      <td>
                        {s.isRegistered ? (
                          <span className="adm-badge adm-badge-success">Registered</span>
                        ) : (
                          <span className="adm-badge adm-badge-neutral">Approved</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
                          {isEditing ? (
                            <>
                              <button
                                className="adm-btn adm-btn-primary"
                                style={{ padding: '6px 10px' }}
                                onClick={saveEdit}
                                disabled={editSaving}
                              >
                                <span>{editSaving ? 'Saving…' : 'Save'}</span>
                              </button>
                              <button
                                className="adm-btn adm-btn-ghost"
                                style={{ padding: '6px 10px' }}
                                onClick={cancelEdit}
                                disabled={editSaving}
                              >
                                <X size={14} strokeWidth={1.5} />
                                <span>Cancel</span>
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                className="adm-btn adm-btn-ghost"
                                style={{ padding: '6px 10px' }}
                                onClick={() => startEdit(s)}
                                disabled={s.isRegistered}
                                title={s.isRegistered ? 'Cannot edit registered cadet' : 'Edit'}
                              >
                                <Pencil size={14} strokeWidth={1.5} />
                                <span>Edit</span>
                              </button>
                              <button
                                className="adm-btn adm-btn-ghost"
                                style={{ padding: '6px 10px' }}
                                onClick={() => deleteRow(s.id)}
                                disabled={s.isRegistered}
                                title={s.isRegistered ? 'Cannot delete registered cadet' : 'Delete'}
                              >
                                <Trash2 size={14} strokeWidth={1.5} />
                                <span>Delete</span>
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {editError ? (
          <div style={{ marginTop: 10, color: 'var(--crimson)', fontSize: 13, fontWeight: 500 }}>
            {editError}
          </div>
        ) : null}
      </div>
    </div>
  );
}

