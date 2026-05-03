# Baselinks

**Baselinks** is a minimal, privacy-first static site generator that runs entirely in your browser. It turns your folder of Markdown files (like an Obsidian vault) into a beautiful, navigable static website bundled as a ZIP file.

## Features

- **Zero Setup**: No CLI, no Node.js, no configuration. Just drag and drop your folder.
- **Privacy First**: Everything is processed locally in your browser. Your notes never leave your machine.
- **Obsidian Support**: 
  - Wiki-links (`[[Link]]`) support.
  - Image embeds (`![[Image]]`) support.
  - Automatic YAML frontmatter removal.
  - Obsidian highlight support (`==highlight==`).
- **Automatic Navigation**: Generates a recursive sidebar based on your folder structure featuring a search box.
- **Beautiful Typography**: Clean, readable design using Merriweather and Lora fonts.
- **Static Export**: Generates a ZIP file with HTML, CSS, and images ready to be hosted on GitHub Pages, Vercel, or any static host.

## How to Use

1. Go to the Baselinks website.
2. Drag and drop your Markdown folder (or "vault") into the dropzone.
3. Wait for the processing to finish.
4. Your static site will be downloaded automatically as a ZIP file.
5. Extract the ZIP and open `index.html` (in the root folder) or host it online.

## Development

Baselinks is built with vanilla HTML/CSS/JS and uses the following libraries:

- [marked.js](https://github.com/markedjs/marked) for Markdown parsing.
- [JSZip](https://stuk.github.io/jszip/) for bundling the site.
- [FileSaver.js](https://github.com/eligrey/FileSaver.js/) for triggering the download.
- [Fuse.js](https://github.com/krisk/fuse) for fuzzy search.

## License

MIT License. See `LICENSE` for details.
