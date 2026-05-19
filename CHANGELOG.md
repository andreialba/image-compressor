# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog, and this project follows Semantic Versioning.

## [Unreleased]

### Changed
- Reserved for upcoming work.

## [0.1.1] - 2026-05-19

### Improved
- Reduced the runtime cost of smart compression for large files by lowering SSIM sample sizes and iteration counts.
- Added a safe fallback from iterative smart compression to single-pass compression for very large images to avoid browser slowdowns.
- Made batch processing concurrency adaptive so heavy smart and lossless jobs run with less parallel pressure on the device.
- Improved compression error messages so users now see clearer explanations for canceled, unsupported, decode, and memory-related failures.
- Added app unmount cleanup to abort in-flight work and revoke object URLs for previews and compressed files.

### Fixed
- Removed an unused `JSZip` import from the main app shell.

## [0.1.0] - 2026-03-15

### Added
- Initial browser-based image compressor built with React, TypeScript, and Vite.
- Batch image processing with per-file progress tracking and cancel support.
- Drag and drop upload flow plus clipboard paste support for quick image intake.
- Before and after compare modal for reviewing compression quality visually.
- Download for single optimized files and ZIP export for successful batch results.
- Smart optimization mode based on iterative SSIM scoring.
- Manual quality control, resize controls, format conversion, and EXIF stripping options.
- Remembered compression settings via local storage.
- Dark mode UI and privacy policy route.

### Security
- Offline, local-only processing design so images are not uploaded to a server.
- Metadata stripping enabled by default through the EXIF removal option.
