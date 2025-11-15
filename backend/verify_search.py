# verify_search.py - Test the search query
import sqlite3

DATABASE = 'database.db'

def test_search():
    """Test the search query that your frontend is using"""
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    print("=" * 60)
    print("TESTING FRONTEND SEARCH QUERY")
    print("=" * 60)
    
    # Simulate the exact search your frontend is doing
    user_id = 3  # Current logged in user (admin@example.com)
    skills = ['React', 'Node.js']
    years = ['1st Year', '2nd Year']
    departments = ['Computer Science']
    
    print(f"\n🔍 Search Parameters:")
    print(f"   Exclude User ID: {user_id}")
    print(f"   Skills: {skills}")
    print(f"   Years: {years}")
    print(f"   Departments: {departments}")
    
    # Build the same query as backend
    sql = 'SELECT * FROM users WHERE id != ?'
    params = [user_id]
    
    # Skills filter
    skill_conditions = []
    for skill in skills:
        skill_conditions.append('skills LIKE ?')
        params.append(f'%{skill}%')
    sql += f' AND ({" OR ".join(skill_conditions)})'
    
    # Years filter
    year_placeholders = ','.join(['?' for _ in years])
    sql += f' AND year IN ({year_placeholders})'
    params.extend(years)
    
    # Departments filter
    dept_placeholders = ','.join(['?' for _ in departments])
    sql += f' AND department IN ({dept_placeholders})'
    params.extend(departments)
    
    sql += ' ORDER BY full_name ASC'
    
    print(f"\n📝 SQL Query:")
    print(f"   {sql}")
    print(f"\n📝 Parameters:")
    print(f"   {params}")
    
    # Execute
    cursor.execute(sql, params)
    results = cursor.fetchall()
    
    print(f"\n✅ Results: {len(results)} users found")
    print("-" * 60)
    
    if len(results) == 0:
        print("⚠️  NO MATCHES FOUND!")
        print("\nLet's check what we have:")
        
        # Check departments
        print("\n📊 Available departments:")
        cursor.execute("SELECT DISTINCT department FROM users ORDER BY department")
        for row in cursor.fetchall():
            print(f"   - {row['department']}")
        
        # Check years
        print("\n📊 Available years:")
        cursor.execute("SELECT DISTINCT year FROM users ORDER BY year")
        for row in cursor.fetchall():
            print(f"   - {row['year']}")
            
    else:
        for user in results:
            print(f"\n✓ {user['full_name']}")
            print(f"  Email: {user['email']}")
            print(f"  Year: {user['year']}")
            print(f"  Department: {user['department']}")
            print(f"  Skills: {user['skills']}")
    
    print("\n" + "=" * 60 + "\n")
    
    conn.close()

if __name__ == '__main__':
    test_search()