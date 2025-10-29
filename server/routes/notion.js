const express = require('express');
const { verifyIdToken } = require('../config/firebase');
const notesService = require('../services/notesService');
const notionService = require('../services/notionService');

const router = express.Router();

// Middleware to verify Firebase ID token
const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No valid authorization header found' });
    }

    const idToken = authHeader.split('Bearer ')[1];
    const decodedToken = await verifyIdToken(idToken);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({ error: 'Invalid authentication token' });
  }
};

// Apply authentication middleware to all routes
router.use(authenticateUser);

// GET /api/notion/auth-url - Get Notion OAuth URL
router.get('/auth-url', (req, res) => {
  try {
    const authUrl = `https://api.notion.com/v1/oauth/authorize?` +
      `client_id=${process.env.NOTION_CLIENT_ID}&` +
      `response_type=code&` +
      `owner=user&` +
      `redirect_uri=${encodeURIComponent(process.env.NOTION_REDIRECT_URI)}`;
    
    res.json({ success: true, authUrl });
  } catch (error) {
    console.error('Error generating auth URL:', error);
    res.status(500).json({ error: 'Failed to generate Notion auth URL' });
  }
});

// POST /api/notion/connect - Connect Notion workspace
router.post('/connect', async (req, res) => {
  try {
    const { code } = req.body;
    const userId = req.user.uid;

    if (!code) {
      return res.status(400).json({ error: 'Authorization code is required' });
    }

    // Exchange code for access token
    const tokenData = await notionService.exchangeCodeForToken(code);
    
    // Store token in Firebase
    await notesService.storeNotionToken(userId, tokenData);

    res.json({ 
      success: true, 
      message: 'Notion workspace connected successfully',
      workspace: {
        id: tokenData.workspace_id,
        name: tokenData.workspace_name
      }
    });
  } catch (error) {
    console.error('Error connecting Notion:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/notion/status - Check Notion connection status
router.get('/status', async (req, res) => {
  try {
    const userId = req.user.uid;
    const tokenData = await notesService.getNotionToken(userId);

    if (!tokenData) {
      return res.json({ 
        success: true, 
        connected: false,
        message: 'Notion not connected'
      });
    }

    res.json({ 
      success: true, 
      connected: true,
      workspace: {
        id: tokenData.workspace_id,
        name: tokenData.workspace_name
      }
    });
  } catch (error) {
    console.error('Error checking Notion status:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/notion/pages - Get Notion pages
router.get('/pages', async (req, res) => {
  try {
    const userId = req.user.uid;
    const tokenData = await notesService.getNotionToken(userId);

    if (!tokenData) {
      return res.status(400).json({ error: 'Notion not connected' });
    }

    const pages = await notionService.getPages(tokenData.access_token);
    res.json({ success: true, data: pages });
  } catch (error) {
    console.error('Error fetching Notion pages:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/notion/databases - Get Notion databases
router.get('/databases', async (req, res) => {
  try {
    const userId = req.user.uid;
    const tokenData = await notesService.getNotionToken(userId);

    if (!tokenData) {
      return res.status(400).json({ error: 'Notion not connected' });
    }

    const databases = await notionService.getDatabases(tokenData.access_token);
    res.json({ success: true, data: databases });
  } catch (error) {
    console.error('Error fetching Notion databases:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/notion/pages/:id - Get specific Notion page content
router.get('/pages/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.uid;
    const tokenData = await notesService.getNotionToken(userId);

    if (!tokenData) {
      return res.status(400).json({ error: 'Notion not connected' });
    }

    const pageContent = await notionService.getPageContent(tokenData.access_token, id);
    res.json({ success: true, data: pageContent });
  } catch (error) {
    console.error('Error fetching Notion page content:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/notion/databases/:id/entries - Get Notion database entries
router.get('/databases/:id/entries', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.uid;
    const tokenData = await notesService.getNotionToken(userId);

    if (!tokenData) {
      return res.status(400).json({ error: 'Notion not connected' });
    }

    const entries = await notionService.getDatabaseEntries(tokenData.access_token, id);
    res.json({ success: true, data: entries });
  } catch (error) {
    console.error('Error fetching Notion database entries:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/notion/disconnect - Disconnect Notion workspace
router.delete('/disconnect', async (req, res) => {
  try {
    const userId = req.user.uid;
    await notesService.removeNotionToken(userId);
    
    res.json({ 
      success: true, 
      message: 'Notion workspace disconnected successfully' 
    });
  } catch (error) {
    console.error('Error disconnecting Notion:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
