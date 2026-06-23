const STORAGE_KEY = 'field-notes-album-v1';

const els = {
  navTitle: document.getElementById('navTitle'),
  navCount: document.getElementById('navCount'),
  createAlbumBtn: document.getElementById('createAlbumBtn'),
  viewRoot: document.getElementById('viewRoot'),
  albumDialog: document.getElementById('albumDialog'),
  memoryDialog: document.getElementById('memoryDialog'),
  albumForm: document.getElementById('albumForm'),
  memoryForm: document.getElementById('memoryForm'),
  backToAlbumsBtn: document.getElementById('backToAlbumsBtn'),
  addMemoryBtn: document.getElementById('addMemoryBtn'),
  albumNameInput: document.getElementById('albumNameInput'),
  albumDescriptionInput: document.getElementById('albumDescriptionInput'),
  memoryTitleInput: document.getElementById('memoryTitleInput'),
  memoryCaptionInput: document.getElementById('memoryCaptionInput'),
  memoryImageInput: document.getElementById('memoryImageInput'),
  memoryCardTemplate: document.getElementById('memoryCardTemplate')
};

const appState = {
  albums: [],
  activeAlbumId: null,
  view: 'albums',
  mode: 'local'
};

const createId = () => {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const formatDate = (value) => {
  const date = new Date(value);
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(date);
};

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function loadLocalState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { albums: [] };
    const parsed = JSON.parse(raw);
    return {
      albums: Array.isArray(parsed.albums) ? parsed.albums : []
    };
  } catch {
    return { albums: [] };
  }
}

function saveLocalState() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      albums: appState.albums
    })
  );
}

async function apiFetch(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || 'Request failed');
  }

  return response.json();
}

async function detectMode() {
  try {
    const payload = await apiFetch('/api/albums');
    appState.mode = payload.mode === 'remote' ? 'remote' : 'local';
    return payload;
  } catch {
    appState.mode = 'local';
    return null;
  }
}

function getActiveAlbum() {
  return appState.albums.find((album) => album.id === appState.activeAlbumId) || null;
}

function getAlbumCover(album) {
  return album.memories?.[0]?.imageData || '';
}

async function hydrate() {
  const remote = await detectMode();

  if (remote && Array.isArray(remote.albums)) {
    appState.albums = remote.albums.map((album) => ({
      ...album,
      memories: Array.isArray(album.memories) ? album.memories : []
    }));
  } else {
    const local = loadLocalState();
    appState.albums = local.albums.map((album) => ({
      ...album,
      memories: Array.isArray(album.memories) ? album.memories : []
    }));
  }

  appState.activeAlbumId = appState.albums[0]?.id || null;
  appState.view = appState.activeAlbumId ? 'album' : 'albums';
  render();
}

async function syncAlbums() {
  if (appState.mode !== 'remote') {
    saveLocalState();
    render();
    return;
  }

  const payload = await apiFetch('/api/albums');
  appState.albums = payload.albums;

  if (!appState.albums.some((album) => album.id === appState.activeAlbumId)) {
    appState.activeAlbumId = appState.albums[0]?.id || null;
  }

  if (!appState.activeAlbumId) {
    appState.view = 'albums';
  }

  render();
}

function openAlbum(albumId) {
  appState.activeAlbumId = albumId;
  appState.view = 'album';
  render();
}

function showAlbumList() {
  appState.view = 'albums';
  render();
}

function renderNav() {
  els.navTitle.textContent = 'Albums';
  els.navCount.textContent = `${appState.albums.length} album${appState.albums.length === 1 ? '' : 's'}`;
}

function renderAlbumCards() {
  const grid = document.createElement('section');
  grid.className = 'album-grid';

  if (!appState.albums.length) {
    const empty = document.createElement('article');
    empty.className = 'empty-state';
    empty.innerHTML = `
      <p class="section-kicker">Start here</p>
      <h1>No albums yet</h1>
      <p>Create your first album to begin adding memory cards.</p>
      <button id="emptyCreateAlbumBtn" class="primary-btn" type="button">Create new album</button>
    `;
    grid.append(empty);
    return grid;
  }

  appState.albums.forEach((album) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'album-card';
    card.innerHTML = `
      <div class="album-card-cover ${getAlbumCover(album) ? 'has-cover' : ''}">
        ${getAlbumCover(album) ? `<img alt="" src="${escapeHtml(getAlbumCover(album))}" />` : '<span>Album</span>'}
      </div>
      <div class="album-card-copy">
        <div class="album-card-top">
          <h2>${escapeHtml(album.title)}</h2>
          <span class="album-card-count">${album.memories.length} card${album.memories.length === 1 ? '' : 's'}</span>
        </div>
        <p>${escapeHtml(album.description || 'A quiet place for memories.')}</p>
      </div>
    `;
    card.addEventListener('click', () => openAlbum(album.id));
    grid.append(card);
  });

  return grid;
}

