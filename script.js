// ================== KONFIGURASI ==================
const SPEED_UNIT = 'mph';   // 'mph' atau 'kmh' -> unit utama di tengah (unit lain tampil di panel kanan)
const MPS_TO_MPH = 2.236936;
const MPS_TO_KMH = 3.6;
const MAX_SPEED_BAR = { mph: 180, kmh: 280 };

const MAX_RPM = 8;        // skala tachometer (x1000)
const RED_RPM = 7;        // mulai red zone
const BLINK_RPM = 7.5;    // red zone berkedip di atas ini

const $ = (id) => document.getElementById(id);
const elHud = $('hud');
const elSpeed = $('speed-display');
const elGear = $('gear');
const elOdo = $('odometer');
const elRpmVal = $('rpm-val');

// ---------- Helper Parser (JGRP) ----------
function isLockedState(val) {
    return val === true || val === 1 || val === "1" || val === "true" || val === 2 || val === "2";
}
function isTrueValue(val) {
    return val === true || val === 1 || val === "1" || val === "true";
}

// ================== GAMBAR GAUGE (SVG) ==================
const CX = 440, CY = 197;            // pusat tachometer
const START = 162.5, SWEEP = 215;    // 0 di kiri-bawah, 4 di atas, 8 di kanan-bawah
const R_RING = 182;
const HATCH_N = 84;

const rad = (a) => (a * Math.PI) / 180;
const pt = (cx, cy, r, a) => [(cx + r * Math.cos(rad(a))).toFixed(2), (cy + r * Math.sin(rad(a))).toFixed(2)];
const ang = (v) => START + (v / MAX_RPM) * SWEEP;
function arcPath(cx, cy, r, a1, a2) {
    const [x1, y1] = pt(cx, cy, r, a1), [x2, y2] = pt(cx, cy, r, a2);
    const large = Math.abs(a2 - a1) > 180 ? 1 : 0;
    const sweep = a2 > a1 ? 1 : 0;
    return `M${x1} ${y1}A${r} ${r} 0 ${large} ${sweep} ${x2} ${y2}`;
}
function line(cx, cy, r1, r2, a, cls, extra) {
    const [x1, y1] = pt(cx, cy, r1, a), [x2, y2] = pt(cx, cy, r2, a);
    return `<line class="${cls}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" ${extra}/>`;
}

// busur samping: fuel (kiri) & oil (kanan)
const SIDE_N = 13;
const FUEL_ARC = { cx: 339, cy: 162, r: 137, aE: 152, step: 5 };     // E bawah, F atas
const OIL_ARC  = { cx: 541, cy: 162, r: 137, aE: 28,  step: -5 };    // L bawah, H atas

