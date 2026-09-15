const page = document.querySelector('.page');

// — Page fade-in —
setTimeout(function() { page.classList.add('is-ready'); }, 100);

// — View system —
const viewTitleEl = document.querySelector('.view-title');
viewTitleEl.addEventListener('click', function(e) {
  e.preventDefault();
  closeView();
});
const viewTitleMap = {
  books: 'Books', projects: 'Work', essays: 'Essays', now: 'Now',
  contact: 'Contact', about: 'About', music: 'Music', links: 'Links',
  thoughts: 'Thoughts', colophon: 'Colophon', shortcuts: 'Shortcuts',
  moon: 'Moon', konami: '✦'
};

let pendingView = null;
let lastFocus = null;

function openView(name) {
  if (!Object.prototype.hasOwnProperty.call(viewTitleMap, name)) return;
  if (page.dataset.view === name) { closeView(); return; }
  // Pressing the same trigger again while its data is still loading
  // cancels the pending open — preserves the toggle behaviour.
  if (pendingView === name) { pendingView = null; return; }
  pendingView = name;
  loadView(name).then(function() {
    if (pendingView !== name) return;
    pendingView = null;
    showView(name);
  }).catch(function() {
    if (pendingView !== name) return;
    pendingView = null;
    const list = document.querySelector('#' + name + '-view .view-list');
    if (list) {
      list.innerHTML = '';
      const p = document.createElement('p');
      p.className = 'view-meta';
      p.textContent = 'Couldn’t load. Try again later.';
      list.appendChild(p);
    }
    showView(name);
  });
}

function showView(name) {
  staggerView(name);
  viewTitleEl.textContent = viewTitleMap[name];
  // Force reflow so dynamically-created items settle at opacity:0
  // before the transition to opacity:1 triggers via data-view
  void document.body.offsetHeight;
  lastFocus = document.activeElement;
  page.dataset.view = name;
  const overlay = document.getElementById(name + '-view');
  if (overlay) overlay.focus();
}

function staggerView(name) {
  const overlay = document.getElementById(name + '-view');
  if (!overlay) return;
  const list = overlay.querySelector('.view-list');
  if (!list) return;
  const items = list.children;
  for (let i = 0; i < items.length; i++) {
    items[i].style.transitionDelay = (i * 50) + 'ms';
  }
}

function closeView() {
  pendingView = null;
  const viewName = page.dataset.view;
  if (viewName) {
    const overlay = document.getElementById(viewName + '-view');
    if (overlay) {
      const items = overlay.querySelector('.view-list').children;
      for (let i = 0; i < items.length; i++) {
        items[i].style.transitionDelay = '';
      }
    }
  }
  delete page.dataset.view;
  viewTitleEl.textContent = '';
  if (lastFocus && document.contains(lastFocus)) lastFocus.focus();
  lastFocus = null;
}

document.querySelectorAll('[data-view]').forEach(el => {
  if (el.tagName === 'A') {
    el.addEventListener('click', function(e) {
      e.preventDefault();
      openView(this.dataset.view);
    });
  }
});

document.querySelectorAll('.view-close').forEach(el => {
  el.addEventListener('click', function(e) {
    e.preventDefault();
    closeView();
  });
});

// — Tab title clock —
let titleTimer = null;
document.addEventListener('visibilitychange', function() {
  if (document.hidden) {
    function tickTitle() {
      const now = new Date();
      document.title = [
        String(now.getHours()).padStart(2, '0'),
        String(now.getMinutes()).padStart(2, '0'),
        String(now.getSeconds()).padStart(2, '0'),
      ].join(':');
    }
    tickTitle();
    titleTimer = setInterval(tickTitle, 1000);
  } else {
    clearInterval(titleTimer);
    document.title = 'Oscar Valledor';
  }
});

// — Hello easter egg —
function triggerHello() {
  if (document.querySelector('.hello-flash')) return;
  const el = document.createElement('div');
  el.className = 'hello-flash';
  el.textContent = 'hola.';
  document.body.appendChild(el);
  requestAnimationFrame(function() { el.classList.add('is-visible'); });
  setTimeout(function() {
    el.classList.remove('is-visible');
    setTimeout(function() { el.remove(); }, 600);
  }, 2500);
}

// — Konami code —
const konamiSeq = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
let konamiPos = 0;

