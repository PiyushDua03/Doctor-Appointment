/**
 * conflictService.js — Interval-overlap detection across Doctor and Room resources
 *
 * Ported from the existing frontend js/core/conflict.js.
 * Core algorithm preserved exactly:
 *   Two intervals A = [startA, endA) and B = [startB, endB) overlap iff:
 *     startA < endB  AND  startB < endA
 *
 * Back-to-back appointments (10:00–10:30 then 10:30–11:00) are NOT conflicts.
 *
 * Demonstrates: comparison operators, logical AND, arrow functions,
 * .filter() higher-order function, destructuring, scope
 */

'use strict';

const { timeToMinutes } = require('./timeUtils');

/**
 * hasOverlap — check whether two half-open time intervals overlap.
 * Intervals are in "HH:mm" format and treated as [start, end).
 *
 * @param {{ start: string, end: string }} intervalA
 * @param {{ start: string, end: string }} intervalB
 * @returns {boolean}
 */
const hasOverlap = (intervalA, intervalB) => {
  const startA = timeToMinutes(intervalA.start);
  const endA   = timeToMinutes(intervalA.end);
  const startB = timeToMinutes(intervalB.start);
  const endB   = timeToMinutes(intervalB.end);

  // Two half-open intervals [startA, endA) and [startB, endB) overlap iff:
  return startA < endB && startB < endA;
};

/**
 * findDoctorConflicts — return all existing appointments that conflict with
 * a proposed slot for the given doctor on the given date.
 *
 * @param {string} doctorId
 * @param {string} date        "YYYY-MM-DD"
 * @param {string} startTime   "HH:mm"
 * @param {string} endTime     "HH:mm"
 * @param {Array}  appointments — all active appointments
 * @returns {Array} conflicting appointments (may be empty)
 */
const findDoctorConflicts = (doctorId, date, startTime, endTime, appointments) => {
  const proposed = { start: startTime, end: endTime };

  return appointments.filter((apt) => {
    if (apt.doctorId !== doctorId) return false;
    if (apt.date !== date) return false;
    if (apt.status === 'cancelled') return false;

    return hasOverlap(proposed, { start: apt.startTime, end: apt.endTime });
  });
};

/**
 * findRoomConflicts — return all existing appointments that conflict with
 * a proposed slot for the given room on the given date.
 *
 * @param {string} roomId
 * @param {string} date
 * @param {string} startTime
 * @param {string} endTime
 * @param {Array}  appointments
 * @returns {Array}
 */
const findRoomConflicts = (roomId, date, startTime, endTime, appointments) => {
  const proposed = { start: startTime, end: endTime };

  return appointments.filter((apt) => {
    if (apt.roomId !== roomId) return false;
    if (apt.date !== date) return false;
    if (apt.status === 'cancelled') return false;

    return hasOverlap(proposed, { start: apt.startTime, end: apt.endTime });
  });
};

/**
 * isDoctorFree — convenience boolean check.
 * @returns {boolean}
 */
const isDoctorFree = (doctorId, date, startTime, endTime, appointments) => {
  return findDoctorConflicts(doctorId, date, startTime, endTime, appointments).length === 0;
};

/**
 * isRoomFree — convenience boolean check.
 * @returns {boolean}
 */
const isRoomFree = (roomId, date, startTime, endTime, appointments) => {
  return findRoomConflicts(roomId, date, startTime, endTime, appointments).length === 0;
};

module.exports = {
  hasOverlap,
  findDoctorConflicts,
  findRoomConflicts,
  isDoctorFree,
  isRoomFree
};
