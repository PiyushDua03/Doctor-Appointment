/**
 * Room.js — Room model matching existing frontend data structure
 *
 * Mirrors the room objects from js/data/rooms.js:
 *   { id, name, type, floor }
 *
 * Demonstrates: Mongoose schema, simple field types, unique index
 */

'use strict';

const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema(
  {
    roomId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    name: {
      type: String,
      required: [true, 'Room name is required'],
      trim: true
    },
    type: {
      type: String,
      required: [true, 'Room type is required'],
      trim: true
    },
    floor: {
      type: Number,
      required: [true, 'Floor is required']
    }
  },
  {
    timestamps: true
  }
);

const Room = mongoose.model('Room', roomSchema);

module.exports = Room;
