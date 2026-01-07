# Activity Progress Tracker Setup Guide

## Files Created

1. **`src/components/ActivityProgressTracker.tsx`** - Component that tracks and displays activity metrics for mentees and mentors
2. **`src/pages/ProgressTrackerPage.tsx`** - Page component that uses the ActivityProgressTracker component

## Features

### Personal Progress View
- **User Profile Card**: Shows user avatar, name, role, and overall activity score
- **Activity Metrics**:
  - Sessions Attended: Number of sessions attended vs total sessions booked
  - Messages Sent: Total messages sent in chat conversations
  - Forum Posts: Number of posts in discussion forums
  - Video Calls: Number of video calls joined
  - Activity Score: Weighted overall engagement score
  - Attendance Rate: Percentage of sessions attended
- **Progress Visualization**: Progress bars showing attendance and communication activity

### All Users View
- **Activity Ranking**: Shows top 20 users ranked by activity score
- **User Cards**: Display user info, role, and key metrics
- **Top 3 Highlighting**: Special styling for top 3 most active users

## Activity Score Calculation

The activity score is calculated using weighted points:
- **Sessions Attended**: 10 points each
- **Messages Sent**: 2 points each
- **Forum Posts**: 5 points each
- **Video Calls Joined**: 8 points each
- **Attendance Rate**: 0.5 points per percentage point

## Data Sources

The progress tracker pulls data from:
- `videoRooms` collection: Tracks video call attendance
- `bookings` collection: Tracks total sessions
- `chats/{chatId}/messages` collection: Counts messages sent
- `forumMessages/{topicId}/messages` collection: Counts forum posts
- `users` collection: Fetches user profile information

## Access

The progress tracker is accessible at:
- **URL**: `/progress`
- **Navigation**: "Progress" link in the header menu

## Route Configuration

The route has been automatically added to `App.tsx`:
```typescript
<Route path="/progress" element={<PrivateRoute><ProgressTrackerPage /></PrivateRoute>} />
```

## Navigation

A "Progress" link has been added to the Header navigation menu, accessible to all logged-in users.

## Notes

- The tracker updates in real-time as users interact with the platform
- Activity scores are calculated dynamically based on current data
- Both mentees and mentors can view their own progress and compare with others
- The "All Users" view shows a ranked list of the most active users


