// App State
const state = {
    token: null,
    user: null,
    activeProfile: null,
    
    activeView: 'home',
    catalogType: 'movies',
    catalogPage: 1,
    catalogGenre: '',
    catalogYear: '',
    catalogSort: 'recent',
    searchQuery: '',
    
    filters: null,
    currentMedia: null,
    selectedProfileForPin: null, // profile clicked in Phase 2
    deviceId: null
};

// DOM Elements
const el = {
    // Phases
    loginPhase: document.getElementById('loginPhase'),
    profilePhase: document.getElementById('profilePhase'),
    dashboardPhase: document.getElementById('dashboardPhase'),
    
    // Login
    tokenInput: document.getElementById('tokenInput'),
    tokenSubmitBtn: document.getElementById('tokenSubmitBtn'),
    loginError: document.getElementById('loginError'),
    
    // Profiles
    profileList: document.getElementById('profileList'),
    logoutProfilesBtn: document.getElementById('logoutProfilesBtn'),
    
    // PIN Modal
    pinModal: document.getElementById('pinModal'),
    pinProfileAvatar: document.getElementById('pinProfileAvatar'),
    pinProfileName: document.getElementById('pinProfileName'),
    pinFields: document.querySelectorAll('.pin-input-field'),
    pinError: document.getElementById('pinError'),
    pinCancelBtn: document.getElementById('pinCancelBtn'),
    
    // Sidebar / Navs
    navLinks: document.querySelectorAll('.nav-links .nav-item'),
    activeProfileBtn: document.getElementById('activeProfileBtn'),
    activeProfileAvatar: document.getElementById('activeProfileAvatar'),
    activeProfileName: document.getElementById('activeProfileName'),
    profileDropdown: document.getElementById('profileDropdown'),
    dropdownProfilesList: document.getElementById('dropdownProfilesList'),
    
    // Mobile layouts
    mobileProfileBtn: document.getElementById('mobileProfileBtn'),
    mobileActiveAvatar: document.getElementById('mobileActiveAvatar'),
    mobileNavItems: document.querySelectorAll('.mobile-nav .mobile-nav-item'),
    mobileSearchBtn: document.getElementById('mobileSearchBtn'),
    mobileSearchOverlay: document.getElementById('mobileSearchOverlay'),
    closeMobileSearchBtn: document.getElementById('closeMobileSearchBtn'),
    mobileSearchInput: document.getElementById('mobileSearchInput'),
    mobileProfileOverlay: document.getElementById('mobileProfileOverlay'),
    closeMobileProfileBtn: document.getElementById('closeMobileProfileBtn'),
    mobileProfilesList: document.getElementById('mobileProfilesList'),
    mobileLogoutBtn: document.getElementById('mobileLogoutBtn'),
    
    // Search
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
    
    // Catalog header / filters
    catalogTitleText: document.getElementById('catalogTitleText'),
    genreSelect: document.getElementById('genreSelect'),
    yearSelect: document.getElementById('yearSelect'),
    sortSelect: document.getElementById('sortSelect'),
    prevPageBtn: document.getElementById('prevPageBtn'),
    nextPageBtn: document.getElementById('nextPageBtn'),
    pageIndicator: document.getElementById('pageIndicator'),
    
    // Details View
    detailsView: document.getElementById('detailsView'),
    backToPreviousViewBtn: document.getElementById('backToPreviousViewBtn'),
    modalBanner: document.getElementById('modalBanner'),
    modalTypeBadge: document.getElementById('modalTypeBadge'),
    modalTitle: document.getElementById('modalTitle'),
    modalRating: document.getElementById('modalRating'),
    modalYear: document.getElementById('modalYear'),
    modalDuration: document.getElementById('modalDuration'),
    modalAgeRating: document.getElementById('modalAgeRating'),
    modalSynopsis: document.getElementById('modalSynopsis'),
    modalGenres: document.getElementById('modalGenres'),
    
    // Seasons/episodes
    seasonsSection: document.getElementById('seasonsSection'),
    seasonSelectBox: document.getElementById('seasonSelectBox'),
    episodesList: document.getElementById('episodesList'),
    channelsSection: document.getElementById('channelsSection'),
    channelsTitleText: document.getElementById('channelsTitleText'),
    channelsGrid: document.getElementById('channelsGrid'),
    
    // Player
    videoPlayerModal: document.getElementById('videoPlayerModal'),
    closePlayerBtn: document.getElementById('closePlayerBtn'),
    mainVideoPlayer: document.getElementById('mainVideoPlayer'),
    playerContentTitle: document.getElementById('playerContentTitle'),
    playerLoader: document.getElementById('playerLoader')
};

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
    initDeviceId();
    initSession();
    registerEvents();
    initCustomPlayer();
});

// Device ID configuration
function initDeviceId() {
    let dId = localStorage.getItem('cinevs_device_id');
    if (!dId) {
        dId = `web-device-${Date.now()}-${Math.random().toString(16).slice(2)}`;
        localStorage.setItem('cinevs_device_id', dId);
    }
    state.deviceId = dId;
}

// Session configuration
function initSession() {
    const cachedToken = localStorage.getItem('cinevs_token');
    const cachedUser = localStorage.getItem('cinevs_user');
    
    if (cachedToken && cachedUser) {
        state.token = cachedToken;
        state.user = JSON.parse(cachedUser);
        
        const cachedProfileId = localStorage.getItem('selected_profile_id');
        if (cachedProfileId && state.user.profiles) {
            const profile = state.user.profiles.find(p => p.id === parseInt(cachedProfileId));
            if (profile) {
                state.activeProfile = profile;
                enterDashboard();
                return;
            }
        }
        
        // Profiles list phase
        showPhase('profile');
    } else {
        // Login phase
        showPhase('login');
    }
}

// Switch between Login / Profiles / Dashboard Screens
function showPhase(phase) {
    el.loginPhase.classList.remove('active');
    el.profilePhase.classList.remove('active');
    el.dashboardPhase.style.display = 'none';
    
    if (phase === 'login') {
        el.loginPhase.classList.add('active');
    } else if (phase === 'profile') {
        el.profilePhase.classList.add('active');
        renderProfilesGrid();
    } else if (phase === 'dashboard') {
        el.dashboardPhase.style.display = 'flex';
    }
    lucide.createIcons();
}

