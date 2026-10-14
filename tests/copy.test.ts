import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { ACTIVITIES, EMERGENCY_NUMBER, FACTS, LEVELS, OFFICIAL_ISPU, STORY, UI } from '../web/copy.js';

const ISPU_NAMES = ['Baik', 'Sedang', 'Tidak Sehat', 'Sangat Tidak Sehat', 'Berbahaya'];
const SLANG = /\b(gas|halu|plis|lebay|ngebut|vonis|faskes|mantan|DJ|sinetron)\b/i;
const KAMU = /\b(kamu|kotamu|napasmu|lokasimu)\b/i;
// The app suggests, official sources prescribe, the user decides: no orders in health lines.
const COMMANDING = /segera ke\b|harus segera|\b(kamu|anda) harus\b|\bwajib\b/i;
const BANNED_WORDS = /puskesmas|\bRS\b|\bIGD\b|faskes/;

/** Every string in copy.js, with function entries called on sample arguments. */
function allCopy(): string[] {
  const out: string[] = [];
  const walk = (value: unknown): void => {
    if (typeof value === 'string') out.push(value);
    else if (typeof value === 'function') walk((value as (...args: unknown[]) => unknown)('Pagi!', 'Rabu 10.00', 3, 'Kurangi aktivitas di luar.'));
    else if (Array.isArray(value)) value.forEach(walk);
    else if (value && typeof value === 'object') Object.values(value).forEach(walk);
  };
  walk(LEVELS); walk(ACTIVITIES); // OFFICIAL_ISPU is a quote and stays exempt
   walk(UI); walk(FACTS); walk(STORY);
  return out;
}

describe('LEVELS', () => {
  for (const level of [1, 2, 3, 4, 5]) {
    const copy = LEVELS[level];

    it(`level ${level} uses the official ISPU name and carries none of our own advice`, () => {
      assert.equal(copy.name, ISPU_NAMES[level - 1]);
      for (const key of ['headline', 'everyone', 'sensitive', 'dayLine']) assert.ok(!(key in copy), key);
    });

    it(`level ${level} is light, and says "kamu", only at levels 1–2`, () => {
      assert.equal((copy.quips ?? []).length > 0, level <= 2);
      for (const line of copy.quips ?? []) assert.doesNotMatch(line, KAMU, line);
    });

    it(`level ${level} offers health access from level 3, 119 from level 4, good news up to level 2`, () => {
      assert.equal(copy.health, level >= 3);
      assert.equal(copy.emergency, level >= 4);
    });

    it(`level ${level} has a status for every household tile, and smoke closes the windows from level 4`, () => {
      assert.deepEqual(Object.keys(copy.activities).sort(), ACTIVITIES.map(a => a.id).sort());
      for (const activity of ACTIVITIES) assert.ok(['ok', 'caution', 'no'].includes(copy.activities[activity.id]), activity.id);
      if (level >= 4) assert.deepEqual(copy.activities, { laundry: 'no', windows: 'no' });
    });

    it(`level ${level} quips avoid slang older readers stumble on, and never claim "aman"`, () => {
      for (const line of copy.quips ?? []) {
        assert.doesNotMatch(line, SLANG, line);
        assert.doesNotMatch(line, /\baman\b/i, line);
      }
    });
  }

  it('words the quips as agreed: non-health only', () => {
    assert.deepEqual(LEVELS[1].quips, ['Langit lagi bersih-bersihnya.', 'Jemuran lagi senang hari ini.', 'Awan putih, langit biru.']);
    assert.deepEqual(LEVELS[2].quips, ['Langit agak berkabut tipis.', 'Langit belum sebersih kemarin, tapi masih cerah.']);
  });
});

