const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

const API_BASE = 'https://webcinevs2.com/api';
const ACCESS_TOKEN = 'AMECL7FZ';
const DEVICE_ID = 'webcine-proxy-device-123456';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

let session = {
    token: null,
    refreshToken: null,
    profileId: null,
    user: null,
    expiresAt: null
};

// Autenticação na API oficial
async function authenticate() {
    console.log('[Auth] Autenticando com o token do WebCine...');
    try {
        const res = await fetch(`${API_BASE}/auth/token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'User-Agent': USER_AGENT
            },
            body: JSON.stringify({
                access_token: ACCESS_TOKEN,
                device_id: DEVICE_ID,
                device_name: 'WebCine Proxy Server',
                device_type: 'browser',
                platform: 'web'
            })
        });

        if (!res.ok) {
            const errText = await res.text();
            throw new Error(`Erro na API (${res.status}): ${errText}`);
        }

        const data = await res.json();
        session.token = data.token;
        session.refreshToken = data.refresh_token;
        session.user = data.user;
        
        // Seleciona o primeiro perfil padrão
        if (data.user && data.user.profiles && data.user.profiles.length > 0) {
            session.profileId = data.user.profiles[0].id;
            console.log(`[Auth] Perfil selecionado: ${data.user.profiles[0].name} (ID: ${session.profileId})`);
        }
        
        // Configura uma expiração aproximada (ex: 2 horas)
        session.expiresAt = Date.now() + 2 * 60 * 60 * 1000;
        console.log('[Auth] Autenticado com sucesso!');
        return true;
    } catch (err) {
        console.error('[Auth] Falha na autenticação:', err.message);
        return false;
    }
}

// Retorna cabeçalhos autenticados atualizados
async function getHeaders() {
    if (!session.token || !session.expiresAt || Date.now() >= session.expiresAt) {
        await authenticate();
    }
    return {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${session.token}`,
        'X-Device-Id': DEVICE_ID,
        'User-Agent': USER_AGENT
    };
}

// Rota auxiliar de status
app.get('/api/status', async (req, res) => {
    const isReady = !!session.token;
    res.json({
        ready: isReady,
        profile: session.user ? session.user.name : null,
        profilesList: session.user ? session.user.profiles : []
    });
});

// Endpoint: Mudar o perfil ativo
app.post('/api/profile/select', async (req, res) => {
    const { profileId } = req.body;
    if (!profileId) return res.status(400).json({ error: 'profileId é obrigatório' });
    
    if (session.user && session.user.profiles) {
        const found = session.user.profiles.find(p => p.id === parseInt(profileId));
        if (found) {
            session.profileId = found.id;
            console.log(`[Auth] Perfil alterado para: ${found.name} (ID: ${found.id})`);
            return res.json({ success: true, profile: found });
        }
    }
    res.status(404).json({ error: 'Perfil não encontrado' });
});

// Endpoint: Feed inicial
app.get('/api/feed', async (req, res) => {
    const page = req.query.page || 1;
    try {
        const headers = await getHeaders();
        const response = await fetch(`${API_BASE}/feed?page=${page}`, { headers });
        if (!response.ok) throw new Error(`Status ${response.status}`);
        const data = await response.json();
        res.json(data);
    } catch (err) {
        console.error('[API] Erro ao carregar feed:', err.message);
        res.status(500).json({ error: 'Erro ao carregar feed da API original.' });
    }
});

// Endpoint: Filtros do catálogo
app.get('/api/filters', async (req, res) => {
    try {
        const headers = await getHeaders();
        const response = await fetch(`${API_BASE}/catalog/filters`, { headers });
        if (!response.ok) throw new Error(`Status ${response.status}`);
        const data = await response.json();
        res.json(data);
    } catch (err) {
        console.error('[API] Erro ao carregar filtros:', err.message);
        res.status(500).json({ error: 'Erro ao carregar filtros da API original.' });
    }
});

// Endpoint: Catálogo geral filtrado
app.get('/api/catalog', async (req, res) => {
    const type = req.query.type || 'all'; // movies, series, animes, all
    
    // Constrói os query parameters de filtros
    const params = new URLSearchParams();
    if (req.query.page) params.append('page', req.query.page);
    if (req.query.per_page) params.append('per_page', req.query.per_page);
    if (req.query.genre_id) params.append('genre_id', req.query.genre_id);
    if (req.query.year) params.append('year', req.query.year);
    if (req.query.platform_id) params.append('platform_id', req.query.platform_id);
    if (req.query.age_rating_id) params.append('age_rating_id', req.query.age_rating_id);
    if (req.query.audio_type) params.append('audio_type', req.query.audio_type);
    if (req.query.sort) params.append('sort', req.query.sort);

    try {
        const headers = await getHeaders();
        const response = await fetch(`${API_BASE}/catalog/${type}?${params.toString()}`, { headers });
        if (!response.ok) throw new Error(`Status ${response.status}`);
        const data = await response.json();
        res.json(data);
    } catch (err) {
        console.error(`[API] Erro ao carregar catálogo (${type}):`, err.message);
        res.status(500).json({ error: 'Erro ao carregar catálogo da API original.' });
    }
});

// Endpoint: Busca geral
app.get('/api/search', async (req, res) => {
    const query = req.query.q;
    if (!query) return res.status(400).json({ error: 'Query q é necessária' });
    try {
        const headers = await getHeaders();
        const response = await fetch(`${API_BASE}/search?q=${encodeURIComponent(query)}`, { headers });
        if (!response.ok) throw new Error(`Status ${response.status}`);
        const data = await response.json();
        res.json(data);
    } catch (err) {
        console.error('[API] Erro na busca:', err.message);
        res.status(500).json({ error: 'Erro ao pesquisar na API original.' });
    }
});

// Endpoint: Detalhes de um filme, série ou anime
app.get('/api/media/:type/:id', async (req, res) => {
    const { type, id } = req.params;
    // O backend original usa /movies/:id para filmes e /series/:id para séries/animes
    const route = (type === 'movie' || type === 'movies') ? 'movies' : 'series';
    
    try {
        const headers = await getHeaders();
        const response = await fetch(`${API_BASE}/${route}/${id}`, { headers });
        if (!response.ok) throw new Error(`Status ${response.status}`);
        const data = await response.json();
        res.json(data);
    } catch (err) {
        console.error(`[API] Erro ao buscar detalhes de ${type}/${id}:`, err.message);
        res.status(500).json({ error: 'Erro ao carregar detalhes da mídia.' });
    }
});

// Endpoint: Obter opções de vídeo para uma mídia
app.get('/api/videos/:type/:mediaId', async (req, res) => {
    const { type, mediaId } = req.params;
    const isMovie = (type === 'movie' || type === 'movies');
    const route = isMovie ? `movies/${mediaId}` : `episodes/${mediaId}`;
    
    try {
        const headers = await getHeaders();
        const response = await fetch(`${API_BASE}/streaming/${route}/videos?platform=web&device_type=web`, { headers });
        if (!response.ok) throw new Error(`Status ${response.status}`);
        const data = await response.json();
        res.json(data);
    } catch (err) {
        console.error(`[API] Erro ao buscar vídeos de ${type}/${mediaId}:`, err.message);
        res.status(500).json({ error: 'Erro ao carregar lista de vídeos da mídia.' });
    }
});

// Endpoint: Resolver o link final de streaming (Bypass completo)
app.get('/api/stream/:type/:mediaId/:videoId', async (req, res) => {
    const { type, mediaId, videoId } = req.params;
    const isMovie = (type === 'movie' || type === 'movies');
    const route = isMovie ? `movies/${mediaId}` : `episodes/${mediaId}`;
    
    try {
        const headers = await getHeaders();
        
        // 1. Obtém o payload criptografado e o session_id
        console.log(`[Stream] Resolvendo vídeo ${videoId} para ${type}/${mediaId}...`);
        const videoRes = await fetch(`${API_BASE}/streaming/${route}/video/${videoId}?device_id=${DEVICE_ID}&profile_id=${session.profileId}&device_name=Chrome&device_type=web&platform=web`, { headers });
        if (!videoRes.ok) throw new Error(`Erro ao obter metadados do vídeo (${videoRes.status})`);
        
        const videoData = await videoRes.json();
        if (!videoData.video_url) {
            throw new Error('Metadados de vídeo inválidos ou ausentes.');
        }

        // 2. Decripta / resolve a URL enviando o payload e o session_id
        console.log(`[Stream] Decifrando payload com session_id: ${videoData.session_id}`);
        const resolveRes = await fetch(`${API_BASE}/streaming/resolve-url`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                payload: videoData.video_url,
                session_id: videoData.session_id
            })
        });

        if (!resolveRes.ok) throw new Error(`Erro ao resolver URL (${resolveRes.status})`);
        const resolveData = await resolveRes.json();
        
        console.log(`[Stream] URL resolvida com sucesso: ${resolveData.url}`);
        res.json({
            url: resolveData.url,
            title: videoData.content ? videoData.content.title : null
        });
    } catch (err) {
        console.error(`[Stream] Erro ao resolver stream para ${type}/${mediaId}/${videoId}:`, err.message);
        res.status(500).json({ error: `Erro ao resolver streaming: ${err.message}` });
    }
});

// Inicia o servidor e realiza autenticação inicial
app.listen(PORT, async () => {
    console.log(`====================================================`);
    console.log(`Servidor rodando em http://localhost:${PORT}`);
    console.log(`====================================================`);
    await authenticate();
});