function renderMemoryGrid(album) {
  const grid = document.createElement('section');
  grid.className = 'memory-grid';

  if (!album || !album.memories.length) {
    const empty = document.createElement('article');
    empty.className = 'memory-empty';
    empty.innerHTML = `
      <h3>This album is empty</h3>
      <p>Add a memory card to start filling it with photos and notes.</p>
    `;
    grid.append(empty);
    return grid;
  }

  album.memories.forEach((memory) => {
    const fragment = els.memoryCardTemplate.content.cloneNode(true);
    const card = fragment.querySelector('.memory-card');
    const photo = fragment.querySelector('.memory-photo');
    const title = fragment.querySelector('.memory-title');
    const caption = fragment.querySelector('.memory-caption');
    const stamp = fragment.querySelector('.memory-stamp');

    photo.src = memory.imageData;
    title.textContent = memory.title;
    caption.textContent = memory.caption || 'A small note to remember this day.';
    stamp.textContent = formatDate(memory.createdAt);

    card.dataset.memoryId = memory.id;
    grid.append(fragment);
  });

  return grid;
}

function renderAlbumView(album) {
  const container = document.createElement('section');
  container.className = 'album-detail';
  container.innerHTML = `
    <div class="album-detail-header">
      <div>
        <p class="section-kicker">Album</p>
        <h1>${escapeHtml(album.title)}</h1>
        <p>${escapeHtml(album.description || 'A quiet place for memories.')}</p>
      </div>
      <div class="album-detail-actions">
        <button id="backToAlbumsBtn" class="secondary-btn" type="button">Back to albums</button>
        <button id="addMemoryBtn" class="primary-btn" type="button">Add memory card</button>
      </div>
    </div>
    <div class="album-meta-row">
      <span>${album.memories.length} card${album.memories.length === 1 ? '' : 's'}</span>
      <span>Stored ${appState.mode === 'remote' ? 'in Neon' : 'locally in your browser'}</span>
    </div>
  `;

  container.append(renderMemoryGrid(album));
  return container;
}

function render() {
  renderNav();

  els.viewRoot.innerHTML = '';

  if (appState.view === 'album') {
    const album = getActiveAlbum();
    if (!album) {
      appState.view = 'albums';
      els.viewRoot.append(renderAlbumCards());
      return;
    }

    els.viewRoot.append(renderAlbumView(album));
    bindViewButtons();
    return;
  }

  els.viewRoot.append(renderAlbumCards());
  bindViewButtons();
}

function bindViewButtons() {
  document.getElementById('backToAlbumsBtn')?.addEventListener('click', showAlbumList);
  document.getElementById('addMemoryBtn')?.addEventListener('click', () => {
    if (!getActiveAlbum()) return;
    els.memoryForm.reset();
    els.memoryDialog.showModal();
  });
  document.getElementById('emptyCreateAlbumBtn')?.addEventListener('click', openCreateAlbumDialog);
}

function openCreateAlbumDialog() {
  els.albumForm.reset();
  els.albumDialog.showModal();
}

async function createAlbum({ title, description }) {
  if (appState.mode === 'remote') {
    const payload = await apiFetch('/api/albums', {
      method: 'POST',
      body: JSON.stringify({ title, description })
    });
    appState.activeAlbumId = payload.album.id;
    appState.view = 'album';
    await syncAlbums();
    return;
  }

  const album = {
    id: createId(),
    title,
    description,
    createdAt: new Date().toISOString(),
    memories: []
  };

  appState.albums.unshift(album);
  appState.activeAlbumId = album.id;
  appState.view = 'album';
  saveLocalState();
  render();
}

async function createMemory({ title, caption, imageData }) {
  const album = getActiveAlbum();
  if (!album) return;

  if (appState.mode === 'remote') {
    await apiFetch('/api/memories', {
      method: 'POST',
      body: JSON.stringify({
        albumId: album.id,
        title,
        caption,
        imageData
      })
    });
    await syncAlbums();
    return;
  }

  album.memories.unshift({
    id: createId(),
    title,
    caption,
    imageData,
    createdAt: new Date().toISOString()
  });

  saveLocalState();
  render();
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Could not read the selected image.'));
    reader.readAsDataURL(file);
  });
}

async function compressImage(file) {
  const source = await readFileAsDataURL(file);
  const image = new Image();

  const loaded = new Promise((resolve, reject) => {
    image.onload = resolve;
    image.onerror = () => reject(new Error('Could not process this image.'));
  });

  image.src = source;
  await loaded;

  const maxWidth = 1600;
  const scale = Math.min(1, maxWidth / image.width);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));

  const context = canvas.getContext('2d');
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.86);
}

els.createAlbumBtn.addEventListener('click', openCreateAlbumDialog);

els.albumForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const title = els.albumNameInput.value.trim();
  const description = els.albumDescriptionInput.value.trim();

  if (!title) return;

  try {
    await createAlbum({ title, description });
    els.albumDialog.close();
  } catch (error) {
    window.alert(error.message);
  }
});

els.memoryForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const file = els.memoryImageInput.files?.[0];
  const title = els.memoryTitleInput.value.trim();
  const caption = els.memoryCaptionInput.value.trim();

  if (!file || !title) return;

  try {
    const imageData = await compressImage(file);
    await createMemory({ title, caption, imageData });
    els.memoryDialog.close();
  } catch (error) {
    window.alert(error.message);
  }
});

hydrate();
