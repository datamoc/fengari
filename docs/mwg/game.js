"use strict";

const canvas = document.getElementById("map");
const context = canvas.getContext("2d");
const statusLine = document.getElementById("status");
const editor = document.getElementById("lua");
const playButton = document.getElementById("play");
const stepButton = document.getElementById("step");
const applyButton = document.getElementById("apply");
const MAP = [
    "################",
    "#..............#",
    "#..###...##....#",
    "#....#....#....#",
    "#....#.........#",
    "#..#....###....#",
    "#..#...........#",
    "#..####...##...#",
    "#..............#",
    "#..............#",
    "################"
];
const SAMPLES = [{ x: 13, y: 1 }, { x: 2, y: 4 }, { x: 10, y: 4 }, { x: 7, y: 6 }, { x: 13, y: 9 }, { x: 2, y: 9 }];
const PRESETS = {
    nearest: `-- Choisir la cible la plus proche à chaque tour.
function choose(targets)
  local best = 1
  for i, target in ipairs(targets) do
    if target.distance < targets[best].distance then
      best = i
    end
  end
  return best
end`,
    farthest: `-- Visiter d’abord les cibles les plus éloignées.
function choose(targets)
  local best = 1
  for i, target in ipairs(targets) do
    if target.distance > targets[best].distance then
      best = i
    end
  end
  return best
end`,
    order: `-- La carte garde un ordre stable pour les cibles.
function choose(targets)
  return 1
end`,
    loop: `-- Pyroeis doit interrompre cette décision.
function choose(targets)
  while true do end
end`
};

let worker = null;
let ready = null;
let serial = 0;
let running = false;
let busy = false;
let generation = 0;
let autoTimer = null;
const requests = new Map();

function stop() {
    running = false;
    clearTimeout(autoTimer);
    playButton.textContent = "Lancer le robot";
}
function failWorker(message) {
    worker?.terminate();
    worker = null;
    for (const pending of requests.values()) { clearTimeout(pending.timer); pending.reject(new Error(message)); }
    requests.clear();
}
function createWorker() {
    worker = new Worker("lua-worker.js");
    ready = new Promise((resolve, reject) => {
        const loading = setTimeout(() => { failWorker("Chargement Lua trop long."); reject(new Error("Chargement Lua trop long.")); }, 15000);
        worker.onmessage = ({ data }) => {
            if (data.kind === "ready") { clearTimeout(loading); resolve(); return; }
            const pending = requests.get(data.id);
            if (!pending) return;
            requests.delete(data.id);
            clearTimeout(pending.timer);
            if (data.kind === "error") pending.reject(new Error(data.message));
            else pending.resolve(data);
        };
        worker.onerror = event => {
            clearTimeout(loading);
            const message = event.message || "Impossible de charger le worker Lua.";
            reject(new Error(message));
            failWorker(message);
        };
    });
}
async function request(action, payload) {
    if (!worker) createWorker();
    await ready;
    return new Promise((resolve, reject) => {
        const id = ++serial;
        const timer = setTimeout(() => failWorker("Le watchdog a arrêté le worker après 2 secondes. Appliquez une nouvelle stratégie."), 2000);
        requests.set(id, { resolve, reject, timer });
        worker.postMessage({ id, action, ...payload });
    });
}
function setBusy(value) {
    busy = value;
    stepButton.disabled = playButton.disabled = applyButton.disabled = value;
}

