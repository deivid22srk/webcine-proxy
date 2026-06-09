const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

const API_BASE = 'https://webcinevs2.com/api';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// 1. Endpoint Customizado: Resolver o link final de streaming (Bypass)
app.get('/api/stream/:streamType/:mediaId/:videoId', async (req, res) => {
    const { streamType, mediaId, videoId } = req.params;
    const isMovie = (streamType === 'movie' || streamType === 'movies');
    const route = isMovie ? `movies/${mediaId}` : `episodes/${mediaId}`;
    
    // Obtém cabeçalhos do cliente para encaminhar
    const authHeader = req.headers['authorization'];
    const deviceId = req.headers['x-device-id'] || 'webcine-proxy-device-123456';
    const profileId = req.headers['x-profile-id'] || req.query.profile_id;

    if (!authHeader) {
        return res.status(401).json({ error: 'Token de autorização ausente.' });
    }

    try {
        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': authHeader,
            'X-Device-Id': deviceId,
            'User-Agent': USER_AGENT
        };
        
        // A. Obtém o payload criptografado e o session_id
        console.log(`[Stream] Resolvendo vídeo ${videoId} para ${streamType}/${mediaId} (Perfil: ${profileId})...`);
        const videoRes = await fetch(`${API_BASE}/streaming/${route}/video/${videoId}?device_id=${deviceId}&profile_id=${profileId}&device_name=Chrome&device_type=web&platform=web`, { headers });
        
        if (!videoRes.ok) {
            const errText = await videoRes.text();
            throw new Error(`Erro ao obter metadados do vídeo (${videoRes.status}): ${errText}`);
        }
        
        const videoData = await videoRes.json();
        if (!videoData.video_url) {
            throw new Error('Metadados de vídeo inválidos ou ausentes na resposta da API.');
        }

        // B. Decifrar/Resolver a URL enviando o payload e o session_id
        console.log(`[Stream] Decifrando payload com session_id: ${videoData.session_id}`);
        const resolveRes = await fetch(`${API_BASE}/streaming/resolve-url`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                payload: videoData.video_url,
                session_id: videoData.session_id
            })
        });

        if (!resolveRes.ok) {
            const errText = await resolveRes.text();
            throw new Error(`Erro ao resolver URL final (${resolveRes.status}): ${errText}`);
        }
        
        const resolveData = await resolveRes.json();
        console.log(`[Stream] URL resolvida com sucesso: ${resolveData.url}`);
        
        res.json({
            url: resolveData.url,
            title: videoData.content ? videoData.content.title : null
        });
    } catch (err) {
        console.error(`[Stream] Erro ao resolver stream para ${streamType}/${mediaId}/${videoId}:`, err.message);
        res.status(500).json({ error: `Erro ao resolver streaming: ${err.message}` });
    }
});

// 2. Generic Proxy Forwarder para todas as outras rotas /api/*
app.all('/api/*', async (req, res) => {
    const targetPath = req.url.replace(/^\/api/, ''); // Ex: /auth/token
    const targetUrl = `${API_BASE}${targetPath}`;
    
    // Clona cabeçalhos originais
    const headers = { ...req.headers };
    
    // Remove cabeçalhos de controle local que conflitam ou causam problemas SSL
    delete headers.host;
    delete headers.connection;
    delete headers['content-length'];
    
    try {
        const fetchOptions = {
            method: req.method,
            headers: {
                ...headers,
                'User-Agent': USER_AGENT
            }
        };
        
        // Envia o corpo se não for requisição GET/HEAD
        if (req.method !== 'GET' && req.method !== 'HEAD') {
            fetchOptions.body = JSON.stringify(req.body);
        }
        
        const response = await fetch(targetUrl, fetchOptions);
        
        // Repassa o status e cabeçalhos principais
        res.status(response.status);
        const contentType = response.headers.get('content-type');
        if (contentType) res.setHeader('content-type', contentType);
        
        if (contentType && contentType.includes('application/json')) {
            const data = await response.json();
            res.json(data);
        } else {
            const data = await response.text();
            res.send(data);
        }
    } catch (err) {
        console.error(`[Proxy Error] Falha ao encaminhar ${req.method} ${targetPath}:`, err.message);
        res.status(500).json({ error: 'Erro no proxy de API.' });
    }
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`Servidor Proxy rodando em http://localhost:${PORT}`);
    console.log(`====================================================`);
});