// — Keyboard shortcuts —
let typedBuffer = '';
document.addEventListener('keydown', function(e) {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

  // Konami (works regardless of open view)
  if (e.key === konamiSeq[konamiPos]) {
    konamiPos++;
    if (konamiPos === konamiSeq.length) {
      konamiPos = 0;
      openView('konami');
      return;
    }
  } else {
    konamiPos = e.key === konamiSeq[0] ? 1 : 0;
  }

  if (e.key === 'Escape') { closeView(); return; }
  if (e.key === '?') {
    page.dataset.view === 'shortcuts' ? closeView() : openView('shortcuts');
    return;
  }
  if (page.dataset.view) return;

  // Hello detection
  if (e.key.length === 1) {
    typedBuffer = (typedBuffer + e.key).slice(-10);
    if (typedBuffer.toLowerCase().includes('hola')) {
      typedBuffer = '';
      triggerHello();
      return;
    }
  }

  const shortcuts = {
    '1': 'now', '2': 'projects', '3': 'about',
    '4': 'essays', '5': 'thoughts', '6': 'books',
    '7': 'music', '8': 'links',
    c: 'contact', m: 'moon'
  };
  const view = shortcuts[e.key.toLowerCase()];
  if (view) openView(view);
});

// — Books —
let booksData = null;

async function loadBooks() {
  if (booksData) return booksData;
  const res = await fetch('books.json');
  booksData = await res.json();
  return booksData;
}

function renderBooks(data) {
  const list = document.querySelector('#books-view .view-list');
  list.innerHTML = '';

  const sections = [
    { label: 'Currently reading', items: data.currentlyReading },
    { label: 'Read', items: data.read },
  ];

  for (const section of sections) {
    if (!section.items.length) continue;
    if (section.label) {
      const label = document.createElement('p');
      label.className = 'view-label';
      label.textContent = section.label;
      list.appendChild(label);
    }
    for (const book of section.items) {
      const p = document.createElement('p');
      const a = document.createElement('a');
      a.href = book.url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.textContent = `${book.title} — ${book.author}`;
      p.appendChild(a);
      list.appendChild(p);
    }
  }

  const count = data.read.length;
  document.getElementById('books-count').textContent = count;
}

// — Projects —
let projectsData = null;

async function loadProjects() {
  if (projectsData) return projectsData;
  const res = await fetch('projects.json');
  projectsData = await res.json();
  return projectsData;
}

function renderProjects(data) {
  const list = document.querySelector('#projects-view .view-list');
  list.innerHTML = '';
  for (const project of data.projects.filter(p => !p.hidden)) {
    const p = document.createElement('p');

    if (project.url) {
      const a = document.createElement('a');
      a.href = project.url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.textContent = project.title;
      p.appendChild(a);
    } else {
      p.appendChild(document.createTextNode(project.title));
    }

    if (project.status) {
      const span = document.createElement('span');
      span.className = 'view-meta';
      span.textContent = ` — ${project.status}`;
      p.appendChild(span);
    }

    if (project.description) {
      p.appendChild(document.createElement('br'));
      const desc = document.createElement('span');
      desc.className = 'view-meta';
      desc.textContent = project.description;
      p.appendChild(desc);
    }

    list.appendChild(p);
  }
}

// — Writing —
let essaysData = null;

async function loadEssays() {
  if (essaysData) return essaysData;
  const res = await fetch('essays.json');
  essaysData = await res.json();
  return essaysData;
}

function renderEssays(data) {
  const list = document.querySelector('#essays-view .view-list');
  list.innerHTML = '';
  if (!data.posts.length) {
    const p = document.createElement('p');
    p.className = 'view-meta';
    p.textContent = 'Nothing published yet.';
    list.appendChild(p);
    return;
  }
  for (const post of data.posts) {
    const p = document.createElement('p');
    if (post.slug) {
      const a = document.createElement('a');
      a.href = `essays/${post.slug}.html`;
      a.textContent = post.title;
      p.appendChild(a);
    } else {
      p.appendChild(document.createTextNode(post.title));
    }
    const metaParts = [];
    if (post.author) metaParts.push(post.author);
    if (post.date) metaParts.push(post.date);
    if (metaParts.length) {
      const meta = document.createElement('span');
      meta.className = 'view-meta';
      meta.textContent = ` — ${metaParts.join(', ')}`;
      p.appendChild(meta);
    }
    list.appendChild(p);
  }
}

// — Blog —
let blogData = null;

async function loadBlog() {
  if (blogData) return blogData;
  const res = await fetch('blog.json');
  blogData = await res.json();
  return blogData;
}

function renderBlog(data) {
  const list = document.querySelector('#blog-view .view-list');
  list.innerHTML = '';
  if (!data.posts.length) {
    const p = document.createElement('p');
    p.className = 'view-meta';
    p.textContent = 'Nothing published yet.';
    list.appendChild(p);
    return;
  }
  for (const post of data.posts) {
    const p = document.createElement('p');
    if (post.slug) {
      const a = document.createElement('a');
      a.href = `blog/${post.slug}.html`;
      a.textContent = post.title;
      p.appendChild(a);
    } else {
      p.appendChild(document.createTextNode(post.title));
    }
    const metaParts = [];
    if (post.date) metaParts.push(post.date);
    if (post.readingTime) metaParts.push(post.readingTime);
    if (metaParts.length) {
      const meta = document.createElement('span');
      meta.className = 'view-meta';
      meta.textContent = ` — ${metaParts.join(', ')}`;
      p.appendChild(meta);
    }
    list.appendChild(p);
  }
}

