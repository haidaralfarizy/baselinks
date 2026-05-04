async function buildAndDownloadZip(parsedData, imageFiles) {
    const zip = new JSZip();

    let cssContent, fuseContent, graphContent;

    try {
        const cssResponse = await fetch('css/template.css');
        if (!cssResponse.ok) throw new Error(`Failed to load CSS (HTTP ${cssResponse.status})`);
        cssContent = await cssResponse.text();

        const fuseResponse = await fetch('lib/fuse.min.js');
        if (!fuseResponse.ok) throw new Error(`Failed to load Fuse.js (HTTP ${fuseResponse.status})`);
        fuseContent = await fuseResponse.text();

        const graphResponse = await fetch('lib/force-graph.min.js');
        if (!graphResponse.ok) throw new Error(`Failed to load force-graph (HTTP ${graphResponse.status})`);
        graphContent = await graphResponse.text();
    } catch (error) {
        hideLoading();
        console.error('Asset loading failed:', error);
        showFailure('Asset loading failed', `Baselinks could not load its template files. This usually happens when opened from a local file (file://). Please run Baselinks from a web server. Details: ${error.message}`);
        return;
    }

    const fileTree = {};
    for (const item of parsedData) {
        const parts = item.exportPath.split('/');
        let currentLevel = fileTree;
        
        for (let i = 0; i < parts.length; i++) {
            if (i === parts.length - 1) {
                currentLevel[parts[i]] = item.exportPath;
            } else {
                currentLevel[parts[i]] = currentLevel[parts[i]] || {};
                currentLevel = currentLevel[parts[i]];
            }
        }
    }

    let rootFolderName = "";
    if (parsedData.length > 0) {
        rootFolderName = parsedData[0].exportPath.split('/')[0];
    } else {
        rootFolderName = "vault-export";
    }

    const searchIndex = parsedData.map(item => {
        const plainText = item.html.replace(/<[^>]*>?/gm, ''); 
        return {
            title: item.exportPath.split('/').pop().replace('.html', ''),
            path: item.exportPath.substring(rootFolderName.length + 1),
            snippet: plainText.substring(0, 150).replace(/\n/g, ' ') + '...'
        };
    });

    const graphNodes = {};
    const linksData = [];
    const backlinksMap = {};

    parsedData.forEach(item => {
        const title = item.exportPath.split('/').pop().replace('.html', '');
        const relativePath = item.exportPath.substring(rootFolderName.length + 1);
        graphNodes[title.toLowerCase()] = { id: title, name: title, path: relativePath, val: 1 };
    });

    parsedData.forEach(item => {
        const sourceTitle = item.exportPath.split('/').pop().replace('.html', '');
        const sourceKey = sourceTitle.toLowerCase();
        const sourceRelativePath = item.exportPath.substring(rootFolderName.length + 1);
        const hrefRegex = /href=["']([^"']+)["']/g;
        let match;
        
        while ((match = hrefRegex.exec(item.html)) !== null) {
            const linkUrl = match[1];
            if (linkUrl.startsWith('http') || linkUrl.startsWith('#') || linkUrl.startsWith('data:')) continue;

            try {
                let cleanUrl = linkUrl.split('#')[0].split('?')[0];
                let targetTitle = decodeURIComponent(cleanUrl.split('/').pop().replace(/\.(html|md)$/i, ''));
                let targetKey = targetTitle.toLowerCase();

                if (graphNodes[targetKey] && targetKey !== sourceKey) {
                    linksData.push({ source: graphNodes[sourceKey].id, target: graphNodes[targetKey].id });
                    graphNodes[sourceKey].val += 0.5;
                    graphNodes[targetKey].val += 0.5;
                }

                if (!backlinksMap[targetKey]) {
                    backlinksMap[targetKey] = new Map();
                }
                
                backlinksMap[targetKey].set(sourceKey, {
                    title: sourceTitle,
                    path: sourceRelativePath
                });
            } catch (e) {}
        }
    });

    const nodesData = Object.values(graphNodes);

    function generateSidebarHTML(tree, currentDepth) {
        let html = '<ul class="nav-list">';
        
        const keys = Object.keys(tree)
            .filter(key => !key.startsWith('.'))
            .sort((a, b) => {
            const isAFolder = typeof tree[a] === 'object';
            const isBFolder = typeof tree[b] === 'object';
            if (isAFolder && !isBFolder) return -1;
            if (!isAFolder && isBFolder) return 1;
            return a.localeCompare(b);
        });

        for (const key of keys) {
            if (typeof tree[key] === 'string') {
                const prefix = "../".repeat(currentDepth);
                const title = key.replace('.html', '');
                const safePath = tree[key].split('/').map(part => encodeURIComponent(part)).join('/');
                html += `<li><a href="${prefix}${safePath}" class="nav-link">${title}</a></li>`;
            } else {
                html += `
                <li class="nav-folder">
                    <details open>
                        <summary>${key}</summary>
                        ${generateSidebarHTML(tree[key], currentDepth)}
                    </details>
                </li>`;
            }
        }
        html += '</ul>';
        return html;
    }

    for (const item of parsedData) {
        const currentDepth = item.exportPath.split('/').length - 1;
        const sidebarHTML = generateSidebarHTML(fileTree[rootFolderName], currentDepth);
        const rootPath = `${"../".repeat(currentDepth)}${encodeURIComponent(rootFolderName)}/`;
        const currentTitle = item.exportPath.split('/').pop().replace('.html', '');
        const currentKey = currentTitle.toLowerCase();
        
        let backlinksHTML = '';
        if (backlinksMap[currentKey] && backlinksMap[currentKey].size > 0) {
            const links = Array.from(backlinksMap[currentKey].values());
            backlinksHTML = `
                <div class="backlinks-section" style="margin-top: 4rem; padding-top: 2rem; border-top: 1px solid rgba(0,0,0,0.1);">
                    <h3 style="font-size: 0.85rem; text-transform: uppercase; opacity: 0.6; margin-bottom: 1rem; letter-spacing: 0.05em; font-family: inherit;">Linked to this note</h3>
                    <div style="display: grid; gap: 0.5rem; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));">
                        ${links.map(link => {
                            const safeLinkPath = link.path.split('/').map(part => encodeURIComponent(part)).join('/');
                            return `
                            <a href="${rootPath}${safeLinkPath}" style="text-decoration: none; color: var(--text-color); padding: 0.8rem 1rem; border: 1px solid rgba(0,0,0,0.1); border-radius: 6px; font-size: 0.9rem; transition: all 0.2s ease; display: flex; align-items: center; gap: 0.5rem; background: rgba(0,0,0,0.02);">
                                <span style="opacity: 0.4; font-size: 1.1rem;">&boxur;</span> ${link.title}
                            </a>`
                        }).join('')}
                    </div>
                </div>
            `;
        }

        const fullHTML = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>${item.exportPath.split('/').pop().replace('.html', '')}</title>
                <link rel="stylesheet" href="${rootPath}.css/template.css">
                <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='450 350 1100 1100'%3E%3Cstyle%3Epath%7Bfill:%232c2825;%7D@media (prefers-color-scheme: dark)%7Bpath%7Bfill:%23fbf0d9;%7D%7D%3C/style%3E%3Cpath d='M496 549.2v53.1l46.3-.6c26.4-.4 55-1.3 66.7-2.2 39.4-3 49.7-3.5 80-3.5 74.4 0 128.7 8.8 164.1 26.5 24 12.1 45.1 33.4 55.5 56 12.7 27.9 15.7 66.3 7.9 100.7C903.4 837.5 858.9 880 796 894.4l-10.5 2.5h9c22.2.3 55.9 6 74.2 12.6 47.4 17 79.2 49.8 90.4 93 3.5 13.5 4.9 25.3 4.9 42.7 0 45-11.5 81.8-35.6 113.8-9.8 13-28.6 31-41 39.3-33.4 22.2-79.7 35.6-141.9 40.9-19.3 1.7-86.7 1.7-112.5 0-41.5-2.7-57.7-3.2-96.7-3.2H496v268h1008V496H496zm852 841.3v29.5H652v-59h696z'/%3E%3Cpath d='M637 649.6c-11.3.7-21.1 1.6-21.7 1.9-1 .3-1.3 23.8-1.3 113.4v112.9l2.3.6c1.2.3 21.1.6 44.2.6 54.9 0 64.7-1.4 84.6-11.6 26.3-13.5 43-40.9 49.1-80.4 1.8-11.6 1.8-52.2-.1-61.5-3.9-20.4-8.5-32-17.5-43.8-11.9-15.9-27.2-24.4-54.6-30.3-10.3-2.3-14.2-2.6-38-2.9-16.4-.2-34.3.2-47 1.1M625 939c-5.8.4-10.6.8-10.7.9-.2 0-.3 53.9-.3 119.6V1179l2.8 1.1c17.6 6.9 82.3 9.2 111.7 4 42.2-7.5 67.2-24.5 83.2-56.6 17.1-34.2 20.2-89 7.2-127.8-11-32.9-34.8-51.4-75.9-58.9-10.5-1.9-15.6-2.1-59.5-2.3-26.4-.2-52.7.1-58.5.5'/%3E%3C/svg%3E">
                <script>const BASELINKS_ROOT = "${rootPath}";</script>
                <script>const CURRENT_NODE_ID = "${currentTitle.replace(/"/g, '\\"')}";</script>
            </head>
            <body>
                <div class="layout">
                    <aside class="sidebar">
                        <div class="sidebar-header">
                            <span class="vault-name">${rootFolderName}</span>
                        </div>
                        <div class="search-container">
                            <input type="text" id="search-input" placeholder="Search notes... (Ctrl+K)" autocomplete="off">
                            <div id="search-results" class="search-results hidden"></div>
                        </div>
                        
                        <div class="sidebar-graph-container" style="margin: 1rem 0; padding: 0 1rem;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                                <h3 style="font-size: 0.75rem; text-transform: uppercase; opacity: 0.6; margin: 0; letter-spacing: 0.05em; font-family: inherit;">Knowledge Graph</h3>
                                <div class="graph-toggle" style="display: flex; gap: 0.2rem; background: rgba(0,0,0,0.05); padding: 0.2rem; border-radius: 4px;">
                                    <button id="btn-local-graph" style="background: transparent; color: var(--text-color); opacity: 0.6; border: none; padding: 0.2rem 0.5rem; font-size: 0.6rem; border-radius: 3px; cursor: pointer; font-weight: bold; transition: all 0.2s ease;">LOCAL</button>
                                    <button id="btn-global-graph" style="background: var(--text-color); color: var(--bg-color); border: none; padding: 0.2rem 0.5rem; font-size: 0.6rem; border-radius: 3px; cursor: pointer; font-weight: bold; transition: all 0.2s ease;">GLOBAL</button>
                                </div>
                            </div>
                            <div id="sidebar-graph" style="height: 200px; width: 100%; border: 1px solid rgba(0,0,0,0.1); border-radius: 4px; overflow: hidden; cursor: grab;"></div>
                        </div>

                        <nav>
                            ${sidebarHTML}
                        </nav>
                        <footer class="sidebar-footer">
                            <div class="footer-logo"></div>
                            <span>Generated using Baselinks</span>
                        </footer>
                    </aside>
                    
                    <main class="content-pane">
                        <div class="content-inner">
                            ${item.html}
                            ${backlinksHTML}
                        </div>
                    </main>
                </div>
                <script src="${rootPath}.lib/fuse.min.js"></script>
                <script src="${rootPath}.lib/force-graph.min.js"></script>
                <script src="${rootPath}.js/search-index.js"></script>
                <script src="${rootPath}.js/graph-data.js"></script>
                <script src="${rootPath}.js/search.js"></script>
                <script src="${rootPath}.js/graph-render.js"></script>
            </body>
            </html>
        `;

        zip.file(item.exportPath, fullHTML);
    }

    const firstNotePath = parsedData.length > 0 ? parsedData[0].exportPath : "#";
    let safeFirstNotePath = "#";

    if (parsedData.length > 0) {
        const fullPath = parsedData[0].exportPath;
        const relativePath = fullPath.substring(rootFolderName.length + 1); 
        safeFirstNotePath = relativePath.split('/').map(part => encodeURIComponent(part)).join('/');
    }

    const indexHTML = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${rootFolderName}</title>
            <link rel="stylesheet" href=".css/template.css">
            <style>
                .landing-container { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; text-align: center; background-color: var(--bg-color); color: var(--text-color); }
                .vault-title { font-size: 3rem; margin-bottom: 0.5rem; font-family: inherit; }
                .subtitle { color: #8c8273; margin-bottom: 2rem; }
                .enter-btn { padding: 0.8rem 2rem; border: 2px solid var(--text-color); color: var(--text-color); text-decoration: none; font-weight: bold; transition: all 0.2s ease-in-out; box-shadow: 5px 5px 0px var(--text-color); }
                .enter-btn:hover { transform: translateY(-2px); background-color: #f2e4c6 }
            </style>
        </head>
        <body>
            <div class="landing-container">
                <h1 class="vault-title">${rootFolderName}</h1>
                <p class="subtitle">A digital garden generated using Baselinks.</p>
                <a href="${safeFirstNotePath}" class="enter-btn">Enter Vault &rarr;</a>
            </div>
        </body>
        </html>
    `;

    zip.file(`${rootFolderName}/index.html`, indexHTML);
    zip.file(`${rootFolderName}/.js/search-index.js`, `const SEARCH_INDEX = ${JSON.stringify(searchIndex)};`);
    zip.file(`${rootFolderName}/.js/graph-data.js`, `const GRAPH_DATA = ${JSON.stringify({nodes: nodesData, links: linksData})};`);
    zip.file(`${rootFolderName}/.css/template.css`, cssContent);
    zip.file(`${rootFolderName}/.lib/fuse.min.js`, fuseContent);
    zip.file(`${rootFolderName}/.lib/force-graph.min.js`, graphContent);
    zip.file(`${rootFolderName}/.js/search.js`, getSearchScript());
    zip.file(`${rootFolderName}/.js/graph-render.js`, getGraphScript());

    for (const img of imageFiles) {
        let vaultRelativePath = img.path;
        if (vaultRelativePath.startsWith(rootFolderName + '/')) {
            vaultRelativePath = vaultRelativePath.slice(rootFolderName.length + 1);
        } else if (vaultRelativePath === rootFolderName) {
            vaultRelativePath = '';
        }
        zip.file(`${rootFolderName}/.images/${vaultRelativePath}`, img.file);
    }

    const zipContent = await zip.generateAsync({ type: "blob" });
    saveAs(zipContent, "baselinks-export.zip");
    hideLoading();
    document.getElementById('success-overlay').classList.remove('hidden');
}

