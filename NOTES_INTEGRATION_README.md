# Notes Integration Feature - Mentor Connect

This document provides comprehensive setup and usage instructions for the Notes Integration feature in Mentor Connect, which allows users to either connect their Notion workspace or create and manage custom notes using Firebase.

## 🚀 Features

### Custom Notes
- Create, read, update, and delete personal notes
- Rich text editing with tags and privacy settings
- Real-time synchronization with Firebase Firestore
- Search and filter capabilities

### Notion Integration
- OAuth 2.0 authentication with Notion
- View and browse Notion pages and databases
- Access Notion content without leaving Mentor Connect
- Secure token storage in Firebase

## 📁 Project Structure

```
MentorConnect/
├── server/                          # Backend Express.js server
│   ├── index.js                     # Main server file
│   ├── config/
│   │   └── firebase.js              # Firebase Admin SDK configuration
│   ├── services/
│   │   ├── notesService.js          # Firebase Firestore operations for notes
│   │   └── notionService.js         # Notion API integration service
│   ├── routes/
│   │   ├── notes.js                 # Notes API endpoints
│   │   └── notion.js                # Notion API endpoints
│   └── env.example                  # Environment variables template
├── src/
│   ├── pages/
│   │   └── NotesPage.tsx            # Main Notes page component
│   ├── components/notes/
│   │   ├── NotesList.tsx            # Notes list component
│   │   ├── NoteEditor.tsx           # Note creation/editing component
│   │   ├── NotionIntegration.tsx    # Notion connection component
│   │   └── NotionContent.tsx        # Notion content viewer
│   └── services/
│       └── notesApi.ts              # Frontend API service
└── env.example                      # Frontend environment variables
```

## 🛠️ Setup Instructions

### 1. Backend Setup

#### Install Dependencies
```bash
npm install @notionhq/client express cors dotenv firebase-admin
npm install --save-dev @types/express @types/cors
```

#### Environment Configuration
1. Copy `server/env.example` to `server/.env`
2. Configure the following variables:

```env
# Server Configuration
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# Firebase Configuration (Service Account)
FIREBASE_PROJECT_ID=mentorconnect-fd483
FIREBASE_PRIVATE_KEY_ID=your_private_key_id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@mentorconnect-fd483.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=your_client_id
FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token
FIREBASE_AUTH_PROVIDER_X509_CERT_URL=https://www.googleapis.com/oauth2/v1/certs
FIREBASE_CLIENT_X509_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xxxxx%40mentorconnect-fd483.iam.gserviceaccount.com

# Notion Configuration
NOTION_CLIENT_ID=your_notion_client_id
NOTION_CLIENT_SECRET=your_notion_client_secret
NOTION_REDIRECT_URI=http://localhost:5173/notes?notion_auth=true
```

#### Firebase Service Account Setup
1. Go to Firebase Console → Project Settings → Service Accounts
2. Generate a new private key
3. Download the JSON file and extract the required values

#### Notion Integration Setup
1. Go to [Notion Developers](https://www.notion.so/my-integrations)
2. Create a new integration
3. Note down the Client ID and Client Secret
4. Set the redirect URI to: `http://localhost:5173/notes?notion_auth=true`

### 2. Frontend Setup

#### Environment Configuration
1. Copy `env.example` to `.env`
2. Configure the following variables:

```env
VITE_API_URL=http://localhost:5000/api
```

### 3. Running the Application

#### Development Mode (Both Frontend and Backend)
```bash
npm run dev:full
```

#### Individual Services
```bash
# Frontend only
npm run dev

# Backend only
npm run server
```

## 🔧 API Endpoints

### Notes API (`/api/notes`)

| Method | Endpoint | Description | Authentication |
|--------|----------|-------------|----------------|
| GET | `/api/notes` | Get all notes for user | Required |
| GET | `/api/notes/:id` | Get specific note | Required |
| POST | `/api/notes` | Create new note | Required |
| PUT | `/api/notes/:id` | Update note | Required |
| DELETE | `/api/notes/:id` | Delete note | Required |

### Notion API (`/api/notion`)

| Method | Endpoint | Description | Authentication |
|--------|----------|-------------|----------------|
| GET | `/api/notion/auth-url` | Get Notion OAuth URL | Required |
| POST | `/api/notion/connect` | Connect Notion workspace | Required |
| GET | `/api/notion/status` | Check connection status | Required |
| GET | `/api/notion/pages` | Get Notion pages | Required |
| GET | `/api/notion/databases` | Get Notion databases | Required |
| GET | `/api/notion/pages/:id` | Get page content | Required |
| GET | `/api/notion/databases/:id/entries` | Get database entries | Required |
| DELETE | `/api/notion/disconnect` | Disconnect Notion | Required |

## 📱 Usage Guide

### Custom Notes

1. **Creating a Note**
   - Click "New Note" button
   - Enter title and content
   - Add tags (optional)
   - Set privacy (private/public)
   - Click "Save"

2. **Editing a Note**
   - Click on a note in the list
   - Click the edit button
   - Make changes
   - Click "Save"

3. **Deleting a Note**
   - Click the delete button on a note
   - Confirm deletion

### Notion Integration

1. **Connecting Notion**
   - Go to the "Notion Integration" tab
   - Click "Connect Notion"
   - Authorize the application in Notion
   - You'll be redirected back to Mentor Connect

2. **Viewing Notion Content**
   - After connecting, click "Refresh Content"
   - Browse your pages and databases
   - Click on any item to view its content
   - Use "Open in Notion" to edit in Notion

3. **Disconnecting Notion**
   - Click "Disconnect Notion" button
   - Confirm disconnection

## 🔒 Security Features

- **Firebase Authentication**: All API endpoints require valid Firebase ID tokens
- **User Isolation**: Users can only access their own notes and Notion content
- **Token Security**: Notion tokens are encrypted and stored securely in Firebase
- **CORS Protection**: Backend configured with proper CORS settings
- **Input Validation**: All inputs are validated and sanitized

## 🐛 Troubleshooting

### Common Issues

1. **"Failed to fetch notes" Error**
   - Check if backend server is running
   - Verify Firebase configuration
   - Check browser console for detailed errors

2. **Notion Connection Issues**
   - Verify Notion Client ID and Secret
   - Check redirect URI configuration
   - Ensure Notion integration has proper permissions

3. **Firebase Authentication Errors**
   - Verify Firebase service account configuration
   - Check if user is properly authenticated
   - Ensure Firebase project ID matches

### Debug Mode

Enable debug logging by setting:
```env
NODE_ENV=development
```

## 🚀 Deployment

### Backend Deployment
1. Set up environment variables on your hosting platform
2. Deploy the `server/` directory
3. Ensure Firebase service account is configured
4. Update CORS settings for production domain

### Frontend Deployment
1. Update `VITE_API_URL` to production backend URL
2. Build the application: `npm run build`
3. Deploy the `dist/` directory

## 📝 Development Notes

- The backend uses Express.js with Firebase Admin SDK
- Frontend uses React with TypeScript and Tailwind CSS
- All API calls include proper error handling
- Components are modular and reusable
- State management is handled with React hooks

## 🤝 Contributing

When adding new features:
1. Follow the existing code structure
2. Add proper TypeScript types
3. Include error handling
4. Update documentation
5. Test with both custom notes and Notion integration

## 📄 License

This feature is part of the Mentor Connect application and follows the same licensing terms.
