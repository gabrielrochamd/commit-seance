# Commit Séance

Every commit leaves an echo. Commit Séance reads the latest Git commit metadata and asks an open-weight model to turn those traces into a short, atmospheric story. It is a read-only, local-first project for the Hacktoberfest Open-Source AI Challenge: Week 4, “Ghost in the Machine.”

## What it reads

The app reads up to 24 recent commit hashes, dates, author names, and one-line subjects from the selected repository. It does not read source files, inspect remotes, or change Git state. Review the history first: commit subjects and author names are sent to the local Ollama service for generation.

The app itself binds only to `127.0.0.1`. After installing Ollama and downloading the model, story generation works without an AI API or internet connection. No account or cloud service is involved. Model output is creative interpretation, not a factual account of the people behind the commits.

## Run it

Requirements: Node.js 20+, Git, and [Ollama](https://ollama.com/).

1. Download the open-weight model once:

   ```powershell
   ollama pull gemma3:1b
   ```

2. Start the app from this project directory, optionally pointing it at a different local Git repository:

   ```powershell
   npm start
   npm start -- "C:\path\to\another\repository"
   ```

3. Open <http://127.0.0.1:4175> and choose **Summon the echoes**.

The default repository is the current working directory. Keep Ollama running while generating. The model may take a little time to load on the first request, and speed depends on your hardware.

## Development

This project uses Node.js built-ins and has no npm dependencies.

```powershell
npm test
```

The tests stub Git and Ollama, so they do not need a repository, model download, or running Ollama service.

## Open innovation

Gemma 3 1B runs through Ollama on the machine that owns the repository. Open model weights make the project usable without a hosted inference API, keep project history off an external AI service, and let builders swap to another Ollama-compatible model by changing `MODEL` in `server.js`. The trade-off is that local inference needs a model download and enough memory, and a small model may produce less polished prose than a larger hosted model.

## Challenge submission notes

- Required DEV challenge tag: `hf26challenge` (the template also includes `devchallenge`).
- Explain that the project uses Gemma 3 1B locally and sends commit metadata only to the local Ollama endpoint.
- Add the public repository URL and a real demo or recording after publishing and testing them.
- Do not claim that the project works offline before the model has been downloaded.

## License

MIT. See [LICENSE](./LICENSE).
