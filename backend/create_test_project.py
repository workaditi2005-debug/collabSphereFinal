#!/usr/bin/env python3
"""
Create test projects in the database for testing collaboration requests
"""
import sqlite3
from datetime import datetime

DATABASE = 'database.db'

def create_test_projects():
    """Add test projects to database"""
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    test_projects = [
        {
            'user_id': 1,  # John Doe's project
            'title': 'Python Backend API',
            'description': 'Build a REST API using Flask',
            'status': 'todo'
        },
        {
            'user_id': 1,
            'title': 'Machine Learning Model',
            'description': 'Create an ML model for classification',
            'status': 'todo'
        },
        {
            'user_id': 1,
            'title': 'Web Development Project',
            'description': 'Build a full-stack web application',
            'status': 'inProgress'
        }
    ]
    
    for project in test_projects:
        cursor.execute(
            '''INSERT INTO projects (user_id, title, description, status, created_at)
               VALUES (?, ?, ?, ?, ?)''',
            (
                project['user_id'],
                project['title'],
                project['description'],
                project['status'],
                datetime.now().isoformat()
            )
        )
        print(f"✅ Created project: {project['title']}")
    
    conn.commit()
    conn.close()
    print("\n✅ Project creation complete!")
    
    # Show projects
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    projects = cursor.execute('SELECT id, title FROM projects').fetchall()
    print("\nProjects in DB:")
    for pid, title in projects:
        print(f"  - ID: {pid}, Title: {title}")
    conn.close()

if __name__ == '__main__':
    create_test_projects()
