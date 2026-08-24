/**
 * timeUtils.js — Time parsing, formatting, interval math, and date utilities
 *
 * Ported from the existing frontend js/utils/time.js.
 * All functions preserve the same logic and signatures.
 *
 * Demonstrates: type conversion (string ↔ number), arithmetic operators,
 * template literals, arrow functions, destructuring, arrays, .map(),
 * default parameters, Math methods, Date object
 */

'use strict';

/* ──────────────────────────────────────
 * Conversion helpers
 * ────────────────────────────────────── */

/**
 * Convert "HH:mm" to minutes since midnight.
 * Example: "10:30" → 630
 */
const timeToMinutes = (timeStr) => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

/**
 * Convert minutes since midnight to "HH:mm".
 * Example: 630 → "10:30"
 */
const minutesToTime = (mins) => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

/**
 * Calculate end time by adding duration (minutes) to a start time string.
 * Example: calculateEndTime("10:00", 30) → "10:30"
 */
const calculateEndTime = (startTime, duration) => {
  return minutesToTime(timeToMinutes(startTime) + parseInt(duration, 10));
};

/* ──────────────────────────────────────
 * Date helpers
 * ────────────────────────────────────── */

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

/** Return lowercase day name for an ISO date string. */
const getDayOfWeek = (dateStr) => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return DAY_NAMES[new Date(year, month - 1, day).getDay()];
};

/** Produce an array of ISO date strings for N consecutive days. */
const getDateRange = (startDate, days = 7) => {
  const [year, month, day] = startDate.split('-').map(Number);
  const base = new Date(year, month - 1, day);
  const range = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    const y = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const da = String(d.getDate()).padStart(2, '0');
    range.push(`${y}-${mo}-${da}`);
  }
  return range;
};

/** Today as "YYYY-MM-DD". */
const getTodayISO = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/** Check if a date string is before today. */
const isDateInPast = (dateStr) => dateStr < getTodayISO();

/** Check if [start, end) fits entirely within at least one availability window. */
const isTimeInWindow = (start, end, windows) => {
  const startMins = timeToMinutes(start);
  const endMins = timeToMinutes(end);
  return windows.some(({ start: wStart, end: wEnd }) => {
    return startMins >= timeToMinutes(wStart) && endMins <= timeToMinutes(wEnd);
  });
};

/** Format "HH:mm" to 12-hour display: "10:30 AM" */
const formatTime12 = (timeStr) => {
  const [h, m] = timeStr.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
};

/** Human-friendly date: "Wed, 19 Aug 2026" */
const formatDate = (dateStr) => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-IN', {
    weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
  });
};

/** Available appointment durations in minutes */
const DURATIONS = [15, 30, 45, 60];
const getDurations = () => [...DURATIONS];

module.exports = {
  timeToMinutes,
  minutesToTime,
  calculateEndTime,
  getDayOfWeek,
  getDateRange,
  getTodayISO,
  isDateInPast,
  isTimeInWindow,
  formatTime12,
  formatDate,
  getDurations,
  DAY_NAMES,
  DURATIONS
};
