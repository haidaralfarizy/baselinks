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
        const compiledHTML = await parseMarkdownFiles(markdownFiles, imageFiles);
        await buildAndDownloadZip(compiledHTML, imageFiles);
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
        const compiledHTML = await parseMarkdownFiles(markdownFiles, imageFiles);
        await buildAndDownloadZip(compiledHTML, imageFiles);
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

function showFailure() {
    document.getElementById('failure-overlay').classList.remove('hidden');
}

function closeFailureOverlay() {
    document.getElementById('failure-overlay').classList.add('hidden');
}