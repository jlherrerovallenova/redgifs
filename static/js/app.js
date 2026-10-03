/**
 * RedGIFs Downloader Pro - Client Application
 */

const state = {
  currentVideo: null,
  downloads: []
};

// DOM Elements
const navTabs = document.querySelectorAll('.nav-tab');
const tabContents = document.querySelectorAll('.tab-content');

// Single Download Elements
const singleUrlInput = document.getElementById('singleUrlInput');
const pasteBtn = document.getElementById('pasteBtn');
const clearBtn = document.getElementById('clearBtn');
const analyzeBtn = document.getElementById('analyzeBtn');

const previewContainer = document.getElementById('previewContainer');
const previewVideo = document.getElementById('previewVideo');
const previewUser = document.getElementById('previewUser');
const previewDuration = document.getElementById('previewDuration');
const previewTitle = document.getElementById('previewTitle');
const previewViews = document.getElementById('previewViews');
const previewLikes = document.getElementById('previewLikes');
const previewTags = document.getElementById('previewTags');
const downloadHdBtn = document.getElementById('downloadHdBtn');
const downloadSdBtn = document.getElementById('downloadSdBtn');
const singleDlStatus = document.getElementById('singleDlStatus');
const singleDlStatusText = document.getElementById('singleDlStatusText');

// Batch Download Elements
const batchTextarea = document.getElementById('batchTextarea');
const batchQualitySelect = document.getElementById('batchQualitySelect');
const clearBatchBtn = document.getElementById('clearBatchBtn');
const startBatchBtn = document.getElementById('startBatchBtn');
const batchProgressBox = document.getElementById('batchProgressBox');
const batchProgressLabel = document.getElementById('batchProgressLabel');
const batchProgressCount = document.getElementById('batchProgressCount');
const batchProgressBar = document.getElementById('batchProgressBar');
const batchLog = document.getElementById('batchLog');

// Search Elements
const redgifsSearchInput = document.getElementById('redgifsSearchInput');
const redgifsSearchBtn = document.getElementById('redgifsSearchBtn');
const searchGrid = document.getElementById('searchGrid');

// Library Elements
const libraryGrid = document.getElementById('libraryGrid');
const libraryPathDesc = document.getElementById('libraryPathDesc');
const openFolderBtn = document.getElementById('openFolderBtn');
const refreshLibraryBtn = document.getElementById('refreshLibraryBtn');
const downloadsCountPill = document.getElementById('downloadsCountPill');

// Lightbox Elements
const videoLightbox = document.getElementById('videoLightbox');
const lightboxVideo = document.getElementById('lightboxVideo');
const lightboxTitle = document.getElementById('lightboxTitle');
const lightboxCloseBtn = document.getElementById('lightboxCloseBtn');

const toastContainer = document.getElementById('toastContainer');

// Init
document.addEventListener('DOMContentLoaded', () => {
  setupTabs();
  setupSingleDownload();
  setupBatchDownload();
  setupSearch();
  setupLibrary();
  setupLightbox();
  loadLibrary();
});

// Toast
function showToast(msg, duration = 3000) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = msg;
  toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 250);
  }, duration);
}

// Tabs
function setupTabs() {
  navTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      navTabs.forEach(t => t.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));

      tab.classList.add('active');
      const targetId = `tab-${tab.dataset.tab}`;
      const target = document.getElementById(targetId);
      if (target) target.classList.add('active');

      if (tab.dataset.tab === 'library') {
        loadLibrary();
      }
    });
  });
}

// Single Download
function setupSingleDownload() {
  pasteBtn.addEventListener('click', async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        singleUrlInput.value = text.trim();
        showToast('Enlace pegado');
        analyzeUrl();
      }
    } catch (e) {
      showToast('Escribe o pega el enlace en el campo');
    }
  });

  clearBtn.addEventListener('click', () => {
    singleUrlInput.value = '';
    previewContainer.style.display = 'none';
    previewVideo.pause();
    previewVideo.src = '';
    state.currentVideo = null;
    singleUrlInput.focus();
  });

  analyzeBtn.addEventListener('click', analyzeUrl);
  singleUrlInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') analyzeUrl();
  });

  downloadHdBtn.addEventListener('click', () => downloadCurrent('hd'));
  downloadSdBtn.addEventListener('click', () => downloadCurrent('sd'));
}

async function analyzeUrl() {
  const url = singleUrlInput.value.trim();
  if (!url) {
    showToast('Introduce una URL o ID de RedGIFs');
    return;
  }

  analyzeBtn.disabled = true;
  analyzeBtn.innerHTML = '<span>Consultando...</span>';

  try {
    const res = await fetch(`/api/info?url=${encodeURIComponent(url)}`);
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Video no encontrado');
    }

    const data = await res.json();
    state.currentVideo = data;
    renderPreview(data);
    showToast('¡Video encontrado!');
  } catch (err) {
    showToast(`Error: ${err.message}`);
    previewContainer.style.display = 'none';
  } finally {
    analyzeBtn.disabled = false;
    analyzeBtn.innerHTML = '<span>Analizar</span><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>';
  }
}

