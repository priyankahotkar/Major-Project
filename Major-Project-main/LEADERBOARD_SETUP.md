# Attendance Leaderboard Setup Guide

## Files Created

1. **`src/components/AttendanceLeaderboard.tsx`** - Component that displays leaderboards for mentees and mentors based on attendance
2. **`src/pages/LeaderboardPage.tsx`** - Page component that uses the AttendanceLeaderboard component

## How to Add the Route

To make the leaderboard accessible, you need to add a route in `src/App.tsx`:

1. Import the LeaderboardPage:
```typescript
import { LeaderboardPage } from "./pages/LeaderboardPage";
```

2. Add the route inside the `<Routes>` component:
```typescript
<Route path="/leaderboard" element={<PrivateRoute><LeaderboardPage /></PrivateRoute>} />
```

## Optional: Add Navigation Link

You can add a link to the leaderboard in the Header component (`src/components/layout/Header.tsx`):

```typescript
<Link 
  to="/leaderboard" 
  className="text-gray-600 hover:text-blue-600 transition-colors"
>
  Leaderboard
</Link>
```

## Features

- **Mentee Leaderboard**: Shows top 10 mentees ranked by attendance rate
- **Mentor Leaderboard**: Shows top 10 mentors ranked by attendance rate
- **Attendance Metrics**: Displays attended sessions, total sessions, and attendance percentage
- **Visual Rankings**: Top 3 positions get special icons (Trophy, Medal, Award)
- **Real-time Data**: Fetches data from Firestore `videoRooms` and `bookings` collections

## Data Sources

The leaderboard tracks attendance from:
- `videoRooms` collection: Uses `attended` field and `status` field
- `bookings` collection: Tracks total sessions for mentees and mentors

## Notes

- The leaderboard shows users with at least one session
- Rankings are based on attendance rate (percentage), then by number of attended sessions
- User data is fetched from the `users` collection in Firestore


