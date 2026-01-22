const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

canvas.width = innerWidth;
canvas.height = innerHeight;

// ================== GAME DATA ==================
const WORDS = [
  "sid", "shiv", "sudha", "anmol", "yashmi", "sonakshi", "kapil", "ranjita","vedik","rajveer",
  "mehak", "mehtab", "pranav", "adi", "ravi", "yojit","shruti", "vivek", "piyanshu","madan",
  "pushkar", "ayush", "ankit", "arsh", "purvi","sam","khushi","harsh","diya","archit","daljit"
];

let enemies = [];
let activeEnemy = null;
let explosions = [];
let laser = null;

let score = 0;
let health = 3;

// ================== LEVEL SYSTEM ==================
let level = 1;
let killsThisLevel = 0;
let killsToNextLevel = 5;

// ================== WPM-BASED PACING ==================
const BASE_WPM = 5;   // Level 1
const WPM_STEP = 5;   // +5 WPM per level

function getWPM(level) {
  return BASE_WPM + (level - 1) * WPM_STEP;
}

// Convert WPM → pixels/sec (very gentle curve)
function wpmToSpeed(wpm) {
  return 10 + wpm * 1.4;
}

// ================== COMBO ==================
let combo = 0;
let comboTimer = 0;

// ================== BOSS ==================
let bossActive = false;

// ================== STATE ==================
let gameOver = false;
let paused = false;

// ================== SCREEN SHAKE ==================
let shakeTime = 0;
let shakeIntensity = 0;

// ================== SPAWN ==================
let spawnTimer = 0;

// ================== ENEMY ==================
class Enemy {
  constructor(word) {
    this.word = word;
    this.progress = 0;
    this.x = Math.random() * (canvas.width - 200) + 100;
    this.y = -30;

    const wpm = getWPM(level);
    this.speed = wpmToSpeed(wpm) + Math.random() * 6;
  }

  update(dt) {
    this.y += this.speed * dt;
  }

  draw(active) {
  ctx.font = active ? "28px Arial" : "26px Arial";
  ctx.textAlign = "left";

  const typed = this.word.slice(0, this.progress);
  const rest = this.word.slice(this.progress);

  const typedWidth = ctx.measureText(typed).width;
  const restWidth = ctx.measureText(rest).width;
  const totalWidth = typedWidth + restWidth;
  const height = 32;

  // 🔹 ACTIVE WORD BACKGROUND
  if (active) {
    ctx.fillStyle = "rgba(34, 197, 94, 0.15)";
    ctx.fillRect(
      this.x - 6,
      this.y - height + 6,
      totalWidth + 12,
      height
    );

    ctx.strokeStyle = "#22c55e";
    ctx.lineWidth = 2;
    ctx.strokeRect(
      this.x - 6,
      this.y - height + 6,
      totalWidth + 12,
      height
    );
  }

  // 🔹 Typed part
  ctx.fillStyle = "#22c55e";
  ctx.fillText(typed, this.x, this.y);

  // 🔹 Remaining part
  ctx.fillStyle = active ? "#facc15" : "#f87171";
  ctx.fillText(rest, this.x + typedWidth, this.y);
}

}

// ================== BOSS ==================
class Boss extends Enemy {
  constructor() {
    super("this is the boss enemy");
    this.word = "this is the boss enemy";
    this.speed *= 0.6; // slower, deliberate
  }
}

// ================== EXPLOSION ==================
class Explosion {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 5;
    this.life = 0.3;
  }
  update(dt) {
    this.radius += 200 * dt;
    this.life -= dt;
  }
  draw() {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.strokeStyle = "orange";
    ctx.lineWidth = 3;
    ctx.stroke();
  }
}

// ================== TARGET ==================
function pickActiveEnemy() {
  if (enemies.length === 0) {
    activeEnemy = null;
    return;
  }
  activeEnemy = enemies.reduce((a, b) => (a.y > b.y ? a : b));
}

