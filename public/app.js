// Global App State
const state = {
    activeView: 'home', // home, movies, series, animes, search
    catalogType: 'movies', // movies, series, animes
    catalogPage: 1,
    catalogGenre: '',
    catalogYear: '',
    catalogSort: 'recent',
    searchQuery: '',
    filters: null,
    activeProfile: null,
    profilesList: [],
    currentMedia: null, // active details media
    currentEpisodeId: null, // if series
    activeVideoId: null
};

// DOM Elements
const el = {
    navLinks: document.querySelectorAll('.nav-links .nav-item'),
    activeProfileBtn: document.getElementById('activeProfileBtn'),
    activeProfileAvatar: document.getElementById('activeProfileAvatar'),
    activeProfileName: document.getElementById('activeProfileName'),
    profileDropdown: document.getElementById('profileDropdown'),
    dropdownProfilesList: document.getElementById('dropdownProfilesList'),
    
    searchInput: document.getElementById('searchInput'),
    viewPane: document.getElementById('viewPane'),
    
    // Views
    homeView: document.getElementById('homeView'),
    catalogView: document.getElementById('catalogView'),
    searchView: document.getElementById('searchView'),
    
    // Grids & loaders
    feedGrid: document.getElementById('feedGrid'),
    feedLoader: document.getElementById('feedLoader'),
    catalogGrid: document.getElementById('catalogGrid'),
    catalogLoader: document.getElementById('catalogLoader'),
    searchGrid: document.getElementById('searchGrid'),
    searchLoader: document.getElementById('searchLoader'),
    noResultsText: document.getElementById('noResultsText'),
    searchQueryWord: document.getElementById('searchQueryWord'),
    
    // Hero
    heroBanner: document.getElementById('heroBanner'),
    heroTitle: document.getElementById('heroTitle'),
    heroDesc: document.getElementById('heroDesc'),
    heroYear: document.getElementById('heroYear'),
    heroRating: document.getElementById('heroRating'),
    heroPlayBtn: document.getElementById('heroPlayBtn'),
    heroInfoBtn: document.getElementById('heroInfoBtn'),
    
    // Catalog headers & filters
    catalogTitleText: document.getElementById('catalogTitleText'),
    genreSelect: document.getElementById('genreSelect'),
    yearSelect: document.getElementById('yearSelect'),
    sortSelect: document.getElementById('sortSelect'),
    prevPageBtn: document.getElementById('prevPageBtn'),
    nextPageBtn: document.getElementById('nextPageBtn'),
    pageIndicator: document.getElementById('pageIndicator'),
    
    // Details Modal
    detailsModal: document.getElementById('detailsModal'),
    closeModalBtn: document.getElementById('closeModalBtn'),
    modalBanner: document.getElementById('modalBanner'),
    modalTypeBadge: document.getElementById('modalTypeBadge'),
    modalTitle: document.getElementById('modalTitle'),
    modalRating: document.getElementById('modalRating'),
    modalYear: document.getElementById('modalYear'),
    modalDuration: document.getElementById('modalDuration'),
    modalAgeRating: document.getElementById('modalAgeRating'),
    modalSynopsis: document.getElementById('modalSynopsis'),
    modalGenres: document.getElementById('modalGenres'),
    
    // Seasons/episodes / channels
    seasonsSection: document.getElementById('seasonsSection'),
    seasonSelectBox: document.getElementById('seasonSelectBox'),
    episodesList: document.getElementById('episodesList'),
    channelsSection: document.getElementById('channelsSection'),
    channelsTitleText: document.getElementById('channelsTitleText'),
    channelsGrid: document.getElementById('channelsGrid'),
    
    // Video Player Modal
    videoPlayerModal: document.getElementById('videoPlayerModal'),
    closePlayerBtn: document.getElementById('closePlayerBtn'),
    mainVideoPlayer: document.getElementById('mainVideoPlayer'),
    playerContentTitle: document.getElementById('playerContentTitle'),
    playerLoader: document.getElementById('playerLoader')
};

// Initialize Application
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Refresh Lucide Icons
    lucide.createIcons();
    
    // 2. Fetch API status & profile list
    await loadAppStatus();
    
    // 3. Register Event Listeners
    registerEvents();
    
    // 4. Load Homepage (Feed)
    await loadFeed();
    
    // 5. Pre-load filters in background
    loadFilters();
});