// — Music —
let musicData = null;

async function loadMusic() {
  if (musicData) return musicData;
  const res = await fetch('music.json');
  musicData = await res.json();
  return musicData;
}

function renderMusic(data) {
  const list = document.querySelector('#music-view .view-list');
  list.innerHTML = '';

  const sections = [
    { label: 'Playlists', items: data.playlists, format: p => p.title },
    { label: 'Albums', items: data.albums, format: a => `${a.title} — ${a.artist}` },
  ];

  for (const section of sections) {
    if (!section.items.length) continue;
    const label = document.createElement('p');
    label.className = 'view-label';
    label.textContent = section.label;
    list.appendChild(label);
    for (const item of section.items) {
      const p = document.createElement('p');
      const a = document.createElement('a');
      a.href = item.url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.textContent = section.format(item);
      p.appendChild(a);
      list.appendChild(p);
    }
  }
}

// — Thoughts —
let thoughtsData = null;

async function loadThoughts() {
  if (thoughtsData) return thoughtsData;
  const res = await fetch('thoughts.json');
  thoughtsData = await res.json();
  return thoughtsData;
}

function renderThoughts(data) {
  const list = document.querySelector('#thoughts-view .view-list');
  list.innerHTML = '';
  const sorted = data.thoughts.slice().sort((a, b) => b.date.localeCompare(a.date));
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0) {
      const sep = document.createElement('hr');
      sep.className = 'thought-separator';
      list.appendChild(sep);
    }
    const row = document.createElement('div');
    row.className = 'thought-row';
    const num = document.createElement('span');
    num.className = 'thought-number';
    num.textContent = String(i + 1).padStart(2, '0');
    const p = document.createElement('p');
    p.textContent = sorted[i].text;
    row.appendChild(num);
    row.appendChild(p);
    list.appendChild(row);
  }
}

// — Now —
(function () {
  const d = new Date(document.getElementById('now-view').dataset.updated);
  const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  document.getElementById('now-updated').textContent = `Last updated ${label}`;
})();

// — Moon —
function renderMoon() {
  const knownNewMoon = new Date('2000-01-06T18:14:00Z');
  const lunarCycle = 29.53059;
  const elapsed = (Date.now() - knownNewMoon.getTime()) / 86400000;
  const dayInCycle = ((elapsed % lunarCycle) + lunarCycle) % lunarCycle;
  const phase = dayInCycle / lunarCycle;

  let phaseName;
  if (phase < 0.0625 || phase >= 0.9375) phaseName = 'New Moon';
  else if (phase < 0.1875) phaseName = 'Waxing Crescent';
  else if (phase < 0.3125) phaseName = 'First Quarter';
  else if (phase < 0.4375) phaseName = 'Waxing Gibbous';
  else if (phase < 0.5625) phaseName = 'Full Moon';
  else if (phase < 0.6875) phaseName = 'Waning Gibbous';
  else if (phase < 0.8125) phaseName = 'Last Quarter';
  else phaseName = 'Waning Crescent';

  const daysToFull = dayInCycle < 14.77 ? 14.77 - dayInCycle : lunarCycle - dayInCycle + 14.77;
  const daysToNew = lunarCycle - dayInCycle;

  document.getElementById('moon-phase').textContent = phaseName;
  document.getElementById('moon-detail').textContent =
    `Day ${Math.floor(dayInCycle) + 1} of 30 · Full moon in ${Math.ceil(daysToFull)} day${Math.ceil(daysToFull) === 1 ? '' : 's'} · New moon in ${Math.ceil(daysToNew)} day${Math.ceil(daysToNew) === 1 ? '' : 's'}`;
}

// — Auto-open view from URL param (e.g. ?view=essays) —
(function() {
  const v = (new URLSearchParams(window.location.search).get('view') || '').toLowerCase();
  if (v) openView(v);
})();

async function loadView(name) {
  if (name === 'books') renderBooks(await loadBooks());
  else if (name === 'projects') renderProjects(await loadProjects());
  else if (name === 'essays') renderEssays(await loadEssays());
  else if (name === 'blog') renderBlog(await loadBlog());
  else if (name === 'moon') renderMoon();
  else if (name === 'music') renderMusic(await loadMusic());
  else if (name === 'thoughts') renderThoughts(await loadThoughts());
}

// — Email obfuscation —
// Halves are stored reversed so the address never appears as a
// literal (or regex-matchable) string anywhere in the page source.
(function() {
  var a = 'rodellavo'.split('').reverse().join('');
  var b = 'moc.liamg'.split('').reverse().join('');
  var el = document.getElementById('email-link');
  var addr = a + '@' + b;
  el.href = 'mailto:' + addr;
  el.textContent = addr;
})();
