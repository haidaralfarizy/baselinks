async function buildAndDownloadZip(parsedData) {
    const zip = new JSZip();

    for (const item of parsedData) {
        
        const fullHTML = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>${item.exportPath}</title>
            </head>
            <body>
                ${item.html}
            </body>
            </html>
        `;

         zip.file(item.exportPath, fullHTML);
    }

    console.log("Zip built in memory. Preparing download...");

    const zipContent = await zip.generateAsync({ type: "blob" });

    saveAs(zipContent, "baselinks-export.zip");
}