function renderPreview(video) {
  previewTitle.textContent = video.title || `Video ${video.id}`;
  previewUser.textContent = `@${video.userName || 'anónimo'}`;
  previewDuration.textContent = `${video.duration}s`;
  previewViews.textContent = `👁️ ${Number(video.views).toLocaleString()} vistas`;
  previewLikes.textContent = `❤️ ${Number(video.likes).toLocaleString()} likes`;

  if (video.tags && video.tags.length > 0) {
    previewTags.innerHTML = video.tags.map(t => `<span class="tag-item">#${escapeHtml(t)}</span>`).join('');
  } else {
    previewTags.innerHTML = '';
  }

  // Load video preview stream
  previewVideo.src = video.hd_url || video.sd_url;
  previewVideo.play().catch(() => {});

  previewContainer.style.display = 'block';
  previewContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

async function downloadCurrent(quality) {
  if (!state.currentVideo) return;

  singleDlStatus.style.display = 'flex';
  singleDlStatusText.textContent = `Descargando video en calidad ${quality.toUpperCase()}...`;
  downloadHdBtn.disabled = true;
  downloadSdBtn.disabled = true;

  try {
    const res = await fetch('/api/download', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: state.currentVideo.watch_url || state.currentVideo.id,
        quality: quality
      })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Fallo en la descarga');
    }

    const data = await res.json();
    singleDlStatusText.textContent = `✅ Guardado: ${data.filename} (${data.filesize_mb} MB)`;
    showToast(`¡Descargado!: ${data.filename}`);

    // Trigger direct browser download as well
    const a = document.createElement('a');
    a.href = `/downloads/${data.filename}`;
    a.download = data.filename;
    document.body.appendChild(a);
    a.click();
    a.remove();

    loadLibrary();
  } catch (err) {
    singleDlStatusText.textContent = `❌ Error: ${err.message}`;
    showToast(`Error al descargar: ${err.message}`);
  } finally {
    downloadHdBtn.disabled = false;
    downloadSdBtn.disabled = false;
  }
}

// Batch Download
function setupBatchDownload() {
  clearBatchBtn.addEventListener('click', () => {
    batchTextarea.value = '';
    batchProgressBox.style.display = 'none';
  });

  startBatchBtn.addEventListener('click', async () => {
    const lines = batchTextarea.value.split('\n').map(l => l.strip ? l.strip() : l.trim()).filter(Boolean);
    if (lines.length === 0) {
      showToast('Pega al menos un enlace para descargar');
      return;
    }

    const quality = batchQualitySelect.value;
    batchProgressBox.style.display = 'block';
    batchProgressBar.style.width = '0%';
    batchLog.innerHTML = '';
    startBatchBtn.disabled = true;

    let completed = 0;
    const total = lines.length;

    for (let i = 0; i < total; i++) {
      const url = lines[i];
      batchProgressLabel.textContent = `Descargando video ${i + 1} de ${total}...`;
      batchProgressCount.textContent = `${completed} / ${total}`;

      try {
        const res = await fetch('/api/download', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: url, quality: quality })
        });
        const data = await res.json();
        if (res.ok) {
          completed++;
          addBatchLog(url, `OK - ${data.filename} (${data.filesize_mb} MB)`, true);
        } else {
          addBatchLog(url, `Error: ${data.detail || 'Fallo'}`, false);
        }
      } catch (err) {
        addBatchLog(url, `Error de conexión: ${err.message}`, false);
      }

      const percent = Math.round(((i + 1) / total) * 100);
      batchProgressBar.style.width = `${percent}%`;
    }

    batchProgressLabel.textContent = `¡Proceso por lotes finalizado!`;
    batchProgressCount.textContent = `${completed} / ${total} descargados`;
    startBatchBtn.disabled = false;
    showToast(`Descarga por lotes completa: ${completed} de ${total}`);
    loadLibrary();
  });
}

function addBatchLog(url, text, success) {
  const item = document.createElement('div');
  item.className = `log-item ${success ? 'log-success' : 'log-fail'}`;
  item.innerHTML = `<span>${escapeHtml(url.substring(0, 35))}...</span> <span>${escapeHtml(text)}</span>`;
  batchLog.appendChild(item);
  batchLog.scrollTop = batchLog.scrollHeight;
}

// Search
function setupSearch() {
  redgifsSearchBtn.addEventListener('click', performSearch);
  redgifsSearchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') performSearch();
  });
}

