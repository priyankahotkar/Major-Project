import { auth } from '../firebase';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Helper function to get auth headers
const getAuthHeaders = async () => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User not authenticated');
  }
  
  const token = await user.getIdToken();
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
};

// Notes API
export const notesApi = {
  // Get all notes for the current user
  async getNotes() {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/notes`, {
      method: 'GET',
      headers
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch notes');
    }
    
    return response.json();
  },

  // Get a specific note by ID
  async getNote(id: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/notes/${id}`, {
      method: 'GET',
      headers
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch note');
    }
    
    return response.json();
  },

  // Create a new note
  async createNote(noteData: {
    title: string;
    content: string;
    tags?: string[];
    isPublic?: boolean;
  }) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/notes`, {
      method: 'POST',
      headers,
      body: JSON.stringify(noteData)
    });
    
    if (!response.ok) {
      throw new Error('Failed to create note');
    }
    
    return response.json();
  },

  // Update a note
  async updateNote(id: string, updateData: {
    title?: string;
    content?: string;
    tags?: string[];
    isPublic?: boolean;
  }) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/notes/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(updateData)
    });
    
    if (!response.ok) {
      throw new Error('Failed to update note');
    }
    
    return response.json();
  },

  // Delete a note
  async deleteNote(id: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/notes/${id}`, {
      method: 'DELETE',
      headers
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete note');
    }
    
    return response.json();
  }
};

// Notion API
export const notionApi = {
  // Get Notion OAuth URL
  async getAuthUrl() {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/notion/auth-url`, {
      method: 'GET',
      headers
    });
    
    if (!response.ok) {
      throw new Error('Failed to get Notion auth URL');
    }
    
    return response.json();
  },

  // Connect Notion workspace
  async connect(code: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/notion/connect`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ code })
    });
    
    if (!response.ok) {
      throw new Error('Failed to connect Notion');
    }
    
    return response.json();
  },

  // Check Notion connection status
  async getStatus() {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/notion/status`, {
      method: 'GET',
      headers
    });
    
    if (!response.ok) {
      throw new Error('Failed to check Notion status');
    }
    
    return response.json();
  },

  // Get Notion pages
  async getPages() {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/notion/pages`, {
      method: 'GET',
      headers
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch Notion pages');
    }
    
    return response.json();
  },

  // Get Notion databases
  async getDatabases() {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/notion/databases`, {
      method: 'GET',
      headers
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch Notion databases');
    }
    
    return response.json();
  },

  // Get specific Notion page content
  async getPageContent(pageId: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/notion/pages/${pageId}`, {
      method: 'GET',
      headers
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch Notion page content');
    }
    
    return response.json();
  },

  // Get Notion database entries
  async getDatabaseEntries(databaseId: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/notion/databases/${databaseId}/entries`, {
      method: 'GET',
      headers
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch Notion database entries');
    }
    
    return response.json();
  },

  // Disconnect Notion workspace
  async disconnect() {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/notion/disconnect`, {
      method: 'DELETE',
      headers
    });
    
    if (!response.ok) {
      throw new Error('Failed to disconnect Notion');
    }
    
    return response.json();
  }
};
