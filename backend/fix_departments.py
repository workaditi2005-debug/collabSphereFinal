# fix_departments.py - Standardize department names
import sqlite3

DATABASE = 'database.db'

def fix_departments():
    """Standardize department names to match frontend filters"""
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    print("=" * 60)
    print("FIXING DEPARTMENT NAMES")
    print("=" * 60)
    
    # Map of old names to new names
    department_mapping = {
        'CS': 'Computer Science',
        'cse': 'Computer Science',
        'CSE': 'Computer Science',
        'IT': 'Information Technology',
        'DS': 'Data Science',
    }
    
    print("\n📝 Current departments:")
    cursor.execute("SELECT DISTINCT department FROM users ORDER BY department")
    for row in cursor.fetchall():
        dept = row[0]
        new_dept = department_mapping.get(dept, dept)
        print(f"   {dept} -> {new_dept}")
    
    # Update departments
    updated = 0
    for old_name, new_name in department_mapping.items():
        cursor.execute(
            'UPDATE users SET department = ? WHERE department = ?',
            (new_name, old_name)
        )
        count = cursor.rowcount
        if count > 0:
            print(f"\n✅ Updated {count} users from '{old_name}' to '{new_name}'")
            updated += count
    
    conn.commit()
    
    print("\n" + "-" * 60)
    print(f"✅ Total updates: {updated}")
    print("-" * 60)
    
    print("\n📊 Updated departments:")
    cursor.execute("SELECT DISTINCT department FROM users ORDER BY department")
    for row in cursor.fetchall():
        cursor.execute("SELECT COUNT(*) FROM users WHERE department = ?", (row[0],))
        count = cursor.fetchone()[0]
        print(f"   {row[0]}: {count} users")
    
    print("\n" + "=" * 60 + "\n")
    
    conn.close()

if __name__ == '__main__':
    fix_departments()