// One fixed Mac folder, a normal browser shortcut, no account guide or local server.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = fs.realpathSync(fileURLToPath(new URL("../..", import.meta.url)));
const folder = path.join(os.homedir(), "Documents/Kevin-Learning-Home-Trial");
const origin = "http://192.168.2.100:38444";
if (
  process.platform !== "darwin" ||
  fs.realpathSync(folder) !== folder ||
  fs.statSync(folder).uid !== process.getuid() ||
  (fs.statSync(folder).mode & 0o777) !== 0o700
)
  throw Error("EXISTING_OWNED_MAC_DELIVERY_REQUIRED");
const marker = path.join(folder, ".delivery.json");
if (
  fs.lstatSync(marker).isSymbolicLink() ||
  JSON.parse(fs.readFileSync(marker)).repo !== root
)
  throw Error("DELIVERY_OWNER_MISMATCH");
const r = await fetch(origin + "/preview-api/v1/runtime", {
  cache: "no-store",
});
if (!r.ok) throw Error("NAS_PREVIEW_NOT_READY");
const runtime = await r.json();
if (
  runtime.lessons !== 70 ||
  runtime.database !== false ||
  runtime.buildSha !== process.env.KLH_PREVIEW_EXPECT_SHA
)
  throw Error("NAS_RELEASE_MISMATCH");
const files = {
  "打开NAS学习家园.webloc":
    '<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd"><plist version="1.0"><dict><key>URL</key><string>' +
    origin +
    "/</string></dict></plist>\n",
  "NAS学习家园使用说明.md":
    "# NAS 学习家园\n\n打开：" +
    origin +
    "/\n\n双击同目录的“打开NAS学习家园.webloc”也可以。电脑、手机、iPad 连接家里的局域网后直接访问，无需账号、密码、证书或运行本地服务。\n\n现有 70 课教学及教具，64 课可互动、6 课保留原静态图；全部仍为 draft。练习题及其余数学功能后续接入。\n\n本次操作只留在页面内存，刷新会清空，不保存成绩或真实学习记录。原合成试用资料保留供管理员回退，无需填写其中账号。\n",
};
for (const [name, text] of Object.entries(files)) {
  const target = path.join(folder, name);
  if (
    fs.existsSync(target) &&
    (fs.lstatSync(target).isSymbolicLink() ||
      fs.statSync(target).uid !== process.getuid() ||
      fs.readFileSync(target, "utf8") !== text)
  )
    throw Error("EXISTING_USER_FILE_PRESERVED " + name);
}
for (const [name, text] of Object.entries(files)) {
  const target = path.join(folder, name);
  if (!fs.existsSync(target))
    fs.writeFileSync(target, text, { flag: "wx", mode: 0o600 });
}
console.log(
  JSON.stringify({
    status: "NAS_SHORTCUT_DELIVERED",
    origin,
    folder,
    files: Object.keys(files),
    buildSha: runtime.buildSha,
    passwordsRequired: false,
  }),
);
