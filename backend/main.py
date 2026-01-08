from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_bcrypt import Bcrypt
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
import sqlite3
from datetime import datetime, timedelta
from dotenv import load_dotenv
import os
from functools import wraps
import traceback
import json
import requests

app = Flask(__name__)

# Load environment variables from backend/.env if present
load_dotenv()

# ==================== CONFIGURATION ====================
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'your-secret-key-change-in-production')
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'jwt-secret-key-change-in-production')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(days=7)

# ==================== CORS CONFIGURATION ====================

CORS(app,
     resources={
         r"/api/*": {
             "origins": [
                 "http://localhost:5173",
                 "http://localhost:5174",
                 "http://localhost:5000",
                 "http://localhost:3000",
                 "http://127.0.0.1:5173",
                 "http://127.0.0.1:5174",
                 "http://127.0.0.1:3000"
             ]
         }
     },
     supports_credentials=True,
     allow_headers=["Content-Type", "Authorization"],
     methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
     max_age=3600
)

bcrypt = Bcrypt(app)
jwt = JWTManager(app)

DATABASE = 'database.db'

# ==================== ERROR HANDLERS ====================
@app.before_request
def log_request():
    """Log incoming requests"""
    print(f"\n📨 {request.method} {request.path}")
    if request.is_json:
        print(f"📤 Data: {request.get_json()}")

@app.after_request
def log_response(response):
    """Log outgoing responses"""
    print(f"📬 Response: {response.status_code}")
    return response

