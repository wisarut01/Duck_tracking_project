#!/usr/bin/env node
// สร้าง project LRN และ task บทเรียนจาก plan.mjs ลงใน board ผ่าน REST API
// รันซ้ำได้: project หรือ task ที่มีชื่อเดียวกันอยู่แล้วจะถูกข้าม
//
//   TB_TOKEN=<access token> node scripts/lessons/seed.mjs                       # production
//   TB_API=http://localhost:8080/api/v1 TB_TOKEN=<token> node scripts/lessons/seed.mjs
//
// token: เปิดเว็บแล้ว login → DevTools → Console → localStorage.getItem("tb-access-token")
// (หมดอายุใน 1 ชั่วโมง อย่าส่ง token ให้คนอื่น)
import { lessons, project } from "./plan.mjs";

const api = (process.env.TB_API ?? "https://duck-tracking.vercel.app/api/v1").replace(/\/$/, "");
const token = process.env.TB_TOKEN;
if (!token) {
  console.error("ตั้ง TB_TOKEN ก่อน (ดูวิธีเอา token ที่หัวไฟล์นี้)");
  process.exit(1);
}

async function call(method, path, body) {
  const res = await fetch(api + path, {
    method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) {
    const error = new Error(`${method} ${path} → ${res.status} ${data?.error?.message ?? ""}`);
    error.status = res.status;
    throw error;
  }
  return data;
}

function description(lesson) {
  const list = (items) => items.map((item) => `- ${item}`).join("\n");
  return [
    `**วันที่ ${lesson.day}** · ${lesson.track.toUpperCase()}`,
    `## อ่าน\n${list(lesson.read.map((path) => (path.includes(" ") ? path : `\`${path}\``)))}`,
    `## เข้าใจ\n${list(lesson.learn)}`,
    `## ลองทำ\n${list(lesson.exercise)}`,
    `## เสร็จเมื่อ\n${lesson.done}`,
    "_ดูแผนทั้งหมดที่ `docs/LEARNING_PLAN.md`_",
  ].join("\n\n");
}

try {
  await call("POST", "/projects", project);
  console.log(`สร้าง project ${project.key}`);
} catch (error) {
  if (error.status !== 409) throw error;
  console.log(`มี project ${project.key} อยู่แล้ว`);
}

const existing = await call("GET", `/projects/${project.key}/issues?pageSize=200`);
const titles = new Set(existing.items.map((issue) => issue.title));

let created = 0;
for (const lesson of lessons) {
  const title = `D${String(lesson.day).padStart(2, "0")} · ${lesson.title}`;
  if (titles.has(title)) continue;
  const issue = await call("POST", `/projects/${project.key}/issues`, {
    title,
    type: lesson.track === "fullstack" ? "STORY" : "TASK",
    priority: "MEDIUM",
    description: description(lesson),
    labels: ["lesson", lesson.track, `day-${String(lesson.day).padStart(2, "0")}`],
  });
  console.log(`  ${issue.key}  ${title}`);
  created++;
}
console.log(`เสร็จ: สร้าง ${created} task (มีอยู่แล้ว ${lessons.length - created})`);
