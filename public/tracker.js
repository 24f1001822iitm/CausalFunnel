/* CausalFunnel tracker - vanilla JS, no deps. Never throws into the host page. */
(function () {
  try {
    if (window.__cfTracker) return;
    var script = document.currentScript || document.querySelector('script[data-endpoint]');
    var endpoint;
    try {
      endpoint = (script && script.getAttribute('data-endpoint')) ||
        new URL('/api/events', (script && script.src) || location.href).href;
    } catch (e) { endpoint = '/api/events'; }
    var debug = !!(script && script.hasAttribute('data-debug') &&
      script.getAttribute('data-debug') !== 'false');
    window.__cfTracker = true;

    var SID_KEY = 'cf_sid', TIMEOUT = 30 * 60 * 1000, MAX_QUEUE = 100, MAX_BATCH = 50;
    var queue = [], timer = null, memSid = null, lastPath = null, lastClick = null;

    function validId(s) {
      return typeof s === 'string' && s.length >= 8 && s.length <= 64 && /^[\w-]+$/.test(s);
    }

    function genId() {
      try {
        if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
        if (window.crypto && crypto.getRandomValues) {
          var a = new Uint8Array(16); crypto.getRandomValues(a);
          var s = '';
          for (var i = 0; i < a.length; i++) s += (a[i] < 16 ? '0' : '') + a[i].toString(16);
          return s;
        }
      } catch (e) {}
      var r = '';
      while (r.length < 32) r += Math.random().toString(16).slice(2);
      return r.slice(0, 32);
    }

    function readCookie() {
      var m = document.cookie.match(/(?:^|;\s*)cf_sid=([^;]*)/);
      return m ? decodeURIComponent(m[1]) : null;
    }
    function writeCookie(id) {
      document.cookie = SID_KEY + '=' + encodeURIComponent(id) + '; path=/; max-age=1800; SameSite=Lax';
    }

    function getSessionId() {
      var now = Date.now(), id = null, last = 0, stored = false;
      try {
        var raw = localStorage.getItem(SID_KEY);
        stored = true;
        if (raw) {
          var o = JSON.parse(raw);
          if (o && validId(o.id)) { id = o.id; last = +o.last || 0; }
        }
      } catch (e) {}
      if (!stored) {
        try { var c = readCookie(); if (validId(c)) { id = c; last = now; } } catch (e) {}
        if (!id && memSid) { id = memSid.id; last = memSid.last; }
      }
      if (!id || now - last > TIMEOUT) id = genId();
      memSid = { id: id, last: now };
      try { localStorage.setItem(SID_KEY, JSON.stringify({ id: id, last: now })); }
      catch (e) { try { writeCookie(id); } catch (e2) {} }
      return id;
    }

    function max2(a, b) { return Math.max(a || 0, b || 0); }

    function base(type) {
      var de = document.documentElement || {}, b = document.body || {};
      var u = location.href, h = u.indexOf('#');
      if (h !== -1) u = u.slice(0, h);
      return {
        session_id: getSessionId(),
        type: type,
        url: u,
        timestamp: Date.now(),
        vw: Math.round(window.innerWidth || de.clientWidth || 0),
        vh: Math.round(window.innerHeight || de.clientHeight || 0),
        pw: Math.round(max2(de.scrollWidth, b.scrollWidth)),
        ph: Math.round(max2(de.scrollHeight, b.scrollHeight))
      };
    }

    function describe(el) {
      try {
        if (!el || el.nodeType !== 1) return '';
        var s = el.tagName.toLowerCase();
        if (el.id && typeof el.id === 'string') s += '#' + el.id;
        var cn = typeof el.className === 'string' ? el.className : '';
        var cls = cn.split(/\s+/).filter(Boolean).slice(0, 3);
        if (cls.length) s += '.' + cls.join('.');
        return s.replace(/[^\w#.\-:]/g, '').slice(0, 100);
      } catch (e) { return ''; }
    }

    // "_r" marks an event that was already requeued once; never serialized.
    function replacer(k, v) { return k === '_r' ? undefined : v; }

    function requeue(batch) {
      var fresh = [];
      for (var i = 0; i < batch.length; i++) {
        if (!batch[i]._r) { batch[i]._r = 1; fresh.push(batch[i]); }
      }
      queue = fresh.concat(queue).slice(-MAX_QUEUE);
    }

    function send(batch) {
      var json = JSON.stringify({ events: batch }, replacer), ok = false;
      try {
        if (navigator.sendBeacon) {
          ok = navigator.sendBeacon(endpoint, new Blob([json], { type: 'text/plain' }));
        }
      } catch (e) { ok = false; }
      if (ok) return;
      try {
        fetch(endpoint, {
          method: 'POST', body: json, keepalive: true,
          headers: { 'Content-Type': 'text/plain' }, mode: 'cors'
        }).then(function (r) {
          if (r.status >= 500) throw new Error('http ' + r.status);
        }).catch(function () { requeue(batch); });
      } catch (e) { requeue(batch); }
    }

    function flush() {
      try {
        if (timer) { clearTimeout(timer); timer = null; }
        while (queue.length) send(queue.splice(0, MAX_BATCH));
      } catch (e) {}
    }

    function enqueue(ev, now) {
      if (debug) { try { console.log('[cf-tracker]', ev); } catch (e) {} }
      queue.push(ev);
      if (queue.length > MAX_QUEUE) queue.splice(0, queue.length - MAX_QUEUE);
      if (now || queue.length >= 10) flush();
      else if (!timer) timer = setTimeout(flush, 2000);
    }

    function pathKey() { return location.pathname + location.search; }

    function pageView(force) {
      try {
        var k = pathKey();
        if (!force && k === lastPath) return;
        lastPath = k;
        enqueue(base('page_view'), true);
      } catch (e) {}
    }

    function schedulePageView() {
      if (pathKey() === lastPath) return;
      setTimeout(function () {
        var go = function () { pageView(false); };
        if (window.requestAnimationFrame) requestAnimationFrame(go); else go();
      }, 0);
    }

    function onClick(e) {
      try {
        if (!e.isTrusted) return;
        if (e.detail === 0 && !e.clientX && !e.clientY) return;
        var x = Math.round(e.pageX), y = Math.round(e.pageY), t = Date.now();
        if (isNaN(x) || isNaN(y)) return;
        if (lastClick && lastClick.x === x && lastClick.y === y && t - lastClick.t < 50) return;
        lastClick = { x: x, y: y, t: t };
        var ev = base('click');
        ev.x = x; ev.y = y; ev.target = describe(e.target);
        enqueue(ev, false);
      } catch (err) {}
    }

    document.addEventListener('click', onClick, true);

    ['pushState', 'replaceState'].forEach(function (fn) {
      try {
        var orig = history[fn];
        if (typeof orig !== 'function') return;
        history[fn] = function () {
          var r = orig.apply(this, arguments);
          try { schedulePageView(); } catch (e) {}
          return r;
        };
      } catch (e) {}
    });
    window.addEventListener('popstate', function () {
      try { schedulePageView(); } catch (e) {}
    });

    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') flush();
    });
    window.addEventListener('pagehide', flush);

    function init() {
      try {
        if (document.prerendering) {
          document.addEventListener('prerenderingchange', function () { pageView(true); }, { once: true });
        } else pageView(true);
      } catch (e) {}
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
  } catch (e) { /* never break host page */ }
})();
