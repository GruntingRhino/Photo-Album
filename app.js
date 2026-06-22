const STORAGE_KEY = 'field-notes-album-v1';

const els = {
  albumTabs: document.getElementById('albumTabs'),
  albumCount: document.getElementById('albumCount'),
  albumTitle: document.getElementById('albumTitle'),
  albumDescription: document.getElementById('albumDescription'),
  memoryCount: document.getElementById('memoryCount'),
  memoryGrid: document.getElementById('memoryGrid'),
  newAlbumBtn: document.getElementById('newAlbumBtn'),
  seedDemoBtn: document.getElementById('seedDemoBtn'),
  renameAlbumBtn: document.getElementById('renameAlbumBtn'),
  addMemoryBtn: document.getElementById('addMemoryBtn'),
  albumDialog: document.getElementById('albumDialog'),
  memoryDialog: document.getElementById('memoryDialog'),
  albumForm: document.getElementById('albumForm'),
  memoryForm: document.getElementById('memoryForm'),
  cancelAlbumBtn: document.getElementById('cancelAlbumBtn'),
  cancelMemoryBtn: document.getElementById('cancelMemoryBtn'),
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

function loadLocalState() {
  const fallback = {
    albums: []
  };

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return {
      albums: Array.isArray(parsed.albums) ? parsed.albums : []
    };
  } catch {
    return fallback;
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

async function hydrate() {
  const remote = await detectMode();

  if (remote && Array.isArray(remote.albums)) {
    appState.albums = remote.albums.map((album) => ({
      ...album,
      memories: Array.isArray(album.memories) ? album.memories : []
    }));
  } else {
    const local = loadLocalState();
    appState.albums = local.albums;
  }

  appState.activeAlbumId = appState.albums[0]?.id || null;
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

  render();
}

function getActiveAlbum() {
  return appState.albums.find((album) => album.id === appState.activeAlbumId) || null;
}

function renderAlbumTabs() {
  els.albumTabs.innerHTML = '';
  els.albumCount.textContent = `${appState.albums.length} album${appState.albums.length === 1 ? '' : 's'}`;

  if (!appState.albums.length) {
    const empty = document.createElement('div');
    empty.className = 'album-tab';
    empty.innerHTML = `
      <div class="album-tab-title">No albums yet</div>
      <div class="album-tab-caption">Create your first shelf of memories.</div>
      <div class="album-tab-meta">Stored ${appState.mode === 'remote' ? 'in Neon' : 'in your browser'}</div>
    `;
    els.albumTabs.append(empty);
    return;
  }

  appState.albums.forEach((album) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `album-tab ${album.id === appState.activeAlbumId ? 'active' : ''}`;
    button.innerHTML = `
      <span class="album-tab-title">${escapeHtml(album.title)}</span>
      <span class="album-tab-caption">${escapeHtml(album.description || 'A little place for quiet moments.')}</span>
      <span class="album-tab-meta">${album.memories.length} card${album.memories.length === 1 ? '' : 's'}</span>
    `;
    button.addEventListener('click', () => {
      appState.activeAlbumId = album.id;
      render();
    });
    els.albumTabs.append(button);
  });
}

function renderMemoryGrid(album) {
  els.memoryGrid.innerHTML = '';

  if (!album || !album.memories.length) {
    const empty = document.createElement('article');
    empty.className = 'memory-card empty-card';
    empty.innerHTML = `
      <div>
        <h3>Waiting for your next memory.</h3>
        <p>Add a photo card to this page and it will stay tucked into your album.</p>
      </div>
    `;
    els.memoryGrid.append(empty);
    return;
  }

  album.memories.forEach((memory) => {
    const fragment = els.memoryCardTemplate.content.cloneNode(true);
    const card = fragment.querySelector('.memory-card');
    const photo = fragment.querySelector('.memory-photo');
    const title = fragment.querySelector('.memory-title');
    const caption = fragment.querySelector('.memory-caption');
    const stamp = fragment.querySelector('.memory-stamp');
    const deleteButton = fragment.querySelector('.delete-memory-btn');

    photo.src = memory.imageData;
    title.textContent = memory.title;
    caption.textContent = memory.caption || 'A soft little note to remember the day.';
    stamp.textContent = formatDate(memory.createdAt);

    deleteButton.addEventListener('click', async () => {
      if (appState.mode === 'remote') {
        await apiFetch(`/api/memories?id=${encodeURIComponent(memory.id)}`, {
          method: 'DELETE'
        });
        await syncAlbums();
      } else {
        const activeAlbum = getActiveAlbum();
        activeAlbum.memories = activeAlbum.memories.filter((item) => item.id !== memory.id);
        saveLocalState();
        render();
      }
    });

    card.dataset.memoryId = memory.id;
    els.memoryGrid.append(fragment);
  });
}

function render() {
  renderAlbumTabs();

  const album = getActiveAlbum();
  els.albumTitle.textContent = album?.title || 'Create your first album';
  els.albumDescription.textContent = album?.description || 'Start with a new album, then attach photos to memory cards on the page.';
  els.memoryCount.textContent = `${album?.memories.length || 0} card${album?.memories.length === 1 ? '' : 's'}`;

  els.renameAlbumBtn.disabled = !album;
  els.addMemoryBtn.disabled = !album;

  renderMemoryGrid(album);
}

async function createAlbum({ title, description }) {
  if (appState.mode === 'remote') {
    const payload = await apiFetch('/api/albums', {
      method: 'POST',
      body: JSON.stringify({ title, description })
    });
    appState.activeAlbumId = payload.album.id;
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
  saveLocalState();
  render();
}

async function renameAlbum() {
  const album = getActiveAlbum();
  if (!album) return;

  const nextTitle = window.prompt('Album title', album.title)?.trim();
  if (!nextTitle) return;

  const nextDescription = window.prompt('Album description', album.description || '')?.trim() ?? album.description;

  if (appState.mode === 'remote') {
    await apiFetch(`/api/albums?id=${encodeURIComponent(album.id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ title: nextTitle, description: nextDescription })
    });
    await syncAlbums();
    return;
  }

  album.title = nextTitle;
  album.description = nextDescription;
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

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
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

function seedDemoAlbum() {
  if (appState.albums.length) {
    appState.activeAlbumId = appState.albums[0].id;
    render();
    return;
  }

  const demoAlbum = {
    title: 'Garden Morning',
    description: 'Linen sleeves, rosemary air, and soft light through the window.'
  };

  createAlbum(demoAlbum);
}

els.newAlbumBtn.addEventListener('click', () => {
  els.albumForm.reset();
  els.albumDialog.showModal();
});

els.seedDemoBtn.addEventListener('click', seedDemoAlbum);
els.renameAlbumBtn.addEventListener('click', renameAlbum);
els.addMemoryBtn.addEventListener('click', () => {
  if (!getActiveAlbum()) return;
  els.memoryForm.reset();
  els.memoryDialog.showModal();
});
els.cancelAlbumBtn.addEventListener('click', () => els.albumDialog.close());
els.cancelMemoryBtn.addEventListener('click', () => els.memoryDialog.close());

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