class MarsScene extends mw_games.Scene {
    create() {
        const { Level, WALL, FLOOR, Pathfinder } = mw_games.Roguelike;
        this.level = new Level(16, 11, [WALL, FLOOR]);
        for (let y = 0; y < MAP.length; y++) for (let x = 0; x < MAP[y].length; x++) {
            this.level.set(x, y, MAP[y][x] === "#" ? 0 : 1);
        }
        this.paths = new Pathfinder(this.level);
        this.robot = { x: 1, y: 1 };
        this.samples = SAMPLES.map((sample, index) => ({ ...sample, id: index + 1 }));
        this.trail = [{ ...this.robot }];
        this.route = [];
        this.turns = 0;
        this.redraw();
    }
    candidates() {
        return this.samples.map(sample => {
            const route = this.paths.find(this.robot, sample, { topology: 4 });
            return { ...sample, distance: route.length, route };
        }).filter(sample => sample.distance > 0);
    }
    move(next) {
        if (!this.level.passable(next.x, next.y) || Math.abs(next.x - this.robot.x) + Math.abs(next.y - this.robot.y) !== 1) return;
        this.robot = { x: next.x, y: next.y };
        this.trail.push({ ...this.robot });
        this.turns++;
        this.samples = this.samples.filter(sample => sample.x !== next.x || sample.y !== next.y);
        this.redraw();
        if (!this.samples.length) {
            stop();
            statusLine.textContent = `Mission terminée : 6 échantillons en ${this.turns} tours.`;
        } else if (this.turns >= 120) {
            stop();
            statusLine.textContent = "120 tours écoulés. Essayez une stratégie qui évite de changer de cible sans cesse.";
        }
    }
    redraw() {
        const cell = 40;
        context.fillStyle = "#24205e";
        context.fillRect(0, 0, canvas.width, canvas.height);
        for (let y = 0; y < 11; y++) for (let x = 0; x < 16; x++) {
            const px = x * cell, py = y * cell;
            if (MAP[y][x] === "#") {
                context.fillStyle = (x + y) % 2 ? "#423668" : "#49396b";
                context.beginPath(); context.roundRect(px + 3, py + 3, 34, 34, 5); context.fill();
                context.fillStyle = "#68507c"; context.fillRect(px + 8, py + 9, 13, 3);
            } else {
                context.fillStyle = "#aaa2d433";
                context.beginPath(); context.arc(px + 20, py + 20, 1, 0, Math.PI * 2); context.fill();
            }
        }
        for (const step of this.trail) {
            context.fillStyle = "#ffb39130";
            context.beginPath(); context.arc(step.x * cell + 20, step.y * cell + 20, 5, 0, Math.PI * 2); context.fill();
        }
        context.strokeStyle = "#a8b5ff"; context.lineWidth = 2; context.setLineDash([4, 6]);
        context.beginPath(); context.moveTo(this.robot.x * cell + 20, this.robot.y * cell + 20);
        for (const step of this.route) context.lineTo(step.x * cell + 20, step.y * cell + 20);
        context.stroke(); context.setLineDash([]);
        for (const sample of this.samples) {
            const x = sample.x * cell + 20, y = sample.y * cell + 20;
            context.fillStyle = "#78dfd4";
            context.beginPath(); context.moveTo(x, y - 11); context.lineTo(x + 9, y); context.lineTo(x, y + 11); context.lineTo(x - 9, y); context.closePath(); context.fill();
            context.fillStyle = "#171633"; context.font = "bold 12px Segoe UI"; context.textAlign = "center"; context.fillText(String(sample.id), x, y + 4);
        }
        const x = this.robot.x * cell + 20, y = this.robot.y * cell + 20;
        context.fillStyle = "#12112c";
        context.fillRect(x - 14, y - 8, 6, 18); context.fillRect(x + 8, y - 8, 6, 18);
        context.fillStyle = "#ff8b7b";
        context.beginPath(); context.roundRect(x - 10, y - 13, 20, 25, 5); context.fill();
        context.fillStyle = "#fff0dc"; context.fillRect(x - 6, y - 8, 12, 6);
        context.strokeStyle = "#ffb391"; context.lineWidth = 2; context.beginPath(); context.moveTo(x + 5, y - 13); context.lineTo(x + 8, y - 20); context.stroke();
        document.getElementById("collected").textContent = `${6 - this.samples.length} / 6 échantillons`;
        document.getElementById("turns").textContent = "Tour " + this.turns;
        canvas.setAttribute("aria-label", `Carte martienne : robot en ${this.robot.x}, ${this.robot.y} ; ${this.samples.length} échantillons restants ; tour ${this.turns}.`);
    }
}
const stack = new mw_games.SceneStack();
stack.replace(new MarsScene());
canvas.addEventListener("click", () => canvas.focus());

async function apply() {
    stop();
    setBusy(true);
    try {
        await request("apply", { source: editor.value });
        statusLine.textContent = "Stratégie appliquée. Avancez d’un tour ou lancez le robot.";
    } catch (error) { statusLine.textContent = "Script refusé : " + error.message; }
    finally { setBusy(false); }
}
async function step() {
    if (busy) return;
    const scene = stack.current;
    if (!scene.samples.length || scene.turns >= 120) return;
    const currentGeneration = generation;
    setBusy(true);
    try {
        const targets = scene.candidates();
        if (!targets.length) throw new Error("Aucune cible accessible.");
        const choice = await request("choose", { targets: targets.map(({ route, ...sample }) => sample) });
        if (currentGeneration !== generation) return;
        const target = targets[choice.index - 1];
        scene.route = target.route;
        document.getElementById("log").textContent = `Tour ${scene.turns + 1} : Lua choisit l’échantillon ${target.id}.\nMWG trouve un chemin de ${target.distance} pas.\nProchain déplacement : (${target.route[0].x}, ${target.route[0].y}).`;
        scene.move(target.route[0]);
        if (scene.samples.length && scene.turns < 120) statusLine.textContent = `Cible ${target.id} choisie par Lua ; ${target.distance - 1} pas avant cette cible.`;
    } catch (error) {
        stop();
        statusLine.textContent = "Robot arrêté : " + error.message;
    } finally {
        setBusy(false);
        if (running) autoTimer = setTimeout(step, Number(document.getElementById("speed").value));
    }
}
editor.value = PRESETS.nearest;
document.getElementById("preset").addEventListener("change", event => { stop(); editor.value = PRESETS[event.target.value]; statusLine.textContent = "Appliquez le nouvel exemple pour l’utiliser."; });
editor.addEventListener("input", () => { stop(); statusLine.textContent = "Script modifié. Cliquez sur Appliquer le script pour l’utiliser."; });
applyButton.addEventListener("click", apply);
stepButton.addEventListener("click", step);
playButton.addEventListener("click", () => {
    if (running) { stop(); statusLine.textContent = "Robot en pause."; }
    else { running = true; playButton.textContent = "Mettre en pause"; step(); }
});
document.getElementById("reset").addEventListener("click", () => {
    stop(); generation++;
    stack.replace(new MarsScene());
    document.getElementById("log").textContent = "Le chemin affiché est calculé par MWG.";
    statusLine.textContent = "Carte réinitialisée. La stratégie appliquée est conservée.";
});
document.addEventListener("keydown", event => {
    if (event.target.matches("textarea, input, select, button") || busy) return;
    const direction = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }[event.key];
    if (!direction) return;
    event.preventDefault(); stop();
    const scene = stack.current;
    if (!scene.samples.length || scene.turns >= 120) return;
    scene.route = [];
    scene.move({ x: scene.robot.x + direction[0], y: scene.robot.y + direction[1] });
});
apply();
