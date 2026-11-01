const historyList = document.querySelector('#history-list');
const repositoryName = document.querySelector('#repository-name');
const commitCount = document.querySelector('#commit-count');
const form = document.querySelector('#seance-form');
const summonButton = document.querySelector('#summon-button');
const storyPanel = document.querySelector('#story-panel');

function showStory(title, text, isError = false) {
  const container = document.createElement('div');
  container.className = `story-result${isError ? ' story-error' : ''}`;
  const heading = document.createElement('p');
  heading.className = 'eyebrow';
  heading.textContent = title;
  const story = document.createElement('p');
  story.className = 'story-text';
  story.textContent = text;
  container.append(heading, story);
  storyPanel.replaceChildren(container);
}

async function readResponse(response) {
  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error('The local app returned an unreadable response.');
  }
  if (!response.ok) {
    throw new Error(result.error || 'The request could not be completed.');
  }
  return result;
}

function renderHistory(commits) {
  historyList.replaceChildren();
  for (const commit of commits) {
    const item = document.createElement('li');
    const heading = document.createElement('div');
    heading.className = 'commit-heading';
    const hash = document.createElement('code');
    hash.textContent = commit.hash;
    const date = document.createElement('time');
    date.dateTime = commit.date;
    date.textContent = commit.date;
    const subject = document.createElement('p');
    subject.className = 'commit-subject';
    subject.textContent = commit.subject || 'Untitled change';
    const author = document.createElement('p');
    author.className = 'commit-author';
    author.textContent = commit.author || 'Unknown author';
    heading.append(hash, date);
    item.append(heading, subject, author);
    historyList.append(item);
  }
}

async function loadHistory() {
  try {
    const result = await readResponse(await fetch('/api/history'));
    repositoryName.textContent = result.repository;
    commitCount.textContent = `${result.commits.length} ECHOES`;
    renderHistory(result.commits);
    if (result.commits.length === 0) {
      showStory('Nothing in the archive', 'This repository has no commits yet. Give it a little history, then return.');
    }
  } catch (error) {
    repositoryName.textContent = 'The archive is closed';
    commitCount.textContent = '—';
    showStory('Unable to read Git history', error.message, true);
  }
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  summonButton.disabled = true;
  summonButton.firstElementChild.textContent = 'Listening…';

  try {
    const response = await fetch('/api/seance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tone: form.elements.tone.value })
    });
    const result = await readResponse(response);
    showStory(`${result.commitCount} traces · ${result.model}`, result.story);
  } catch (error) {
    showStory('The veil did not open', error.message, true);
  } finally {
    summonButton.disabled = false;
    summonButton.firstElementChild.textContent = 'Summon the echoes';
  }
});

loadHistory();
