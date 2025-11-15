# seed_users.py - Run this to add test users to your database

import sqlite3
from datetime import datetime
from flask_bcrypt import Bcrypt

DATABASE = 'database.db'

# Initialize bcrypt for password hashing
bcrypt = Bcrypt()

TEST_USERS = [
    {
        'full_name': 'Alice Johnson',
        'email': 'alice@university.edu',
        'password': 'password123',
        'institution': 'Tech University',
        'department': 'Computer Science',
        'year': '1st Year',
        'skills': 'React,JavaScript,HTML,CSS',
        'linkedin_url': 'https://linkedin.com/in/alicejohnson',
    },
    {
        'full_name': 'Bob Smith',
        'email': 'bob@university.edu',
        'password': 'password123',
        'institution': 'Tech University',
        'department': 'Computer Science',
        'year': '2nd Year',
        'skills': 'Node.js,Python,MongoDB,Express',
        'linkedin_url': 'https://linkedin.com/in/bobsmith',
    },
    {
        'full_name': 'Carol Williams',
        'email': 'carol@university.edu',
        'password': 'password123',
        'institution': 'Tech University',
        'department': 'Computer Science',
        'year': '1st Year',
        'skills': 'React,Node.js,TypeScript,PostgreSQL',
        'linkedin_url': 'https://linkedin.com/in/carolwilliams',
    },
    {
        'full_name': 'David Brown',
        'email': 'david@university.edu',
        'password': 'password123',
        'institution': 'Tech University',
        'department': 'Information Technology',
        'year': '2nd Year',
        'skills': 'Java,Spring Boot,MySQL,Docker',
        'linkedin_url': 'https://linkedin.com/in/davidbrown',
    },
    {
        'full_name': 'Emma Davis',
        'email': 'emma@university.edu',
        'password': 'password123',
        'institution': 'Tech University',
        'department': 'Computer Science',
        'year': '3rd Year',
        'skills': 'React,Redux,Node.js,GraphQL',
        'linkedin_url': 'https://linkedin.com/in/emmadavis',
    },
    {
        'full_name': 'Frank Miller',
        'email': 'frank@university.edu',
        'password': 'password123',
        'institution': 'Tech University',
        'department': 'Computer Science',
        'year': '2nd Year',
        'skills': 'Python,Django,React,AWS',
        'linkedin_url': 'https://linkedin.com/in/frankmiller',
    },
    {
        'full_name': 'Grace Wilson',
        'email': 'grace@university.edu',
        'password': 'password123',
        'institution': 'Tech University',
        'department': 'Data Science',
        'year': '1st Year',
        'skills': 'Python,Machine Learning,TensorFlow,Pandas',
        'linkedin_url': 'https://linkedin.com/in/gracewilson',
    },
    {
        'full_name': 'Henry Moore',
        'email': 'henry@university.edu',
        'password': 'password123',
        'institution': 'Tech University',
        'department': 'Computer Science',
        'year': '4th Year',
        'skills': 'Node.js,React,Kubernetes,Microservices',
        'linkedin_url': 'https://linkedin.com/in/henrymoore',
    },
]

def seed_users():
    """Add test users to database"""
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    print("=" * 60)
    print("SEEDING TEST USERS")
    print("=" * 60)
    
    added_count = 0
    skipped_count = 0
    
    for user_data in TEST_USERS:
        # Check if user already exists
        cursor.execute('SELECT id FROM users WHERE email = ?', (user_data['email'],))
        existing = cursor.fetchone()
        
        if existing:
            print(f"⏭️  Skipped: {user_data['full_name']} (already exists)")
            skipped_count += 1
            continue
        
        # Hash password
        hashed_password = bcrypt.generate_password_hash(user_data['password']).decode('utf-8')
        
        # Insert user
        cursor.execute('''
            INSERT INTO users 
            (full_name, email, password, institution, department, year, skills, linkedin_url, profile_pic, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            user_data['full_name'],
            user_data['email'],
            hashed_password,
            user_data['institution'],
            user_data['department'],
            user_data['year'],
            user_data['skills'],
            user_data['linkedin_url'],
            '',
            datetime.now().isoformat()
        ))
        
        print(f"✅ Added: {user_data['full_name']} ({user_data['year']}, {user_data['department']})")
        print(f"   Skills: {user_data['skills']}")
        added_count += 1
    
    conn.commit()
    conn.close()
    
    print("\n" + "-" * 60)
    print(f"✅ Added: {added_count} users")
    print(f"⏭️  Skipped: {skipped_count} users")
    print("-" * 60)
    print("\n💡 Test credentials: email@university.edu / password123")
    print("=" * 60 + "\n")

if __name__ == '__main__':
    seed_users()