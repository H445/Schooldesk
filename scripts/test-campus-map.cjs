// Verify marker geometry and interactions in the actual offline desktop renderer.
/* oxlint-disable typescript/no-require-imports -- Electron uses CommonJS. */
const { app, BrowserWindow } = require('electron');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const detailed = require('../lib/campus-room-positions.json');
const overview = require('../lib/campus-overview-positions.json');

app.disableHardwareAcceleration();
const output = path.resolve('outputs');
fs.mkdirSync(output, { recursive: true });
app.setPath('userData', fs.mkdtempSync(path.join(output, 'campus-test-')));
const timeout = setTimeout(() => {
  console.error('Campus map renderer test timed out');
  app.exit(1);
}, 60000);

void app
  .whenReady()
  .then(async () => {
    const window = new BrowserWindow({
      show: false,
      width: 1440,
      height: 1000,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        backgroundThrottling: false,
        preload: path.resolve('electron/preload.cjs'),
      },
    });
    const errors = [];
    window.webContents.on('console-message', (details) => {
      if (details.level === 'error') errors.push(details.message);
    });
    const evaluate = (fn, ...args) =>
      window.webContents.executeJavaScript(
        `(${fn.toString()})(...${JSON.stringify(args)})`,
      );
    const waitFor = async (fn) => {
      for (let i = 0; i < 200; i++) {
        if (await evaluate(fn)) return;
        await new Promise((resolve) => setTimeout(resolve, 25));
      }
      throw new Error(`Timed out: ${fn.toString()}`);
    };
    const click = (selector) =>
      evaluate(
        (selector) => document.querySelector(selector).click(),
        selector,
      );
    const readyImage = () =>
      waitFor(() => {
        const image = document.querySelector('.floorplan-overlay-canvas img');
        return image?.complete && image.naturalWidth > 0;
      });
    const floor = async (label) => {
      await evaluate(
        (label) =>
          [...document.querySelectorAll('.campus-floor-tabs button')]
            .find((button) => button.textContent.startsWith(label))
            .click(),
        label,
      );
      await readyImage();
    };
    let geometryChecks = 0;
    const check = async (room, position) => {
      const measured = await evaluate((room) => {
        const marker = [
          ...document.querySelectorAll('.floorplan-marker-dot'),
        ].find((button) => button.getAttribute('aria-label').startsWith(room));
        const rect = marker.getBoundingClientRect();
        const image = document
          .querySelector('.floorplan-overlay-canvas img')
          .getBoundingClientRect();
        return {
          width: rect.width,
          height: rect.height,
          x: ((rect.left + rect.width / 2 - image.left) / image.width) * 100,
          y: ((rect.top + rect.height / 2 - image.top) / image.height) * 100,
          allCircular: [
            ...document.querySelectorAll('.floorplan-marker-dot'),
          ].every((button) => {
            const box = button.getBoundingClientRect();
            return box.width === 24 && box.height === 24;
          }),
        };
      }, room);
      assert.equal(measured.width, 24);
      assert.equal(measured.height, 24);
      assert.ok(measured.allCircular, 'Every class and POI pin stays circular');
      assert.ok(
        Math.abs(measured.x - position.x) < 0.01,
        `${room} horizontal alignment`,
      );
      assert.ok(
        Math.abs(measured.y - position.y) < 0.01,
        `${room} vertical alignment`,
      );
      geometryChecks++;
    };
    const zoomTo = async (clicks) => {
      await click('button[aria-label="Reset floor plan zoom"]');
      for (let i = 0; i < clicks; i++) {
        await click('button[aria-label="Zoom in floor plan"]');
      }
      // Wait for React to commit the last zoom before taking measurements.
      // Hidden windows do not necessarily receive animation frames.
      await evaluate(() => new Promise((resolve) => setTimeout(resolve, 30)));
    };

    await window.loadFile(path.resolve('dist/client/index.html'));
    await waitFor(() =>
      document.body.textContent.includes('Saved on this device'),
    );
    await click('button[aria-label="Campus"]');
    await readyImage();
    for (const width of [1440, 800]) {
      window.setSize(width, 1000);
      for (const [label, room, position] of [
        ['Campus', 'A3302', overview.A3302],
        ['Basement', 'A0336', detailed.A0336],
        ['2nd floor', 'A2134', detailed.A2134],
        ['3rd floor', 'A3302', detailed.A3302],
      ]) {
        await floor(label);
        for (const clicks of [0, 2, 5]) {
          await zoomTo(clicks);
          await check(room, position);
        }
      }
    }
    window.setSize(1440, 1000);
    await floor('2nd floor');
    await check('Library Resource Centre', detailed.A2303);
    await check('A2612', detailed.A2612);
    await click('.floorplan-marker-dot[aria-label^="A2134:"]');
    await waitFor(
      () =>
        document.querySelectorAll('.floorplan-marker-choices button').length ===
        2,
    );
    await click('.floorplan-marker-choices button');
    await waitFor(() =>
      document.querySelector('.floorplan-overlay-class.selected'),
    );
    await zoomTo(2);
    await evaluate(() =>
      document.querySelector('.actual-floorplan-frame').scrollIntoView(),
    );
    // Hidden Electron windows paint less often than they update DOM geometry.
    await new Promise((resolve) => setTimeout(resolve, 1200));
    fs.writeFileSync(
      path.join(output, 'campus-alignment-second-floor.png'),
      (await window.webContents.capturePage()).toPNG(),
    );
    await click('.floorplan-overlay-background');
    await readyImage();
    assert.equal(
      await evaluate(() =>
        document
          .querySelector('.campus-floor-tabs button.selected')
          .textContent.startsWith('Campus'),
      ),
      true,
    );
    assert.equal(
      await evaluate(
        () => document.querySelectorAll('.floorplan-marker.selected').length,
      ),
      0,
    );
    await click(
      '.floorplan-marker-dot[aria-label^="School of Health Sciences"]',
    );
    await waitFor(
      () =>
        document.querySelectorAll('.floorplan-marker-choices button').length ===
        3,
    );
    await click('.floorplan-marker-choices button:last-child');
    await waitFor(
      () =>
        document.querySelector('.campus-detail-card h3')?.textContent ===
        'Dental Clinic',
    );
    await check('School of Health Sciences', { x: 54.7, y: 47.03 });
    await evaluate(() => {
      const viewport = document.querySelector('.floorplan-overlay-viewport');
      viewport.scrollTop = viewport.scrollHeight * 0.36;
    });
    await new Promise((resolve) => setTimeout(resolve, 1200));
    fs.writeFileSync(
      path.join(output, 'campus-alignment-overview.png'),
      (await window.webContents.capturePage()).toPNG(),
    );
    await click('.floorplan-overlay-background');
    await click('.floorplan-unlocated-rooms button');
    await readyImage();
    assert.equal(
      await evaluate(() =>
        document
          .querySelector('.campus-floor-tabs button.selected')
          .textContent.startsWith('Campus'),
      ),
      false,
    );
    await floor('Basement');
    await check('A0341', detailed.A0341);
    assert.deepEqual(errors, []);
    console.log(
      JSON.stringify({
        passed: true,
        geometryChecks,
        zooms: [100, 150, 300],
        windowWidths: [1440, 800],
        rendererErrors: errors.length,
      }),
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
