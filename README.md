# MentorConnect

MentorConnect is a free, AI-driven online mentoring platform designed to connect mentees with experienced mentors seamlessly. It integrates automated scheduling, built-in video conferencing, real-time chat, and community discussion forums into a single platform to provide a structured and accessible mentoring experience.

## Table of Contents
- [Project Overview](#project-overview)
- [Problem Statement](#problem-statement)
- [Features](#features)
- [Technical Design](#technical-design)
- [Impact](#impact)
- [Installation](#installation)

## Project Overview
**Project Name**: MentorConnect  
**Theme**: Education  
**Team Name**: MentorSync  
**Event**: ORCHATHON 2K25, organized by N.K. Orchid College of Engineering and Technology, Solapur  

MentorConnect aims to eliminate the limitations of existing mentoring platforms by providing a free, all-in-one solution for career guidance, skill development, and professional networking.

## Problem Statement
Many existing mentoring platforms suffer from:
- High costs (e.g., Clarity.fm, MentorCruise, Unstop)
- Lack of integrated scheduling and communication tools (e.g., LinkedIn Mentorship, ADPList)
- Dependency on third-party tools like Calendly and Zoom, causing inefficiencies

MentorConnect addresses these issues by offering a free platform with automated scheduling, built-in video calls, real-time chat, and secure authentication, ensuring a seamless mentoring experience.

## Features
### Notes Integration
- **Custom Notes**: Create, edit, and manage personal notes with tags and privacy settings
- **Notion Integration**: Connect your Notion workspace to view and access pages and databases
- **Real-time Sync**: All notes are synchronized in real-time using Firebase Firestore
- **Secure Storage**: User data is protected with Firebase authentication and proper access controls

### Mentee-Side Features
- **Dynamic Scheduling**: Book mentorship sessions using Google Calendar integration.
- **Video Conferencing**: Attend secure, built-in video sessions powered by Jitsi Meet.
- **Real-Time Chat**: Communicate with mentors via Firebase-powered chat.
- **Discussion Forum**: Engage with peers and mentors to clear doubts.
- **Filtered FAQs**: Access topic-specific answers to common career queries.

### Mentor-Side Features
- **Profile Creation**: Showcase expertise, experience, and availability.
- **Flexible Scheduling**: Set time slots for mentoring sessions.
- **1:1 Video Sessions**: Conduct personalized mentoring sessions.
- **Real-Time Support**: Answer mentees' queries via chat.
- **Webinars & Group Sessions**: Host career-related group mentoring.
- **Forum Participation**: Share insights and answer questions in the discussion forum.

## Technical Design
### Tech Stack
- **Frontend**: React.js
- **Backend**: Node.js + Express.js
- **Database & Authentication**: Firebase
- **Scheduling**: Google Calendar API
- **Video Conferencing**: Jitsi Meet
- **Real-Time Chat**: Firebase

### Development Process
1. **Requirement Analysis**: Define features like mentor-mentee matching, scheduling, and communication.
2. **System Design**: Architect the platform with scalable frontend and backend components.
3. **Development**: Build UI, APIs, and integrate scheduling, chat, and video features.
4. **Testing & Deployment**: Test functionality, optimize performance, and deploy on Firebase.

## Impact
- **Accessibility**: Free platform with no third-party dependencies.
- **Efficiency**: Automated scheduling reduces delays and miscommunication.
- **Career Growth**: Direct guidance from experts enhances skill development and job readiness.
- **Inclusivity**: Open to students and professionals from diverse backgrounds.
- **Versatility**: Applicable for career guidance, higher education, skill development, and corporate training.

## Installation
1. Clone the repository:
```bash
git clone https://github.com/MentorSync/MentorConnect.git
```
2. Install dependencies:
```bash
npm install
```
3. Set up environment variables:
   - Copy `env.example` to `.env` for frontend configuration
   - Copy `server/env.example` to `server/.env` for backend configuration
   - Configure Firebase service account credentials
   - Set up Notion integration credentials (optional)
4. Start the development server:
```bash
# Run both frontend and backend
npm run dev:full

# Or run individually
npm run dev      # Frontend only
npm run server   # Backend only
```

### Notes Integration Setup
For detailed setup instructions for the Notes Integration feature, see [NOTES_INTEGRATION_README.md](NOTES_INTEGRATION_README.md).

