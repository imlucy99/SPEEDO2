const MPS_TO_MPH = 2.236936;
const MAX_MPH = 180;    // skala speedometer
const MAX_RPM = 8;      // skala tachometer (x1000)

const $ = (id) => document.getElementById(id);
const elHud = $('hud');
const elSpeed = $('speed-display');
const elGear = $('gear');
const elOdo = $('odometer');
const elRpmVal = $('rpm-val');
const elRpmGauge = $('rpm-gauge');

// ---------- Helper Parser (JGRP) ----------
function isLockedState(val) {
    return val === true || val === 1 || val === "1" || val === "true" || val === 2 || val === "2";
}
function isTrueValue(val) {
    return val === true || val === 1 || val === "1" || val === "true";
}

// ---------- Gauge builder (SVG) ----------
const CX = 120, START = 135, SWEEP = 270;
const ang = (v, max) => START + (v / max) * SWEEP;
const pol = (r, a) => {
    const t = (a * Math.PI) / 180;
    return [(CX + r * Math.cos(t)).toFixed(2), (CX + r * Math.sin(t)).toFixed(2)];
};
function band(r1, r2, a1, a2) {
    const [x1, y1] = pol(r2, a1), [x2, y2] = pol(r2, a2);
    const [x3, y3] = pol(r1, a2), [x4, y4] = pol(r1, a1);
    const large = a2 - a1 > 180 ? 1 : 0;
    return `M${x1} ${y1}A${r2} ${r2} 0 ${large} 1 ${x2} ${y2}L${x3} ${y3}A${r1} ${r1} 0 ${large} 0 ${x4} ${y4}Z`;
}

function buildGauge(svg, { max, major, minor, red, label }) {
    const gid = 'face-' + svg.id;
    let s = `
      <defs>
        <radialGradient id="${gid}" cx="50%" cy="45%" r="60%">
          <stop offset="0" stop-color="#ffd21a"/><stop offset="1" stop-color="#e2b000"/>
        </radialGradient>
      </defs>
      <circle cx="120" cy="120" r="118" fill="#0b0b0d"/>
      <circle cx="120" cy="120" r="113" fill="url(#${gid})"/>`;

    if (red !== undefined) {
        s += `<path class="redzone" d="${band(66, 113, ang(red, max), ang(max, max))}" fill="#e5242b"/>`;
    }

    for (let v = 0; v <= max + 1e-6; v += minor) {
        const isMajor = Math.abs(v / major - Math.round(v / major)) < 1e-6;
        const a = ang(v, max);
        const [x1, y1] = pol(113, a), [x2, y2] = pol(isMajor ? 99 : 106, a);
        s += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#0b0b0d" stroke-width="${isMajor ? 2.5 : 1.2}"/>`;
        if (isMajor) {
            const [tx, ty] = pol(84, a);
            const onRed = red !== undefined && v >= red;
            s += `<text class="tick-label${onRed ? ' on-red' : ''}" x="${tx}" y="${ty}" text-anchor="middle" dominant-baseline="central">${label(v)}</text>`;
        }
    }

    s += `
      <circle cx="120" cy="120" r="62" fill="#0b0b0d"/>
      <circle cx="120" cy="120" r="66" fill="none" stroke="#0b0b0d" stroke-width="2"/>
      <g class="needle" style="transform:rotate(${START + 90}deg)">
        <line x1="120" y1="136" x2="120" y2="16" stroke="#e5242b" stroke-width="3" stroke-linecap="round"/>
      </g>
      <circle cx="120" cy="120" r="10" fill="#17171b" stroke="#2b2b31" stroke-width="2"/>`;

    svg.innerHTML = s;
    return svg.querySelector('.needle');
}

const rpmNeedle = buildGauge($('rpm-svg'), { max: MAX_RPM, major: 1, minor: 0.5, red: 7, label: (v) => v });
const spdNeedle = buildGauge($('spd-svg'), { max: MAX_MPH, major: 20, minor: 10, label: (v) => v });

function moveNeedle(needle, ratio) {
    const r = Math.max(0, Math.min(1, ratio));
    needle.style.transform = `rotate(${START + r * SWEEP + 90}deg)`;
}

// Segmen bar (engine & fuel)
function buildSegs(id, n) {
    const el = $(id);
    el.innerHTML = '<i class="seg"></i>'.repeat(n);
    return el.querySelectorAll('.seg');
}
const hSegs = buildSegs('health-segments', 10);
const fSegs = buildSegs('fuel-segments', 10);
function fillSegs(segs, percent) {
    const active = Math.round(percent * segs.length);
    segs.forEach((seg, i) => seg.classList.toggle('active', i < active));
}

// ---------- State (disimpan supaya intro tidak menimpa data game) ----------
let introActive = true;
const state = { mph: 0, rpm: 0 };

function renderNeedles() {
    moveNeedle(spdNeedle, state.mph / MAX_MPH);
    moveNeedle(rpmNeedle, state.rpm);
}

// ---------- 1. Kecepatan ----------
window.setSpeed = function (speed) {
    const mph = Math.round(Number(speed || 0) * MPS_TO_MPH);
    state.mph = mph;
    const padded = String(mph).padStart(3, '0');

    if (mph < 10) {
        elSpeed.innerHTML = `<span class="dim">${padded.slice(0, 2)}</span><span class="bright">${padded.slice(2)}</span>`;
    } else if (mph < 100) {
        elSpeed.innerHTML = `<span class="dim">${padded.slice(0, 1)}</span><span class="bright">${padded.slice(1)}</span>`;
    } else {
        elSpeed.innerHTML = `<span class="bright">${padded}</span>`;
    }
    if (!introActive) moveNeedle(spdNeedle, mph / MAX_MPH);
};