// Load backend status & profiles
async function loadAppStatus() {
    try {
        const res = await fetch('/api/status');
        const data = await res.json();
        
        if (data.ready) {
            state.profilesList = data.profilesList;
            
            // Default active profile
            if (data.profilesList && data.profilesList.length > 0) {
                // Look for current cached session profile or default to first
                const savedProfileId = localStorage.getItem('selected_profile_id');
                let profile = data.profilesList[0];
                
                if (savedProfileId) {
                    const found = data.profilesList.find(p => p.id === parseInt(savedProfileId));
                    if (found) profile = found;
                }
                
                setActiveProfile(profile);
            }
        } else {
            console.error('Proxy Backend is still authenticating...');
        }
    } catch (e) {
        console.error('Error fetching proxy status:', e);
    }
}

// Set active profile and update UI
function setActiveProfile(profile) {
    state.activeProfile = profile;
    localStorage.setItem('selected_profile_id', profile.id);
    
    el.activeProfileAvatar.src = profile.avatar_url || 'https://urobotsy.com/storage/avatars/disney/44c4d4e8-4f10-4d8d-bc82-42fc085b8aac.png';
    el.activeProfileName.textContent = profile.name;
    
    // Render profile dropdown options
    el.dropdownProfilesList.innerHTML = '';
    state.profilesList.forEach(p => {
        if (p.id === profile.id) return; // Skip active
        
        const optionEl = document.createElement('div');
        optionEl.className = 'profile-option';
        optionEl.innerHTML = `
            <img src="${p.avatar_url}" alt="Avatar">
            <span>${p.name}</span>
        `;
        optionEl.addEventListener('click', () => switchProfile(p));
        el.dropdownProfilesList.appendChild(optionEl);
    });
}

// Switch profile on backend
async function switchProfile(profile) {
    try {
        const res = await fetch('/api/profile/select', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ profileId: profile.id })
        });
        const data = await res.json();
        if (data.success) {
            setActiveProfile(profile);
            el.profileDropdown.classList.remove('active');
            
            // Reload page view
            if (state.activeView === 'home') {
                loadFeed();
            } else if (state.activeView === 'movies' || state.activeView === 'series' || state.activeView === 'animes') {
                loadCatalog();
            }
        }
    } catch (e) {
        console.error('Failed to switch profile:', e);
    }
}

// Event Listeners Registration
function registerEvents() {
    // Navigation items
    el.navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const view = link.dataset.view;
            
            // Update active link class
            el.navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            
            switchView(view);
        });
    });
    
    // Profile Switcher click
    el.activeProfileBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        el.profileDropdown.classList.toggle('active');
    });
    
    document.addEventListener('click', () => {
        el.profileDropdown.classList.remove('active');
    });
    
    // Search input (debounce / search on Enter)
    el.searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const query = el.searchInput.value.trim();
            if (query) {
                performSearch(query);
            }
        }
    });
    
    // Catalog Filter changes
    el.genreSelect.addEventListener('change', () => {
        state.catalogGenre = el.genreSelect.value;
        state.catalogPage = 1;
        loadCatalog();
    });
    
    el.yearSelect.addEventListener('change', () => {
        state.catalogYear = el.yearSelect.value;
        state.catalogPage = 1;
        loadCatalog();
    });
    
    el.sortSelect.addEventListener('change', () => {
        state.catalogSort = el.sortSelect.value;
        state.catalogPage = 1;
        loadCatalog();
    });
    
    // Pagination
    el.prevPageBtn.addEventListener('click', () => {
        if (state.catalogPage > 1) {
            state.catalogPage--;
            loadCatalog();
        }
    });
    
    el.nextPageBtn.addEventListener('click', () => {
        state.catalogPage++;
        loadCatalog();
    });
    
    // Close Details Modal
    el.closeModalBtn.addEventListener('click', () => {
        el.detailsModal.classList.remove('active');
    });
    
    el.detailsModal.addEventListener('click', (e) => {
        if (e.target === el.detailsModal) {
            el.detailsModal.classList.remove('active');
        }
    });
    
    // Close Player Modal
    el.closePlayerBtn.addEventListener('click', () => {
        el.mainVideoPlayer.pause();
        el.mainVideoPlayer.src = '';
        el.videoPlayerModal.classList.remove('active');
    });
}

