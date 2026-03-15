# Free Local Image Compressor

**A free, offline, privacy-first image compressor** that runs entirely in your browser. Compress JPEG, PNG, and WebP images locally—no uploads, no server, no data leaves your device. Perfect for reducing file size for web, email, or storage while keeping your photos private.

> **Keywords:** free image compressor, local image compressor, offline image compression, browser image compressor, compress images without uploading, private image optimizer, image size reducer, batch image compression, EXIF remover

---

## Features

- **100% local & offline** — All compression happens in your browser; images never leave your machine
- **Free & open source** — No sign-up, no paywall, no limits
- **Smart compression** — SSIM-based quality targeting for optimal file size with minimal visible loss
- **Multiple formats** — Convert between JPEG, PNG, and WebP
- **EXIF / metadata stripping** — Remove GPS location, camera info, and other embedded data before download
- **Batch processing** — Compress multiple images at once and download as a single ZIP file
- **Before/after comparison** — Slider to compare original vs compressed side by side
- **Dark mode** — Easy on the eyes in low light

---

## How to Install and Run Locally

### Prerequisites

- **Node.js** (v18 or later recommended) — [Download here](https://nodejs.org/) if you don't have it

### Step 1: Clone or download this repository

```bash
git clone https://github.com/YOUR_USERNAME/Image-Compressor.git
cd Image-Compressor
```

If you downloaded a ZIP file, extract it and open a terminal in that folder.

### Step 2: Install dependencies

```bash
npm install
```

### Step 3: Start the app

```bash
npm run dev
```

### Step 4: Open in your browser

Go to **http://localhost:3000** — the image compressor is now running on your machine.

---

## Build for Production

To create a static build you can deploy or run without Node:

```bash
npm run build
```

The built files will be in the `dist` folder. You can:
- Serve them with any static file server (e.g. `npx serve dist`)
- Deploy to GitHub Pages, Netlify, Vercel, or any static host

---

## Usage

1. **Drag & drop** images onto the drop zone, or click to browse
2. **Paste** images from your clipboard (Ctrl+V / ⌘V)
3. **Adjust settings** (quality, format, EXIF stripping) in the right panel
4. Click **Start Processing** to compress
5. **Download** individual images or save all as a ZIP file

---

## Tech Stack

React, TypeScript, Vite, browser-image-compression, JSZip