// ================== SPAWNING ==================
function handleSpawning(dt) {
  if (bossActive) return;

  // Boss every 5 levels
  if (level % 5 === 0 && enemies.length === 0) {
    enemies.push(new Boss());
    bossActive = true;
    return;
  }

  spawnTimer += dt;

  const wpm = getWPM(level);
  const spawnDelay = Math.max(1.8, 3.2 - wpm * 0.08);

  if (spawnTimer >= spawnDelay) {
    spawnTimer = 0;
    enemies.push(new Enemy(
      WORDS[Math.floor(Math.random() * WORDS.length)]
    ));
  }
}

// ================== INPUT ==================
window.addEventListener("keydown", e => {

  if (e.key === "Escape") {
    paused = !paused;
    return;
  }

  if (e.key === "Tab") {
    e.preventDefault();
    location.reload();
  }

  if (gameOver || paused) return;

  if (!activeEnemy) pickActiveEnemy();
  if (!activeEnemy) return;

  const expected = activeEnemy.word[activeEnemy.progress];

  if (e.key === expected) {
    comboTimer = 1.5;

    laser = {
      x1: canvas.width / 2,
      y1: canvas.height - 40,
      x2: activeEnemy.x,
      y2: activeEnemy.y,
      life: 0.08
    };

    activeEnemy.progress++;

    if (activeEnemy.progress === activeEnemy.word.length) {
      explosions.push(new Explosion(activeEnemy.x, activeEnemy.y));
      shakeTime = 0.15;
      shakeIntensity = 10;

      enemies = enemies.filter(e => e !== activeEnemy);
      activeEnemy = null;

      score += Math.max(1, combo);
      combo++;

      killsThisLevel++;

      if (bossActive) {
        bossActive = false;
        level++;
        killsThisLevel = 0;
      } else if (killsThisLevel >= killsToNextLevel) {
        level++;
        killsThisLevel = 0;
        killsToNextLevel += 2;
      }
    }
  }
});

// ================== GAME LOOP ==================
let last = 0;
function loop(time) {
  const dt = (time - last) / 1000;
  last = time;

  if (paused) {
    ctx.fillStyle = "yellow";
    ctx.font = "40px Arial";
    ctx.textAlign = "center";
    ctx.fillText("PAUSED", canvas.width / 2, canvas.height / 2);
    requestAnimationFrame(loop);
    return;
  }

  if (comboTimer > 0) {
    comboTimer -= dt;
    if (comboTimer <= 0) combo = 0;
  }

  let ox = 0, oy = 0;
  if (shakeTime > 0) {
    shakeTime -= dt;
    ox = (Math.random() - 0.5) * shakeIntensity;
    oy = (Math.random() - 0.5) * shakeIntensity;
  }

  ctx.setTransform(1,0,0,1,ox,oy);
  ctx.clearRect(-ox, -oy, canvas.width, canvas.height);

  handleSpawning(dt);

  enemies.forEach(e => {
    e.update(dt);
    e.draw(e === activeEnemy);
  });

  enemies = enemies.filter(e => {
    if (e.y > canvas.height - 40) {
      health--;
      return false;
    }
    return true;
  });

  if (laser) {
    ctx.strokeStyle = "#22c55e";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(laser.x1, laser.y1);
    ctx.lineTo(laser.x2, laser.y2);
    ctx.stroke();

    laser.life -= dt;
    if (laser.life <= 0) laser = null;
  }

  explosions = explosions.filter(ex => {
    ex.update(dt);
    ex.draw();
    return ex.life > 0;
  });

  ctx.setTransform(1,0,0,1,0,0);
  ctx.fillStyle = "white";
  ctx.font = "20px Arial";
  ctx.fillText(`Score: ${score}`, 20, 30);
  ctx.fillText(`Health: ${health}`, 20, 60);
  ctx.fillText(`Level: ${level}`, 20, 90);
  ctx.fillText(`Target WPM: ${getWPM(level)}`, 20, 120);

  if (health <= 0) {
    gameOver = true;
    ctx.fillStyle = "red";
    ctx.font = "48px Arial";
    ctx.textAlign = "center";
    ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2);
    return;
  }

  pickActiveEnemy();
  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
