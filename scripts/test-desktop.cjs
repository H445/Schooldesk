// Run the packaged file:// renderer in a hidden, isolated Electron window.
// This never reads or overwrites the user's Schooldesk profile.
/* oxlint-disable typescript/no-require-imports -- Electron test entry uses CommonJS, like the desktop main process. */
const { app, BrowserWindow } = require('electron');
// Hidden test windows do not need a GPU process (some CI hosts have no GPU).
app.disableHardwareAcceleration();
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const output = path.resolve('outputs');
fs.mkdirSync(output, { recursive: true });
app.setPath('userData', fs.mkdtempSync(path.join(output, 'desktop-test-')));
const timeout = setTimeout(() => {
  console.error('Desktop smoke test timed out');
  app.exit(1);
}, 60000);

void app
  .whenReady()
  .then(async () => {
    const window = new BrowserWindow({
      show: false,
      width: 1440,
      height: 900,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        backgroundThrottling: false,
        preload: path.resolve('electron/preload.cjs'),
      },
    });
    const errors = [];
    const remoteRequests = [];
    window.webContents.on('console-message', (details) => {
      if (details.level === 'error') errors.push(details.message);
    });
    window.webContents.session.webRequest.onBeforeRequest(
      (details, callback) => {
        if (
          !details.url.startsWith('file://') &&
          !details.url.startsWith('data:') &&
          !details.url.startsWith(
            'chrome-extension://mhjfbmdgcfjbbpaeojofohoefgiehjai/',
          )
        )
          remoteRequests.push(details.url);
        callback({
          cancel:
            !details.url.startsWith('file://') &&
            !details.url.startsWith('data:') &&
            !details.url.startsWith(
              'chrome-extension://mhjfbmdgcfjbbpaeojofohoefgiehjai/',
            ),
        });
      },
    );
    const evaluate = (fn, ...args) =>
      window.webContents.executeJavaScript(
        `(${fn.toString()})(...${JSON.stringify(args)})`,
      );
    async function waitFor(fn) {
      for (let i = 0; i < 200; i++) {
        if (await evaluate(fn)) return;
        await new Promise((resolve) => setTimeout(resolve, 25));
      }
      throw new Error(`Timed out: ${fn.toString()}`);
    }
    const clickLabel = (label) =>
      evaluate(
        (label) =>
          document.querySelector(`button[aria-label="${label}"]`).click(),
        label,
      );
    await window.loadFile(path.resolve('dist/client/index.html'));
    await waitFor(() =>
      document.body.textContent.includes('Saved on this device'),
    );
    assert.equal(
      await evaluate(() => window.schooldeskDesktop.isDesktop),
      true,
    );
    assert.equal(
      await evaluate(() => document.querySelectorAll('.class-card').length),
      6,
    );
    await clickLabel('New assignment');
    await waitFor(() => document.querySelector('[role="dialog"] input'));
    await evaluate(() => {
      const input = document.querySelector('[role="dialog"] input');
      Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        'value',
      ).set.call(input, 'Desktop smoke assignment');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await evaluate(() =>
      document.querySelector('[role="dialog"] form').requestSubmit(),
    );
    await waitFor(() => !document.querySelector('[role="dialog"]'));
    assert.ok(
      await evaluate(() =>
        JSON.parse(
          localStorage.getItem('schooldesk.workspace.v1'),
        ).data.assignments.some((a) => a.title === 'Desktop smoke assignment'),
      ),
    );

    await clickLabel('Classes');
    await waitFor(() =>
      document.querySelector('button[aria-label="New class"]'),
    );
    await clickLabel('New class');
    await waitFor(() =>
      document.querySelector('input[aria-label="Reference URL"]'),
    );
    await evaluate(() => {
      const title = document.querySelector('input[name="name"]');
      Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        'value',
      ).set.call(title, 'Reference class');
      title.dispatchEvent(new Event('input', { bubbles: true }));
      const url = document.querySelector('input[aria-label="Reference URL"]');
      Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        'value',
      ).set.call(url, 'https://example.edu/guide');
      url.dispatchEvent(new Event('input', { bubbles: true }));
      document.querySelector('.reference-add-row button').click();
    });
    await waitFor(() => document.querySelector('.reference-card'));
    await evaluate(() =>
      document.querySelector('[role="dialog"] form').requestSubmit(),
    );
    await waitFor(() => !document.querySelector('[role="dialog"]'));
    const withPreviews = JSON.parse(
      await evaluate(() => localStorage.getItem('schooldesk.workspace.v1')),
    );
    withPreviews.data.classes[0].references = [
      {
        id: 'img',
        title: 'Diagram.png',
        kind: 'image',
        href: 'data:image/png;base64,AA==',
        mimeType: 'image/png',
        size: 1,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'pdf',
        title: 'Syllabus.pdf',
        kind: 'pdf',
        href: 'data:application/pdf;base64,AA==',
        mimeType: 'application/pdf',
        size: 1,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'url',
        title: 'Course guide',
        kind: 'url',
        href: 'https://example.edu/guide',
        createdAt: new Date().toISOString(),
      },
    ];
    await evaluate(
      (data) =>
        localStorage.setItem('schooldesk.workspace.v1', JSON.stringify(data)),
      withPreviews,
    );
    await window.loadFile(path.resolve('dist/client/index.html'));
    await waitFor(() => document.querySelector('.class-card'));
    await evaluate(() => document.querySelector('.class-card').click());
    await waitFor(() => document.querySelector('.reference-section'));
    assert.equal(
      await evaluate(() => document.querySelectorAll('.reference-card').length),
      3,
    );
    assert.equal(
      await evaluate(
        () => document.querySelectorAll('.reference-thumbnail').length,
      ),
      1,
    );
    assert.equal(
      await evaluate(
        () => document.querySelectorAll('.reference-pdf-preview').length,
      ),
      1,
    );

    const { performanceFixture } =
      await import('../tests/performance-fixture.mjs');
    await evaluate(
      (data) =>
        localStorage.setItem(
          'schooldesk.workspace.v1',
          JSON.stringify({ data, revision: 7 }),
        ),
      performanceFixture(12, 2000),
    );
    await window.loadFile(path.resolve('dist/client/index.html'));
    await waitFor(
      () => document.querySelector('.nav-count')?.textContent === '1334',
    );
    const timings = {};
    const start = performance.now();
    await clickLabel('Assignments');
    await waitFor(
      () =>
        document.querySelectorAll('.assignment-table tbody tr').length === 60,
    );
    timings.open2000AssignmentsMs = Math.round(performance.now() - start);
    await evaluate(() =>
      Array.from(
        document.querySelectorAll('nav[aria-label="assignments pages"] button'),
      )
        .find((b) => b.textContent === 'Next')
        .click(),
    );
    await waitFor(() =>
      document
        .querySelector('nav[aria-label="assignments pages"] output')
        ?.textContent.startsWith('61–120'),
    );
    await evaluate(() => {
      const input = document.querySelector(
        'input[aria-label="Search your workspace"]',
      );
      Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        'value',
      ).set.call(input, 'Assignment 1999');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await waitFor(
      () =>
        document.querySelectorAll('.assignment-table tbody tr').length === 1,
    );
    assert.ok(
      await evaluate(() =>
        document
          .querySelector('.assignment-table tbody')
          .textContent.includes('Assignment 1999'),
      ),
    );
    await clickLabel('Clear search');
    await waitFor(
      () =>
        document.querySelectorAll('.assignment-table tbody tr').length === 60,
    );
    await clickLabel('Board view');
    await waitFor(
      () => document.querySelectorAll('.kanban-card').length === 180,
    );
    await clickLabel('Notes');
    await waitFor(() => document.querySelectorAll('.note-card').length === 60);
    assert.ok(
      await evaluate(() =>
        Array.from(document.querySelectorAll('.note-card p')).every(
          (p) => p.textContent.length <= 501,
        ),
      ),
    );
    await clickLabel('Calendar');
    await waitFor(
      () => document.querySelectorAll('.calendar-day').length >= 28,
    );
    await clickLabel('Next month');
    await clickLabel('Previous month');
    await evaluate(() => document.querySelector('.day-number').click());
    await waitFor(() => document.querySelector('.calendar-agenda'));
    await clickLabel('Overview');
    await waitFor(() => document.querySelector('.overview-grid'));
    await evaluate(
      () =>
        new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        ),
    );
    fs.writeFileSync(
      path.join(output, 'desktop-optimized.png'),
      (await window.webContents.capturePage()).toPNG(),
    );
    // Exercise the class limit too: sidebar, cards, and calendar agendas
    // must stay bounded without hiding records from search or pagination.
    const maximum = performanceFixture();
    for (const course of maximum.classes) {
      for (const schedule of course.calendarSchedules) {
        schedule.startDate = '1900-01-01';
        schedule.endDate = '9999-12-31';
      }
    }
    await evaluate(
      (data) =>
        localStorage.setItem(
          'schooldesk.workspace.v1',
          JSON.stringify({ data, revision: 8 }),
        ),
      maximum,
    );
    await window.loadFile(path.resolve('dist/client/index.html'));
    await waitFor(() => document.querySelectorAll('.class-card').length === 60);
    assert.equal(
      await evaluate(
        () => document.querySelectorAll('.side-courses > button').length,
      ),
      60,
    );
    await clickLabel('Calendar');
    await waitFor(() => document.querySelector('.calendar-grid'));
    assert.ok(
      await evaluate(() =>
        Array.from(document.querySelectorAll('.calendar-day')).every(
          (day) => day.querySelectorAll('.calendar-meeting').length <= 4,
        ),
      ),
    );
    await evaluate(() =>
      Array.from(document.querySelectorAll('.calendar-more'))
        .find((button) => button.textContent.includes('more meetings'))
        .click(),
    );
    await waitFor(
      () => document.querySelectorAll('.day-meetings > button').length === 60,
    );
    assert.deepEqual(
      remoteRequests,
      [],
      'Renderer must remain entirely offline',
    );
    assert.deepEqual(errors, [], 'Renderer console errors');
    console.log(
      JSON.stringify(
        {
          passed: true,
          timings,
          remoteRequests: remoteRequests.length,
          rendererErrors: errors.length,
        },
        null,
        2,
      ),
    );
    clearTimeout(timeout);
    window.destroy();
    app.exit(0);
  })
  .catch((error) => {
    console.error(error);
    clearTimeout(timeout);
    app.exit(1);
  });
