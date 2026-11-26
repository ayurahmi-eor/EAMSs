# EAMS — Enterprise Attendance Management System
HTML + CSS + JavaScript murni, TANPA database SQL (IndexedDB + LocalStorage).

## Cara Menjalankan
1. Buka folder dengan Live Server (VS Code) atau `python -m http.server`.
   (Kamera & QR butuh HTTP localhost / HTTPS, bukan file://)
2. Login: superadmin / hrd / manager / employee / auditor (password = username)

## Fitur
Dashboard, CRUD Karyawan + QR, Face Attendance, QR Attendance,
Keterlambatan otomatis, Jadwal multi-shift, Izin/Cuti + approval,
Lembur, Laporan + export CSV/PDF, RBAC 5 role, Log, Backup JSON.

## Batasan Prototipe
- Data hanya di browser perangkat ini (tidak tersinkron antar-cabang).
- Foto wajah ≠ face recognition biometrik.
- Autentikasi JS lokal tidak setara keamanan server produksi.