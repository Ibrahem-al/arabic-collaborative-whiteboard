import { io } from 'socket.io-client';
import * as fabric from 'fabric';
import { nanoid } from 'nanoid';
import { ARABIC_LETTERS, HARAKAT } from './arabicLetters';

const socket = io(
  import.meta.env.PROD
    ? 'https://arabic-collaborative-whiteboard-2.onrender.com'
    : 'http://localhost:3001',
);
let canvas;
let currentBoardId = null;

const joinScreen = document.getElementById('join-screen');
const whiteboardScreen = document.getElementById('whiteboard-screen');
const createBoardBtn = document.getElementById('create-board');
const joinBoardBtn = document.getElementById('join-board-btn');
const boardCodeInput = document.getElementById('board-code-input');
const displayBoardCode = document.getElementById('display-board-code');
const lettersList = document.getElementById('letters-list');
const harakatList = document.getElementById('harakat-list');
const shapesPanel = document.getElementById('shapes-panel');
const shapesList = document.getElementById('shapes-list');
const closeShapesBtn = document.getElementById('close-shapes');
const selectModeBtn = document.getElementById('select-mode');
const drawModeBtn = document.getElementById('draw-mode');
const eraserModeBtn = document.getElementById('eraser-mode');
const clearBoardBtn = document.getElementById('clear-board');
const copyLinkBtn = document.getElementById('copy-link');

let isEraserMode = false;

function initCanvas() {
  const container = document.getElementById('canvas-container');
  if (!container) return;
  
  canvas = new fabric.Canvas('whiteboard', {
    isDrawingMode: false,
    width: container.clientWidth || 800,
    height: container.clientHeight || 600,
  });

  // Configure drawing brush
  canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
  canvas.freeDrawingBrush.width = 3;
  canvas.freeDrawingBrush.color = '#000000';

  canvas.on('object:added', (e) => {
    if (e.target.remote) return;
    const obj = e.target;
    if (!obj.id) obj.id = nanoid();
    
    socket.emit('draw-object', {
      boardId: currentBoardId,
      object: obj.toObject(['id'])
    });
  });

  canvas.on('object:moving', (e) => {
    if (e.target.remote) return;
    const obj = e.target;
    socket.emit('move-object', {
      boardId: currentBoardId,
      objectData: obj.toObject(['id'])
    });
  });

  canvas.on('object:scaling', (e) => {
    if (e.target.remote) return;
    const obj = e.target;
    socket.emit('move-object', {
      boardId: currentBoardId,
      objectData: obj.toObject(['id'])
    });
  });

  canvas.on('object:rotating', (e) => {
    if (e.target.remote) return;
    const obj = e.target;
    socket.emit('move-object', {
      boardId: currentBoardId,
      objectData: obj.toObject(['id'])
    });
  });

  canvas.on('mouse:down', (e) => {
    if (isEraserMode) {
      erasePathAtEvent(e);
    }
  });

  canvas.on('mouse:move', (e) => {
    if (isEraserMode && e.e.buttons === 1) {
      erasePathAtEvent(e);
    }
  });

  function erasePathAtEvent(e) {
    const target = e.target || canvas.findTarget(e.e);
    if (target && target.type === 'path') {
      const objectId = target.id;
      canvas.remove(target);
      canvas.renderAll();
      socket.emit('remove-object', { boardId: currentBoardId, objectId });
    }
  }
}

function joinBoard(boardId) {
  if (!boardId) return;
  console.log('Joining board:', boardId);
  currentBoardId = boardId;
  
  if (joinScreen) joinScreen.style.display = 'none';
  if (whiteboardScreen) whiteboardScreen.style.display = 'flex';
  if (displayBoardCode) displayBoardCode.innerText = boardId;
  
  if (!canvas) {
    setTimeout(() => {
      initCanvas();
      socket.emit('join-board', boardId);
    }, 50);
  } else {
    canvas.clear();
    socket.emit('join-board', boardId);
  }
}

if (createBoardBtn) {
  createBoardBtn.addEventListener('click', () => {
    const boardId = nanoid(6);
    joinBoard(boardId);
    window.history.pushState({}, '', `?board=${boardId}`);
  });
}

if (joinBoardBtn) {
  joinBoardBtn.addEventListener('click', () => {
    const boardId = boardCodeInput.value.trim();
    if (boardId) {
      joinBoard(boardId);
      window.history.pushState({}, '', `?board=${boardId}`);
    }
  });
}

// Arabic Letters UI
if (lettersList) {
  ARABIC_LETTERS.forEach(letter => {
    const div = document.createElement('div');
    div.className = 'letter-item';
    div.innerText = letter.display;
    div.addEventListener('click', () => showShapes(letter));
    lettersList.appendChild(div);
  });
}

