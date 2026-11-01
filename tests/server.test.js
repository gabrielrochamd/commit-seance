const assert = require('node:assert/strict');
const { once } = require('node:events');
const { test } = require('node:test');
const { createServer } = require('../server');

const sampleHistory = [
  '\x1ea1b2c3d\x002026-10-30\x00Rae\x00Add the forgotten lantern',
  '\x1ed4e5f6a\x002026-10-29\x00Rae\x00Restore the archive index'
].join('');

async function startServer(t, options = {}) {
  const server = createServer({
    repoPath: 'C:\\haunted-project',
    gitExec: async () => ({ stdout: sampleHistory }),
    ...options
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise((resolve) => server.close(resolve)));
  return `http://127.0.0.1:${server.address().port}`;
}

test('serves the local interface with restrictive browser headers', async (t) => {
  const baseUrl = await startServer(t, {
    fetchImpl: () => {
      throw new Error('Static pages must not contact Ollama.');
    }
  });

  const response = await fetch(baseUrl);
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-security-policy'), /default-src 'self'/);
  assert.match(html, /Every commit/);
});

test('reads only a bounded set of commit metadata from the selected repository', async (t) => {
  let gitCall;
  const baseUrl = await startServer(t, {
    gitExec: async (...args) => {
      gitCall = args;
      return { stdout: sampleHistory };
    }
  });

  const response = await fetch(`${baseUrl}/api/history`);
  const result = await response.json();

  assert.equal(response.status, 200);
  assert.equal(result.repository, 'haunted-project');
  assert.equal(result.commits.length, 2);
  assert.equal(result.commits[0].subject, 'Add the forgotten lantern');
  assert.equal(gitCall[0], 'git');
  assert.equal(gitCall[1][0], 'log');
  assert.equal(gitCall[1][gitCall[1].length - 1], '24');
  assert.equal(gitCall[2].cwd, 'C:\\haunted-project');
});

test('rejects invalid tones before reading Git or calling Ollama', async (t) => {
  let gitCalls = 0;
  let modelCalls = 0;
  const baseUrl = await startServer(t, {
    gitExec: async () => {
      gitCalls += 1;
      return { stdout: sampleHistory };
    },
    fetchImpl: async () => {
      modelCalls += 1;
      throw new Error('Ollama should not be called for invalid input.');
    }
  });

  const response = await fetch(`${baseUrl}/api/seance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tone: 'invented' })
  });

  assert.equal(response.status, 400);
  assert.equal(gitCalls, 0);
  assert.equal(modelCalls, 0);
  assert.match((await response.json()).error, /uncanny or tender/);
});

test('sends bounded Git metadata to local Ollama and returns its story', async (t) => {
  let ollamaRequest;
  const baseUrl = await startServer(t, {
    fetchImpl: async (url, options) => {
      ollamaRequest = { url, body: JSON.parse(options.body) };
      return new Response(JSON.stringify({ response: 'The archive remembers the lantern.' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  });

  const response = await fetch(`${baseUrl}/api/seance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tone: 'tender' })
  });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    story: 'The archive remembers the lantern.',
    model: 'gemma3:1b',
    commitCount: 2
  });
  assert.equal(ollamaRequest.url, 'http://127.0.0.1:11434/api/generate');
  assert.equal(ollamaRequest.body.stream, false);
  assert.match(ollamaRequest.body.prompt, /Add the forgotten lantern/);
  assert.match(ollamaRequest.body.prompt, /warm, reflective/);
  assert.match(ollamaRequest.body.prompt, /untrusted source data/);
});

test('explains how to install the model when Ollama reports it is missing', async (t) => {
  const baseUrl = await startServer(t, {
    fetchImpl: async () => new Response('', { status: 404 })
  });

  const response = await fetch(`${baseUrl}/api/seance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tone: 'uncanny' })
  });

  assert.equal(response.status, 503);
  assert.match((await response.json()).error, /ollama pull gemma3:1b/);
});

test('reports repository and Ollama failures explicitly', async (t) => {
  const baseUrl = await startServer(t, {
    gitExec: async () => {
      const error = new Error('not a repository');
      error.code = 128;
      throw error;
    }
  });

  const response = await fetch(`${baseUrl}/api/history`);
  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /No Git repository/);
});
