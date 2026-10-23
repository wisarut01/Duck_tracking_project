# Deploy (Phase 3): Vercel + Render + Supabase

```
มือถือ / คอม ──HTTPS──> Vercel (เว็บ)  ── /api/* ──> Render (gateway + auth/tracker/docs ใน container เดียว)
                    │                                    │
                    └── login ด้วย Google ──> Supabase Auth  └──> Supabase Postgres (schema tb_auth / tb_tracker / tb_docs)
```

- **ฟรีทั้งหมด** (Vercel Hobby, Render Free, Supabase Free)
- Render free จะหลับเมื่อไม่มีคนใช้ 15 นาที **การเปิดครั้งแรกหลังจากนั้นต้องรอราว 1 นาที**
- **ใครมีบัญชี Google ก็ sign in ได้** (`ALLOWED_EMAILS=*`) และทุกคนเห็น แก้ และลบข้อมูลได้ทั้งหมดเท่ากัน เพราะ MVP ยังไม่มีสิทธิ์แยกราย project อย่าแชร์ URL ในที่สาธารณะ ถ้าอยากจำกัดคนเข้าทีหลัง ดูหัวข้อ "จำกัดคนเข้าใช้"
- ทำตามลำดับข้างล่าง ค่าที่เป็น **ความลับ** ให้ใส่ใน dashboard เท่านั้น ห้ามใส่ใน git หรือส่งในแชต

ชื่อที่ไฟล์ในโปรเจกต์ใช้อยู่ (ถ้าชื่อไหนมีคนใช้แล้ว ดูหัวข้อ "ถ้าได้ชื่ออื่น" ด้านล่าง):

| | ชื่อ | URL |
|---|---|---|
| Render service | `duck-tracking-api` | https://duck-tracking-api.onrender.com |
| Vercel project | `duck-tracking` | https://duck-tracking.vercel.app |

## 1. Supabase

1. **New project** → ตั้งชื่อ `tracking-board`, region **Singapore**, ตั้ง Database password แล้วจดเก็บไว้
2. **Authentication → Sign In / Providers → Email** → ปิด (เราใช้ Google อย่างเดียว)
3. **Authentication → URL Configuration**
   - Site URL: `https://duck-tracking.vercel.app`
   - Redirect URLs: เพิ่ม `https://duck-tracking.vercel.app/**` และ `http://localhost:5173/**`
4. จดค่าเหล่านี้ไว้ใช้ในขั้นต่อไป:

| ค่า | อยู่ที่ไหน | ความลับ? |
|---|---|---|
| Project URL `https://<ref>.supabase.co` | Project Settings → Data API (หรือหน้า Connect) | ไม่ |
| Publishable key (`sb_publishable_…` หรือ anon key แบบเก่า) | Project Settings → API Keys | ไม่ (อยู่ในเว็บอยู่แล้ว) |
| Connection string แบบ **Session pooler** `postgresql://postgres.<ref>:<password>@aws-…pooler.supabase.com:5432/postgres` | ปุ่ม **Connect** ด้านบน → Session pooler | **ใช่** |

> - ใน connection string ให้แทน `[YOUR-PASSWORD]` ด้วยรหัสจริง ถ้ารหัสมีอักขระพิเศษ เช่น `@ : / ? #` ต้อง URL-encode ก่อน (เช่น `@` → `%40`)
> - ใช้แบบ **Session pooler** เท่านั้น เพราะแบบ Direct บน free plan ใช้ได้เฉพาะ IPv6 ซึ่ง Render ต่อไม่ได้
> - ตารางของเราอยู่ใน schema `tb_*` ไม่ได้อยู่ใน `public` จึงไม่ถูกเปิดผ่าน Data API ของ Supabase

## 2. Google (OAuth client สำหรับ Supabase)

1. https://console.cloud.google.com → สร้าง project ใหม่ เช่น `tracking-board`
2. **Google Auth Platform → Branding**: ใส่ชื่อแอปกับอีเมลของคุณ
3. **Audience**: เลือก External แล้วกด **Publish app** (สถานะ In production)
   - เราขอแค่ email กับ profile ซึ่ง Google ไม่ต้องตรวจสอบแอป
   - ถ้าค้างไว้ที่โหมด Testing ต้องเพิ่มทุกคนเป็น test user ใน Google ด้วยอีกที่หนึ่ง
4. **Clients → Create client → Web application**
   - Authorized redirect URIs: คัดลอกค่า **Callback URL** จาก Supabase → Authentication → Sign In / Providers → Google (รูปแบบ `https://<ref>.supabase.co/auth/v1/callback`)
5. นำ **Client ID** และ **Client secret** ไปใส่ใน Supabase → Google provider → **Enable** → Save

## 3. Render (backend)

1. https://dashboard.render.com → **New → Blueprint** → เชื่อม GitHub แล้วเลือก repo `Duck_tracking_project`
2. Render จะอ่าน `render.yaml` แล้วถามค่า 2 ตัว (`ALLOWED_EMAILS` ตั้งเป็น `*` ไว้ให้แล้ว):

| Key | ใส่อะไร |
|---|---|
| `DATABASE_URL` | connection string แบบ Session pooler จากข้อ 1 (**ความลับ**) |
| `SUPABASE_URL` | `https://<ref>.supabase.co` |

