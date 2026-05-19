# Changelog

## Unreleased

### Improved
- Reduced the runtime cost of smart compression for large files by lowering SSIM sample sizes and iteration counts.
- Added a safe fallback from iterative smart compression to single-pass compression for very large images to avoid browser slowdowns.
- Made batch processing concurrency adaptive so heavy smart/lossless jobs run with less parallel pressure on the device.
- Improved compression error messages so users see clearer explanations for canceled, unsupported, decode, and memory-related failures.
- Added cleanup on app unmount to abort in-flight work and revoke object URLs for previews and compressed files.
