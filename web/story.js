// Instagram Story card, drawn on a canvas. Text comes from storyLines() in logic.js. Instagram covers the top 14% and the
// bottom 20% of a Story, so text sits between y = 270 and y = 1580.
const W = 1080;
const H = 1920;
const FONT = '"Plus Jakarta Sans", system-ui, sans-serif';
const WEIGHTS = [500, 600, 700, 800];

// Light-theme level tokens from tokens.css (tests/tokens.test.ts keeps them in step). The card is always light.
const PAGE = '#F6F1EA';
const BRAND = '#6B4E71';
const INK_2 = '#5F5662';
const LEVEL = {
  1: { surface: '#EFFAF4', ink: '#0B3D2A', label: '#13744B', mascot: '#22A06B', eye: '#FFFFFF' },
  2: { surface: '#F1F6FF', ink: '#12306B', label: '#2154BD', mascot: '#3D7BF2', eye: '#FFFFFF' },
  3: { surface: '#FFFBEC', ink: '#3A2A00', label: '#7A5600', mascot: '#F5B301', eye: '#3A2A00' },
  4: { surface: '#FFF1F0', ink: '#5A1416', label: '#B0262B', mascot: '#E5484D', eye: '#FFFFFF' },
  5: { surface: '#221C28', ink: '#FFF3EC', label: '#FFB4A2', mascot: '#4A3F55', eye: '#FFFFFF' }
};
const SEGMENT = ['#22A06B', '#3D7BF2', '#F5B301', '#E5484D', '#2A2230'];
const SEGMENT_5_ON_DARK = '#FFB4A2'; // level 5's accent: its solid colour would vanish on the dark level-5 card