function getSearchScript() {
    return `
        const searchInput = document.getElementById('search-input');
        const resultsContainer = document.getElementById('search-results');

        const fuse = new Fuse(SEARCH_INDEX, {
            keys: [
                { name: 'title', weight: 0.7 },
                { name: 'snippet', weight: 0.3 }
            ],
            threshold: 0.4,
            ignoreLocation: true,
            includeScore: true
        });

        searchInput.addEventListener('input', (e) => {
            const query = e.target.value;
            
            if (!query) {
                resultsContainer.innerHTML = '';
                resultsContainer.classList.add('hidden');
                return;
            }

            const results = fuse.search(query).slice(0, 8);
            
            if (results.length === 0) {
                resultsContainer.innerHTML = '<div class="no-results">No notes found</div>';
            } else {
                resultsContainer.innerHTML = results.map(result => \`
                    <a href="\${BASELINKS_ROOT}\${result.item.path}" class="search-result-item">
                        <div class="result-title">\${result.item.title}</div>
                        <div class="result-snippet">\${result.item.snippet}</div>
                    </a>
                \`).join('');
            }
            resultsContainer.classList.remove('hidden');
        });

        document.addEventListener('click', (e) => {
            if (!searchInput.contains(e.target) && !resultsContainer.contains(e.target)) {
                resultsContainer.classList.add('hidden');
            }
        });

        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                searchInput.focus();
            }
        });
    `;
}

