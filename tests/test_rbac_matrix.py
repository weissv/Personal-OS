#!/usr/bin/env python3
"""
UNIT TEST: Selective Trust RBAC Matrix (Invariant I2 & I4)
Validates access rules across STUDENT, PARENT (REVOKED/SUMMARY/FULL), MENTOR, and ADMIN.
"""

def can_access_student(user: dict, target_student_id: str, mode: str, parent_link: dict = None, target_student_grade: int = None) -> bool:
    role = user.get('role')
    user_id = user.get('id')

    # ADMIN: Full access
    if role == 'ADMIN':
        return True

    # STUDENT: Can only read/write own data
    if role == 'STUDENT':
        return user_id == target_student_id

    # Non-student/non-admin write access is forbidden
    if mode == 'write':
        return False

    # PARENT: Read-only access governed by student-set accessLevel
    if role == 'PARENT':
        if not parent_link:
            return False
        return parent_link.get('accessLevel') != 'REVOKED'

    # MENTOR: Read-only access within assigned grade level
    if role == 'MENTOR':
        mentor_grade = user.get('gradeLevel')
        if mentor_grade is None:
            return True # School-wide mentor
        return mentor_grade == target_student_grade

    return False

def filter_week_view_for_parent(week_days: list, parent_access_level: str) -> list:
    """Enforces Invariant I2 on Weekly Spread response payload."""
    if parent_access_level == 'FULL_ACCESS':
        return week_days
    if parent_access_level == 'SUMMARY_ONLY':
        # Academic weekday slots stripped; only Saturday Self-Study slots preserved
        return [
            {**d, 'slots': d['slots'] if d.get('isSelfStudy') else []}
            for d in week_days
        ]
    return [] # REVOKED: Nothing

def run_tests():
    print("Running Test: Selective Trust RBAC Matrix...")

    student_a = {'id': 'st-a', 'role': 'STUDENT', 'gradeLevel': 9}
    student_b = {'id': 'st-b', 'role': 'STUDENT', 'gradeLevel': 9}
    parent_a = {'id': 'pr-a', 'role': 'PARENT'}
    mentor_grade9 = {'id': 'mn-9', 'role': 'MENTOR', 'gradeLevel': 9}
    mentor_grade8 = {'id': 'mn-8', 'role': 'MENTOR', 'gradeLevel': 8}
    admin = {'id': 'adm', 'role': 'ADMIN'}

    # 1. Student isolation
    assert can_access_student(student_a, 'st-a', 'read') is True
    assert can_access_student(student_a, 'st-a', 'write') is True
    assert can_access_student(student_a, 'st-b', 'read') is False, "Student cannot read peer data"
    assert can_access_student(student_a, 'st-b', 'write') is False, "Student cannot write peer data"

    # 2. Parent Selective Trust
    # State: REVOKED
    link_revoked = {'accessLevel': 'REVOKED'}
    assert can_access_student(parent_a, 'st-a', 'read', parent_link=link_revoked) is False, "REVOKED must deny access"
    assert can_access_student(parent_a, 'st-a', 'write', parent_link=link_revoked) is False

    # State: SUMMARY_ONLY
    link_summary = {'accessLevel': 'SUMMARY_ONLY'}
    assert can_access_student(parent_a, 'st-a', 'read', parent_link=link_summary) is True
    assert can_access_student(parent_a, 'st-a', 'write', parent_link=link_summary) is False, "Parent cannot write"

    # State: FULL_ACCESS
    link_full = {'accessLevel': 'FULL_ACCESS'}
    assert can_access_student(parent_a, 'st-a', 'read', parent_link=link_full) is True
    assert can_access_student(parent_a, 'st-a', 'write', parent_link=link_full) is False

    # 3. Payload filtering under SUMMARY_ONLY
    mock_days = [
        {'dayOfWeek': 1, 'isSelfStudy': False, 'slots': [{'id': 'lesson-1', 'title': 'Алгебра'}]},
        {'dayOfWeek': 6, 'isSelfStudy': True, 'slots': [{'id': 'sat-proj', 'title': 'Автополив'}]}
    ]
    filtered = filter_week_view_for_parent(mock_days, 'SUMMARY_ONLY')
    assert len(filtered[0]['slots']) == 0, "Weekday academic slots must be stripped in SUMMARY_ONLY"
    assert len(filtered[1]['slots']) == 1, "Saturday project slots must be visible in SUMMARY_ONLY"

    # 4. Mentor Cohort Boundary
    assert can_access_student(mentor_grade9, 'st-a', 'read', target_student_grade=9) is True
    assert can_access_student(mentor_grade8, 'st-a', 'read', target_student_grade=9) is False, "Grade 8 mentor cannot snoop on Grade 9"
    assert can_access_student(mentor_grade9, 'st-a', 'write', target_student_grade=9) is False, "Mentor cannot modify student entries"

    # 5. Admin Godmode
    assert can_access_student(admin, 'st-a', 'read') is True
    assert can_access_student(admin, 'st-a', 'write') is True

    print("✓ Selective Trust RBAC tests passed (14/14 assertions)")

if __name__ == '__main__':
    run_tests()