describe('OFFICIAL_ISPU', () => {
  // Copied exactly from the ISPU app (ispu.kemenlh.go.id): the category descriptions and ispu_info. A quote must stay exact, so it is
  // frozen here and left out of the banned-word tests (it says "Boleh").
  const FROZEN = {
    1: {
      description: 'Tingkat kualitas udara yang sangat baik, tidak memberikan efek negatif terhadap manusia, hewan, tumbuhan.',
      sensitive: null,
      everyone: 'Sangat baik untuk melakukan kegiatan di luar ruangan.'
    },
    2: {
      description: 'Tingkat kualitas udara masih dapat diterima pada kesehatan manusia, hewan dan tumbuhan.',
      sensitive: 'Kurangi aktivitas fisik yang terlalu lama atau berat.',
      everyone: 'Masih dapat beraktivitas di luar ruangan.'
    },
    3: {
      description: 'Tingkat kualitas udara yang bersifat merugikan pada manusia, hewan dan tumbuhan.',
      sensitive:
        'Boleh beraktivitas di luar dengan rehat lebih sering dan aktivitas ringan. Amati gejala seperti batuk atau sesak napas. Penderita asma harus mengikuti petunjuk kesehatan dan membawa obat. Penderita penyakit jantung perlu mewaspadai gejala seperti palpitasi, sesak napas, atau kelelahan tidak biasa.',
      everyone: 'Kurangi aktivitas fisik yang terlalu lama di luar ruangan.'
    },
    4: {
      description: 'Tingkat kualitas udara yang dapat meningkatkan resiko kesehatan pada sejumlah segmen populasi yang terpapar.',
      sensitive: 'Hindari semua aktivitas di luar ruangan, perbanyak aktivitas di dalam ruangan atau jadwalkan ulang.',
      everyone: 'Hindari aktivitas fisik terlalu lama di luar ruangan dan pertimbangkan beraktivitas di dalam ruangan.'
    },
    5: {
      description: 'Tingkat kualitas udara yang dapat merugikan kesehatan serius pada populasi dan perlu penanganan cepat.',
      sensitive: 'Tetap di dalam ruangan dan hanya melakukan sedikit aktivitas.',
      everyone: 'Hindari seluruh aktivitas di luar ruangan.'
    }
  };

  it('is word for word what the ISPU app says', () => {
    assert.deepEqual(OFFICIAL_ISPU, FROZEN);
  });

  it('is not part of the banned-word walk, so the quote stays exact', () => {
    assert.ok(!allCopy().includes(FROZEN[3].sensitive));
  });

  it('labels and names the source', () => {
    assert.equal(UI.guideTitle, 'Menurut ISPU, kalau levelnya memang begini:');
    assert.match(UI.guideWho, /WHO\/Europe/);
    assert.match(UI.guideCaution, /meleset/);
    assert.equal(UI.guideSensitive, 'Kelompok sensitif:');
    assert.equal(UI.guideEveryone, 'Setiap orang:');
    assert.match(UI.guideSource, /ISPU, Kementerian Lingkungan Hidup/);
    assert.match(UI.guideRegulation, /Permen LHK No\. 14 Tahun 2020/);
  });
});

describe('satellite map caption', () => {
  it('explains the red hotspot dots the map overlays', () => {
    assert.match(UI.satMapCaption, /Titik merah: titik panas/);
    assert.match(UI.satMapCaption, /perkecil/);
  });
});

describe('reminder', () => {
  it('words the link and the confirmation plainly', () => {
    assert.equal(UI.remind, 'Ingatkan tiap pagi');
    assert.match(UI.remindDone, /07\.00 selama 30 hari/);
  });
});

describe('satellite thumbnail', () => {
  it('labels the thumbnail plainly', () => {
    assert.equal(UI.satThumbLabel, 'Lihat asap dari satelit');
  });
});

describe('solidarity strip', () => {
  it('says it plainly, with no level and no promise', () => {
    assert.equal(UI.solidarity, 'Turut prihatin untuk warga yang terdampak asap.');
    assert.doesNotMatch(UI.solidarity, /berduka|aman|donasi|gratis/i);
  });
});

describe('head note', () => {
  it('hedges first in the header and keeps the method link', () => {
    assert.equal(UI.headNote, 'Perkiraan, bisa meleset ·');
    assert.equal(UI.methodLink, 'Metode & sumber');
  });
});

describe('household tiles', () => {
  it('keeps only "Jemur baju" and "Jendela", under "Urusan rumah hari ini"', () => {
    assert.deepEqual(ACTIVITIES.map(a => a.label), ['Jemur baju', 'Jendela']);
    assert.equal(UI.todayTitle, 'Urusan rumah hari ini');
  });
});

