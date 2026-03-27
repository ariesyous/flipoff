import { Board } from './Board.js';
import { SoundEngine } from './SoundEngine.js';
import { MessageRotator } from './MessageRotator.js';
import { KeyboardController } from './KeyboardController.js';
import { ControlChannel } from './ControlChannel.js';
import { GRID_COLS, GRID_ROWS } from './constants.js';

document.addEventListener('DOMContentLoaded', () => {
  const boardContainer = document.getElementById('board-container');
  const soundEngine = new SoundEngine();
  const board = new Board(boardContainer, soundEngine);
  const rotator = new MessageRotator(board);
  const keyboard = new KeyboardController(rotator, soundEngine);

  // Initialize audio on first user interaction (browser autoplay policy)
  let audioInitialized = false;
  const initAudio = async () => {
    if (audioInitialized) return;
    audioInitialized = true;
    await soundEngine.init();
    soundEngine.resume();
    document.removeEventListener('click', initAudio);
    document.removeEventListener('keydown', initAudio);
  };
  document.addEventListener('click', initAudio);
  document.addEventListener('keydown', initAudio);

  // Start message rotation
  rotator.start();

  // Receive commands from control.html via BroadcastChannel
  if (typeof BroadcastChannel !== 'undefined') {
    const ch = new ControlChannel();
    ch.on('ping', () => ch.send('pong'));
    ch.on('message', ({ lines }) => { rotator.stop(); board.displayMessage(lines); });
    ch.on('stop-rotation', () => rotator.stop());
    ch.on('start-rotation', () => rotator.start());
    ch.on('set-messages', ({ messages }) => {
      rotator.stop();
      rotator.messages = messages;
      rotator.currentIndex = -1;
      rotator.start();
    });
  }

  // Volume toggle button in header
  const volumeBtn = document.getElementById('volume-btn');
  if (volumeBtn) {
    volumeBtn.addEventListener('click', () => {
      initAudio();
      const muted = soundEngine.toggleMute();
      volumeBtn.classList.toggle('muted', muted);
    });
  }

  // Fullscreen button — do NOT call initAudio() here; touching the Web Audio API
  // before requestFullscreen() consumes the user-activation token in many browsers.
  // The document-level click listener already handles audio init for every click.
  const fullscreenBtn = document.getElementById('fullscreen-btn');
  if (fullscreenBtn) {
    fullscreenBtn.addEventListener('click', () => {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    });
  }

  // Fullscreen: expand the grid to fill the monitor with more tiles, then restore on exit.
  // Defer calculation 100ms so window.innerWidth/Height reflect the fullscreen viewport.
  document.addEventListener('fullscreenchange', () => {
    const isFs = !!document.fullscreenElement;
    document.body.classList.toggle('fullscreen-active', isFs);

    if (isFs) {
      setTimeout(() => {
        // Tile size stays at the CSS clamp max (62px) plus gap (5px)
        const tileSize = 62;
        const gap      = 4;
        const padH     = 72;  // matches .fullscreen-active .board padding: 36px each side
        const padV     = 60;  // matches .fullscreen-active .board padding: 24px top + 36px bottom
        const cols = Math.max(1, Math.floor((window.innerWidth  - padH + gap) / (tileSize + gap)));
        const rows = Math.max(1, Math.floor((window.innerHeight - padV + gap) / (tileSize + gap)));
        rotator.stop();
        board.resize(cols, rows);
        rotator.start();
      }, 100);
    } else {
      rotator.stop();
      board.resize(GRID_COLS, GRID_ROWS);
      rotator.start();
    }
  });
});
