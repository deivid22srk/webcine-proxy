const { spawn } = require('child_process');
const http = require('http');

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
            if (output.includes('Autenticado com sucesso!')) {
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
    console.log('              RUNNING INTEGRATION TESTS             ');
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

    try {
        // Test 1: GET /api/status
        console.log('Test 1: Verification /status...');
        const statusRes = await fetch(`${baseUrl}/status`);
        assert(statusRes.status === 200, 'Status endpoint returned HTTP 200');
        const statusData = await statusRes.json();
        assert(statusData.ready === true, 'Status reports ready = true');
        assert(statusData.profilesList.length > 0, `Status returns profiles list (${statusData.profilesList.length} profiles)`);

        // Test 2: GET /api/feed
        console.log('\nTest 2: Verification /feed...');
        const feedRes = await fetch(`${baseUrl}/feed`);
        assert(feedRes.status === 200, 'Feed endpoint returned HTTP 200');
        const feedData = await feedRes.json();
        assert(feedData.data && feedData.data.length > 0, `Feed returned lists of movies/series (${feedData.data ? feedData.data.length : 0} items)`);

        // Test 3: GET /api/filters
        console.log('\nTest 3: Verification /filters...');
        const filtersRes = await fetch(`${baseUrl}/filters`);
        assert(filtersRes.status === 200, 'Filters endpoint returned HTTP 200');
        const filtersData = await filtersRes.json();
        assert(filtersData.genres && filtersData.genres.length > 0, `Filters returns genres list (${filtersData.genres ? filtersData.genres.length : 0} genres)`);
        assert(filtersData.years && filtersData.years.length > 0, `Filters returns years list (${filtersData.years ? filtersData.years.length : 0} years)`);

        // Test 4: GET /api/catalog
        console.log('\nTest 4: Verification /catalog...');
        const catalogRes = await fetch(`${baseUrl}/catalog?type=movies&page=1`);
        assert(catalogRes.status === 200, 'Catalog endpoint returned HTTP 200');
        const catalogData = await catalogRes.json();
        assert(catalogData.data && catalogData.data.length > 0, `Catalog returned list of items (${catalogData.data ? catalogData.data.length : 0} items)`);

        // Test 5: GET /api/search
        console.log('\nTest 5: Verification /search...');
        const searchRes = await fetch(`${baseUrl}/search?q=Spider`);
        assert(searchRes.status === 200, 'Search endpoint returned HTTP 200');
        const searchData = await searchRes.json();
        const searchItems = searchData.data || searchData || [];
        assert(searchItems.length > 0, `Search endpoint returned results (${searchItems.length} items)`);
        const item = searchItems[0];

        // Test 6: GET /api/media/:type/:id
        console.log(`\nTest 6: Verification /media/${item.type}/${item.id}...`);
        const detailRes = await fetch(`${baseUrl}/media/${item.type}/${item.id}`);
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

        // Test 7: GET /api/videos/:type/:mediaId
        const streamType = item.type === 'movie' ? 'movie' : 'episode';
        const streamMediaId = item.type === 'movie' ? item.id : targetEpisodeId;
        console.log(`\nTest 7: Verification /videos/${streamType}/${streamMediaId}...`);
        const videosRes = await fetch(`${baseUrl}/videos/${streamType}/${streamMediaId}`);
        assert(videosRes.status === 200, 'Videos options endpoint returned HTTP 200');
        const videosData = await videosRes.json();
        assert(videosData.videos && videosData.videos.length > 0, `Videos endpoint returned streams (${videosData.videos ? videosData.videos.length : 0} options)`);
        const targetVideo = videosData.videos[0];

        // Test 8: GET /api/stream/:type/:mediaId/:videoId (Bypass/Resolve Test)
        console.log(`\nTest 8: Verification /stream/${streamType}/${streamMediaId}/${targetVideo.id}...`);
        const streamRes = await fetch(`${baseUrl}/stream/${streamType}/${streamMediaId}/${targetVideo.id}`);
        assert(streamRes.status === 200, 'Stream resolve endpoint returned HTTP 200');
        const streamData = await streamRes.json();
        assert(streamData.url && streamData.url.startsWith('http'), `Stream resolved successfully! URL: ${streamData.url}`);

    } catch (err) {
        console.error('Test execution error:', err);
        failed++;
    }

    console.log('\n====================================================');
    console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
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