describe('health lines', () => {
  it('suggests, by urgency: a mild line and a severe line, with 119 only in the severe one', () => {
    assert.equal(UI.symptoms, 'Batuk terus atau sesak? Periksa ke fasilitas kesehatan. Sesak berat atau nyeri dada: hubungi 119.');
    assert.ok(UI.symptoms.indexOf('fasilitas kesehatan') < UI.symptoms.indexOf('119'));
  });

  it('shows both lines from level 3 and the 119 button from level 4; none before', () => {
    assert.deepEqual([1, 2, 3, 4, 5].map(n => LEVELS[n].health), [false, false, true, true, true]);
    assert.deepEqual([1, 2, 3, 4, 5].map(n => LEVELS[n].emergency), [false, false, false, true, true]);
  });

  it('searches for health facilities without sending a position', () => {
    assert.equal(UI.healthButton, 'Cari fasilitas kesehatan');
    assert.equal(UI.healthQuery, 'fasilitas kesehatan terdekat');
  });

  it('has no N95 advice of our own', () => {
    for (const line of [...allCopy(), ...FACTS]) assert.doesNotMatch(line, /N95/, line);
  });

  it('says whose guidance this follows', () => {
    assert.equal(UI.medicalNote, 'Panduan di sini dikutip dari ISPU (Kementerian Lingkungan Hidup). Untuk kondisi kesehatan, tanyakan ke tenaga kesehatan.');
  });
});

describe('method sheet', () => {
  const method = [UI.methodTitle, UI.methodLink, UI.explainMethod, UI.methodHealthTitle, UI.methodHealth, UI.methodMakerTitle, UI.methodMaker, UI.methodFeedback, ...UI.methodSources, ...UI.methodLevel, ...UI.methodLimits];

  it('never claims "aman" and never says "kamu" in the limits', () => {
    for (const line of method) assert.doesNotMatch(line, /\baman\b/i, line);
    for (const line of UI.methodLimits) assert.doesNotMatch(line, KAMU, line);
  });

  it('names the sources, the 24-hour average, the ISPU regulation and the limits', () => {
    const text = [...UI.methodSources, ...UI.methodLevel, ...UI.methodLimits].join(' ');
    for (const word of [/Copernicus/, /Open-Meteo/, /NASA FIRMS/, /NOAA-20/, /100 km/, /setiap jam/, /24 jam/, /P\.14\/2020/, /model komputer/, /ISPU/]) assert.match(text, word);
  });

  it('stays humble: no claims of accuracy, validity or endorsement', () => {
    for (const line of method) assert.doesNotMatch(line, /akurat|terpercaya|\bvalid|ilmiah|\bpasti\b|jaminan|\baman\b|berbasis sains/i, line);
  });

  it('says the same as the medical note: quoted from ISPU, ask a health professional', () => {
    assert.equal(UI.methodHealth, UI.medicalNote);
  });

  it('keeps every section short: at most 4 lines, none over 140 characters', () => {
    for (const lines of [UI.methodSources, UI.methodLevel, UI.methodLimits]) assert.ok(lines.length <= 4);
    for (const line of method) assert.ok(line.length <= 140, line);
  });
});

describe('all copy', () => {
  it('never uses puskesmas, RS, IGD or faskes', () => {
    for (const line of allCopy()) assert.doesNotMatch(line, BANNED_WORDS, line);
  });

  it('does not order the reader around in health lines ("kalau harus …" stays fine)', () => {
    for (const line of allCopy()) assert.doesNotMatch(line, COMMANDING, line);
  });

  it('has no jokes in the facts and no body or breathing jokes anywhere', () => {
    for (const line of [...FACTS, ...allCopy()]) assert.doesNotMatch(line, /paru-paru (lagi|ikut)|\bjoget|\bmantan\b|\bdemo\b/i, line);
    assert.equal(FACTS.length, 3);
    assert.ok(!FACTS.some(f => /Titik panas bukan cuma/.test(f)));
  });

  it('keeps the owner-approved draft note for the health reviewer', () => {
    const source = readFileSync(new URL('../web/copy.js', import.meta.url), 'utf8');
    assert.match(source, /DRAFT: level 3–5 safety copy, the activity statuses and the symptom lines/);
    assert.match(source, /the app suggests, official sources prescribe, the user decides/i);
  });
});

describe('estimates and suggestions', () => {
  it('words the overview line as agreed', () => {
    assert.equal(UI.overviewSub(12), '12 kota di Sumatera dan Kalimantan, diurutkan dari perkiraan asap paling tebal. Pilih kota.');
  });

  it('starts the expired-report share fallback with the estimate prefix', () => {
    assert.equal(UI.shareFallback('Apa Kabar Udara'), 'Apa Kabar Udara (perkiraan, bukan angka resmi)\nApa Kabar Udara');
  });

  it('keeps the emergency number in the disclaimer and labels the source fold', () => {
    assert.ok(UI.footerDisclaimer.includes(EMERGENCY_NUMBER));
    assert.equal(UI.footerDisclaimer.split(EMERGENCY_NUMBER).length, 2);
    for (const line of [UI.creditsTitle, UI.footerDisclaimer]) assert.doesNotMatch(line, /\b(akurat|valid|pasti|gratis|boleh|harus|aman)\b/i, line);
  });

  it('never uses "boleh", "parah", "pasti", "akurat" or "aman" in user-facing copy', () => {
    for (const line of allCopy()) assert.doesNotMatch(line, /\b(boleh|parah|pasti|akurat|aman)\b/i, line);
  });
});

