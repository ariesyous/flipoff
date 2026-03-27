import { Board } from './Board.js';
import { SoundEngine } from './SoundEngine.js';
import { MessageRotator } from './MessageRotator.js';
import { KeyboardController } from './KeyboardController.js';
import { ControlChannel } from './ControlChannel.js';

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

  // "Get Early Access" button: scroll to board and go fullscreen
  const ctaBtn = document.getElementById('cta-btn');
  if (ctaBtn) {
    ctaBtn.addEventListener('click', (e) => {
      e.preventDefault();
      initAudio();
      boardContainer.scrollIntoView({ behavior: 'smooth' });
      setTimeout(() => {
        document.documentElement.requestFullscreen().catch(() => {});
      }, 400);
    });
  }
});