function wrap(ctx, text, maxWidth) {
  const lines = [];
  let line = '';
  for (const word of text.split(' ')) {
    const next = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(next).width > maxWidth) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  return line ? [...lines, line] : lines;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function ellipse(ctx, cx, cy, rx, ry) {
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

/** The mascot of the app (72×64 units), with the level's face; a mask at levels 4–5. */
function mascot(ctx, x, y, width, level, c) {
  const k = width / 72;
  const at = (u, v) => [x + u * k, y + v * k];
  ctx.fillStyle = c.mascot;
  for (const [u, v, rx, ry] of [[36, 42, 26, 17], [24, 31, 12, 12], [38, 24, 14, 14], [52, 31, 11, 11]]) ellipse(ctx, ...at(u, v), rx * k, ry * k);
  ctx.fillStyle = '#FFFFFF';
  ctx.globalAlpha = 0.35;
  ctx.save();
  ctx.translate(...at(31, 21));
  ctx.rotate((-18 * Math.PI) / 180);
  ellipse(ctx, 0, 0, 6 * k, 3.2 * k);
  ctx.restore();
  ctx.globalAlpha = 1;
  ctx.fillStyle = c.eye;
  for (const u of [29, 43]) ellipse(ctx, ...at(u, 40), 3 * k, 3.6 * k);
  ctx.strokeStyle = c.eye;
  ctx.lineWidth = 2.6 * k;
  ctx.lineCap = 'round';
  const line = (...pts) => {
    ctx.beginPath();
    ctx.moveTo(...at(pts[0], pts[1]));
    for (let i = 2; i < pts.length; i += 2) ctx.lineTo(...at(pts[i], pts[i + 1]));
    ctx.stroke();
  };
  if (level >= 4) {
    line(24, 35, 30, 32.5);
    line(48, 35, 42, 32.5);
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1.6 * k;
    line(25, 46, 14, 42);
    line(47, 46, 58, 42);
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#241F33';
    ctx.lineWidth = 1.2 * k;
    roundRect(ctx, ...at(25, 43), 22 * k, 12 * k, 5 * k);
    ctx.fill();
    ctx.stroke();
    ctx.globalAlpha = 0.35;
    line(29, 47.5, 43, 47.5);
    line(29, 51, 43, 51);
    ctx.globalAlpha = 1;
    return;
  }
  ctx.fillStyle = '#FF8FA3';
  ctx.globalAlpha = 0.9;
  for (const u of [22, 50]) ellipse(ctx, ...at(u, 46), 4 * k, 2.4 * k);
  ctx.globalAlpha = 1;
  ctx.beginPath();
  if (level === 2) {
    ctx.moveTo(...at(32, 47.5));
    ctx.lineTo(...at(40, 47.5));
  } else {
    const [y0, cy] = level === 3 ? [49, 44] : [46, 51];
    ctx.moveTo(...at(31, y0));
    ctx.quadraticCurveTo(...at(36, cy), ...at(41, y0));
  }
  ctx.stroke();
}

/** The scale: five segments in their level colours, the current one solid and taller. */
function scale(ctx, centerX, baseY, level) {
  const w = 88;
  const gap = 14;
  const x0 = centerX - (5 * w + 4 * gap) / 2;
  for (let i = 1; i <= 5; i++) {
    const on = i === level;
    const h = on ? 36 : 22;
    ctx.globalAlpha = on ? 1 : 0.3;
    ctx.fillStyle = i === 5 && level === 5 ? SEGMENT_5_ON_DARK : SEGMENT[i - 1];
    roundRect(ctx, x0 + (i - 1) * (w + gap), baseY - h, w, h, h / 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/** Waits for the self-hosted font, draws the card and resolves with a PNG blob. */
export async function renderStory(lines) {
  await Promise.all(WEIGHTS.map(w => document.fonts.load(`${w} 60px "Plus Jakarta Sans"`)));
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  const c = LEVEL[lines.level];
  const mid = W / 2;
  ctx.fillStyle = PAGE;
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  // Levels 1–2 have a quip and room to spare: a taller card and a bigger mascot fill the top and bottom bands, text still inside the safe zones.
  const light = lines.level <= 2;
  const at = light
    ? { cardTop: 400, cardBottom: 1420, mascotY: 262, mascotW: 420, city: 790, name: 880, scale: 960, headline: 1080, quipGap: 80, quipSize: 46, footer: 1512, url: 1566 }
    : { cardTop: 430, cardBottom: 1380, mascotY: 300, mascotW: 320, city: 740, name: 830, scale: 910, headline: 1030, quipGap: 72, quipSize: 40, footer: 1452, url: 1514 };
  const { cardTop, cardBottom } = at;
  ctx.shadowColor = 'rgba(38, 31, 39, .18)';
  ctx.shadowBlur = 60;
  ctx.shadowOffsetY = 24;
  ctx.fillStyle = c.surface;
  roundRect(ctx, 70, cardTop, W - 140, cardBottom - cardTop, 72);
  ctx.fill();
  ctx.shadowColor = 'transparent';
  mascot(ctx, mid - at.mascotW / 2, at.mascotY, at.mascotW, lines.level, c);

  const text = (value, y, size, weight, color, maxWidth = 800, lead = 1.2) => {
    ctx.fillStyle = color;
    ctx.font = `${weight} ${size}px ${FONT}`;
    const rows = wrap(ctx, value, maxWidth);
    rows.forEach((row, i) => ctx.fillText(row, mid, y + i * size * lead));
    return y + (rows.length - 1) * size * lead;
  };

  let size = 104;
  ctx.font = `800 ${size}px ${FONT}`;
  while (ctx.measureText(lines.city).width > 800 && size > 60) ctx.font = `800 ${--size}px ${FONT}`;
  text(lines.city, at.city, size, 800, c.ink);
  text(lines.levelName, at.name, 60, 800, c.label);
  scale(ctx, mid, at.scale, lines.level);
  let y = text(lines.headline, at.headline, 70, 800, c.ink, 800, 1.18);
  if (lines.quip) y = text(lines.quip, y + at.quipGap, at.quipSize, 600, c.ink, 800, 1.3);
  if (lines.improve) y = text(lines.improve, y + 76, 40, 700, c.label, 860, 1.3);
  text(lines.stamp, cardBottom - 56, 34, 600, c.label);

  text(lines.footer, at.footer, 48, 800, BRAND);
  text(lines.url, at.url, 38, 600, INK_2);
  return new Promise((resolve, reject) => canvas.toBlob(blob => (blob ? resolve(blob) : reject(new Error('no blob'))), 'image/png'));
}
