#!/usr/bin/env python3
"""
Seed test users into the database for testing
"""
import sqlite3
from datetime import datetime
from flask_bcrypt import Bcrypt
import os

# Initialize bcrypt
bcrypt = Bcrypt()

DATABASE = 'database.db'

def seed_test_users():
    """Add test users to database"""
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    test_users = [
        {
            'full_name': 'Archita Mitra',
            'email': 'archita@example.com',
            'password': 'password123',
            'institution': 'IIT Delhi',
            'department': 'Computer Science',
            'year': '3rd Year',
            'skills': 'Python,React,JavaScript,Machine Learning'
        },
        {
            'full_name': 'Raj Kumar',
            'email': 'raj@example.com',
            'password': 'password123',
            'institution': 'IIT Delhi',
            'department': 'Computer Science',
            'year': '2nd Year',
            'skills': 'Java,Spring Boot,PostgreSQL,Docker'
        },
        {
            'full_name': 'Priya Singh',
            'email': 'priya@example.com',
            'password': 'password123',
            'institution': 'IIT Delhi',
            'department': 'Information Technology',
            'year': '3rd Year',
            'skills': 'Node.js,MongoDB,Express.js,AWS'
        }
    ]
    
    for user in test_users:
        # Check if user already exists
        existing = cursor.execute(
            'SELECT id FROM users WHERE email = ?',
            (user['email'],)
        ).fetchone()
        
        if not existing:
            hashed_pwd = bcrypt.generate_password_hash(user['password']).decode('utf-8')
            cursor.execute(
                '''INSERT INTO users (full_name, email, password, institution, 
                   department, year, skills, created_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)''',
                (
                    user['full_name'],
                    user['email'],
                    hashed_pwd,
                    user['institution'],
                    user['department'],
                    user['year'],
                    user['skills'],
                    datetime.now().isoformat()
                )
            )
            print(f"✅ Added user: {user['full_name']}")
        else:
            print(f"⏭️  User already exists: {user['full_name']}")
    
    conn.commit()
    conn.close()
    print("\n✅ Seeding complete!")

if __name__ == '__main__':
    seed_test_users()
