# Baselinks

![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg) ![Vanilla JS](https://img.shields.io/badge/Vanilla_JS-F7DF1E?style=flat&logo=javascript&logoColor=black) ![Hosted with GitHub Pages](https://img.shields.io/badge/Hosted_with-GitHub_Pages-121013?style=flat&logo=github&logoColor=white)

**Baselinks** is a minimal, privacy-first static site generator that runs entirely in your browser. It turns your folder of Markdown files (like an Obsidian vault) into a beautiful, navigable static website bundled as a ZIP file. It can also analyze your vault's health by listing different types of data.

Try it: https://haidaralfarizy.github.io/baselinks/

## Who is This For?
For people who want to turn Markdown notes into a website instantly without configuration.

## Features

- **Zero Setup**: No CLI, no Node.js, no configuration. Just drag and drop your folder.
- **Privacy First**: Everything is processed locally in your browser. Your notes never leave your machine.
- **Obsidian Support**: YAML frontmatter cleaning, highlighting, and link resolution.
- **Automatic Navigation**: Generates a sidebar based on your folder structure with built-in search.
- **Beautiful Typography**: Clean, readable and paper-like design to make it feel like an extension of a notebook.
- **Static Export**: Generates a ZIP file with HTML, CSS, and images ready to be hosted on GitHub Pages, Vercel, Netlify, or any static host.

### Landing Page
![Landing page](/assets/screenshots/screenshot_landing-page.png)
Simple drag-and-drop interface

### Generated Website
![Generated site](/assets/screenshots/screenshot_generated-site.png)
Beautiful reading UI with clean, navigable output

### Vault Analysis
![Vault analysis](/assets/screenshots/screenshot_vault-analysis.png)
Insights into your notes

## Why Baselinks?
- No setup, no config, no friction.
- Your data never leaves your machine.
- Works instantly — no build step.
- Designed for thinking, not tweaking.

## How to Use

1. Go to the [Baselinks website](https://haidaralfarizy.github.io/baselinks/).
2. Drag and drop your Markdown folder (or "vault") into the dropzone.
3. Your static site will be downloaded automatically as a ZIP file.
4. Extract the ZIP and open `index.html` (in the root folder) or host it online.

## Development

Baselinks is built with HTML/CSS/JS and uses the following libraries:

- [marked.js](https://github.com/markedjs/marked) for Markdown parsing.
- [JSZip](https://stuk.github.io/jszip/) for bundling the site.
- [FileSaver.js](https://github.com/eligrey/FileSaver.js/) for triggering the download.
- [Fuse.js](https://github.com/krisk/fuse) for fuzzy search.
- [force-graph](https://github.com/vasturiano/force-graph) for responsive graphing.

### Local Development / Contributing
To run Baselinks locally, simply clone the repo and run `index.html` in your browser — no build setup required.

## License

MIT License. See `LICENSE` for details.
