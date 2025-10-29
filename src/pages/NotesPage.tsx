import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { notesApi, notionApi } from '../services/notesApi';
import { NotesList } from '../components/notes/NotesList';
import { NoteEditor } from '../components/notes/NoteEditor';
import { NotionIntegration } from '../components/notes/NotionIntegration';
import { NotionContent } from '../components/notes/NotionContent';
import { Plus, FileText, ExternalLink, Settings } from 'lucide-react';

interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

interface NotionPage {
  id: string;
  title: string;
  url: string;
  created_time: string;
  last_edited_time: string;
}

interface NotionDatabase {
  id: string;
  title: string;
  url: string;
  created_time: string;
  last_edited_time: string;
}

export const NotesPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'notes' | 'notion'>('notes');
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Notion state
  const [notionConnected, setNotionConnected] = useState(false);
  const [notionPages, setNotionPages] = useState<NotionPage[]>([]);
  const [notionDatabases, setNotionDatabases] = useState<NotionDatabase[]>([]);
  const [selectedNotionContent, setSelectedNotionContent] = useState<any>(null);
  const [notionLoading, setNotionLoading] = useState(false);

  // Load notes on component mount
  useEffect(() => {
    if (user) {
      loadNotes();
      checkNotionStatus();
    }
  }, [user]);

  const loadNotes = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await notesApi.getNotes();
      setNotes(response.data);
    } catch (err) {
      setError('Failed to load notes');
      console.error('Error loading notes:', err);
    } finally {
      setLoading(false);
    }
  };

  const checkNotionStatus = async () => {
    try {
      const response = await notionApi.getStatus();
      setNotionConnected(response.connected);
    } catch (err) {
      console.error('Error checking Notion status:', err);
    }
  };

  const handleCreateNote = () => {
    setSelectedNote(null);
    setIsCreating(true);
    setIsEditing(true);
  };

  const handleEditNote = (note: Note) => {
    setSelectedNote(note);
    setIsCreating(false);
    setIsEditing(true);
  };

  const handleSaveNote = async (noteData: Partial<Note>) => {
    try {
      setLoading(true);
      setError(null);

      if (isCreating) {
        const response = await notesApi.createNote({
          title: noteData.title || '',
          content: noteData.content || '',
          tags: noteData.tags || [],
          isPublic: noteData.isPublic || false
        });
        setNotes(prev => [response.data, ...prev]);
      } else if (selectedNote) {
        const response = await notesApi.updateNote(selectedNote.id, noteData);
        setNotes(prev => prev.map(note => 
          note.id === selectedNote.id ? response.data : note
        ));
      }

      setIsEditing(false);
      setIsCreating(false);
      setSelectedNote(null);
    } catch (err) {
      setError('Failed to save note');
      console.error('Error saving note:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      setLoading(true);
      setError(null);
      await notesApi.deleteNote(noteId);
      setNotes(prev => prev.filter(note => note.id !== noteId));
      
      if (selectedNote?.id === noteId) {
        setSelectedNote(null);
        setIsEditing(false);
      }
    } catch (err) {
      setError('Failed to delete note');
      console.error('Error deleting note:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleNotionConnect = async () => {
    try {
      const response = await notionApi.getAuthUrl();
      window.location.href = response.authUrl;
    } catch (err) {
      setError('Failed to initiate Notion connection');
      console.error('Error connecting to Notion:', err);
    }
  };

  const handleNotionDisconnect = async () => {
    try {
      setNotionLoading(true);
      await notionApi.disconnect();
      setNotionConnected(false);
      setNotionPages([]);
      setNotionDatabases([]);
      setSelectedNotionContent(null);
    } catch (err) {
      setError('Failed to disconnect Notion');
      console.error('Error disconnecting Notion:', err);
    } finally {
      setNotionLoading(false);
    }
  };

  const loadNotionContent = async () => {
    try {
      setNotionLoading(true);
      const [pagesResponse, databasesResponse] = await Promise.all([
        notionApi.getPages(),
        notionApi.getDatabases()
      ]);
      setNotionPages(pagesResponse.data);
      setNotionDatabases(databasesResponse.data);
    } catch (err) {
      setError('Failed to load Notion content');
      console.error('Error loading Notion content:', err);
    } finally {
      setNotionLoading(false);
    }
  };

  const handleNotionPageSelect = async (pageId: string) => {
    try {
      setNotionLoading(true);
      const response = await notionApi.getPageContent(pageId);
      setSelectedNotionContent(response.data);
    } catch (err) {
      setError('Failed to load Notion page content');
      console.error('Error loading Notion page content:', err);
    } finally {
      setNotionLoading(false);
    }
  };

  const handleNotionDatabaseSelect = async (databaseId: string) => {
    try {
      setNotionLoading(true);
      const response = await notionApi.getDatabaseEntries(databaseId);
      setSelectedNotionContent({
        type: 'database',
        entries: response.data,
        databaseId
      });
    } catch (err) {
      setError('Failed to load Notion database entries');
      console.error('Error loading Notion database entries:', err);
    } finally {
      setNotionLoading(false);
    }
  };

  // Handle Notion OAuth callback
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const notionAuth = urlParams.get('notion_auth');

    if (code && notionAuth) {
      const connectNotion = async () => {
        try {
          setNotionLoading(true);
          await notionApi.connect(code);
          setNotionConnected(true);
          await loadNotionContent();
          
          // Clean up URL
          window.history.replaceState({}, document.title, window.location.pathname);
        } catch (err) {
          setError('Failed to connect Notion workspace');
          console.error('Error connecting Notion:', err);
        } finally {
          setNotionLoading(false);
        }
      };

      connectNotion();
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Notes</h1>
          <p className="text-gray-600">
            Create and manage your notes, or connect your Notion workspace
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">{error}</div>
              </div>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('notes')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'notes'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <FileText className="inline-block w-4 h-4 mr-2" />
                My Notes
              </button>
              <button
                onClick={() => setActiveTab('notion')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'notion'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <ExternalLink className="inline-block w-4 h-4 mr-2" />
                Notion Integration
              </button>
            </nav>
          </div>
        </div>

        {/* Content */}
        {activeTab === 'notes' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Notes List */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-medium text-gray-900">My Notes</h2>
                    <button
                      onClick={handleCreateNote}
                      className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      New Note
                    </button>
                  </div>
                </div>
                
                <NotesList
                  notes={notes}
                  selectedNote={selectedNote}
                  onNoteSelect={setSelectedNote}
                  onEditNote={handleEditNote}
                  onDeleteNote={handleDeleteNote}
                  loading={loading}
                />
              </div>
            </div>

            {/* Note Editor */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-full">
                <NoteEditor
                  note={selectedNote}
                  isEditing={isEditing}
                  isCreating={isCreating}
                  onSave={handleSaveNote}
                  onCancel={() => {
                    setIsEditing(false);
                    setIsCreating(false);
                    setSelectedNote(null);
                  }}
                  loading={loading}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Notion Integration */}
            <div className="lg:col-span-1">
              <NotionIntegration
                connected={notionConnected}
                onConnect={handleNotionConnect}
                onDisconnect={handleNotionDisconnect}
                onLoadContent={loadNotionContent}
                loading={notionLoading}
              />
            </div>

            {/* Notion Content */}
            <div className="lg:col-span-2">
              <NotionContent
                pages={notionPages}
                databases={notionDatabases}
                selectedContent={selectedNotionContent}
                onPageSelect={handleNotionPageSelect}
                onDatabaseSelect={handleNotionDatabaseSelect}
                loading={notionLoading}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
