# ADR-001: Selective Trust Role-Based Access Control (RBAC)

## Status
Accepted

## Context
Conventional educational platforms treat parents as supervisors who require unrestricted real-time access to every action of a student. Research in adolescent psychology demonstrates that pervasive parental surveillance undermines intrinsic motivation, fosters evasion tactics, and prevents teenagers from taking genuine ownership of their academic trajectory.

## Decision
We implement a **Student-Sovereign Trust Model** where the adolescent explicitly controls parental visibility through three granular states:
1. `REVOKED`: All records for the weekly quantum are hidden from the parent portal.
2. `SUMMARY_ONLY`: Parents see high-level weekly goals, Saturday project deliverables, and the Sunday retrospective, but cannot inspect minute-by-minute weekday lesson notes or raw media dumps.
3. `FULL_ACCESS`: Full transparency across all academic slots and attachments.

The access level can be adjusted by the student at any time in the Weekly Retro view.

## Consequences
- **Positive:** Students experience authentic trust, leading to honest retrospective responses rather than sanitized logs written to appease parents.
- **Enforcement:** Enforced at the API route handler level (`/api/v1/weeks/[weekId]` and `/api/v1/media/files/[...path]`).