// Switch between views (Home, Movies, Series, Animes)
function switchView(view) {
    state.activeView = view;
    
    // Reset pages
    state.catalogPage = 1;
    
    if (view === 'home') {
        el.homeView.style.display = 'block';
        el.catalogView.style.display = 'none';
        el.searchView.style.display = 'none';
        loadFeed();
    } else {
        el.homeView.style.display = 'none';
        el.catalogView.style.display = 'block';
        el.searchView.style.display = 'none';
        
        state.catalogType = view; // movies, series, animes
        
        // Update Title
        const titleMap = {
            movies: 'Filmes',
            series: 'Séries de TV',
            animes: 'Animes & Desenhos'
        };
        el.catalogTitleText.textContent = titleMap[view] || 'Catálogo';
        
        // Reset selections
        state.catalogGenre = '';
        state.catalogYear = '';
        el.genreSelect.value = '';
        el.yearSelect.value = '';
        
        loadCatalog();
    }
}

// Load Home Feed (Recommended & Featured)
async function loadFeed() {
    el.feedGrid.innerHTML = '';
    el.feedLoader.style.display = 'flex';
    
    try {
        const res = await fetch('/api/feed?page=1');
        const feedData = await res.json();
        
        const items = feedData.data || [];
        
        if (items.length > 0) {
            // Pick a random featured item from feed for the Hero Banner
            const featuredItem = items.find(i => i.backdrop || i.backdrop_titled) || items[0];
            setupHeroBanner(featuredItem);
            
            // Populate Home Recommendation Grid
            items.forEach(item => {
                const card = createMediaCard(item);
                el.feedGrid.appendChild(card);
            });
        }
    } catch (e) {
        console.error('Error loading feed:', e);
        el.feedGrid.innerHTML = `<div class="no-results"><i data-lucide="alert-triangle"></i> Erro ao carregar feed. Verifique a conexão do proxy.</div>`;
        lucide.createIcons();
    } finally {
        el.feedLoader.style.display = 'none';
    }
}

// Set up the Hero Banner details
function setupHeroBanner(item) {
    const bgUrl = item.backdrop || item.poster;
    el.heroBanner.style.backgroundImage = `url('${bgUrl}')`;
    el.heroTitle.textContent = item.title;
    el.heroDesc.textContent = item.description || 'Nenhuma descrição disponível.';
    el.heroYear.textContent = item.year;
    
    // Rating
    if (item.rating_avg) {
        el.heroRating.innerHTML = `<i data-lucide="star" class="star-icon"></i> ${item.rating_avg.toFixed(1)}`;
    } else {
        el.heroRating.innerHTML = '';
    }
    
    // Hero click actions
    el.heroPlayBtn.onclick = () => showDetails(item);
    el.heroInfoBtn.onclick = () => showDetails(item);
    
    lucide.createIcons();
}

// Fetch and load catalog filters
async function loadFilters() {
    try {
        const res = await fetch('/api/filters');
        state.filters = await res.json();
        
        // Populate dropdowns
        el.genreSelect.innerHTML = '<option value="">Todos os Gêneros</option>';
        state.filters.genres.forEach(g => {
            const opt = document.createElement('option');
            opt.value = g.id;
            opt.textContent = g.name;
            el.genreSelect.appendChild(opt);
        });
        
        el.yearSelect.innerHTML = '<option value="">Todos os Anos</option>';
        state.filters.years.forEach(y => {
            const opt = document.createElement('option');
            opt.value = y.year;
            opt.textContent = y.year;
            el.yearSelect.appendChild(opt);
        });
        
    } catch (e) {
        console.error('Error loading filters:', e);
    }
}

// Load Catalog view items based on page, type, filters
async function loadCatalog() {
    el.catalogGrid.innerHTML = '';
    el.catalogLoader.style.display = 'flex';
    el.paginationBox.style.display = 'none';
    
    const params = new URLSearchParams({
        type: state.catalogType,
        page: state.catalogPage,
        per_page: 24,
        sort: state.catalogSort
    });
    
    if (state.catalogGenre) params.append('genre_id', state.catalogGenre);
    if (state.catalogYear) params.append('year', state.catalogYear);
    
    try {
        const res = await fetch(`/api/catalog?${params.toString()}`);
        const catalogData = await res.json();
        
        const items = catalogData.data || [];
        
        if (items.length > 0) {
            items.forEach(item => {
                const card = createMediaCard(item);
                el.catalogGrid.appendChild(card);
            });
            
            // Configure Pagination
            el.pageIndicator.textContent = `Página ${state.catalogPage} de ${catalogData.last_page || 1}`;
            el.prevPageBtn.disabled = state.catalogPage <= 1;
            el.nextPageBtn.disabled = state.catalogPage >= (catalogData.last_page || 1);
            el.paginationBox.style.display = 'flex';
        } else {
            el.catalogGrid.innerHTML = `<div class="no-results"><i data-lucide="info"></i> Nenhum conteúdo correspondente aos filtros.</div>`;
            lucide.createIcons();
        }
    } catch (e) {
        console.error('Error loading catalog:', e);
        el.catalogGrid.innerHTML = `<div class="no-results"><i data-lucide="alert-triangle"></i> Falha ao carregar catálogo.</div>`;
        lucide.createIcons();
    } finally {
        el.catalogLoader.style.display = 'none';
    }
}

