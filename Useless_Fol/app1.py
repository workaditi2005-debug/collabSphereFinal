from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_bcrypt import Bcrypt
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
import sqlite3
from datetime import datetime, timedelta
import os
from functools import wraps
import traceback
import json

app = Flask(__name__)

# ==================== CONFIGURATION ====================
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'your-secret-key-change-in-production')
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'jwt-secret-key-change-in-production')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(days=7)

# ==================== CORS CONFIGURATION ====================
CORS(app, resources={
    r"/api/*": {
        "origins": ["http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:3000", "http://127.0.0.1:5173"],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True,
        "max_age": 3600
    }
})

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


        
# ==================== COLLABORATION REQUESTS ====================
@app.route('/api/requests/send', methods=['POST', 'OPTIONS'])
@jwt_required()
def send_collaboration_request():
    """Send collaboration request"""
    if request.method == 'OPTIONS':
        return '', 204

    try:
        sender_id = get_jwt_identity()
        data = request.get_json()
        
        required = ['recipient_id', 'project_id', 'message']
        for field in required:
            if field not in data:
                return jsonify({'success': False, 'error': f'Missing field: {field}'}), 400
        
        db = get_db()
        
        # Get sender and recipient info
        sender = db.execute('SELECT full_name FROM users WHERE id = ?', (sender_id,)).fetchone()
        project = db.execute('SELECT title FROM projects WHERE id = ?', (data['project_id'],)).fetchone()
        
        # Create request
        cursor = db.execute(
            '''INSERT INTO collaboration_requests 
               (sender_id, recipient_id, project_id, message, status, created_at)
               VALUES (?, ?, ?, ?, ?, ?)''',
            (
                sender_id,
                data['recipient_id'],
                data['project_id'],
                data['message'],
                'pending',
                datetime.now().isoformat()
            )
        )
        db.commit()
        
        # Create notification for recipient
        db.execute(
            '''INSERT INTO notifications 
               (user_id, type, message, sender_name, project_title, created_at)
               VALUES (?, ?, ?, ?, ?, ?)''',
            (
                data['recipient_id'],
                'incoming_request',
                data['message'],
                sender['full_name'] if sender else 'Unknown',
                project['title'] if project else 'Unknown',
                datetime.now().isoformat()
            )
        )
        db.commit()
        
        db.close()
        
        return jsonify({
            'success': True,
            'message': 'Collaboration request sent successfully',
            'request_id': cursor.lastrowid
        }), 201
        
    except Exception as e:
        print(f"❌ Send collaboration request error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

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