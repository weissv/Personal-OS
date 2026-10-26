# ADR-002: Phone Vacuum Bookends & Temporal Routing

## Status
Accepted

## Context
Students surrender their smartphones at 08:00 and retrieve them at 16:30. An application designed for constant throughout-the-day engagement is fundamentally incompatible with the school environment.

## Decision
We decouple digital interaction from the academic hours:
1. **Morning Focus Slot (07:30–08:15):** The app defaults to `MorningFocusView`. Optimized for 60–90 seconds of total screen time. Displays a countdown timer until phone drop-off.
2. **Evening Debrief Slot (16:45–21:00):** The app defaults to `EveningDebriefView`. Optimized for 5–7 minutes of batch triage (`DONE`, `MIGRATED`, `DROPPED`) and media offload.
3. **Smart Temporal Routing (`getSmartInitialSchedule`):** The client router inspects the device time and day of week:
   - Weekdays before 13:00 $\rightarrow$ `morning` view.
   - Weekdays after 13:00 $\rightarrow$ `evening` view.
   - Saturday $\rightarrow$ `saturday` Self-Study view.
   - Sunday $\rightarrow$ `retro` Weekly Retrospective view.
   - Manual override navigation is always preserved.

## Consequences
Students are protected from compulsive phone-checking, respecting the physical school environment while reinforcing deliberate daily bookends.
