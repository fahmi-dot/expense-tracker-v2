# PRD — Expense Tracker v2

## 1. Ringkasan
Aplikasi web pelacak pengeluaran harian untuk satu pengguna. Pengguna dapat mencatat, mengubah, menghapus, mengelompokkan, memfilter, merangkum, dan mengekspor pengeluaran. Masalah yang diselesaikan: pencatatan pengeluaran pribadi perlu terpusat, mudah ditinjau, dan dapat diolah tanpa fitur finansial atau kolaborasi yang tidak diperlukan.

## 2. Tujuan dan metrik keberhasilan
- Pengguna dapat menyelesaikan login dan menambah pengeluaran valid tanpa bantuan.
- Setiap pengeluaran tersimpan dengan nominal, tanggal, kategori, dan deskripsi opsional.
- Ringkasan bulanan menampilkan total yang sama dengan penjumlahan data pada bulan tersebut.
- Ekspor CSV menghasilkan seluruh data sesuai filter yang dipilih dan dapat dibuka sebagai file CSV.
- Tidak ada akses data tanpa autentikasi; tidak ada alur pendaftaran publik.

## 3. Non-goals
- Multi-user, berbagi data, peran, atau kolaborasi.
- Pembayaran, transfer, koneksi bank, atau integrasi finansial.
- Aplikasi mobile native atau pengalaman khusus mobile.
- Pendaftaran publik, pemulihan akun mandiri, dan pengelolaan banyak akun.
- Anggaran, tagihan berulang, investasi, laporan pajak, dan notifikasi.
- Deployment produksi atau keputusan packaging produksi.

## 4. Pengguna dan use case
**Pengguna:** satu pemilik akun lokal.

User stories:
- Sebagai pengguna, saya ingin login agar hanya saya dapat melihat pengeluaran.
- Sebagai pengguna, saya ingin menambah pengeluaran agar catatan harian tersimpan.
- Sebagai pengguna, saya ingin mengedit atau menghapus catatan agar data tetap benar.
- Sebagai pengguna, saya ingin memakai kategori agar pengeluaran mudah dikelompokkan.
- Sebagai pengguna, saya ingin memfilter berdasarkan tanggal agar periode tertentu dapat ditinjau.
- Sebagai pengguna, saya ingin melihat total bulanan agar pola pengeluaran mudah dipahami.
- Sebagai pengguna, saya ingin mengekspor CSV agar data dapat dipakai di spreadsheet.