3. **Apply** แล้วรอ build ครั้งแรกราว 5–10 นาที
4. เปิด https://duck-tracking-api.onrender.com/health ต้องได้ `{"status":"ok"}`

ตอน start ครั้งแรก service จะสร้าง schema กับตารางให้เอง โดยไม่ใส่ข้อมูลตัวอย่าง

## 4. Vercel (เว็บ)

1. https://vercel.com/new → import repo `Duck_tracking_project`
2. ตั้งค่า:
   - **Project Name**: `duck-tracking`
   - **Root Directory**: `web` (Framework จะขึ้นเป็น Vite เอง)
   - **Environment Variables**:

| Key | Value |
|---|---|
| `VITE_API_BASE_URL` | `/api/v1` |
| `VITE_SUPABASE_URL` | `https://<ref>.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | publishable (หรือ anon) key จากข้อ 1 |

3. **Deploy** แล้วเปิด https://duck-tracking.vercel.app → กด **เข้าสู่ระบบด้วย Google**

`web/vercel.json` จะส่ง `/api/*` ต่อไปที่ Render เว็บกับ API จึงอยู่ domain เดียวกัน (ไม่ต้องตั้ง CORS)

## 5. Backup ทุกวัน (GitHub Actions)

GitHub → repo → **Settings → Secrets and variables → Actions → New repository secret**

| Secret | Value |
|---|---|
| `SUPABASE_DB_URL` | connection string เดียวกับ `DATABASE_URL` ใน Render |
| `BACKUP_PASSPHRASE` | ข้อความสุ่มยาว ๆ **เก็บไว้ใน password manager** ถ้าหายจะเปิด backup ไม่ได้ |

แล้วไปที่ **Actions → Backup database → Run workflow** สั่งรันหนึ่งครั้ง เพื่อเช็กว่าใช้ได้

- หลังจากนั้นจะรันเองทุกวันตอนตี 2 (เวลาไทย) และเก็บไฟล์ไว้ 30 วัน (ไฟล์ถูกเข้ารหัส)
- การรันทุกวันยังช่วยไม่ให้ Supabase pause project ด้วย

**กู้คืนจาก backup:**

```bash
# ดาวน์โหลด artifact tb-backup-N จากหน้า Actions แล้วแตก zip จะได้ tb.dump.gpg
gpg --batch --passphrase '<BACKUP_PASSPHRASE>' -d tb.dump.gpg > tb.dump
# --clean ลบตารางเดิมใน tb_* ก่อนแล้วค่อยใส่ข้อมูลจาก backup
docker run --rm -i postgres:17-alpine pg_restore --clean --if-exists --no-owner -d '<SUPABASE_DB_URL>' < tb.dump
```

## จำกัดคนเข้าใช้ (ถ้าต้องการทีหลัง)

ค่าเริ่มต้นคือ `ALLOWED_EMAILS=*` ทุกบัญชี Google เข้าได้ ถ้าจะจำกัด:
Render → `duck-tracking-api` → **Environment** → เปลี่ยน `ALLOWED_EMAILS` เป็นรายชื่อ คั่นด้วย `,`
เช่น `you@gmail.com,friend@gmail.com` หรือ `@domain.com` ทั้ง domain → Save (service จะ restart เอง)

- คนที่ไม่อยู่ในรายชื่อจะ login ด้วย Google ได้ แต่จะเด้งกลับมาหน้า login พร้อมข้อความว่าไม่ได้รับอนุญาต
- ถ้าตั้ง Google ไว้ในโหมด Testing (ข้อ 2) ต้องเพิ่มเขาเป็น test user ใน Google ด้วย

## ถ้าได้ชื่ออื่น

- **Render URL ไม่ใช่ `duck-tracking-api.onrender.com`**: แก้ `destination` ใน `web/vercel.json` → commit → push แล้ว Vercel จะ deploy ใหม่เอง
- **Vercel URL ไม่ใช่ `duck-tracking.vercel.app`**: แก้ Site URL / Redirect URLs ใน Supabase (ข้อ 1.3) และ `CORS_ORIGINS` ใน Render

## เจอปัญหา

| อาการ | สาเหตุ / ทางแก้ |
|---|---|
| เปิดเว็บแล้วโหลดนาน หรือขึ้น error ครั้งแรก | Render กำลังตื่น รอ ~1 นาทีแล้ว reload |
| login Google แล้วเด้งไป `localhost` | Site URL / Redirect URLs ใน Supabase ยังไม่ใช่ URL ของ Vercel |
| "… is not allowed to use this app" | ตั้ง `ALLOWED_EMAILS` เป็นรายชื่อไว้ และอีเมลนั้นไม่อยู่ในรายชื่อ |
| `redirect_uri_mismatch` จาก Google | Redirect URI ใน Google ไม่ตรงกับ Callback URL ของ Supabase |
| Render log ขึ้น `load Supabase signing keys` | `SUPABASE_URL` ผิด |
| Render log ขึ้น `password authentication failed` | รหัสใน `DATABASE_URL` ผิด หรือยังไม่ได้ URL-encode |
| Supabase แจ้งว่า project ถูก pause | ไม่มีใครใช้และ backup ไม่ได้รันมา 7 วัน → กด Restore ใน dashboard แล้วเช็กว่า workflow backup ยังทำงานอยู่ |