// Search function
async function performSearch(query) {
    state.activeView = 'search';
    state.searchQuery = query;
    
    // Update active link style (clear all)
    el.navLinks.forEach(l => l.classList.remove('active'));
    
    el.homeView.style.display = 'none';
    el.catalogView.style.display = 'none';
    el.searchView.style.display = 'block';
    
    el.searchQueryWord.textContent = `"${query}"`;
    el.searchGrid.innerHTML = '';
    el.searchLoader.style.display = 'flex';
    el.noResultsText.style.display = 'none';
    
    try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const searchData = await res.json();
        
        const items = searchData.data || searchData || [];
        
        if (items.length > 0) {
            items.forEach(item => {
                const card = createMediaCard(item);
                el.searchGrid.appendChild(card);
            });
        } else {
            el.noResultsText.style.display = 'flex';
        }
    } catch (e) {
        console.error('Error during search:', e);
        el.searchGrid.innerHTML = `<div class="no-results"><i data-lucide="alert-triangle"></i> Falha ao realizar busca.</div>`;
        lucide.createIcons();
    } finally {
        el.searchLoader.style.display = 'none';
    }
}

// Create a Grid Card DOM Element
function createMediaCard(item) {
    const card = document.createElement('div');
    card.className = 'media-card';
    
    // Type Tag (e.g. Filme, Série, Anime)
    const typeLabels = {
        movie: 'Filme',
        series: 'Série',
        anime: 'Anime'
    };
    const label = typeLabels[item.type] || item.type;
    
    // Use fallback image if poster fails or is empty
    const posterUrl = item.poster || 'https://via.placeholder.com/300x450/151833/ffffff?text=CineVS';
    
    card.innerHTML = `
        <div class="card-poster-wrapper">
            <img src="${posterUrl}" alt="${item.title}" loading="lazy">
            <div class="card-overlay">
                <span class="card-badge">${label}</span>
            </div>
        </div>
        <div class="card-details">
            <h3 class="card-title">${item.title}</h3>
            <div class="card-meta">
                <span>${item.year}</span>
                ${item.rating_avg ? `
                    <span class="rating">
                        <i data-lucide="star"></i>
                        ${item.rating_avg.toFixed(1)}
                    </span>
                ` : ''}
            </div>
        </div>
    `;
    
    card.addEventListener('click', () => showDetails(item));
    
    // Render Lucide icons inside card immediately
    setTimeout(() => {
        if (card.querySelector('[data-lucide]')) {
            lucide.createIcons({ node: card });
        }
    }, 10);
    
    return card;
}