## 5. Persyaratan fungsional
| ID | Persyaratan | Prioritas | Kriteria penerimaan |
|---|---|---|---|
| FR-001 | Sistem menyediakan login memakai email atau username dan password. | Must | Given kredensial valid, When login dikirim, Then pengguna masuk; kredensial invalid menampilkan error tanpa membocorkan akun mana yang ada. |
| FR-002 | Sistem menggunakan satu akun lokal yang disiapkan di database; tidak ada pendaftaran publik. | Must | Given pengguna belum login, When membuka halaman login, Then hanya tersedia login; endpoint pendaftaran publik tidak tersedia. |
| FR-003 | Pengguna dapat logout dan sesi menjadi tidak berlaku. | Must | Given sesi aktif, When logout dipilih, Then sesi dihapus dan halaman terlindungi meminta login. |
| FR-004 | Pengguna dapat menambah pengeluaran dengan nominal, tanggal, kategori, dan deskripsi opsional. | Must | Given semua field wajib valid, When disimpan, Then satu catatan tampil dengan nilai yang sama; field invalid ditolak dan data tidak tersimpan. |
| FR-005 | Sistem memvalidasi nominal positif dan tanggal valid; kategori wajib dipilih. | Must | Given nominal nol/negatif, tanggal invalid, atau kategori kosong, When form dikirim, Then pesan validasi tampil dan penyimpanan gagal. |
| FR-006 | Pengguna dapat melihat daftar pengeluaran. | Must | Given sesi aktif, When halaman dibuka, Then daftar menampilkan tanggal, kategori, deskripsi, dan nominal setiap catatan. |
| FR-007 | Pengguna dapat mengedit pengeluaran. | Must | Given catatan ada, When perubahan valid disimpan, Then nilai catatan diperbarui dan total terkait ikut berubah. |
| FR-008 | Pengguna dapat menghapus pengeluaran dengan konfirmasi. | Must | Given catatan ada, When penghapusan dikonfirmasi, Then catatan hilang; pembatalan tidak mengubah data. |
| FR-009 | Sistem menyediakan kategori untuk pengeluaran. | Must | Given form pengeluaran dibuka, When kategori dipilih, Then hanya kategori yang tersedia dapat disimpan. Daftar kategori minimum harus ditentukan sebelum implementasi. |
| FR-010 | Pengguna dapat memfilter daftar berdasarkan rentang tanggal dan bulan. | Must | Given filter valid, When diterapkan, Then hanya catatan dalam rentang tampil dan total hasil sesuai data tampil. |
| FR-011 | Sistem menampilkan ringkasan bulanan. | Must | Given bulan dipilih, When ringkasan dibuka, Then total bulan dan jumlah catatan tampil; total sama dengan penjumlahan nominal catatan bulan itu. |
| FR-012 | Pengguna dapat mengekspor data ke CSV. | Must | Given filter aktif atau default seluruh data, When ekspor dipilih, Then file CSV terunduh dengan header dan satu baris per catatan hasil filter. |
| FR-013 | CSV memakai format konsisten dan aman untuk nilai teks. | Should | Given deskripsi mengandung koma, kutip, atau baris baru, When diekspor, Then nilai ter-escape sesuai format CSV dan dapat dibaca parser CSV standar. |
| FR-014 | Endpoint dan halaman data terlindungi autentikasi. | Must | Given tanpa sesi valid, When endpoint data dipanggil, Then akses ditolak dan tidak ada data dikembalikan. |

## 6. Persyaratan non-fungsional
| ID | Persyaratan | Prioritas | Kriteria penerimaan |
|---|---|---|---|
| NFR-001 | UI menggunakan Bahasa Indonesia. | Must | Seluruh label, tombol, validasi, status, dan pesan error yang terlihat pengguna berbahasa Indonesia. |
| NFR-002 | Password disimpan sebagai hash, bukan plaintext. | Must | Pemeriksaan skema/data memastikan hanya password hash tersimpan. |
| NFR-003 | Sesi memakai cookie HTTP-only. | Must | Cookie sesi memiliki atribut HttpOnly; JavaScript sisi klien tidak dapat membaca nilainya. |
| NFR-004 | Sesi memakai perlindungan transport dan konfigurasi cookie yang sesuai lingkungan. | Must | Saat HTTPS digunakan, cookie memiliki Secure; konfigurasi SameSite ditetapkan dan diuji terhadap request lintas situs. |
| NFR-005 | Aplikasi memisahkan server frontend dan backend selama pengembangan. | Must | Frontend dan API dapat dijalankan sebagai server pengembangan independen. |
| NFR-006 | Respons error tidak membocorkan password, hash, atau detail internal. | Must | Request gagal hanya menerima pesan aman dan kode status yang sesuai. |
| NFR-007 | Operasi data tidak mengubah catatan secara parsial. | Must | Jika validasi atau penyimpanan gagal, catatan lama tetap utuh dan pengguna menerima error. |
| NFR-008 | Aplikasi mendukung browser desktop modern yang dipilih tim FSD. | Should | Alur utama berhasil pada browser target tanpa error yang menghalangi.

## 7. Alur pengguna
### Login
1. Pengguna membuka aplikasi.
2. Sistem menampilkan form email/username dan password.
3. Pengguna mengirim kredensial.
4. Valid: masuk ke halaman utama. Invalid: pesan error umum; form tetap dapat dikoreksi.
5. Tanpa sesi, akses ke halaman utama diarahkan kembali ke login.

### Kelola pengeluaran
1. Pengguna memilih tambah.
2. Mengisi nominal, tanggal, kategori, dan deskripsi opsional.
3. Sistem memvalidasi field.
4. Valid: simpan dan tampilkan catatan. Invalid: tampilkan error per field.
5. Edit memakai form yang sama dengan nilai awal. Hapus meminta konfirmasi; batal tidak berdampak.

