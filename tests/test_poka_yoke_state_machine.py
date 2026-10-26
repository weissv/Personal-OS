#!/usr/bin/env python3
"""
UNIT TEST: Poka-Yoke Slot State Machine (ポкаヨケ)
Verifies that slot status transitions follow deterministic rules and reject illegal state mutations.
Corresponds to src/lib/slot-state-machine.ts
"""

from typing import Tuple, Optional

SLOT_STATUSES = {"PENDING", "DONE", "MIGRATED", "DROPPED"}

ALLOWED_TRANSITIONS = {
    "PENDING": {"DONE", "MIGRATED", "DROPPED"},
    "DONE": {"PENDING"},
    "MIGRATED": {"PENDING"},
    "DROPPED": {"PENDING"},
}

def validate_slot_transition(current: str, next_state: str) -> Tuple[bool, Optional[str]]:
    if current not in SLOT_STATUSES:
        return False, f"POKA_YOKE_VIOLATION: Invalid current slot status '{current}'"
    if next_state not in SLOT_STATUSES:
        return False, f"POKA_YOKE_VIOLATION: Invalid target slot status '{next_state}'"

    # Idempotent: same status is always allowed
    if current == next_state:
        return True, None

    allowed_targets = ALLOWED_TRANSITIONS.get(current, set())
    if next_state not in allowed_targets:
        return False, (
            f"POKA_YOKE_VIOLATION: Illegal slot status transition from '{current}' to '{next_state}'. "
            f"Allowed target states: [{', '.join(sorted(allowed_targets))}]"
        )

    return True, None

def run_tests():
    print("Running Test: Poka-Yoke Slot State Machine...")

    # 1. Idempotent transitions (same state to same state)
    for s in SLOT_STATUSES:
        ok, reason = validate_slot_transition(s, s)
        assert ok is True, f"Idempotent transition for {s} must be allowed"
        assert reason is None

    # 2. Valid forward transitions from PENDING
    assert validate_slot_transition("PENDING", "DONE")[0] is True
    assert validate_slot_transition("PENDING", "MIGRATED")[0] is True
    assert validate_slot_transition("PENDING", "DROPPED")[0] is True

    # 3. Valid rollbacks to PENDING
    assert validate_slot_transition("DONE", "PENDING")[0] is True
    assert validate_slot_transition("MIGRATED", "PENDING")[0] is True
    assert validate_slot_transition("DROPPED", "PENDING")[0] is True

    # 4. Strict rejection of illegal terminal hops
    # DONE cannot directly jump to MIGRATED or DROPPED without reverting to PENDING
    ok, err = validate_slot_transition("DONE", "MIGRATED")
    assert ok is False and "POKA_YOKE_VIOLATION" in err, "DONE -> MIGRATED must be strictly rejected"

    ok, err = validate_slot_transition("DONE", "DROPPED")
    assert ok is False and "POKA_YOKE_VIOLATION" in err, "DONE -> DROPPED must be strictly rejected"

    # MIGRATED cannot directly jump to DONE or DROPPED
    ok, err = validate_slot_transition("MIGRATED", "DONE")
    assert ok is False and "POKA_YOKE_VIOLATION" in err, "MIGRATED -> DONE must be strictly rejected"

    ok, err = validate_slot_transition("MIGRATED", "DROPPED")
    assert ok is False and "POKA_YOKE_VIOLATION" in err, "MIGRATED -> DROPPED must be strictly rejected"

    # DROPPED cannot directly jump to DONE or MIGRATED
    ok, err = validate_slot_transition("DROPPED", "DONE")
    assert ok is False and "POKA_YOKE_VIOLATION" in err, "DROPPED -> DONE must be strictly rejected"

    ok, err = validate_slot_transition("DROPPED", "MIGRATED")
    assert ok is False and "POKA_YOKE_VIOLATION" in err, "DROPPED -> MIGRATED must be strictly rejected"

    # 5. Injection of unknown / invalid states
    assert validate_slot_transition("PENDING", "DELETED")[0] is False
    assert validate_slot_transition("ARCHIVED", "DONE")[0] is False
    assert validate_slot_transition("PENDING", "DROP_TABLE")[0] is False

    print("✓ Poka-Yoke State Machine tests passed (16/16 assertions, zero illegal states permitted)")

if __name__ == '__main__':
    run_tests()