function getGraphScript() {
    return `
        document.addEventListener('DOMContentLoaded', () => {
            const container = document.getElementById('sidebar-graph');
            if (!container) return;

            let initialData = GRAPH_DATA;
            let localData = null;
            const isLocalViewAvailable = typeof CURRENT_NODE_ID !== 'undefined';

            if (isLocalViewAvailable) {
                const localLinks = GRAPH_DATA.links.filter(l => {
                    const sourceId = typeof l.source === 'object' ? l.source.id : l.source;
                    const targetId = typeof l.target === 'object' ? l.target.id : l.target;
                    return sourceId === CURRENT_NODE_ID || targetId === CURRENT_NODE_ID;
                });
                
                const localNodeIds = new Set();
                localNodeIds.add(CURRENT_NODE_ID);
                localLinks.forEach(l => {
                    localNodeIds.add(typeof l.source === 'object' ? l.source.id : l.source);
                    localNodeIds.add(typeof l.target === 'object' ? l.target.id : l.target);
                });

                const localNodes = GRAPH_DATA.nodes.filter(n => localNodeIds.has(n.id));
                localData = { nodes: localNodes, links: localLinks };
                
                initialData = localData; 
            }

            const Graph = ForceGraph()(container)
                .graphData(initialData)
                .nodeLabel('name')
                .nodeRelSize(3)
                .nodeVal(node => node.val)
                .nodeColor(node => {
                    if (isLocalViewAvailable && node.id === CURRENT_NODE_ID) {
                        return '#a65a28'; 
                    }
                    const opacity = Math.min(1, 0.2 + (node.val * 0.08));
                    return \`rgba(59, 54, 47, \${opacity})\`;
                })
                .linkColor(() => 'rgba(59, 54, 47, 0.15)')
                .backgroundColor('transparent')
                .width(container.clientWidth)
                .height(200)
                .d3VelocityDecay(0.3)
                .nodeCanvasObjectMode(() => 'after')
                .nodeCanvasObject((node, ctx, globalScale) => {
                    // Only show text when zoomed in
                    if (globalScale >= 1.5) {
                        const label = node.name;
                        const fontSize = 12 / globalScale;
                        ctx.font = fontSize + 'px "Merriweather", serif';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillStyle = 'rgba(59, 54, 47, 0.9)';
                        
                        const nodeRadius = Math.sqrt(node.val) * 3;
                        ctx.fillText(label, node.x, node.y + nodeRadius + (fontSize / 1.5));
                    }
                })
                .onNodeClick(node => {
                    window.location.href = BASELINKS_ROOT + node.path;
                });

            // Increase repulsion to stop cluttering
            Graph.d3Force('charge').strength(-150);
            Graph.d3Force('link').distance(40);

            window.addEventListener('resize', () => {
                if (container.clientWidth > 0) {
                    Graph.width(container.clientWidth);
                }
            });
            
            container.addEventListener('wheel', (event) => {
                event.preventDefault();
                event.stopImmediatePropagation();
                const currentZoom = Graph.zoom();
                const targetZoom = event.deltaY < 0 ? currentZoom * 1.5 : currentZoom / 1.5;
                Graph.zoom(targetZoom, 250);
            }, { capture: true, passive: false });

            // 4. Toggle Button Logic
            const btnGlobal = document.getElementById('btn-global-graph');
            const btnLocal = document.getElementById('btn-local-graph');

            const setActive = (activeBtn, inactiveBtn) => {
                if (!activeBtn || !inactiveBtn) return;
                activeBtn.style.background = 'var(--text-color)';
                activeBtn.style.color = 'var(--bg-color)';
                activeBtn.style.opacity = '1';
                
                inactiveBtn.style.background = 'transparent';
                inactiveBtn.style.color = 'var(--text-color)';
                inactiveBtn.style.opacity = '0.6';
            };

            if (isLocalViewAvailable) {
                setActive(btnLocal, btnGlobal);

                btnGlobal.addEventListener('click', () => {
                    setActive(btnGlobal, btnLocal);
                    Graph.graphData(GRAPH_DATA);
                    Graph.d3Force('charge').strength(-150);
                    Graph.d3Force('link').distance(40);
                    setTimeout(() => Graph.zoomToFit(400, 20), 100);
                });

                btnLocal.addEventListener('click', () => {
                    setActive(btnLocal, btnGlobal);
                    Graph.graphData(localData);
                    Graph.d3Force('charge').strength(-150);
                    Graph.d3Force('link').distance(40);
                    setTimeout(() => Graph.zoomToFit(400, 40), 100);
                });
            } else {
                if (btnGlobal) setActive(btnGlobal, btnLocal);
                if (btnLocal) btnLocal.style.display = 'none';
            }
        });
    `;
}