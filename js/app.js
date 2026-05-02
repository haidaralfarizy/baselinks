const markdownFiles = [];

const dropzone = document.getElementById('dropzone');

dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.style.borderColor = "#007BFF";
});

dropzone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    dropzone.style.borderColor = "#ccc";
});

dropzone.addEventListener('drop', async (e) => {
    e.preventDefault();
    dropzone.style.borderColor = "#ccc";
    
    markdownFiles.length = 0; 

    const items = e.dataTransfer.items;
    
    for (let i = 0; i < items.length; i++) {
        const item = items[i].webkitGetAsEntry();
        if (item) {
            await processEntry(item, ""); 
        }
    }

    console.log("Successfully extracted files:", markdownFiles);
    
    const compiledHTML = await parseMarkdownFiles(markdownFiles);
    console.log("Successfully parsed HTML:", compiledHTML);

    await buildAndDownloadZip(compiledHTML);
    console.log("Download triggered!");
});

async function processEntry(entry, path) {
    if (entry.isFile) {
         if (entry.name.endsWith('.md')) {
            const file = await getFileFromEntry(entry);
            markdownFiles.push({
                file: file,
                path: path + entry.name
            });
        }
    } else if (entry.isDirectory) {
        const dirReader = entry.createReader();
        const entries = await readAllDirectoryEntries(dirReader);
        
        for (const childEntry of entries) {
            await processEntry(childEntry, path + entry.name + '/');
        }
    }
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
