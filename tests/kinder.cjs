const assert = require('node:assert/strict');
// Generated blue test frame (MP4). Never reads a camera or family media.
const film = Buffer.from(
  'AAAAIGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW1wNDEAAAOQbW9vdgAAAGxtdmhkAAAAAAAAAAAAAAAAAAAD6AAAAUAAAQAAAQAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAArt0cmFrAAAAXHRraGQAAAADAAAAAAAAAAAAAAABAAAAAAAAAUAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAABAAAAAACAAAAAgAAAAAAAkZWR0cwAAABxlbHN0AAAAAAAAAAEAAAFAAAAEAAABAAAAAAIzbWRpYQAAACBtZGhkAAAAAAAAAAAAAAAAAAAyAAAAEABVxAAAAAAALWhkbHIAAAAAAAAAAHZpZGUAAAAAAAAAAAAAAABWaWRlb0hhbmRsZXIAAAAB3m1pbmYAAAAUdm1oZAAAAAEAAAAAAAAAAAAAACRkaW5mAAAAHGRyZWYAAAAAAAAAAQAAAAx1cmwgAAAAAQAAAZ5zdGJsAAAAvnN0c2QAAAAAAAAAAQAAAK5hdmMxAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAACAAIABIAAAASAAAAAAAAAABFUxhdmM2MS4xOS4xMDEgbGlieDI2NAAAAAAAAAAAAAAAGP//AAAANGF2Y0MBZAAK/+EAF2dkAAqs2UlsBEAAAAMAQAAADIPEiWWAAQAGaOvjyyLA/fj4AAAAABBwYXNwAAAAAQAAAAEAAAAUYnRydAAAAAAAAE9MAAAAAAAAABhzdHRzAAAAAAAAAAEAAAAIAAACAAAAABRzdHNzAAAAAAAAAAEAAAABAAAASGN0dHMAAAAAAAAABwAAAAEAAAQAAAAAAQAACgAAAAABAAAEAAAAAAEAAAAAAAAAAQAAAgAAAAABAAAIAAAAAAIAAAIAAAAAHHN0c2MAAAAAAAAAAQAAAAEAAAAIAAAAAQAAADRzdHN6AAAAAAAAAAAAAAAIAAAC0AAAAAwAAAAMAAAADAAAAAwAAAASAAAADgAAAAwAAAAUc3RjbwAAAAAAAAABAAADwAAAAGF1ZHRhAAAAWW1ldGEAAAAAAAAAIWhkbHIAAAAAAAAAAG1kaXJhcHBsAAAAAAAAAAAAAAAALGlsc3QAAAAkqXRvbwAAABxkYXRhAAAAAQAAAABMYXZmNjEuNy4xMDMAAAAIZnJlZQAAAzRtZGF0AAACrgYF//+q3EXpvebZSLeWLNgg2SPu73gyNjQgLSBjb3JlIDE2NCByMzEwOCAzMWUxOWY5IC0gSC4yNjQvTVBFRy00IEFWQyBjb2RlYyAtIENvcHlsZWZ0IDIwMDMtMjAyMyAtIGh0dHA6Ly93d3cudmlkZW9sYW4ub3JnL3gyNjQuaHRtbCAtIG9wdGlvbnM6IGNhYmFjPTEgcmVmPTMgZGVibG9jaz0xOjA6MCBhbmFseXNlPTB4MzoweDExMyBtZT1oZXggc3VibWU9NyBwc3k9MSBwc3lfcmQ9MS4wMDowLjAwIG1peGVkX3JlZj0xIG1lX3JhbmdlPTE2IGNocm9tYV9tZT0xIHRyZWxsaXM9MSA4eDhkY3Q9MSBjcW09MCBkZWFkem9uZT0yMSwxMSBmYXN0X3Bza2lwPTEgY2hyb21hX3FwX29mZnNldD0tMiB0aHJlYWRzPTEgbG9va2FoZWFkX3RocmVhZHM9MSBzbGljZWRfdGhyZWFkcz0wIG5yPTAgZGVjaW1hdGU9MSBpbnRlcmxhY2VkPTAgYmx1cmF5X2NvbXBhdD0wIGNvbnN0cmFpbmVkX2ludHJhPTAgYmZyYW1lcz0zIGJfcHlyYW1pZD0yIGJfYWRhcHQ9MSBiX2JpYXM9MCBkaXJlY3Q9MSB3ZWlnaHRiPTEgb3Blbl9nb3A9MCB3ZWlnaHRwPTIga2V5aW50PTI1MCBrZXlpbnRfbWluPTI1IHNjZW5lY3V0PTQwIGludHJhX3JlZnJlc2g9MCByY19sb29rYWhlYWQ9NDAgcmM9Y3JmIG1idHJlZT0xIGNyZj0yMy4wIHFjb21wPTAuNjAgcXBtaW49MCBxcG1heD02OSBxcHN0ZXA9NCBpcF9yYXRpbz0xLjQwIGFxPTE6MS4wMACAAAAAGmWIhAA3//7hA/gU103+Y49D2QFoVctcFtP5AAAACEGaJGxDP/6nAAAACEGeQniF/1XBAAAACAGeYXRCv1rAAAAACAGeY2pCv1rBAAAADkGaZ0moQWiZTAhX//5XAAAACkGehUURLCv/WsEAAAAIAZ6makK/WsE=',
  'base64',
);
module.exports = async function testGuide(browser, origin) {
  const context = await browser.newContext({ viewport: { width: 744, height: 1133 } });
  try {
    const p = await context.newPage();
    await p.goto(origin + '/kinder/index.html');
    for (const [id, name] of [
      [1, 'Test A'],
      [2, 'Test B'],
    ]) {
      await p.getByRole('button', { name: 'Profil ' + id + ' anlegen' }).click();
      await p.getByLabel('Mein Name').fill(name);
      await p.getByLabel('Sein Name').fill('Testtier');
      await p.getByRole('button', { name: 'Profil speichern' }).click();
      await p.locator('#owner').filter({ hasText: name }).waitFor();
    }
    await p.locator('summary').first().click();
    await p.locator('#allow button').first().click();
    await p.locator('#places button').first().click();
    await p
      .locator('#camera')
      .setInputFiles({ name: 'test.mp4', mimeType: 'video/mp4', buffer: film });
    await p.locator('#keep').click();
    await p.getByRole('button', { name: /Film ansehen/ }).waitFor();
    await p.reload();
    await p.getByRole('button', { name: /Test A/ }).click();
    assert.equal(await p.locator('#films article').count(), 0);
    await p.getByRole('button', { name: /Test B/ }).click();
    await p.getByRole('button', { name: /Film ansehen/ }).click();
    assert.equal(await p.getByText('Datei exportieren').getAttribute('download'), 'test.mp4');
    await p.setViewportSize({ width: 1133, height: 744 });
    assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    p.once('dialog', (dialog) => dialog.accept());
    await p.getByRole('button', { name: 'Film löschen' }).click();
    await p.getByText('Film gelöscht.').waitFor();
  } finally {
    await context.close();
  }
};
