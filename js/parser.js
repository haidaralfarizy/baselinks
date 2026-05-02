async function parseMarkdownFiles(extractedFiles) {
    const parsedData = [];

    for (const item of extractedFiles) {
        let rawText = await item.file.text(); 
        
        rawText = rawText.replace(/\[\[(.*?)\]\]/g, (match, content) => {
            let linkTarget, linkText;

             if (content.includes('|')) {
                const parts = content.split('|');
                linkTarget = parts[0];
                linkText = parts[1];
            } else {
                linkTarget = content;
                linkText = content;
            }

            const safeTarget = linkTarget.trim().replace(/\s+/g, '%20') + '.html';

            return `[${linkText}](${safeTarget})`;
        });

         const htmlContent = marked.parse(rawText);

        parsedData.push({
            originalPath: item.path,
            exportPath: item.path.replace(/\.md$/, '.html'),
            html: htmlContent
        });
    }

    return parsedData;
}
