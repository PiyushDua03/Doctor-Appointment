/**
 * roomService.js — Automatic room assignment (first-fit strategy)
 *
 * Ported from the existing frontend js/core/roomAssign.js.
 * Algorithm: iterate rooms in order, return the first one with no conflicts.
 *
 * Demonstrates: for...of loop, early return, function composition
 */

'use strict';

const { isRoomFree } = require('./conflictService');

/**
 * assignRoom — find the first available room for a given time slot.
 * Strategy: first-fit — iterate rooms in order, return the first one
 * that has no conflicting appointments.
 *
 * @param {string} doctorId    — kept for API compatibility
 * @param {string} date        — "YYYY-MM-DD"
 * @param {string} startTime   — "HH:mm"
 * @param {string} endTime     — "HH:mm"
 * @param {Array}  rooms       — all room objects (must have .roomId)
 * @param {Array}  appointments — all active appointments
 * @returns {string|null}      — room id, or null if no room is available
 */
const assignRoom = (doctorId, date, startTime, endTime, rooms, appointments) => {
  for (const room of rooms) {
    const id = room.roomId || room.id;
    const free = isRoomFree(id, date, startTime, endTime, appointments);

    if (free) {
      return id;
    }
  }

  // No room available at this time
  return null;
};

/**
 * getAvailableRooms — return ALL rooms that are free for a given slot.
 *
 * @param {string} date
 * @param {string} startTime
 * @param {string} endTime
 * @param {Array}  rooms
 * @param {Array}  appointments
 * @returns {Array} array of room objects that are free
 */
const getAvailableRooms = (date, startTime, endTime, rooms, appointments) => {
  return rooms.filter((room) => {
    const id = room.roomId || room.id;
    return isRoomFree(id, date, startTime, endTime, appointments);
  });
};

module.exports = {
  assignRoom,
  getAvailableRooms
};