### Filter, ringkasan, ekspor
1. Pengguna memilih bulan atau rentang tanggal.
2. Sistem menampilkan catatan yang cocok dan ringkasan total.
3. Pengguna memilih ekspor.
4. Sistem mengunduh CSV hasil filter. Jika tidak ada hasil, CSV tetap memiliki header dan tidak memiliki baris data.

## 8. Batasan dan dependensi
- UI: React + Vite + TypeScript.
- API: Node + Express + TypeScript.
- Database: PostgreSQL, nama database `expense`.
- Database deliverable hanya dokumentasi: PostgreSQL 17 alpine, binding `127.0.0.1:5432`, memakai external network `n8n_default`.
- Jangan menjalankan Docker atau terhubung ke database pada tahap PRD.
- Frontend/backend berjalan sebagai server pengembangan terpisah.
- Repository GitHub sudah tersedia. README.md dan .gitignore tidak boleh diubah.
- PRD tidak menentukan framework tambahan, skema implementasi, atau deployment produksi.

## 9. Asumsi
- A-001: Satu akun lokal dibuat melalui provisioning/admin development, bukan UI publik.
- A-002: Mata uang default adalah satu mata uang lokal; simbol dan kode perlu diputuskan.
- A-003: Nominal memakai presisi yang sesuai mata uang dan tidak menerima nilai negatif.
- A-004: Zona waktu dan definisi awal/akhir bulan mengikuti konfigurasi aplikasi yang ditetapkan sebelum FSD.
- A-005: Kategori awal bersifat tetap dan dikelola melalui mekanisme yang ditentukan dalam FSD.
- A-006: Aplikasi terutama dipakai pada desktop; mobile bukan target.

## 10. Risiko
| Risiko | Kemungkinan | Dampak | Mitigasi |
|---|---|---|---|
| Definisi mata uang/presisi belum diputuskan | Sedang | Sedang | Tetapkan sebelum FSD; validasi dan format konsisten. |
| Cookie/sesi salah konfigurasi saat frontend-backend terpisah | Sedang | Tinggi | Uji atribut cookie, origin, SameSite, dan request tanpa sesi. |
| Zona waktu menggeser tanggal atau bulan | Sedang | Tinggi | Tetapkan zona waktu dan uji batas akhir/awal bulan. |
| Ekspor CSV rusak pada teks khusus | Rendah | Sedang | Uji koma, kutip, baris baru, dan karakter non-ASCII. |
| Kehilangan data saat hapus/edit gagal | Rendah | Tinggi | Validasi sebelum simpan dan uji kegagalan operasi. |

## 11. Pertanyaan terbuka
1. Mata uang, simbol, dan presisi nominal apa? **Rekomendasi:** satu mata uang lokal, dua digit desimal.
2. Daftar kategori awal apa? **Rekomendasi:** Makanan, Transportasi, Tagihan, Belanja, Kesehatan, Hiburan, Lainnya.
3. Zona waktu apa untuk tanggal dan ringkasan bulanan? **Rekomendasi:** zona waktu lokal pengguna yang ditetapkan konfigurasi.
4. Bagaimana akun lokal pertama diprovisioning? **Rekomendasi:** seed/manual setup development, tanpa endpoint publik.
5. Browser desktop minimum apa? **Rekomendasi:** dua versi mayor terbaru Chrome, Firefox, dan Edge.
6. Apakah deskripsi wajib memiliki panjang maksimum? **Rekomendasi:** opsional, maksimum 500 karakter.

## 12. Ringkasan acceptance criteria
Proyek selesai bila: login satu akun bekerja dengan password hash dan HTTP-only session cookie; tidak ada pendaftaran publik atau akses anonim; tambah, lihat, edit, hapus pengeluaran bekerja dengan validasi; kategori dan filter tanggal bekerja; ringkasan bulanan akurat; CSV terunduh dan valid; seluruh UI berbahasa Indonesia; error aman; frontend/backend dapat dikembangkan terpisah; batasan PostgreSQL dan dokumentasi database dipatuhi; non-goal multi-user, pembayaran, dan mobile tidak masuk scope.
