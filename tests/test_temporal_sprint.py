#!/usr/bin/env python3
"""
UNIT TEST: Temporal Sprint Mathematics & Tashkent Time Quantum
Corresponds to src/lib/sprint.ts.
"""

from datetime import datetime, timezone, timedelta

TASHKENT_OFFSET = timedelta(hours=5) # UTC+5, no DST

def today_utc(now_utc: datetime) -> datetime:
    t = now_utc + TASHKENT_OFFSET
    return datetime(t.year, t.month, t.day, tzinfo=timezone.utc)

def today_weekday_tashkent(now_utc: datetime) -> int:
    t = now_utc + TASHKENT_OFFSET
    d = t.isoweekday() # 1 = Monday, 7 = Sunday
    return d

def monday_on_or_before(d: datetime) -> datetime:
    dow = d.isoweekday()
    return d - timedelta(days=(dow - 1))

def get_current_week_number(start_date: datetime, weeks_total: int, current_date: datetime) -> int:
    diff_days = (current_date - start_date).days
    week = (diff_days // 7) + 1
    return min(max(week, 1), weeks_total)

def run_tests():
    print("Running Test: Temporal Sprint & Tashkent Time Quantum...")

    # 1. Tashkent Day Boundary (UTC+5)
    # 2026-10-27 20:00:00 UTC = 2026-10-28 01:00:00 in Tashkent (Next Calendar Day!)
    utc_evening = datetime(2026, 10, 27, 20, 0, 0, tzinfo=timezone.utc)
    tashkent_day = today_utc(utc_evening)
    assert tashkent_day.day == 28, f"Expected 28th in Tashkent, got {tashkent_day.day}"

    # 2. Weekday calculation in Tashkent
    # 2026-10-25 19:30:00 UTC is Sunday in UTC, but 00:30 Monday in Tashkent
    utc_sun_night = datetime(2026, 10, 25, 19, 30, 0, tzinfo=timezone.utc)
    dow = today_weekday_tashkent(utc_sun_night)
    assert dow == 1, f"Expected Monday (1) in Tashkent, got {dow}"

    # 3. Monday anchor calculation
    wednesday = datetime(2026, 10, 28, tzinfo=timezone.utc)
    monday = monday_on_or_before(wednesday)
    assert monday.day == 26, f"Expected Monday to be 26th, got {monday.day}"
    assert monday.isoweekday() == 1, "Must be Monday (dow=1)"

    # 4. Sprint week progression
    sprint_start = datetime(2026, 9, 7, tzinfo=timezone.utc) # Week 1 start (Mon)
    
    # Week 1
    w1 = get_current_week_number(sprint_start, 10, datetime(2026, 9, 9, tzinfo=timezone.utc))
    assert w1 == 1, f"Expected Week 1, got {w1}"

    # Week 3
    w3 = get_current_week_number(sprint_start, 10, datetime(2026, 9, 23, tzinfo=timezone.utc))
    assert w3 == 3, f"Expected Week 3, got {w3}"

    # Clamping bounds: before sprint start returns 1
    w_early = get_current_week_number(sprint_start, 10, datetime(2026, 8, 1, tzinfo=timezone.utc))
    assert w_early == 1, "Must clamp to minimum week 1"

    # Clamping bounds: after week 10 returns 10
    w_late = get_current_week_number(sprint_start, 10, datetime(2027, 1, 1, tzinfo=timezone.utc))
    assert w_late == 10, "Must clamp to maximum week 10"

    print("✓ Temporal Sprint tests passed (7/7 assertions)")

if __name__ == '__main__':
    run_tests()
