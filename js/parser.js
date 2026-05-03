async function parseMarkdownFiles(extractedFiles, imageFiles) {
    const parsedData = [];
    const fileMap = {};

    let rootFolderName = "vault-export";
    if (extractedFiles.length > 0) {
        rootFolderName = extractedFiles[0].path.split('/')[0];
    }

    for (const item of extractedFiles) {
        const fileName = item.path.split('/').pop().replace(/\.md$/i, '');
        const exportPath = item.path.replace(/\.md$/i, '.html');
        fileMap[fileName.toLowerCase()] = exportPath;
    }

      for (const item of extractedFiles) {
        let rawText = await item.file.text();
        const currentExportPath = item.path.replace(/\.md$/i, '.html');

        rawText = rawText.replace(/^\s*---[\s\S]*?---\s*/, ''); // Remove YAML frontmatter
        rawText = rawText.replace(/`{3,}[\s\S]*?`{3,}/g, '');
        rawText = rawText.replace(/~{3,}[\s\S]*?~{3,}/g, '');
        rawText = rawText.replace(/^> *\[!.*?\].*(?:\n>.*)*/gm, '');
        rawText = rawText.replace(/==(.*?)==/g, '<mark>$1</mark>'); // Process obsidian highlights

        rawText = rawText.replace(/!\[\[(.*?)\]\]/g, (match, content) => { // Image encoder
            let imageName = content.split('|')[0].trim();
            let altText = content.split('|')[1] || imageName;
            const hasSubpath = imageName.includes('/');
            const mdDir = item.path.substring(0, item.path.lastIndexOf('/'));

            let imageFile = imageFiles.find(img => {
                const imgDir = img.path.substring(0, img.path.lastIndexOf('/'));
                const imgName = img.path.substring(img.path.lastIndexOf('/') + 1);
                if (hasSubpath) {
                    return img.path.toLowerCase() === (mdDir + '/' + imageName).toLowerCase();
                }
                return imgDir.toLowerCase() === mdDir.toLowerCase() && imgName.toLowerCase() === imageName.toLowerCase();
            });

            if (!imageFile && !hasSubpath) {
                imageFile = imageFiles.find(img => img.path.substring(img.path.lastIndexOf('/') + 1).toLowerCase() === imageName.toLowerCase());
            }

            if (imageFile) {
                const vaultRelativePath = imageFile.path.replace(new RegExp(`^${rootFolderName}/?`), '');
                const currentDepth = currentExportPath.split('/').length - 1;
                const relativePrefix = "../".repeat(currentDepth);

                return `![${altText}](${relativePrefix}${encodeURIComponent(rootFolderName)}/.images/${vaultRelativePath.split('/').map(p => encodeURIComponent(p)).join('/')})`;
            }
            return match;
        });
        
        rawText = rawText.replace(/\[\[(.*?)\]\]/g, (match, content) => {
            let linkTarget = content.split('|')[0].trim();
            let linkText = content.split('|')[1] || linkTarget;

            const targetPath = fileMap[linkTarget.toLowerCase()];

            if (targetPath) {
                const currentDepth = currentExportPath.split('/').length - 1;
                let relativePrefix = "";
                for (let i = 0; i < currentDepth; i++) {
                    relativePrefix += "../";
                }
                const safeTargetPath = targetPath.split('/').map(part => encodeURIComponent(part)).join('/');
                return `[${linkText}](${relativePrefix}${safeTargetPath})`;
            } else {
                return `<span class="missing-link" title="Page not found: ${linkTarget}">${linkText}</span>`; 
            }
        });
        const htmlContent = marked.parse(rawText, { breaks: true });
                
        parsedData.push({
            originalPath: item.path,
            exportPath: currentExportPath,
            html: htmlContent
        });
    }

    return parsedData;
}