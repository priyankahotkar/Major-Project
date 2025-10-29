const { Client } = require('@notionhq/client');

class NotionService {
  constructor() {
    this.client = null;
  }

  // Initialize Notion client with user's access token
  initializeClient(accessToken) {
    this.client = new Client({
      auth: accessToken,
    });
  }

  // Get all pages from user's Notion workspace
  async getPages(accessToken) {
    try {
      this.initializeClient(accessToken);
      
      const response = await this.client.search({
        filter: {
          property: 'object',
          value: 'page'
        },
        page_size: 100
      });

      return response.results.map(page => ({
        id: page.id,
        title: this.extractTitle(page),
        url: page.url,
        created_time: page.created_time,
        last_edited_time: page.last_edited_time,
        properties: page.properties
      }));
    } catch (error) {
      console.error('Error fetching Notion pages:', error);
      throw new Error('Failed to fetch Notion pages');
    }
  }

  // Get all databases from user's Notion workspace
  async getDatabases(accessToken) {
    try {
      this.initializeClient(accessToken);
      
      const response = await this.client.search({
        filter: {
          property: 'object',
          value: 'database'
        },
        page_size: 100
      });

      return response.results.map(database => ({
        id: database.id,
        title: this.extractTitle(database),
        url: database.url,
        created_time: database.created_time,
        last_edited_time: database.last_edited_time,
        properties: database.properties
      }));
    } catch (error) {
      console.error('Error fetching Notion databases:', error);
      throw new Error('Failed to fetch Notion databases');
    }
  }

  // Get page content by ID
  async getPageContent(accessToken, pageId) {
    try {
      this.initializeClient(accessToken);
      
      const page = await this.client.pages.retrieve({ page_id: pageId });
      const blocks = await this.client.blocks.children.list({ block_id: pageId });
      
      return {
        page: {
          id: page.id,
          title: this.extractTitle(page),
          url: page.url,
          created_time: page.created_time,
          last_edited_time: page.last_edited_time,
          properties: page.properties
        },
        blocks: blocks.results
      };
    } catch (error) {
      console.error('Error fetching Notion page content:', error);
      throw new Error('Failed to fetch Notion page content');
    }
  }

  // Get database entries by ID
  async getDatabaseEntries(accessToken, databaseId) {
    try {
      this.initializeClient(accessToken);
      
      const response = await this.client.databases.query({
        database_id: databaseId,
        page_size: 100
      });

      return response.results.map(entry => ({
        id: entry.id,
        properties: entry.properties,
        created_time: entry.created_time,
        last_edited_time: entry.last_edited_time,
        url: entry.url
      }));
    } catch (error) {
      console.error('Error fetching Notion database entries:', error);
      throw new Error('Failed to fetch Notion database entries');
    }
  }

  // Extract title from Notion page/database
  extractTitle(item) {
    if (item.properties?.title?.title?.[0]?.plain_text) {
      return item.properties.title.title[0].plain_text;
    }
    if (item.properties?.Name?.title?.[0]?.plain_text) {
      return item.properties.Name.title[0].plain_text;
    }
    return 'Untitled';
  }

  // Exchange authorization code for access token
  async exchangeCodeForToken(code) {
    try {
      const response = await fetch('https://api.notion.com/v1/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${Buffer.from(
            `${process.env.NOTION_CLIENT_ID}:${process.env.NOTION_CLIENT_SECRET}`
          ).toString('base64')}`
        },
        body: JSON.stringify({
          grant_type: 'authorization_code',
          code: code,
          redirect_uri: process.env.NOTION_REDIRECT_URI
        })
      });

      if (!response.ok) {
        throw new Error('Failed to exchange code for token');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error exchanging code for token:', error);
      throw new Error('Failed to exchange authorization code for access token');
    }
  }
}

module.exports = new NotionService();
