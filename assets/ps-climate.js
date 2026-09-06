(() => {
  const PROFILE_KEY = 'ps-climate-profile-v1';
  const ROUTINE_KEY = 'ps-routine-tracker-v1';
  const LIVE_CACHE_KEY = 'ps-climate-live-v2';
  const LIVE_CACHE_TTL = 30 * 60 * 1000; // 30 mins cache
  const reducedMotion = () => window.PurityTheme?.reducedMotion || matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));

  const CITY_GEO = {
    delhi:     { lat: 28.6139, lon: 77.2090, water: 340, name: 'Delhi', state: 'Delhi' },
    jaipur:    { lat: 26.9124, lon: 75.7873, water: 460, name: 'Jaipur', state: 'Rajasthan' },
    kolkata:   { lat: 22.5726, lon: 88.3639, water: 180, name: 'Kolkata', state: 'West Bengal' },
    mumbai:    { lat: 19.0760, lon: 72.8777, water: 130, name: 'Mumbai', state: 'Maharashtra' },
    hyderabad: { lat: 17.3850, lon: 78.4867, water: 300, name: 'Hyderabad', state: 'Telangana' },
    bengaluru: { lat: 12.9716, lon: 77.5946, water: 250, name: 'Bengaluru', state: 'Karnataka' },
    chennai:   { lat: 13.0827, lon: 80.2707, water: 410, name: 'Chennai', state: 'Tamil Nadu' },
    kochi:     { lat: 9.9312,  lon: 76.2673, water: 95,  name: 'Kochi', state: 'Kerala' }
  };

  const CITY_ORDER = ['delhi', 'jaipur', 'kolkata', 'mumbai', 'hyderabad', 'bengaluru', 'chennai', 'kochi'];

  const SEASON_MOD = {
    live: { uv: 1, hum: 1, pm: 1, water: 1, swing: 1 },
    annual: { uv: 1, hum: 1, pm: 1, water: 1, swing: 1 },
    monsoon: { uv: 0.93, hum: 1.2, pm: 0.82, water: 0.98, swing: 0.72 },
    winter: { uv: 0.9, hum: 0.78, pm: 1.18, water: 1.02, swing: 1.15 }
  };

  function getWeatherDesc(code) {
    if (code === 0) return 'Clear sky';
    if (code === 1 || code === 2) return 'Partly cloudy';
    if (code === 3) return 'Overcast';
    if (code >= 45 && code <= 48) return 'Haze / fog';
    if (code >= 51 && code <= 55) return 'Light drizzle';
    if (code >= 61 && code <= 65) return 'Rain';
    if (code >= 80 && code <= 82) return 'Rain showers';
    if (code >= 95) return 'Thunderstorm';
    return 'Active climate';
  }

  function getLiveAssessment(eff) {
    const hum = eff.hum;
    const pm = eff.pm;
    const uv = eff.uv;
    const water = eff.water;

    let h = '';
    let p = '';

    if (hum >= 78 && pm >= 55) {
      h = `High humidity (${hum}%) + heavy particulate (${pm} µg/m³) — your barrier works overtime.`;
      p = `Ambient moisture spreads excess sebum while airborne particulate clings to damp skin. Prioritise a gentle rinse-off cleanse with BHA and avoid heavy occlusive creams tonight.`;
    } else if (hum >= 75) {
      h = `High ambient moisture (${hum}%) — switch to water-light barrier care.`;
      p = `At ${hum}% humidity, sweat and sebum spread easily across the face. Treat steps absorb quickly, but heavy creams can trap heat and trigger congestion.`;
    } else if (hum <= 42 && pm >= 70) {
      h = `Dry air (${hum}%) + heavy pollution (${pm} µg/m³) — your barrier works overtime.`;
      p = `Low humidity pulls water out faster than you replace it. Particulate crosses the stratum corneum and burns through antioxidant reserves — why SPF and barrier repair matter most here.`;
    } else if (uv >= 8.5) {
      h = `Extreme UV index (${uv} peak) — photoprotection is your #1 anti-aging step.`;
      p = `Intense UVA1 radiation penetrates deep into the dermis, accelerating pigmentation and oxidative damage. Broad-spectrum SPF is non-negotiable today.`;
    } else if (water >= 400) {
      h = `Hard water (${water} ppm) + active climate — double stress with every wash.`;
      p = `High calcium and magnesium levels bind to surfactants, leaving a residue that strips essential lipids. Pair a gentle cleanser with replenishing moisturiser.`;
    } else {
      h = eff.h || `${eff.c}: balanced environmental profile today.`;
      p = eff.p || `Current real-time environmental metrics indicate stable conditions. Maintain a steady four-step cleanse, treat, moisturise, and protect sequence.`;
    }

    return { h, p };
  }

  let liveDataPromise = null;

  function getCachedLiveData() {
    try {
      const raw = localStorage.getItem(LIVE_CACHE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed && parsed.timestamp && (Date.now() - parsed.timestamp < LIVE_CACHE_TTL) && parsed.data) {
        return parsed.data;
      }
    } catch (_e) { /* ignore */ }
    return null;
  }

  function setCachedLiveData(data) {
    try {
      localStorage.setItem(LIVE_CACHE_KEY, JSON.stringify({
        timestamp: Date.now(),
        data
      }));
    } catch (_e) { /* ignore */ }
  }

  async function fetchLiveClimateData() {
    const cached = getCachedLiveData();
    if (cached) return cached;

    if (liveDataPromise) return liveDataPromise;

    liveDataPromise = (async () => {
      try {
        const lats = CITY_ORDER.map((k) => CITY_GEO[k].lat).join(',');
        const lons = CITY_ORDER.map((k) => CITY_GEO[k].lon).join(',');

        const forecastUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}&current=temperature_2m,relative_humidity_2m,weather_code&daily=uv_index_max,temperature_2m_max,temperature_2m_min&timezone=Asia%2FKolkata&forecast_days=1`;
        const aqUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lats}&longitude=${lons}&current=pm10,pm2_5,us_aqi&timezone=Asia%2FKolkata`;

        const [wRes, aqRes] = await Promise.all([
          fetch(forecastUrl),
          fetch(aqUrl)
        ]);

        if (!wRes.ok || !aqRes.ok) throw new Error('API response not ok');

        const [wData, aqData] = await Promise.all([
          wRes.json(),
          aqRes.json()
        ]);

        const wList = Array.isArray(wData) ? wData : [wData];
        const aqList = Array.isArray(aqData) ? aqData : [aqData];

        const result = {};

        CITY_ORDER.forEach((key, idx) => {
          const w = wList[idx] || {};
          const aq = aqList[idx] || {};
          const geo = CITY_GEO[key];

          const curW = w.current || {};
          const dailyW = w.daily || {};
          const curAq = aq.current || {};

          const hum = Math.round(curW.relative_humidity_2m ?? 60);
          const temp = Math.round((curW.temperature_2m ?? 26) * 10) / 10;
          const weatherCode = curW.weather_code ?? 0;
          const weatherDesc = getWeatherDesc(weatherCode);

          const uv = +(dailyW.uv_index_max?.[0] ?? 7.5).toFixed(1);
          const pm = +(curAq.pm2_5 ?? 35).toFixed(1);
          const aqi = Math.round(curAq.us_aqi ?? 60);

          const tMax = dailyW.temperature_2m_max?.[0] ?? (temp + 4);
          const tMin = dailyW.temperature_2m_min?.[0] ?? (temp - 4);
          const swing = Math.round(clamp((tMax - tMin) * 7.5, 25, 95));

          const water = Math.round(geo.water * (hum > 80 ? 0.92 : 1.0));

          result[key] = {
            c: geo.name,
            temp,
            hum,
            weatherCode,
            weatherDesc,
            uv,
            pm,
            aqi,
            swing,
            water,
            updatedAt: Date.now(),
            isLive: true
          };
        });

        setCachedLiveData(result);
        return result;
      } catch (err) {
        console.warn('[PsClimate] Live feed fallback to baseline:', err);
        return null;
      } finally {
        liveDataPromise = null;
      }
    })();

    return liveDataPromise;
  }

  let geoPromise = null;

  async function detectUserCity() {
    if (geoPromise) return geoPromise;

    geoPromise = (async () => {
      try {
        const res = await fetch('https://get.geojs.io/v1/ip/geo.json');
        if (!res.ok) return null;
        const data = await res.json();
        if (!data) return null;

        const city = (data.city || '').toLowerCase();
        const region = (data.region || '').toLowerCase();

        for (const key of CITY_ORDER) {
          if (city.includes(key) || CITY_GEO[key].name.toLowerCase().includes(city)) {
            return CITY_GEO[key].name;
          }
        }

        if (city.includes('gurgaon') || city.includes('gurugram') || city.includes('noida') || city.includes('ghaziabad') || city.includes('faridabad')) return 'Delhi';
        if (city.includes('thane') || city.includes('navi mumbai') || city.includes('pune')) return 'Mumbai';
        if (city.includes('howrah')) return 'Kolkata';
        if (city.includes('secunderabad')) return 'Hyderabad';
        if (city.includes('ernakulam') || region.includes('kerala')) return 'Kochi';
        if (region.includes('tamil nadu')) return 'Chennai';
        if (region.includes('karnataka') || city.includes('mysore') || city.includes('mysuru')) return 'Bengaluru';
        if (region.includes('rajasthan')) return 'Jaipur';

        return null;
      } catch (_e) {
        return null;
      }
    })();

    return geoPromise;
  }

  const DEFAULT_CITIES = [
    { c: 'Delhi', uv: 8.4, hum: 41, pm: 112, water: 340, swing: 88,
      h: 'Dry air + heavy pollution — your barrier works overtime.',
      p: 'Low humidity pulls water out faster than you replace it. Particulate crosses the barrier and burns through your antioxidant reserve — why SPF alone is not enough here.',
      st: [1, 1, 1, 1], concern: 'barrier' },
    { c: 'Jaipur', uv: 9.3, hum: 33, pm: 95, water: 460, swing: 82,
      h: 'The toughest combo on this map.',
      p: 'Very dry, very hard water, high particulate. Every wash can strip further — moisturiser is not optional, and cleanser choice matters more than actives.',
      st: [1, 1, 1, 1], concern: 'barrier' },
    { c: 'Kolkata', uv: 8.2, hum: 76, pm: 88, water: 180, swing: 68,
      h: 'Humid and polluted at once — rare, and rough on pores.',
      p: 'Sweat and particulate sit on skin for hours. Congestion here is often environmental, not just hormonal — which is why your Mumbai friend\'s routine may not translate.',
      st: [1, 1, 0, 1], concern: 'congestion' },
    { c: 'Mumbai', uv: 9.1, hum: 79, pm: 48, water: 130, swing: 55,
      h: 'High humidity thins sebum — monsoon congestion is real.',
      p: 'Above ~75% humidity, oil spreads instead of sitting in pores. Treat + protect still matter; heavy creams often make things worse in monsoon.',
      st: [1, 1, 0, 1], concern: 'congestion' },
    { c: 'Hyderabad', uv: 9.0, hum: 54, pm: 52, water: 300, swing: 62,
      h: 'Nothing extreme — which is why it gets ignored.',
      p: 'Moderate hardness and particulate still degrade the barrier quietly. Consistency beats intensity; don\'t wait for a flare-up to fix the basics.',
      st: [1, 1, 1, 1], concern: 'balance' },
    { c: 'Bengaluru', uv: 9.0, hum: 60, pm: 38, water: 250, swing: 45,
      h: 'Moderate on paper. Volatile in practice.',
      p: 'Dry office AC to humid evenings in one day — your barrier never settles. A stable four-step routine matters more than chasing new actives every month.',
      st: [1, 1, 1, 1], concern: 'balance' },
    { c: 'Chennai', uv: 9.8, hum: 74, pm: 42, water: 410, swing: 48,
      h: 'Hard water + year-round UV — double stress every wash.',
      p: 'Calcium and magnesium bind to surfactants and leave residue that disrupts lipids. Pair a gentle cleanse with daily photoprotection — texture is the long game here.',
      st: [1, 1, 1, 1], concern: 'texture' },
    { c: 'Kochi', uv: 9.2, hum: 83, pm: 24, water: 95, swing: 32,
      h: 'Clean air and soft water — but UV never clocks out.',
      p: 'Environmental factors are on your side except photoprotection. UV stays high nearly year-round; skipping SPF is the fastest way to undo good treat steps.',
      st: [1, 1, 0, 1], concern: 'spf' }
  ];

  const AX = [
    { k: 'uv', n: 'UV index', short: 'UV', u: '', d: 1, w: 0.22, icon: '☀',
      load: (c) => clamp((c.uv - 5) / 7),
      raw: (c) => c.uv,
      bench: 'High above 8 most months',
      impact: 'UVA1 drives pigmentation, post-acne marks, and collagen loss — SPF rating alone does not measure UVA coverage.',
      why: 'UVA1 penetrates deepest and drives pigmentation and collagen loss.',
      steps: ['Protect', 'Treat'] },
    { k: 'pm', n: 'Particulate', short: 'PM₂.₅', u: 'µg/m³', d: 0, w: 0.26, icon: '◎',
      load: (c) => clamp(c.pm / 130),
      raw: (c) => c.pm,
      bench: 'WHO guideline: 15 µg/m³ annual mean',
      impact: 'Fine particles cross the barrier and create oxidative stress independent of sun exposure.',
      why: 'PM2.5 is small enough to cross the stratum corneum.',
      steps: ['Cleanse', 'Treat', 'Protect'] },
    { k: 'water', n: 'Water hardness', short: 'H₂O', u: 'ppm', d: 0, w: 0.22, icon: '◌',
      load: (c) => clamp(c.water / 480),
      raw: (c) => c.water,
      bench: 'Barrier stress rises above ~200 ppm',
      impact: 'Minerals bind to surfactants and leave residue that strips lipids with every wash.',
      why: 'Above ~200 ppm, minerals bind to surfactants and leave residue.',
      steps: ['Cleanse', 'Moisturise'] },
    { k: 'swing', n: 'Seasonal swing', short: 'Swing', u: '', d: 0, w: 0.14, icon: '↕',
      load: (c) => clamp(c.swing / 100),
      raw: (c) => c.swing,
      bench: 'Wide annual humidity/temp range',
      impact: 'Your barrier never settles into one state — consistency matters more than actives.',
      why: 'The wider the annual swing, the less your barrier can stabilise.',
      steps: ['Moisturise', 'Treat'] },
    { k: 'hum', n: 'Humidity stress', short: 'Humidity', u: '%', d: 0, w: 0.16, icon: '≋',
      load: (c) => clamp(Math.abs(c.hum - 57) / 43),
      raw: (c) => c.hum,
      bench: 'Comfort band roughly 40–75%',
      impact: 'Too dry pulls water out; too humid thins and spreads sebum — both clog or strip differently.',
      why: 'Below 40% raises water loss; above 75% thins and spreads sebum.',
      steps: ['Cleanse', 'Moisturise'] }
  ];

  const STEP_NAMES = ['Cleanse', 'Treat', 'Moisturise', 'Protect'];
  const CX = 290;
  const CY = 232;
  const R = 132;
  const N = AX.length;
  AX.forEach((a, i) => { a.ang = -90 + (i * 360) / N; });

  const pt = (a, t) => {
    const r = (a.ang * Math.PI) / 180;
    return [CX + Math.cos(r) * R * t, CY + Math.sin(r) * R * t];
  };

  function spline(pts) {
    let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
    for (let i = 0; i < pts.length; i += 1) {
      const p0 = pts[(i - 1 + pts.length) % pts.length];
      const p1 = pts[i];
      const p2 = pts[(i + 1) % pts.length];
      const p3 = pts[(i + 2) % pts.length];
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
      const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      d += `C${c1[0].toFixed(1)} ${c1[1].toFixed(1)},${c2[0].toFixed(1)} ${c2[1].toFixed(1)},${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
    }
    return `${d}Z`;
  }

  function shapeFor(o) {
    return spline(AX.map((a) => pt(a, Math.max(0.05, o[a.k]))));
  }

  function applySeason(base, season, liveData = null) {
    if (season === 'live' && liveData) {
      const key = (base.c || '').toLowerCase();
      const live = liveData[key];
      if (live) {
        return {
          ...base,
          uv: live.uv,
          hum: live.hum,
          pm: live.pm,
          water: live.water,
          swing: live.swing,
          temp: live.temp,
          weatherCode: live.weatherCode,
          weatherDesc: live.weatherDesc,
          aqi: live.aqi,
          isLive: true
        };
      }
    }
    const mod = SEASON_MOD[season] || SEASON_MOD.annual;
    return {
      ...base,
      uv: +(base.uv * mod.uv).toFixed(1),
      hum: Math.round(clamp(base.hum * mod.hum, 18, 95)),
      pm: Math.round(clamp(base.pm * mod.pm, 8, 180)),
      water: Math.round(base.water * mod.water),
      swing: Math.round(clamp(base.swing * mod.swing, 20, 100)),
      isLive: false
    };
  }

  function prepCities(list, season = 'live', liveData = null) {
    return list.map((c) => {
      const eff = applySeason(c, season, liveData);
      eff.idx = Math.round(AX.reduce((s, a) => s + a.load(eff) * a.w, 0) * 100);
      eff._base = c.c;
      if (eff.isLive) {
        const liveAssessment = getLiveAssessment(eff);
        eff.h = liveAssessment.h;
        eff.p = liveAssessment.p;
      }
      return eff;
    });
  }

  function rankOrd(n) {
    return n + (['st', 'nd', 'rd'][n - 1] || 'th');
  }

  function levelLabel(t) {
    if (t > 0.6) return 'High';
    if (t > 0.35) return 'Moderate';
    return 'Lower';
  }

  function formatVal(a, city) {
    const v = city[a.k];
    if (a.k === 'uv') return `${Number(v).toFixed(1)} peak`;
    if (a.k === 'hum') return `${Math.round(v)}%`;
    if (a.k === 'pm') return `${Math.round(v)} µg/m³`;
    if (a.k === 'water') return `${Math.round(v)} ppm`;
    if (a.k === 'swing') return `${Math.round(v)}/100`;
    return v.toFixed(a.d) + (a.u ? ` ${a.u}` : '');
  }

  function loadProfile() {
    try {
      return JSON.parse(localStorage.getItem(PROFILE_KEY) || 'null');
    } catch (_e) {
      return null;
    }
  }

  function saveProfile(data) {
    localStorage.setItem(PROFILE_KEY, JSON.stringify({ ...data, savedAt: Date.now() }));
    try {
      const routine = JSON.parse(localStorage.getItem(ROUTINE_KEY) || '{}') || {};
      routine.city = data.city;
      routine.season = data.season;
      if (data.concern) routine.concern = data.concern;
      localStorage.setItem(ROUTINE_KEY, JSON.stringify(routine));
    } catch (_e) { /* noop */ }
  }

  window.PsClimate = {
    DEFAULT_CITIES, AX, STEP_NAMES, PROFILE_KEY, ROUTINE_KEY, LIVE_CACHE_KEY,
    applySeason, prepCities, loadProfile, saveProfile, SEASON_MOD,
    fetchLiveClimateData, getCachedLiveData, detectUserCity, getLiveAssessment
  };

  class PsClimateSignature extends HTMLElement {
    connectedCallback() {
      if (this.initialized) return;
      this.initialized = true;

      const catalogNode = this.querySelector('[data-clim-catalog]');
      let raw = [];
      try {
        const parsed = JSON.parse(catalogNode?.textContent || '[]');
        raw = Array.isArray(parsed) && parsed.length ? parsed : DEFAULT_CITIES;
      } catch (_e) {
        raw = DEFAULT_CITIES;
      }
      this.rawCities = raw;
      this.layout = this.dataset.climLayout || 'teaser';
      this.detailBase = this.dataset.climDetailBase || '/pages/climate';
      this.season = 'live';
      this.liveData = getCachedLiveData();
      this.cur = 0;
      this.cmp = -1;
      this.shown = {};
      AX.forEach((a) => { this.shown[a.k] = 0; });
      this.sigOpen = false;

      this.refreshCities();
      this.bindNodes();
      this.buildControls();

      if (this.layout === 'full') {
        this.buildGrid();
        this.buildScale();
        this.bindSeasons();
        this.bindSave();
        this.bindSigToggle();
      }

      const params = new URLSearchParams(window.location.search);
      const urlSeason = params.get('season');
      const profile = loadProfile();

      if (urlSeason && SEASON_MOD[urlSeason]) {
        this.season = urlSeason;
      } else if (this.layout === 'full' && profile?.season && SEASON_MOD[profile.season]) {
        this.season = profile.season;
      } else {
        this.season = 'live';
      }
      this.setSeasonUI(this.season);

      const cityParam = params.get('city');
      const cityName = cityParam || profile?.city;
      if (cityName) {
        const idx = this.C.findIndex((c) => c.c.toLowerCase() === cityName.toLowerCase());
        if (idx > -1) this.cur = idx;
      }

      this.render();

      // Asynchronous non-blocking live data hydration
      fetchLiveClimateData().then((data) => {
        if (data) {
          this.liveData = data;
          this.refreshCities();
          if (this.layout === 'full') this.buildScale();
          this.render();
        }
      });

      // Asynchronous non-blocking IP geolocation if no explicit user city
      if (!cityName) {
        detectUserCity().then((detected) => {
          if (detected) {
            const idx = this.C.findIndex((c) => c.c.toLowerCase() === detected.toLowerCase());
            if (idx > -1 && idx !== this.cur) {
              this.cur = idx;
              this.isAutoDetected = true;
              this.autoDetectedIdx = idx;
              this.render();
            }
          }
        });
      }
    }

    refreshCities() {
      this.C = prepCities(this.rawCities, this.season, this.liveData);
      this.IMIN = Math.min(...this.C.map((c) => c.idx));
      this.IMAX = Math.max(...this.C.map((c) => c.idx));
      this.RANKED = [...this.C].sort((a, b) => b.idx - a.idx);
      this.AVG = {};
      AX.forEach((a) => {
        this.AVG[a.k] = this.C.reduce((s, c) => s + a.load(c), 0) / this.C.length;
      });
      if (this.avgPath) this.avgPath.setAttribute('d', shapeFor(this.AVG));
    }

    bindNodes() {
      this.citiesEl = this.querySelector('[data-clim-cities]');
      this.heroEl = this.querySelector('[data-clim-hero-cards]');
      this.factorsEl = this.querySelector('[data-clim-factor-cards]');
      this.cmpPanel = this.querySelector('[data-clim-compare-panel]');
      this.cmpTitle = this.querySelector('[data-clim-compare-title]');
      this.cmpDeltas = this.querySelector('[data-clim-compare-deltas]');
      this.cmpSelect = this.querySelector('[data-clim-cmp-select]');
      this.scaleTrack = this.querySelector('[data-clim-scale-track]');
      this.sigWrap = this.querySelector('[data-clim-signature]');
      this.sigCard = this.querySelector('[data-clim-sig-card]');
      this.sigToggle = this.querySelector('[data-clim-sig-toggle]');
      this.saveBtn = this.querySelector('[data-clim-save]');
      this.saveLabel = this.querySelector('[data-clim-save-label]');
      this.tip = this.querySelector('[data-clim-tip]');
      this.gridG = this.querySelector('[data-clim-grid]');
      this.labelsG = this.querySelector('[data-clim-labels]');
      this.avgPath = this.querySelector('[data-clim-avg-path]');
      this.cmpPath = this.querySelector('[data-clim-cmp-path]');
      this.myPath = this.querySelector('[data-clim-my-path]');
      this.knotsG = this.querySelector('[data-clim-knots]');
      this.ctyName = this.querySelector('[data-clim-cty-name]');
      this.routineCta = this.querySelector('[data-clim-routine-cta]');
      this.detailLink = this.querySelector('[data-clim-detail-link]');
      this.driverChips = this.querySelector('[data-clim-driver-chips]');
      this.livePill = this.querySelector('[data-clim-live-pill]');
      this.liveText = this.querySelector('[data-clim-live-text]');
      this.liveWeather = this.querySelector('[data-clim-live-weather]');
    }

    bindSeasons() {
      this.querySelectorAll('[data-clim-seasons] [data-season]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const season = btn.dataset.season;
          if (season === this.season) return;
          this.season = season;
          this.setSeasonUI(season);
          this.refreshCities();
          this.buildScale();
          if (this.cmp === this.cur) this.cmp = -1;
          this.render();
        });
      });
    }

    setSeasonUI(season) {
      this.querySelectorAll('[data-clim-seasons] [data-season]').forEach((btn) => {
        const on = btn.dataset.season === season;
        btn.classList.toggle('is-on', on);
        btn.setAttribute('aria-selected', String(on));
      });
    }

    bindSave() {
      this.saveBtn?.addEventListener('click', () => {
        const city = this.C[this.cur];
        saveProfile({ city: city.c, season: this.season, concern: city.concern });
        this.updateSaveUI(true);
      });
    }

    bindSigToggle() {
      this.sigToggle?.addEventListener('click', () => {
        this.sigOpen = !this.sigOpen;
        this.sigWrap.hidden = !this.sigOpen;
        this.sigToggle.setAttribute('aria-pressed', String(this.sigOpen));
        this.sigToggle.textContent = this.sigOpen ? 'Hide signature view' : 'Signature view';
        if (this.sigOpen) this.render();
      });
    }

    buildGrid() {
      if (!this.gridG) return;
      [0.25, 0.5, 0.75, 1].forEach((t) => {
        const p = AX.map((a) => pt(a, t).map((v) => v.toFixed(1)).join(',')).join(' ');
        this.gridG.insertAdjacentHTML('beforeend', `<polygon class="ps-clim__ring" points="${p}"/>`);
      });
      AX.forEach((a) => {
        const [x, y] = pt(a, 1);
        this.gridG.insertAdjacentHTML('beforeend', `<line class="ps-clim__spoke" x1="${CX}" y1="${CY}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}"/>`);
        const [lx, ly] = pt(a, 1.2);
        const cos = Math.cos((a.ang * Math.PI) / 180);
        const anchor = cos > 0.3 ? 'start' : cos < -0.3 ? 'end' : 'middle';
        const above = Math.sin((a.ang * Math.PI) / 180) < -0.3;
        this.labelsG.insertAdjacentHTML('beforeend',
          `<text class="ps-clim__axname" x="${lx.toFixed(0)}" y="${(ly + (above ? -16 : -2)).toFixed(0)}" text-anchor="${anchor}">${a.short}</text>
           <text class="ps-clim__axval" x="${lx.toFixed(0)}" y="${(ly + (above ? 4 : 18)).toFixed(0)}" text-anchor="${anchor}" id="ax-${a.k}-${this.dataset.sectionId}"></text>`);
      });
    }

    buildControls() {
      this.citiesEl.innerHTML = '';
      if (this.cmpSelect) {
        while (this.cmpSelect.options.length > 1) this.cmpSelect.remove(1);
      }
      this.C.forEach((city, i) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `ps-clim__city${i === this.cur ? ' is-active' : ''}`;
        btn.textContent = city.c;
        btn.setAttribute('role', 'tab');
        btn.setAttribute('aria-selected', i === this.cur ? 'true' : 'false');
        btn.addEventListener('click', () => {
          this.cur = i;
          if (this.cmp === i) {
            this.cmp = -1;
            if (this.cmpSelect) this.cmpSelect.value = '';
          }
          this.render();
        });
        this.citiesEl.appendChild(btn);

        if (this.cmpSelect) {
          const opt = document.createElement('option');
          opt.value = String(i);
          opt.textContent = city.c;
          this.cmpSelect.appendChild(opt);
        }
      });

      this.cmpSelect?.addEventListener('change', () => {
        const val = this.cmpSelect.value;
        this.cmp = val === '' ? -1 : Number(val);
        if (this.cmp === this.cur) {
          this.cmp = -1;
          this.cmpSelect.value = '';
        }
        this.render();
      });
    }

    buildScale() {
      if (!this.scaleTrack) return;
      this.scaleTrack.querySelectorAll('.ps-clim__scale-pt').forEach((el) => el.remove());
      this.scaleTrack.querySelectorAll('.ps-clim__scale-nm').forEach((el) => el.remove());
      this.C.forEach((city, i) => {
        const pct = ((city.idx - this.IMIN) / (this.IMAX - this.IMIN || 1)) * 90 + 5;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'ps-clim__scale-pt';
        btn.style.left = `${pct}%`;
        btn.dataset.i = String(i);
        btn.setAttribute('aria-label', `${city.c}, stress score ${city.idx}`);
        btn.addEventListener('click', () => { this.cur = i; this.render(); });
        const label = document.createElement('span');
        label.className = 'ps-clim__scale-nm';
        label.style.left = `${pct}%`;
        label.textContent = `${city.c} · ${city.idx}`;
        this.scaleTrack.appendChild(btn);
        this.scaleTrack.appendChild(label);
      });
    }

    showTip(axis, clientX, clientY) {
      if (!this.tip || !this.sigCard) return;
      const rect = this.sigCard.getBoundingClientRect();
      this.tip.innerHTML = `<b>${axis.n}</b>${axis.why}`;
      const left = Math.min(Math.max(clientX - rect.left, 12), rect.width - 12);
      const top = Math.min(Math.max(clientY - rect.top + 16, 12), rect.height - 12);
      this.tip.style.left = `${left}px`;
      this.tip.style.top = `${top}px`;
      this.tip.style.transform = 'translate(-50%, 0)';
      this.tip.hidden = false;
      this.tip.classList.add('is-on');
    }

    hideTip() {
      if (!this.tip) return;
      this.tip.classList.remove('is-on');
      this.tip.hidden = true;
    }

    morph(target) {
      if (!this.myPath || !this.knotsG) return;
      if (this.raf) cancelAnimationFrame(this.raf);
      const from = { ...this.shown };
      const t0 = performance.now();
      const reduce = reducedMotion();
      const step = (t) => {
        const p = reduce ? 1 : Math.min(1, (t - t0) / 640);
        const e = 1 - (1 - p) ** 3;
        AX.forEach((a) => { this.shown[a.k] = from[a.k] + (target[a.k] - from[a.k]) * e; });
        this.myPath.setAttribute('d', shapeFor(this.shown));
        this.knotsG.innerHTML = AX.map((a) => {
          const [x, y] = pt(a, Math.max(0.05, this.shown[a.k]));
          return `<circle class="ps-clim__knot" data-ax="${a.k}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="5.5"/>`;
        }).join('');
        this.knotsG.querySelectorAll('.ps-clim__knot').forEach((knot) => {
          const axis = AX.find((x) => x.k === knot.dataset.ax);
          knot.addEventListener('pointerenter', (ev) => this.showTip(axis, ev.clientX, ev.clientY));
          knot.addEventListener('pointerleave', () => this.hideTip());
        });
        if (p < 1) this.raf = requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }

    animateNum(el, to, dec, suffix = '') {
      if (!el) return;
      const from = parseFloat(el.dataset.cur || 0);
      const t0 = performance.now();
      const reduce = reducedMotion();
      const tick = (t) => {
        const p = reduce ? 1 : Math.min(1, (t - t0) / 620);
        const e = 1 - (1 - p) ** 3;
        const v = from + (to - from) * e;
        el.textContent = v.toFixed(dec) + suffix;
        if (p < 1) requestAnimationFrame(tick);
        else el.dataset.cur = String(to);
      };
      requestAnimationFrame(tick);
    }

    cardHTML(a, city, loads, opts = {}) {
      const t = loads[a.k];
      const lvl = levelLabel(t);
      const steps = a.steps.map((s) => `<span class="ps-clim__fc-step">${s}</span>`).join('');
      const cmpDelta = opts.cmpCity ? this.deltaLine(a, city, opts.cmpCity) : '';
      return `<article class="ps-clim__fc${opts.hero ? ' ps-clim__fc--hero' : ''}" data-k="${a.k}" data-level="${t > 0.6 ? 'high' : t > 0.35 ? 'mid' : 'low'}">
        <div class="ps-clim__fc-head">
          <span class="ps-clim__fc-icon" aria-hidden="true">${a.icon}</span>
          <div class="ps-clim__fc-title">
            <h3>${a.n}</h3>
            <span class="ps-clim__fc-badge">${lvl}</span>
          </div>
          <span class="ps-clim__fc-val">${formatVal(a, city)}</span>
        </div>
        <div class="ps-clim__fc-bar"><i style="width:${(t * 100).toFixed(1)}%"></i><em style="left:${(this.AVG[a.k] * 100).toFixed(1)}%" title="8-city average"></em></div>
        <p class="ps-clim__fc-impact">${a.impact}</p>
        ${cmpDelta ? `<p class="ps-clim__fc-delta">${cmpDelta}</p>` : ''}
        <div class="ps-clim__fc-steps"><span class="ps-clim__fc-steps-l">Routine responds:</span>${steps}</div>
      </article>`;
    }

    deltaLine(a, cityA, cityB) {
      const va = a.raw(cityA);
      const vb = a.raw(cityB);
      const diff = va - vb;
      if (Math.abs(diff) < (a.d ? 0.05 : 2)) return `About the same as ${cityB.c}`;
      const dir = diff > 0 ? 'higher' : 'lower';
      const mag = Math.abs(diff).toFixed(a.d);
      return `${mag}${a.u ? ` ${a.u}` : ''} ${dir} than ${cityB.c}`;
    }

    updateSaveUI(justSaved = false) {
      const profile = loadProfile();
      const city = this.C[this.cur];
      const match = profile && profile.city === city.c && profile.season === this.season;
      if (this.saveBtn) this.saveBtn.hidden = false;
      if (this.saveLabel) {
        if (justSaved || match) {
          this.saveLabel.textContent = `Saved · ${city.c} (${this.seasonLabel()})`;
          this.saveBtn?.classList.add('is-saved');
        } else {
          this.saveLabel.textContent = 'Save my city profile';
          this.saveBtn?.classList.remove('is-saved');
        }
      }
    }

    seasonLabel(s = this.season) {
      return { live: 'live today', annual: 'year-round', monsoon: 'monsoon', winter: 'winter' }[s] || s;
    }

    render() {
      if (this.layout === 'teaser') {
        this.renderTeaser();
        return;
      }
      this.renderFull();
    }

    renderTeaser() {
      const city = this.C[this.cur];
      const loads = {};
      AX.forEach((a) => { loads[a.k] = a.load(city); });
      const ranked = [...AX].sort((a, b) => loads[b.k] * b.w - loads[a.k] * a.w);

      [...this.citiesEl.children].forEach((btn, i) => {
        const isCur = i === this.cur;
        btn.setAttribute('aria-selected', String(isCur));
        btn.classList.toggle('is-active', isCur);
      });

      this.animateNum(this.querySelector('[data-clim-idx-n]'), city.idx, 0);
      const cityEl = this.querySelector('[data-clim-idx-city]');
      if (cityEl) cityEl.textContent = city.c;

      const rank = this.RANKED.findIndex((x) => x.c === city.c) + 1;
      const rankEl = this.querySelector('[data-clim-idx-rank]');
      if (rankEl) rankEl.textContent = `${rankOrd(rank)} of 8 cities · score ${this.IMIN}–${this.IMAX} nationally`;

      if (this.livePill && this.liveText) {
        if (city.isLive) {
          this.livePill.classList.remove('is-offline');
          this.liveText.textContent = 'Live environmental feed';
        } else {
          this.livePill.classList.add('is-offline');
          this.liveText.textContent = `${this.seasonLabel(this.season)} model`;
        }
      }

      if (this.liveWeather) {
        if (city.isLive) {
          const locBadge = (this.isAutoDetected && this.cur === this.autoDetectedIdx) ? '<span class="ps-clim__live-loc-badge">Near you</span>' : '';
          this.liveWeather.innerHTML = `<strong>${city.c} now:</strong> ${city.temp}°C · ${city.weatherDesc} · ${city.hum}% humidity · PM₂.₅ ${city.pm} µg/m³ (AQI ${city.aqi})${locBadge}`;
        } else {
          this.liveWeather.textContent = `${this.seasonLabel(this.season)} climatological baseline`;
        }
      }

      if (this.driverChips) {
        this.driverChips.innerHTML = ranked.slice(0, 2).map((a) => {
          const t = loads[a.k];
          const lvl = levelLabel(t);
          const level = t > 0.6 ? 'high' : t > 0.35 ? 'mid' : 'low';
          return `<span class="ps-clim__driver-chip" data-level="${level}"><span class="ps-clim__driver-chip-k">${a.short}</span><span class="ps-clim__driver-chip-v">${formatVal(a, city)}</span><span class="ps-clim__driver-chip-l">${lvl}</span></span>`;
        }).join('');
      }

      const vh = this.querySelector('[data-clim-v-h]');
      if (vh) vh.textContent = city.h;

      const pills = this.querySelector('[data-clim-pills]');
      if (pills) {
        pills.innerHTML = city.st.map((on, k) =>
          `<span class="ps-clim__pill${on ? ' is-hot' : ''}">${STEP_NAMES[k]}</span>`).join('');
      }

      if (this.routineCta) {
        const base = this.routineCta.getAttribute('href').split('?')[0];
        const q = new URLSearchParams({ city: city.c, season: this.season });
        if (city.concern) q.set('concern', city.concern);
        this.routineCta.setAttribute('href', `${base}?${q.toString()}`);
      }

      if (this.detailLink) {
        const base = this.detailBase.split('?')[0];
        this.detailLink.setAttribute('href', `${base}?city=${encodeURIComponent(city.c)}&season=${this.season}`);
      }
    }

    renderFull() {
      const city = this.C[this.cur];
      const loads = {};
      AX.forEach((a) => { loads[a.k] = a.load(city); });
      const ranked = [...AX].sort((a, b) => loads[b.k] * b.w - loads[a.k] * a.w);
      const cmpCity = this.cmp > -1 && this.cmp !== this.cur ? this.C[this.cmp] : null;

      [...this.citiesEl.children].forEach((btn, i) => {
        const isCur = i === this.cur;
        btn.setAttribute('aria-selected', String(isCur));
        btn.classList.toggle('is-active', isCur);
      });
      this.scaleTrack?.querySelectorAll('.ps-clim__scale-pt').forEach((pt, i) => {
        pt.classList.toggle('is-on', i === this.cur);
      });

      if (this.cmpSelect) {
        [...this.cmpSelect.options].forEach((opt, i) => {
          if (i === 0) return;
          opt.disabled = Number(opt.value) === this.cur;
        });
        this.cmpSelect.value = cmpCity ? String(this.cmp) : '';
      }

      this.animateNum(this.querySelector('[data-clim-idx-n]'), city.idx, 0);
      const idxCity = this.querySelector('[data-clim-idx-city]');
      if (idxCity) idxCity.textContent = city.c;
      const rank = this.RANKED.findIndex((x) => x.c === city.c) + 1;
      const easier = this.RANKED[this.RANKED.length - 1];
      const harder = this.RANKED[0];
      const rankEl = this.querySelector('[data-clim-idx-rank]');
      if (rankEl) {
        rankEl.textContent = `${rankOrd(rank)} of 8 cities · ${this.seasonLabel()} profile · scores ${this.IMIN}–${this.IMAX} nationally`;
      }

      if (this.livePill && this.liveText) {
        if (city.isLive) {
          this.livePill.classList.remove('is-offline');
          this.liveText.textContent = 'Live environmental feed';
        } else {
          this.livePill.classList.add('is-offline');
          this.liveText.textContent = `${this.seasonLabel(this.season)} model`;
        }
      }

      const fullLiveWeather = this.querySelector('.ps-clim__live-meta--full [data-clim-live-weather]');
      if (fullLiveWeather) {
        if (city.isLive) {
          fullLiveWeather.innerHTML = `<strong>${city.c} real-time sensors:</strong> ${city.temp}°C · ${city.weatherDesc} · ${city.hum}% humidity · PM₂.₅ ${city.pm} µg/m³ (AQI ${city.aqi}) · Peak UV ${city.uv} · Water hardness baseline ${city.water} ppm`;
        } else {
          fullLiveWeather.textContent = `${this.seasonLabel(this.season)} multi-year climatological baseline across five environmental axes`;
        }
      }

      if (this.heroEl) {
        this.heroEl.innerHTML = ranked.slice(0, 2).map((a) =>
          this.cardHTML(a, city, loads, { hero: true, cmpCity })).join('');
      }

      if (this.factorsEl) {
        this.factorsEl.innerHTML = ranked.map((a) =>
          this.cardHTML(a, city, loads, { cmpCity })).join('');
      }

      if (this.cmpPanel && this.cmpTitle && this.cmpDeltas) {
        if (cmpCity) {
          this.cmpPanel.hidden = false;
          this.cmpTitle.textContent = `${city.c} vs ${cmpCity.c} — why routines differ`;
          this.cmpDeltas.innerHTML = ranked.map((a) => {
            const delta = this.deltaLine(a, city, cmpCity);
            return `<li><strong>${a.n}</strong> ${delta}</li>`;
          }).join('');
        } else {
          this.cmpPanel.hidden = true;
        }
      }

      this.querySelector('[data-clim-v-h]').textContent = city.h;
      const vp = this.querySelector('[data-clim-v-p]');
      if (vp) vp.textContent = city.p;
      const pillsEl = this.querySelector('[data-clim-pills]');
      if (pillsEl) {
        pillsEl.innerHTML = city.st.map((on, k) =>
          `<span class="ps-clim__pill${on ? ' is-hot' : ''}">${STEP_NAMES[k]}</span>`).join('');
      }

      if (this.routineCta) {
        const base = this.routineCta.getAttribute('href').split('?')[0];
        const q = new URLSearchParams({ city: city.c, season: this.season });
        if (city.concern) q.set('concern', city.concern);
        this.routineCta.setAttribute('href', `${base}?${q.toString()}`);
      }

      this.updateSaveUI();

      if (this.sigOpen) {
        this.morph(loads);
        if (this.ctyName) this.ctyName.textContent = city.c;
        AX.forEach((a) => {
          const el = this.querySelector(`#ax-${a.k}-${this.dataset.sectionId}`);
          if (el) this.animateNum(el, city[a.k], a.d, a.u ? ` ${a.u}` : '');
        });
        const keyCity = this.querySelector('[data-clim-key-city]');
        if (keyCity) keyCity.textContent = city.c;
        const cmpWrap = this.querySelector('[data-clim-key-cmp-wrap]');
        if (cmpCity) {
          const l2 = {};
          AX.forEach((a) => { l2[a.k] = a.load(cmpCity); });
          this.cmpPath?.setAttribute('d', shapeFor(l2));
          if (this.cmpPath) this.cmpPath.hidden = false;
          if (cmpWrap) cmpWrap.hidden = false;
          const cmpName = this.querySelector('[data-clim-key-cmp]');
          if (cmpName) cmpName.textContent = cmpCity.c;
        } else {
          if (this.cmpPath) this.cmpPath.hidden = true;
          if (cmpWrap) cmpWrap.hidden = true;
        }
      }
    }
  }

  const ROUTINE_PRODUCTS = [
    { step: 'Cleanse', handle: 'refreshing-cleanser-acne-prone-skin', title: 'Refreshing Cleanser', why: 'Clears congestion without stripping — especially important with hard water cities.' },
    { step: 'Treat', handle: '5-niacinamide-serum-acne-prone-skin', title: '5% Niacinamide Serum', why: 'Oil, pores, and post-acne tone in one treat step.' },
    { step: 'Moisturise', handle: 'calming-moisturiser-acne-prone-skin', title: 'Calming Moisturiser', why: 'Barrier support when humidity or dryness swings daily.' },
    { step: 'Protect', handle: 'protecting-sunscreen-acne-prone-skin', title: 'Protecting Sunscreen SPF 50', why: 'Daily photoprotection — non-negotiable in Indian UV.' }
  ];

  class PsRoutineTracker extends HTMLElement {
    connectedCallback() {
      if (this.initialized) return;
      this.initialized = true;

      this.cities = prepCities(DEFAULT_CITIES, this.state.season || 'annual', getCachedLiveData());
      this.steps = STEP_NAMES;
      this.storageKey = ROUTINE_KEY;

      this.panelCity = this.querySelector('[data-routine-city-panel]');
      this.panelConcern = this.querySelector('[data-routine-concern-panel]');
      this.panelPlan = this.querySelector('[data-routine-plan-panel]');
      this.panelTrack = this.querySelector('[data-routine-track-panel]');
      this.progress = this.querySelector('[data-routine-progress]');
      this.cityName = this.querySelector('[data-routine-city-name]');
      this.verdict = this.querySelector('[data-routine-verdict]');
      this.profileEl = this.querySelector('[data-routine-profile]');
      this.productsEl = this.querySelector('[data-routine-products]');
      this.trackGrid = this.querySelector('[data-routine-track-grid]');
      this.streakEl = this.querySelector('[data-routine-streak]');
      this.weekEl = this.querySelector('[data-routine-week]');

      const params = new URLSearchParams(window.location.search);
      this.state = this.loadState();

      const climateProfile = loadProfile();
      if (params.get('city')) {
        const match = this.cities.find((c) => c.c.toLowerCase() === params.get('city').toLowerCase());
        if (match) this.state.city = match.c;
      } else if (climateProfile?.city) {
        this.state.city = climateProfile.city;
      }
      if (params.get('season') && SEASON_MOD[params.get('season')]) {
        this.state.season = params.get('season');
      } else if (climateProfile?.season) {
        this.state.season = climateProfile.season;
      } else {
        this.state.season = this.state.season || 'annual';
      }
      if (params.get('concern')) {
        this.state.concern = params.get('concern');
      } else if (climateProfile?.concern) {
        this.state.concern = climateProfile.concern;
      }

      this.refreshSeasonalCities();
      this.buildCityPicker();
      this.buildConcernPicker();
      this.buildTrackGrid();

      this.querySelector('[data-routine-next-city]')?.addEventListener('click', () => this.goTo(1));
      this.querySelector('[data-routine-next-concern]')?.addEventListener('click', () => this.goTo(2));
      this.querySelector('[data-routine-start-track]')?.addEventListener('click', () => this.goTo(3));

      this.goTo(this.state.step || 0);
      this.render();
    }

    refreshSeasonalCities() {
      this.cities = prepCities(DEFAULT_CITIES, this.state.season || 'annual', getCachedLiveData());
    }

    loadState() {
      try {
        return JSON.parse(localStorage.getItem(this.storageKey) || '{}') || {};
      } catch (_e) {
        return {};
      }
    }

    saveState() {
      localStorage.setItem(this.storageKey, JSON.stringify(this.state));
      saveProfile({
        city: this.state.city,
        season: this.state.season || 'annual',
        concern: this.state.concern
      });
    }

    buildCityPicker() {
      const wrap = this.querySelector('[data-routine-cities]');
      wrap.innerHTML = '';
      this.cities.forEach((city) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'ps-rout__chip';
        btn.textContent = city.c;
        btn.addEventListener('click', () => {
          this.state.city = city.c;
          if (!this.state.concern) this.state.concern = city.concern;
          this.saveState();
          this.render();
        });
        wrap.appendChild(btn);
      });
    }

    buildConcernPicker() {
      const concerns = [
        { id: 'congestion', label: 'Breakouts & oil', hint: 'Humid-city congestion' },
        { id: 'barrier', label: 'Dryness & barrier', hint: 'Dry air + hard water' },
        { id: 'texture', label: 'Texture & marks', hint: 'UV + turnover' },
        { id: 'balance', label: 'Keep it simple', hint: 'Stable four-step base' },
        { id: 'spf', label: 'Sun & marks', hint: 'UV-first cities' }
      ];
      const wrap = this.querySelector('[data-routine-concerns]');
      concerns.forEach((item) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'ps-rout__chip';
        btn.dataset.concern = item.id;
        btn.innerHTML = `<strong>${item.label}</strong><span>${item.hint}</span>`;
        btn.addEventListener('click', () => {
          this.state.concern = item.id;
          this.saveState();
          this.render();
        });
        wrap.appendChild(btn);
      });
    }

    buildTrackGrid() {
      this.trackGrid.innerHTML = this.steps.map((step) =>
        `<label class="ps-rout__check"><input type="checkbox" data-routine-step="${step}"><span>${step}</span></label>`).join('');
      this.trackGrid.querySelectorAll('input').forEach((input) => {
        input.addEventListener('change', () => this.toggleToday(input.dataset.routineStep, input.checked));
      });
    }

    todayKey() {
      return new Date().toISOString().slice(0, 10);
    }

    toggleToday(step, on) {
      const key = this.todayKey();
      if (!this.state.log) this.state.log = {};
      if (!this.state.log[key]) this.state.log[key] = {};
      this.state.log[key][step] = on;
      this.saveState();
      this.renderStreak();
    }

    goTo(step) {
      this.state.step = step;
      this.saveState();
      [this.panelCity, this.panelConcern, this.panelPlan, this.panelTrack].forEach((panel, i) => {
        panel.hidden = i !== step;
      });
      if (this.progress) {
        this.progress.style.setProperty('--ps-rout-progress', `${((step + 1) / 4) * 100}%`);
      }
      this.querySelectorAll('[data-routine-nav]').forEach((btn) => {
        btn.hidden = Number(btn.dataset.routineNav) !== step;
      });
    }

    activeCity() {
      return this.cities.find((c) => c.c === this.state.city) || this.cities[0];
    }

    seasonLabel(s) {
      return { annual: 'year-round', monsoon: 'monsoon', winter: 'winter' }[s] || s;
    }

    render() {
      const city = this.activeCity();
      this.state.city = city.c;

      this.querySelectorAll('[data-routine-cities] .ps-rout__chip').forEach((btn) => {
        btn.classList.toggle('is-on', btn.textContent === city.c);
      });
      this.querySelectorAll('[data-routine-concerns] .ps-rout__chip').forEach((btn) => {
        btn.classList.toggle('is-on', btn.dataset.concern === (this.state.concern || city.concern || 'balance'));
      });

      if (this.cityName) this.cityName.textContent = city.c;
      if (this.verdict) this.verdict.textContent = city.p;
      if (this.profileEl) {
        this.profileEl.textContent = `${city.c} · ${this.seasonLabel(this.state.season || 'annual')} · stress ${city.idx}/100`;
      }

      const shopRoot = window.Shopify?.routes?.root || '/';
      this.productsEl.innerHTML = ROUTINE_PRODUCTS.map((product, i) => {
        const active = city.st[i];
        return `<article class="ps-rout__product${active ? '' : ' is-soft'}">
          <span class="ps-rout__step">${product.step}</span>
          <h3>${product.title}</h3>
          <p>${product.why}</p>
          ${active ? `<a class="ps-rout__link" href="${shopRoot}products/${product.handle}">View product →</a>` : '<span class="ps-rout__skip">Optional for your city profile</span>'}
        </article>`;
      }).join('');

      const today = this.state.log?.[this.todayKey()] || {};
      this.trackGrid.querySelectorAll('input').forEach((input) => {
        input.checked = Boolean(today[input.dataset.routineStep]);
      });
      this.renderStreak();
    }

    renderStreak() {
      const log = this.state.log || {};
      let streak = 0;
      const d = new Date();
      for (let i = 0; i < 365; i += 1) {
        const key = d.toISOString().slice(0, 10);
        const day = log[key];
        const done = day && this.steps.every((s) => day[s]);
        if (done) streak += 1;
        else if (i > 0) break;
        d.setDate(d.getDate() - 1);
      }
      if (this.streakEl) this.streakEl.textContent = String(streak);

      const last7 = [];
      const now = new Date();
      for (let i = 6; i >= 0; i -= 1) {
        const day = new Date(now);
        day.setDate(day.getDate() - i);
        const key = day.toISOString().slice(0, 10);
        const entry = log[key] || {};
        const count = this.steps.filter((s) => entry[s]).length;
        last7.push({ label: day.toLocaleDateString('en-IN', { weekday: 'short' }), count });
      }
      if (this.weekEl) {
        this.weekEl.innerHTML = last7.map((item) =>
          `<span class="ps-rout__day" data-fill="${item.count}"><i>${item.label}</i><b>${item.count}/4</b></span>`).join('');
      }
    }
  }

  if (!customElements.get('ps-climate-signature')) customElements.define('ps-climate-signature', PsClimateSignature);
  if (!customElements.get('ps-routine-tracker')) customElements.define('ps-routine-tracker', PsRoutineTracker);
})();
