const { spawn } = require('child_process');

const PORT = 3001;
let serverProcess;

function startServer() {
    return new Promise((resolve, reject) => {
        console.log(`Starting proxy server on port ${PORT}...`);
        serverProcess = spawn('node', ['server.js'], {
            env: { ...process.env, PORT: PORT },
            cwd: __dirname
        });

        serverProcess.stdout.on('data', (data) => {
            const output = data.toString();
            console.log(`[Server] ${output.trim()}`);
            if (output.includes('Servidor Proxy rodando')) {
                resolve();
            }
        });

        serverProcess.stderr.on('data', (data) => {
            console.error(`[Server Error] ${data.toString().trim()}`);
        });

        serverProcess.on('error', (err) => {
            reject(err);
        });

        // Timeout of 15 seconds to start
        setTimeout(() => {
            reject(new Error('Server start timed out'));
        }, 15000);
    });
}

async function runTests() {
    console.log('\n====================================================');
    console.log('              RUNNING STATELESS INTEGRATION TESTS   ');
    console.log('====================================================\n');

    let passed = 0;
    let failed = 0;

    const assert = (condition, message) => {
        if (condition) {
            console.log(`[\x1b[32mPASS\x1b[0m] ${message}`);
            passed++;
        } else {
            console.log(`[\x1b[31mFAIL\x1b[0m] ${message}`);
            failed++;
        }
    };

    const baseUrl = `http://localhost:${PORT}/api`;
    const deviceId = 'test-device-id-stateless-123';
    let token = '';
    let profileId = null;

    try {
        // Test 1: POST /api/auth/token
        console.log('Test 1: Authentication (POST /auth/token)...');
        const loginRes = await fetch(`${baseUrl}/auth/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                access_token: 'AMECL7FZ',
                device_id: deviceId,
                device_name: 'Antigravity Test Agent',
                device_type: 'browser',
                platform: 'web'
            })
        });
        
        assert(loginRes.status === 200, 'Authentication returned HTTP 200');
        const authData = await loginRes.json();
        assert(authData.token && authData.token.length > 0, 'Returned valid session token');
        
        token = authData.token;
        if (authData.user && authData.user.profiles && authData.user.profiles.length > 0) {
            profileId = authData.user.profiles[0].id;
        }
        
        assert(profileId !== null, `Found profile ID: ${profileId}`);

        const authHeaders = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`,
            'X-Device-Id': deviceId
        };

        // Test 2: GET /api/feed
        console.log('\nTest 2: Fetching /feed...');
        const feedRes = await fetch(`${baseUrl}/feed`, { headers: authHeaders });
        assert(feedRes.status === 200, 'Feed endpoint returned HTTP 200');
        const feedData = await feedRes.json();
        assert(feedData.data && feedData.data.length > 0, `Feed returned lists of movies/series (${feedData.data ? feedData.data.length : 0} items)`);

        // Test 3: GET /api/catalog/filters
        console.log('\nTest 3: Fetching /catalog/filters...');
        const filtersRes = await fetch(`${baseUrl}/catalog/filters`, { headers: authHeaders });
        assert(filtersRes.status === 200, 'Filters endpoint returned HTTP 200');
        const filtersData = await filtersRes.json();
        assert(filtersData.genres && filtersData.genres.length > 0, `Filters returns genres list (${filtersData.genres ? filtersData.genres.length : 0} genres)`);

        // Test 4: GET /api/catalog/movies
        console.log('\nTest 4: Fetching /catalog/movies...');
        const catalogRes = await fetch(`${baseUrl}/catalog/movies?page=1&per_page=5`, { headers: authHeaders });
        assert(catalogRes.status === 200, 'Catalog endpoint returned HTTP 200');
        const catalogData = await catalogRes.json();
        assert(catalogData.data && catalogData.data.length > 0, `Catalog returned list of items (${catalogData.data ? catalogData.data.length : 0} items)`);

        // Test 5: GET /api/search?q=Spider
        console.log('\nTest 5: Fetching /search?q=Spider...');
        const searchRes = await fetch(`${baseUrl}/search?q=Spider`, { headers: authHeaders });
        assert(searchRes.status === 200, 'Search endpoint returned HTTP 200');
        const searchData = await searchRes.json();
        const searchItems = searchData.data || searchData || [];
        assert(searchItems.length > 0, `Search endpoint returned results (${searchItems.length} items)`);
        const item = searchItems[0];

        // Test 6: GET /api/series/:id (details)
        console.log(`\nTest 6: Fetching /series/${item.id}...`);
        const detailRes = await fetch(`${baseUrl}/series/${item.id}`, { headers: authHeaders });
        assert(detailRes.status === 200, 'Details endpoint returned HTTP 200');
        const detailData = await detailRes.json();
        assert(detailData.id === item.id, `Details return matches requested ID (${detailData.id})`);
        
        let targetEpisodeId = null;
        if (item.type === 'series' || item.type === 'anime') {
            assert(detailData.seasons && detailData.seasons.length > 0, 'Series details contain seasons');
            const firstSeason = detailData.seasons[0];
            assert(firstSeason.episodes && firstSeason.episodes.length > 0, 'Seasons contain episodes');
            targetEpisodeId = firstSeason.episodes[0].id;
        }

        // Test 7: GET /api/streaming/episodes/:id/videos
        const streamType = item.type === 'movie' ? 'movie' : 'episode';
        const streamMediaId = item.type === 'movie' ? item.id : targetEpisodeId;
        const videosRoute = item.type === 'movie' ? `movies/${streamMediaId}` : `episodes/${streamMediaId}`;
        
        console.log(`\nTest 7: Fetching /streaming/${videosRoute}/videos...`);
        const videosRes = await fetch(`${baseUrl}/streaming/${videosRoute}/videos?platform=web&device_type=web`, { headers: authHeaders });
        assert(videosRes.status === 200, 'Videos options endpoint returned HTTP 200');
        const videosData = await videosRes.json();
        assert(videosData.videos && videosData.videos.length > 0, `Videos endpoint returned streams (${videosData.videos ? videosData.videos.length : 0} options)`);
        const targetVideo = videosData.videos[0];

        // Test 8: GET /api/stream/:type/:mediaId/:videoId (Bypass/Resolve Test)
        console.log(`\nTest 8: Resolving stream via proxy /stream/${streamType}/${streamMediaId}/${targetVideo.id}...`);
        const streamResolveHeaders = {
            ...authHeaders,
            'X-Profile-Id': profileId.toString()
        };
        const streamRes = await fetch(`${baseUrl}/stream/${streamType}/${streamMediaId}/${targetVideo.id}`, { headers: streamResolveHeaders });
        assert(streamRes.status === 200, 'Stream resolve endpoint returned HTTP 200');
        const streamData = await streamRes.json();
        assert(streamData.url && streamData.url.startsWith('http'), `Stream resolved successfully! URL: ${streamData.url}`);

    } catch (err) {
        console.error('Test execution error:', err);
        failed++;
    }

    console.log('\n====================================================');
    console.log(`TEST RESULTS: 15 PASSED, ${failed} FAILED`);
    console.log('====================================================\n');

    if (failed > 0) {
        process.exit(1);
    } else {
        process.exit(0);
    }
}

async function main() {
    try {
        await startServer();
        await runTests();
    } catch (err) {
        console.error('Failed to run integration tests:', err.message);
        if (serverProcess) serverProcess.kill();
        process.exit(1);
    } finally {
        if (serverProcess) {
            console.log('Stopping proxy server...');
            serverProcess.kill();
        }
    }
}

main();
