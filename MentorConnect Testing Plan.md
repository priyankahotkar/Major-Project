## **MentorConnect Testing Plan**

---

### **1\. Objective**

The purpose of this testing plan is to ensure that MentorConnect — including the AI-driven personalized roadmap and Notion-like journal integration — operates correctly, securely, and efficiently across all modules. The goal is to validate both **functional** and **non-functional** requirements before deployment.

---

### **2\. Scope**

The testing will cover:

* **Core Platform Features**: User authentication, mentor/mentee matching, video conferencing, chat, forum, leaderboard, and calendar.

* **AI Components**: Personalized roadmap generation, real-time adaptation, mentor persona clustering, and AI-assisted journaling.

* **Integrations**: GitHub, LeetCode, Codeforces APIs, and Notion-like journal.

* **Security & Performance**: OAuth, data encryption, rate limiting, load handling.

---

### **3\. Testing Types & Strategy**

#### **A. Unit Testing**

Validates individual components and functions in isolation.

| Module | Test Cases | Expected Result |
| ----- | ----- | ----- |
| Authentication | Sign up, login, logout, password reset | Successful flow, secure token handling |
| API Integration | Fetch GitHub repos, LeetCode stats | Accurate, within API limits |
| Journal | Create, edit, delete entry | Changes reflect instantly |
| AI Engine | Generate roadmap from mock data | Logical, domain-relevant plan |
| Leaderboard | Update on new activity | Instant ranking update |

---

#### **B. Integration Testing**

Ensures modules work together without breaking the flow.

| Integration | Test Case | Expected Result |
| ----- | ----- | ----- |
| GitHub \+ AI Engine | User commits → Roadmap update | AI updates roadmap within seconds |
| Journal \+ AI Engine | Journal entry about learning → Adjust roadmap | AI adds/reorders tasks logically |
| Availability \+ Calendar | Mark unavailable → No bookings allowed | Sync with Jitsi calendar |
| Forum \+ Moderation AI | Toxic comment posted | Auto-flag or block |

---

#### **C. Functional Testing**

Validates that each feature performs its intended function in a realistic environment.

* **Mentor-Mentee Matching**:

  * Case: Similar domain preference → Correct pairing.

* **Event Scheduling**:

  * Case: Mentor available slot booked → Confirmation sent.

* **Roadmap Visualization**:

  * Case: Updated AI recommendations reflect instantly on UI.

---

#### **D. Performance Testing**

Measures scalability, response time, and resource usage.

| Test | Metric | Target |
| ----- | ----- | ----- |
| Load Test | Concurrent users | 500+ users without crash |
| AI Response Time | Roadmap update latency | \< 3 seconds |
| API Rate Handling | GitHub & LeetCode API | No 429 errors |
| DB Performance | Journal fetch speed | \< 200ms |

---

#### **E. Security Testing**

Ensures data integrity, privacy, and secure communication.

* **OAuth Token Safety**: Verify secure storage & expiry refresh.

* **SQL Injection & XSS**: Prevent unsafe inputs in journal, chat.

* **Role-Based Access**: Mentor cannot modify mentee private logs.

* **Data Encryption**: Journal & roadmap stored encrypted at rest.

---

#### **F. Usability Testing**

Checks if the system is intuitive and user-friendly.

* Conduct with 5–10 users (mentors, mentees, students).

* Track:

  * Time to complete a booking

  * Ease of understanding roadmap

  * Comfort in using journal

---

### **4\. Test Environment**

* **Frontend**: Deployed on staging Firebase Hosting

* **Backend**: Node.js server with staging DB

* **Test APIs**: Use sandbox tokens for GitHub/LeetCode

* **Test Users**:

  * 5 mentors, 10 mentees (dummy accounts)

  * 2 admin accounts

---

### **5\. Test Data**

* Mock GitHub activity logs

* Sample LeetCode & Codeforces user data

* Pre-written journal entries simulating different learning progress

* Toxic & non-toxic chat/forum posts

---

### **6\. Tools Used**

* **Testing Frameworks**: Jest (Unit), Cypress (UI/E2E), Postman (API)

* **Performance Tools**: Apache JMeter, k6

* **Security Scanners**: OWASP ZAP

* **Mock API Services**: Mockoon / JSON Server

---

### **7\. Acceptance Criteria**

* 100% pass rate on **critical features** (auth, AI roadmap, video calls, journal).

* ≥ 95% pass rate on non-critical enhancements (leaderboard, clustering).

* No unresolved **high severity** bugs.

* Performance benchmarks met.

---

### **8\. Reporting & Bug Tracking**

* Use **GitHub Issues** for tracking.

* Severity levels: Low, Medium, High, Critical.

* Daily progress updates during testing phase.

