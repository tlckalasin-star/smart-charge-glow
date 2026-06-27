
# แผนออกแบบใหม่ MPPT Solar Charge Controller (HM-6096)

ทำ UI ใหม่ทั้งหมดให้ดูทันสมัย อ่านง่าย ใช้ภาษาไทย พร้อม mock data + โครงสร้าง service layer ที่เสียบ Tuya Cloud API ได้ภายหลัง

## Design system

- ธีม: Solar Glow Dark
  - bg `#0a0e1a`, surface `#151b2e`, accent ส้ม `#f59e0b` (PV/พลังงาน), accent เขียว `#10b981` (BAT/สถานะปกติ), แดง `#ef4444` เตือน
- ฟอนต์: IBM Plex Sans Thai (หัว/เนื้อ), JetBrains Mono สำหรับตัวเลข metric
- การ์ดมุมโค้ง `rounded-2xl`, เส้นขอบบาง `border-white/5`, glow subtle รอบค่าหลัก
- ทุก token ใส่ใน `src/styles.css` (oklch) ไม่ hardcode สี

## โครงสร้าง route

```
src/routes/
  __root.tsx              (ครอบ ThemeProvider + QueryClient)
  index.tsx               หน้า Dashboard หลัก
  settings.tsx            หน้า Setting (Battery / Voltages / Switches / Timer)
  device-info.tsx         ข้อมูลอุปกรณ์ (ID/IP/MAC/Timezone/RSSI)
  history.tsx             กราฟ Day/Week/Month แบบเต็มจอ
```

Header ใน `__root.tsx`: โลโก้ HM-6096 + สถานะ standby/charging + ปุ่ม Restart + bottom nav (Dashboard / กราฟ / ตั้งค่า / ข้อมูล)

## หน้า Dashboard (`/`)

Bento-grid responsive:

```text
┌──────────────────────────────────────────┐
│ Status pill • อุณหภูมิ 38°C • Restart    │
├───────────────┬──────────────────────────┤
│ Hero: BAT %   │ Day Energy / Total       │
│ วงกลม 50%     │ 0.01 / 0.5 kWh           │
├───────┬───────┼──────────────────────────┤
│ PV    │ BAT   │ Load                     │
│ 24.9V │ 24.6V │ 0V / 0W                  │
│ 0W    │ 0.0W  │                          │
├───────┴───────┴──────────────────────────┤
│ กราฟ BAT Power (Day/Week/Month tabs)     │
└──────────────────────────────────────────┘
```

- การ์ด PV/BAT/Load: ไอคอน lucide (`Sun`, `BatteryCharging`, `Lightbulb`), ตัวเลขใหญ่ + หน่วยเล็ก, แถบ progress สำหรับ BAT %
- Flow diagram เล็กๆ ด้านบน hero: PV → Controller → BAT / Load พร้อมเส้น animated เมื่อมีกระแสไหล
- กราฟใช้ Recharts (AreaChart, gradient ส้ม), tabs Day/Week/Month

## หน้า Setting (`/settings`)

จัดกลุ่มเป็น sections (ไม่ใช่ list ยาวๆ แบบเดิม):

1. **แบตเตอรี่** — BAT Voltage (24V), BAT Type (Seal/Gel/Flooded/Li), Balance 28.8V
2. **แรงดัน** — Over-vol 27.2V, Recovery 23.0V, Under-vol 22.0V (slider + input)
3. **โหลด** — Load Mode (24H/อื่นๆ), Power Set 30%, RTC Timer 18:30–06:30
4. **สวิตช์** — Switch, Switch LED (toggle ใหญ่)
5. ปุ่มล่าง sticky: `อ่านค่า` / `บันทึก`

ใช้ shadcn Card, Slider, Switch, Select, Input — ทุกฟิลด์มี label ไทย + ค่าเดิมจากภาษาอังกฤษเล็กๆ ใต้

## หน้าข้อมูลอุปกรณ์ (`/device-info`)

การ์ดเดียว: ID เสมือน, IP, MAC, โซนเวลา, ความแรงสัญญาณ (–32dBm + แท่ง bar 4 ขีด) — แต่ละบรรทัดมีปุ่ม copy

## Data layer

- `src/lib/tuya/types.ts` — type ของ device status (pv_voltage, bat_voltage, ...)
- `src/lib/tuya/mock.ts` — mock data ตามภาพที่อัปโหลด
- `src/lib/tuya/client.ts` — interface `getDeviceStatus()`, `setDeviceSettings()` — ตอนนี้ return mock; เตรียมจุดต่อ Tuya OpenAPI
- `src/lib/tuya/queries.ts` — `deviceStatusQueryOptions()` ใช้กับ TanStack Query (refetch ทุก 5s)
- หน้า Dashboard ใช้ `useSuspenseQuery` อ่านจาก mock client

## เทคนิค

- ตั้ง viewport preview เป็น mobile (390×844) เพราะเป็น mobile app
- ติดตั้ง: `@fontsource/ibm-plex-sans-thai`, `@fontsource/jetbrains-mono`, `recharts`, `lucide-react` (มีแล้ว)
- ไม่เปิด Lovable Cloud ในรอบนี้ (รอเชื่อม Tuya จริง)
- เพิ่ม head() metadata ไทยทุก route

## สิ่งที่จะส่งมอบ

1. หน้า Dashboard ใหม่ที่ดูง่ายขึ้นมาก (จัดกลุ่ม + ลำดับสายตา)
2. Setting แยกกลุ่มชัดเจน
3. Device Info สะอาด
4. โครง service layer พร้อมต่อ Tuya Cloud (ขั้นต่อไปแค่ใส่ Access ID/Secret)