// Show Details Modal for a Movie or Series
async function showDetails(item) {
    state.currentMedia = item;
    
    // Reset fields
    el.seasonsSection.style.display = 'none';
    el.channelsGrid.innerHTML = '';
    el.channelsSection.style.display = 'none';
    
    // Open Modal with loading skeleton
    el.modalBanner.style.backgroundImage = `url('${item.backdrop || item.poster}')`;
    el.modalTypeBadge.textContent = item.type === 'movie' ? 'Filme' : (item.type === 'anime' ? 'Anime' : 'Série');
    el.modalTitle.textContent = item.title;
    el.modalSynopsis.textContent = 'Carregando sinopse e canais...';
    el.modalYear.textContent = item.year;
    el.modalRating.innerHTML = item.rating_avg ? `<i data-lucide="star" class="star-icon"></i> ${item.rating_avg.toFixed(1)}` : '';
    el.modalDuration.textContent = item.duration ? `${item.duration} min` : '';
    el.modalAgeRating.textContent = '';
    el.modalGenres.innerHTML = '';
    
    el.detailsModal.classList.add('active');
    lucide.createIcons();
    
    try {
        // Fetch full media details from Proxy
        const res = await fetch(`/api/media/${item.type}/${item.id}`);
        const details = await res.json();
        state.currentMedia = details; // Update with full details
        
        // Populate rich data
        el.modalSynopsis.textContent = details.description || 'Nenhuma sinopse disponível.';
        el.modalYear.textContent = details.year;
        el.modalDuration.textContent = details.duration ? `${details.duration} min` : '';
        
        if (details.age_rating) {
            el.modalAgeRating.textContent = details.age_rating.name;
            el.modalAgeRating.style.display = 'inline-block';
        } else {
            el.modalAgeRating.style.display = 'none';
        }
        
        // Genres
        el.modalGenres.innerHTML = '';
        if (details.genres && details.genres.length > 0) {
            details.genres.forEach(g => {
                const tag = document.createElement('span');
                tag.className = 'genre-tag';
                tag.textContent = g.name;
                el.modalGenres.appendChild(tag);
            });
        }
        
        // Series / Anime Setup (Seasons selector)
        if (item.type === 'series' || item.type === 'anime') {
            setupSeriesPlayback(details);
        } else {
            // Movie playback (direct channels)
            setupMoviePlayback(details);
        }
        
    } catch (e) {
        console.error('Error loading details:', e);
        el.modalSynopsis.textContent = 'Ocorreu um erro ao carregar os detalhes do conteúdo.';
    }
}

// Setup Seasons & Episodes Selector for Series / Animes
function setupSeriesPlayback(details) {
    if (!details.seasons || details.seasons.length === 0) {
        el.seasonsSection.style.display = 'none';
        return;
    }
    
    el.seasonsSection.style.display = 'block';
    el.seasonSelectBox.innerHTML = '';
    
    details.seasons.forEach(season => {
        const opt = document.createElement('option');
        opt.value = season.id;
        opt.textContent = season.title || `Temporada ${season.number}`;
        el.seasonSelectBox.appendChild(opt);
    });
    
    // Listen for season select change
    el.seasonSelectBox.onchange = () => {
        const selectedSeasonId = parseInt(el.seasonSelectBox.value);
        const season = details.seasons.find(s => s.id === selectedSeasonId);
        renderEpisodesList(season);
    };
    
    // Load first season by default
    renderEpisodesList(details.seasons[0]);
}

// Render list of episodes for a season
function renderEpisodesList(season) {
    el.episodesList.innerHTML = '';
    
    if (!season || !season.episodes || season.episodes.length === 0) {
        el.episodesList.innerHTML = '<div class="episode-item">Nenhum episódio encontrado nesta temporada.</div>';
        return;
    }
    
    season.episodes.forEach((ep, index) => {
        const itemEl = document.createElement('div');
        itemEl.className = `episode-item ${index === 0 ? 'active' : ''}`;
        
        const thumbUrl = ep.thumbnail || 'https://via.placeholder.com/160x90/151833/ffffff?text=Episódio';
        
        itemEl.innerHTML = `
            <img class="episode-thumb" src="${thumbUrl}" alt="Episódio ${ep.number}">
            <div class="episode-info">
                <span class="episode-name">Episódio ${ep.number} - ${ep.title || 'Sem título'}</span>
                <span class="episode-meta">${ep.duration ? `${ep.duration} min` : ''} ${ep.air_date ? `• ${ep.air_date}` : ''}</span>
            </div>
        `;
        
        itemEl.onclick = () => {
            // Update active state
            document.querySelectorAll('.episodes-list .episode-item').forEach(el => el.classList.remove('active'));
            itemEl.classList.add('active');
            
            loadEpisodeChannels(ep.id);
        };
        
        el.episodesList.appendChild(itemEl);
    });
    
    // Load video channels for first episode by default
    loadEpisodeChannels(season.episodes[0].id);
}

// Load Video quality options for a specific Episode
async function loadEpisodeChannels(episodeId) {
    state.currentEpisodeId = episodeId;
    el.channelsGrid.innerHTML = '<div class="spinner" style="width: 20px; height: 20px; border-width: 2px;"></div>';
    el.channelsSection.style.display = 'block';
    el.channelsTitleText.textContent = 'Buscando players...';
    
    try {
        const res = await fetch(`/api/videos/episode/${episodeId}`);
        const data = await res.json();
        
        renderChannels(data.videos || [], 'episode', episodeId);
    } catch (e) {
        console.error('Error fetching episode channels:', e);
        el.channelsGrid.innerHTML = '<div>Erro ao carregar canais do episódio.</div>';
    }
}

