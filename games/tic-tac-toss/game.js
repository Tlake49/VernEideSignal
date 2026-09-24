(() => {
  "use strict";

  if (!window.Matter) {
    document.getElementById("loadError").hidden = false;
    return;
  }

  const { Engine, World, Bodies, Body, Constraint, Composite, Sleeping } = Matter;
  const canvas = document.getElementById("gameCanvas");
  const playfield = document.getElementById("playfield");
  const ctx = canvas.getContext("2d");
  const statusText = document.getElementById("statusText");
  const statusLight = document.getElementById("statusLight");
  const resetButton = document.getElementById("resetButton");
  const playAgainButton = document.getElementById("playAgainButton");
  const helpButton = document.getElementById("helpBtn");
  const helpModal = document.getElementById("helpModal");
  const closeHelpButton = document.getElementById("closeHelpBtn");
  const modeButtons = [...document.querySelectorAll("[data-mode]")];
  const xScoreEl = document.getElementById("xScore");
  const oScoreEl = document.getElementById("oScore");
  const roundLabel = document.getElementById("roundLabel");

  const palette = {
    ink: "#061c34",
    paper: "#eef7fb",
    baby: "#9edcf5",
    blue: "#287fba",
    red: "#e60012",
    white: "#fbfdff"
  };

  const engine = Engine.create({ enableSleeping: true });
  engine.gravity.y = 1;
  engine.gravity.scale = 0.00125;

  let width = 0;
  let height = 0;
  let dpr = 1;
  let layout = {};
  let pieces = [];
  let board = Array(9).fill(null);
  let currentPlayer = "X";
  let mode = "cpu";
  let gameOver = false;
  let cpuBusy = false;
  let hoverCell = null;
  let winningCells = [];
  let round = 1;
  let scores = { X: 0, O: 0 };
  let drag = null;
  let resizeTimer = null;
  let lastTime = performance.now();

  const wins = [
    [0,1,2],[3,4,5],[6,7,8],
    [0,3,6],[1,4,7],[2,5,8],
    [0,4,8],[2,4,6]
  ];

  function setStatus(message, state = "play") {
    statusText.textContent = message;
    const playerClass = currentPlayer === "O" ? " o-turn" : "";
    statusLight.className = `status-light${playerClass}${state === "cpu" ? " cpu" : state === "done" ? " done" : ""}`;
  }

  function cellCenter(index) {
    const col = index % 3;
    const row = Math.floor(index / 3);
    return {
      x: layout.boardX + layout.cell * (col + .5),
      y: layout.boardY + layout.cell * (row + .5)
    };
  }

  function computeLayout() {
    const desktop = width >= 1100;
    const mobile = width < 600;
    const binHeight = Math.max(mobile ? 150 : 138, Math.min(desktop ? 190 : mobile ? 168 : 174, height * .27));
    const binBottom = height - (mobile ? 18 : 26);
    const binTop = binBottom - binHeight;
    const boardY = mobile ? 152 : Math.max(92, (height - Math.min(desktop ? 540 : 420, width - 36) - binHeight) * .34);
    const boardSize = Math.max(mobile ? 200 : 270, Math.min(mobile ? 238 : desktop ? 540 : 420, width - (mobile ? 56 : 36), binTop - boardY - 10));
    layout = {
      boardSize,
      cell: boardSize / 3,
      boardX: (width - boardSize) / 2,
      boardY,
      binTop,
      binBottom,
      binHeight,
      pieceSize: Math.max(mobile ? 30 : 28, Math.min(desktop ? 44 : mobile ? 34 : 38, width / (mobile ? 11.5 : 20), binHeight / 3.5))
    };
    playAgainButton.style.top = `${layout.boardY + layout.boardSize / 2}px`;
    playfield.style.setProperty("--bin-top", `${layout.binTop}px`);
  }

  function addWorldBounds() {
    const wall = 50;
    const common = { isStatic: true, render: { visible: false } };
    World.add(engine.world, [
      Bodies.rectangle(width / 2, height + wall / 2, width + wall * 2, wall, common),
      Bodies.rectangle(-wall / 2, height / 2, wall, height * 2, common),
      Bodies.rectangle(width + wall / 2, height / 2, wall, height * 2, common),
      Bodies.rectangle(width / 2, layout.binBottom + 9, width, 18, common),
      Bodies.rectangle(10, layout.binTop + layout.binHeight / 2, 18, layout.binHeight, common),
      Bodies.rectangle(width - 10, layout.binTop + layout.binHeight / 2, 18, layout.binHeight, common),
      Bodies.rectangle(width / 2, layout.binTop + layout.binHeight / 2, 18, layout.binHeight, common)
    ]);
  }

  function makePiece(type, index) {
    const left = type === "X";
    const halfStart = left ? 18 : width / 2 + 18;
    const halfEnd = left ? width / 2 - 18 : width - 18;
    const spacing = (halfEnd - halfStart) / 6;
    const x = halfStart + spacing * (index + 1) + (Math.random() - .5) * 7;
    const y = layout.binTop + 30 + (index % 2) * (layout.pieceSize * 1.45);
    const options = {
      restitution: .58,
      friction: .08,
      frictionAir: .018,
      density: .0022,
      chamfer: type === "X" ? { radius: 11 } : undefined
    };
    const body = type === "O"
      ? Bodies.circle(x, y, layout.pieceSize, options)
      : Bodies.rectangle(x, y, layout.pieceSize * 1.72, layout.pieceSize * 1.72, options);
    body.angle = (Math.random() - .5) * .55;
    body.plugin.gamePiece = { type, placed: false, cell: null, spawnTime: 0, win: false };
    pieces.push(body);
    World.add(engine.world, body);
    return body;
  }

  function newRound(keepScore = true) {
    if (drag?.constraint) World.remove(engine.world, drag.constraint);
    Composite.clear(engine.world, false, true);
    pieces = [];
    board = Array(9).fill(null);
    currentPlayer = "X";
    gameOver = false;
    cpuBusy = false;
    hoverCell = null;
    winningCells = [];
    drag = null;
    canvas.classList.remove("dragging");
    playAgainButton.hidden = true;
    if (!keepScore) {
      scores = { X: 0, O: 0 };
      round = 1;
    }
    computeLayout();
    addWorldBounds();
    for (let i = 0; i < 5; i++) makePiece("X", i);
    for (let i = 0; i < 5; i++) makePiece("O", i);
    updateScoreboard();
    setStatus(mode === "cpu" ? "Grab an X and toss it onto the grid." : "Player X — choose a piece.");
  }

  function updateScoreboard() {
    xScoreEl.textContent = scores.X;
    oScoreEl.textContent = scores.O;
    roundLabel.textContent = `Round ${String(round).padStart(2, "0")}`;
  }

  function nearestOpenCell(point) {
    const pad = layout.cell * .2;
    const inside = point.x >= layout.boardX - pad && point.x <= layout.boardX + layout.boardSize + pad &&
      point.y >= layout.boardY - pad && point.y <= layout.boardY + layout.boardSize + pad;
    if (!inside) return null;
    const col = Math.max(0, Math.min(2, Math.floor((point.x - layout.boardX) / layout.cell)));
    const row = Math.max(0, Math.min(2, Math.floor((point.y - layout.boardY) / layout.cell)));
    const index = row * 3 + col;
    return board[index] ? null : index;
  }

  function canDragPiece(body) {
    if (gameOver || cpuBusy || body.plugin.gamePiece.placed) return false;
    return body.plugin.gamePiece.type === currentPlayer;
  }

  function pointerPosition(event) {
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function findPiece(point) {
    let best = null;
    let bestDistance = Infinity;
    for (const piece of pieces) {
      if (!canDragPiece(piece)) continue;
      const distance = Math.hypot(piece.position.x - point.x, piece.position.y - point.y);
      if (distance < Math.max(layout.pieceSize * 1.75, 44) && distance < bestDistance) {
        best = piece;
        bestDistance = distance;
      }
    }
    return best;
  }

  function startDrag(event) {
    if (event.button !== undefined && event.button !== 0) return;
    const point = pointerPosition(event);
    const body = findPiece(point);
    if (!body) return;
    canvas.setPointerCapture(event.pointerId);
    Sleeping.set(body, false);
    const constraint = Constraint.create({
      pointA: point,
      bodyB: body,
      pointB: { x: 0, y: 0 },
      stiffness: .18,
      damping: .16,
      length: 0,
      render: { visible: false }
    });
    World.add(engine.world, constraint);
    drag = { id: event.pointerId, body, constraint, point };
    canvas.classList.add("dragging");
    hoverCell = nearestOpenCell(body.position);
  }

  function moveDrag(event) {
    if (!drag || drag.id !== event.pointerId) return;
    event.preventDefault();
    const point = pointerPosition(event);
    drag.point = point;
    drag.constraint.pointA = point;
    hoverCell = nearestOpenCell(drag.body.position);
  }

  function endDrag(event) {
    if (!drag || drag.id !== event.pointerId) return;
    const body = drag.body;
    World.remove(engine.world, drag.constraint);
    drag = null;
    canvas.classList.remove("dragging");
    const cell = nearestOpenCell(body.position);
    hoverCell = null;
    if (cell === null) {
      Body.setAngularVelocity(body, (Math.random() - .5) * .22);
      setStatus(`${currentPlayer} missed the grid — grab it again.`);
      return;
    }
    placePiece(body, cell, false);
  }

  function placePiece(body, cell, fromCpu) {
    const target = cellCenter(cell);
    const piece = body.plugin.gamePiece;
    piece.placed = true;
    piece.cell = cell;
    piece.spawnTime = fromCpu ? performance.now() : 0;
    Body.setVelocity(body, { x: 0, y: 0 });
    Body.setAngularVelocity(body, 0);
    Body.setAngle(body, 0);
    Body.setPosition(body, target);
    Body.setStatic(body, true);
    board[cell] = piece.type;
    resolveTurn(piece.type);
  }

  function resultFor(state) {
    for (const cells of wins) {
      const [a,b,c] = cells;
      if (state[a] && state[a] === state[b] && state[a] === state[c]) return { winner: state[a], cells };
    }
    return state.every(Boolean) ? { winner: "draw", cells: [] } : null;
  }

  function resolveTurn(type) {
    const result = resultFor(board);
    if (result) {
      gameOver = true;
      winningCells = result.cells;
      if (result.winner !== "draw") {
        scores[result.winner] += 1;
        for (const piece of pieces) {
          if (piece.plugin.gamePiece.cell !== null && winningCells.includes(piece.plugin.gamePiece.cell)) piece.plugin.gamePiece.win = true;
        }
        setStatus(`${result.winner} takes the round. Nice toss.`, "done");
      } else {
        setStatus("A perfect little stalemate.", "done");
      }
      updateScoreboard();
      playAgainButton.hidden = false;
      tossLoosePieces();
      return;
    }

    if (mode === "cpu" && type === "X") {
      currentPlayer = "O";
      cpuMove();
    } else {
      currentPlayer = type === "X" ? "O" : "X";
      setStatus(`Player ${currentPlayer} — your piece is waiting.`);
    }
  }

  function tossLoosePieces() {
    pieces.filter(piece => !piece.plugin.gamePiece.placed).forEach((piece, index) => {
      window.setTimeout(() => {
        Sleeping.set(piece, false);
        Body.applyForce(piece, piece.position, {
          x: (Math.random() - .5) * .025,
          y: -.018 - Math.random() * .018
        });
      }, index * 35);
    });
  }

  function minimax(state, maximizing, depth = 0) {
    const result = resultFor(state);
    if (result?.winner === "O") return 10 - depth;
    if (result?.winner === "X") return depth - 10;
    if (result?.winner === "draw") return 0;
    const scores = [];
    for (let i = 0; i < 9; i++) {
      if (state[i]) continue;
      state[i] = maximizing ? "O" : "X";
      scores.push(minimax(state, !maximizing, depth + 1));
      state[i] = null;
    }
    return maximizing ? Math.max(...scores) : Math.min(...scores);
  }

  function bestCpuCell() {
    let best = -Infinity;
    let choices = [];
    for (let i = 0; i < 9; i++) {
      if (board[i]) continue;
      board[i] = "O";
      const score = minimax(board, false);
      board[i] = null;
      if (score > best) { best = score; choices = [i]; }
      else if (score === best) choices.push(i);
    }
    return choices[Math.floor(Math.random() * choices.length)];
  }

  function cpuMove() {
    cpuBusy = true;
    setStatus("CPU is lining up a move…", "cpu");
    const cell = bestCpuCell();
    const piece = pieces.find(item => item.plugin.gamePiece.type === "O" && !item.plugin.gamePiece.placed);
    window.setTimeout(() => {
      if (gameOver || !piece) return;
      placePiece(piece, cell, true);
      if (!gameOver) {
        currentPlayer = "X";
        cpuBusy = false;
        setStatus("Your turn — grab another X.");
      }
    }, 480);
  }

  function resize() {
    const rect = playfield.getBoundingClientRect();
    width = Math.max(320, Math.round(rect.width));
    height = Math.max(width < 600 ? 520 : 620, Math.round(rect.height));
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    newRound(true);
  }

  function roundedRect(x, y, w, h, radius) {
    const r = Math.min(radius, w / 2, h / 2);
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
  }

  function drawBoard() {
    ctx.save();
    ctx.shadowColor = palette.ink;
    ctx.shadowOffsetX = 8;
    ctx.shadowOffsetY = 9;
    ctx.shadowBlur = 0;
    roundedRect(layout.boardX, layout.boardY, layout.boardSize, layout.boardSize, 10);
    ctx.fillStyle = palette.white;
    ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.lineWidth = 3;
    ctx.strokeStyle = palette.ink;
    ctx.stroke();

    if (hoverCell !== null) {
      const col = hoverCell % 3;
      const row = Math.floor(hoverCell / 3);
      ctx.fillStyle = "rgba(158,220,245,.82)";
      ctx.fillRect(layout.boardX + col * layout.cell + 4, layout.boardY + row * layout.cell + 4, layout.cell - 8, layout.cell - 8);
    }

    ctx.beginPath();
    for (let i = 1; i <= 2; i++) {
      ctx.moveTo(layout.boardX + layout.cell * i, layout.boardY + 12);
      ctx.lineTo(layout.boardX + layout.cell * i, layout.boardY + layout.boardSize - 12);
      ctx.moveTo(layout.boardX + 12, layout.boardY + layout.cell * i);
      ctx.lineTo(layout.boardX + layout.boardSize - 12, layout.boardY + layout.cell * i);
    }
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.strokeStyle = palette.ink;
    ctx.stroke();
    ctx.restore();
  }

  function drawBins() {
    const gap = 10;
    const top = layout.binTop;
    const binW = width / 2 - gap * 1.5;
    ctx.save();
    ctx.lineWidth = 3;

    roundedRect(gap, top, binW, layout.binHeight, 14);
    ctx.fillStyle = "rgba(230,0,18,.12)";
    ctx.fill();
    ctx.strokeStyle = palette.red;
    ctx.stroke();

    roundedRect(width / 2 + gap / 2, top, binW, layout.binHeight, 14);
    ctx.fillStyle = "rgba(36,86,245,.13)";
    ctx.fill();
    ctx.strokeStyle = palette.blue;
    ctx.stroke();

    ctx.font = `400 ${Math.min(58, layout.binHeight * .42)}px "League Gothic", Impact, sans-serif`;
    ctx.textBaseline = "middle";
    ctx.fillStyle = palette.red;
    ctx.fillText("X PIECES", 24, top + layout.binHeight / 2);
    ctx.textAlign = "right";
    ctx.fillStyle = palette.blue;
    ctx.fillText("O PIECES", width - 24, top + layout.binHeight / 2);
    ctx.restore();
  }

  function drawPiece(body, time) {
    const piece = body.plugin.gamePiece;
    const spawnAge = piece.spawnTime ? time - piece.spawnTime : Infinity;
    let scale = 1;
    let alpha = 1;
    if (spawnAge < 560) {
      const t = Math.min(spawnAge / 560, 1);
      scale = t < .55 ? .28 + (t / .55) * 1.08 : 1.36 - ((t - .55) / .45) * .36;
      alpha = .4 + Math.abs(Math.sin(t * Math.PI * 5)) * .6;
    }
    if (piece.win) scale *= 1 + Math.sin(time / 115) * .06;

    ctx.save();
    ctx.translate(body.position.x, body.position.y);
    ctx.rotate(body.angle);
    ctx.scale(scale, scale);
    ctx.globalAlpha = alpha;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.shadowColor = "rgba(23,23,23,.26)";
    ctx.shadowOffsetX = 5;
    ctx.shadowOffsetY = 7;
    ctx.shadowBlur = piece.spawnTime && spawnAge < 560 ? 22 : 0;
    ctx.strokeStyle = piece.type === "X" ? palette.red : palette.blue;
    ctx.lineWidth = Math.max(9, layout.pieceSize * .38);

    if (piece.type === "X") {
      const arm = layout.pieceSize * .66;
      ctx.beginPath();
      ctx.moveTo(-arm, -arm); ctx.lineTo(arm, arm);
      ctx.moveTo(arm, -arm); ctx.lineTo(-arm, arm);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, layout.pieceSize * .69, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawWinLine(time) {
    if (!winningCells.length) return;
    const start = cellCenter(winningCells[0]);
    const end = cellCenter(winningCells[2]);
    ctx.save();
    ctx.strokeStyle = palette.baby;
    ctx.lineWidth = 13 + Math.sin(time / 110) * 2;
    ctx.lineCap = "round";
    ctx.shadowColor = palette.ink;
    ctx.shadowOffsetX = 4;
    ctx.shadowOffsetY = 5;
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
    ctx.restore();
  }

  function drawDragSpring() {
    if (!drag) return;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(drag.point.x, drag.point.y);
    ctx.lineTo(drag.body.position.x, drag.body.position.y);
    ctx.setLineDash([5,7]);
    ctx.lineWidth = 2;
    ctx.strokeStyle = palette.ink;
    ctx.stroke();
    ctx.restore();
  }

  function render(time) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    drawBoard();
    drawBins();
    drawDragSpring();
    for (const piece of pieces) drawPiece(piece, time);
    drawWinLine(time);
  }

  function loop(time) {
    const delta = Math.min(16.6, Math.max(8, time - lastTime));
    lastTime = time;
    Engine.update(engine, delta);
    render(time);
    requestAnimationFrame(loop);
  }

  canvas.addEventListener("pointerdown", startDrag);
  canvas.addEventListener("pointermove", moveDrag);
  canvas.addEventListener("pointerup", endDrag);
  canvas.addEventListener("pointercancel", endDrag);

  modeButtons.forEach(button => button.addEventListener("click", () => {
    mode = button.dataset.mode;
    modeButtons.forEach(item => {
      const active = item === button;
      item.classList.toggle("active", active);
      item.setAttribute("aria-pressed", String(active));
    });
    newRound(false);
  }));

  function startNextRound() {
    round += 1;
    newRound(true);
  }

  resetButton.addEventListener("click", startNextRound);
  playAgainButton.addEventListener("click", startNextRound);

  function openHelp() {
    helpModal.hidden = false;
    helpModal.setAttribute("aria-hidden", "false");
    document.body.classList.add("toss-modal-open");
    closeHelpButton.focus();
  }

  function closeHelp() {
    helpModal.hidden = true;
    helpModal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("toss-modal-open");
    helpButton.focus();
  }

  helpButton.addEventListener("click", openHelp);
  closeHelpButton.addEventListener("click", closeHelp);
  helpModal.addEventListener("click", event => {
    if (event.target.closest("[data-close-help]")) closeHelp();
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && !helpModal.hidden) closeHelp();
  });

  const observer = new ResizeObserver(() => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(resize, 120);
  });
  observer.observe(playfield);

  resize();
  requestAnimationFrame(loop);
})();
