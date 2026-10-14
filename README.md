# Apa Kabar Udara

Perkiraan asap dan kualitas udara hari ini, dengan gaya santai.

*A playful, non-profit page that estimates smoke and air quality for 13 cities in Sumatra and Kalimantan.*

Buka: https://apakabarudara.github.io/

## Apa ini?

Halaman kecil yang memberi gambaran asap dan kualitas udara di 13 kota di Sumatra dan Kalimantan. Angkanya **perkiraan dari model** (CAMS, lewat Open-Meteo), bukan hasil alat ukur. Panduan resmi tetap ISPU dari Kementerian Lingkungan Hidup. Proyek ini bukan dokter dan tidak memberi saran kesehatan sendiri.

## Isinya

- Level udara dengan skala 5 tingkat
- "Besok gimana?" dan grafik per jam
- Peta satelit NASA yang bisa digeser, lengkap dengan titik panas dan "di sekitarmu" (ketuk peta)
- Bagikan ke grup, atau ke Story Instagram lewat kartu gambar
- Pantau sampai 3 kota
- Bisa dipasang di layar utama dan tetap terbuka tanpa internet (dengan data terakhir)

## Cara kerjanya

Tiap jam, GitHub Actions mengambil data Open-Meteo (CAMS) dan NASA FIRMS, menyusun laporan, lalu menerbitkan situs ke GitHub Pages. Datanya disimpan di branch `data`. Halaman hanya membaca file-file itu.

## Sumber data dan kredit

- [Weather data by Open-Meteo.com](https://open-meteo.com/) (CC BY 4.0, hanya untuk penggunaan non-komersial)
- Contains modified Copernicus Atmosphere Monitoring Service information (tahun data)
- NASA FIRMS (titik panas)
- NASA GIBS / Worldview (foto satelit VIIRS)
- Batas level ISPU: Permen LHK P.14/2020

## Menjalankan di komputermu

Butuh Node 22 atau lebih baru.

```
npm ci
npm test
npm run dev
npm run build
```

Pengambilan data tiap jam butuh MAP_KEY NASA FIRMS dan tidak perlu untuk pengembangan: repo ini membawa salinan data. Detail ada di [docs/DEVELOPING.md](docs/DEVELOPING.md).

## Berkontribusi

Semua perubahan lewat pull request. Tidak ada yang langsung push ke `main`, termasuk pemilik repo.

1. Fork repo ini.
2. Buat branch `feature/<nama-singkat>` atau `fix/<nama-singkat>`.
3. Jalankan `npm ci && npm test`.
4. Buka pull request ke `main`.

Tes jalan otomatis di pull request. Untuk kontributor baru, pemilik perlu menyetujuinya dengan satu klik; itu normal. Pemilik lalu meninjau dan menggabungkan. Secret dan Actions repo ini tidak tersedia untuk fork.

Perubahan teks harus mengikuti aturan di bagian atas `web/copy.js`: rendah hati dan tanpa saran kesehatan buatan sendiri. Tinjauan tenaga kesehatan untuk teks level 3 sampai 5 masih menunggu.

Masukan dan permintaan kota baru: tombol "Kirim masukan" di aplikasi (formulir Tally).

## Lisensi

MIT, lihat [LICENSE](LICENSE). Dibuat oleh [Khi Hady](https://github.com/khihadysucahyo), proyek sukarela.
