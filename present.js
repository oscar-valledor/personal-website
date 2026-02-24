const WMO = {
  0:  'Clear Sky',
  1:  'Mainly Clear',
  2:  'Partly Cloudy',
  3:  'Overcast',
  45: 'Fog',
  48: 'Icy Fog',
  51: 'Light Drizzle',
  53: 'Drizzle',
  55: 'Heavy Drizzle',
  56: 'Freezing Drizzle',
  57: 'Heavy Freezing Drizzle',
  61: 'Light Rain',
  63: 'Rain',
  65: 'Heavy Rain',
  66: 'Freezing Rain',
  67: 'Heavy Freezing Rain',
  71: 'Light Snow',
  73: 'Snow',
  75: 'Heavy Snow',
  77: 'Snow Grains',
  80: 'Light Showers',
  81: 'Showers',
  82: 'Heavy Showers',
  85: 'Snow Showers',
  86: 'Heavy Snow Showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm with Hail',
  99: 'Thunderstorm with Heavy Hail',
};

function startClock() {
  const el = document.getElementById('present-time');
  function tick() {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    el.textContent = `${hh}:${mm}:${ss}`;
  }
  tick();
  setInterval(tick, 1000);
}

function getLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      (err) => reject(err),
      { timeout: 10000, maximumAge: 300000 }
    );
  });
}

async function reverseGeocode(lat, lon) {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
    { headers: { 'Accept-Language': 'en' } }
  );
  if (!res.ok) throw new Error(`Nominatim ${res.status}`);
  const data = await res.json();
  const a = data.address ?? {};
  return a.city ?? a.town ?? a.village ?? a.county ?? a.state ?? 'Unknown';
}

async function getWeather(lat, lon) {
  const res = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,uv_index,weather_code&timezone=auto`
  );
  if (!res.ok) throw new Error(`Open-Meteo ${res.status}`);
  const data = await res.json();
  const c = data.current;
  return {
    temp: Math.round(c.temperature_2m),
    uv: Math.round(c.uv_index * 10) / 10,
    description: WMO[c.weather_code] ?? 'Unknown',
  };
}

async function initPresent() {
  const elCity    = document.getElementById('present-city');
  const elCoords  = document.getElementById('present-coords');
  const elWeather = document.getElementById('present-weather');
  const container = document.getElementById('present');

  startClock();

  let lat, lon;
  try {
    ({ lat, lon } = await getLocation());
  } catch (err) {
    const msg = { 1: 'Location access denied.', 2: 'Location unavailable.', 3: 'Location timed out.' };
    elCity.textContent = msg[err.code] ?? 'Location unavailable.';
    container.classList.add('is-ready');
    return;
  }

  const latStr = `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? 'N' : 'S'}`;
  const lonStr = `${Math.abs(lon).toFixed(4)}° ${lon >= 0 ? 'E' : 'W'}`;
  elCoords.textContent = `${latStr}, ${lonStr}`;

  const [city, weather] = await Promise.allSettled([
    reverseGeocode(lat, lon),
    getWeather(lat, lon),
  ]);

  elCity.textContent = city.status === 'fulfilled' ? city.value : 'Unknown Location';

  if (weather.status === 'fulfilled') {
    const { temp, uv, description } = weather.value;
    elWeather.textContent = `${temp}°C  ·  UV ${uv}  ·  ${description}`;
  }

  container.classList.add('is-ready');

  setInterval(async () => {
    try {
      const w = await getWeather(lat, lon);
      elWeather.textContent = `${w.temp}°C  ·  UV ${w.uv}  ·  ${w.description}`;
    } catch {}
  }, 600_000);
}

if (window.fetch && window.Promise) {
  initPresent();
}
