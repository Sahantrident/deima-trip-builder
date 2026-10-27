/* Deima Trip Builder: a "Get a quote" button plus a step-by-step trip planner with a clickable map.
 * No AI: suggestions come from rules and the data in data.js.
 * Set window.DEIMA_QUOTE_WEBHOOK to an n8n webhook URL to send requests; without it the planner runs in demo mode.
 */
(function () {
  "use strict";
  var D = window.DEIMA_TRIP_DATA;
  if (!D) return;
  var WEBHOOK = window.DEIMA_QUOTE_WEBHOOK || "";
  var KEY = "deima-trip-builder-v1";
  var I18N = window.DEIMA_TRIP_I18N || {};
  var LANGS = [{ id: "en", label: "EN", name: "English", locale: "en-GB" }, { id: "ja", label: "日本語", name: "日本語", locale: "ja-JP" }, { id: "ko", label: "한국어", name: "한국어", locale: "ko-KR" }];
  var STEPS = [
    { id: "where", label: "Where & when" },
    { id: "style", label: "Travel style" },
    { id: "route", label: "Your route" },
    { id: "stay", label: "Stay & extras" },
    { id: "you", label: "Your details" },
    { id: "review", label: "Review" }
  ];

  // ---------- language ----------
  // T(): English text is the key; Japanese / Korean come from i18n.js and fall back to English.
  function T(key, vars) {
    var d = I18N[S.lang], s = (d && d[key]) || key;
    if (vars) s = s.replace(/\{(\w+)\}/g, function (m, k) { return vars[k] != null ? vars[k] : m; });
    return s;
  }
  function P(n, one, many, vars) { var v = vars || {}; v.n = n; return T(n === 1 ? one : many, v); }
  function list(a) { return a.join(T(", ")); }
  function locale() { for (var i = 0; i < LANGS.length; i++) if (LANGS[i].id === S.lang) return LANGS[i].locale; return "en-GB"; }
  function startLang() {
    var q = (location.search.match(/[?&]lang=(\w+)/) || [])[1], nav = (navigator.language || "en").slice(0, 2);
    var pick = q || nav;
    return pick === "ja" || pick === "ko" ? pick : "en";
  }
  function monthShort(i) { try { return new Intl.DateTimeFormat(locale(), { month: "short" }).format(new Date(2026, i, 1)); } catch (e) { return String(i + 1); } }
  function monthTiny(i) { return S.lang === "en" ? monthShort(i).charAt(0) : String(i + 1); }

  // ---------- state ----------
  function fresh() {
    return {
      lang: (typeof S !== "undefined" && S && S.lang) || startLang(),
      step: 0, country: "lk", tripType: "holiday", arrival: "", nights: 7, adults: 2, children: 0, childAges: [],
      interests: byId(D.tripTypes, "holiday").interests.slice(), style: "premium", pace: "balanced", route: [], focus: null,
      meal: "HB", roomsAuto: true, rooms: { single: 0, double: 1, triple: 0 }, guideLang: "English",
      flights: false, fromCity: "", visa: true, budget: "", requests: "",
      name: "", email: "", dial: "+94", phone: "", waSame: true, waDial: "+94", wa: "", origin: "", contact: "WhatsApp", consent: false,
      sent: null
    };
  }
  var S = null; S = fresh();
  try { var saved = JSON.parse(localStorage.getItem(KEY) || "null"); if (saved && typeof saved === "object") S = Object.assign(fresh(), saved); } catch (e) {}
  var saveTimer;
  function save() { clearTimeout(saveTimer); saveTimer = setTimeout(function () { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }, 200); }

  // ---------- helpers ----------
  function esc(t) { return String(t == null ? "" : t).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function place(id) { for (var i = 0; i < D.places.length; i++) if (D.places[i].id === id) return D.places[i]; return null; }
  function byId(list, id) { for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i]; return list[0]; }
  function originInfo() { for (var i = 0; i < D.origins.length; i++) if (D.origins[i].name === S.origin) return D.origins[i]; return null; }
  function km(a, b) {
    var R = 6371, toR = Math.PI / 180, dLat = (b.lat - a.lat) * toR, dLon = (b.lon - a.lon) * toR;
    var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(a.lat * toR) * Math.cos(b.lat * toR) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return Math.round(2 * R * Math.asin(Math.sqrt(h)) * 1.35); // straight line × road factor
  }
  function hours(k) { return Math.max(0.5, Math.round((k / 38) * 2) / 2); } // ~38 km/h average on Sri Lankan roads
  function fmtH(h) { return T("{h} h", { h: h % 1 ? h.toFixed(1) : h }); }
  function todayISO() { var d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); }
  function addDays(iso, n) { var d = new Date(iso + "T12:00:00"); d.setDate(d.getDate() + n); return d; }
  function fmtDate(d) { return d.toLocaleDateString(locale(), { weekday: "short", day: "numeric", month: "short" }); }
  function tripMonth() { return S.arrival ? new Date(S.arrival + "T12:00:00").getMonth() + 1 : 0; }
  function plannedNights() { return S.route.reduce(function (t, r) { return t + r.nights; }, 0); }
  function totalPax() { return S.adults + S.children; }
  function score(p) { var n = 0; S.interests.forEach(function (i) { if (p.tags.indexOf(i) >= 0) n++; }); return n; }
  function inRoute(id) { for (var i = 0; i < S.route.length; i++) if (S.route[i].id === id) return i; return -1; }
  function paceNights() { return byId(D.paces, S.pace).nights; }
  function vehicle() { var p = totalPax(); for (var i = 0; i < D.vehicles.length; i++) if (p <= D.vehicles[i].max) return D.vehicles[i].label; return "Coach – Deima will advise"; } // English, for Deima
  function autoRooms() {
    var n = S.adults; S.childAges.forEach(function (a) { if (a === "" || a >= 6) n++; }); // under-6s share a bed
    if (n <= 1) return { single: 1, double: 0, triple: 0 };
    var triple = n % 2 === 1 ? 1 : 0;
    return { single: 0, double: (n - 3 * triple) / 2, triple: triple };
  }
  function rooms() { return S.roomsAuto ? autoRooms() : S.rooms; }
  function roomsText(r) {
    var parts = [];
    if (r.single) parts.push(T("{n} single", { n: r.single })); if (r.double) parts.push(T("{n} double", { n: r.double })); if (r.triple) parts.push(T("{n} triple", { n: r.triple }));
    return parts.join(" + ") || T("None");
  }
  function paxText() { return P(S.adults, "{n} adult", "{n} adults") + (S.children ? T(", ") + P(S.children, "{n} child", "{n} children") : ""); }
  function emailOk(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v); }

  // ---------- map projection ----------
  var MAP = { lon0: 79.55, lat0: 9.95, k: 190, w: 470, h: 790 };
  function xy(lat, lon) { return [Math.round((lon - MAP.lon0) * MAP.k + 12), Math.round((MAP.lat0 - lat) * MAP.k + 12)]; }

  // ---------- photos (Wikipedia / Wikimedia Commons lead images, credited) ----------
  var PHOTO = {}, photoWait = {}, PKEY = KEY + "-photos";
  try { PHOTO = JSON.parse(localStorage.getItem(PKEY) || "{}") || {}; } catch (e) {}
  function bigger(src, orig) {
    if (orig && orig.width && orig.width <= 1400) return orig.source;
    return /\/\d+px-/.test(src) ? src.replace(/\/\d+px-/, "/900px-") : src;
  }
  function photo(title, cb) {
    if (!title) { cb(null); return; }
    if (Object.prototype.hasOwnProperty.call(PHOTO, title)) { cb(PHOTO[title]); return; }
    if (photoWait[title]) { photoWait[title].push(cb); return; }
    photoWait[title] = [cb];
    var finish = function (v, keep) {
      if (keep) { PHOTO[title] = v; try { localStorage.setItem(PKEY, JSON.stringify(PHOTO)); } catch (e) {} }
      var q = photoWait[title] || []; delete photoWait[title]; q.forEach(function (f) { f(v); });
    };
    fetch("https://en.wikipedia.org/api/rest_v1/page/summary/" + encodeURIComponent(title.replace(/ /g, "_")))
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        var t = d && d.thumbnail;
        finish(t ? { src: t.source, big: bigger(t.source, d.originalimage), page: d.content_urls && d.content_urls.desktop && d.content_urls.desktop.page, title: d.title } : null, true);
      })
      .catch(function () { finish(null, false); }); // offline: don't remember the failure
  }
  function cssUrl(u) { return "url('" + encodeURI(decodeURI(u)).replace(/'/g, "%27") + "')"; }
  // Fill every [data-photo] image inside el once its photo arrives; Deima's own photo (data-img) wins.
  function hydrate(el) {
    el.querySelectorAll("img[data-photo], img[data-img]").forEach(function (img) {
      var wrap = img.closest(".tb-ph-wrap"), own = img.getAttribute("data-img");
      if (own) { img.src = own; if (wrap) wrap.classList.add("has"); return; }
      photo(img.getAttribute("data-photo"), function (v) {
        if (!img.isConnected) return;
        if (!v) { if (wrap) wrap.classList.add("none"); return; }
        img.onerror = function () { // some Wikimedia sizes don't exist; drop to the small thumbnail, then to the placeholder
          if (img.getAttribute("src") !== v.src) img.src = v.src;
          else if (wrap) { wrap.classList.remove("has"); wrap.classList.add("none"); }
        };
        img.src = img.getAttribute("data-size") === "big" ? v.big : v.src;
        if (wrap) {
          wrap.classList.add("has");
          var c = wrap.querySelector(".tb-credit"); if (c && v.page) { c.href = v.page; c.hidden = false; }
        }
      });
    });
  }

  // ---------- live map (Leaflet + map tiles); falls back to the drawn map if it can't load ----------
  var LEAF = { state: "idle", q: [], map: null, host: null, markers: {}, route: null, ends: null, lastFocus: null };
  var ISLAND = [[5.92, 79.65], [9.84, 81.9]];
  function loadLeaflet(done) {
    if (window.L && window.L.map) { done(true); return; }
    if (LEAF.state === "failed") { done(false); return; }
    LEAF.q.push(done);
    if (LEAF.state === "loading") return;
    LEAF.state = "loading";
    var css = document.createElement("link"); css.rel = "stylesheet"; css.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(css);
    var js = document.createElement("script"); js.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    js.onload = function () { LEAF.state = "ready"; LEAF.q.splice(0).forEach(function (f) { f(true); }); };
    js.onerror = function () { LEAF.state = "failed"; LEAF.q.splice(0).forEach(function (f) { f(false); }); };
    document.head.appendChild(js);
  }
  function mountMap() {
    var slot = $main.querySelector(".tb-mapslot"); if (!slot) return;
    if (!LEAF.host) { LEAF.host = document.createElement("div"); LEAF.host.className = "tb-lmap"; }
    slot.appendChild(LEAF.host);
    loadLeaflet(function (ok) {
      if (!slot.isConnected) return;
      if (!ok) { slot.innerHTML = mapSVG(); return; }
      if (!LEAF.map) initMap();
      LEAF.map.invalidateSize();
      updateMap();
    });
  }
  function markerIcon(p) {
    var v = PHOTO[p.wiki], s = score(p), idx = inRoute(p.id);
    var cls = "tb-mk" + (idx >= 0 ? " in" : "") + (S.focus === p.id ? " focus" : "") + (S.interests.length && !s && idx < 0 ? " dim" : "") + (s ? " m" + Math.min(s, 3) : "");
    return window.L.divIcon({
      className: "tb-mk-w" + (idx >= 0 || S.focus === p.id ? " keep" : "") + (s >= 2 ? " top" : ""), iconSize: [46, 46], iconAnchor: [23, 23],
      html: '<div class="' + cls + '"><span class="ph"' + (v ? ' style="background-image:' + cssUrl(v.src) + '"' : "") + "></span>" + (idx >= 0 ? "<b>" + (idx + 1) + "</b>" : "") + '</div><span class="tb-mk-l">' + esc(T(p.name)) + "</span>"
    });
  }
  function tipHTML(p, v) {
    var s = score(p), idx = inRoute(p.id);
    return '<div class="tb-tipc">' + (v ? '<img src="' + esc(v.src) + '" alt="">' : '<div class="noimg" aria-hidden="true">📷</div>') +
      "<div><small>" + esc(T(p.region)) + "</small><b>" + esc(T(p.name)) + "</b><span>" + esc(T(p.blurb)) + "</span>" +
      "<em>" + (idx >= 0 ? T("Stop {n} in your route", { n: idx + 1 }) : s ? "●".repeat(s) + " " + T("match for you") : "") + " · " + T("Click to explore") + "</em></div></div>";
  }
  function initMap() {
    var L = window.L;
    var m = L.map(LEAF.host, { zoomSnap: 0.25, minZoom: 7, maxZoom: 17, maxBounds: [[4.6, 78.4], [10.8, 83.2]], maxBoundsViscosity: 0.8 });
    // Keyless tile layers for the demo. For the live site, switch to a keyed provider (e.g. MapTiler, Stadia, Mapbox).
    var street = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors'
    });
    var sat = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
      maxZoom: 18, attribution: "Imagery &copy; Esri, Maxar, Earthstar Geographics"
    });
    var topo = L.tileLayer("https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", {
      subdomains: "abc", maxZoom: 17, attribution: 'Map &copy; <a href="https://opentopomap.org" target="_blank" rel="noopener">OpenTopoMap</a> (CC-BY-SA), &copy; OpenStreetMap contributors'
    });
    street.addTo(m);
    LEAF.base = { street: street, sat: sat, topo: topo };
    var zoomCls = function () { LEAF.host.classList.toggle("tb-z-low", m.getZoom() < 8.5); };
    m.on("zoomend", zoomCls);
    m.fitBounds(ISLAND, { padding: [8, 8] });
    L.marker([D.airport.lat, D.airport.lon], { icon: L.divIcon({ className: "tb-air", html: "✈", iconSize: [28, 28], iconAnchor: [14, 14] }), keyboard: false })
      .bindTooltip(function () { return T("Airport (CMB)"); }, { direction: "left", className: "tb-tip-sm" }).addTo(m);
    LEAF.ends = L.polyline([], { className: "tb-lroute-end", color: "#64748b", weight: 3, dashArray: "3 8", opacity: 0.9 }).addTo(m);
    LEAF.route = L.polyline([], { className: "tb-lroute", color: "#163ead", weight: 4, dashArray: "10 10", lineCap: "round" }).addTo(m);
    D.places.forEach(function (p) {
      var mk = L.marker([p.lat, p.lon], { icon: markerIcon(p), title: p.name, riseOnHover: true }).addTo(m);
      mk.on("click", function () { focusPlace(p.id, true); });
      mk.bindTooltip(tipHTML(p, PHOTO[p.wiki]), { direction: "top", offset: [0, -26], className: "tb-tip", opacity: 1 });
      mk.on("tooltipopen", function () { photo(p.wiki, function (v) { mk.setTooltipContent(tipHTML(p, v)); }); });
      LEAF.markers[p.id] = mk;
      photo(p.wiki, function (v) { if (v) mk.setIcon(markerIcon(p)); });
    });
    LEAF.map = m;
    zoomCls();
  }
  function updateMap() {
    if (!LEAF.map) return;
    if (LEAF.ctlLang !== S.lang) { // layer names follow the language
      if (LEAF.ctl) LEAF.ctl.remove();
      var b = {}; b[T("Map")] = LEAF.base.street; b[T("Satellite")] = LEAF.base.sat; b[T("Terrain")] = LEAF.base.topo;
      LEAF.ctl = window.L.control.layers(b, null, { position: "topright", collapsed: false }).addTo(LEAF.map); LEAF.ctlLang = S.lang;
    }
    D.places.forEach(function (p) {
      var mk = LEAF.markers[p.id]; mk.setIcon(markerIcon(p));
      mk.setZIndexOffset(inRoute(p.id) >= 0 || S.focus === p.id ? 1000 : 0);
      mk.setTooltipContent(tipHTML(p, PHOTO[p.wiki]));
    });
    var stops = S.route.map(function (r) { var p = place(r.id); return [p.lat, p.lon]; }), air = [D.airport.lat, D.airport.lon];
    LEAF.route.setLatLngs(stops);
    LEAF.ends.setLatLngs(stops.length ? [[air, stops[0]], [stops[stops.length - 1], air]] : []);
  }
  function focusPlace(id, fromMap) {
    S.focus = id; save(); var keep = $main.scrollTop; render(); $main.scrollTop = keep;
    var p = place(id);
    if (LEAF.map && p) LEAF.map.flyTo([p.lat, p.lon], Math.max(LEAF.map.getZoom(), 9.5), { duration: 0.9 });
    var pnl = $main.querySelector(".tb-panel");
    if (pnl && window.innerWidth <= 1080 && fromMap) pnl.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function fitRoute() {
    if (!LEAF.map) return;
    if (!S.route.length) { LEAF.map.flyToBounds(ISLAND, { padding: [8, 8], duration: 0.9 }); return; }
    var pts = S.route.map(function (r) { var p = place(r.id); return [p.lat, p.lon]; }).concat([[D.airport.lat, D.airport.lon]]);
    LEAF.map.flyToBounds(pts, { padding: [50, 50], maxZoom: 10, duration: 0.9 });
  }

  // ---------- DOM ----------
  var font = document.createElement("link");
  font.rel = "stylesheet"; font.href = "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap";
  document.head.appendChild(font);

  var launch = document.createElement("button");
  launch.className = "tb-launch"; launch.type = "button";
  document.body.appendChild(launch);
  function launchLabel() {
    var cont = S.step > 0 && !S.sent;
    launch.lang = S.lang;
    launch.innerHTML = '<span class="tb-plane" aria-hidden="true">✈</span><span><span class="tb-long">' + T(cont ? "Continue your quote" : "Get a quote") + '</span><span class="tb-short">' + T("Quote") + "</span><small>" + T(cont ? "Pick up where you left off" : "Build your trip in minutes") + "</small></span>";
  }
  launchLabel();

  var root = document.createElement("div");
  root.className = "tb"; root.hidden = true;
  root.setAttribute("role", "dialog"); root.setAttribute("aria-modal", "true");
  root.innerHTML =
    '<div class="tb-shell">' +
      '<div class="tb-top"><div class="tb-brand"><i>DT</i><div>Deima Travels<span class="tb-brand-sub"></span></div></div><nav class="tb-steps"></nav><div class="tb-langs"></div><button class="tb-close" type="button" data-a="close">×</button></div>' +
      '<div class="tb-mobilebar"></div>' +
      '<div class="tb-body"><main class="tb-main"></main><aside class="tb-side"></aside></div>' +
      '<div class="tb-foot"></div>' +
    "</div>";
  document.body.appendChild(root);
  var $langs = root.querySelector(".tb-langs"), $steps = root.querySelector(".tb-steps"), $main = root.querySelector(".tb-main"), $side = root.querySelector(".tb-side"),
      $foot = root.querySelector(".tb-foot"), $bar = root.querySelector(".tb-mobilebar");
  var lastFocus = null, errorMsg = "";

  function open() { lastFocus = document.activeElement; root.hidden = false; document.documentElement.style.overflow = "hidden"; render(); root.querySelector(".tb-close").focus(); }
  function close() { root.hidden = true; document.documentElement.style.overflow = ""; launchLabel(); if (lastFocus && lastFocus.focus) lastFocus.focus(); }
  launch.addEventListener("click", open);
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !root.hidden) close(); });
  root.addEventListener("click", function (e) { if (e.target === root) close(); });

  // ---------- validation ----------
  function check(step) {
    var id = STEPS[step].id;
    if (id === "where") {
      if (!S.arrival) return T("Choose your arrival date.");
      if (S.arrival < todayISO()) return T("The arrival date is in the past.");
      if (S.childAges.slice(0, S.children).some(function (a) { return a === ""; })) return T("Add the age of each child.");
    }
    if (id === "style" && !S.interests.length) return T("Pick at least one thing you'd like to do.");
    if (id === "route") {
      if (!S.route.length) return T("Add at least one place to your route. Tap a pin on the map.");
      if (plannedNights() > S.nights) return T("Your route has {a} nights but your trip has {b}. Remove some nights or extend the trip.", { a: plannedNights(), b: S.nights });
    }
    if (id === "you") {
      if (!S.name.trim()) return T("Add your name.");
      if (!emailOk(S.email.trim())) return T("Add a valid email address.");
      if (S.phone.replace(/\D/g, "").length < 6) return T("Add a contact number.");
      if (!S.waSame && S.wa && S.wa.replace(/\D/g, "").length < 6) return T("Check the WhatsApp number, or leave it empty.");
      if (!S.origin) return T("Choose the country you're travelling from.");
      if (!S.consent) return T("Tick the box so Deima can contact you about this trip.");
    }
    return "";
  }
  function go(step) {
    if (step > S.step) { for (var i = S.step; i < step; i++) { var m = check(i); if (m) { S.step = i; errorMsg = m; render(); return; } } }
    S.step = Math.max(0, Math.min(STEPS.length - 1, step)); errorMsg = ""; save(); render();
    $main.scrollTop = 0; var h = $main.querySelector("h2"); if (h) { h.setAttribute("tabindex", "-1"); h.focus({ preventScroll: true }); }
  }

  // ---------- render ----------
  function render() {
    root.lang = S.lang; root.setAttribute("aria-label", T("Build your trip"));
    root.querySelector(".tb-brand-sub").textContent = T("Trip Builder");
    $steps.setAttribute("aria-label", T("Steps")); root.querySelector(".tb-close").setAttribute("aria-label", T("Close"));
    $langs.innerHTML = '<div class="tb-lang-btns" role="group" aria-label="' + T("Language") + '">' + LANGS.map(function (l) { return '<button type="button" data-a="lang" data-v="' + l.id + '" lang="' + l.id + '" aria-pressed="' + (S.lang === l.id) + '">' + l.label + "</button>"; }).join("") + "</div>" +
      '<select class="tb-lang-sel" data-f="lang" aria-label="' + T("Language") + '">' + LANGS.map(function (l) { return '<option value="' + l.id + '" lang="' + l.id + '"' + (S.lang === l.id ? " selected" : "") + ">" + l.name + "</option>"; }).join("") + "</select>";
    if (S.lang !== "en") loadFont();
    if (S.sent) { renderDone(); return; }
    $steps.innerHTML = STEPS.map(function (s, i) {
      var cls = i === S.step ? "is-now" : i < S.step ? "is-done" : "";
      return '<button type="button" class="' + cls + '" data-a="go" data-i="' + i + '"' + (i > S.step + 1 ? " disabled" : "") + '><b>' + (i < S.step ? "✓" : i + 1) + "</b><span>" + T(s.label) + "</span></button>";
    }).join("");
    var id = STEPS[S.step].id;
    $main.innerHTML = VIEWS[id]();
    hidePeek();
    if (id === "route") mountMap();
    hydrate($main);
    renderSide();
    var last = S.step === STEPS.length - 1;
    $foot.innerHTML =
      '<button type="button" class="tb-btn" data-a="back"' + (S.step === 0 ? " disabled" : "") + ">" + T("← Back") + "</button>" +
      '<span class="tb-msg" role="alert">' + esc(errorMsg) + "</span>" +
      (last ? '<button type="button" class="tb-btn lime" data-a="send">' + T("Send to Deima ✈") + "</button>"
            : '<button type="button" class="tb-btn primary" data-a="next">' + T("Next: {step} →", { step: T(STEPS[S.step + 1].label) }) + "</button>");
    launchLabel();
  }

  var VIEWS = {
    where: function () {
      var today = todayISO();
      var ages = "";
      for (var i = 0; i < S.children; i++) {
        var opts = '<option value="">' + T("Age") + "</option>";
        for (var a = 0; a <= 17; a++) opts += '<option value="' + a + '"' + (S.childAges[i] === a ? " selected" : "") + ">" + (a === 0 ? T("Under 1") : a) + "</option>";
        ages += '<div class="tb-field"><label for="tb-age' + i + '">' + T("Child {n}", { n: i + 1 }) + "</label><select id=\"tb-age" + i + '" data-age="' + i + '">' + opts + "</select></div>";
      }
      return head(1, "Where would you like to go?", "Pick a destination and tell us when, and who's coming.") +
        '<div class="tb-block"><span class="tb-label">' + T("Destination") + '</span><div class="tb-grid tb-g4">' +
        D.countries.map(function (c) {
          var flag = { lk: "🇱🇰", mv: "🇲🇻", ae: "🇦🇪", th: "🇹🇭" }[c.id] || "🌍";
          return '<button type="button" class="tb-card" data-a="country" data-v="' + c.id + '" aria-pressed="' + (S.country === c.id) + '"' + (c.active ? "" : " disabled") + '><span class="tb-flag">' + flag + "</span><b>" + T(c.name) + "</b><small>" + T(c.note) + "</small>" + (c.active ? "" : '<span class="tb-soon">' + T("Soon") + "</span>") + "</button>";
        }).join("") + "</div></div>" +
        '<div class="tb-block"><span class="tb-label">' + T("Type of trip") + '</span><div class="tb-chips">' +
        D.tripTypes.map(function (t) { return '<button type="button" class="tb-chip" data-a="tripType" data-v="' + t.id + '" aria-pressed="' + (S.tripType === t.id) + '">' + T(t.label) + "</button>"; }).join("") + "</div></div>" +
        '<div class="tb-block tb-grid tb-g2">' +
          '<div class="tb-field"><label for="tb-arrival">' + T("Arrival date") + '</label><input class="tb-input" type="date" id="tb-arrival" data-f="arrival" min="' + today + '" value="' + esc(S.arrival) + '" lang="' + S.lang + '"></div>' +
          '<div class="tb-field"><label>' + T("Length of stay") + "</label>" + counter("nights", S.nights, T("Nights"), P(S.nights + 1, "{n} day", "{n} days")) + "</div>" +
        "</div>" +
        '<div class="tb-block tb-grid tb-g2">' +
          '<div class="tb-field"><label>' + T("Adults") + "</label>" + counter("adults", S.adults, T("Adults"), T("12 years and over")) + "</div>" +
          '<div class="tb-field"><label>' + T("Children") + "</label>" + counter("children", S.children, T("Children"), T("Under 12")) + "</div>" +
        "</div>" +
        (S.children ? '<div class="tb-block"><span class="tb-label">' + T("Children's ages") + " <em>" + T("(hotels price children by age)") + '</em></span><div class="tb-grid tb-g4">' + ages + "</div></div>" : "") +
        (S.arrival ? seasonHint() : "");
    },

    style: function () {
      return head(2, "How do you like to travel?", "Your choices light up the best places on the map in the next step.") +
        '<div class="tb-block"><span class="tb-label">' + T("What would you like to do?") + " <em>" + T("Pick as many as you like") + '</em></span><div class="tb-chips">' +
        D.interests.map(function (t) { return '<button type="button" class="tb-chip" data-a="interest" data-v="' + t.id + '" aria-pressed="' + (S.interests.indexOf(t.id) >= 0) + '"><span aria-hidden="true">' + t.icon + "</span>" + T(t.label) + "</button>"; }).join("") + "</div></div>" +
        '<div class="tb-block"><span class="tb-label">' + T("Where would you like to stay?") + '</span><div class="tb-grid tb-g5">' +
        D.styles.map(function (s) { return '<button type="button" class="tb-card" data-a="style" data-v="' + s.id + '" aria-pressed="' + (S.style === s.id) + '"><b>' + T(s.label) + "</b><small>" + T(s.note) + "</small></button>"; }).join("") + "</div></div>" +
        '<div class="tb-block"><span class="tb-label">' + T("Pace") + '</span><div class="tb-grid tb-g3">' +
        D.paces.map(function (p) { return '<button type="button" class="tb-card" data-a="pace" data-v="' + p.id + '" aria-pressed="' + (S.pace === p.id) + '"><b>' + T(p.label) + "</b><small>" + T(p.note) + " · " + P(p.nights, "about {n} night per stop", "about {n} nights per stop") + "</small></button>"; }).join("") + "</div></div>" +
        (S.interests.length ? '<div class="tb-hint ok"><span aria-hidden="true">✓</span><span>' + T("Best matches for you:") + " <b>" + list(topMatches(4).map(function (p) { return esc(T(p.name)); })) + "</b></span></div>" : "");
    },

    route: function () {
      var focus = place(S.focus) || null;
      return head(3, "Build your route on the map", "Tap a place to see what you can do and where you can stay, then add it to your route. Brighter rings mean a better match for you.") +
        '<div class="tb-plan"><div class="tb-mapbox"><div class="tb-mapslot"></div>' +
        '<div class="tb-mapbar"><div class="tb-maplegend"><span><i class="lg-match"></i>' + T("Good match") + '</span><span><i class="lg-route"></i>' + T("In your route") + "</span><span>" + T("Hover for photos · click to explore") + "</span></div>" +
        '<div class="tb-mapbtns"><button type="button" class="tb-btn small" data-a="fitRoute">' + T(S.route.length ? "Show my route" : "Whole island") + "</button></div></div></div>" +
        '<div class="tb-panel">' + (focus ? placePanel(focus) : intro()) + routeBox() + "</div></div>";
    },

    stay: function () {
      var r = rooms(), cur = originInfo() ? originInfo().cur : "USD";
      return head(4, "Stay and extras", "We've suggested rooms and a vehicle for your group. Change anything you like.") +
        '<div class="tb-block"><span class="tb-label">' + T("Meals") + '</span><div class="tb-grid tb-g4">' +
        D.meals.map(function (m) { return '<button type="button" class="tb-card" data-a="meal" data-v="' + m.id + '" aria-pressed="' + (S.meal === m.id) + '"><b>' + T(m.label) + "</b><small>" + (m.note ? T(m.note) : m.id) + "</small></button>"; }).join("") + "</div></div>" +
        '<div class="tb-block"><span class="tb-label">' + T("Rooms") + " <em>" + (S.roomsAuto ? T("· suggested for {pax}", { pax: paxText() }) : T("· set by you")) + "</em></span>" +
        '<div class="tb-grid tb-g3">' + counter("single", r.single, T("Single rooms"), "") + counter("double", r.double, T("Double / twin"), "") + counter("triple", r.triple, T("Triple rooms"), "") + "</div>" +
        (S.roomsAuto ? "" : '<p style="margin-top:8px"><button type="button" class="tb-btn small" data-a="roomsAuto">' + T("Use the suggestion again") + "</button></p>") + "</div>" +
        '<div class="tb-block tb-grid tb-g2">' +
          '<div class="tb-field"><label>' + T("Transport") + " <em>" + P(totalPax(), "· based on {n} traveller", "· based on {n} travellers") + '</em></label><div class="tb-hint"><span aria-hidden="true">🚐</span><span>' + T("{v} with a chauffeur guide for the whole trip.", { v: "<b>" + esc(T(vehicle())) + "</b>" }) + "</span></div></div>" +
          '<div class="tb-field"><label for="tb-lang">' + T("Guide language") + '</label><select id="tb-lang" data-f="guideLang">' + D.guideLanguages.map(function (l) { return '<option value="' + l + '"' + (S.guideLang === l ? " selected" : "") + ">" + T(l) + "</option>"; }).join("") + "</select></div>" +
        "</div>" +
        '<div class="tb-block tb-grid tb-g2">' +
          '<label class="tb-check"><input type="checkbox" data-f="flights"' + (S.flights ? " checked" : "") + "><span><b>" + T("I need flights") + "</b><br>" + T("Deima's ticketing team will add flight options.") + "</span></label>" +
          '<label class="tb-check"><input type="checkbox" data-f="visa"' + (S.visa ? " checked" : "") + "><span><b>" + T("Help me with the visa / ETA") + "</b><br>" + T("Deima will tell you what you need and can apply for you.") + "</span></label>" +
        "</div>" +
        (S.flights ? '<div class="tb-block tb-field" style="max-width:420px"><label for="tb-from">' + T("Flying from") + " <em>" + T("(city or airport)") + '</em></label><input class="tb-input" id="tb-from" data-f="fromCity" value="' + esc(S.fromCity) + '" placeholder="' + esc(T("e.g. Chennai, London Heathrow")) + '"></div>' : "") +
        '<div class="tb-block tb-grid tb-g2">' +
          '<div class="tb-field"><label for="tb-budget">' + T("Budget per person") + " <em>" + T("(optional, excluding flights)") + '</em></label><div class="tb-phone"><input class="tb-input" value="' + cur + '" disabled aria-label="' + esc(T("Currency")) + '"><input class="tb-input" id="tb-budget" type="number" min="0" inputmode="numeric" data-f="budget" value="' + esc(S.budget) + '" placeholder="' + esc(T("e.g. 1500")) + '"></div></div>' +
          '<div class="tb-field"><label for="tb-req">' + T("Special requests") + " <em>" + T("(optional)") + '</em></label><textarea id="tb-req" data-f="requests" placeholder="' + esc(T("Anniversary, dietary needs, accessibility, a hotel you love…")) + '">' + esc(S.requests) + "</textarea></div>" +
        "</div>";
    },

    you: function () {
      var dials = [], seen = {};
      D.origins.forEach(function (o) { if (!seen[o.dial] && o.dial !== "+") { seen[o.dial] = 1; dials.push(o.dial); } });
      function dialSel(f, val, label) { return '<select data-f="' + f + '" aria-label="' + esc(label) + '">' + dials.map(function (d) { return "<option" + (d === val ? " selected" : "") + ">" + d + "</option>"; }).join("") + "</select>"; }
      return head(5, "Where should we send your quote?", "A Deima travel consultant will check your plan and send you prices.") +
        '<div class="tb-block tb-grid tb-g2">' +
          '<div class="tb-field"><label for="tb-name">' + T("Full name") + '</label><input class="tb-input" id="tb-name" data-f="name" autocomplete="name" value="' + esc(S.name) + '"></div>' +
          '<div class="tb-field"><label for="tb-email">' + T("Email") + '</label><input class="tb-input" id="tb-email" type="email" data-f="email" autocomplete="email" value="' + esc(S.email) + '"></div>' +
          '<div class="tb-field"><label for="tb-phone">' + T("Contact number") + '</label><div class="tb-phone">' + dialSel("dial", S.dial, T("Country code")) + '<input class="tb-input" id="tb-phone" type="tel" data-f="phone" autocomplete="tel-national" value="' + esc(S.phone) + '"></div></div>' +
          '<div class="tb-field"><label for="tb-origin">' + T("Travelling from") + '</label><select id="tb-origin" data-f="origin"><option value="">' + T("Choose a country") + "</option>" + D.origins.map(function (o) { return '<option value="' + esc(o.name) + '"' + (S.origin === o.name ? " selected" : "") + ">" + esc(T(o.name)) + "</option>"; }).join("") + "</select></div>" +
        "</div>" +
        '<div class="tb-block"><label class="tb-check"><input type="checkbox" data-f="waSame"' + (S.waSame ? " checked" : "") + "><span>" + T("My WhatsApp number is the same as my contact number") + "</span></label>" +
        (S.waSame ? "" : '<div class="tb-field" style="max-width:420px;margin-top:10px"><label for="tb-wa">' + T("WhatsApp number") + " <em>" + T("(optional)") + '</em></label><div class="tb-phone">' + dialSel("waDial", S.waDial, T("WhatsApp country code")) + '<input class="tb-input" id="tb-wa" type="tel" data-f="wa" value="' + esc(S.wa) + '"></div></div>') + "</div>" +
        '<div class="tb-block"><span class="tb-label">' + T("Best way to reach you") + '</span><div class="tb-chips">' +
        ["WhatsApp", "Email", "Phone call"].map(function (c) { return '<button type="button" class="tb-chip" data-a="contact" data-v="' + c + '" aria-pressed="' + (S.contact === c) + '">' + T(c) + "</button>"; }).join("") + "</div></div>" +
        (S.origin && S.origin !== "Sri Lanka" && S.visa ? '<div class="tb-block tb-hint"><span aria-hidden="true">🛂</span><span>' + T("Travellers from {c} usually need a Sri Lanka visa or ETA before arrival. Deima will confirm and can apply for you.", { c: esc(T(S.origin)) }) + "</span></div>" : "") +
        '<div class="tb-block"><label class="tb-check"><input type="checkbox" data-f="consent"' + (S.consent ? " checked" : "") + "><span>" + T("Deima Travels may contact me about this trip by email, phone or WhatsApp.") + "</span></label></div>";
    },

    review: function () {
      var plan = itinerary(), r = rooms();
      return head(6, "Here's your trip so far", "This is a draft. A Deima consultant will check it, add prices and send you a full quote.") +
        '<div class="tb-block tb-facts">' +
          fact(T("Travellers"), paxText()) + fact(T("Arrival"), S.arrival ? fmtDate(addDays(S.arrival, 0)) : "–") + fact(T("Length"), P(S.nights, "{n} night", "{n} nights")) +
          fact(T("Hotels"), T(byId(D.styles, S.style).label) + " · " + roomsText(r)) + fact(T("Meals"), T(byId(D.meals, S.meal).label)) + fact(T("Transport"), T(vehicle()) + " · " + T("{l} guide", { l: T(S.guideLang) })) +
        "</div>" +
        '<div class="tb-block"><span class="tb-label">' + T("Day by day") + '</span><div class="tb-days">' +
        plan.days.map(function (d) {
          return '<div class="tb-day"><div class="d">' + T("Day {n}", { n: d.day }) + "<small>" + esc(d.dateText) + "</small></div><div><h4>" + esc(d.title) + "</h4>" + (d.note ? "<p>" + esc(d.note) + "</p>" : "") +
            (d.acts.length ? "<ul>" + d.acts.map(function (a) { return "<li>" + esc(T(a)) + "</li>"; }).join("") + "</ul>" : "") + "</div></div>";
        }).join("") + "</div></div>" +
        '<div class="tb-block tb-grid tb-g2">' +
          '<div class="tb-hint"><span aria-hidden="true">📩</span><span>' + T("We'll reply by {c} to {to}.", { c: "<b>" + esc(T(S.contact)) + "</b>", to: esc(S.contact === "Email" ? S.email : S.dial + " " + S.phone) }) + "</span></div>" +
          (WEBHOOK ? "" : '<div class="tb-hint warn"><span aria-hidden="true">🧪</span><span><b>' + T("Demo mode.") + "</b> " + T("Nothing is sent yet. You'll see exactly what Deima would receive.") + "</span></div>") +
        "</div>" +
        '<details class="tb-block"><summary>' + T("What Deima receives (quotation-template format)") + '</summary><div class="tb-json">' + esc(JSON.stringify(payload("DT-PREVIEW"), null, 2)) + "</div></details>";
    }
  };

  function head(n, title, text) { return '<div class="tb-head"><div class="tb-eyebrow">' + T("Step {n} of {t}", { n: n, t: STEPS.length }) + "</div><h2>" + T(title) + "</h2><p>" + T(text) + "</p></div>"; }
  function fact(k, v) { return '<div class="tb-fact"><small>' + k + "</small><b>" + esc(v) + "</b></div>"; }
  function counter(f, v, label, sub) {
    return '<div class="tb-counter"><span>' + label + (sub ? "<small>" + sub + "</small>" : "") + '</span><div class="tb-step"><button type="button" data-a="dec" data-f="' + f + '" aria-label="' + esc(T("Fewer {x}", { x: label })) + '">−</button><output>' + v + '</output><button type="button" data-a="inc" data-f="' + f + '" aria-label="' + esc(T("More {x}", { x: label })) + '">+</button></div></div>';
  }
  function seasonHint() {
    var m = tripMonth(); if (!m) return "";
    var good = D.places.filter(function (p) { return p.good.indexOf(m) >= 0; }).map(function (p) { return p.region; });
    var regions = good.filter(function (r, i) { return good.indexOf(r) === i; });
    var bad = D.places.filter(function (p) { return p.good.indexOf(m) < 0; }).map(function (p) { return p.region; }).filter(function (r, i, a) { return a.indexOf(r) === i && regions.indexOf(r) < 0; });
    return '<div class="tb-hint ok"><span aria-hidden="true">☀️</span><span><b>' + T("{m} is a good time for:", { m: monthShort(m - 1) }) + "</b> " + list(regions.map(function (r) { return T(r); })) + T(".") +
      (bad.length ? " " + T("Quieter or rainier then:") + " " + list(bad.map(function (r) { return T(r); })) + T(".") : "") + " " + T("A rough guide; Deima will advise.") + "</span></div>";
  }
  function topMatches(n) {
    return D.places.slice().filter(function (p) { return score(p) > 0; }).sort(function (a, b) {
      var m = tripMonth(), sa = score(a) + (m && a.good.indexOf(m) >= 0 ? 0.5 : 0), sb = score(b) + (m && b.good.indexOf(m) >= 0 ? 0.5 : 0);
      return sb - sa;
    }).slice(0, n);
  }

  function mapSVG() {
    var pts = D.outline.map(function (p) { return xy(p[0], p[1]).join(","); }).join(" ");
    var air = xy(D.airport.lat, D.airport.lon);
    var maxS = Math.max(1, S.interests.length);
    var line = "";
    if (S.route.length) {
      var chain = [air].concat(S.route.map(function (r) { var p = place(r.id); return xy(p.lat, p.lon); }));
      line += '<polyline class="route leg0" points="' + chain.slice(0, 2).join(" ") + '"></polyline>';
      if (chain.length > 2) line += '<polyline class="route" points="' + chain.slice(1).join(" ") + '"></polyline>';
      line += '<polyline class="route leg0" points="' + [chain[chain.length - 1], air].join(" ") + '"></polyline>';
    }
    var pins = D.places.map(function (p) {
      var c = xy(p.lat, p.lon), s = score(p), idx = inRoute(p.id), cls = "pin" + (idx >= 0 ? " in-route" : "") + (S.focus === p.id ? " is-focus" : "") + (S.interests.length && !s && idx < 0 ? " dim" : "");
      var lx = p.label === "l" ? c[0] - 13 : c[0] + 13, anchor = p.label === "l" ? "end" : "start";
      return '<g class="' + cls + '" data-a="focus" data-v="' + p.id + '" tabindex="0" role="button" aria-label="' + esc(p.name) + (idx >= 0 ? ", stop " + (idx + 1) : "") + '">' +
        '<circle class="glow" cx="' + c[0] + '" cy="' + c[1] + '" r="' + (11 + s * 4) + '" style="opacity:' + (s ? 0.25 + 0.45 * (s / maxS) : 0) + '"></circle>' +
        '<circle class="dot" cx="' + c[0] + '" cy="' + c[1] + '" r="' + (idx >= 0 ? 10 : 7) + '"></circle>' +
        (idx >= 0 ? '<text class="num" x="' + c[0] + '" y="' + (c[1] + 3.5) + '">' + (idx + 1) + "</text>" : "") +
        '<text class="lbl" x="' + lx + '" y="' + (c[1] + 4) + '" text-anchor="' + anchor + '">' + esc(p.name) + "</text></g>";
    }).join("");
    return '<svg class="tb-map" viewBox="0 0 ' + MAP.w + " " + MAP.h + '" role="img" aria-label="Map of Sri Lanka with places to visit">' +
      '<polygon class="land" points="' + pts + '"></polygon>' + line +
      '<g class="air"><rect x="' + (air[0] - 6) + '" y="' + (air[1] - 6) + '" width="12" height="12" rx="3" fill="#475569"></rect><text x="' + (air[0] - 12) + '" y="' + (air[1] + 20) + '" text-anchor="end">✈ Airport</text></g>' +
      pins + '<text class="compass" x="' + (MAP.w - 30) + '" y="30">N ↑</text></svg>';
  }

  function intro() {
    var tops = topMatches(6);
    return '<div class="tb-place"><div><div class="tb-sub">' + T("Start here") + "</div><p>" + T("Tap a pin on the map, or pick one of your best matches:") + "</p></div>" +
      '<div class="tb-top-matches">' + (tops.length ? tops.map(function (p) { return '<button type="button" data-a="focus" data-v="' + p.id + '">' + esc(T(p.name)) + ' <i>' + "●".repeat(score(p)) + "</i></button>"; }).join("") : '<span class="tb-empty">' + T("Go back a step to choose what you like to do.") + "</span>") + "</div></div>";
  }

  function placePanel(p) {
    var idx = inRoute(p.id), stop = idx >= 0 ? S.route[idx] : null, m = tripMonth();
    var months = ""; for (var mi = 0; mi < 12; mi++) months += '<span class="' + (p.good.indexOf(mi + 1) >= 0 ? "good" : "") + (m === mi + 1 ? " trip" : "") + '" title="' + esc(monthShort(mi)) + '">' + monthTiny(mi) + "</span>";
    var acts = p.activities.map(function (a, i) {
      var on = stop ? stop.acts.indexOf(a[0]) >= 0 : false, hit = S.interests.indexOf(a[1]) >= 0;
      return '<label class="tb-act' + (on ? " checked" : "") + (stop ? "" : " locked") + '" data-peek="' + esc(a[2] || "") + '" data-peek-name="' + esc(T(a[0])) + '">' +
        '<span class="tb-ph-wrap tb-act-ph"><img class="tb-ph" data-photo="' + esc(a[2] || "") + '" alt="" loading="lazy"><i aria-hidden="true">' + byId(D.interests, a[1]).icon + "</i></span>" +
        '<span class="tb-act-t"><input type="checkbox" data-a="act" data-v="' + i + '"' + (on ? " checked" : "") + (stop ? "" : " disabled") + ">" + esc(T(a[0])) + (hit ? "<em>" + T("Matches you") + "</em>" : "") + "</span></label>";
    }).join("");
    var hotels;
    if (!p.hotels.length) hotels = '<div class="tb-empty">' + T("Deima will suggest hotels here that match your style ({s}).", { s: T(byId(D.styles, S.style).label) }) + "</div>";
    else {
      var mine = S.style === "mix" ? p.hotels : p.hotels.filter(function (h) { return h[1] === S.style; });
      var rest = S.style === "mix" ? [] : p.hotels.filter(function (h) { return h[1] !== S.style; });
      var cur = stop ? stop.hotel : "auto";
      var opt = function (h, other) {
        var pic = h[3] ? ' data-img="' + esc(h[3]) + '"' : ' data-photo="' + esc(h[2] || "") + '"';
        return '<label class="tb-opt tb-hotel' + (other ? " other" : "") + (cur === h[0] ? " checked" : "") + '" data-peek="' + esc(h[2] || "") + '" data-peek-img="' + esc(h[3] || "") + '" data-peek-name="' + esc(h[0]) + '">' +
          '<input type="radio" name="tb-hotel" data-a="hotel" data-v="' + esc(h[0]) + '"' + (cur === h[0] ? " checked" : "") + (stop ? "" : " disabled") + ">" +
          '<span class="tb-ph-wrap tb-hotel-ph"><img class="tb-ph"' + pic + ' alt="" loading="lazy"><i aria-hidden="true">' + esc(h[0].charAt(0)) + "</i></span>" +
          '<span class="tb-hotel-n">' + esc(h[0]) + '</span><span class="tb-tag">' + T(byId(D.styles, h[1]).label) + "</span></label>";
      };
      hotels = '<label class="tb-opt' + (cur === "auto" ? " checked" : "") + '"><input type="radio" name="tb-hotel" data-a="hotel" data-v="auto"' + (cur === "auto" ? " checked" : "") + (stop ? "" : " disabled") + ">" + T("Let Deima choose the best fit") + "</label>" +
        mine.map(function (h) { return opt(h, false); }).join("") + rest.map(function (h) { return opt(h, true); }).join("");
    }
    return '<div class="tb-place">' +
      '<div class="tb-hero tb-ph-wrap"><img class="tb-ph" data-photo="' + esc(p.wiki) + '" data-size="big" alt="' + esc(T(p.name)) + '"><span class="tb-hero-fade"></span>' +
      '<a class="tb-credit" target="_blank" rel="noopener" hidden>' + T("Photo: Wikipedia") + "</a></div>" +
      '<div class="tb-place-h"><div><small>' + esc(T(p.region)) + "</small><h3>" + esc(T(p.name)) + "</h3></div>" +
      (stop ? '<button type="button" class="tb-btn small" data-a="remove" data-v="' + p.id + '">' + T("Remove") + "</button>" : '<button type="button" class="tb-btn small primary" data-a="add" data-v="' + p.id + '">' + T("+ Add to route") + "</button>") + "</div>" +
      "<p>" + esc(T(p.blurb)) + "</p>" +
      '<div class="tb-tags">' + p.tags.map(function (t) { var it = byId(D.interests, t); return '<span class="tb-tag' + (S.interests.indexOf(t) >= 0 ? " hit" : "") + '">' + it.icon + " " + T(it.label) + "</span>"; }).join("") + "</div>" +
      '<div><div class="tb-sub">' + T("Best months") + '</div><div class="tb-months">' + months + "</div>" + (m && p.good.indexOf(m) < 0 ? '<p class="tb-hint warn" style="margin-top:8px">' + T("{m} isn't the best month here. Deima can suggest an alternative.", { m: monthShort(m - 1) }) + "</p>" : "") + "</div>" +
      '<div><div class="tb-sub">' + T("Things to do") + (stop ? "" : " " + T("· add to route to choose")) + '</div><div class="tb-acts">' + acts + "</div></div>" +
      '<div><div class="tb-sub">' + T("Where to stay") + (stop ? "" : " " + T("· add to route to choose")) + '</div><div class="tb-list">' + hotels + "</div></div>" +
      "</div>";
  }

  function routeBox() {
    var pn = plannedNights(), cls = pn === S.nights ? "ok" : pn > S.nights ? "over" : "";
    var rows = "", prev = D.airport;
    S.route.forEach(function (r, i) {
      var p = place(r.id), k = km(prev, p), h = hours(k);
      rows += '<div class="tb-leg' + (h >= 5 ? " long" : "") + '">' + T(i === 0 ? "From the airport" : "Drive") + " ≈ " + k + " km · " + fmtH(h) + (h >= 5 ? " · " + T("long drive, consider a stop between") : "") + "</div>";
      rows += '<div class="tb-stop"><b>' + (i + 1) + '</b><div><div class="nm"><button type="button" data-a="focus" data-v="' + p.id + '">' + esc(T(p.name)) + '</button></div><div class="mini">' +
        (r.acts.length ? P(r.acts.length, "{n} activity", "{n} activities") : T("No activities picked")) + " · " + (r.hotel === "auto" ? T("Deima picks hotel") : esc(r.hotel)) + "</div></div>" +
        '<div class="tb-stop-ctl"><div class="tb-step"><button type="button" data-a="nDec" data-i="' + i + '" aria-label="' + esc(T("One night less in {p}", { p: T(p.name) })) + '">−</button><output>' + T("{n}n", { n: r.nights }) + '</output><button type="button" data-a="nInc" data-i="' + i + '" aria-label="' + esc(T("One night more in {p}", { p: T(p.name) })) + '">+</button></div>' +
        '<button type="button" class="tb-icon" data-a="up" data-i="' + i + '" aria-label="' + T("Move up") + '"' + (i === 0 ? " disabled" : "") + ">↑</button>" +
        '<button type="button" class="tb-icon" data-a="down" data-i="' + i + '" aria-label="' + T("Move down") + '"' + (i === S.route.length - 1 ? " disabled" : "") + ">↓</button></div></div>";
      prev = p;
    });
    if (S.route.length) { var back = km(prev, D.airport); rows += '<div class="tb-leg">' + T("Back to the airport") + " ≈ " + back + " km · " + fmtH(hours(back)) + "</div>"; }
    return '<div class="tb-route"><div class="tb-route-h"><h3>' + T("Your route") + '</h3><span class="tb-nights ' + cls + '">' + T("{a} of {b} nights planned", { a: pn, b: S.nights }) + "</span></div>" +
      (S.route.length ? rows : '<div class="tb-empty">' + T("No stops yet. Tap a place on the map and press \"Add to route\".") + "</div>") +
      (S.route.length > 2 ? '<p><button type="button" class="tb-btn small" data-a="optimise">' + T("↻ Suggest the best order") + "</button></p>" : "") +
      (S.route.length && pn < S.nights ? '<div class="tb-hint"><span aria-hidden="true">💡</span><span>' + P(S.nights - pn, "{n} night left. Add another place, or leave it for Deima to suggest.", "{n} nights left. Add another place, or leave them for Deima to suggest.") + "</span></div>" : "") +
      "</div>";
  }

  function renderSide() {
    var o = originInfo(), stops = S.route.map(function (r) { return T(place(r.id).name); });
    var bars = ""; for (var i = 0; i < 34; i++) bars += '<i style="flex:' + (1 + ((i * 7 + S.nights * 3 + S.adults) % 4)) + ';opacity:' + (i % 3 ? 1 : 0.35) + '"></i>';
    $side.innerHTML =
      '<div class="tb-pass"><div class="tb-pass-top"><small>' + T("Deima Travels · Trip request") + "</small>" +
      '<div class="tb-pass-route"><div><b>' + esc(o ? o.name.slice(0, 3).toUpperCase() : T("YOU")) + "</b><span>" + esc(S.origin ? T(S.origin) : T("Your country")) + '</span></div><span class="plane" aria-hidden="true">✈</span><div style="text-align:right"><b>CMB</b><span>' + T("Sri Lanka") + "</span></div></div></div>" +
      '<div class="tb-perf"></div>' +
      '<div class="tb-pass-grid"><div><small>' + T("Arrive") + "</small><b>" + (S.arrival ? fmtDate(addDays(S.arrival, 0)) : "–") + "</b></div><div><small>" + T("Nights") + "</small><b>" + S.nights + "</b></div>" +
      "<div><small>" + T("Travellers") + "</small><b>" + T("{n}A", { n: S.adults }) + (S.children ? " · " + T("{n}C", { n: S.children }) : "") + "</b></div><div><small>" + T("Stay") + "</small><b>" + T(byId(D.styles, S.style).label) + "</b></div>" +
      "<div><small>" + T("Trip") + "</small><b>" + T(byId(D.tripTypes, S.tripType).label) + "</b></div><div><small>" + T("Meals") + "</small><b>" + S.meal + "</b></div></div>" +
      (stops.length ? '<div class="tb-pass-stops">' + stops.map(function (s, i) { return "<span>" + (i + 1) + ". " + esc(s) + "</span>"; }).join("") + "</div>" : "") +
      '<div class="tb-pass-code" aria-hidden="true">' + bars + "</div></div>" +
      '<div class="tb-side-note"><div>' + T("<b>Your trip card</b> fills in as you go. Your progress is saved on this device.") + "</div>" +
      "<div>" + T("Nothing is booked or paid here. A Deima consultant checks your plan and sends you a priced quote.") + "</div>" +
      '<div><button type="button" class="tb-btn small" data-a="reset">' + T("Start over") + "</button></div></div>";
    $bar.innerHTML = "<span>" + T("Sri Lanka") + " · " + P(S.nights, "{n} night", "{n} nights") + " · " + paxText() + (stops.length ? " · " + P(stops.length, "{n} stop", "{n} stops") : "") + "</span><span>" + (S.step + 1) + "/" + STEPS.length + "</span>";
  }

  // ---------- itinerary + payload ----------
  function itinerary() {
    var days = [], day = 1, prev = D.airport;
    function push(title, note, acts, loc, k) {
      days.push({ day: day, date: S.arrival ? addDays(S.arrival, day - 1).toISOString().slice(0, 10) : "", dateText: S.arrival ? fmtDate(addDays(S.arrival, day - 1)) : "", title: title, note: note, acts: acts, location: loc, km: k || 0 });
      day++;
    }
    S.route.forEach(function (r, si) {
      var p = place(r.id), k = km(prev, p), h = hours(k), acts = r.acts.slice();
      var per = []; for (var n = 0; n < r.nights; n++) per.push([]);
      acts.forEach(function (a, i) { var slot = r.nights > 1 ? (1 + (i % (r.nights - 1 || 1))) % r.nights : 0; per[slot].push(a); });
      for (var n2 = 0; n2 < r.nights; n2++) {
        if (n2 === 0) push(T(si === 0 ? "Arrive in Sri Lanka, transfer to {p}" : "Travel to {p}", { p: T(p.name) }), T(si === 0 ? "≈ {k} km · {h} by road from the airport" : "≈ {k} km · {h} by road from {p}", { k: k, h: fmtH(h), p: T(prev.name) }), per[0], p.name, k);
        else push(T("Explore {p}", { p: T(p.name) }), "", per[n2], p.name, 0);
      }
      prev = p;
    });
    var left = S.nights - plannedNights();
    for (var f = 0; f < left; f++) push(T(f === 0 && !S.route.length ? "Arrive in Sri Lanka" : "Flexible day"), T("Deima will suggest how to use this day."), [], "Flexible", 0);
    var back = km(prev, D.airport);
    push(T("Transfer to the airport and depart"), T("≈ {k} km · {h} by road", { k: back, h: fmtH(hours(back)) }), [], "Airport", back);
    return { days: days };
  }

  function payload(ref) {
    var o = originInfo(), plan = itinerary(), r = rooms(), basis = S.meal;
    var roomType = r.triple ? "Triple" : r.double ? "Double" : "Single";
    return {
      reference: ref, createdAt: new Date().toISOString(), source: "deimagroup.com/travels · Trip Builder", destination: "Sri Lanka", language: S.lang,
      client: { name: S.name.trim(), email: S.email.trim(), phone: (S.dial + " " + S.phone).trim(), whatsapp: S.waSame ? (S.dial + " " + S.phone).trim() : (S.wa ? S.waDial + " " + S.wa : ""), originCountry: S.origin, preferredContact: S.contact },
      market: S.origin, tripType: byId(D.tripTypes, S.tripType).label,
      adults: S.adults, children: S.children, childAges: S.childAges.slice(0, S.children), totalPax: totalPax(),
      arrivalDate: S.arrival, nights: S.nights, interests: S.interests, hotelStyle: byId(D.styles, S.style).label, pace: byId(D.paces, S.pace).label,
      mealPlan: basis, rooms: r, vehicle: vehicle(), guideLanguage: S.guideLang,
      flightsNeeded: S.flights, departureCity: S.flights ? S.fromCity : "", visaHelp: S.visa,
      budgetPerPerson: S.budget ? Number(S.budget) : null, currency: o ? o.cur : "USD", specialRequests: S.requests.trim(),
      days: plan.days.map(function (d) {
        var stop = null; S.route.forEach(function (s) { if (place(s.id).name === d.location) stop = s; });
        var isLast = d.day === plan.days.length;
        return { day: d.day, date: d.date, location: d.location, km: d.km, accommodation: isLast ? "" : (stop ? (stop.hotel === "auto" ? "Deima to choose (" + byId(D.styles, S.style).label + ")" : stop.hotel) : "Deima to suggest"), roomType: isLast ? "" : roomType, basis: isLast ? "" : basis };
      }),
      siteVisits: S.route.reduce(function (all, s) { return all.concat(s.acts.map(function (a) { return { place: place(s.id).name, activity: a }; })); }, [])
    };
  }

  function makeRef() {
    var d = new Date(), pad = function (n) { return (n < 10 ? "0" : "") + n; };
    return "DT-" + String(d.getFullYear()).slice(2) + pad(d.getMonth() + 1) + pad(d.getDate()) + "-" + Math.random().toString(36).slice(2, 6).toUpperCase();
  }

  function send() {
    for (var i = 0; i < STEPS.length - 1; i++) { var m = check(i); if (m) { S.step = i; errorMsg = m; render(); return; } }
    var ref = makeRef(), body = payload(ref);
    var btn = $foot.querySelector('[data-a="send"]'); if (btn) { btn.disabled = true; btn.textContent = T("Sending…"); }
    var done = function (ok, note) { S.sent = { ref: ref, ok: ok, note: note, body: body }; save(); render(); };
    if (!WEBHOOK) { done(true, "demo"); return; }
    fetch(WEBHOOK, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      .then(function (res) { if (!res.ok) throw new Error(res.status); done(true, "sent"); })
      .catch(function () { if (btn) { btn.disabled = false; btn.textContent = T("Send to Deima ✈"); } errorMsg = T("We couldn't send your request. Check your connection and try again."); renderFootMsg(); });
  }
  function renderFootMsg() { var m = $foot.querySelector(".tb-msg"); if (m) m.textContent = errorMsg; }

  function renderDone() {
    var s = S.sent;
    $steps.innerHTML = ""; renderSide();
    $main.innerHTML = '<div class="tb-done"><div class="big">✓</div><h2>' + T("Thank you, {name}!", { name: esc(S.name.split(" ")[0] || T("traveller")) }) + "</h2>" +
      "<p>" + T("Your trip request is with Deima Travels. A consultant will check your plan and reply by {c}, usually within one working day.", { c: "<b>" + esc(T(S.contact)) + "</b>" }) + "</p>" +
      '<div class="tb-ref">' + esc(s.ref) + "</div><p>" + T("Keep this reference number for any questions.") + "</p>" +
      (s.note === "demo" ? '<div class="tb-hint warn" style="text-align:left"><span aria-hidden="true">🧪</span><span><b>' + T("Demo mode:") + "</b> " + T("nothing was sent. Below is exactly what would go to Deima's n8n workflow.") + '</span></div><details open style="width:100%;text-align:left"><summary>' + T("Request data") + '</summary><div class="tb-json">' + esc(JSON.stringify(s.body, null, 2)) + "</div></details>" : "") +
      "</div>";
    $foot.innerHTML = '<button type="button" class="tb-btn" data-a="reset">' + T("Plan another trip") + '</button><span class="tb-msg"></span><button type="button" class="tb-btn primary" data-a="close">' + T("Close") + "</button>";
    launchLabel();
  }

  // ---------- language switching ----------
  var fontLoaded = false;
  function loadFont() { // Japanese and Korean faces, loaded only when needed
    if (fontLoaded) return; fontLoaded = true;
    var l = document.createElement("link"); l.rel = "stylesheet";
    l.href = "https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700;800&family=Noto+Sans+KR:wght@400;500;700;800&display=swap";
    document.head.appendChild(l);
  }
  function setLang(l) {
    if (!/^(en|ja|ko)$/.test(l) || l === S.lang) return;
    S.lang = l; errorMsg = ""; save();
    var keep = $main.scrollTop; render(); $main.scrollTop = keep; launchLabel();
  }
  if (S.lang !== "en") loadFont();

  // ---------- events ----------
  root.addEventListener("click", function (e) {
    var el = e.target.closest("[data-a]"); if (!el || !root.contains(el)) return;
    if (el.tagName === "INPUT") return; // checkboxes/radios handled on change
    var a = el.getAttribute("data-a"), v = el.getAttribute("data-v"), i = +el.getAttribute("data-i");
    var keepScroll = $main.scrollTop;
    switch (a) {
      case "close": close(); return;
      case "next": go(S.step + 1); return;
      case "back": go(S.step - 1); return;
      case "go": go(i); return;
      case "send": send(); return;
      case "reset": S = fresh(); errorMsg = ""; save(); render(); return; // fresh() keeps the language
      case "lang": setLang(v); return;
      case "country": S.country = v; break;
      case "tripType":
        var oldPreset = byId(D.tripTypes, S.tripType).interests.join();
        S.tripType = v;
        if (!S.interests.length || S.interests.slice().sort().join() === oldPreset.split(",").sort().join()) S.interests = byId(D.tripTypes, v).interests.slice();
        break;
      case "interest": var k = S.interests.indexOf(v); if (k >= 0) S.interests.splice(k, 1); else S.interests.push(v); break;
      case "style": S.style = v; break;
      case "pace": S.pace = v; break;
      case "meal": S.meal = v; break;
      case "contact": S.contact = v; break;
      case "focus": focusPlace(v, true); return;
      case "fitRoute": fitRoute(); return;
      case "add":
        if (inRoute(v) < 0) { var left = S.nights - plannedNights(); S.route.push({ id: v, nights: Math.max(1, Math.min(paceNights(), left || 1)), hotel: "auto", acts: place(v).activities.filter(function (x) { return S.interests.indexOf(x[1]) >= 0; }).map(function (x) { return x[0]; }) }); }
        break;
      case "remove": var ri = inRoute(v); if (ri >= 0) S.route.splice(ri, 1); break;
      case "nInc": S.route[i].nights++; break;
      case "nDec": if (S.route[i].nights > 1) S.route[i].nights--; else S.route.splice(i, 1); break;
      case "up": if (i > 0) { var t = S.route[i - 1]; S.route[i - 1] = S.route[i]; S.route[i] = t; } break;
      case "down": if (i < S.route.length - 1) { var t2 = S.route[i + 1]; S.route[i + 1] = S.route[i]; S.route[i] = t2; } break;
      case "optimise":
        var rest = S.route.slice(), out = [], cur = D.airport;
        while (rest.length) { var best = 0; for (var j = 1; j < rest.length; j++) if (km(cur, place(rest[j].id)) < km(cur, place(rest[best].id))) best = j; cur = place(rest[best].id); out.push(rest.splice(best, 1)[0]); }
        S.route = out; break;
      case "roomsAuto": S.roomsAuto = true; break;
      case "inc": case "dec":
        var f = el.getAttribute("data-f"), d = a === "inc" ? 1 : -1;
        if (f === "nights") S.nights = Math.max(1, Math.min(30, S.nights + d));
        else if (f === "adults") { S.adults = Math.max(1, Math.min(40, S.adults + d)); }
        else if (f === "children") { S.children = Math.max(0, Math.min(12, S.children + d)); while (S.childAges.length < S.children) S.childAges.push(""); }
        else if (f === "single" || f === "double" || f === "triple") { if (S.roomsAuto) { S.rooms = autoRooms(); S.roomsAuto = false; } S.rooms[f] = Math.max(0, S.rooms[f] + d); }
        break;
      default: return;
    }
    errorMsg = ""; save(); render(); $main.scrollTop = keepScroll;
  });

  // ---------- photo preview on hover / focus ----------
  var peek = document.createElement("div");
  peek.className = "tb-peek"; peek.hidden = true; peek.setAttribute("aria-hidden", "true");
  root.appendChild(peek);
  var peekFor = null;
  function hidePeek() { peek.hidden = true; peekFor = null; }
  function showPeek(el) {
    if (peekFor === el) return; peekFor = el;
    var name = el.getAttribute("data-peek-name"), own = el.getAttribute("data-peek-img"), title = el.getAttribute("data-peek");
    var draw = function (src, credit) {
      if (peekFor !== el) return;
      var none = T(el.classList.contains("tb-hotel") ? "Photos of this hotel will come from Deima's partner library." : "Loading photo…");
      peek.innerHTML = (src ? '<img src="' + esc(src) + '" alt="">' : '<div class="noimg">📷<span>' + none + "</span></div>") +
        "<div><b>" + esc(name) + "</b>" + (credit ? "<small>" + T("Photo: Wikipedia / Wikimedia Commons") + "</small>" : "") + "</div>";
      peek.hidden = false;
      var r = el.getBoundingClientRect(), w = Math.min(340, window.innerWidth - 24), x = r.left - w - 14;
      if (x < 12) x = Math.min(window.innerWidth - w - 12, r.right + 14);
      if (x + w > window.innerWidth - 12) x = Math.max(12, (window.innerWidth - w) / 2);
      peek.style.width = w + "px"; peek.style.left = x + "px";
      var h = peek.offsetHeight, y = Math.max(12, Math.min(window.innerHeight - h - 12, r.top + r.height / 2 - h / 2));
      peek.style.top = y + "px";
    };
    if (own) { draw(own, false); return; }
    var drawPhoto = function (v) {
      draw(v ? v.big : null, !!v);
      var im = peek.querySelector("img"); if (im && v) im.onerror = function () { if (im.getAttribute("src") !== v.src) im.src = v.src; };
    };
    drawPhoto(PHOTO[title] || null);
    photo(title, drawPhoto);
  }
  var canHover = window.matchMedia && window.matchMedia("(hover: hover)").matches;
  root.addEventListener("mouseover", function (e) { if (!canHover) return; var el = e.target.closest("[data-peek]"); if (el) showPeek(el); else if (!e.target.closest(".tb-peek")) hidePeek(); });
  root.addEventListener("focusin", function (e) { var el = e.target.closest && e.target.closest("[data-peek]"); if (el && canHover) showPeek(el); else hidePeek(); });
  $main.addEventListener("scroll", hidePeek, { passive: true });

  root.addEventListener("keydown", function (e) {
    var g = e.target.closest && e.target.closest("g[data-a]");
    if (g && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); g.dispatchEvent(new MouseEvent("click", { bubbles: true })); }
  });

  root.addEventListener("input", function (e) {
    var f = e.target.getAttribute("data-f"); if (!f || e.target.type === "checkbox") return;
    S[f] = e.target.value; save();
    if (f === "arrival") { var keep = $main.scrollTop; render(); $main.scrollTop = keep; } else renderSide();
  });

  root.addEventListener("change", function (e) {
    var t = e.target, keep = $main.scrollTop;
    if (t.hasAttribute("data-age")) { S.childAges[+t.getAttribute("data-age")] = t.value === "" ? "" : +t.value; save(); return; }
    var a = t.getAttribute("data-a"), stop = S.route[inRoute(S.focus)];
    if (a === "act" && stop) { var name = place(S.focus).activities[+t.getAttribute("data-v")][0], k = stop.acts.indexOf(name); if (t.checked && k < 0) stop.acts.push(name); if (!t.checked && k >= 0) stop.acts.splice(k, 1); save(); render(); $main.scrollTop = keep; return; }
    if (a === "hotel" && stop) { stop.hotel = t.getAttribute("data-v"); save(); render(); $main.scrollTop = keep; return; }
    var f = t.getAttribute("data-f"); if (!f) return;
    if (f === "lang") { setLang(t.value); return; }
    if ((t.tagName === "INPUT" && t.type !== "checkbox") || t.tagName === "TEXTAREA") return; // text fields are saved on input; re-rendering here would steal focus
    if (t.type === "checkbox") { S[f] = t.checked; }
    else S[f] = t.value;
    if (f === "origin") { var o = originInfo(); if (o && o.dial !== "+") { S.dial = o.dial; S.waDial = o.dial; } }
    save(); render(); $main.scrollTop = keep;
  });
})();