@app.errorhandler(404)
def not_found(error):
    """Handle 404 errors"""
    return jsonify({'success': False, 'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    """Handle 500 errors"""
    print(f"❌ Server Error: {str(error)}")
    traceback.print_exc()
    return jsonify({'success': False, 'error': 'Internal server error', 'details': str(error)}), 500

# ==================== DATABASE UTILITIES ====================
def get_db():
    """Get database connection"""
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Initialize database with schema"""
    print("🗄️  Initializing database...")
    
    # SQL schema directly in Python
    sql_schema = '''
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      institution TEXT NOT NULL,
      department TEXT NOT NULL,
      year TEXT NOT NULL,
      skills TEXT,
      linkedin_url TEXT,
      profile_pic TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'todo',
      assignee TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS project_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      role TEXT DEFAULT 'member',
      joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      message TEXT,
      sender_name TEXT,
      project_title TEXT,
      is_read INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS collaboration_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender_id INTEGER NOT NULL,
      recipient_id INTEGER NOT NULL,
      project_id INTEGER,
      message TEXT,
      status TEXT DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sender_id) REFERENCES users(id),
      FOREIGN KEY (recipient_id) REFERENCES users(id),
      FOREIGN KEY (project_id) REFERENCES projects(id)
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reviewer_id INTEGER NOT NULL,
      reviewee_id INTEGER NOT NULL,
      project_id INTEGER,
      rating INTEGER,
      comment TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (reviewer_id) REFERENCES users(id),
      FOREIGN KEY (reviewee_id) REFERENCES users(id),
      FOREIGN KEY (project_id) REFERENCES projects(id)
    );

    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
    CREATE INDEX IF NOT EXISTS idx_project_members_project_id ON project_members(project_id);
    CREATE INDEX IF NOT EXISTS idx_project_members_user_id ON project_members(user_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
    CREATE INDEX IF NOT EXISTS idx_collaboration_requests_sender ON collaboration_requests(sender_id);
    CREATE INDEX IF NOT EXISTS idx_collaboration_requests_recipient ON collaboration_requests(recipient_id);
    CREATE INDEX IF NOT EXISTS idx_reviews_reviewer ON reviews(reviewer_id);
    CREATE INDEX IF NOT EXISTS idx_reviews_reviewee ON reviews(reviewee_id);
    '''
    
    try:
        db = get_db()
        db.executescript(sql_schema)
        db.commit()
        db.close()
        print("✅ Database initialized successfully")
        return True
    except Exception as e:
        print(f"❌ Database initialization error: {e}")
        traceback.print_exc()
        return False

# ==================== AUTHENTICATION ROUTES ====================
@app.route('/api/auth/register', methods=['POST', 'OPTIONS'])
def register():
    """Register new user"""
    if request.method == 'OPTIONS':
        return '', 204

    try:
        data = request.get_json()
        
        print(f"📝 Registration attempt: {data.get('email')}")
        
        # Validate required fields
        required_fields = ['fullName', 'email', 'password', 'institution', 'department', 'year']
        for field in required_fields:
            if field not in data or not data[field]:
                return jsonify({'success': False, 'error': f'Missing field: {field}'}), 400
        
        # Validate skills
        if 'skills' not in data or len(data['skills']) == 0:
            return jsonify({'success': False, 'error': 'At least one skill is required'}), 400
        
        # Validate password length
        if len(data['password']) < 8:
            return jsonify({'success': False, 'error': 'Password must be at least 8 characters'}), 400
        
        db = get_db()
        
        # Check if user already exists
        existing_user = db.execute(
            'SELECT id FROM users WHERE email = ?', 
            (data['email'],)
        ).fetchone()
        
        if existing_user:
            db.close()
            return jsonify({'success': False, 'error': 'Email already registered'}), 409
        
        # Hash password
        hashed_password = bcrypt.generate_password_hash(data['password']).decode('utf-8')
        
        # Insert user
        cursor = db.execute(
            '''INSERT INTO users (full_name, email, password, institution, department, year, 
               skills, linkedin_url, profile_pic, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
            (
                data['fullName'],
                data['email'],
                hashed_password,
                data['institution'],
                data['department'],
                data['year'],
                ','.join(data['skills']),
                data.get('linkedinUrl', ''),
                data.get('profilePic', ''),
                datetime.now().isoformat()
            )
        )
        db.commit()
        
        user_id = cursor.lastrowid
        
        # Create access token
        access_token = create_access_token(identity=user_id)
        
        print(f"✅ User registered successfully: {user_id}")
        
        db.close()
        
        return jsonify({
            'success': True,
            'message': 'User registered successfully',
            'token': access_token,
            'user': {
                'id': user_id,
                'fullName': data['fullName'],
                'email': data['email'],
                'institution': data['institution'],
                'department': data['department'],
                'year': data['year'],
                'skills': data['skills'],
                'linkedinUrl': data.get('linkedinUrl', ''),
                'profilePic': data.get('profilePic', '')
            }
        }), 201
        
    except Exception as e:
        print(f"❌ Registration error: {str(e)}")
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/auth/login', methods=['POST', 'OPTIONS'])
def login():
    """Login user"""
    if request.method == 'OPTIONS':
        return '', 204

    try:
        data = request.get_json()
        
        print(f"🔐 Login attempt: {data.get('email')}")
        
        if not data.get('email') or not data.get('password'):
            return jsonify({'success': False, 'error': 'Email and password required'}), 400
        
        db = get_db()
        user = db.execute(
            'SELECT * FROM users WHERE email = ?',
            (data['email'],)
        ).fetchone()
        
        if not user:
            db.close()
            return jsonify({'success': False, 'error': 'Invalid email or password'}), 401
        
        if not bcrypt.check_password_hash(user['password'], data['password']):
            db.close()
            return jsonify({'success': False, 'error': 'Invalid email or password'}), 401
        
        # Create access token
        access_token = create_access_token(identity=user['id'])
        
        print(f"✅ Login successful: {user['id']}")
        
        db.close()
        
        return jsonify({
            'success': True,
            'message': 'Login successful',
            'token': access_token,
            'user': {
                'id': user['id'],
                'fullName': user['full_name'],
                'email': user['email'],
                'institution': user['institution'],
                'department': user['department'],
                'year': user['year'],
                'skills': user['skills'].split(',') if user['skills'] else [],
                'linkedinUrl': user['linkedin_url'],
                'profilePic': user['profile_pic']
            }
        }), 200
        
    except Exception as e:
        print(f"❌ Login error: {str(e)}")
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/auth/profile', methods=['GET', 'OPTIONS'])
@jwt_required()
def get_profile():
    """Get current user profile"""
    if request.method == 'OPTIONS':
        return '', 204

    try:
        user_id = get_jwt_identity()
        db = get_db()
        
        user = db.execute(
            'SELECT * FROM users WHERE id = ?',
            (user_id,)
        ).fetchone()
        
        if not user:
            db.close()
            return jsonify({'success': False, 'error': 'User not found'}), 404
        
        db.close()
        
        return jsonify({
            'success': True,
            'user': {
                'id': user['id'],
                'fullName': user['full_name'],
                'email': user['email'],
                'institution': user['institution'],
                'department': user['department'],
                'year': user['year'],
                'skills': user['skills'].split(',') if user['skills'] else [],
                'linkedinUrl': user['linkedin_url'],
                'profilePic': user['profile_pic']
            }
        }), 200
        
    except Exception as e:
        print(f"❌ Get profile error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/auth/profile', methods=['PUT', 'OPTIONS'])
@jwt_required()
def update_profile():
    """Update user profile"""
    if request.method == 'OPTIONS':
        return '', 204

    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        db = get_db()
        
        # Build update query dynamically
        update_fields = []
        values = []
        
        if 'fullName' in data:
            update_fields.append('full_name = ?')
            values.append(data['fullName'])
        
        if 'institution' in data:
            update_fields.append('institution = ?')
            values.append(data['institution'])
        
        if 'department' in data:
            update_fields.append('department = ?')
            values.append(data['department'])
        
        if 'year' in data:
            update_fields.append('year = ?')
            values.append(data['year'])
        
        if 'skills' in data:
            update_fields.append('skills = ?')
            values.append(','.join(data['skills']))
        
        if 'linkedinUrl' in data:
            update_fields.append('linkedin_url = ?')
            values.append(data['linkedinUrl'])
        
        if 'profilePic' in data:
            update_fields.append('profile_pic = ?')
            values.append(data['profilePic'])
        
        if update_fields:
            values.append(user_id)
            
            db.execute(
                f'UPDATE users SET {", ".join(update_fields)} WHERE id = ?',
                values
            )
            db.commit()
        
        db.close()
        
        return jsonify({'success': True, 'message': 'Profile updated successfully'}), 200
        
    except Exception as e:
        print(f"❌ Update profile error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

# ==================== PROJECT ROUTES ====================
@app.route('/api/projects', methods=['GET', 'OPTIONS'])
@jwt_required()
def get_projects():
    """Get all projects for current user"""
    if request.method == 'OPTIONS':
        return '', 204

    try:
        user_id = get_jwt_identity()
        db = get_db()
        
        projects = db.execute(
            '''SELECT * FROM projects 
               WHERE user_id = ? OR id IN (
                   SELECT project_id FROM project_members WHERE user_id = ?
               )
               ORDER BY created_at DESC''',
            (user_id, user_id)
        ).fetchall()
        
        project_list = []
        for project in projects:
            project_list.append({
                'id': project['id'],
                'title': project['title'],
                'description': project['description'],
                'status': project['status'],
                'assignee': project['assignee'],
                'createdAt': project['created_at']
            })
        
        db.close()
        
        return jsonify({'success': True, 'projects': project_list}), 200
        
    except Exception as e:
        print(f"❌ Get projects error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/projects', methods=['POST', 'OPTIONS'])
@jwt_required()
def create_project():
    """Create new project"""
    if request.method == 'OPTIONS':
        return '', 204

    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        if not data.get('title'):
            return jsonify({'success': False, 'error': 'Project title is required'}), 400
        
        db = get_db()
        cursor = db.execute(
            '''INSERT INTO projects (user_id, title, description, status, assignee, created_at)
               VALUES (?, ?, ?, ?, ?, ?)''',
            (
                user_id,
                data['title'],
                data.get('description', ''),
                'todo',
                data.get('assignee', 'You'),
                datetime.now().isoformat()
            )
        )
        db.commit()
        
        project_id = cursor.lastrowid
        
        db.close()
        
        return jsonify({
            'success': True,
            'message': 'Project created successfully',
            'project': {
                'id': project_id,
                'title': data['title'],
                'description': data.get('description', ''),
                'status': 'todo',
                'assignee': data.get('assignee', 'You')
            }
        }), 201
        
    except Exception as e:
        print(f"❌ Create project error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/projects/<int:project_id>', methods=['PUT', 'OPTIONS'])
@jwt_required()
def update_project(project_id):
    """Update project status"""
    if request.method == 'OPTIONS':
        return '', 204

    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        db = get_db()
        
        # Verify project ownership
        project = db.execute(
            'SELECT * FROM projects WHERE id = ? AND user_id = ?',
            (project_id, user_id)
        ).fetchone()
        
        if not project:
            db.close()
            return jsonify({'success': False, 'error': 'Project not found or unauthorized'}), 404
        
        if 'status' in data:
            db.execute(
                'UPDATE projects SET status = ? WHERE id = ?',
                (data['status'], project_id)
            )
            db.commit()
        
        db.close()
        
        return jsonify({'success': True, 'message': 'Project updated successfully'}), 200
        
    except Exception as e:
        print(f"❌ Update project error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500


# ==================== HEALTH CHECK ====================
@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'success': True,
        'status': 'healthy',
        'timestamp': datetime.now().isoformat()
    }), 200

# ==================== ANALYTICS ROUTES ====================
@app.route('/api/analytics', methods=['GET', 'OPTIONS'])
@jwt_required()
def get_analytics():
    """Get user analytics"""
    if request.method == 'OPTIONS':
        return '', 204

    try:
        user_id = get_jwt_identity()
        db = get_db()
        
        # Get project stats
        project_stats = db.execute(
            '''SELECT 
                   COUNT(*) as total,
                   SUM(CASE WHEN status = 'todo' THEN 1 ELSE 0 END) as todo,
                   SUM(CASE WHEN status = 'inProgress' THEN 1 ELSE 0 END) as in_progress,
                   SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
               FROM projects WHERE user_id = ?''',
            (user_id,)
        ).fetchone()
        
        db.close()
        
        total = project_stats['total'] or 0
        completed = project_stats['completed'] or 0
        
        return jsonify({
            'success': True,
            'analytics': {
                'total_projects': total,
                'todo': project_stats['todo'] or 0,
                'in_progress': project_stats['in_progress'] or 0,
                'completed': completed,
                'completion_rate': (completed / total * 100) if total > 0 else 0
            }
        }), 200
        
    except Exception as e:
        print(f"❌ Get analytics error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

# ==================== NOTIFICATIONS ROUTES ====================
@app.route('/api/notifications', methods=['GET', 'OPTIONS'])
@jwt_required()
def get_notifications():
    """Get user notifications"""
    if request.method == 'OPTIONS':
        return '', 204

    try:
        user_id = get_jwt_identity()
        db = get_db()
        
        notifications = db.execute(
            '''SELECT * FROM notifications 
               WHERE user_id = ? 
               ORDER BY created_at DESC 
               LIMIT 50''',
            (user_id,)
        ).fetchall()
        
        notification_list = []
        for notif in notifications:
            notification_list.append({
                'id': notif['id'],
                'type': notif['type'],
                'message': notif['message'],
                'read': bool(notif['is_read']),
                'timestamp': notif['created_at'],
                'sender': notif['sender_name'],
                'project': notif['project_title']
            })
        
        db.close()
        
        return jsonify({
            'success': True,
            'notifications': notification_list
        }), 200
        
    except Exception as e:
        print(f"❌ Get notifications error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/notifications/<int:notification_id>/read', methods=['PUT', 'OPTIONS'])
@jwt_required()
def mark_notification_read(notification_id):
    """Mark notification as read"""
    if request.method == 'OPTIONS':
        return '', 204

    try:
        user_id = get_jwt_identity()
        db = get_db()
        
        db.execute(
            'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?',
            (notification_id, user_id)
        )
        db.commit()
        db.close()
        
        return jsonify({'success': True, 'message': 'Notification marked as read'}), 200
        
    except Exception as e:
        print(f"❌ Mark notification read error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/notifications/clear', methods=['DELETE', 'OPTIONS'])
@jwt_required()
def clear_notifications():
    """Clear all notifications"""
    if request.method == 'OPTIONS':
        return '', 204

    try:
        user_id = get_jwt_identity()
        db = get_db()
        
        db.execute(
            'DELETE FROM notifications WHERE user_id = ?',
            (user_id,)
        )
        db.commit()
        db.close()
        
        return jsonify({'success': True, 'message': 'All notifications cleared'}), 200
        
    except Exception as e:
        print(f"❌ Clear notifications error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

# ==================== TEAMMATES SEARCH ROUTES ====================
@app.route('/api/teammates/search', methods=['POST'])
def search_teammates():
    print("\n🔍 /api/teammates/search called")

    data = request.get_json()
    print("1️⃣ Received payload:", data)

    query = data.get('query', '').strip()
    skills = data.get('skills', [])
    years = data.get('years', [])
    departments = data.get('departments', [])

    print(f"   ➤ Query: '{query}'")
    print(f"   ➤ Skills: {skills}")
    print(f"   ➤ Years: {years}")
    print(f"   ➤ Departments: {departments}")

    sql = "SELECT id, full_name, email, institution, department, year, skills FROM users WHERE 1=1"
    params = []

    # -----------------------------
    # 2️⃣ Full-text search filter
    # -----------------------------
    if query:
        print("2️⃣ Applying full-text search filter")
        sql += """
            AND (
                full_name LIKE ? OR
                skills LIKE ? OR
                department LIKE ? OR
                institution LIKE ?
            )
        """
        like_value = f"%{query}%"
        params.extend([like_value] * 4)
        print("   ✓ Full-text search applied")
    else:
        print("2️⃣ No full-text query provided")

    # -----------------------------
    # 3️⃣ Skills filter
    # -----------------------------
    if skills:
        print("3️⃣ Applying skills filter")
        skill_conditions = []
        for skill in skills:
            skill_conditions.append("skills LIKE ?")
            params.append(f"%{skill}%")

        sql += f" AND ({' OR '.join(skill_conditions)})"
        print(f"   ✓ Added {len(skills)} skill filters")
    else:
        print("3️⃣ No skills filter provided")

    # -----------------------------
    # 4️⃣ Year filter
    # -----------------------------
    if years:
        print("4️⃣ Applying year filter")
        year_conditions = []
        for yr in years:
            year_conditions.append("year = ?")
            params.append(yr)

        sql += f" AND ({' OR '.join(year_conditions)})"
        print(f"   ✓ Added {len(years)} year filters")
    else:
        print("4️⃣ No year filter provided")

    # -----------------------------
    # 5️⃣ Department filter
    # -----------------------------
    if departments:
        print("5️⃣ Applying department filter")
        dep_conditions = []
        for dep in departments:
            dep_conditions.append("department LIKE ?")
            params.append(f"%{dep}%")

        sql += f" AND ({' OR '.join(dep_conditions)})"
        print(f"   ✓ Added {len(departments)} department filters")
    else:
        print("5️⃣ No department filter provided")

    print("\n🧩 Final SQL Query:")
    print(sql)
    print("🧩 Query Params:", params)

    # -----------------------------
    # 6️⃣ Execute query
    # -----------------------------
    conn = sqlite3.connect("database.db")
    cursor = conn.cursor()
    cursor.execute(sql, params)
    rows = cursor.fetchall()
    conn.close()

    print(f"\n📌 Found {len(rows)} matching teammates")

    # Convert to structured output
    teammates = []
    for r in rows:
        teammates.append({
            "id": r[0],
            "full_name": r[1],
            "email": r[2],
            "institution": r[3],
            "department": r[4],
            "year": r[5],
            "skills": r[6].split(",") if r[6] else []
        })

    return jsonify({
        "success": True,
        "count": len(teammates),
        "results": teammates
    }), 200

@app.route('/api/test', methods=['GET'])
def test():
    """Test endpoint"""
    return jsonify({'success': True, 'message': 'Backend is working'}), 200


# ==================== MOCK AI ENDPOINTS (for testing without API key) ====================
@app.route('/api/ai/generate-quiz-mock', methods=['POST', 'OPTIONS'])
def ai_generate_quiz_mock():
    """Mock quiz generation endpoint (returns difficulty-specific questions - no API key needed)."""
    if request.method == 'OPTIONS':
        return '', 204

    try:
        payload = request.get_json() or {}
        topic = payload.get('topic', 'General Knowledge').lower()
        difficulty = payload.get('difficulty', 'medium').lower()
        questionCount = int(payload.get('questionCount', 5))

        # Sample questions database organized by topic and difficulty
        questions_db = {
            'javascript': {
                'easy': [
                    {
                        "question": "What keyword is used to declare a variable in JavaScript?",
                        "options": ["var, let, const", "variable", "declare", "define"],
                        "correctAnswer": 0,
                        "explanation": "JavaScript uses var, let, and const keywords to declare variables."
                    },
                    {
                        "question": "Which method is used to add elements to the end of an array?",
                        "options": ["add()", "push()", "append()", "insert()"],
                        "correctAnswer": 1,
                        "explanation": "The push() method adds one or more elements to the end of an array."
                    },
                    {
                        "question": "What does console.log() do?",
                        "options": ["Creates a log file", "Prints output to the console", "Logs into a website", "Creates a new variable"],
                        "correctAnswer": 1,
                        "explanation": "console.log() prints text or values to the browser console for debugging."
                    },
                    {
                        "question": "Which symbol is used for comments in JavaScript?",
                        "options": ["#", "//", "<!--", "--"],
                        "correctAnswer": 1,
                        "explanation": "// is used for single-line comments in JavaScript."
                    },
                    {
                        "question": "What is the correct way to write 'Hello World' in an alert box?",
                        "options": ["alert('Hello World')", "msgBox('Hello World')", "alertBox('Hello World')", "popup('Hello World')"],
                        "correctAnswer": 0,
                        "explanation": "alert('Hello World') displays an alert dialog with the message."
                    },
                ],
                'medium': [
                    {
                        "question": "What is the output of typeof null in JavaScript?",
                        "options": ["'null'", "'object'", "'undefined'", "'NaN'"],
                        "correctAnswer": 1,
                        "explanation": "Due to a bug in JavaScript, typeof null returns 'object' instead of 'null'."
                    },
                    {
                        "question": "What is the difference between let and var?",
                        "options": ["No difference", "let is block-scoped, var is function-scoped", "var is newer than let", "let cannot be reassigned"],
                        "correctAnswer": 1,
                        "explanation": "let is block-scoped (limited to the nearest enclosing block), while var is function-scoped."
                    },
                    {
                        "question": "What does the spread operator (...) do?",
                        "options": ["Creates comments", "Expands iterables into arguments or elements", "Multiplies values", "Defines a function"],
                        "correctAnswer": 1,
                        "explanation": "The spread operator allows iterables to be expanded in places where zero or more elements are expected."
                    },
                    {
                        "question": "What is a closure in JavaScript?",
                        "options": ["A loop that closes", "A function that has access to variables from its outer scope", "A type of error", "A way to close a program"],
                        "correctAnswer": 1,
                        "explanation": "A closure is a function that has access to variables from its parent scope even after the parent function has closed."
                    },
                    {
                        "question": "Which method removes the last element from an array?",
                        "options": ["shift()", "pop()", "splice()", "slice()"],
                        "correctAnswer": 1,
                        "explanation": "The pop() method removes the last element from an array and returns that element."
                    },
                ],
                'hard': [
                    {
                        "question": "What is the difference between == and === in JavaScript?",
                        "options": ["No difference", "== compares value, === compares value and type", "=== compares value, == compares type", "They are opposite"],
                        "correctAnswer": 1,
                        "explanation": "== performs type coercion, while === checks both value and type without coercion."
                    },
                    {
                        "question": "What is hoisting in JavaScript?",
                        "options": ["Moving elements on a page", "Moving declarations to the top of their scope before execution", "A function call", "A type of error"],
                        "correctAnswer": 1,
                        "explanation": "Hoisting is JavaScript's behavior of moving declarations to the top of their scope before code execution."
                    },
                    {
                        "question": "What does Object.freeze() do?",
                        "options": ["Stops a function", "Makes an object immutable", "Removes an object", "Clones an object"],
                        "correctAnswer": 1,
                        "explanation": "Object.freeze() makes an object immutable, preventing modifications to its properties."
                    },
                    {
                        "question": "What is the event loop in JavaScript?",
                        "options": ["A loop in HTML", "The mechanism that executes code, collects events, and executes queued sub-tasks", "A type of error", "A function"],
                        "correctAnswer": 1,
                        "explanation": "The event loop is the core mechanism that allows JavaScript to perform asynchronous operations."
                    },
                    {
                        "question": "What is the difference between async/await and promises?",
                        "options": ["They are the same", "async/await is syntactic sugar over promises for cleaner code", "promises are newer", "No practical difference"],
                        "correctAnswer": 1,
                        "explanation": "async/await provides a cleaner way to write asynchronous code compared to promise chains."
                    },
                ],
            },
            'python': {
                'easy': [
                    {
                        "question": "What is the correct syntax to create a function in Python?",
                        "options": ["function myFunc():", "def myFunc():", "func myFunc():", "define myFunc():"],
                        "correctAnswer": 1,
                        "explanation": "Python uses the 'def' keyword to define functions."
                    },
                    {
                        "question": "How do you create a comment in Python?",
                        "options": ["// comment", "<!-- comment -->", "# comment", "/* comment */"],
                        "correctAnswer": 2,
                        "explanation": "In Python, comments are created using the # symbol."
                    },
                    {
                        "question": "What is the output of print(5 * 2)?",
                        "options": ["7", "10", "52", "25"],
                        "correctAnswer": 1,
                        "explanation": "5 * 2 = 10. The print() function outputs the result."
                    },
                    {
                        "question": "Which data type is used to store text in Python?",
                        "options": ["int", "float", "str", "bool"],
                        "correctAnswer": 2,
                        "explanation": "The str (string) data type is used to store text in Python."
                    },
                    {
                        "question": "What keyword is used to create a loop in Python?",
                        "options": ["loop", "while", "repeat", "iterate"],
                        "correctAnswer": 1,
                        "explanation": "The while keyword creates a loop in Python (for loops also exist)."
                    },
                ],
                'medium': [
                    {
                        "question": "Which of the following is a mutable data type in Python?",
                        "options": ["tuple", "string", "list", "frozenset"],
                        "correctAnswer": 2,
                        "explanation": "Lists are mutable. Tuples, strings, and frozensets are immutable."
                    },
                    {
                        "question": "What does the 'self' keyword represent in Python?",
                        "options": ["The class itself", "The instance of the class", "A global variable", "A built-in function"],
                        "correctAnswer": 1,
                        "explanation": "self represents the instance of the class in Python methods."
                    },
                    {
                        "question": "What is the purpose of the __init__ method?",
                        "options": ["To initialize variables", "To create a constructor", "To initialize instances", "All of the above"],
                        "correctAnswer": 3,
                        "explanation": "__init__ is the constructor method that initializes new instances of a class."
                    },
                    {
                        "question": "Which library is used for numerical computing in Python?",
                        "options": ["pandas", "numpy", "matplotlib", "scikit-learn"],
                        "correctAnswer": 1,
                        "explanation": "NumPy is the fundamental package for numerical computing in Python."
                    },
                    {
                        "question": "What is a list comprehension in Python?",
                        "options": ["A way to understand lists", "A concise way to create lists", "A type of error", "A loop statement"],
                        "correctAnswer": 1,
                        "explanation": "List comprehension is a concise way to create lists by applying an operation to each item in an iterable."
                    },
                ],
                'hard': [
                    {
                        "question": "What is the difference between *args and **kwargs?",
                        "options": ["No difference", "*args passes positional args, **kwargs passes keyword arguments", "They are the same", "kwargs is newer"],
                        "correctAnswer": 1,
                        "explanation": "*args is for variable-length positional arguments, **kwargs is for keyword arguments."
                    },
                    {
                        "question": "What is a decorator in Python?",
                        "options": ["A function that decorates", "A function that modifies another function or class", "A type of variable", "A class"],
                        "correctAnswer": 1,
                        "explanation": "A decorator is a function that wraps another function to modify its behavior without permanently changing it."
                    },
                    {
                        "question": "What is the GIL (Global Interpreter Lock)?",
                        "options": ["A variable", "A lock preventing multiple threads from executing Python code simultaneously", "A library", "An error"],
                        "correctAnswer": 1,
                        "explanation": "The GIL is a mutex that protects access to Python objects in CPython."
                    },
                    {
                        "question": "What is the difference between deep copy and shallow copy?",
                        "options": ["No difference", "Shallow copy copies only references, deep copy copies everything recursively", "They are the same", "Deep copy is faster"],
                        "correctAnswer": 1,
                        "explanation": "Shallow copy creates a new object with references to nested objects, deep copy recursively copies everything."
                    },
                    {
                        "question": "What is a generator in Python?",
                        "options": ["A function that creates objects", "A function that uses yield to return values one at a time", "A type of loop", "A class"],
                        "correctAnswer": 1,
                        "explanation": "A generator is a function that returns an iterator object using the yield keyword."
                    },
                ],
            },
            'react': {
                'easy': [
                    {
                        "question": "What is React?",
                        "options": ["A server framework", "A JavaScript library for building user interfaces", "A database", "A CSS framework"],
                        "correctAnswer": 1,
                        "explanation": "React is a JavaScript library developed by Facebook for building UI components."
                    },
                    {
                        "question": "What is JSX?",
                        "options": ["A type of JavaScript", "A syntax extension for JavaScript that allows writing HTML in JavaScript", "A framework", "A library"],
                        "correctAnswer": 1,
                        "explanation": "JSX allows you to write HTML-like syntax in JavaScript, which gets compiled to JavaScript function calls."
                    },
                    {
                        "question": "What is a component in React?",
                        "options": ["A function", "A reusable piece of UI", "A class", "A variable"],
                        "correctAnswer": 1,
                        "explanation": "A component is a reusable, self-contained piece of UI that can be used throughout an application."
                    },
                    {
                        "question": "What is the purpose of props in React?",
                        "options": ["To style elements", "To pass data from parent to child components", "To manage state", "To create loops"],
                        "correctAnswer": 1,
                        "explanation": "Props are used to pass data and configuration from parent components to child components."
                    },
                    {
                        "question": "What is state in React?",
                        "options": ["The status of a server", "Data that changes over time and causes re-renders", "A variable", "A function"],
                        "correctAnswer": 1,
                        "explanation": "State is data that can change and causes a component to re-render when updated."
                    },
                ],
                'medium': [
                    {
                        "question": "What is the purpose of the useState hook?",
                        "options": ["To manage component state", "To fetch data", "To style components", "To route pages"],
                        "correctAnswer": 0,
                        "explanation": "useState is a React Hook that allows functional components to have state."
                    },
                    {
                        "question": "What is the useEffect hook used for?",
                        "options": ["To create effects", "To handle side effects and lifecycle events", "To manage props", "To style elements"],
                        "correctAnswer": 1,
                        "explanation": "useEffect runs side effects like fetching data, updating the DOM, or subscribing to events."
                    },
                    {
                        "question": "What is the Virtual DOM?",
                        "options": ["An actual DOM", "A lightweight in-memory representation of the real DOM", "A database", "A server"],
                        "correctAnswer": 1,
                        "explanation": "The Virtual DOM is React's way of optimizing updates by comparing and syncing with the real DOM."
                    },
                    {
                        "question": "How do you handle events in React?",
                        "options": ["Using onclick attribute", "Using camelCase event handlers like onClick", "Using addEventListener", "Using on: prefix"],
                        "correctAnswer": 1,
                        "explanation": "React uses camelCase event handlers (onClick, onChange, etc.) passed as JSX attributes."
                    },
                    {
                        "question": "What is conditional rendering in React?",
                        "options": ["Using if statements only", "Rendering components based on conditions", "A type of loop", "A CSS feature"],
                        "correctAnswer": 1,
                        "explanation": "Conditional rendering displays different content based on certain conditions using if/else or ternary operators."
                    },
                ],
                'hard': [
                    {
                        "question": "What is the Context API in React?",
                        "options": ["An API call", "A way to pass data through the component tree without prop drilling", "A hook", "A library"],
                        "correctAnswer": 1,
                        "explanation": "Context API provides a way to share state globally without passing props through every level."
                    },
                    {
                        "question": "What is reconciliation in React?",
                        "options": ["Making peace", "The process of updating the Virtual DOM and comparing with real DOM", "A type of hook", "A state management"],
                        "correctAnswer": 1,
                        "explanation": "Reconciliation is React's process of determining how to update the UI efficiently."
                    },
                    {
                        "question": "What is the useReducer hook?",
                        "options": ["For reducing arrays", "For managing complex state with an action-based reducer function", "For styling", "For routing"],
                        "correctAnswer": 1,
                        "explanation": "useReducer is a hook for managing state with a reducer function, useful for complex state logic."
                    },
                    {
                        "question": "What is memoization in React?",
                        "options": ["Storing memories", "Optimizing performance by caching component renders", "A variable", "A function"],
                        "correctAnswer": 1,
                        "explanation": "Memoization (React.memo) prevents unnecessary re-renders of components when props haven't changed."
                    },
                    {
                        "question": "What is a custom hook in React?",
                        "options": ["A built-in hook", "A reusable function that uses other hooks to encapsulate logic", "A state hook", "A lifecycle hook"],
                        "correctAnswer": 1,
                        "explanation": "Custom hooks are functions that use other hooks to extract component logic into reusable functions."
                    },
                ],
            },
        }

        # Get questions for the topic and difficulty
        if topic in questions_db and difficulty in questions_db[topic]:
            available_questions = questions_db[topic][difficulty]
        else:
            # Fallback to a generic question if topic/difficulty not found
            available_questions = [{
                "question": f"What is your experience with {topic}?",
                "options": ["Beginner", "Intermediate", "Advanced", "Expert"],
                "correctAnswer": 0,
                "explanation": f"Sample question for {topic}. Add your Anthropic API key to backend/.env for real questions."
            }]

        # Select questions (cycle if not enough)
        selected_questions = available_questions[:questionCount]
        if len(selected_questions) < questionCount:
            selected_questions = selected_questions * (questionCount // len(selected_questions) + 1)
            selected_questions = selected_questions[:questionCount]

        # Format as Anthropic response
        mock_response = {
            'content': [
                {
                    'type': 'text',
                    'text': json.dumps({"questions": selected_questions})
                }
            ]
        }

        return jsonify({'success': True, 'result': mock_response}), 200

    except Exception as e:
        print(f"❌ Mock quiz error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/ai/generate-quiz', methods=['POST', 'OPTIONS'])
def ai_generate_quiz():
    """Generate a quiz using Anthropic (server-side proxy for API key)."""
    if request.method == 'OPTIONS':
        return '', 204

    try:
        payload = request.get_json() or {}
        topic = payload.get('topic', '')
        difficulty = payload.get('difficulty', 'medium')
        questionCount = int(payload.get('questionCount', 5))
        timeLimit = int(payload.get('timeLimit', 60))

        if not topic:
            return jsonify({'success': False, 'error': 'topic is required'}), 400

        api_key = os.getenv('ANTHROPIC_API_KEY')
        if not api_key:
            return jsonify({'success': False, 'error': 'AI provider API key not configured'}), 500

        # Build the prompt to send
        prompt = f"Generate {questionCount} multiple choice questions about \"{topic}\" at {difficulty} difficulty level.\n\nReturn ONLY valid JSON in this exact format with no markdown, no preamble, no explanation:\n{{\n  \"questions\": [{{\n    \"question\": \"question text\",\n    \"options\": [\"option1\", \"option2\", \"option3\", \"option4\"],\n    \"correctAnswer\": 0,\n    \"explanation\": \"why this is correct\"\n  }}]\n}}\n\nMake questions educational and relevant to the topic. Ensure correctAnswer is the index (0-3) of the correct option."

        url = 'https://api.anthropic.com/v1/messages'
        headers = {
            'Content-Type': 'application/json',
            'x-api-key': api_key
        }

        body = {
            'model': 'claude-sonnet-4-20250514',
            'max_tokens': 1000,
            'messages': [
                {
                    'role': 'user',
                    'content': prompt
                }
            ]
        }

        resp = requests.post(url, headers=headers, json=body, timeout=15)
        resp.raise_for_status()

        result = resp.json()

        # Return the raw content to the client (AIQuiz will clean/parse JSON)
        return jsonify({'success': True, 'result': result}), 200

    except Exception as e:
        print(f"❌ AI generate quiz error: {e}")
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/ai/feedback', methods=['POST', 'OPTIONS'])
def ai_feedback():
    """Generate personalized feedback using Anthropic (server-side proxy)."""
    if request.method == 'OPTIONS':
        return '', 204

    try:
        payload = request.get_json() or {}
        # payload should include: score, total, difficulty, topic, avg_time
        score = payload.get('score')
        total = payload.get('total')
        difficulty = payload.get('difficulty', 'medium')
        topic = payload.get('topic', '')
        avg_time = payload.get('avgTime', 0)

        if score is None or total is None:
            return jsonify({'success': False, 'error': 'score and total required'}), 400

        api_key = os.getenv('ANTHROPIC_API_KEY')
        if not api_key:
            return jsonify({'success': False, 'error': 'AI provider API key not configured'}), 500

        prompt = (
            f"A student scored {score}/{total} on a {difficulty} difficulty quiz about \"{topic}\". "
            f"Average time per question: {avg_time:.1f} seconds.\n\n"
            "Provide personalized feedback in ONLY valid JSON format with no markdown or preamble:\n"
            "{\n  \"overallFeedback\": \"encouraging feedback about their performance\",\n"
            "  \"strengths\": \"what they did well\",\n"
            "  \"improvements\": \"specific areas to improve\",\n"
            "  \"recommendations\": \"next steps or study suggestions\"\n}"
        )

        url = 'https://api.anthropic.com/v1/messages'
        headers = {'Content-Type': 'application/json', 'x-api-key': api_key}

        body = {'model': 'claude-sonnet-4-20250514', 'max_tokens': 1000, 'messages': [{'role': 'user', 'content': prompt}]}

        resp = requests.post(url, headers=headers, json=body, timeout=15)
        resp.raise_for_status()
        result = resp.json()

        return jsonify({'success': True, 'result': result}), 200

    except Exception as e:
        print(f"❌ AI feedback error: {e}")
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/requests/test-send', methods=['POST', 'OPTIONS'])
def test_send_collaboration_request():
    """Test collaboration request endpoint (no auth required)"""
    if request.method == 'OPTIONS':
        return '', 204
    
    try:
        data = request.get_json()
        
        print(f"\n🧪 TEST ENDPOINT CALLED")
        print(f"📦 Request data: {data}")
        
        # Validate required fields
        teammate_id = data.get('teammate_id')
        project_id = data.get('project_id')
        message = data.get('message', '').strip()
        
        print(f"   ➤ teammate_id: {teammate_id}")
        print(f"   ➤ project_id: {project_id}")
        print(f"   ➤ message: {message}")
        
        if not all([teammate_id, project_id, message]):
            return jsonify({
                'success': False,
                'error': 'Missing required fields'
            }), 400
        
        return jsonify({
            'success': True,
            'message': 'Test request received',
            'request_id': 999
        }), 201
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

# ==================== COLLABORATION REQUESTS ====================
@app.route('/api/requests/send', methods=['POST', 'OPTIONS'])
@jwt_required(optional=True)
def send_collaboration_request():
    """Send collaboration request with notification"""
    if request.method == 'OPTIONS':
        return '', 204

    try:
        sender_id = get_jwt_identity()
        
        # If no JWT token, use a test user ID
        if not sender_id:
            print("⚠️  No JWT identity, using test user ID 1")
            sender_id = 1
        
        data = request.get_json()
        
        print(f"📨 Sending collaboration request from user {sender_id}")
        print(f"📦 Request data: {data}")
        
        # Validate required fields (accept both camelCase and snake_case)
        teammate_id = data.get('teammate_id') or data.get('teammateId')
        project_id = data.get('project_id') or data.get('projectId')
        message = data.get('message', '').strip()
        subject = data.get('subject', 'Collaboration Request')
        
        print(f"   ➤ Raw teammate_id: {teammate_id} (type: {type(teammate_id).__name__})")
        print(f"   ➤ Raw project_id: {project_id} (type: {type(project_id).__name__})")
        print(f"   ➤ Raw message: '{message}' (len: {len(message)})")
        
        # Validate non-empty message
        if not message:
            print(f"   ❌ Message is empty")
            return jsonify({
                'success': False, 
                'error': 'Message cannot be empty'
            }), 422
        
        # Convert IDs to integers - be more lenient
        try:
            teammate_id = int(teammate_id) if teammate_id else None
            project_id = int(project_id) if project_id else None
        except (ValueError, TypeError) as e:
            print(f"   ❌ ID conversion error: {e}")
            print(f"   ➤ Attempted to convert - teammate_id: {data.get('teammate_id')}, project_id: {data.get('project_id')}")
            return jsonify({
                'success': False, 
                'error': f'Invalid teammate_id or project_id format'
            }), 422
        
        # Validate all required fields are present
        if not teammate_id or not project_id:
            missing = []
            if not teammate_id:
                missing.append('teammate_id')
            if not project_id:
                missing.append('project_id')
            
            error_msg = f"Missing required fields: {', '.join(missing)}"
            print(f"   ❌ Validation error: {error_msg}")
            return jsonify({
                'success': False, 
                'error': error_msg
            }), 422
        
        print(f"   ✅ All validations passed")
        
        db_conn = get_db()
        
        # Get sender and project info for notification
        sender = db_conn.execute(
            'SELECT full_name, email FROM users WHERE id = ?', 
            (sender_id,)
        ).fetchone()
        
        project = db_conn.execute(
            'SELECT title FROM projects WHERE id = ?', 
            (project_id,)
        ).fetchone()
        
        if not sender:
            db_conn.close()
            return jsonify({'success': False, 'error': 'Sender not found'}), 404
            
        if not project:
            db_conn.close()
            return jsonify({'success': False, 'error': 'Project not found'}), 404
        
        # Check if request already exists
        existing = db_conn.execute(
            '''SELECT id FROM collaboration_requests 
               WHERE sender_id = ? AND recipient_id = ? AND project_id = ? AND status = 'pending' ''',
            (sender_id, teammate_id, project_id)
        ).fetchone()
        
        if existing:
            db_conn.close()
            return jsonify({
                'success': False, 
                'error': 'You already have a pending request for this project'
            }), 409
        
        # Create collaboration request
        cursor = db_conn.execute(
            '''INSERT INTO collaboration_requests 
               (sender_id, recipient_id, project_id, message, status, created_at)
               VALUES (?, ?, ?, ?, ?, ?)''',
            (
                sender_id,
                teammate_id,
                project_id,
                message,
                'pending',
                datetime.now().isoformat()
            )
        )
        request_id = cursor.lastrowid
        db_conn.commit()
        
        print(f"✅ Collaboration request created with ID: {request_id}")
        
        # Create notification for recipient
        notification_message = f"{sender['full_name']} wants to collaborate on '{project['title']}'"
        
        db_conn.execute(
            '''INSERT INTO notifications 
               (user_id, type, message, sender_name, project_title, is_read, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?)''',
            (
                teammate_id,
                'incoming_request',
                notification_message,
                sender['full_name'],
                project['title'],
                0,
                datetime.now().isoformat()
            )
        )
        db_conn.commit()
        
        print(f"✅ Notification created for user {teammate_id}")
        
        db_conn.close()
        
        return jsonify({
            'success': True,
            'message': 'Collaboration request sent successfully',
            'request_id': request_id
        }), 201
        
    except Exception as e:
        print(f"❌ Send collaboration request error: {str(e)}")
        traceback.print_exc()
        return jsonify({
            'success': False, 
            'error': str(e)
        }), 500

@app.route('/api/requests/received', methods=['GET', 'OPTIONS'])
@jwt_required()
def get_received_requests():
    """Get received collaboration requests"""
    if request.method == 'OPTIONS':
        return '', 204

    try:
        user_id = get_jwt_identity()
        db = get_db()
        
        requests = db.execute(
            '''SELECT cr.*, u.full_name, p.title 
               FROM collaboration_requests cr
               JOIN users u ON cr.sender_id = u.id
               JOIN projects p ON cr.project_id = p.id
               WHERE cr.recipient_id = ? AND cr.status = 'pending'
               ORDER BY cr.created_at DESC''',
            (user_id,)
        ).fetchall()
        
        request_list = []
        for req in requests:
            request_list.append({
                'id': req['id'],
                'sender_name': req['full_name'],
                'project_title': req['title'],
                'message': req['message'],
                'created_at': req['created_at']
            })
        
        db.close()
        
        return jsonify({
            'success': True,
            'requests': request_list
        }), 200
        
    except Exception as e:
        print(f"❌ Get received requests error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/requests/<int:request_id>/accept', methods=['PUT', 'OPTIONS'])
@jwt_required()
def accept_request(request_id):
    """Accept collaboration request"""
    if request.method == 'OPTIONS':
        return '', 204

    try:
        user_id = get_jwt_identity()
        db = get_db()
        
        # Get request details
        req = db.execute(
            'SELECT * FROM collaboration_requests WHERE id = ? AND recipient_id = ?',
            (request_id, user_id)
        ).fetchone()
        
        if not req:
            db.close()
            return jsonify({'success': False, 'error': 'Request not found'}), 404
        
        # Add user as project member
        db.execute(
            'INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)',
            (req['project_id'], user_id, 'member')
        )
        
        # Update request status
        db.execute(
            'UPDATE collaboration_requests SET status = ? WHERE id = ?',
            ('accepted', request_id)
        )
        
        db.commit()
        db.close()
        
        return jsonify({
            'success': True,
            'message': 'Collaboration request accepted'
        }), 200
        
    except Exception as e:
        print(f"❌ Accept request error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/requests/<int:request_id>/reject', methods=['PUT', 'OPTIONS'])
@jwt_required()
def reject_request(request_id):
    """Reject collaboration request"""
    if request.method == 'OPTIONS':
        return '', 204

    try:
        user_id = get_jwt_identity()
        db = get_db()
        
        # Update request status
        db.execute(
            'UPDATE collaboration_requests SET status = ? WHERE id = ? AND recipient_id = ?',
            ('rejected', request_id, user_id)
        )
        
        db.commit()
        db.close()
        
        return jsonify({
            'success': True,
            'message': 'Collaboration request rejected'
        }), 200
        
    except Exception as e:
        print(f"❌ Reject request error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

# ==================== REVIEWS ====================
@app.route('/api/reviews', methods=['POST', 'OPTIONS'])
@jwt_required()
def submit_review():
    """Submit peer review"""
    if request.method == 'OPTIONS':
        return '', 204

    try:
        reviewer_id = get_jwt_identity()
        data = request.get_json()
        
        required = ['reviewee_id', 'project_id', 'rating', 'comment']
        for field in required:
            if field not in data:
                return jsonify({'success': False, 'error': f'Missing field: {field}'}), 400
        
        if not 1 <= data['rating'] <= 5:
            return jsonify({'success': False, 'error': 'Rating must be between 1 and 5'}), 400
        
        db = get_db()
        
        cursor = db.execute(
            '''INSERT INTO reviews 
               (reviewer_id, reviewee_id, project_id, rating, comment, created_at)
               VALUES (?, ?, ?, ?, ?, ?)''',
            (
                reviewer_id,
                data['reviewee_id'],
                data['project_id'],
                data['rating'],
                data['comment'],
                datetime.now().isoformat()
            )
        )
        db.commit()
        db.close()
        
        return jsonify({
            'success': True,
            'message': 'Review submitted successfully',
            'review_id': cursor.lastrowid
        }), 201
        
    except Exception as e:
        print(f"❌ Submit review error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/reviews/received', methods=['GET', 'OPTIONS'])
@jwt_required()
def get_received_reviews():
    """Get reviews received"""
    if request.method == 'OPTIONS':
        return '', 204

    try:
        user_id = get_jwt_identity()
        db = get_db()
        
        reviews = db.execute(
            '''SELECT r.*, u.full_name 
               FROM reviews r
               JOIN users u ON r.reviewer_id = u.id
               WHERE r.reviewee_id = ?
               ORDER BY r.created_at DESC''',
            (user_id,)
        ).fetchall()
        
        review_list = []
        for review in reviews:
            review_list.append({
                'id': review['id'],
                'reviewer_name': review['full_name'],
                'rating': review['rating'],
                'comment': review['comment'],
                'created_at': review['created_at']
            })
        
        db.close()
        
        return jsonify({
            'success': True,
            'reviews': review_list
        }), 200
        
    except Exception as e:
        print(f"❌ Get received reviews error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/reviews/given', methods=['GET', 'OPTIONS'])
@jwt_required()
def get_given_reviews():
    """Get reviews given"""
    if request.method == 'OPTIONS':
        return '', 204

    try:
        user_id = get_jwt_identity()
        db = get_db()
        
        reviews = db.execute(
            '''SELECT r.*, u.full_name 
               FROM reviews r
               JOIN users u ON r.reviewee_id = u.id
               WHERE r.reviewer_id = ?
               ORDER BY r.created_at DESC''',
            (user_id,)
        ).fetchall()
        
        review_list = []
        for review in reviews:
            review_list.append({
                'id': review['id'],
                'reviewee_name': review['full_name'],
                'rating': review['rating'],
                'comment': review['comment'],
                'created_at': review['created_at']
            })
        
        db.close()
        
        return jsonify({
            'success': True,
            'reviews': review_list
        }), 200
        
    except Exception as e:
        print(f"❌ Get given reviews error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500



# ==================== MAIN ====================
if __name__ == '__main__':
    print("\n" + "="*50)
    print("🚀 Starting CollabSphere Backend")
    print("="*50)
    print(f"📝 Database: {DATABASE}")
    print(f"🌐 API Base URL: http://localhost:5000/api")
    print(f"✨ CORS enabled for localhost:3000 and localhost:5173")
    print("="*50 + "\n")
    
    # Initialize database - check if exists
    if not os.path.exists(DATABASE):
        print("⚠️  Database not found, creating new database...")
        init_db()
    else:
        # Check if tables exist
        try:
            db = get_db()
            cursor = db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")
            if not cursor.fetchone():
                print("⚠️  Tables not found, initializing database...")
                db.close()
                init_db()
            else:
                print("✅ Database and tables verified")
                db.close()
        except Exception as e:
            print(f"⚠️  Error checking database: {e}")
            init_db()
    
    app.run(debug=True, host='0.0.0.0', port=5000)