// ---------- 2. RPM (0.0 - 1.0) ----------
window.setRPM = function (rpm) {
    const val = Math.max(0, Math.min(1, Number(rpm || 0)));
    state.rpm = val;
    elRpmVal.textContent = Math.round(val * MAX_RPM * 1000);
    elRpmGauge.classList.toggle('redline', val >= 7 / MAX_RPM);
    if (!introActive) moveNeedle(rpmNeedle, val);
};

// ---------- 3. Fuel ----------
window.setFuel = function (fuel) {
    const val = Number(fuel || 0);
    const percent = Math.max(0, Math.min(1, val > 1 ? val / 100 : val));
    $('fuel-val').textContent = Math.round(percent * 100);
    fillSegs(fSegs, percent);
};

// ---------- 4. Engine Health ----------
window.setHealth = function (health) {
    let val = Number(health || 0);
    let percent = Math.max(0, Math.min(1, val > 1 ? val / 1000 : val));
    $('health-val').textContent = Math.round(percent * 100);
    fillSegs(hSegs, percent);

    const engineIcon = $('engine-icon');
    if (engineIcon) {
        engineIcon.className = 'stat-icon';
        if (percent <= 0.25) engineIcon.classList.add('active-danger');
        else if (percent <= 0.50) engineIcon.classList.add('active-warn');
    }
};

// ---------- 5. Gear ----------
window.setGear = function (gear) {
    elGear.innerText = (gear == 0 || gear === "0") ? 'R' : String(gear);
};

// ---------- 6. Lock / Unlock ----------
window.updateLockStatus = function (state) {
    const el = $('door-lock');
    if (el) el.className = isLockedState(state) ? 'icon-item tile locked' : 'icon-item tile';
};
window.setDoors = window.updateLockStatus;
window.setDoorLock = window.updateLockStatus;
window.setVehicleLocked = window.updateLockStatus;
window.setLocked = window.updateLockStatus;
window.setLock = window.updateLockStatus;
window.toggleLock = window.updateLockStatus;

// ---------- 7. Lampu ----------
window.setHeadlights = function (state) {
    const low = $('headlight-low');
    const high = $('headlight-high');
    const val = Number(state || 0);
    if (low) low.className = (val === 1) ? 'icon-item tile active' : 'icon-item tile';
    if (high) high.className = (val === 2) ? 'icon-item tile high-beam' : 'icon-item tile';
};

// ---------- 8. Sein ----------
window.setLeftIndicator = function (state) {
    const el = $('indicator-left');
    if (el) el.className = isTrueValue(state) ? 'icon-item arrow active' : 'icon-item arrow';
};
window.setRightIndicator = function (state) {
    const el = $('indicator-right');
    if (el) el.className = isTrueValue(state) ? 'icon-item arrow active' : 'icon-item arrow';
};

// ---------- 9. Seatbelt ----------
window.setSeatbelts = function (state) {
    const el = $('seatbelts');
    if (el) el.className = isTrueValue(state) ? 'icon-item tile active' : 'icon-item tile warn';
};

// ---------- 10. Odometer ----------
window.setOdometer = function (distance) {
    if (elOdo) elOdo.innerText = `${Number(distance || 0).toFixed(1)} mi`;
};

// ---------- Intro: siluet mobil + tes jarum ----------
window.playIntro = function () {
    const intro = $('intro');
    introActive = true;
    elHud.classList.add('sweeping');

    // restart animasi CSS & SMIL
    intro.classList.remove('done');
    intro.style.animation = 'none';
    intro.querySelectorAll('.stage, .beam').forEach((e) => { e.style.animation = 'none'; });
    void intro.offsetWidth;
    intro.style.animation = '';
    intro.querySelectorAll('.stage, .beam').forEach((e) => { e.style.animation = ''; });
    const anim = $('scan-anim');
    if (anim && anim.beginElement) anim.beginElement();

    moveNeedle(spdNeedle, 0);
    moveNeedle(rpmNeedle, 0);

    setTimeout(() => { moveNeedle(spdNeedle, 1); moveNeedle(rpmNeedle, 1); }, 2800); // jarum naik
    setTimeout(() => { moveNeedle(spdNeedle, 0); moveNeedle(rpmNeedle, 0); }, 3700); // jarum turun
    setTimeout(() => {
        intro.classList.add('done');
        elHud.classList.remove('sweeping');
        introActive = false;
        renderNeedles();                                                              // pakai data game terbaru
    }, 4600);
};

// ---------- Message handler ----------
window.addEventListener('message', function (event) {
    if (!event.data) return;
    const data = event.data;
    if (data.type === 'setDoors' || data.action === 'setDoors' || data.type === 'lock') {
        window.updateLockStatus(data.status !== undefined ? data.status : data.state);
    }
    if (data.type === 'playIntro' || data.action === 'playIntro') window.playIntro();
});

// Nilai awal & jalankan intro saat HUD pertama dimuat
window.setSpeed(0);
window.setRPM(0);
window.playIntro();
