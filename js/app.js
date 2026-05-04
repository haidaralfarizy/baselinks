let appMode = 'export';

function setMode(mode) {
    appMode = mode;
    
    document.getElementById('btn-mode-export').classList.toggle('active', mode === 'export');
    document.getElementById('btn-mode-analyze').classList.toggle('active', mode === 'analyze');
    
    const dropText = document.getElementById('drop-text');
    if (mode === 'export') {
        dropText.innerText = "Drop your Markdown folder here to export";
    } else {
        dropText.innerText = "Drop your Markdown folder here to analyze";
    }
}

function showLoading(status) {
    const loadingStatus = document.getElementById('loading-status');
    if (loadingStatus) loadingStatus.textContent = status || 'Processing...';
    document.getElementById('loading-overlay').classList.remove('hidden');
}

function hideLoading() {
    document.getElementById('loading-overlay').classList.add('hidden');
}

const dropzone = document.getElementById('dropzone');
const folderInput = document.getElementById('folder-input');

dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
});

dropzone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
});

dropzone.addEventListener('drop', async (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    
    const markdownFiles = [];
    const imageFiles = [];

    const items = e.dataTransfer.items;
    
    for (let i = 0; i < items.length; i++) {
        const item = items[i].webkitGetAsEntry();
        if (item) {
            const result = await processEntry(item, "");
            markdownFiles.push(...result.mdFiles);
            imageFiles.push(...result.imgFiles);
        }
    }

    if (markdownFiles.length > 0) {
        showLoading('Parsing Markdown files...');
        const compiledHTML = await parseMarkdownFiles(markdownFiles, imageFiles);
        
        if (appMode === 'export') {
            showLoading('Bundling your site...');
            await buildAndDownloadZip(compiledHTML, imageFiles);
        } else if (appMode === 'analyze') {
            hideLoading();
            document.getElementById('analysis-overlay').classList.remove('hidden');
            runVaultAnalysis(compiledHTML, markdownFiles);
        }
    } else {
        showFailure();
    }
});

dropzone.addEventListener('click', () => {
    folderInput.click();
});

folderInput.addEventListener('change', async (e) => {
    const files = e.target.files;
    if (files.length === 0) return;

    const markdownFiles = [];
    const imageFiles = [];

    for (const file of files) {
        const path = file.webkitRelativePath;
        
        if (path.endsWith('.md')) {
            markdownFiles.push({ file, path });
        } else if (path.match(/\.(png|jpe?g|gif|svg|webp)$/i)) {
            imageFiles.push({ file, path });
        }
    }

    if (markdownFiles.length > 0) {
        showLoading('Parsing Markdown files...');
        const compiledHTML = await parseMarkdownFiles(markdownFiles, imageFiles);
        
        if (appMode === 'export') {
            showLoading('Bundling your site...');
            await buildAndDownloadZip(compiledHTML, imageFiles);
        } else if (appMode === 'analyze') {
            hideLoading();
            document.getElementById('analysis-overlay').classList.remove('hidden');
            runVaultAnalysis(compiledHTML, markdownFiles);
        }
    } else { 
        showFailure();
    }
});

async function processEntry(entry, path) {
    const results = { mdFiles: [], imgFiles: [] };
    
    if (entry.isFile) {
        if (entry.name.endsWith('.md')) {
            const file = await getFileFromEntry(entry);
            results.mdFiles.push({ file, path: path + entry.name });
        }
        else if (entry.name.match(/\.(png|jpe?g|gif|svg|webp)$/i)) {
            const file = await getFileFromEntry(entry);
            results.imgFiles.push({ file, path: path + entry.name });
        }
    } else if (entry.isDirectory) {
        const dirReader = entry.createReader();
        const entries = await readAllDirectoryEntries(dirReader);
        
        for (const childEntry of entries) {
            const childResults = await processEntry(childEntry, path + entry.name + '/');
            results.mdFiles.push(...childResults.mdFiles);
            results.imgFiles.push(...childResults.imgFiles);
        }
    }
    return results;
}

function getFileFromEntry(fileEntry) {
    return new Promise((resolve, reject) => {
        fileEntry.file(resolve, reject);
    });
}