// Setup movie playback direct channels
async function setupMoviePlayback(details) {
    el.channelsGrid.innerHTML = '<div class="spinner" style="width: 20px; height: 20px; border-width: 2px;"></div>';
    el.channelsSection.style.display = 'block';
    el.channelsTitleText.textContent = 'Buscando players...';
    
    try {
        const res = await fetch(`/api/videos/movie/${details.id}`);
        const data = await res.json();
        
        renderChannels(data.videos || [], 'movie', details.id);
    } catch (e) {
        console.error('Error fetching movie channels:', e);
        el.channelsGrid.innerHTML = '<div>Erro ao carregar canais de reprodução.</div>';
    }
}

// Render Video Channels lists (audio types, lock status, resolution tags)
function renderChannels(videos, type, mediaId) {
    el.channelsGrid.innerHTML = '';
    
    if (videos.length === 0) {
        el.channelsGrid.innerHTML = '<div>Nenhuma opção de player disponível para esta mídia no momento.</div>';
        el.channelsTitleText.textContent = 'Sem players';
        return;
    }
    
    el.channelsTitleText.textContent = 'Selecione um Player';
    
    videos.forEach(v => {
        const btn = document.createElement('button');
        btn.className = `channel-btn ${v.locked ? 'locked' : ''}`;
        
        const audioLabel = v.audio_type === 'dubbed' ? 'Dublado' : (v.audio_type === 'subtitled' ? 'Legendado' : v.audio_type);
        const qualityLabel = v.title || 'HD';
        
        btn.innerHTML = `
            <div class="left-side">
                <i data-lucide="play-circle"></i>
                <span class="badge-audio">${audioLabel}</span>
                <span>Opção ${v.sort_order + 1} (${qualityLabel})</span>
            </div>
            <div class="right-side">
                ${v.locked ? `
                    <i data-lucide="lock" class="lock-icon" title="Vídeo bloqueado na API"></i>
                ` : `
                    <span style="color: #10b981; font-size: 12px; font-weight: 700;">Disponível</span>
                `}
            </div>
        `;
        
        btn.onclick = () => {
            // Attempt to play even if API says locked (our proxy can bypass/resolve standard videos)
            playVideo(type, mediaId, v.id, `${audioLabel} - Opção ${v.sort_order + 1}`);
        };
        
        el.channelsGrid.appendChild(btn);
    });
    
    lucide.createIcons({ node: el.channelsGrid });
}

// Trigger Video Stream Resolve and open Custom Video Player Modal
async function playVideo(type, mediaId, videoId, label) {
    // 1. Show Player Modal in Loading state
    el.playerContentTitle.textContent = `${state.currentMedia.title} (${label})`;
    el.playerLoader.style.display = 'flex';
    el.mainVideoPlayer.src = '';
    el.videoPlayerModal.classList.add('active');
    
    try {
        console.log(`[Frontend] Requesting stream URL for ${type}/${mediaId}/${videoId}`);
        const res = await fetch(`/api/stream/${type}/${mediaId}/${videoId}`);
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || `Erro de conexão (${res.status})`);
        }
        
        const data = await res.json();
        
        if (!data.url) {
            throw new Error('A URL de streaming não foi resolvida.');
        }
        
        console.log('[Frontend] Playback stream resolved. Injecting URL:', data.url);
        
        // Hide loader & inject video URL
        el.playerLoader.style.display = 'none';
        el.mainVideoPlayer.src = data.url;
        el.mainVideoPlayer.play();
        
    } catch (e) {
        console.error('[Frontend] Playback Error:', e);
        el.playerLoader.innerHTML = `
            <i data-lucide="alert-triangle" style="width: 40px; height: 40px; color: #ef4444; margin-bottom: 8px;"></i>
            <p style="color: #ef4444; font-weight: 700;">Falha na Reprodução</p>
            <p style="font-size: 12px; margin-top: 4px;">${e.message}</p>
            <button class="btn btn-secondary" style="margin-top: 15px;" onclick="document.getElementById('closePlayerBtn').click()">Fechar</button>
        `;
        lucide.createIcons({ node: el.playerLoader });
    }
}
