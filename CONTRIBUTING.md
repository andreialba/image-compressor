# Contributing

Thanks for contributing to Image Compressor! Please follow these steps:

1. Fork the repository and create a feature branch.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run lint and build before opening a PR:
   ```bash
   npm run lint
   npm run build
   ```
4. Add tests for new features and bug fixes.
5. Update `README.md` and `CHANGELOG.md` with user-facing changes.
6. Open a pull request with a clear summary and testing details.

## Security & privacy

- Keep all changes client-only; do not add remote upload endpoints.
- Maintain metadata stripping defaults (`stripExif: true`).
- Prefer built-in browser APIs and avoid unsafe DOM insertion.
