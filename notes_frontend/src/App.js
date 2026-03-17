import React, { useState, useEffect } from "react";
import "./App.css";

/**
 * NOTES FRONTEND APP
 * - Header bar with app title
 * - Sidebar list with search and note list
 * - Main view for note detail and editing/creating
 * - Floating action button for adding notes
 */

// API URL -- adjust if needed for deployed backend
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:3001";

function fetcher(url, options = {}) {
  return fetch(url, options).then(async (res) => {
    if (!res.ok) {
      const msg = (await res.json().catch(() => ({}))).message || res.statusText;
      throw new Error(msg);
    }
    return res.json();
  });
}

// PUBLIC_INTERFACE
function App() {
  const [theme, setTheme] = useState("light");
  const [notes, setNotes] = useState([]);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showEditor, setShowEditor] = useState(false);
  const [editorData, setEditorData] = useState({ title: "", content: "" });
  const [editorMode, setEditorMode] = useState("create"); // create | edit

  // Effect to apply theme to document element
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  // PUBLIC_INTERFACE
  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  // ---- Fetch notes list, supports optional query
  useEffect(() => {
    setLoading(true);
    setError("");
    let url = `${BACKEND_URL}/notes`;
    if (query.trim()) {
      url = `${BACKEND_URL}/notes/search?q=${encodeURIComponent(query)}`;
    }
    fetcher(url)
      .then((data) => setNotes(Array.isArray(data) ? data : data.notes || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [query]);

  // ---- Fetch note details
  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    setLoading(true);
    setError("");
    fetcher(`${BACKEND_URL}/notes/${selectedId}`)
      .then((data) => setDetail(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [selectedId]);

  // ---- Handler: Select note from list
  function handleSelect(note) {
    setSelectedId(note.id);
    setShowEditor(false);
  }

  // ---- Handler: Open editor for create or edit
  function openEditor(mode, note) {
    if (mode === "edit" && note) {
      setEditorData({ title: note.title, content: note.content });
      setEditorMode("edit");
      setShowEditor(true);
    } else {
      setEditorData({ title: "", content: "" });
      setEditorMode("create");
      setShowEditor(true);
    }
  }

  // ---- Handler: Search change
  function handleSearchChange(e) {
    setQuery(e.target.value);
  }

  // ---- Handler: Submit new or edit note
  async function handleEditorSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      let result;
      if (editorMode === "create") {
        result = await fetcher(`${BACKEND_URL}/notes`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(editorData),
        });
      } else {
        result = await fetcher(`${BACKEND_URL}/notes/${selectedId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(editorData),
        });
      }
      // Refresh notes list & detail view
      setQuery(""); // Reset search to show all
      setTimeout(() => setQuery(""), 50); // force reload
      setShowEditor(false);
      setEditorData({ title: "", content: "" });
      setSelectedId(editorMode === "edit" ? selectedId : result.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // ---- Handler: Delete note
  async function handleDelete() {
    if (!selectedId) return;
    if (!window.confirm("Delete this note?")) return;
    setLoading(true);
    setError("");
    try {
      await fetcher(`${BACKEND_URL}/notes/${selectedId}`, { method: "DELETE" });
      setNotes((prev) => prev.filter((n) => n.id !== selectedId));
      setSelectedId(null);
      setDetail(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // ---- Note list panel
  function NoteList() {
    return (
      <aside className="notes-sidebar">
        <div className="sidebar-header">
          <input
            className="search-input"
            placeholder="Search notes..."
            value={query}
            onChange={handleSearchChange}
            aria-label="Search notes"
            disabled={loading}
          />
        </div>
        <div className="notes-list">
          {loading && (
            <div className="loading-message">Loading notes...</div>
          )}
          {notes.length === 0 && !loading ? (
            <div className="empty-message">No notes found.</div>
          ) : (
            notes.map((note) => (
              <div
                className={
                  "note-list-item" +
                  (note.id === selectedId ? " selected" : "")
                }
                key={note.id}
                onClick={() => handleSelect(note)}
                tabIndex={0}
                aria-selected={note.id === selectedId}
              >
                <div className="note-title">{note.title || "(Untitled)"}</div>
                <div className="note-preview">
                  {(note.content || "").slice(0, 40)}
                  {note.content && note.content.length > 40 ? "..." : ""}
                </div>
              </div>
            ))
          )}
        </div>
        <button
          className="fab"
          aria-label="Add note"
          onClick={() => openEditor("create")}
        >
          ＋
        </button>
      </aside>
    );
  }

  // ---- Note detail / edit panel
  function NoteDetail() {
    if (showEditor) {
      return (
        <section className="note-detail">
          <h2>{editorMode === "edit" ? "Edit Note" : "New Note"}</h2>
          <form onSubmit={handleEditorSubmit} className="editor-form">
            <label>
              Title
              <input
                className="editor-title"
                value={editorData.title}
                onChange={(e) =>
                  setEditorData((d) => ({ ...d, title: e.target.value }))
                }
                placeholder="Note title"
                required
                autoFocus
              />
            </label>
            <label>
              Content
              <textarea
                className="editor-content"
                value={editorData.content}
                onChange={(e) =>
                  setEditorData((d) => ({ ...d, content: e.target.value }))
                }
                placeholder="Write your note here..."
                rows={8}
                required
              />
            </label>
            <div className="editor-actions">
              <button className="btn btn-primary" type="submit" disabled={loading}>
                {editorMode === "edit" ? "Save Changes" : "Create"}
              </button>
              <button
                className="btn"
                type="button"
                onClick={() => setShowEditor(false)}
                disabled={loading}
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      );
    }

    if (!selectedId || !detail) {
      return (
        <section className="note-detail blank">
          <div className="empty-message centered">
            Select a note or <span className="link-btn" onClick={() => openEditor("create")}>create</span> a new note.
          </div>
        </section>
      );
    }

    return (
      <section className="note-detail">
        <h2>
          {detail.title || "(Untitled)"}
        </h2>
        <div className="note-content">{detail.content || <em>No content</em>}</div>
        <div className="detail-actions">
          <button
            className="btn btn-primary"
            onClick={() => openEditor("edit", detail)}
            aria-label="Edit note"
            disabled={loading}
          >
            Edit
          </button>
          <button
            className="btn btn-danger"
            onClick={handleDelete}
            aria-label="Delete note"
            disabled={loading}
          >
            Delete
          </button>
        </div>
      </section>
    );
  }

  return (
    <div className="App notes-app">
      <header className="app-header-bar">
        <div className="app-title">🗒️ NotesApp</div>
        <button
          className="theme-toggle"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
        >
          {theme === "light" ? "🌙 Dark" : "☀️ Light"}
        </button>
      </header>
      <main className="main-layout">
        <NoteList />
        <NoteDetail />
      </main>
      {error && <div className="error-banner">{error}</div>}
    </div>
  );
}

export default App;
