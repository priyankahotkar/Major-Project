const { getFirestore } = require('../config/firebase');

class NotesService {
  constructor() {
    this.db = getFirestore();
  }

  // Create a new note
  async createNote(userId, noteData) {
    try {
      const note = {
        ...noteData,
        userId,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const docRef = await this.db.collection('notes').add(note);
      
      return {
        id: docRef.id,
        ...note
      };
    } catch (error) {
      console.error('Error creating note:', error);
      throw new Error('Failed to create note');
    }
  }

  // Get all notes for a user
  async getUserNotes(userId) {
    try {
      const snapshot = await this.db
        .collection('notes')
        .where('userId', '==', userId)
        .orderBy('updatedAt', 'desc')
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error fetching user notes:', error);
      throw new Error('Failed to fetch notes');
    }
  }

  // Get a specific note by ID
  async getNoteById(noteId, userId) {
    try {
      const doc = await this.db.collection('notes').doc(noteId).get();
      
      if (!doc.exists) {
        throw new Error('Note not found');
      }

      const noteData = doc.data();
      
      if (noteData.userId !== userId) {
        throw new Error('Unauthorized access to note');
      }

      return {
        id: doc.id,
        ...noteData
      };
    } catch (error) {
      console.error('Error fetching note:', error);
      throw new Error('Failed to fetch note');
    }
  }

  // Update a note
  async updateNote(noteId, userId, updateData) {
    try {
      const noteRef = this.db.collection('notes').doc(noteId);
      const doc = await noteRef.get();

      if (!doc.exists) {
        throw new Error('Note not found');
      }

      const noteData = doc.data();
      
      if (noteData.userId !== userId) {
        throw new Error('Unauthorized access to note');
      }

      const updatedData = {
        ...updateData,
        updatedAt: new Date()
      };

      await noteRef.update(updatedData);

      return {
        id: noteId,
        ...noteData,
        ...updatedData
      };
    } catch (error) {
      console.error('Error updating note:', error);
      throw new Error('Failed to update note');
    }
  }

  // Delete a note
  async deleteNote(noteId, userId) {
    try {
      const noteRef = this.db.collection('notes').doc(noteId);
      const doc = await noteRef.get();

      if (!doc.exists) {
        throw new Error('Note not found');
      }

      const noteData = doc.data();
      
      if (noteData.userId !== userId) {
        throw new Error('Unauthorized access to note');
      }

      await noteRef.delete();
      return { success: true };
    } catch (error) {
      console.error('Error deleting note:', error);
      throw new Error('Failed to delete note');
    }
  }

  // Store Notion access token for user
  async storeNotionToken(userId, tokenData) {
    try {
      const userRef = this.db.collection('users').doc(userId);
      
      await userRef.update({
        notionToken: tokenData.access_token,
        notionTokenExpiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
        notionWorkspaceId: tokenData.workspace_id,
        notionWorkspaceName: tokenData.workspace_name,
        updatedAt: new Date()
      });

      return { success: true };
    } catch (error) {
      console.error('Error storing Notion token:', error);
      throw new Error('Failed to store Notion token');
    }
  }

  // Get Notion token for user
  async getNotionToken(userId) {
    try {
      const userDoc = await this.db.collection('users').doc(userId).get();
      
      if (!userDoc.exists) {
        throw new Error('User not found');
      }

      const userData = userDoc.data();
      
      if (!userData.notionToken) {
        return null;
      }

      // Check if token is expired
      if (userData.notionTokenExpiresAt && new Date() > userData.notionTokenExpiresAt.toDate()) {
        // Token expired, remove it
        await this.db.collection('users').doc(userId).update({
          notionToken: null,
          notionTokenExpiresAt: null,
          updatedAt: new Date()
        });
        return null;
      }

      return {
        access_token: userData.notionToken,
        workspace_id: userData.notionWorkspaceId,
        workspace_name: userData.notionWorkspaceName
      };
    } catch (error) {
      console.error('Error fetching Notion token:', error);
      throw new Error('Failed to fetch Notion token');
    }
  }

  // Remove Notion token for user
  async removeNotionToken(userId) {
    try {
      const userRef = this.db.collection('users').doc(userId);
      
      await userRef.update({
        notionToken: null,
        notionTokenExpiresAt: null,
        notionWorkspaceId: null,
        notionWorkspaceName: null,
        updatedAt: new Date()
      });

      return { success: true };
    } catch (error) {
      console.error('Error removing Notion token:', error);
      throw new Error('Failed to remove Notion token');
    }
  }
}

module.exports = new NotesService();