// Harakat UI
if (harakatList) {
  HARAKAT.forEach(h => {
    const div = document.createElement('div');
    div.className = 'letter-item';
    div.innerText = h.display;
    div.addEventListener('click', () => addLetterToCanvas(h.char, 50));
    harakatList.appendChild(div);
  });
}

function showShapes(letter) {
  if (!shapesList || !shapesPanel) return;
  shapesList.innerHTML = '';
  letter.shapes.forEach(shape => {
    const div = document.createElement('div');
    div.className = 'shape-item';
    div.innerText = shape;
    div.addEventListener('click', () => addLetterToCanvas(shape));
    shapesList.appendChild(div);
  });
  shapesPanel.classList.add('open');
}

if (closeShapesBtn) {
  closeShapesBtn.addEventListener('click', () => {
    if (shapesPanel) shapesPanel.classList.remove('open');
  });
}

function addLetterToCanvas(char, fontSize = 80) {
  if (!canvas) return;
  const isSelectMode = !canvas.isDrawingMode && !isEraserMode;
  const text = new fabric.FabricText(char, {
    left: 100,
    top: 100,
    fontSize: fontSize,
    fontFamily: 'Noto Sans Arabic',
    id: nanoid(),
    selectable: isSelectMode,
  });
  canvas.add(text);
  if (isSelectMode) canvas.setActiveObject(text);
}

if (selectModeBtn) {
  selectModeBtn.addEventListener('click', () => setMode('select'));
}

if (drawModeBtn) {
  drawModeBtn.addEventListener('click', () => setMode('draw'));
}

if (eraserModeBtn) {
  eraserModeBtn.addEventListener('click', () => setMode('eraser'));
}

function setMode(mode) {
  if (!canvas) return;
  
  isEraserMode = (mode === 'eraser');
  canvas.isDrawingMode = (mode === 'draw');
  
  selectModeBtn.classList.toggle('active', mode === 'select');
  drawModeBtn.classList.toggle('active', mode === 'draw');
  eraserModeBtn.classList.toggle('active', mode === 'eraser');
  
  canvas.selection = (mode === 'select');
  canvas.defaultCursor = (mode === 'select' ? 'default' : 'crosshair');
  
  canvas.forEachObject(obj => {
    obj.selectable = (mode === 'select');
  });
  
  if (mode !== 'select') {
    canvas.discardActiveObject();
  }
  
  canvas.renderAll();
}

if (clearBoardBtn) {
  clearBoardBtn.addEventListener('click', () => {
    socket.emit('clear-board', currentBoardId);
  });
}

if (copyLinkBtn) {
  copyLinkBtn.addEventListener('click', () => {
    const link = window.location.href;
    navigator.clipboard.writeText(link).then(() => {
      const originalText = copyLinkBtn.innerText;
      copyLinkBtn.innerText = '✅';
      setTimeout(() => {
        copyLinkBtn.innerText = originalText;
      }, 2000);
    });
  });
}

// Socket events
socket.on('init-state', (state) => {
  if (!canvas) return;
  canvas.clear();
  const isSelectMode = !canvas.isDrawingMode && !isEraserMode;
  if (state.objects && state.objects.length > 0) {
    fabric.util.enlivenObjects(state.objects).then((objects) => {
      objects.forEach(obj => {
        obj.remote = true;
        obj.selectable = isSelectMode;
        canvas.add(obj);
      });
      canvas.renderAll();
    });
  }
});

socket.on('object-added', (objectData) => {
  if (!canvas) return;
  fabric.util.enlivenObjects([objectData]).then((objects) => {
    const obj = objects[0];
    obj.remote = true;
    obj.selectable = !canvas.isDrawingMode && !isEraserMode;
    canvas.add(obj);
    canvas.renderAll();
  });
});

socket.on('object-moved', (objectData) => {
  if (!canvas) return;
  const obj = canvas.getObjects().find(o => o.id === objectData.id);
  if (obj) {
    obj.set(objectData);
    obj.setCoords();
    canvas.renderAll();
  }
});

socket.on('object-removed', (objectId) => {
  if (!canvas) return;
  const obj = canvas.getObjects().find(o => o.id === objectId);
  if (obj) {
    canvas.remove(obj);
    canvas.renderAll();
  }
});

socket.on('board-cleared', () => {
  if (canvas) canvas.clear();
});

// Handle deep linking
const urlParams = new URLSearchParams(window.location.search);
const boardIdFromUrl = urlParams.get('board');
if (boardIdFromUrl) {
  joinBoard(boardIdFromUrl);
}

window.addEventListener('resize', () => {
  if (canvas) {
    const container = document.getElementById('canvas-container');
    if (container) {
      canvas.setWidth(container.clientWidth);
      canvas.setHeight(container.clientHeight);
      canvas.renderAll();
    }
  }
});
