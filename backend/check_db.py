# check_db.py - Run this to check your database contents

import sqlite3

DATABASE = 'database.db'

def check_database():
    """Check database contents and structure"""
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    print("=" * 60)
    print("DATABASE CHECK")
    print("=" * 60)
    
    # Check total users
    cursor.execute("SELECT COUNT(*) as count FROM users")
    total_users = cursor.fetchone()['count']
    print(f"\n📊 Total Users: {total_users}")
    
    if total_users == 0:
        print("\n⚠️  NO USERS FOUND IN DATABASE!")
        print("   You need to register some users first.\n")
        conn.close()
        return
    
    # Show all users
    print("\n" + "-" * 60)
    print("ALL USERS:")
    print("-" * 60)
    
    cursor.execute("""
        SELECT id, full_name, email, year, department, institution, skills 
        FROM users 
        ORDER BY id
    """)
    
    users = cursor.fetchall()
    
    for user in users:
        print(f"\n👤 User #{user['id']}: {user['full_name']}")
        print(f"   Email: {user['email']}")
        print(f"   Year: {user['year']}")
        print(f"   Department: {user['department']}")
        print(f"   Institution: {user['institution']}")
        print(f"   Skills: {user['skills']}")
    
    # Check users by year
    print("\n" + "-" * 60)
    print("USERS BY YEAR:")
    print("-" * 60)
    
    cursor.execute("""
        SELECT year, COUNT(*) as count 
        FROM users 
        GROUP BY year 
        ORDER BY year
    """)
    
    for row in cursor.fetchall():
        print(f"   {row['year']}: {row['count']} users")
    
    # Check users by department
    print("\n" + "-" * 60)
    print("USERS BY DEPARTMENT:")
    print("-" * 60)
    
    cursor.execute("""
        SELECT department, COUNT(*) as count 
        FROM users 
        GROUP BY department 
        ORDER BY department
    """)
    
    for row in cursor.fetchall():
        print(f"   {row['department']}: {row['count']} users")
    
    # Check users with specific skills
    print("\n" + "-" * 60)
    print("USERS WITH SPECIFIC SKILLS:")
    print("-" * 60)
    
    for skill in ['React', 'Node.js', 'Python', 'JavaScript', 'Java']:
        cursor.execute("""
            SELECT COUNT(*) as count 
            FROM users 
            WHERE skills LIKE ?
        """, (f'%{skill}%',))
        count = cursor.fetchone()['count']
        print(f"   {skill}: {count} users")
    
    # Test search query
    print("\n" + "-" * 60)
    print("TEST SEARCH QUERY:")
    print("-" * 60)
    print("Searching for: 1st Year OR 2nd Year + Computer Science + (React OR Node.js)")
    
    cursor.execute("""
        SELECT id, full_name, year, department, skills
        FROM users
        WHERE id != 0
        AND (skills LIKE '%React%' OR skills LIKE '%Node.js%')
        AND year IN ('1st Year', '2nd Year')
        AND department IN ('Computer Science')
    """)
    
    results = cursor.fetchall()
    print(f"\n✅ Found {len(results)} matching users:")
    
    if len(results) == 0:
        print("   ⚠️  No matches found!")
        print("\n   Possible reasons:")
        print("   - No users have skills 'React' or 'Node.js'")
        print("   - No users are in '1st Year' or '2nd Year'")
        print("   - No users are in 'Computer Science' department")
        print("   - Skills might be stored with different casing")
    else:
        for user in results:
            print(f"\n   ✓ {user['full_name']}")
            print(f"     Year: {user['year']}")
            print(f"     Department: {user['department']}")
            print(f"     Skills: {user['skills']}")
    
    print("\n" + "=" * 60 + "\n")
    
    conn.close()

if __name__ == '__main__':
    check_database()