function buildCluster(svg) {
    let s = '';

    // --- ring luar + tick ---
    s += `<path d="${arcPath(CX, CY, R_RING, ang(0), ang(MAX_RPM))}" fill="none" stroke="#c9c9cf" stroke-width="3"/>`;
    for (let v = 0; v <= MAX_RPM + 1e-6; v += 0.5) {
        const isMajor = Math.abs(v - Math.round(v)) < 1e-6;
        s += line(CX, CY, R_RING, isMajor ? 166 : 174, ang(v), 'tick',
            `stroke="#d8d8de" stroke-width="${isMajor ? 3 : 1.6}"`);
    }

    // --- dasar red zone (7-8) ---
    s += `<path class="redzone" d="${arcPath(CX, CY, 150, ang(RED_RPM), ang(MAX_RPM))}" fill="none" stroke="#b3121a" stroke-width="24"/>`;

    // --- garis arsir RPM ---
    for (let i = 0; i < HATCH_N; i++) {
        const frac = i / (HATCH_N - 1);
        s += line(CX, CY, 138, 162, ang(frac * MAX_RPM), 'hl', 'stroke="#16161a" stroke-width="2.6"');
    }

    // --- angka ---
    for (let v = 0; v <= MAX_RPM; v++) {
        const [tx, ty] = pt(CX, CY, 118, ang(v));
        s += `<text class="tick-label" x="${tx}" y="${ty}" text-anchor="middle" dominant-baseline="central">${v}</text>`;
    }

    // --- busur FUEL (kiri) ---
    for (let i = 0; i < SIDE_N; i++) {
        const a = FUEL_ARC.aE + i * FUEL_ARC.step;
        s += line(FUEL_ARC.cx, FUEL_ARC.cy, FUEL_ARC.r, FUEL_ARC.r - (i % 3 === 0 ? 17 : 10), a, 'ft', 'stroke-width="2.4" stroke="#3a3a40"');
    }
    let [fx, fy] = pt(FUEL_ARC.cx, FUEL_ARC.cy, 156, FUEL_ARC.aE + 12 * FUEL_ARC.step);
    s += `<text class="arc-lbl" x="${fx}" y="${fy}" text-anchor="middle" dominant-baseline="central">F</text>`;
    [fx, fy] = pt(FUEL_ARC.cx, FUEL_ARC.cy, 156, FUEL_ARC.aE);
    s += `<text class="arc-lbl red" x="${fx}" y="${fy}" text-anchor="middle" dominant-baseline="central">E</text>`;
    s += `<g transform="translate(168 238)" fill="#cfcfd6"><path d="M19.77 7.23l.01-.01-3.72-3.72L15 4.56l2.11 2.11c-.94.36-1.61 1.26-1.61 2.33 0 1.38 1.12 2.5 2.5 2.5.36 0 .69-.08 1-.21v7.21c0 .55-.45 1-1 1s-1-.45-1-1V14c0-1.1-.9-2-2-2h-1V5c0-1.1-.9-2-2-2H6c-1.1 0-2 .9-2 2v16h10v-7.5h1.5v5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5V9c0-.69-.28-1.32-.73-1.77zM12 10H6V5h6v5zm6 0c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z"/></g>`;

    // --- busur OIL PRESS (kanan) ---
    for (let i = 0; i < SIDE_N; i++) {
        const a = OIL_ARC.aE + i * OIL_ARC.step;
        s += line(OIL_ARC.cx, OIL_ARC.cy, OIL_ARC.r, OIL_ARC.r - (i % 3 === 0 ? 17 : 10), a, 'ot', 'stroke-width="2.4" stroke="#3a3a40"');
    }
    [fx, fy] = pt(OIL_ARC.cx, OIL_ARC.cy, 156, OIL_ARC.aE + 12 * OIL_ARC.step);
    s += `<text class="arc-lbl" x="${fx}" y="${fy}" text-anchor="middle" dominant-baseline="central">H</text>`;
    [fx, fy] = pt(OIL_ARC.cx, OIL_ARC.cy, 156, OIL_ARC.aE);
    s += `<text class="arc-lbl red" x="${fx}" y="${fy}" text-anchor="middle" dominant-baseline="central">L</text>`;
    s += `<g transform="translate(680 222)" fill="#cfcfd6"><path d="M12 2.5c-3 4-6 7-6 11a6 6 0 0 0 12 0c0-4-3-7-6-11z"/></g>`;

    // --- jarum RPM ---
    s += `
      <g class="needle" style="transform:rotate(${START + 90}deg)">
        <line x1="${CX}" y1="${CY - 128}" x2="${CX}" y2="${CY - 180}" stroke="#000" stroke-width="9" stroke-linecap="butt"/>
        <line x1="${CX}" y1="${CY - 130}" x2="${CX}" y2="${CY - 178}" stroke="#ff2a2a" stroke-width="5" stroke-linecap="butt"/>
      </g>`;

    svg.innerHTML = s;
}

buildCluster($('cluster-svg'));
const needle = document.querySelector('#cluster-svg .needle');
const hatch = [...document.querySelectorAll('#cluster-svg .hl')];
const fuelTicks = [...document.querySelectorAll('#cluster-svg .ft')];
const oilTicks = [...document.querySelectorAll('#cluster-svg .ot')];

// ---------- Render tachometer (jarum + arsir) ----------
function renderTach(ratio) {
    needle.style.transform = `rotate(${START + ratio * SWEEP + 90}deg)`;
    const redFrac = RED_RPM / MAX_RPM;
    hatch.forEach((el, i) => {
        const frac = i / (HATCH_N - 1);
        if (frac <= ratio) {
            const t = ratio > 0 ? frac / ratio : 0;
            el.setAttribute('stroke', `hsl(355 85% ${16 + t * 36}%)`);
        } else {
            el.setAttribute('stroke', frac >= redFrac ? 'rgba(0,0,0,0)' : '#16161a');
        }
    });
}

