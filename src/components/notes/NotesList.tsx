import React from 'react';
import { Edit2, Trash2, Calendar, Tag } from 'lucide-react';
import { format } from 'date-fns';

interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

interface NotesListProps {
  notes: Note[];
  selectedNote: Note | null;
  onNoteSelect: (note: Note) => void;
  onEditNote: (note: Note) => void;
  onDeleteNote: (noteId: string) => void;
  loading: boolean;
}

export const NotesList: React.FC<NotesListProps> = ({
  notes,
  selectedNote,
  onNoteSelect,
  onEditNote,
  onDeleteNote,
  loading
}) => {
  const handleDelete = (e: React.MouseEvent, noteId: string) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this note?')) {
      onDeleteNote(noteId);
    }
  };

  if (loading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (notes.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        <p>No notes yet. Create your first note!</p>
      </div>
    );
  }

  return (
    <div className="max-h-96 overflow-y-auto">
      {notes.map((note) => (
        <div
          key={note.id}
          onClick={() => onNoteSelect(note)}
          className={`p-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors ${
            selectedNote?.id === note.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-gray-900 truncate">
                {note.title || 'Untitled'}
              </h3>
              <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                {note.content.replace(/<[^>]*>/g, '').substring(0, 100)}
                {note.content.length > 100 && '...'}
              </p>
              
              {/* Tags */}
              {note.tags && note.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {note.tags.slice(0, 3).map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                    >
                      <Tag className="w-3 h-3 mr-1" />
                      {tag}
                    </span>
                  ))}
                  {note.tags.length > 3 && (
                    <span className="text-xs text-gray-500">
                      +{note.tags.length - 3} more
                    </span>
                  )}
                </div>
              )}
              
              {/* Metadata */}
              <div className="flex items-center text-xs text-gray-400 mt-2">
                <Calendar className="w-3 h-3 mr-1" />
                <span>
                  {format(new Date(note.updatedAt), 'MMM d, yyyy')}
                </span>
                {note.isPublic && (
                  <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-800 rounded-full">
                    Public
                  </span>
                )}
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex items-center space-x-1 ml-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEditNote(note);
                }}
                className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                title="Edit note"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => handleDelete(e, note.id)}
                className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                title="Delete note"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