// Fetch helper with auth headers
async function apiFetch(endpoint, options = {}) {
    const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Device-Id': state.deviceId,
        ...options.headers
    };
    
    if (state.token) {
        headers['Authorization'] = `Bearer ${state.token}`;
    }
    if (state.activeProfile) {
        headers['X-Profile-Id'] = state.activeProfile.id.toString();
    }
    
    const response = await fetch(`/api${endpoint}`, {
        ...options,
        headers
    });
    
    if (response.status === 401) {
        // Disconnect token on authorization fail
        disconnectSession();
        throw new Error('Token expirado ou inválido.');
    }
    
    return response;
}

// Enter dashboard on successful login / profile PIN
function enterDashboard() {
    showPhase('dashboard');
    updateProfileWidgets();
    loadFeed();
    loadFilters();
}

// Disconnect session helper
function disconnectSession() {
    localStorage.removeItem('cinevs_token');
    localStorage.removeItem('cinevs_refresh_token');
    localStorage.removeItem('cinevs_user');
    localStorage.removeItem('selected_profile_id');
    state.token = null;
    state.user = null;
    state.activeProfile = null;
    showPhase('login');
}

// Update profiles lists and widgets in sidebar & header
function updateProfileWidgets() {
    if (!state.activeProfile) return;
    
    const avatar = state.activeProfile.avatar_url || 'https://via.placeholder.com/100';
    el.activeProfileAvatar.src = avatar;
    el.activeProfileName.textContent = state.activeProfile.name;
    
    el.mobileActiveAvatar.src = avatar;
    
    // Render dropdown lists
    el.dropdownProfilesList.innerHTML = '';
    el.mobileProfilesList.innerHTML = '';
    
    if (state.user && state.user.profiles) {
        // Other profiles selection
        state.user.profiles.forEach(p => {
            if (p.id === state.activeProfile.id) return;
            
            const profileEl = document.createElement('div');
            profileEl.className = 'profile-option';
            profileEl.innerHTML = `
                <img src="${p.avatar_url}" alt="Avatar">
                <span>${p.name}</span>
                <i data-lucide="refresh-cw"></i>
            `;
            profileEl.addEventListener('click', () => {
                state.selectedProfileForPin = p;
                openPinModal(p);
                el.profileDropdown.classList.remove('active');
                el.mobileProfileOverlay.classList.remove('active');
            });
            
            el.dropdownProfilesList.appendChild(profileEl);
            el.mobileProfilesList.appendChild(profileEl.cloneNode(true));
        });
        
        // Add logouts to dropdowns
        const logoutEl = document.createElement('div');
        logoutEl.className = 'profile-option';
        logoutEl.style.color = '#ef4444';
        logoutEl.innerHTML = `
            <i data-lucide="log-out" style="color:#ef4444;"></i>
            <span>Desconectar Token</span>
        `;
        logoutEl.onclick = disconnectSession;
        el.dropdownProfilesList.appendChild(logoutEl);
    }
    
    lucide.createIcons();
}

// Render the grid of profiles (Netflix style)
function renderProfilesGrid() {
    el.profileList.innerHTML = '';
    if (state.user && state.user.profiles) {
        state.user.profiles.forEach(p => {
            const item = document.createElement('div');
            item.className = 'profile-select-item';
            item.innerHTML = `
                <div class="profile-avatar-box">
                    <img src="${p.avatar_url}" alt="${p.name}">
                </div>
                <span class="profile-name">${p.name}</span>
            `;
            item.onclick = () => {
                state.selectedProfileForPin = p;
                openPinModal(p);
            };
            el.profileList.appendChild(item);
        });
    }
}

// Open Passcode PIN verification modal
function openPinModal(profile) {
    el.pinProfileAvatar.src = profile.avatar_url;
    el.pinProfileName.textContent = profile.name;
    el.pinError.style.display = 'none';
    
    // Update helper PIN label
    const helperPinValEl = document.getElementById('helperPinValue');
    if (helperPinValEl) {
        helperPinValEl.textContent = profile.pin;
    }
    
    // Clear inputs
    el.pinFields.forEach(f => f.value = '');
    
    el.pinModal.classList.add('active');
    
    // Focus first
    setTimeout(() => el.pinFields[0].focus(), 100);
}

// Check PIN entered against the selected profile's code
function checkPIN() {
    let pinCode = '';
    el.pinFields.forEach(f => pinCode += f.value);
    
    if (pinCode === state.selectedProfileForPin.pin) {
        state.activeProfile = state.selectedProfileForPin;
        localStorage.setItem('selected_profile_id', state.activeProfile.id);
        el.pinModal.classList.remove('active');
        
        // Fade transition phase
        el.profilePhase.style.opacity = '0';
        setTimeout(() => {
            el.profilePhase.classList.remove('active');
            el.profilePhase.style.opacity = '1';
            enterDashboard();
        }, 300);
    } else {
        el.pinError.style.display = 'block';
        el.pinFields.forEach(f => f.value = '');
        el.pinFields[0].focus();
    }
}

