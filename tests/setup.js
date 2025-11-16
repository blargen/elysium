/**
 * Jest Setup - Mock FoundryVTT Globals
 *
 * This file mocks all the Foundry globals so we can test our code without
 * running a full Foundry instance.
 */

import { jest } from '@jest/globals';

// Mock game object
global.game = {
  user: {
    id: 'test-user-id',
    character: null,
    isGM: false
  },
  settings: {
    get: jest.fn(),
    set: jest.fn(),
    register: jest.fn()
  },
  i18n: {
    localize: jest.fn(key => key),
    format: jest.fn((key, data) => key)
  },
  actors: {
    get: jest.fn(),
    getName: jest.fn(),
    filter: jest.fn(() => [])
  },
  items: {
    get: jest.fn(),
    getName: jest.fn(),
    filter: jest.fn(() => [])
  },
  packs: new Map()
};

// Mock ChatMessage
global.ChatMessage = {
  create: jest.fn(),
  getSpeaker: jest.fn(() => ({ alias: 'Test Speaker' }))
};

// Mock Dialog
global.Dialog = jest.fn();

// Mock ui
global.ui = {
  notifications: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
};

// Mock Hooks (we'll test the hook callbacks, not the hook system itself)
global.Hooks = {
  on: jest.fn(),
  once: jest.fn(),
  call: jest.fn(),
  callAll: jest.fn()
};

// Mock foundry utils
global.foundry = {
  utils: {
    randomID: jest.fn(() => 'mock-random-id'),
    duplicate: jest.fn(obj => JSON.parse(JSON.stringify(obj)))
  }
};

// Mock Roll
global.Roll = jest.fn();

// Mock CONST
global.CONST = {
  CHAT_MESSAGE_TYPES: {
    OTHER: 0,
    ROLL: 5
  }
};
