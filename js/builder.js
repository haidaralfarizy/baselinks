async function buildAndDownloadZip(parsedData, imageFiles) {
    const zip = new JSZip();

    const cssResponse = await fetch('css/template.css');
    const cssContent = await cssResponse.text();

    const fuseResponse = await fetch('lib/fuse.min.js');
    const fuseContent = await fuseResponse.text();

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
                        </div>
                    </main>
                </div>
                <script src="${rootPath}.lib/fuse.min.js"></script>
                <script src="${rootPath}.js/search-index.js"></script>
                <script src="${rootPath}.js/search.js"></script>
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
                .landing-container { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; text-align: center; background-color: var(--bg-color); color: var(--text-primary); }
                .vault-title { font-size: 3rem; margin-bottom: 0.5rem; font-family: inherit; }
                .subtitle { color: #8c8273; margin-bottom: 2rem; }
                .enter-btn { padding: 0.8rem 2rem; border: 2px solid var(--text-primary); color: var(--text-primary); text-decoration: none; font-weight: bold; transition: all 0.2s ease; }
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
    zip.file(`${rootFolderName}/.css/template.css`, cssContent);
    zip.file(`${rootFolderName}/.lib/fuse.min.js`, fuseContent);
    zip.file(`${rootFolderName}/.js/search.js`, getSearchScript());

    for (const img of imageFiles) {
        const vaultRelativePath = img.path.replace(new RegExp(`^${rootFolderName}/?`), '');
        zip.file(`${rootFolderName}/.images/${vaultRelativePath}`, img.file);
    }

    const zipContent = await zip.generateAsync({ type: "blob" });
    saveAs(zipContent, "baselinks-export.zip");
    document.getElementById('success-overlay').classList.remove('hidden');
}

function getSearchScript() {
    return `
        const searchInput = document.getElementById('search-input');
        const resultsContainer = document.getElementById('search-results');

        // Initialize Fuse instantly using the global variable from search-index.js!
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