describe('hedge first', () => {
  it('starts the answer-card level text, the story level line and the section titles with "Perkiraan"', () => {
    for (const level of [1, 2, 3, 4, 5]) {
      assert.equal(UI.levelOf(level), `(${level} dari 5)`);
      assert.match(STORY.levelName(LEVELS[level].name), /^Perkiraan: /);
    }
    assert.equal(UI.eyebrow, 'Perkiraan hari ini');
    assert.equal(UI.overviewTitle, 'Perkiraan asap hari ini');
    assert.match(UI.outlookSub, /^Perkiraan beberapa hari ke depan\./);
    assert.equal(STORY.stamp('Rabu 10.00'), 'Diperbarui Rabu 10.00');
  });
});

describe('UI', () => {
  it('shows the level against its scale', () => {
    assert.equal(UI.levelLabel('Tidak Sehat', 3), 'Tidak Sehat · level 3 dari 5');
  });

  it('starts every shared text with the brand and "perkiraan, bukan angka resmi"', () => {
    const prefix = /^Apa Kabar Udara \(perkiraan, bukan angka resmi\)\n/;
    assert.match(UI.shareText('Palembang', 'Rabu 10.00', 3, null), prefix);
    assert.match(UI.shareOverview, prefix);
  });

  it('dates shared messages with city, weekday, time, level name and "level X dari 5"', () => {
    assert.equal(
      UI.shareText('Palembang', 'Rabu 10.00', 3, null),
      'Apa Kabar Udara (perkiraan, bukan angka resmi)\nPalembang, Rabu 10.00: Tidak Sehat (level 3 dari 5). Panduan resmi ISPU ada di link.'
    );
    assert.equal(
      UI.shareText('Palembang', 'Rabu 10.00', 1, 'Awan putih, langit biru.'),
      'Apa Kabar Udara (perkiraan, bukan angka resmi)\nPalembang, Rabu 10.00: Baik (level 1 dari 5). Awan putih, langit biru. Panduan resmi ISPU ada di link.'
    );
  });

  it('words the new lines as agreed', () => {
    assert.equal(UI.improveOn('Jumat'), 'Diperkirakan mulai membaik Jumat.');
    assert.equal(UI.improveNone(4), 'Perkiraan 4 hari ke depan belum menunjukkan perbaikan.');
    assert.equal(UI.installButton, 'Pasang di layar utama');
    assert.equal(UI.storySaved, 'Gambar diunduh. Unggah ke Story dari galeri. Kalau tidak muncul, buka halaman ini di Safari atau Chrome.');
    assert.equal(UI.storyTapAgain, 'Gambarnya sudah siap. Ketuk sekali lagi untuk membagikan.');
    assert.equal(UI.tagline, 'Perkiraan asap & kualitas udara hari ini');
  });

  it('words the batch 3 P0 lines as agreed', () => {
    assert.equal(UI.bestWindow(3, 'besok', '09.00', '11.00', 3), 'Asap paling tipis di siang hari: besok, 09.00–11.00 (perkiraan: masih Tidak Sehat)');
    assert.equal(UI.bestWindow(3, 'besok', '09.00', '11.00', 2), 'Asap paling tipis di siang hari: besok, 09.00–11.00');
    assert.equal(UI.bestWindow(2, 'besok', '09.00', '11.00', 3), 'Asap paling tipis di siang hari: besok, 09.00–11.00');
    assert.equal(UI.bestWindow(1, 'hari ini', '13.00', '15.00'), 'Udara paling segar di siang hari: hari ini, 13.00–15.00');
    assert.match(UI.explain(10)[0], /^Level ini perkiraan komputer dari data satelit dan cuaca/);
    assert.match(UI.footerDisclaimer, /^Level dan angka di sini perkiraan, bukan hasil alat ukur\./);
    assert.equal(UI.stripLegend('Sedang', 'Sedang'), 'Semua jam diperkirakan Sedang. Makin tinggi batang, makin tebal asap.');
    assert.equal(UI.stripLegend('Sedang', 'Tidak Sehat'), 'Warna = level per jam, dari Sedang sampai Tidak Sehat. Makin tinggi batang, makin tebal asap.');
    assert.equal(UI.stripRange('Sangat Tidak Sehat', 'Berbahaya'), 'dari Sangat Tidak Sehat sampai Berbahaya');
    assert.equal(UI.stripRange('Berbahaya', 'Berbahaya'), 'semuanya Berbahaya');
    assert.match(UI.privacy, /GoatCounter, tanpa profil per orang/);
    assert.match(UI.privacy, /Masukan lewat Tally tersimpan di Tally\./);
    assert.match(UI.privacy, /peta satelit.*server NASA \(gibs\.earthdata\.nasa\.gov\).*tidak ada yang dikirim/);
    assert.ok(!('feedbackSend' in UI) && !('feedbackThanks' in UI) && !('sensitiveIntro' in UI) && !('sensitivePrefix' in UI) && !('windowsShut' in UI));
  });

  it('words the batch 3 P1 lines as agreed', () => {
    assert.equal(UI.stamp('11.00 WIB'), 'Diperbarui 11.00 WIB · bisa meleset ·');
    assert.equal(UI.moreTitle, 'Fakta asap');
    assert.ok(!('moreTitleNoFacts' in UI));
    assert.ok(FACTS.includes('El Niño cenderung membuat musim kemarau lebih kering dan lebih panjang, sehingga api lebih mudah menyebar.'));
    assert.ok(!FACTS.some(f => /berhari-hari di bawah permukaan/.test(f)));
    assert.equal(UI.storyLinkCopied, 'Link kota ini sudah disalin. Di Instagram, tambahkan stiker Link lalu tempel.');
  });

  it('words the batch 3 Fun lines as agreed', () => {
    assert.equal(UI.betterSince('Sedang'), 'Perkiraannya membaik sejak terakhir kamu cek (sebelumnya Sedang).');
    assert.ok(LEVELS[1].quips.includes('Awan putih, langit biru.'));
  });

  it('words the satellite photo lines humbly', () => {
    assert.equal(UI.satCaption('14 Oktober 2026'), 'Foto satelit NASA, 14 Oktober 2026. Titik merah: titik panas. Kalau berawan, asap bisa tertutup awan.');
    assert.equal(UI.satPin, 'Pin: pusat kota.');
    assert.equal(UI.satWind('Timur'), 'Angin dari Timur.');
    assert.equal(UI.satLink, 'Buka di NASA Worldview ↗');
    assert.equal(UI.rainDay, 'ada hujan');
    assert.ok(UI.explain(10).includes('Perkiraan ini untuk titik pusat kota. Di kecamatan lain di sekitarnya, asap bisa lebih tebal atau lebih tipis.'));
    assert.equal(UI.satNote, 'Foto diambil saat satelit lewat, bukan saat ini.');
    assert.equal(UI.satAlt('Palangkaraya'), 'Foto satelit NASA untuk Palangkaraya');
    assert.equal(UI.creditGibs, 'NASA GIBS / Worldview (VIIRS)');
    assert.ok(UI.methodSources.some(l => /^Foto satelit: .*NASA GIBS/.test(l)));
    assert.ok(UI.methodSources.some(l => /^Foto satelit: .*gibs\.earthdata\.nasa\.gov.*tidak ada data lain/.test(l)));
    assert.equal(UI.satHint, 'Geser & cubit untuk perbesar');
    assert.ok(!('satExplore' in UI) && !('satBack' in UI));
    for (const line of [UI.satThumbLabel, UI.satHint, UI.moreTitle, UI.satMapCaption, UI.satMapFail, UI.satMapLabel('x'), UI.privacy, ...UI.methodSources]) assert.doesNotMatch(line, /\b(aman|akurat|pasti|gratis|boleh|harus)\b/i);
    for (const line of [UI.satCaption('x'), UI.satPin, UI.satWind('Timur'), UI.satNote, UI.satAlt('x'), UI.satTitle]) assert.doesNotMatch(line, /aman|akurat|pasti/i);
  });

  it('credits the data sources', () => {
    assert.equal(UI.creditOpenMeteo, 'Weather data by Open-Meteo.com');
    assert.match(UI.creditCams(2026), /Copernicus Atmosphere Monitoring Service information 2026/);
  });
});
