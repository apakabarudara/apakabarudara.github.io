// "Kalender Kertas": a monthly A4 sheet to colour in by hand. Loaded on first open of its sheet, so none of this is in the main bundle.
// The same markup fills the on-screen preview (scaled down) and #printArea. The app never claims a level here: people colour it from the app.
import { LEVELS, SITE_HOST } from './copy.js';

export const CAL = {
  link: 'Kalender cetak',
  title: 'Kalender udara bulanan',
  intro: 'Cetak lembar bulanan untuk ditempel di dapur atau pos kampung. Warnai lingkaran tiap hari sesuai level di aplikasi.',
  monthsLabel: 'Pilih bulan',
  print: 'Cetak',
  previewAlt: 'Pratinjau lembar kalender',
  heading: 'Kalender Udara',
  city: 'Kota:',
  name: 'Nama:',
  days: ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'],
  months: ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'],
  instruction: `Cek level hari ini di ${SITE_HOST}, lalu warnai lingkarannya.`,
  note: 'Level adalah perkiraan model, bukan hasil alat ukur. Panduan resmi: ISPU, Kementerian Lingkungan Hidup.',
  brand: 'Apa Kabar Udara'
};

/** Weeks of a month, Monday first. Each week has 7 cells: the day number, or null for the blanks before the 1st and after the last day. */
export function monthGrid(year, month) {
  const lead = (new Date(Date.UTC(year, month, 1)).getUTCDay() + 6) % 7;
  const total = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const cells = [...Array(lead).fill(null), ...Array.from({ length: total }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);
  return Array.from({ length: cells.length / 7 }, (_, w) => cells.slice(w * 7, w * 7 + 7));
}

/** This month and the next, as { year, month } (month 0–11). */
export function monthChoices(now = new Date()) {
  const year = now.getFullYear();
  const month = now.getMonth();
  return [{ year, month }, month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 }];
}

export const monthLabel = ({ year, month }) => `${CAL.months[month]} ${year}`;

const esc = text => String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const CLOUD =
  '<svg class="cal-mascot" viewBox="-2 -2 76 68" fill="#fff" stroke="#000" stroke-width="3.5" stroke-linejoin="round" aria-hidden="true"><ellipse cx="36" cy="42" rx="26" ry="17"/><circle cx="24" cy="31" r="12"/><circle cx="38" cy="24" r="14"/><circle cx="52" cy="31" r="11"/><ellipse cx="36" cy="42" rx="24" ry="15" stroke="none"/><circle cx="24" cy="31" r="10.5" stroke="none"/><circle cx="38" cy="24" r="12.5" stroke="none"/><circle cx="52" cy="31" r="9.5" stroke="none"/><circle cx="31" cy="38" r="2" fill="#000" stroke="none"/><circle cx="44" cy="38" r="2" fill="#000" stroke="none"/><path d="M33 44q4 4 8 0" fill="none" stroke-width="2.5" stroke-linecap="round"/></svg>';

/** One A4 sheet as HTML. `city` is the selected city's name, or empty for a blank line to write on. */
export function calendarPage({ year, month }, city = '') {
  const weeks = monthGrid(year, month);
  const cells = weeks.flat().map(day => (day ? `<div class="cal-c"><span>${day}</span><i></i></div>` : '<div class="cal-c cal-e"></div>')).join('');
  const legend = Object.entries(LEVELS)
    .map(([level, { name }]) => `<div class="cal-lg"><b style="background:var(--l${level}-solid)"></b><span><em>${level}</em>${esc(name)}</span></div>`)
    .join('');
  return (
    `<div class="cal-page"><header><div><h1>${esc(CAL.heading)}</h1><div class="cal-sub">${esc(monthLabel({ year, month }))}</div></div>` +
    `<div class="cal-f">${esc(CAL.city)} ${city ? `<u>${esc(city)}</u>` : '______________'}<br>${esc(CAL.name)} ______________</div></header>` +
    `<div class="cal-g"><div class="cal-h">${CAL.days.map(d => `<div>${d}</div>`).join('')}</div><div class="cal-b" style="--rows:${weeks.length}">${cells}</div></div>` +
    `<div class="cal-leg">${legend}</div><div class="cal-ins">${esc(CAL.instruction)}</div><div class="cal-note">${esc(CAL.note)}</div>` +
    `<footer><span>${esc(SITE_HOST)}</span><span class="cal-r">${esc(CAL.brand)} ${CLOUD}</span></footer></div>`
  );
}
