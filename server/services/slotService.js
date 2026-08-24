/**
 * slotService.js — Next-available-slot finder
 *
 * Ported from the existing frontend js/core/slotSearch.js.
 * Algorithm preserved exactly:
 *   1. Build 7-day date range starting from requested date
 *   2. For each date, get doctor's availability windows for that day-of-week
 *   3. Within each window, sweep a cursor at 15-min increments
 *   4. At each cursor position, check:
 *      a. Doctor is free for [cursor, cursor + duration)
 *      b. A room can be assigned for that interval
 *   5. Return the first slot that satisfies both conditions
 *
 * Demonstrates: nested for...of, while loop, Math.max, early return,
 * function composition, scope
 */

'use strict';

const { timeToMinutes, minutesToTime, getDayOfWeek, getDateRange } = require('./timeUtils');
const { isDoctorFree } = require('./conflictService');
const { assignRoom } = require('./roomService');

const GRANULARITY = 15; // minutes

/**
 * findNextAvailableSlot — search for the nearest open slot.
 *
 * @param {string} doctorId
 * @param {string} requestedDate   "YYYY-MM-DD" — start of search window
 * @param {string} requestedStart  "HH:mm" — earliest time on first day
 * @param {number} duration        minutes (15, 30, 45, or 60)
 * @param {Array}  rooms           all room objects
 * @param {Array}  doctors         all doctor objects (need availability windows)
 * @param {Array}  appointments    all active appointments
 * @returns {{ date: string, startTime: string, endTime: string, roomId: string }|null}
 */
const findNextAvailableSlot = (
  doctorId,
  requestedDate,
  requestedStart,
  duration,
  rooms,
  doctors,
  appointments
) => {
  // Find the doctor object (need availability windows)
  const doctor = doctors.find((d) => (d.doctorId || d.id) === doctorId);
  if (!doctor) return null;

  // Build 7-day search window
  const dateRange = getDateRange(requestedDate, 7);
  const requestedStartMins = timeToMinutes(requestedStart);

  for (const date of dateRange) {
    const dayName = getDayOfWeek(date);
    const windows = doctor.availableSlots[dayName];

    // Doctor doesn't work this day — skip
    if (!windows || windows.length === 0) continue;

    for (const window of windows) {
      const windowStartMins = timeToMinutes(window.start);
      const windowEndMins   = timeToMinutes(window.end);

      // On the first day (requested date), start cursor at the requested time
      // or the window start, whichever is later.
      // On subsequent days, start at the window's start.
      let cursorStart;
      if (date === requestedDate) {
        cursorStart = Math.max(windowStartMins, requestedStartMins);
      } else {
        cursorStart = windowStartMins;
      }

      // Align cursor to the nearest 15-minute boundary at or after cursorStart
      const remainder = cursorStart % GRANULARITY;
      if (remainder !== 0) {
        cursorStart = cursorStart + (GRANULARITY - remainder);
      }

      // Sweep through the window at GRANULARITY increments
      let cursor = cursorStart;

      while (cursor + duration <= windowEndMins) {
        const candidateStart = minutesToTime(cursor);
        const candidateEnd   = minutesToTime(cursor + duration);

        // Check 1: Is the doctor free?
        const doctorFree = isDoctorFree(
          doctorId, date, candidateStart, candidateEnd, appointments
        );

        if (doctorFree) {
          // Check 2: Can we assign a room?
          const roomId = assignRoom(
            doctorId, date, candidateStart, candidateEnd, rooms, appointments
          );

          if (roomId !== null) {
            // Found a valid slot!
            return {
              date,
              startTime: candidateStart,
              endTime: candidateEnd,
              roomId
            };
          }
        }

        cursor += GRANULARITY;
      }
    }
  }

  // No slot found within the 7-day window
  return null;
};

module.exports = {
  findNextAvailableSlot,
  SLOT_GRANULARITY: GRANULARITY
};