function readAllDirectoryEntries(dirReader) {
    return new Promise((resolve, reject) => {
        let allEntries = [];
        
        function readNextBatch() {
            dirReader.readEntries((entries) => {
                if (entries.length === 0) {
                    resolve(allEntries);
                } else {
                    allEntries = allEntries.concat(entries);
                    readNextBatch();
                }
            }, reject);
        }
        readNextBatch();
    });
}

function closeOverlay() {
    document.getElementById('success-overlay').classList.add('hidden');
}

function showFailure(customTitle, customMessage) {
    hideLoading();
    const failureOverlay = document.getElementById('failure-overlay');
    
    if (customTitle && customMessage) {
        failureOverlay.querySelector('h2').textContent = customTitle;
        failureOverlay.querySelector('p').textContent = customMessage;
        failureOverlay.querySelector('.close-btn').textContent = 'Try again';
    } else {
        failureOverlay.querySelector('h2').textContent = 'Parsing failed';
        failureOverlay.querySelector('p').textContent = 'No Markdown files were detected in the selected folder. Please ensure you are uploading a valid vault.';
        failureOverlay.querySelector('.close-btn').textContent = 'Try again';
    }
    
    failureOverlay.classList.remove('hidden');
}

function closeFailureOverlay() {
    document.getElementById('failure-overlay').classList.add('hidden');
}

function closeAnalysis() {
    document.getElementById('analysis-overlay').classList.add('hidden');
}

