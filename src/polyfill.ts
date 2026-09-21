// Polyfill for Node.js 25+ where buffer.SlowBuffer was deprecated and removed
// This prevents TypeError: Cannot read properties of undefined (reading 'prototype') in buffer-equal-constant-time / jwa
const buffer = require('buffer');
if (!buffer.SlowBuffer) {
  buffer.SlowBuffer = class SlowBuffer extends buffer.Buffer {};
}
