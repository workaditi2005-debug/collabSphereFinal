
## ✨ Features

- 🔐 Secure JWT-based authentication
- 👥 Smart teammate search with advanced filters
- 📊 Project management with status tracking
- 🤝 Collaboration request system
- ⭐ Peer review and rating system
- 📈 Real-time analytics dashboard
- 🔔 Live notifications

---

## 🛠️ Tech Stack

**Frontend:** React, React Router, CSS3  
**Backend:** Flask, Flask-JWT-Extended, Flask-Bcrypt, Flask-CORS  
**Database:** SQLite3  

---

## 📁 Project Structure

```
Collab-main/
├── frontend/                    # React Frontend
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── components/         # UI Components
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── Landing.jsx
│   │   │   ├── Projects.jsx
│   │   │   ├── FindTeammates.jsx
│   │   │   ├── Notifications.jsx
│   │   │   ├── Analytics.jsx
│   │   │   ├── PeerReview.jsx
│   │   │   └── Profile.jsx
│   │   ├── utils/              # Utilities
│   │   │   ├── api.js          # API service layer
│   │   │   ├── constants.js    # App constants
│   │   │   └── hooks.js        # Custom React hooks
│   │   ├── styles/             # CSS files
│   │   ├── App.jsx             # Root component
│   │   └── index.js            # Entry point
│   ├── package.json
│   └── package-lock.json
│
├── backend/                     # Flask Backend
│   ├── main.py                 # Main Flask app + API routes
│   ├── database.db             # SQLite database
│   ├── check_db.py            # Database verification
│   ├── seed_users.py          # Test data seeding
│   ├── verify_search.py       # Search testing
│   ├── fix_departments.py     # Data cleanup
│   └── requirements.txt       # Python dependencies
│
└── README.md
```

---

## 🚀 Installation

### Backend Setup

```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
source venv/bin/activate       # macOS/Linux

pip install -r requirements.txt
python main.py                 # Starts on port 5000

### Optional: AI features (Anthropic)

To enable AI-driven quiz generation and feedback you must set an Anthropic API key in the backend environment variables. Create a `.env` file in the `backend/` folder with:

```
ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

Then restart the backend. The frontend calls `/api/ai/generate-quiz` and `/api/ai/feedback` — the backend proxies those requests to the Anthropic API so your key is not exposed in the browser.
```

### Frontend Setup

```bash
cd frontend
npm install
npm start                      # Starts on port 3000
```

### Seed Test Data (Optional)

```bash
cd backend
python seed_users.py
python check_db.py             # Verify database
```

---

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update profile

### Projects
- `GET /api/projects` - Get all projects
- `POST /api/projects` - Create project
- `PUT /api/projects/{id}` - Update project

### Teammates
- `POST /api/teammates/search` - Search teammates

### Collaboration
- `POST /api/requests/send` - Send request
- `GET /api/requests/received` - Get received requests
- `PUT /api/requests/{id}/accept` - Accept request
- `PUT /api/requests/{id}/reject` - Reject request

### Notifications
- `GET /api/notifications` - Get notifications
- `PUT /api/notifications/{id}/read` - Mark as read
- `DELETE /api/notifications/clear` - Clear all

### Reviews
- `POST /api/reviews` - Submit review
- `GET /api/reviews/received` - Get reviews received
- `GET /api/reviews/given` - Get reviews given

### Analytics
- `GET /api/analytics` - Get user analytics

---

## 🗄️ Database Schema

**Tables:** `users`, `projects`, `project_members`, `notifications`, `collaboration_requests`, `reviews`

**Key Fields:**
- Users: id, full_name, email, password, institution, department, year, skills
- Projects: id, user_id, title, description, status, assignee
- Requests: id, sender_id, recipient_id, project_id, status, message
- Reviews: id, reviewer_id, reviewee_id, rating, comment

---

## 🐛 Troubleshooting

**Database issues:** Run `python check_db.py`  
**No search results:** Run `python fix_departments.py`  
**CORS errors:** Check allowed origins in `main.py`  
**JWT errors:** Clear localStorage and re-login  



## 🚀 Roadmap

- [ ] Real-time chat
- [ ] Video conferencing
- [ ] File sharing
- [ ] Mobile app
- [ ] GitHub integration
- [ ] Dark mode

---



How It Works
Real-Time Analytics Flow
User Opens Dashboard
        ↓
Analytics Component Mounts
        ↓
Fetches from /api/analytics (user's project stats)
        ↓
Fetches from /api/projects (all user projects)
        ↓
Calculates Metrics:
  - Completion Rate
  - Quality Score
  - Project Status Breakdown
  - Productivity Level
        ↓
Displays Live Dashboard
        ↓
Auto-Refresh Every 30 Seconds (optional)

# Teammate Search Flow

User enters filters (skills, year, department)
        ↓
Clicks "Search Teammates"
        ↓
Sends POST to /api/teammates/search
        ↓
Backend queries database
        ↓
Returns matching teammates
        ↓
User selects teammate
        ↓
Clicks "Send Request"
        ↓
Modal opens with project selection
        ↓
User sends collaboration request
        ↓
POST to /api/requests/send
        ↓
Notification created for recipient