function renderGraph(nodesData, linksData) {
    const container = document.getElementById('vault-graph');
    if (!container) return;

    container.innerHTML = '';

    const Graph = ForceGraph()(container)
        .graphData({ nodes: nodesData, links: linksData })
        .nodeLabel('name')
        .nodeRelSize(4)
        .nodeVal(node => node.val)
        .nodeColor(node => {
            const opacity = Math.min(1, 0.2 + (node.val * 0.08));
            return `rgba(59, 54, 47, ${opacity})`;
        })
        .linkColor(() => 'rgba(59, 54, 47, 0.15)')
        .backgroundColor('transparent')
        .width(container.clientWidth)
        .height(container.clientHeight)
        .d3VelocityDecay(0.3)
        .nodeCanvasObjectMode(() => 'after')
        .nodeCanvasObject((node, ctx, globalScale) => {
            if (globalScale >= 2) {
                const label = node.name;
                const fontSize = 12 / globalScale;
                ctx.font = `${fontSize}px "Merriweather", serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = 'rgba(59, 54, 47, 0.9)';
                
                const nodeRadius = Math.sqrt(node.val) * 4;
                ctx.fillText(label, node.x, node.y + nodeRadius + (fontSize / 1.5));
            }
        });

        Graph.d3Force('charge').strength(-150);
        Graph.d3Force('link').distance(40);

        container.addEventListener('wheel', (event) => {
        event.preventDefault();
        event.stopImmediatePropagation();

        const currentZoom = Graph.zoom();
        const targetZoom = event.deltaY < 0 ? currentZoom * 1.5 : currentZoom / 1.5;
        
        Graph.zoom(targetZoom, 250);
    }, { capture: true, passive: false });

    window.addEventListener('resize', () => {
        Graph.width(container.clientWidth).height(container.clientHeight);
    });
}

async function runVaultAnalysis(parsedData, markdownFiles) {
    const grid = document.getElementById('analysis-grid');
    
    let totalWords = 0;
    const noteStats = [];
    const graph = {}; 
    const nodesData = []; 
    const linksData = []; 
    
    for (const md of markdownFiles) {
        const title = md.file.name.replace(/\.md$/i, '');
        graph[title.toLowerCase()] = { title, incoming: 0, outgoing: 0 };
    }

    const brokenLinks = [];

    for (const item of parsedData) {
        const plainText = item.html.replace(/<[^>]*>?/gm, '').trim();
        const words = plainText ? plainText.split(/\s+/).length : 0;
        totalWords += words;

        const readingTime = Math.ceil(words / 200);
        const title = decodeURIComponent(item.exportPath.split('/').pop().replace('.html', ''));
        noteStats.push({ title, words, readingTime });
    }

    for (const md of markdownFiles) {
        const sourceTitle = md.file.name.replace(/\.md$/i, '');
        const sourceKey = sourceTitle.toLowerCase();
        
        const rawText = await md.file.text();
        const foundLinks = new Set();

        const wikiRegex = /\[\[(.*?)\]\]/g;
        let match;
        while ((match = wikiRegex.exec(rawText)) !== null) {
            let targetTitle = match[1].split('|')[0].split('#')[0].trim();
            foundLinks.add(targetTitle);
        }

        const mdLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
        while ((match = mdLinkRegex.exec(rawText)) !== null) {
            const linkUrl = match[2];
            if (linkUrl.startsWith('http') || linkUrl.startsWith('#')) continue;
            try {
                let cleanUrl = decodeURIComponent(linkUrl.split('#')[0].split('?')[0]);
                let targetTitle = cleanUrl.split('/').pop().replace(/\.(html|md)$/i, '');
                foundLinks.add(targetTitle);
            } catch (e) {}
        }

        for (const targetTitle of foundLinks) {
            const targetKey = targetTitle.toLowerCase();
            if (targetKey === sourceKey) continue; 

            if (graph[sourceKey]) graph[sourceKey].outgoing++;

            if (graph[targetKey]) {
                graph[targetKey].incoming++;
                linksData.push({ source: sourceTitle, target: graph[targetKey].title });
            } else {
                brokenLinks.push({ source: sourceTitle, missing: targetTitle });
            }
        }
    }

    const totalNotes = parsedData.length;
    const avgLength = totalNotes > 0 ? Math.round(totalWords / totalNotes) : 0;

    const orphans = [];
    const mostLinked = [];
    const mostOutgoing = [];

    for (const key in graph) {
        const node = graph[key];
        if (node.incoming === 0 && node.outgoing === 0) {
            orphans.push(node.title);
        }
        mostLinked.push({ title: node.title, incoming: node.incoming });
        mostOutgoing.push({ title: node.title, outgoing: node.outgoing }); 
        
        nodesData.push({
            id: node.title,
            name: node.title,
            val: (node.incoming + node.outgoing) * 0.5 + 1 
        });
    }

    noteStats.sort((a, b) => b.readingTime - a.readingTime);
    mostLinked.sort((a, b) => b.incoming - a.incoming);
    mostOutgoing.sort((a, b) => b.outgoing - a.outgoing); 
    
    const topHubs = mostLinked.filter(h => h.incoming > 0);
    const topSwitchboards = mostOutgoing.filter(h => h.outgoing > 0); 

    const tableRows = noteStats.map(stat => `
        <tr>
            <td style="padding: 0.8rem 0.5rem; border-bottom: 1px solid rgba(0,0,0,0.1);">${stat.title}</td>
            <td style="padding: 0.8rem 0.5rem; border-bottom: 1px solid rgba(0,0,0,0.1); text-align: right; color: #8c8273;">${stat.words}</td>
            <td style="padding: 0.8rem 0.5rem; border-bottom: 1px solid rgba(0,0,0,0.1); text-align: right; font-weight: bold;">${stat.readingTime} min</td>
        </tr>
    `).join('');

    const hubsHTML = topHubs.length > 0 
        ? topHubs.map(h => `<li style="margin-bottom: 0.5rem;"><strong>${h.title}</strong><br><span style="font-size: 0.85rem; color: var(--text-primary); opacity: 0.6;">&rarr; ${h.incoming} incoming links</span></li>`).join('')
        : '<li style="color: var(--text-primary); opacity: 0.6;">No internal links found.</li>';

    const brokenHTML = brokenLinks.length > 0
        ? brokenLinks.map(b => `<li style="margin-bottom: 0.5rem; color: #a65a28;"><strong>${b.missing}</strong><br><span style="font-size: 0.85rem; color: var(--text-primary); opacity: 0.6;">Linked in: ${b.source}</span></li>`).join('')
        : '<li style="color: var(--text-primary); opacity: 0.6;">All links are healthy!</li>';

    const switchboardsHTML = topSwitchboards.length > 0 
        ? topSwitchboards.map(h => `<li style="margin-bottom: 0.5rem;"><strong>${h.title}</strong><br><span style="font-size: 0.85rem; color: var(--text-primary); opacity: 0.6;">&rarr; ${h.outgoing} outgoing links</span></li>`).join('')
        : '<li style="color: var(--text-primary); opacity: 0.6;">No outgoing links found.</li>';

    grid.innerHTML = `
        <div style="grid-column: 1 / -1; border: 1px solid var(--text-primary); padding: 0; position: relative;">
            <h3 style="position: absolute; top: 1.5rem; left: 1.5rem; margin: 0; color: var(--text-primary); opacity: 0.6; font-size: 0.9rem; text-transform: uppercase; z-index: 10; pointer-events: none;">Knowledge Graph</h3>
            <div id="vault-graph" style="height: 450px; width: 100%; cursor: grab;"></div>
        </div>

        <div style="border: 1px solid var(--text-primary); padding: 1.5rem;">
            <h3 style="margin-top: 0; color: var(--text-primary); opacity: 0.6; font-size: 0.9rem; text-transform: uppercase;">Total Count</h3>
            <p style="font-size: 2.5rem; font-weight: bold; margin: 0;">${totalNotes} <span style="font-size: 1rem; font-weight: normal;">notes</span></p>
        </div>
        <div style="border: 1px solid var(--text-primary); padding: 1.5rem;">
            <h3 style="margin-top: 0; color: var(--text-primary); opacity: 0.6; font-size: 0.9rem; text-transform: uppercase;">Average Length</h3>
            <p style="font-size: 2.5rem; font-weight: bold; margin: 0;">${avgLength} <span style="font-size: 1rem; font-weight: normal;">words</span></p>
        </div>
        <div style="border: 1px solid var(--text-primary); padding: 1.5rem;">
            <h3 style="margin-top: 0; color: var(--text-primary); opacity: 0.6; font-size: 0.9rem; text-transform: uppercase;">Orphaned Count</h3>
            <p style="font-size: 2.5rem; font-weight: bold; margin: 0;">${orphans.length} <span style="font-size: 1rem; font-weight: normal;">notes</span></p>
        </div>

        <div style="border: 1px solid var(--text-primary); padding: 1.5rem; grid-column: span 1; display: flex; flex-direction: column; max-height: 350px;">
            <h3 style="margin-top: 0; margin-bottom: 1rem; color: var(--text-primary); opacity: 0.6; font-size: 0.9rem; text-transform: uppercase;">Most Linked</h3>
            <ul style="padding-left: 1.2rem; padding-right: 0.5rem; margin: 0; overflow-y: auto; flex-grow: 1;">${hubsHTML}</ul>
        </div>
        <div style="border: 1px solid var(--text-primary); padding: 1.5rem; grid-column: span 1; display: flex; flex-direction: column; max-height: 350px;">
            <h3 style="margin-top: 0; margin-bottom: 1rem; color: var(--text-primary); opacity: 0.6; font-size: 0.9rem; text-transform: uppercase;">Unresolved Links</h3>
            <ul style="padding-left: 1.2rem; padding-right: 0.5rem; margin: 0; overflow-y: auto; flex-grow: 1;">${brokenHTML}</ul>
        </div>
        <div style="border: 1px solid var(--text-primary); padding: 1.5rem; grid-column: span 1; display: flex; flex-direction: column; max-height: 350px;">
            <h3 style="margin-top: 0; margin-bottom: 1rem; color: var(--text-primary); opacity: 0.6; font-size: 0.9rem; text-transform: uppercase;">Most Outbound</h3>
            <ul style="padding-left: 1.2rem; padding-right: 0.5rem; margin: 0; overflow-y: auto; flex-grow: 1;">${switchboardsHTML}</ul>
        </div>

        <div style="grid-column: 1 / -1; border: 1px solid var(--text-primary); padding: 0;">
            <div style="max-height: 350px; overflow-y: auto; padding: 1.5rem;">
                <h3 style="margin-top: 0; margin-bottom: 1.5rem; color: var(--text-primary); opacity: 0.6; font-size: 0.9rem; text-transform: uppercase;">Word Count and Reading Time</h3>
                <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.95rem;">
                    <thead>
                        <tr>
                            <th style="padding: 0.5rem; border-bottom: 1px solid var(--text-primary); position: sticky; top: -1.5rem; background: var(--bg-color);">Note Title</th>
                            <th style="padding: 0.5rem; border-bottom: 1px solid var(--text-primary); text-align: right; position: sticky; top: -1.5rem; background: var(--bg-color);">Word Count</th>
                            <th style="padding: 0.5rem; border-bottom: 1px solid var(--text-primary); text-align: right; position: sticky; top: -1.5rem; background: var(--bg-color);">Est. Time</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows}
                    </tbody>
                </table>
            </div>
        </div>
    `;

    setTimeout(() => {
        renderGraph(nodesData, linksData);
    }, 50);
}