async function performSearch() {
  const query = redgifsSearchInput.value.trim();
  if (!query) return;

  searchGrid.innerHTML = '<p style="grid-column: 1 / -1; text-align: center; color: var(--text-muted); padding: 2rem;">Buscando videos en RedGIFs...</p>';

  try {
    const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&count=24`);
    const data = await res.json();
    renderSearchGrid(data.results || []);
  } catch (err) {
    searchGrid.innerHTML = '<p style="grid-column: 1 / -1; text-align: center; color: var(--accent-red); padding: 2rem;">Error al buscar en RedGIFs.</p>';
  }
}

function renderSearchGrid(results) {
  if (results.length === 0) {
    searchGrid.innerHTML = '<p style="grid-column: 1 / -1; text-align: center; color: var(--text-dim); padding: 2rem;">No se encontraron videos para este término.</p>';
    return;
  }

  searchGrid.innerHTML = results.map(item => `
    <div class="grid-card">
      <div class="card-thumb-wrap" onclick="openLightbox('${escapeHtml(item.hd_url || item.sd_url)}', '${escapeHtml(item.title)}')">
        <img src="${escapeHtml(item.thumbnail_url)}" alt="${escapeHtml(item.title)}" loading="lazy">
        <span class="card-duration">${item.duration}s</span>
        <div class="card-play-overlay">
          <div class="play-circle">▶</div>
        </div>
      </div>
      <div class="card-body">
        <h4 class="card-title" title="${escapeHtml(item.title)}">${escapeHtml(item.title)}</h4>
        <span class="card-user">@${escapeHtml(item.userName)}</span>
        <div class="card-actions">
          <button class="btn-card-dl" onclick="quickDownload('${escapeHtml(item.watch_url)}')">⚡ Descargar HD</button>
        </div>
      </div>
    </div>
  `).join('');
}

window.quickDownload = async function(url) {
  showToast('Iniciando descarga HD...');
  try {
    const res = await fetch('/api/download', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: url, quality: 'hd' })
    });
    const data = await res.json();
    if (res.ok) {
      showToast(`✅ Descargado: ${data.filename}`);
      loadLibrary();
    } else {
      showToast(`Error: ${data.detail}`);
    }
  } catch (e) {
    showToast('Error al descargar');
  }
};

// Library
function setupLibrary() {
  openFolderBtn.addEventListener('click', async () => {
    try {
      const res = await fetch('/api/open-folder', { method: 'POST' });
      if (res.ok) showToast('Carpeta abierta en Windows Explorer 📂');
    } catch (e) {
      showToast('No se pudo abrir la carpeta');
    }
  });

  refreshLibraryBtn.addEventListener('click', loadLibrary);
}

async function loadLibrary() {
  try {
    const res = await fetch('/api/downloads');
    const data = await res.json();
    state.downloads = data.files || [];
    downloadsCountPill.textContent = state.downloads.length;
    if (data.download_dir) {
      libraryPathDesc.textContent = `Carpeta: ${data.download_dir}`;
    }
    renderLibraryGrid(state.downloads);
  } catch (err) {
    console.error(err);
  }
}

function renderLibraryGrid(files) {
  if (files.length === 0) {
    libraryGrid.innerHTML = '<p style="grid-column: 1 / -1; text-align: center; color: var(--text-dim); padding: 3rem;">Aún no hay videos descargados. Pega un enlace arriba para descargar.</p>';
    return;
  }

  libraryGrid.innerHTML = files.map(file => `
    <div class="lib-card">
      <div class="lib-card-name" title="${escapeHtml(file.filename)}">${escapeHtml(file.filename)}</div>
      <div class="lib-card-size">💾 ${file.size_mb} MB</div>
      <div class="lib-card-actions">
        <button class="btn-play-lib" onclick="openLightbox('${escapeHtml(file.url)}', '${escapeHtml(file.filename)}')">▶ Reproducir</button>
        <button class="btn-del-lib" onclick="deleteFile('${escapeHtml(file.filename)}')">🗑️</button>
      </div>
    </div>
  `).join('');
}

window.deleteFile = async function(filename) {
  if (!confirm(`¿Eliminar ${filename}?`)) return;
  try {
    const res = await fetch(`/api/downloads/${encodeURIComponent(filename)}`, { method: 'DELETE' });
    if (res.ok) {
      showToast('Archivo eliminado');
      loadLibrary();
    }
  } catch (e) {
    showToast('Error al eliminar');
  }
};

// Lightbox Modal
function setupLightbox() {
  lightboxCloseBtn.addEventListener('click', closeLightbox);
  videoLightbox.addEventListener('click', (e) => {
    if (e.target === videoLightbox) closeLightbox();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && videoLightbox.style.display !== 'none') {
      closeLightbox();
    }
  });
}

window.openLightbox = function(videoUrl, title) {
  lightboxTitle.textContent = title || 'Reproduciendo Video';
  lightboxVideo.src = videoUrl;
  videoLightbox.style.display = 'flex';
  lightboxVideo.play().catch(() => {});
};

function closeLightbox() {
  videoLightbox.style.display = 'none';
  lightboxVideo.pause();
  lightboxVideo.src = '';
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
