a(() => {
  const NS = "http://www.w3.org/2000/svg";
  const START = 190;   // derajat dari atas, searah jarum jam (posisi angka 0)
  const SWEEP = 265;   // total sapuan jarum
  const C = 200;

  const el = (tag, attrs = {}, parent) => {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  };
  const pt = (deg, r) => {
    const a = (deg * Math.PI) / 180;
    return [C + r * Math.sin(a), C - r * Math.cos(a)];
  };
  const arcPath = (a0, a1, r0, r1) => {
    const large = a1 - a0 > 180 ? 1 : 0;
    const [x0, y0] = pt(a0, r1), [x1, y1] = pt(a1, r1);
    const [x2, y2] = pt(a1, r0), [x3, y3] = pt(a0, r0);
    return `M${x0} ${y0} A${r1} ${r1} 0 ${large} 1 ${x1} ${y1} L${x2} ${y2} A${r0} ${r0} 0 ${large} 0 ${x3} ${y3}Z`;
  };

  /* ---------------- Gauge builder ---------------- */
  function buildGauge(host, { max, major, minor, labelFn, redFrom, logo, uid }) {
    const svg = el("svg", { viewBox: "0 0 400 400", class: "dial" });
    const defs = el("defs", {}, svg);

    const bez = el("linearGradient", { id: `bez${uid}`, x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
    el("stop", { offset: 0, "stop-color": "#5b5d62" }, bez);
    el("stop", { offset: .5, "stop-color": "#1c1d1f" }, bez);
    el("stop", { offset: 1, "stop-color": "#46484c" }, bez);

    const face = el("radialGradient", { id: `face${uid}`, cx: .5, cy: .45, r: .6 }, defs);
    el("stop", { offset: .55, "stop-color": "#ffd54a" }, face);
    el("stop", { offset: 1, "stop-color": "#e8a90a" }, face);

    const hub = el("radialGradient", { id: `hub${uid}`, cx: .4, cy: .35, r: .7 }, defs);
    el("stop", { offset: 0, "stop-color": "#5a5a5e" }, hub);
    el("stop", { offset: 1, "stop-color": "#0c0c0d" }, hub);

    const inner = el("radialGradient", { id: `in${uid}`, cx: .5, cy: .4, r: .6 }, defs);
    el("stop", { offset: 0, "stop-color": "#2b2c2f" }, inner);
    el("stop", { offset: 1, "stop-color": "#050506" }, inner);

    // bezel + face
    el("circle", { cx: C, cy: C, r: 198, fill: "#000" }, svg);
    el("circle", { cx: C, cy: C, r: 194, fill: `url(#bez${uid})` }, svg);
    el("circle", { cx: C, cy: C, r: 184, fill: "#0b0b0c" }, svg);
    el("circle", { cx: C, cy: C, r: 180, fill: `url(#face${uid})` }, svg);

    // red zone
    if (redFrom != null) {
      const a0 = START + (redFrom / max) * SWEEP, a1 = START + SWEEP;
      el("path", { d: arcPath(a0, a1, 104, 180), fill: "#e5231b" }, svg);
    }

    // ticks
    const ticks = el("g", { stroke: "#111", "stroke-linecap": "butt" }, svg);
    for (let v = 0; v <= max + 1e-6; v += minor) {
      const isMajor = Math.abs(v / major - Math.round(v / major)) < 1e-6;
      const a = START + (v / max) * SWEEP;
      const [x0, y0] = pt(a, 178), [x1, y1] = pt(a, isMajor ? 152 : 166);
      el("line", { x1: x0, y1: y0, x2: x1, y2: y1, "stroke-width": isMajor ? 5 : 2.2 }, ticks);
    }
    // labels
    const labels = el("g", { fill: "#111", "font-family": "Barlow Condensed", "font-weight": 700, "text-anchor": "middle", "dominant-baseline": "central" }, svg);
    for (let v = 0; v <= max + 1e-6; v += major) {
      const a = START + (v / max) * SWEEP;
      const [x, y] = pt(a, 130);
      const t = el("text", { x, y, "font-size": max > 20 ? 25 : 36 }, labels);
      t.textContent = labelFn(v);
    }

    // inner disc
    el("circle", { cx: C, cy: C, r: 100, fill: "#090909" }, svg);
    el("circle", { cx: C, cy: C, r: 96, fill: `url(#in${uid})`, stroke: "#333", "stroke-width": 1.5 }, svg);
    el("path", { d: arcPath(START, START + SWEEP, 98, 104), fill: "#111" }, svg);

    // logo
    const g = el("g", { "font-family": "Barlow Condensed", "text-anchor": "middle" }, svg);
    if (logo === "script") {
      const t = el("text", { x: C - 8, y: C - 38, fill: "#f6c21c", "font-size": 30, "font-family": "Kaushan Script", transform: `rotate(-8 ${C} ${C - 38})` }, g);
      t.textContent = "Hyperdash";
    } else {
      el("rect", { x: C - 34, y: C - 66, width: 68, height: 34, rx: 4, fill: "#111", stroke: "#f6c21c", "stroke-width": 2.5 }, g);
      const t = el("text", { x: C, y: C - 40, fill: "#f6c21c", "font-size": 28, "font-weight": 800 }, g);
      t.textContent = "IC-7";
    }

    // needle
    const needle = el("g", { class: "needle", transform: `rotate(${START} ${C} ${C})` }, svg);
    el("path", { d: `M${C - 3} ${C + 26} L${C - 5} ${C} L${C - 1.5} ${C - 176} L${C + 1.5} ${C - 176} L${C + 5} ${C} L${C + 3} ${C + 26}Z`, fill: "#e5231b", stroke: "#7a0d08", "stroke-width": .8 }, needle);
    el("path", { d: `M${C - .6} ${C - 2} L${C - 1} ${C - 170} L${C + .6} ${C - 170}Z`, fill: "#ff9a92" }, needle);
    el("circle", { cx: C, cy: C, r: 20, fill: `url(#hub${uid})`, stroke: "#000", "stroke-width": 2 }, svg);
    el("circle", { cx: C, cy: C, r: 6, fill: "#1b1b1c" }, svg);

    host.prepend(svg);
    return { set(v) { const a = START + (Math.max(0, Math.min(max, v)) / max) * SWEEP; needle.setAttribute("transform", `rotate(${a} ${C} ${C})`); } };
  }

  const rpmGauge = buildGauge(document.getElementById("gaugeRpm"), {
    max: 8000, major: 1000, minor: 500, labelFn: v => v / 1000, redFrom: 7000, logo: "script", uid: "r",
  });
  const speedGauge = buildGauge(document.getElementById("gaugeSpeed"), {
    max: 240, major: 20, minor: 10, labelFn: v => v, logo: "box", uid: "s",
  });

  /* ---------------- Tiles ---------------- */
  const TILE_DEFS = {
    left: [
      { key: "map", label: "MAP", unit: "psi", min: -15, max: 25, dp: 0 },
      { key: "cts", label: "CTS", unit: "°C", min: 0, max: 120, dp: 0, hot: 105 },
      { key: "iat", label: "IAT", unit: "°C", min: 0, max: 80, dp: 0, hot: 60 },
      { key: "inj", label: "INJ DUTY", unit: "%", min: 0, max: 100, dp: 0, hot: 85 },
    ],
    right: [
      { key: "ign", label: "IGN ANGLE", unit: "°", min: 0, max: 40, dp: 0 },
      { key: "tps", label: "TPS", unit: "%", min: 0, max: 100, dp: 0 },
      { key: "bat", label: "BATTERY", unit: "V", min: 10, max: 15, dp: 2 },
      { key: "oil", label: "OIL PRESSURE", unit: "psi", min: 0, max: 100, dp: 0 },
    ],
  };
  const tiles = {};
  const SEGS = 8;
  for (const side of ["left", "right"]) {
    const wrap = document.getElementById(side === "left" ? "tilesLeft" : "tilesRight");
    TILE_DEFS[side].forEach((d, i) => {
      const t = document.createElement("div");
      t.className = "tile";
      t.style.transitionDelay = `${0.15 + i * 0.08}s`;
      t.innerHTML = `<div class="bar">${"<i></i>".repeat(SEGS)}</div>
        <div class="body"><div class="value">0</div><div class="meta"><span>${d.label}</span></div></div>
        <span class="unit">${d.unit}</span>`;
      wrap.appendChild(t);
      tiles[d.key] = { d, value: t.querySelector(".value"), segs: [...t.querySelectorAll(".bar i")] };
    });
  }
  function setTile(key, v) {
    const { d, value, segs } = tiles[key];
    value.textContent = v.toFixed(d.dp);
    const lit = Math.round(((v - d.min) / (d.max - d.min)) * SEGS);
    segs.forEach((s, i) => {
      s.classList.toggle("lit", i < lit);
      s.classList.toggle("hot", d.hot != null && v >= d.hot);
    });
  }

  /* ---------------- Simulation ---------------- */
  const $ = id => document.getElementById(id);
  const rpmVal = $("rpmVal"), speedVal = $("speedVal"), gearVal = $("gearVal"), fuelVal = $("fuelVal");
  const shift = $("shift"), arrowL = $("arrowLeft"), arrowR = $("arrowRight");
  const icoEngine = $("icoEngine"), icoOil = $("icoOil");

  const RATIOS = [3.3, 1.95, 1.4, 1.08, 0.86, 0.72];
  const K = 7200 / (62 * RATIOS[0]);
  const IDLE = 880, LIMIT = 7900;

  const s = {
    running: false, throttle: 0, gas: false, brake: false, speed: 0, gear: 0, rpm: 0,
    cts: 42, iat: 29, fuel: 56.9, blinkL: false, blinkR: false, shiftCooldown: 0,
  };
  const smooth = { map: -10, oil: 0, bat: 12.4, inj: 0, ign: 14 };

  function step(dt) {
    s.throttle += ((s.gas ? 1 : 0) - s.throttle) * Math.min(1, dt * (s.gas ? 6 : 9));
    const t = s.throttle;

    // gear & speed
    if (s.gear === 0 && t > 0.05) s.gear = 1;
    const ratio = RATIOS[Math.max(0, s.gear - 1)];
    const drive = s.gear ? t * 46 * Math.pow(ratio / RATIOS[0], 0.55) : 0;
    const drag = 0.0009 * s.speed * s.speed + (t < 0.05 ? 3 : 0.6);
    const brake = s.brake ? 55 : 0;
    s.shiftCooldown -= dt;
    const cut = s.shiftCooldown > 0 ? 0.15 : 1;
    s.speed = Math.max(0, s.speed + (drive * cut - drag - brake) * dt);

    let target = s.gear ? s.speed * ratio * K : IDLE + t * 6500;
    target = Math.max(IDLE + t * 900, target);
    if (target > LIMIT) { target = LIMIT - Math.random() * 250; s.speed -= 2 * dt; } // rev limiter bounce
    s.rpm += (target - s.rpm) * Math.min(1, dt * 10);
    s.rpm += (Math.random() - 0.5) * 18;

    if (s.gear && s.gear < 6 && s.rpm > 7300 && s.shiftCooldown <= 0) { s.gear++; s.shiftCooldown = 0.25; }
    if (s.gear > 1 && s.rpm < 2600 && t < 0.5) s.gear--;
    if (s.speed < 1 && t < 0.05) s.gear = 0;

    // sensors
    const load = t * (s.rpm / 8000);
    const k = Math.min(1, dt * 3);
    smooth.map += ((-11 + t * 12 + load * 18) - smooth.map) * k;
    smooth.oil += ((14 + (s.rpm / 8000) * 66) - smooth.oil) * k;
    smooth.bat += ((13.75 + (s.rpm > 2000 ? 0.25 : 0) + (Math.random() - 0.5) * 0.04) - smooth.bat) * k;
    smooth.inj += ((2.5 + load * 88 + t * 4) - smooth.inj) * k;
    smooth.ign += ((14 + (1 - t) * 18 * Math.min(1, s.rpm / 3500) - t * 6) - smooth.ign) * k;
    s.cts += ((88 + load * 10) - s.cts) * dt * 0.035;
    s.iat += ((32 + load * 20 + (s.speed < 5 ? 6 : 0)) - s.iat) * dt * 0.08;
    s.fuel = Math.max(0, s.fuel - (0.0006 + load * 0.006) * dt);
  }

  function render(now) {
    rpmGauge.set(s.rpm);
    speedGauge.set(s.speed);
    rpmVal.textContent = Math.round(s.rpm);
    speedVal.textContent = Math.round(s.speed);
    gearVal.textContent = s.gear || "N";
    fuelVal.textContent = s.fuel.toFixed(1);

    setTile("map", smooth.map);
    setTile("cts", s.cts);
    setTile("iat", s.iat);
    setTile("inj", smooth.inj);
    setTile("ign", smooth.ign);
    setTile("tps", s.throttle * 100);
    setTile("bat", smooth.bat);
    setTile("oil", smooth.oil);

    shift.classList.toggle("on", s.rpm > 7000);
    icoEngine.classList.toggle("on", s.cts < 50);
    icoOil.classList.toggle("on", smooth.oil < 18 && s.rpm < 1000 && s.cts < 50);

    const blinkOn = Math.floor(now / 420) % 2 === 0;
    arrowL.classList.toggle("on", s.blinkL && blinkOn);
    arrowR.classList.toggle("on", s.blinkR && blinkOn);
  }

  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (s.running) step(dt);
    render(now);
    requestAnimationFrame(loop);
  }

  /* ---------------- Boot sequence ---------------- */
  const boot = $("boot"), dash = $("dash");
  let bootTimer, sweepRaf;

  function needleSweep() {
    // klasik: jarum menyapu ke maksimum lalu kembali (self-test)
    const t0 = performance.now(), dur = 1500;
    s.running = false;
    const tick = now => {
      const p = Math.min(1, (now - t0) / dur);
      const e = p < 0.5 ? Math.sin(p * Math.PI) : Math.sin(p * Math.PI) ** 1.4;
      s.rpm = e * 8000;
      s.speed = e * 240;
      if (p < 1) sweepRaf = requestAnimationFrame(tick);
      else { s.rpm = 0; s.speed = 0; s.running = true; }
    };
    sweepRaf = requestAnimationFrame(tick);
  }

  function finishBoot() {
    clearTimeout(bootTimer);
    boot.classList.add("done");
    dash.classList.add("on");
    needleSweep();
  }

  function playIntro() {
    cancelAnimationFrame(sweepRaf);
    Object.assign(s, { running: false, rpm: 0, speed: 0, gear: 0, throttle: 0 });
    dash.classList.remove("on");
    boot.classList.remove("done", "play");
    void boot.offsetWidth; // restart animasi CSS
    boot.classList.add("play");
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    bootTimer = setTimeout(finishBoot, reduce ? 600 : 4500);
  }
  boot.addEventListener("click", finishBoot);

  /* ---------------- Input ---------------- */
  const btn = { gas: $("gasBtn"), brake: $("brakeBtn"), left: $("leftBtn"), right: $("rightBtn"), hazard: $("hazardBtn") };
  const setGas = v => { s.gas = v; btn.gas.classList.toggle("active", v); };
  const setBrake = v => { s.brake = v; btn.brake.classList.toggle("active", v); };
  const syncBlink = () => {
    btn.left.classList.toggle("active", s.blinkL && !s.blinkR);
    btn.right.classList.toggle("active", s.blinkR && !s.blinkL);
    btn.hazard.classList.toggle("active", s.blinkL && s.blinkR);
  };
  const toggleLeft = () => { s.blinkL = !(s.blinkL && !s.blinkR); s.blinkR = false; syncBlink(); };
  const toggleRight = () => { s.blinkR = !(s.blinkR && !s.blinkL); s.blinkL = false; syncBlink(); };
  const toggleHazard = () => { const on = !(s.blinkL && s.blinkR); s.blinkL = s.blinkR = on; syncBlink(); };

  const hold = (b, fn) => {
    b.addEventListener("pointerdown", e => { e.preventDefault(); b.setPointerCapture(e.pointerId); fn(true); });
    ["pointerup", "pointercancel", "lostpointercapture"].forEach(ev => b.addEventListener(ev, () => fn(false)));
  };
  hold(btn.gas, setGas);
  hold(btn.brake, setBrake);
  btn.left.addEventListener("click", toggleLeft);
  btn.right.addEventListener("click", toggleRight);
  btn.hazard.addEventListener("click", toggleHazard);
  $("replayBtn").addEventListener("click", playIntro);

  window.addEventListener("keydown", e => {
    if (e.repeat) return;
    switch (e.code) {
      case "Space": case "ArrowUp": case "KeyW": e.preventDefault(); setGas(true); break;
      case "ArrowDown": case "KeyS": e.preventDefault(); setBrake(true); break;
      case "ArrowLeft": case "KeyA": toggleLeft(); break;
      case "ArrowRight": case "KeyD": toggleRight(); break;
      case "KeyH": toggleHazard(); break;
      case "KeyR": playIntro(); break;
      case "Enter": case "Escape": if (!boot.classList.contains("done")) finishBoot(); break;
    }
  });
  window.addEventListener("keyup", e => {
    if (["Space", "ArrowUp", "KeyW"].includes(e.code)) setGas(false);
    if (["ArrowDown", "KeyS"].includes(e.code)) setBrake(false);
  });
  window.addEventListener("blur", () => { setGas(false); setBrake(false); });

  const start = () => { playIntro(); requestAnimationFrame(loop); };
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(start); else start();
})();
