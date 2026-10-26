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
  var MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  var STEPS = [
    { id: "where", label: "Where & when" },
    { id: "style", label: "Travel style" },
    { id: "route", label: "Your route" },
    { id: "stay", label: "Stay & extras" },
    { id: "you", label: "Your details" },
    { id: "review", label: "Review" }
  ];

  // ---------- state ----------
  function fresh() {
    return {
      step: 0, country: "lk", tripType: "holiday", arrival: "", nights: 7, adults: 2, children: 0, childAges: [],
      interests: byId(D.tripTypes, "holiday").interests.slice(), style: "premium", pace: "balanced", route: [], focus: null,
      meal: "HB", roomsAuto: true, rooms: { single: 0, double: 1, triple: 0 }, guideLang: "English",
      flights: false, fromCity: "", visa: true, budget: "", requests: "",
      name: "", email: "", dial: "+94", phone: "", waSame: true, waDial: "+94", wa: "", origin: "", contact: "WhatsApp", consent: false,
      sent: null
    };
  }
  var S = fresh();
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
  function fmtH(h) { return (h % 1 ? h.toFixed(1) : h) + " h"; }
  function todayISO() { var d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); }
  function addDays(iso, n) { var d = new Date(iso + "T12:00:00"); d.setDate(d.getDate() + n); return d; }
  function fmtDate(d) { return d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" }); }
  function tripMonth() { return S.arrival ? new Date(S.arrival + "T12:00:00").getMonth() + 1 : 0; }
  function plannedNights() { return S.route.reduce(function (t, r) { return t + r.nights; }, 0); }
  function totalPax() { return S.adults + S.children; }
  function score(p) { var n = 0; S.interests.forEach(function (i) { if (p.tags.indexOf(i) >= 0) n++; }); return n; }
  function inRoute(id) { for (var i = 0; i < S.route.length; i++) if (S.route[i].id === id) return i; return -1; }
  function paceNights() { return byId(D.paces, S.pace).nights; }
  function vehicle() { var p = totalPax(); for (var i = 0; i < D.vehicles.length; i++) if (p <= D.vehicles[i].max) return D.vehicles[i].label; return "Coach – Deima will advise"; }
  function autoRooms() {
    var n = S.adults; S.childAges.forEach(function (a) { if (a === "" || a >= 6) n++; }); // under-6s share a bed
    if (n <= 1) return { single: 1, double: 0, triple: 0 };
    var triple = n % 2 === 1 ? 1 : 0;
    return { single: 0, double: (n - 3 * triple) / 2, triple: triple };
  }
  function rooms() { return S.roomsAuto ? autoRooms() : S.rooms; }
  function roomsText(r) {
    var parts = [];
    if (r.single) parts.push(r.single + " single"); if (r.double) parts.push(r.double + " double"); if (r.triple) parts.push(r.triple + " triple");
    return parts.join(" + ") || "None";
  }
  function paxText() { return S.adults + " adult" + (S.adults > 1 ? "s" : "") + (S.children ? ", " + S.children + " child" + (S.children > 1 ? "ren" : "") : ""); }
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
      html: '<div class="' + cls + '"><span class="ph"' + (v ? ' style="background-image:' + cssUrl(v.src) + '"' : "") + "></span>" + (idx >= 0 ? "<b>" + (idx + 1) + "</b>" : "") + '</div><span class="tb-mk-l">' + esc(p.name) + "</span>"
    });
  }
  function tipHTML(p, v) {
    var s = score(p), idx = inRoute(p.id);
    return '<div class="tb-tipc">' + (v ? '<img src="' + esc(v.src) + '" alt="">' : '<div class="noimg" aria-hidden="true">📷</div>') +
      "<div><small>" + esc(p.region) + "</small><b>" + esc(p.name) + "</b><span>" + esc(p.blurb) + "</span>" +
      "<em>" + (idx >= 0 ? "Stop " + (idx + 1) + " in your route" : s ? "●".repeat(s) + " match for you" : "") + " · Click to explore</em></div></div>";
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
    L.control.layers({ "Map": street, "Satellite": sat, "Terrain": topo }, null, { position: "topright", collapsed: false }).addTo(m);
    var zoomCls = function () { LEAF.host.classList.toggle("tb-z-low", m.getZoom() < 8.5); };
    m.on("zoomend", zoomCls);
    m.fitBounds(ISLAND, { padding: [8, 8] });
    L.marker([D.airport.lat, D.airport.lon], { icon: L.divIcon({ className: "tb-air", html: "✈", iconSize: [28, 28], iconAnchor: [14, 14] }), keyboard: false })
      .bindTooltip("Airport (CMB)", { direction: "left", className: "tb-tip-sm" }).addTo(m);
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
    launch.innerHTML = '<span class="tb-plane" aria-hidden="true">✈</span><span><span class="tb-long">' + (cont ? "Continue your quote" : "Get a quote") + '</span><span class="tb-short">Quote</span><small>' + (cont ? "Pick up where you left off" : "Build your trip in minutes") + "</small></span>";
  }
  launchLabel();

  var root = document.createElement("div");
  root.className = "tb"; root.hidden = true;
  root.setAttribute("role", "dialog"); root.setAttribute("aria-modal", "true"); root.setAttribute("aria-label", "Build your trip");
  root.innerHTML =
    '<div class="tb-shell">' +
      '<div class="tb-top"><div class="tb-brand"><i>DT</i><div>Deima Travels<span>Trip Builder</span></div></div><nav class="tb-steps" aria-label="Steps"></nav><button class="tb-close" type="button" data-a="close" aria-label="Close">×</button></div>' +
      '<div class="tb-mobilebar"></div>' +
      '<div class="tb-body"><main class="tb-main"></main><aside class="tb-side"></aside></div>' +
      '<div class="tb-foot"></div>' +
    "</div>";
  document.body.appendChild(root);
  var $steps = root.querySelector(".tb-steps"), $main = root.querySelector(".tb-main"), $side = root.querySelector(".tb-side"),
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
      if (!S.arrival) return "Choose your arrival date.";
      if (S.arrival < todayISO()) return "The arrival date is in the past.";
      if (S.childAges.slice(0, S.children).some(function (a) { return a === ""; })) return "Add the age of each child.";
    }
    if (id === "style" && !S.interests.length) return "Pick at least one thing you'd like to do.";
    if (id === "route") {
      if (!S.route.length) return "Add at least one place to your route. Tap a pin on the map.";
      if (plannedNights() > S.nights) return "Your route has " + plannedNights() + " nights but your trip has " + S.nights + ". Remove some nights or extend the trip.";
    }
    if (id === "you") {
      if (!S.name.trim()) return "Add your name.";
      if (!emailOk(S.email.trim())) return "Add a valid email address.";
      if (S.phone.replace(/\D/g, "").length < 6) return "Add a contact number.";
      if (!S.waSame && S.wa && S.wa.replace(/\D/g, "").length < 6) return "Check the WhatsApp number, or leave it empty.";
      if (!S.origin) return "Choose the country you're travelling from.";
      if (!S.consent) return "Tick the box so Deima can contact you about this trip.";
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
    if (S.sent) { renderDone(); return; }
    $steps.innerHTML = STEPS.map(function (s, i) {
      var cls = i === S.step ? "is-now" : i < S.step ? "is-done" : "";
      return '<button type="button" class="' + cls + '" data-a="go" data-i="' + i + '"' + (i > S.step + 1 ? " disabled" : "") + '><b>' + (i < S.step ? "✓" : i + 1) + "</b><span>" + s.label + "</span></button>";
    }).join("");
    var id = STEPS[S.step].id;
    $main.innerHTML = VIEWS[id]();
    hidePeek();
    if (id === "route") mountMap();
    hydrate($main);
    renderSide();
    var last = S.step === STEPS.length - 1;
    $foot.innerHTML =
      '<button type="button" class="tb-btn" data-a="back"' + (S.step === 0 ? " disabled" : "") + ">← Back</button>" +
      '<span class="tb-msg" role="alert">' + esc(errorMsg) + "</span>" +
      (last ? '<button type="button" class="tb-btn lime" data-a="send">Send to Deima ✈</button>'
            : '<button type="button" class="tb-btn primary" data-a="next">Next: ' + STEPS[S.step + 1].label + " →</button>");
    launchLabel();
  }

  var VIEWS = {
    where: function () {
      var today = todayISO();
      var ages = "";
      for (var i = 0; i < S.children; i++) {
        var opts = '<option value="">Age</option>';
        for (var a = 0; a <= 17; a++) opts += '<option value="' + a + '"' + (S.childAges[i] === a ? " selected" : "") + ">" + (a === 0 ? "Under 1" : a) + "</option>";
        ages += '<div class="tb-field"><label for="tb-age' + i + '">Child ' + (i + 1) + "</label><select id=\"tb-age" + i + '" data-age="' + i + '">' + opts + "</select></div>";
      }
      return head("Step 1 of 6", "Where would you like to go?", "Pick a destination and tell us when, and who's coming.") +
        '<div class="tb-block"><span class="tb-label">Destination</span><div class="tb-grid tb-g4">' +
        D.countries.map(function (c) {
          var flag = { lk: "🇱🇰", mv: "🇲🇻", ae: "🇦🇪", th: "🇹🇭" }[c.id] || "🌍";
          return '<button type="button" class="tb-card" data-a="country" data-v="' + c.id + '" aria-pressed="' + (S.country === c.id) + '"' + (c.active ? "" : " disabled") + '><span class="tb-flag">' + flag + "</span><b>" + c.name + "</b><small>" + c.note + "</small>" + (c.active ? "" : '<span class="tb-soon">Soon</span>') + "</button>";
        }).join("") + "</div></div>" +
        '<div class="tb-block"><span class="tb-label">Type of trip</span><div class="tb-chips">' +
        D.tripTypes.map(function (t) { return '<button type="button" class="tb-chip" data-a="tripType" data-v="' + t.id + '" aria-pressed="' + (S.tripType === t.id) + '">' + t.label + "</button>"; }).join("") + "</div></div>" +
        '<div class="tb-block tb-grid tb-g2">' +
          '<div class="tb-field"><label for="tb-arrival">Arrival date</label><input class="tb-input" type="date" id="tb-arrival" data-f="arrival" min="' + today + '" value="' + esc(S.arrival) + '"></div>' +
          '<div class="tb-field"><label>Length of stay</label>' + counter("nights", S.nights, "nights", S.nights + 1 + " days") + "</div>" +
        "</div>" +
        '<div class="tb-block tb-grid tb-g2">' +
          '<div class="tb-field"><label>Adults</label>' + counter("adults", S.adults, "Adults", "12 years and over") + "</div>" +
          '<div class="tb-field"><label>Children</label>' + counter("children", S.children, "Children", "Under 12") + "</div>" +
        "</div>" +
        (S.children ? '<div class="tb-block"><span class="tb-label">Children\'s ages <em>(hotels price children by age)</em></span><div class="tb-grid tb-g4">' + ages + "</div></div>" : "") +
        (S.arrival ? seasonHint() : "");
    },

    style: function () {
      return head("Step 2 of 6", "How do you like to travel?", "Your choices light up the best places on the map in the next step.") +
        '<div class="tb-block"><span class="tb-label">What would you like to do? <em>Pick as many as you like</em></span><div class="tb-chips">' +
        D.interests.map(function (t) { return '<button type="button" class="tb-chip" data-a="interest" data-v="' + t.id + '" aria-pressed="' + (S.interests.indexOf(t.id) >= 0) + '"><span aria-hidden="true">' + t.icon + "</span>" + t.label + "</button>"; }).join("") + "</div></div>" +
        '<div class="tb-block"><span class="tb-label">Where would you like to stay?</span><div class="tb-grid tb-g5">' +
        D.styles.map(function (s) { return '<button type="button" class="tb-card" data-a="style" data-v="' + s.id + '" aria-pressed="' + (S.style === s.id) + '"><b>' + s.label + "</b><small>" + s.note + "</small></button>"; }).join("") + "</div></div>" +
        '<div class="tb-block"><span class="tb-label">Pace</span><div class="tb-grid tb-g3">' +
        D.paces.map(function (p) { return '<button type="button" class="tb-card" data-a="pace" data-v="' + p.id + '" aria-pressed="' + (S.pace === p.id) + '"><b>' + p.label + "</b><small>" + p.note + " · about " + p.nights + " night" + (p.nights > 1 ? "s" : "") + " per stop</small></button>"; }).join("") + "</div></div>" +
        (S.interests.length ? '<div class="tb-hint ok"><span aria-hidden="true">✓</span><span>Best matches for you: <b>' + topMatches(4).map(function (p) { return esc(p.name); }).join(", ") + "</b>.</span></div>" : "");
    },

    route: function () {
      var focus = place(S.focus) || null;
      return head("Step 3 of 6", "Build your route on the map", "Tap a place to see what you can do and where you can stay, then add it to your route. Brighter rings mean a better match for you.") +
        '<div class="tb-plan"><div class="tb-mapbox"><div class="tb-mapslot"></div>' +
        '<div class="tb-mapbar"><div class="tb-maplegend"><span><i class="lg-match"></i>Good match</span><span><i class="lg-route"></i>In your route</span><span>Hover for photos · click to explore</span></div>' +
        '<div class="tb-mapbtns"><button type="button" class="tb-btn small" data-a="fitRoute">' + (S.route.length ? "Show my route" : "Whole island") + "</button></div></div></div>" +
        '<div class="tb-panel">' + (focus ? placePanel(focus) : intro()) + routeBox() + "</div></div>";
    },

    stay: function () {
      var r = rooms(), cur = originInfo() ? originInfo().cur : "USD";
      return head("Step 4 of 6", "Stay and extras", "We've suggested rooms and a vehicle for your group. Change anything you like.") +
        '<div class="tb-block"><span class="tb-label">Meals</span><div class="tb-grid tb-g4">' +
        D.meals.map(function (m) { return '<button type="button" class="tb-card" data-a="meal" data-v="' + m.id + '" aria-pressed="' + (S.meal === m.id) + '"><b>' + m.label + "</b><small>" + (m.note || m.id) + "</small></button>"; }).join("") + "</div></div>" +
        '<div class="tb-block"><span class="tb-label">Rooms <em>' + (S.roomsAuto ? "· suggested for " + paxText() : "· set by you") + "</em></span>" +
        '<div class="tb-grid tb-g3">' + counter("single", r.single, "Single rooms", "") + counter("double", r.double, "Double / twin", "") + counter("triple", r.triple, "Triple rooms", "") + "</div>" +
        (S.roomsAuto ? "" : '<p style="margin-top:8px"><button type="button" class="tb-btn small" data-a="roomsAuto">Use the suggestion again</button></p>') + "</div>" +
        '<div class="tb-block tb-grid tb-g2">' +
          '<div class="tb-field"><label>Transport <em>· based on ' + totalPax() + " traveller" + (totalPax() > 1 ? "s" : "") + '</em></label><div class="tb-hint"><span aria-hidden="true">🚐</span><span><b>' + vehicle() + "</b> with a chauffeur guide for the whole trip.</span></div></div>" +
          '<div class="tb-field"><label for="tb-lang">Guide language</label><select id="tb-lang" data-f="guideLang">' + D.guideLanguages.map(function (l) { return "<option" + (S.guideLang === l ? " selected" : "") + ">" + l + "</option>"; }).join("") + "</select></div>" +
        "</div>" +
        '<div class="tb-block tb-grid tb-g2">' +
          '<label class="tb-check"><input type="checkbox" data-f="flights"' + (S.flights ? " checked" : "") + "><span><b>I need flights</b><br>Deima's ticketing team will add flight options.</span></label>" +
          '<label class="tb-check"><input type="checkbox" data-f="visa"' + (S.visa ? " checked" : "") + "><span><b>Help me with the visa / ETA</b><br>Deima will tell you what you need and can apply for you.</span></label>" +
        "</div>" +
        (S.flights ? '<div class="tb-block tb-field" style="max-width:420px"><label for="tb-from">Flying from <em>(city or airport)</em></label><input class="tb-input" id="tb-from" data-f="fromCity" value="' + esc(S.fromCity) + '" placeholder="e.g. Chennai, London Heathrow"></div>' : "") +
        '<div class="tb-block tb-grid tb-g2">' +
          '<div class="tb-field"><label for="tb-budget">Budget per person <em>(optional, excluding flights)</em></label><div class="tb-phone"><input class="tb-input" value="' + cur + '" disabled aria-label="Currency"><input class="tb-input" id="tb-budget" type="number" min="0" inputmode="numeric" data-f="budget" value="' + esc(S.budget) + '" placeholder="e.g. 1500"></div></div>' +
          '<div class="tb-field"><label for="tb-req">Special requests <em>(optional)</em></label><textarea id="tb-req" data-f="requests" placeholder="Anniversary, dietary needs, accessibility, a hotel you love…">' + esc(S.requests) + "</textarea></div>" +
        "</div>";
    },

    you: function () {
      var dials = [], seen = {};
      D.origins.forEach(function (o) { if (!seen[o.dial] && o.dial !== "+") { seen[o.dial] = 1; dials.push(o.dial); } });
      function dialSel(f, val, label) { return '<select data-f="' + f + '" aria-label="' + label + '">' + dials.map(function (d) { return "<option" + (d === val ? " selected" : "") + ">" + d + "</option>"; }).join("") + "</select>"; }
      return head("Step 5 of 6", "Where should we send your quote?", "A Deima travel consultant will check your plan and send you prices.") +
        '<div class="tb-block tb-grid tb-g2">' +
          '<div class="tb-field"><label for="tb-name">Full name</label><input class="tb-input" id="tb-name" data-f="name" autocomplete="name" value="' + esc(S.name) + '"></div>' +
          '<div class="tb-field"><label for="tb-email">Email</label><input class="tb-input" id="tb-email" type="email" data-f="email" autocomplete="email" value="' + esc(S.email) + '"></div>' +
          '<div class="tb-field"><label for="tb-phone">Contact number</label><div class="tb-phone">' + dialSel("dial", S.dial, "Country code") + '<input class="tb-input" id="tb-phone" type="tel" data-f="phone" autocomplete="tel-national" value="' + esc(S.phone) + '"></div></div>' +
          '<div class="tb-field"><label for="tb-origin">Travelling from</label><select id="tb-origin" data-f="origin"><option value="">Choose a country</option>' + D.origins.map(function (o) { return "<option" + (S.origin === o.name ? " selected" : "") + ">" + o.name + "</option>"; }).join("") + "</select></div>" +
        "</div>" +
        '<div class="tb-block"><label class="tb-check"><input type="checkbox" data-f="waSame"' + (S.waSame ? " checked" : "") + "><span>My WhatsApp number is the same as my contact number</span></label>" +
        (S.waSame ? "" : '<div class="tb-field" style="max-width:420px;margin-top:10px"><label for="tb-wa">WhatsApp number <em>(optional)</em></label><div class="tb-phone">' + dialSel("waDial", S.waDial, "WhatsApp country code") + '<input class="tb-input" id="tb-wa" type="tel" data-f="wa" value="' + esc(S.wa) + '"></div></div>') + "</div>" +
        '<div class="tb-block"><span class="tb-label">Best way to reach you</span><div class="tb-chips">' +
        ["WhatsApp", "Email", "Phone call"].map(function (c) { return '<button type="button" class="tb-chip" data-a="contact" data-v="' + c + '" aria-pressed="' + (S.contact === c) + '">' + c + "</button>"; }).join("") + "</div></div>" +
        (S.origin && S.origin !== "Sri Lanka" && S.visa ? '<div class="tb-block tb-hint"><span aria-hidden="true">🛂</span><span>Travellers from ' + esc(S.origin) + " usually need a Sri Lanka visa or ETA before arrival. Deima will confirm and can apply for you.</span></div>" : "") +
        '<div class="tb-block"><label class="tb-check"><input type="checkbox" data-f="consent"' + (S.consent ? " checked" : "") + "><span>Deima Travels may contact me about this trip by email, phone or WhatsApp.</span></label></div>";
    },

    review: function () {
      var plan = itinerary(), r = rooms();
      return head("Step 6 of 6", "Here's your trip so far", "This is a draft. A Deima consultant will check it, add prices and send you a full quote.") +
        '<div class="tb-block tb-facts">' +
          fact("Travellers", paxText()) + fact("Arrival", S.arrival ? fmtDate(addDays(S.arrival, 0)) : "–") + fact("Length", S.nights + " nights") +
          fact("Hotels", byId(D.styles, S.style).label + " · " + roomsText(r)) + fact("Meals", byId(D.meals, S.meal).label) + fact("Transport", vehicle() + " · " + S.guideLang + " guide") +
        "</div>" +
        '<div class="tb-block"><span class="tb-label">Day by day</span><div class="tb-days">' +
        plan.days.map(function (d) {
          return '<div class="tb-day"><div class="d">Day ' + d.day + "<small>" + esc(d.dateText) + "</small></div><div><h4>" + esc(d.title) + "</h4>" + (d.note ? "<p>" + esc(d.note) + "</p>" : "") +
            (d.acts.length ? "<ul>" + d.acts.map(function (a) { return "<li>" + esc(a) + "</li>"; }).join("") + "</ul>" : "") + "</div></div>";
        }).join("") + "</div></div>" +
        '<div class="tb-block tb-grid tb-g2">' +
          '<div class="tb-hint"><span aria-hidden="true">📩</span><span>We\'ll reply by <b>' + esc(S.contact) + "</b> to " + esc(S.contact === "Email" ? S.email : S.dial + " " + S.phone) + ".</span></div>" +
          (WEBHOOK ? "" : '<div class="tb-hint warn"><span aria-hidden="true">🧪</span><span><b>Demo mode.</b> Nothing is sent yet. You\'ll see exactly what Deima would receive.</span></div>') +
        "</div>" +
        '<details class="tb-block"><summary>What Deima receives (quotation-template format)</summary><div class="tb-json">' + esc(JSON.stringify(payload("DT-PREVIEW"), null, 2)) + "</div></details>";
    }
  };

  function head(eyebrow, title, text) { return '<div class="tb-head"><div class="tb-eyebrow">' + eyebrow + "</div><h2>" + title + "</h2><p>" + text + "</p></div>"; }
  function fact(k, v) { return '<div class="tb-fact"><small>' + k + "</small><b>" + esc(v) + "</b></div>"; }
  function counter(f, v, label, sub) {
    return '<div class="tb-counter"><span>' + label + (sub ? "<small>" + sub + "</small>" : "") + '</span><div class="tb-step"><button type="button" data-a="dec" data-f="' + f + '" aria-label="Fewer ' + label + '">−</button><output>' + v + '</output><button type="button" data-a="inc" data-f="' + f + '" aria-label="More ' + label + '">+</button></div></div>';
  }
  function seasonHint() {
    var m = tripMonth(); if (!m) return "";
    var good = D.places.filter(function (p) { return p.good.indexOf(m) >= 0; }).map(function (p) { return p.region; });
    var regions = good.filter(function (r, i) { return good.indexOf(r) === i; });
    var bad = D.places.filter(function (p) { return p.good.indexOf(m) < 0; }).map(function (p) { return p.region; }).filter(function (r, i, a) { return a.indexOf(r) === i && regions.indexOf(r) < 0; });
    return '<div class="tb-hint ok"><span aria-hidden="true">☀️</span><span><b>' + MONTHS[m - 1] + " is a good time for:</b> " + regions.join(", ") + "." + (bad.length ? " Quieter or rainier then: " + bad.join(", ") + "." : "") + " A rough guide; Deima will advise.</span></div>";
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
    return '<div class="tb-place"><div><div class="tb-sub">Start here</div><p>Tap a pin on the map, or pick one of your best matches:</p></div>' +
      '<div class="tb-top-matches">' + (tops.length ? tops.map(function (p) { return '<button type="button" data-a="focus" data-v="' + p.id + '">' + esc(p.name) + ' <i>' + "●".repeat(score(p)) + "</i></button>"; }).join("") : '<span class="tb-empty">Go back a step to choose what you like to do.</span>') + "</div></div>";
  }

  function placePanel(p) {
    var idx = inRoute(p.id), stop = idx >= 0 ? S.route[idx] : null, m = tripMonth();
    var months = MONTHS.map(function (n, i) { return '<span class="' + (p.good.indexOf(i + 1) >= 0 ? "good" : "") + (m === i + 1 ? " trip" : "") + '" title="' + n + '">' + n[0] + "</span>"; }).join("");
    var acts = p.activities.map(function (a, i) {
      var on = stop ? stop.acts.indexOf(a[0]) >= 0 : false, hit = S.interests.indexOf(a[1]) >= 0;
      return '<label class="tb-act' + (on ? " checked" : "") + (stop ? "" : " locked") + '" data-peek="' + esc(a[2] || "") + '" data-peek-name="' + esc(a[0]) + '">' +
        '<span class="tb-ph-wrap tb-act-ph"><img class="tb-ph" data-photo="' + esc(a[2] || "") + '" alt="" loading="lazy"><i aria-hidden="true">' + byId(D.interests, a[1]).icon + "</i></span>" +
        '<span class="tb-act-t"><input type="checkbox" data-a="act" data-v="' + i + '"' + (on ? " checked" : "") + (stop ? "" : " disabled") + ">" + esc(a[0]) + (hit ? '<em>Matches you</em>' : "") + "</span></label>";
    }).join("");
    var hotels;
    if (!p.hotels.length) hotels = '<div class="tb-empty">Deima will suggest hotels here that match your style (' + byId(D.styles, S.style).label.toLowerCase() + ").</div>";
    else {
      var mine = S.style === "mix" ? p.hotels : p.hotels.filter(function (h) { return h[1] === S.style; });
      var rest = S.style === "mix" ? [] : p.hotels.filter(function (h) { return h[1] !== S.style; });
      var cur = stop ? stop.hotel : "auto";
      var opt = function (h, other) {
        var pic = h[3] ? ' data-img="' + esc(h[3]) + '"' : ' data-photo="' + esc(h[2] || "") + '"';
        return '<label class="tb-opt tb-hotel' + (other ? " other" : "") + (cur === h[0] ? " checked" : "") + '" data-peek="' + esc(h[2] || "") + '" data-peek-img="' + esc(h[3] || "") + '" data-peek-name="' + esc(h[0]) + '">' +
          '<input type="radio" name="tb-hotel" data-a="hotel" data-v="' + esc(h[0]) + '"' + (cur === h[0] ? " checked" : "") + (stop ? "" : " disabled") + ">" +
          '<span class="tb-ph-wrap tb-hotel-ph"><img class="tb-ph"' + pic + ' alt="" loading="lazy"><i aria-hidden="true">' + esc(h[0].charAt(0)) + "</i></span>" +
          '<span class="tb-hotel-n">' + esc(h[0]) + '</span><span class="tb-tag">' + byId(D.styles, h[1]).label + "</span></label>";
      };
      hotels = '<label class="tb-opt' + (cur === "auto" ? " checked" : "") + '"><input type="radio" name="tb-hotel" data-a="hotel" data-v="auto"' + (cur === "auto" ? " checked" : "") + (stop ? "" : " disabled") + ">Let Deima choose the best fit</label>" +
        mine.map(function (h) { return opt(h, false); }).join("") + rest.map(function (h) { return opt(h, true); }).join("");
    }
    return '<div class="tb-place">' +
      '<div class="tb-hero tb-ph-wrap"><img class="tb-ph" data-photo="' + esc(p.wiki) + '" data-size="big" alt="' + esc(p.name) + '"><span class="tb-hero-fade"></span>' +
      '<a class="tb-credit" target="_blank" rel="noopener" hidden>Photo: Wikipedia</a></div>' +
      '<div class="tb-place-h"><div><small>' + esc(p.region) + "</small><h3>" + esc(p.name) + "</h3></div>" +
      (stop ? '<button type="button" class="tb-btn small" data-a="remove" data-v="' + p.id + '">Remove</button>' : '<button type="button" class="tb-btn small primary" data-a="add" data-v="' + p.id + '">+ Add to route</button>') + "</div>" +
      "<p>" + esc(p.blurb) + "</p>" +
      '<div class="tb-tags">' + p.tags.map(function (t) { var it = byId(D.interests, t); return '<span class="tb-tag' + (S.interests.indexOf(t) >= 0 ? " hit" : "") + '">' + it.icon + " " + it.label + "</span>"; }).join("") + "</div>" +
      '<div><div class="tb-sub">Best months</div><div class="tb-months">' + months + "</div>" + (m && p.good.indexOf(m) < 0 ? '<p class="tb-hint warn" style="margin-top:8px">' + MONTHS[m - 1] + " isn't the best month here. Deima can suggest an alternative.</p>" : "") + "</div>" +
      '<div><div class="tb-sub">Things to do' + (stop ? "" : " · add to route to choose") + '</div><div class="tb-acts">' + acts + "</div></div>" +
      '<div><div class="tb-sub">Where to stay' + (stop ? "" : " · add to route to choose") + '</div><div class="tb-list">' + hotels + "</div></div>" +
      "</div>";
  }

  function routeBox() {
    var pn = plannedNights(), cls = pn === S.nights ? "ok" : pn > S.nights ? "over" : "";
    var rows = "", prev = D.airport;
    S.route.forEach(function (r, i) {
      var p = place(r.id), k = km(prev, p), h = hours(k);
      rows += '<div class="tb-leg' + (h >= 5 ? " long" : "") + '">' + (i === 0 ? "From the airport" : "Drive") + " ≈ " + k + " km · " + fmtH(h) + (h >= 5 ? " · long drive, consider a stop between" : "") + "</div>";
      rows += '<div class="tb-stop"><b>' + (i + 1) + '</b><div><div class="nm"><button type="button" data-a="focus" data-v="' + p.id + '">' + esc(p.name) + '</button></div><div class="mini">' +
        (r.acts.length ? r.acts.length + " activit" + (r.acts.length > 1 ? "ies" : "y") : "No activities picked") + " · " + (r.hotel === "auto" ? "Deima picks hotel" : esc(r.hotel)) + "</div></div>" +
        '<div class="tb-stop-ctl"><div class="tb-step"><button type="button" data-a="nDec" data-i="' + i + '" aria-label="One night less in ' + esc(p.name) + '">−</button><output>' + r.nights + 'n</output><button type="button" data-a="nInc" data-i="' + i + '" aria-label="One night more in ' + esc(p.name) + '">+</button></div>' +
        '<button type="button" class="tb-icon" data-a="up" data-i="' + i + '" aria-label="Move up"' + (i === 0 ? " disabled" : "") + ">↑</button>" +
        '<button type="button" class="tb-icon" data-a="down" data-i="' + i + '" aria-label="Move down"' + (i === S.route.length - 1 ? " disabled" : "") + ">↓</button></div></div>";
      prev = p;
    });
    if (S.route.length) { var back = km(prev, D.airport); rows += '<div class="tb-leg">Back to the airport ≈ ' + back + " km · " + fmtH(hours(back)) + "</div>"; }
    return '<div class="tb-route"><div class="tb-route-h"><h3>Your route</h3><span class="tb-nights ' + cls + '">' + pn + " of " + S.nights + " nights planned</span></div>" +
      (S.route.length ? rows : '<div class="tb-empty">No stops yet. Tap a place on the map and press "Add to route".</div>') +
      (S.route.length > 2 ? '<p><button type="button" class="tb-btn small" data-a="optimise">↻ Suggest the best order</button></p>' : "") +
      (S.route.length && pn < S.nights ? '<div class="tb-hint"><span aria-hidden="true">💡</span><span>' + (S.nights - pn) + " night" + (S.nights - pn > 1 ? "s" : "") + " left. Add another place, or leave them for Deima to suggest.</span></div>" : "") +
      "</div>";
  }

  function renderSide() {
    var o = originInfo(), stops = S.route.map(function (r) { return place(r.id).name; });
    var bars = ""; for (var i = 0; i < 34; i++) bars += '<i style="flex:' + (1 + ((i * 7 + S.nights * 3 + S.adults) % 4)) + ';opacity:' + (i % 3 ? 1 : 0.35) + '"></i>';
    $side.innerHTML =
      '<div class="tb-pass"><div class="tb-pass-top"><small>Deima Travels · Trip request</small>' +
      '<div class="tb-pass-route"><div><b>' + esc(o ? o.name.slice(0, 3).toUpperCase() : "YOU") + "</b><span>" + esc(S.origin || "Your country") + '</span></div><span class="plane" aria-hidden="true">✈</span><div style="text-align:right"><b>CMB</b><span>Sri Lanka</span></div></div></div>' +
      '<div class="tb-perf"></div>' +
      '<div class="tb-pass-grid"><div><small>Arrive</small><b>' + (S.arrival ? fmtDate(addDays(S.arrival, 0)) : "–") + "</b></div><div><small>Nights</small><b>" + S.nights + "</b></div>" +
      "<div><small>Travellers</small><b>" + S.adults + "A" + (S.children ? " · " + S.children + "C" : "") + "</b></div><div><small>Stay</small><b>" + byId(D.styles, S.style).label + "</b></div>" +
      "<div><small>Trip</small><b>" + byId(D.tripTypes, S.tripType).label + "</b></div><div><small>Meals</small><b>" + S.meal + "</b></div></div>" +
      (stops.length ? '<div class="tb-pass-stops">' + stops.map(function (s, i) { return "<span>" + (i + 1) + ". " + esc(s) + "</span>"; }).join("") + "</div>" : "") +
      '<div class="tb-pass-code" aria-hidden="true">' + bars + "</div></div>" +
      '<div class="tb-side-note"><div><b>Your trip card</b> fills in as you go. Your progress is saved on this device.</div>' +
      "<div>Nothing is booked or paid here. A Deima consultant checks your plan and sends you a priced quote.</div>" +
      '<div><button type="button" class="tb-btn small" data-a="reset">Start over</button></div></div>';
    $bar.innerHTML = "<span>Sri Lanka · " + S.nights + " nights · " + paxText() + (stops.length ? " · " + stops.length + " stop" + (stops.length > 1 ? "s" : "") : "") + "</span><span>" + (S.step + 1) + "/" + STEPS.length + "</span>";
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
        if (n2 === 0) push((si === 0 ? "Arrive in Sri Lanka, transfer to " : "Travel to ") + p.name, "≈ " + k + " km · " + fmtH(h) + " by road" + (si === 0 ? " from the airport" : " from " + prev.name), per[0], p.name, k);
        else push("Explore " + p.name, "", per[n2], p.name, 0);
      }
      prev = p;
    });
    var left = S.nights - plannedNights();
    for (var f = 0; f < left; f++) push(f === 0 && !S.route.length ? "Arrive in Sri Lanka" : "Flexible day", "Deima will suggest how to use this day.", [], "Flexible", 0);
    var back = km(prev, D.airport);
    push("Transfer to the airport and depart", "≈ " + back + " km · " + fmtH(hours(back)) + " by road", [], "Airport", back);
    return { days: days };
  }

  function payload(ref) {
    var o = originInfo(), plan = itinerary(), r = rooms(), basis = S.meal;
    var roomType = r.triple ? "Triple" : r.double ? "Double" : "Single";
    return {
      reference: ref, createdAt: new Date().toISOString(), source: "deimagroup.com/travels · Trip Builder", destination: "Sri Lanka",
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
    var btn = $foot.querySelector('[data-a="send"]'); if (btn) { btn.disabled = true; btn.textContent = "Sending…"; }
    var done = function (ok, note) { S.sent = { ref: ref, ok: ok, note: note, body: body }; save(); render(); };
    if (!WEBHOOK) { done(true, "demo"); return; }
    fetch(WEBHOOK, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      .then(function (res) { if (!res.ok) throw new Error(res.status); done(true, "sent"); })
      .catch(function () { if (btn) { btn.disabled = false; btn.textContent = "Send to Deima ✈"; } errorMsg = "We couldn't send your request. Check your connection and try again."; renderFootMsg(); });
  }
  function renderFootMsg() { var m = $foot.querySelector(".tb-msg"); if (m) m.textContent = errorMsg; }

  function renderDone() {
    var s = S.sent;
    $steps.innerHTML = ""; renderSide();
    $main.innerHTML = '<div class="tb-done"><div class="big">✓</div><h2>Thank you, ' + esc(S.name.split(" ")[0] || "traveller") + "!</h2>" +
      "<p>Your trip request is with Deima Travels. A consultant will check your plan and reply by <b>" + esc(S.contact) + "</b>, usually within one working day.</p>" +
      '<div class="tb-ref">' + esc(s.ref) + "</div><p>Keep this reference number for any questions.</p>" +
      (s.note === "demo" ? '<div class="tb-hint warn" style="text-align:left"><span aria-hidden="true">🧪</span><span><b>Demo mode:</b> nothing was sent. Below is exactly what would go to Deima\'s n8n workflow.</span></div><details open style="width:100%;text-align:left"><summary>Request data</summary><div class="tb-json">' + esc(JSON.stringify(s.body, null, 2)) + "</div></details>" : "") +
      "</div>";
    $foot.innerHTML = '<button type="button" class="tb-btn" data-a="reset">Plan another trip</button><span class="tb-msg"></span><button type="button" class="tb-btn primary" data-a="close">Close</button>';
    launchLabel();
  }

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
      case "reset": S = fresh(); errorMsg = ""; save(); render(); return;
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
      var none = el.classList.contains("tb-hotel") ? "Photos of this hotel will come from Deima's partner library." : "Loading photo…";
      peek.innerHTML = (src ? '<img src="' + esc(src) + '" alt="">' : '<div class="noimg">📷<span>' + none + "</span></div>") +
        "<div><b>" + esc(name) + "</b>" + (credit ? "<small>Photo: Wikipedia / Wikimedia Commons</small>" : "") + "</div>";
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
    if ((t.tagName === "INPUT" && t.type !== "checkbox") || t.tagName === "TEXTAREA") return; // text fields are saved on input; re-rendering here would steal focus
    if (t.type === "checkbox") { S[f] = t.checked; }
    else S[f] = t.value;
    if (f === "origin") { var o = originInfo(); if (o && o.dial !== "+") { S.dial = o.dial; S.waDial = o.dial; } }
    save(); render(); $main.scrollTop = keep;
  });
})();