// Register User Events
function registerEvents() {
    // 1. TOKEN LOGIN SUBMIT
    el.tokenSubmitBtn.addEventListener('click', async () => {
        const tokenVal = el.tokenInput.value.trim();
        if (!tokenVal) {
            el.loginError.textContent = 'Por favor, insira o token.';
            el.loginError.style.display = 'block';
            return;
        }
        
        el.loginError.style.display = 'none';
        el.tokenSubmitBtn.disabled = true;
        el.tokenSubmitBtn.innerHTML = '<div class="spinner" style="width:16px; height:16px; border-width:2px; display:inline-block; margin:0;"></div> Verificando...';
        
        try {
            const res = await fetch('/api/auth/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    access_token: tokenVal,
                    device_id: state.deviceId,
                    device_name: 'Browser Client',
                    device_type: 'browser',
                    platform: 'web'
                })
            });
            
            if (!res.ok) throw new Error('Token inválido ou expirado.');
            
            const authData = await res.json();
            
            // Cache session
            state.token = authData.token;
            state.user = authData.user;
            localStorage.setItem('cinevs_token', authData.token);
            localStorage.setItem('cinevs_refresh_token', authData.refresh_token);
            localStorage.setItem('cinevs_user', JSON.stringify(authData.user));
            
            // Switch to profile selection
            showPhase('profile');
            
        } catch (err) {
            el.loginError.textContent = err.message;
            el.loginError.style.display = 'block';
        } finally {
            el.tokenSubmitBtn.disabled = false;
            el.tokenSubmitBtn.innerHTML = 'Verificar Token <i data-lucide="arrow-right"></i>';
            lucide.createIcons();
        }
    });
    
    // 2. PIN modal cancel
    el.pinCancelBtn.addEventListener('click', () => {
        el.pinModal.classList.remove('active');
    });
    
    // PIN field paste, backspace and arrow navigation
    el.pinFields.forEach((field, index) => {
        field.addEventListener('focus', () => {
            field.select();
        });

        field.addEventListener('input', (e) => {
            const val = field.value;
            // Only allow single character input
            if (val.length > 0) {
                field.value = val.slice(-1);
                if (index < 3) {
                    el.pinFields[index + 1].focus();
                } else {
                    checkPIN();
                }
            }
        });
        
        field.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace') {
                if (field.value.length === 0 && index > 0) {
                    el.pinFields[index - 1].focus();
                    el.pinFields[index - 1].value = '';
                } else {
                    field.value = '';
                }
                e.preventDefault();
            } else if (e.key === 'ArrowLeft' && index > 0) {
                el.pinFields[index - 1].focus();
                e.preventDefault();
            } else if (e.key === 'ArrowRight' && index < 3) {
                el.pinFields[index + 1].focus();
                e.preventDefault();
            } else if (e.key === 'Enter') {
                checkPIN();
            }
        });

        field.addEventListener('paste', (e) => {
            e.preventDefault();
            const pasteData = (e.clipboardData || window.clipboardData).getData('text').trim();
            if (/^\d{4}$/.test(pasteData)) {
                for (let i = 0; i < 4; i++) {
                    el.pinFields[i].value = pasteData[i];
                }
                checkPIN();
            }
        });
    });

    // 2a. PIN Visibility Toggle
    const pinToggleVisibilityBtn = document.getElementById('pinToggleVisibilityBtn');
    if (pinToggleVisibilityBtn) {
        pinToggleVisibilityBtn.addEventListener('click', () => {
            const isPassword = el.pinFields[0].type === 'password';
            el.pinFields.forEach(f => f.type = isPassword ? 'text' : 'password');
            
            const eyeIcon = document.getElementById('pinEyeIcon');
            const toggleText = document.getElementById('pinToggleText');
            if (eyeIcon) {
                eyeIcon.setAttribute('data-lucide', isPassword ? 'eye-off' : 'eye');
                lucide.createIcons({ node: pinToggleVisibilityBtn });
            }
            if (toggleText) {
                toggleText.textContent = isPassword ? 'Ocultar PIN' : 'Mostrar PIN';
            }
        });
    }

    // 2b. PIN Autofill helper
    const pinAutofillBtn = document.getElementById('pinAutofillBtn');
    if (pinAutofillBtn) {
        pinAutofillBtn.addEventListener('click', () => {
            const pinVal = state.selectedProfileForPin ? state.selectedProfileForPin.pin : '0520';
            if (pinVal && pinVal.length === 4) {
                el.pinFields.forEach((field, idx) => {
                    field.value = pinVal[idx];
                });
                checkPIN();
            }
        });
    }
    
    // 3. Log out token button inside profile selection
    el.logoutProfilesBtn.addEventListener('click', disconnectSession);
    
    // 4. Sidebar dropdown switch
    el.activeProfileBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        el.profileDropdown.classList.toggle('active');
    });
    
    document.addEventListener('click', () => {
        el.profileDropdown.classList.remove('active');
    });
    
    // 5. Desktop search input
    el.searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const query = el.searchInput.value.trim();
            if (query) performSearch(query);
        }
    });
    
    // 6. Navigation Tabs (Desktop & Mobile)
    const handleNavClick = (view, clickedItem) => {
        // Reset classes
        el.navLinks.forEach(l => l.classList.remove('active'));
        el.mobileNavItems.forEach(l => l.classList.remove('active'));
        
        // Set active classes
        document.querySelectorAll(`[data-view="${view}"]`).forEach(l => l.classList.add('active'));
        
        switchView(view);
    };
    
    el.navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            handleNavClick(link.dataset.view, link);
        });
    });
    
    el.mobileNavItems.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            if (link.id === 'mobileSearchBtn') return; // Handled separately
            handleNavClick(link.dataset.view, link);
        });
    });
    
    // 7. Mobile Search Modal Pop-up
    el.mobileSearchBtn.addEventListener('click', (e) => {
        e.preventDefault();
        el.mobileSearchOverlay.classList.add('active');
        setTimeout(() => el.mobileSearchInput.focus(), 150);
    });
    
    el.closeMobileSearchBtn.addEventListener('click', () => {
        el.mobileSearchOverlay.classList.remove('active');
    });
    
    el.mobileSearchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const query = el.mobileSearchInput.value.trim();
            if (query) {
                el.mobileSearchOverlay.classList.remove('active');
                el.searchInput.value = query;
                performSearch(query);
            }
        }
    });
    
    // 8. Mobile Profile popup overlay switcher
    el.mobileProfileBtn.addEventListener('click', () => {
        el.mobileProfileOverlay.classList.add('active');
    });
    
    el.closeMobileProfileBtn.addEventListener('click', () => {
        el.mobileProfileOverlay.classList.remove('active');
    });
    
    el.mobileLogoutBtn.addEventListener('click', () => {
        el.mobileProfileOverlay.classList.remove('active');
        disconnectSession();
    });
    
    // 9. Catalog filters changes
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
    
    // 10. Pagination
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
    
    // 11. Back to Previous View
    el.backToPreviousViewBtn.addEventListener('click', () => {
        if (state.previousView) {
            if (state.previousView === 'search') {
                state.activeView = 'search';
                el.homeView.style.display = 'none';
                el.catalogView.style.display = 'none';
                el.searchView.style.display = 'block';
                el.detailsView.style.display = 'none';
            } else {
                switchView(state.previousView);
                el.navLinks.forEach(l => l.classList.remove('active'));
                el.mobileNavItems.forEach(l => l.classList.remove('active'));
                document.querySelectorAll(`[data-view="${state.previousView}"]`).forEach(l => l.classList.add('active'));
            }
        } else {
            switchView('home');
            el.navLinks.forEach(l => l.classList.remove('active'));
            el.mobileNavItems.forEach(l => l.classList.remove('active'));
            document.querySelectorAll(`[data-view="home"]`).forEach(l => l.classList.add('active'));
        }
    });
    
    // 12. Player Close (Handled by custom player module)
}