// animasi halus menuju target
let cur = 0, target = 0, rate = 0.2;
function frame() {
    const d = target - cur;
    if (Math.abs(d) > 0.0004) {
        cur += d * rate;
        renderTach(cur);
    }
    requestAnimationFrame(frame);
}
renderTach(0);
requestAnimationFrame(frame);

// ---------- Busur samping ----------
function setArc(ticks, ratio, warnAt, dangerAt, redLowTicks) {
    const lit = ratio <= 0 ? 0 : Math.max(1, Math.round(ratio * SIDE_N));
    const color = ratio <= dangerAt ? '#ff3c3c' : ratio <= warnAt ? '#ff9100' : '#e8e8ee';
    ticks.forEach((el, i) => {
        if (i < lit) el.setAttribute('stroke', color);
        else el.setAttribute('stroke', i < redLowTicks ? '#5a1d1d' : '#3a3a40');
    });
}

function setBar(id, rowId, percent, warnAt, dangerAt) {
    $(id).style.width = Math.round(percent * 100) + '%';
    const row = $(rowId);
    if (row) {
        row.classList.toggle('danger', percent <= dangerAt);
        row.classList.toggle('warn', percent > dangerAt && percent <= warnAt);
    }
}

// ---------- State ----------
let introActive = true;
const state = { rpm: 0 };

// ---------- 1. Kecepatan ----------
window.setSpeed = function (speed) {
    const mps = Number(speed || 0);
    const main = Math.round(mps * (SPEED_UNIT === 'kmh' ? MPS_TO_KMH : MPS_TO_MPH));
    const alt  = Math.round(mps * (SPEED_UNIT === 'kmh' ? MPS_TO_MPH : MPS_TO_KMH));
    const padded = String(main).padStart(3, '0');

    if (main < 10) {
        elSpeed.innerHTML = `<span class="dim">${padded.slice(0, 2)}</span><span class="bright">${padded.slice(2)}</span>`;
    } else if (main < 100) {
        elSpeed.innerHTML = `<span class="dim">${padded.slice(0, 1)}</span><span class="bright">${padded.slice(1)}</span>`;
    } else {
        elSpeed.innerHTML = `<span class="bright">${padded}</span>`;
    }
    $('alt-speed').textContent = alt;
    $('speed-bar').style.width = Math.min(100, (main / MAX_SPEED_BAR[SPEED_UNIT]) * 100) + '%';
};

// ---------- 2. RPM (0.0 - 1.0) ----------
window.setRPM = function (rpm) {
    const val = Math.max(0, Math.min(1, Number(rpm || 0)));
    state.rpm = val;
    elRpmVal.textContent = Math.round(val * MAX_RPM * 1000);
    elHud.classList.toggle('redline', val >= BLINK_RPM / MAX_RPM);
    if (!introActive) target = val;
};

// ---------- 3. Fuel ----------
window.setFuel = function (fuel) {
    const val = Number(fuel || 0);
    const percent = Math.max(0, Math.min(1, val > 1 ? val / 100 : val));
    $('fuel-val').textContent = Math.round(percent * 100);
    setBar('fuel-bar', 'm-fuel', percent, 0.30, 0.15);
    setArc(fuelTicks, percent, 0.30, 0.15, 2);
};

// ---------- 4. Engine Health (label tampil: OIL PRESS) ----------
window.setHealth = function (health) {
    let val = Number(health || 0);
    let percent = Math.max(0, Math.min(1, val > 1 ? val / 1000 : val));
    $('health-val').textContent = Math.round(percent * 100);
    setBar('health-bar', 'm-oil', percent, 0.50, 0.25);
    setArc(oilTicks, percent, 0.50, 0.25, 3);

    const engineIcon = $('engine-icon');
    if (engineIcon) {
        engineIcon.className = 'stat-icon pos';
        if (percent <= 0.25) engineIcon.classList.add('active-danger');
        else if (percent <= 0.50) engineIcon.classList.add('active-warn');
    }
};

