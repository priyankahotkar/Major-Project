import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { collection, query, where, orderBy, addDoc, updateDoc, deleteDoc, onSnapshot, serverTimestamp, doc } from "firebase/firestore";
import { db } from "@/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Card, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/form";
import { ExternalLink, Loader2 } from "lucide-react";

const API_BASE = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

interface Note {
  id: string;
  title: string;
  content: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface NotionPage {
  id: string;
  url: string;
  title: string;
  last_edited?: string;
  object: string;
}

type TabKey = "local" | "notion";

export function NotesPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabKey>("local");
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const [notionConnected, setNotionConnected] = useState<boolean | null>(null);
  const [notionPages, setNotionPages] = useState<NotionPage[]>([]);
  const [notionLoading, setNotionLoading] = useState(false);
  const [notionError, setNotionError] = useState<string | null>(null);
  const [notionMessage, setNotionMessage] = useState<"connected" | "denied" | "error" | null>(null);

  useEffect(() => {
    if (!user) return;

    const notesRef = collection(db, "notes");
    const q = query(
      notesRef,
      where("userId", "==", user.uid),
      orderBy("updatedAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: Note[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data() as any;
        return {
          id: docSnap.id,
          title: data.title || "",
          content: data.content || "",
          createdAt: data.createdAt?.toDate?.() || undefined,
          updatedAt: data.updatedAt?.toDate?.() || undefined,
        };
      });
      setNotes(items);
      if (!selectedNoteId && items.length > 0) {
        handleSelectNote(items[0]);
      }
    });

    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  const fetchNotionStatus = useCallback(async () => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch(`${API_BASE}/api/notion/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setNotionConnected(!!data.connected);
    } catch {
      setNotionConnected(false);
    }
  }, [user]);

  const fetchNotionNotes = useCallback(async () => {
    if (!user) return;
    setNotionLoading(true);
    setNotionError(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`${API_BASE}/api/notion/notes`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.connected === false) setNotionConnected(false);
        throw new Error(data.error || "Failed to load Notion pages");
      }
      setNotionPages(data.pages || []);
    } catch (e) {
      setNotionError(e instanceof Error ? e.message : "Failed to load pages");
      setNotionPages([]);
    } finally {
      setNotionLoading(false);
    }
  }, [user]);

  useEffect(() => {
    const q = searchParams.get("notion");
    if (q === "connected") setNotionMessage("connected");
    else if (q === "denied") setNotionMessage("denied");
    else if (q === "error") setNotionMessage("error");
    if (q) {
      setSearchParams({}, { replace: true });
      setActiveTab("notion");
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (activeTab !== "notion") setNotionMessage(null);
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === "notion" && user) {
      fetchNotionStatus();
    }
  }, [activeTab, user, fetchNotionStatus]);

  useEffect(() => {
    if (activeTab === "notion" && user && notionConnected === true) {
      fetchNotionNotes();
    }
  }, [activeTab, user, notionConnected, fetchNotionNotes]);

  const handleConnectNotion = async () => {
    if (!user) return;
    setNotionLoading(true);
    setNotionError(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`${API_BASE}/api/notion/connect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: token }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Connect failed");
      if (data.redirectUrl) window.location.href = data.redirectUrl;
    } catch (e) {
      setNotionError(e instanceof Error ? e.message : "Connect failed");
    } finally {
      setNotionLoading(false);
    }
  };

  const resetEditor = () => {
    setSelectedNoteId(null);
    setTitle("");
    setContent("");
  };

  const handleSelectNote = (note: Note) => {
    setSelectedNoteId(note.id);
    setTitle(note.title);
    setContent(note.content);
  };

  const handleNewNote = () => {
    resetEditor();
  };

  const handleSave = async () => {
    if (!user) return;
    if (!title.trim() && !content.trim()) return;

    setIsSaving(true);
    try {
      const notesRef = collection(db, "notes");

      if (selectedNoteId) {
        const noteRef = doc(db, "notes", selectedNoteId);
        await updateDoc(noteRef, {
          title: title.trim() || "Untitled note",
          content,
          updatedAt: serverTimestamp(),
        });
      } else {
        const docRef = await addDoc(notesRef, {
          userId: user.uid,
          title: title.trim() || "Untitled note",
          content,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        setSelectedNoteId(docRef.id);
      }
    } catch (e) {
      console.error("Error saving note", e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, "notes", id));
      if (selectedNoteId === id) {
        resetEditor();
      }
    } catch (e) {
      console.error("Error deleting note", e);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <Header />
      <main className="flex-1 pt-20 pb-10 container mx-auto px-4 md:px-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900">
              Notes workspace
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Capture your thoughts here, and soon sync them with Notion.
            </p>
          </div>
          <div className="inline-flex items-center rounded-full bg-slate-100 p-1 text-xs font-medium">
            <button
              type="button"
              onClick={() => setActiveTab("local")}
              className={`px-3 py-1.5 rounded-full transition ${
                activeTab === "local"
                  ? "bg-white shadow text-slate-900"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              My Notes
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("notion")}
              className={`px-3 py-1.5 rounded-full transition ${
                activeTab === "notion"
                  ? "bg-white shadow text-slate-900"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Notion
            </button>
          </div>
        </div>

        {activeTab === "local" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="md:col-span-1 h-[70vh] flex flex-col">
              <CardTitle className="flex items-center justify-between">
                <span>Your notes</span>
                <Button size="sm" onClick={handleNewNote}>
                  New note
                </Button>
              </CardTitle>
              <CardContent className="flex-1 overflow-y-auto pr-1 space-y-2 text-sm">
                {notes.length === 0 && (
                  <p className="text-gray-500 text-sm">
                    No notes yet. Create your first note.
                  </p>
                )}
                {notes.map((note) => (
                  <button
                    key={note.id}
                    onClick={() => handleSelectNote(note)}
                    className={`w-full text-left px-3 py-2 rounded-md border text-sm mb-1 flex items-center justify-between ${
                      selectedNoteId === note.id
                        ? "bg-blue-50 border-blue-300"
                        : "bg-white border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex-1 mr-2">
                      <div className="font-medium text-gray-900 line-clamp-1">
                        {note.title || "Untitled note"}
                      </div>
                      <div className="text-xs text-gray-500 line-clamp-1">
                        {note.content || "Empty note"}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(note.id);
                      }}
                      className="text-xs text-red-500 hover:text-red-600"
                    >
                      Delete
                    </button>
                  </button>
                ))}
              </CardContent>
            </Card>

            <Card className="md:col-span-2 h-[70vh] flex flex-col">
              <CardTitle>Editor</CardTitle>
              <CardContent className="flex-1 flex flex-col gap-4">
                <Input
                  placeholder="Title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
                <Textarea
                  rows={12}
                  placeholder="Write your notes here..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="resize-none h-full"
                />
                <div className="mt-2 flex justify-end gap-2">
                  <Button
                    onClick={handleSave}
                    disabled={isSaving || (!title.trim() && !content.trim())}
                    className="px-6"
                  >
                    {isSaving ? "Saving..." : "Save note"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "notion" && (
          <Card>
            <CardTitle>Notion workspace</CardTitle>
            <CardContent className="space-y-4">
              {notionMessage === "connected" && (
                <p className="text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg">
                  Notion connected. Your pages are listed below.
                </p>
              )}
              {notionMessage === "denied" && (
                <p className="text-sm text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
                  You denied access. You can connect again anytime.
                </p>
              )}
              {notionMessage === "error" && (
                <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                  Something went wrong. Please try connecting again.
                </p>
              )}
              {notionError && (
                <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                  {notionError}
                </p>
              )}

              {notionConnected === null && !notionLoading && (
                <p className="text-sm text-gray-500">Checking connection…</p>
              )}
              {notionConnected === false && (
                <div className="flex flex-col gap-3">
                  <p className="text-sm text-gray-600">
                    Connect your Notion account to see your pages and databases here.
                  </p>
                  <Button
                    onClick={handleConnectNotion}
                    disabled={notionLoading}
                    className="w-fit"
                  >
                    {notionLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Connect Notion
                  </Button>
                </div>
              )}
              {notionConnected === true && (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600">
                    Pages and databases shared with the integration (open in Notion):
                  </p>
                  {notionLoading ? (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading…
                    </div>
                  ) : notionPages.length === 0 ? (
                    <p className="text-sm text-gray-500">
                      No pages found. Share pages with your integration in Notion.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {notionPages.map((page) => (
                        <li key={page.id}>
                          <a
                            href={page.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-900"
                          >
                            <span className="flex-1 font-medium truncate">
                              {page.title}
                            </span>
                            <span className="text-xs text-gray-400 uppercase">
                              {page.object}
                            </span>
                            <ExternalLink className="h-4 w-4 text-gray-400 shrink-0" />
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </main>
      <Footer />
    </div>
  );
}