// Switch between page views inside dashboard
function switchView(view) {
    state.activeView = view;
    state.catalogPage = 1;
    
    if (el.detailsView) {
        el.detailsView.style.display = 'none';
    }
    
    if (view === 'home') {
        el.homeView.style.display = 'block';
        el.catalogView.style.display = 'none';
        el.searchView.style.display = 'none';
        loadFeed();
    } else {
        el.homeView.style.display = 'none';
        el.catalogView.style.display = 'block';
        el.searchView.style.display = 'none';
        
        state.catalogType = view;
        
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

// Load feed items (Recommendations & Hero)
async function loadFeed() {
    el.feedGrid.innerHTML = '';
    el.feedLoader.style.display = 'flex';
    
    try {
        // Fetch announcements/feed
        let feedItems = [];
        try {
            const feedRes = await apiFetch('/feed?page=1');
            const feedData = await feedRes.json();
            feedItems = feedData.data || [];
        } catch (e) {
            console.error('Error fetching feed:', e);
        }
        
        // Fetch movies for recommendations
        let movieItems = [];
        try {
            const moviesRes = await apiFetch('/catalog/movies?page=1&per_page=12&sort=recent');
            const moviesData = await moviesRes.json();
            movieItems = moviesData.data || [];
        } catch (e) {
            console.error('Error fetching catalog movies:', e);
        }

        // Fetch series for recommendations
        let seriesItems = [];
        try {
            const seriesRes = await apiFetch('/catalog/series?page=1&per_page=12&sort=recent');
            const seriesData = await seriesRes.json();
            seriesItems = seriesData.data || [];
        } catch (e) {
            console.error('Error fetching catalog series:', e);
        }

        // Setup Hero Banner from the first movie or series (since they have backdrop images)
        const allMedia = [...movieItems, ...seriesItems];
        if (allMedia.length > 0) {
            const featuredItem = allMedia.find(i => i.backdrop || i.backdrop_titled) || allMedia[0];
            setupHeroBanner(featuredItem);
        }

        // Clear and rebuild Home feed container
        el.feedGrid.innerHTML = '';
        
        // Render Movies section
        if (movieItems.length > 0) {
            const movieHeader = document.createElement('h2');
            movieHeader.className = 'section-title';
            movieHeader.textContent = 'Filmes Recentes';
            el.feedGrid.appendChild(movieHeader);
            
            const movieGrid = document.createElement('div');
            movieGrid.className = 'media-grid';
            movieGrid.style.marginBottom = '40px';
            movieItems.forEach(item => {
                movieGrid.appendChild(createMediaCard(item));
            });
            el.feedGrid.appendChild(movieGrid);
        }

        // Render Series section
        if (seriesItems.length > 0) {
            const seriesHeader = document.createElement('h2');
            seriesHeader.className = 'section-title';
            seriesHeader.textContent = 'Séries Recentes';
            el.feedGrid.appendChild(seriesHeader);
            
            const seriesGrid = document.createElement('div');
            seriesGrid.className = 'media-grid';
            seriesGrid.style.marginBottom = '40px';
            seriesItems.forEach(item => {
                seriesGrid.appendChild(createMediaCard(item));
            });
            el.feedGrid.appendChild(seriesGrid);
        }

        // Render News / Feed Announcements section
        const newsItems = feedItems.filter(item => item.type === 'text' || item.type === 'video');
        if (newsItems.length > 0) {
            const newsHeader = document.createElement('h2');
            newsHeader.className = 'section-title';
            newsHeader.textContent = 'Novidades e Comunicados';
            el.feedGrid.appendChild(newsHeader);

            const newsGrid = document.createElement('div');
            newsGrid.className = 'media-grid';
            newsItems.forEach(item => {
                const card = createNewsCard(item);
                newsGrid.appendChild(card);
            });
            el.feedGrid.appendChild(newsGrid);
        }

    } catch (e) {
        console.error('Error loading feed:', e);
        el.feedGrid.innerHTML = `<div class="no-results"><i data-lucide="alert-triangle"></i> Falha ao carregar conteúdo da API.</div>`;
        lucide.createIcons();
    } finally {
        el.feedLoader.style.display = 'none';
    }
}

// Create custom card for text news/announcements
function createNewsCard(item) {
    const card = document.createElement('div');
    card.className = 'media-card news-card';
    
    const timeStr = item.published_at ? new Date(item.published_at).toLocaleDateString('pt-BR') : '';
    const bodyText = item.body ? item.body.replace(/\r\n/g, '<br>') : '';
    const mediaHtml = item.media && item.media[0] ? `<div class="news-media-img" style="margin-top: 10px; border-radius: 8px; overflow: hidden; aspect-ratio: 16/9;"><img src="${item.media[0]}" alt="${item.title}" style="width:100%; height:100%; object-fit:cover;" loading="lazy"></div>` : '';

    card.innerHTML = `
        <div class="news-card-content" style="padding: 20px; display: flex; flex-direction: column; gap: 12px; height: 100%; min-height: 250px; justify-content: space-between; background: linear-gradient(135deg, rgba(21, 24, 51, 0.6) 0%, rgba(13, 15, 35, 0.4) 100%); border-radius: 16px;">
            <div class="news-header-box">
                <span class="badge" style="display: inline-block; padding: 4px 10px; margin-bottom: 12px; font-size: 10px; background-color: rgba(168, 85, 247, 0.2); color: var(--color-purple); border: 1px solid rgba(168, 85, 247, 0.3);">Comunicado</span>
                <h3 class="card-title" style="white-space: normal; overflow: visible; font-size: 15px; font-weight: 800; line-height: 1.4; color: #fff;">${item.title}</h3>
                <p class="news-body" style="font-size: 13px; color: var(--text-secondary); margin-top: 8px; display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; line-height: 1.5;">${item.body || ''}</p>
            </div>
            ${mediaHtml}
            <div class="news-footer" style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: var(--text-muted); margin-top: auto; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 10px;">
                <span>Autor: ${item.author_name || 'Staff'}</span>
                <span>${timeStr}</span>
            </div>
        </div>
    `;

    card.addEventListener('click', () => {
        showAnnouncementModal(item);
    });

    return card;
}

// Show announcement overlay details
function showAnnouncementModal(item) {
    if (state.activeView !== 'details') {
        state.previousView = state.activeView;
    }
    
    el.seasonsSection.style.display = 'none';
    el.channelsGrid.innerHTML = '';
    el.channelsSection.style.display = 'none';
    
    el.modalBanner.style.backgroundImage = 'none';
    el.modalBanner.style.backgroundColor = 'var(--bg-card)';
    el.modalTypeBadge.textContent = 'Comunicado Oficial';
    el.modalTitle.textContent = item.title;
    el.modalSynopsis.innerHTML = `<div style="white-space: pre-wrap; line-height: 1.7; font-size: 15px; color: var(--text-primary);">${item.body || ''}</div>`;
    el.modalYear.textContent = item.published_at ? new Date(item.published_at).toLocaleDateString('pt-BR') : '';
    el.modalRating.innerHTML = '';
    el.modalDuration.textContent = '';
    el.modalAgeRating.textContent = '';
    el.modalAgeRating.style.display = 'none';
    el.modalGenres.innerHTML = '';
    
    if (item.media && item.media[0]) {
        const wrapper = document.createElement('div');
        wrapper.style.marginTop = '25px';
        wrapper.style.borderRadius = '12px';
        wrapper.style.overflow = 'hidden';
        wrapper.style.border = '1px solid var(--border-glass)';
        
        const img = document.createElement('img');
        img.src = item.media[0];
        img.style.width = '100%';
        img.style.display = 'block';
        wrapper.appendChild(img);
        
        el.modalSynopsis.appendChild(wrapper);
    }
    
    // Switch to details view
    state.activeView = 'details';
    el.homeView.style.display = 'none';
    el.catalogView.style.display = 'none';
    el.searchView.style.display = 'none';
    el.detailsView.style.display = 'block';
    
    el.detailsView.scrollTop = 0;
    const mainContent = document.querySelector('.main-content');
    if (mainContent) mainContent.scrollTop = 0;
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Setup top hero banner
function setupHeroBanner(item) {
    const bgUrl = item.backdrop || item.poster;
    el.heroBanner.style.backgroundImage = `url('${bgUrl}')`;
    el.heroTitle.textContent = item.title;
    el.heroDesc.textContent = item.description || 'Nenhuma descrição disponível.';
    el.heroYear.textContent = item.year;
    
    if (item.rating_avg) {
        el.heroRating.innerHTML = `<i data-lucide="star" class="star-icon"></i> ${item.rating_avg.toFixed(1)}`;
    } else {
        el.heroRating.innerHTML = '';
    }
    
    el.heroPlayBtn.onclick = () => showDetails(item);
    el.heroInfoBtn.onclick = () => showDetails(item);
    
    lucide.createIcons();
}

// Fetch list of filter elements
async function loadFilters() {
    if (state.filters) return; // Already cached
    
    try {
        const res = await apiFetch('/catalog/filters');
        state.filters = await res.json();
        
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

// Load filtered Catalog items
async function loadCatalog() {
    el.catalogGrid.innerHTML = '';
    el.catalogLoader.style.display = 'flex';
    el.paginationBox.style.display = 'none';
    
    const params = new URLSearchParams({
        page: state.catalogPage,
        per_page: 24,
        sort: state.catalogSort
    });
    
    if (state.catalogGenre) params.append('genre_id', state.catalogGenre);
    if (state.catalogYear) params.append('year', state.catalogYear);
    
    try {
        const res = await apiFetch(`/catalog/${state.catalogType}?${params.toString()}`);
        const catalogData = await res.json();
        const items = catalogData.data || [];
        
        if (items.length > 0) {
            items.forEach(item => {
                const card = createMediaCard(item);
                el.catalogGrid.appendChild(card);
            });
            
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

// Perform autocomplete search
async function performSearch(query) {
    state.activeView = 'search';
    state.searchQuery = query;
    
    el.navLinks.forEach(l => l.classList.remove('active'));
    el.mobileNavItems.forEach(l => l.classList.remove('active'));
    
    el.homeView.style.display = 'none';
    el.catalogView.style.display = 'none';
    el.searchView.style.display = 'block';
    if (el.detailsView) {
        el.detailsView.style.display = 'none';
    }
    
    el.searchQueryWord.textContent = `"${query}"`;
    el.searchGrid.innerHTML = '';
    el.searchLoader.style.display = 'flex';
    el.noResultsText.style.display = 'none';
    
    try {
        const res = await apiFetch(`/search?q=${encodeURIComponent(query)}`);
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
        console.error('Search error:', e);
        el.searchGrid.innerHTML = `<div class="no-results"><i data-lucide="alert-triangle"></i> Falha ao buscar conteúdos.</div>`;
        lucide.createIcons();
    } finally {
        el.searchLoader.style.display = 'none';
    }
}

// Create Card layout element
function createMediaCard(item) {
    const card = document.createElement('div');
    card.className = 'media-card';
    
    const typeLabels = {
        movie: 'Filme',
        series: 'Série',
        anime: 'Anime'
    };
    const label = typeLabels[item.type] || item.type;
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
    
    setTimeout(() => {
        if (card.querySelector('[data-lucide]')) {
            lucide.createIcons({ node: card });
        }
    }, 10);
    
    return card;
}

// Show media detail dedicated view
async function showDetails(item) {
    if (state.activeView !== 'details') {
        state.previousView = state.activeView;
    }
    state.currentMedia = item;
    
    el.seasonsSection.style.display = 'none';
    el.channelsGrid.innerHTML = '';
    el.channelsSection.style.display = 'none';
    
    const bgUrl = item.backdrop || item.poster;
    el.modalBanner.style.backgroundImage = `url('${bgUrl}')`;
    el.modalTypeBadge.textContent = item.type === 'movie' ? 'Filme' : (item.type === 'anime' ? 'Anime' : 'Série');
    el.modalTitle.textContent = item.title;
    el.modalSynopsis.textContent = 'Carregando sinopse e links...';
    el.modalYear.textContent = item.year;
    el.modalRating.innerHTML = item.rating_avg ? `<i data-lucide="star" class="star-icon"></i> ${item.rating_avg.toFixed(1)}` : '';
    el.modalDuration.textContent = item.duration ? `${item.duration} min` : '';
    el.modalAgeRating.textContent = '';
    el.modalGenres.innerHTML = '';
    
    // Switch to details view instead of showing modal
    state.activeView = 'details';
    el.homeView.style.display = 'none';
    el.catalogView.style.display = 'none';
    el.searchView.style.display = 'none';
    el.detailsView.style.display = 'block';
    
    // Scroll content to top
    el.detailsView.scrollTop = 0;
    const mainContent = document.querySelector('.main-content');
    if (mainContent) mainContent.scrollTop = 0;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    lucide.createIcons();
    
    try {
        const routeName = (item.type === 'movie') ? 'movies' : 'series';
        const res = await apiFetch(`/${routeName}/${item.id}`);
        const details = await res.json();
        state.currentMedia = details;
        
        el.modalSynopsis.textContent = details.description || 'Nenhuma sinopse disponível.';
        el.modalYear.textContent = details.year;
        el.modalDuration.textContent = details.duration ? `${details.duration} min` : '';
        
        if (details.age_rating) {
            el.modalAgeRating.textContent = details.age_rating.name;
            el.modalAgeRating.style.display = 'inline-block';
        } else {
            el.modalAgeRating.style.display = 'none';
        }
        
        el.modalGenres.innerHTML = '';
        if (details.genres) {
            details.genres.forEach(g => {
                const tag = document.createElement('span');
                tag.className = 'genre-tag';
                tag.textContent = g.name;
                el.modalGenres.appendChild(tag);
            });
        }
        
        if (item.type === 'series' || item.type === 'anime') {
            setupSeriesPlayback(details);
        } else {
            setupMoviePlayback(details);
        }
        
    } catch (e) {
        console.error('Error loading details:', e);
        el.modalSynopsis.textContent = 'Erro ao carregar detalhes adicionais.';
    }
}

// Setup selector of seasons
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
    
    el.seasonSelectBox.onchange = () => {
        const selectedSeasonId = parseInt(el.seasonSelectBox.value);
        const season = details.seasons.find(s => s.id == selectedSeasonId);
        renderEpisodesList(season);
    };
    
    renderEpisodesList(details.seasons[0]);
}

// Render list of episodes under season selector
function renderEpisodesList(season) {
    el.episodesList.innerHTML = '';
    
    if (!season || !season.episodes || season.episodes.length === 0) {
        el.episodesList.innerHTML = '<div class="episode-item">Nenhum episódio encontrado.</div>';
        return;
    }
    
    season.episodes.forEach((ep, index) => {
        const itemEl = document.createElement('div');
        itemEl.className = `episode-item ${index === 0 ? 'active' : ''}`;
        
        const thumbUrl = ep.thumbnail || 'https://via.placeholder.com/160x90/151833/ffffff?text=Episódio';
        
        itemEl.innerHTML = `
            <img class="episode-thumb" src="${thumbUrl}" alt="Episódio ${ep.number}">
            <div class="episode-info">
                <span class="episode-name">Ep ${ep.number || (index + 1)} - ${ep.title || 'Sem título'}</span>
                <span class="episode-meta">${ep.duration ? `${ep.duration} min` : ''}</span>
            </div>
        `;
        
        itemEl.onclick = () => {
            document.querySelectorAll('.episodes-list .episode-item').forEach(el => el.classList.remove('active'));
            itemEl.classList.add('active');
            loadEpisodeChannels(ep.id);
        };
        
        el.episodesList.appendChild(itemEl);
    });
    
    loadEpisodeChannels(season.episodes[0].id);
}

// Get video qualities for episode
async function loadEpisodeChannels(episodeId) {
    state.currentEpisodeId = episodeId;
    el.channelsGrid.innerHTML = '<div class="spinner" style="width: 20px; height: 20px; border-width: 2px;"></div>';
    el.channelsSection.style.display = 'block';
    el.channelsTitleText.textContent = 'Buscando players...';
    
    try {
        const res = await apiFetch(`/streaming/episodes/${episodeId}/videos?platform=web&device_type=web`);
        const data = await res.json();
        renderChannels(data.videos || [], 'episode', episodeId);
    } catch (e) {
        console.error('Error fetching episode channels:', e);
        el.channelsGrid.innerHTML = '<div>Erro ao buscar players do episódio.</div>';
    }
}

// Get video qualities for movie
async function setupMoviePlayback(details) {
    el.channelsGrid.innerHTML = '<div class="spinner" style="width: 20px; height: 20px; border-width: 2px;"></div>';
    el.channelsSection.style.display = 'block';
    el.channelsTitleText.textContent = 'Buscando players...';
    
    try {
        const res = await apiFetch(`/streaming/movies/${details.id}/videos?platform=web&device_type=web`);
        const data = await res.json();
        renderChannels(data.videos || [], 'movie', details.id);
    } catch (e) {
        console.error('Error fetching movie channels:', e);
        el.channelsGrid.innerHTML = '<div>Erro ao buscar players do filme.</div>';
    }
}

// Populate players list buttons
function renderChannels(videos, type, mediaId) {
    el.channelsGrid.innerHTML = '';
    
    if (videos.length === 0) {
        el.channelsGrid.innerHTML = '<div>Nenhum player disponível no momento.</div>';
        el.channelsTitleText.textContent = 'Sem players';
        return;
    }
    
    el.channelsTitleText.textContent = 'Selecione a Qualidade';
    
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
                    <i data-lucide="lock" class="lock-icon" title="Bloqueado na API original"></i>
                ` : `
                    <span style="color:#10b981; font-size:12px; font-weight:700;">Disponível</span>
                `}
            </div>
        `;
        
        btn.onclick = () => {
            playVideo(type, mediaId, v.id, `${audioLabel} - Opção ${v.sort_order + 1}`);
        };
        
        el.channelsGrid.appendChild(btn);
    });
    
    lucide.createIcons({ node: el.channelsGrid });
}

// Request resolved bypass URL and start video playback
async function playVideo(type, mediaId, videoId, label) {
    el.playerContentTitle.textContent = `${state.currentMedia.title} (${label})`;
    
    // Reset player loader state
    el.playerLoader.style.display = 'flex';
    el.playerLoader.innerHTML = `
        <div class="spinner"></div>
        <p>Resolvendo fluxo de streaming via Proxy...</p>
    `;
    
    el.mainVideoPlayer.src = '';
    el.videoPlayerModal.classList.add('active');
    
    try {
        const res = await apiFetch(`/stream/${type}/${mediaId}/${videoId}`);
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Erro ao decifrar streaming.');
        }
        
        const data = await res.json();
        if (!data.url) throw new Error('A URL final de stream não pôde ser resolvida.');
        
        el.playerLoader.style.display = 'none';
        el.mainVideoPlayer.src = data.url;
        
        // Attempt to play, catch autoplay prevention
        const playPromise = el.mainVideoPlayer.play();
        if (playPromise !== undefined) {
            playPromise.catch(error => {
                console.log("Playback start prevented by browser autoplay policy:", error);
                el.mainVideoPlayer.pause();
                // Ensure controls are visible so the user can click play
                const wrapper = document.getElementById('videoWrapper');
                if (wrapper) {
                    wrapper.classList.add('show-controls');
                    wrapper.style.cursor = 'default';
                }
            });
        }
        
    } catch (e) {
        console.error('Playback fail:', e);
        el.playerLoader.innerHTML = `
            <i data-lucide="alert-triangle" style="width:40px; height:40px; color:#ef4444; margin-bottom:8px;"></i>
            <p style="color:#ef4444; font-weight:700;">Falha no Stream</p>
            <p style="font-size:12px; margin-top:4px;">${e.message}</p>
            <button class="btn btn-secondary" style="margin-top:15px;" onclick="document.getElementById('closePlayerBtn').click()">Fechar</button>
        `;
        lucide.createIcons({ node: el.playerLoader });
    }
}

// ====================================================
// CUSTOM DEDICATED STREAMING PLAYER MODULE
// ====================================================

let playerState = {
    isMuted: false,
    prevVolume: 1,
    controlsTimeout: null,
    isScrubbing: false
};

function initCustomPlayer() {
    const video = el.mainVideoPlayer;
    const wrapper = document.getElementById('videoWrapper');
    const playPauseBtn = document.getElementById('playPauseBtn');
    const skipBackBtn = document.getElementById('skipBackBtn');
    const skipForwardBtn = document.getElementById('skipForwardBtn');
    const volumeBtn = document.getElementById('volumeBtn');
    const volumeSlider = document.getElementById('volumeSlider');
    const currentTimeEl = document.getElementById('currentTime');
    const durationTimeEl = document.getElementById('durationTime');
    const speedBtn = document.getElementById('speedBtn');
    const speedDropdown = document.getElementById('speedDropdown');
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    const progressContainer = document.getElementById('progressContainer');
    const progressBarFilled = document.getElementById('progressBarFilled');
    const progressBarBuffered = document.getElementById('progressBarBuffered');
    const progressBarHandle = document.getElementById('progressBarHandle');
    const centerPlayIndicator = document.getElementById('centerPlayIndicator');
    const seekLeftFeedback = document.getElementById('seekLeftFeedback');
    const seekRightFeedback = document.getElementById('seekRightFeedback');
    const playerBackBtn = document.getElementById('playerBackBtn');

    if (!video || !wrapper) return;

    // Helper: format time (MM:SS or HH:MM:SS)
    function formatTime(time) {
        if (isNaN(time)) return '00:00';
        const hours = Math.floor(time / 3600);
        const minutes = Math.floor((time % 3600) / 60);
        const seconds = Math.floor(time % 60);
        
        const pad = (num) => String(num).padStart(2, '0');
        
        if (hours > 0) {
            return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
        }
        return `${pad(minutes)}:${pad(seconds)}`;
    }

    // Play/Pause toggle
    function togglePlay() {
        if (video.paused) {
            video.play();
        } else {
            video.pause();
        }
        triggerCenterPlayIndicator();
    }

    function triggerCenterPlayIndicator() {
        centerPlayIndicator.classList.remove('active');
        const icon = centerPlayIndicator.querySelector('i');
        if (icon) {
            icon.setAttribute('data-lucide', video.paused ? 'pause' : 'play');
            lucide.createIcons({ node: centerPlayIndicator });
        }
        // Force reflow
        void centerPlayIndicator.offsetWidth;
        centerPlayIndicator.classList.add('active');
        setTimeout(() => centerPlayIndicator.classList.remove('active'), 500);
    }

    // Video events
    video.addEventListener('play', () => {
        playPauseBtn.innerHTML = '<i data-lucide="pause"></i>';
        lucide.createIcons({ node: playPauseBtn });
        resetControlsTimeout();
    });

    video.addEventListener('pause', () => {
        playPauseBtn.innerHTML = '<i data-lucide="play"></i>';
        lucide.createIcons({ node: playPauseBtn });
        showControls();
    });

    video.addEventListener('timeupdate', () => {
        if (!playerState.isScrubbing) {
            const percent = (video.currentTime / video.duration) * 100;
            progressBarFilled.style.width = `${percent}%`;
            progressBarHandle.style.left = `${percent}%`;
            currentTimeEl.textContent = formatTime(video.currentTime);
        }
    });

    video.addEventListener('durationchange', () => {
        durationTimeEl.textContent = formatTime(video.duration);
    });

    video.addEventListener('progress', () => {
        if (video.duration && video.buffered.length > 0) {
            const lastBuffered = video.buffered.end(video.buffered.length - 1);
            const percent = (lastBuffered / video.duration) * 100;
            progressBarBuffered.style.width = `${percent}%`;
        }
    });

    // Control bar clicks
    playPauseBtn.addEventListener('click', togglePlay);
    
    // Video surface clicks
    video.addEventListener('click', (e) => {
        e.stopPropagation();
        togglePlay();
    });

    // Double click seeking
    video.addEventListener('dblclick', (e) => {
        e.preventDefault();
        const rect = video.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const width = rect.width;
        
        if (clickX < width * 0.35) {
            // Left double-click (rewind 10s)
            video.currentTime = Math.max(0, video.currentTime - 10);
            triggerSeekFeedback('left');
        } else if (clickX > width * 0.65) {
            // Right double-click (fast-forward 10s)
            video.currentTime = Math.min(video.duration || 0, video.currentTime + 10);
            triggerSeekFeedback('right');
        }
    });

    function triggerSeekFeedback(direction) {
        const feedback = direction === 'left' ? seekLeftFeedback : seekRightFeedback;
        feedback.classList.remove('active');
        void feedback.offsetWidth;
        feedback.classList.add('active');
        setTimeout(() => feedback.classList.remove('active'), 650);
    }

    // 10s skips
    skipBackBtn.addEventListener('click', () => {
        video.currentTime = Math.max(0, video.currentTime - 10);
        triggerSeekFeedback('left');
    });

    skipForwardBtn.addEventListener('click', () => {
        video.currentTime = Math.min(video.duration || 0, video.currentTime + 10);
        triggerSeekFeedback('right');
    });

    // Volume controls
    function updateVolumeIcon(vol, muted) {
        let iconName = 'volume-2';
        if (muted || vol === 0) {
            iconName = 'volume-x';
        } else if (vol < 0.3) {
            iconName = 'volume';
        } else if (vol < 0.7) {
            iconName = 'volume-1';
        }
        volumeBtn.innerHTML = `<i data-lucide="${iconName}"></i>`;
        lucide.createIcons({ node: volumeBtn });
    }

    volumeSlider.addEventListener('input', () => {
        video.volume = volumeSlider.value;
        video.muted = (video.volume === 0);
        playerState.prevVolume = video.volume;
        updateVolumeIcon(video.volume, video.muted);
    });

    volumeBtn.addEventListener('click', () => {
        if (video.muted) {
            video.muted = false;
            video.volume = playerState.prevVolume;
            volumeSlider.value = video.volume;
        } else {
            playerState.prevVolume = video.volume;
            video.muted = true;
            video.volume = 0;
            volumeSlider.value = 0;
        }
        updateVolumeIcon(video.volume, video.muted);
    });

    // Progress bar Scrubbing (Clicking and Dragging)
    function scrub(e) {
        const rect = progressContainer.getBoundingClientRect();
        let clientX = e.clientX;
        if (e.touches && e.touches[0]) {
            clientX = e.touches[0].clientX;
        }
        const position = (clientX - rect.left) / rect.width;
        const boundedPosition = Math.max(0, Math.min(1, position));
        
        progressBarFilled.style.width = `${boundedPosition * 100}%`;
        progressBarHandle.style.left = `${boundedPosition * 100}%`;
        currentTimeEl.textContent = formatTime(boundedPosition * (video.duration || 0));
        
        return boundedPosition;
    }

    progressContainer.addEventListener('mousedown', (e) => {
        playerState.isScrubbing = true;
        const pos = scrub(e);
        
        function onMouseMove(moveEvent) {
            scrub(moveEvent);
        }
        
        function onMouseUp(upEvent) {
            const finalPos = scrub(upEvent);
            video.currentTime = finalPos * (video.duration || 0);
            playerState.isScrubbing = false;
            
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        }
        
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    });

    // Touch events for mobile progress scrubbing
    progressContainer.addEventListener('touchstart', (e) => {
        playerState.isScrubbing = true;
        const pos = scrub(e);
        
        function onTouchMove(moveEvent) {
            scrub(moveEvent);
        }
        
        function onTouchEnd(endEvent) {
            playerState.isScrubbing = false;
            const finalPos = parseFloat(progressBarFilled.style.width) / 100;
            video.currentTime = finalPos * (video.duration || 0);
            
            document.removeEventListener('touchmove', onTouchMove);
            document.removeEventListener('touchend', onTouchEnd);
        }
        
        document.addEventListener('touchmove', onTouchMove);
        document.addEventListener('touchend', onTouchEnd);
    });

    // Speed Rate selector
    speedBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        speedDropdown.classList.toggle('active');
    });

    document.querySelectorAll('.speed-option').forEach(opt => {
        opt.addEventListener('click', (e) => {
            e.stopPropagation();
            const speed = parseFloat(opt.dataset.speed);
            video.playbackRate = speed;
            speedBtn.textContent = `${speed.toFixed(1)}x`;
            
            document.querySelectorAll('.speed-option').forEach(o => o.classList.remove('active'));
            opt.classList.add('active');
            speedDropdown.classList.remove('active');
        });
    });

    document.addEventListener('click', () => {
        speedDropdown.classList.remove('active');
    });

    // Fullscreen toggle
    function toggleFullscreen() {
        if (!document.fullscreenElement &&
            !document.mozFullScreenElement &&
            !document.webkitFullscreenElement &&
            !document.msFullscreenElement) {
            
            // Enter fullscreen
            if (wrapper.requestFullscreen) {
                wrapper.requestFullscreen();
            } else if (wrapper.msRequestFullscreen) {
                wrapper.msRequestFullscreen();
            } else if (wrapper.mozRequestFullScreen) {
                wrapper.mozRequestFullScreen();
            } else if (wrapper.webkitRequestFullscreen) {
                wrapper.webkitRequestFullscreen();
            }
        } else {
            // Exit fullscreen
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.msExitFullscreen) {
                document.msExitFullscreen();
            } else if (document.mozCancelFullScreen) {
                document.mozCancelFullScreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            }
        }
    }

    fullscreenBtn.addEventListener('click', toggleFullscreen);

    // Watch fullscreen changes to update icon
    function onFullscreenChange() {
        const isFS = document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement;
        fullscreenBtn.innerHTML = isFS ? '<i data-lucide="minimize"></i>' : '<i data-lucide="maximize"></i>';
        lucide.createIcons({ node: fullscreenBtn });
    }

    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('webkitfullscreenchange', onFullscreenChange);
    document.addEventListener('mozfullscreenchange', onFullscreenChange);

    // Auto-hide controls and cursor logic
    function showControls() {
        wrapper.classList.add('show-controls');
        wrapper.style.cursor = 'default';
        resetControlsTimeout();
    }

    function hideControls() {
        if (!video.paused && !playerState.isScrubbing) {
            wrapper.classList.remove('show-controls');
            wrapper.style.cursor = 'none';
        }
    }

    function resetControlsTimeout() {
        clearTimeout(playerState.controlsTimeout);
        if (!video.paused) {
            playerState.controlsTimeout = setTimeout(hideControls, 2500);
        }
    }

    wrapper.addEventListener('mousemove', showControls);
    wrapper.addEventListener('touchstart', showControls);

    // Close buttons (X and back arrow)
    function closePlayer() {
        video.pause();
        video.src = '';
        
        // Exit fullscreen if active
        if (document.fullscreenElement || document.webkitFullscreenElement) {
            if (document.exitFullscreen) document.exitFullscreen().catch(()=>{});
        }
        
        el.videoPlayerModal.classList.remove('active');
    }

    el.closePlayerBtn.onclick = closePlayer;
    if (playerBackBtn) playerBackBtn.onclick = closePlayer;

    // Keyboard Shortcuts (only when player modal is active)
    document.addEventListener('keydown', (e) => {
        if (!el.videoPlayerModal.classList.contains('active')) return;

        // Skip shortcut if user is focusing on an input (though shouldn't be possible inside player)
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        switch (e.key.toLowerCase()) {
            case ' ':
            case 'k':
                e.preventDefault();
                togglePlay();
                break;
            case 'arrowleft':
            case 'j':
                e.preventDefault();
                video.currentTime = Math.max(0, video.currentTime - 10);
                triggerSeekFeedback('left');
                showControls();
                break;
            case 'arrowright':
            case 'l':
                e.preventDefault();
                video.currentTime = Math.min(video.duration || 0, video.currentTime + 10);
                triggerSeekFeedback('right');
                showControls();
                break;
            case 'arrowup':
                e.preventDefault();
                video.volume = Math.min(1, video.volume + 0.1);
                volumeSlider.value = video.volume;
                video.muted = false;
                updateVolumeIcon(video.volume, video.muted);
                showControls();
                break;
            case 'arrowdown':
                e.preventDefault();
                video.volume = Math.max(0, video.volume - 0.1);
                volumeSlider.value = video.volume;
                video.muted = (video.volume === 0);
                updateVolumeIcon(video.volume, video.muted);
                showControls();
                break;
            case 'f':
                e.preventDefault();
                toggleFullscreen();
                break;
            case 'm':
                e.preventDefault();
                volumeBtn.click();
                showControls();
                break;
        }
    });

    // Default states
    video.volume = 1;
    volumeSlider.value = 1;
    wrapper.classList.add('show-controls');
}