// ---------- 5. Gear ----------
window.setGear = function (gear) {
    elGear.innerText = (gear == 0 || gear === "0") ? 'R' : String(gear);
};

// ---------- 6. Lock / Unlock Vehicle (Mendukung semua alternatif panggilan JGRP) ----------
let lockedNow = false;
window.updateLockStatus = function (state) {
    const el = $('door-lock');
    if (!el) return;

    // dipanggil tanpa argumen (mis. toggleLock()) -> balik status
    const locked = (state === undefined) ? !lockedNow : isLockedState(state);
    lockedNow = locked;

    if (locked) {
        el.className = 'icon-item tile pos locked';   // Nyala kuning (Terkunci)
    } else {
        el.className = 'icon-item tile pos';          // Mati (Terbuka)
    }
};
[
    'setDoors', 'setDoorLock', 'setDoorsLocked', 'setVehicleLocked', 'setVehicleLock',
    'setLocked', 'setLock', 'toggleLock', 'updateLock', 'lockVehicle', 'setCarLock'
].forEach((name) => { window[name] = window.updateLockStatus; });

// ---------- 7. Lampu ----------
window.setHeadlights = function (state) {
    const low = $('headlight-low');
    const high = $('headlight-high');
    const val = Number(state || 0);
    if (low) low.className = (val === 1) ? 'icon-item tile pos active' : 'icon-item tile pos';
    if (high) high.className = (val === 2) ? 'icon-item tile pos high-beam' : 'icon-item tile pos';
};

// ---------- 8. Sein ----------
window.setLeftIndicator = function (state) {
    const el = $('indicator-left');
    if (el) el.className = isTrueValue(state) ? 'icon-item arrow pos active' : 'icon-item arrow pos';
};
window.setRightIndicator = function (state) {
    const el = $('indicator-right');
    if (el) el.className = isTrueValue(state) ? 'icon-item arrow pos active' : 'icon-item arrow pos';
};

// ---------- 9. Seatbelt ----------
window.setSeatbelts = function (state) {
    const el = $('seatbelts');
    if (el) el.className = isTrueValue(state) ? 'icon-item tile pos active' : 'icon-item tile pos warn';
};

// ---------- 10. Odometer ----------
window.setOdometer = function (distance) {
    if (elOdo) elOdo.textContent = Number(distance || 0).toFixed(1);
};

// ---------- Intro: siluet mobil + tes jarum ----------
window.playIntro = function () {
    const intro = $('intro');
    introActive = true;

    // restart animasi CSS & SMIL
    intro.classList.remove('done');
    intro.style.animation = 'none';
    intro.querySelectorAll('.stage, .beam').forEach((e) => { e.style.animation = 'none'; });
    void intro.offsetWidth;
    intro.style.animation = '';
    intro.querySelectorAll('.stage, .beam').forEach((e) => { e.style.animation = ''; });
    const anim = $('scan-anim');
    if (anim && anim.beginElement) anim.beginElement();

    rate = 0.06;
    target = 0;

    setTimeout(() => { target = 1; }, 2800);   // jarum naik
    setTimeout(() => { target = 0; }, 3700);   // jarum turun
    setTimeout(() => {
        intro.classList.add('done');
        introActive = false;
        rate = 0.2;
        target = state.rpm;                    // pakai data game terbaru
    }, 4600);
};

// ---------- Message handler ----------
window.addEventListener('message', function (event) {
    if (!event.data) return;
    const data = event.data;
    const t = data.type || data.action;
    if (['setDoors', 'lock', 'setLock', 'setLocked', 'updateLockStatus', 'setDoorLock'].includes(t)) {
        const v = data.status !== undefined ? data.status
                : data.state !== undefined ? data.state
                : data.locked !== undefined ? data.locked
                : data.value;
        window.updateLockStatus(v);
    }
    if (t === 'playIntro') window.playIntro();
});

// ---------- Nilai awal ----------
$('speed-mode').textContent = SPEED_UNIT === 'kmh' ? 'KM/H' : 'MPH';
$('alt-unit').textContent   = SPEED_UNIT === 'kmh' ? 'MPH' : 'KM/H';
window.setSpeed(0);
window.setRPM(0);
window.setFuel(0);
window.setHealth(0);
window.playIntro();
