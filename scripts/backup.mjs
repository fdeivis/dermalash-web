// Respaldo automático: vuelca la base de datos (pg_dump) y descarga los
// archivos de Supabase Storage (buckets "media" y "private"), y sube ambos
// a una carpeta de Google Drive. Pensado para correr desde GitHub Actions
// (ver .github/workflows/backup.yml), pero también corre en cualquier
// máquina con Node 20+, pg_dump y tar instalados, con las mismas
// variables de entorno exportadas.
import { createClient } from "@supabase/supabase-js";
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const REQUIRED_ENV = [
  "BACKUP_DATABASE_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "GOOGLE_OAUTH_CLIENT_ID",
  "GOOGLE_OAUTH_CLIENT_SECRET",
  "GOOGLE_OAUTH_REFRESH_TOKEN",
  "GOOGLE_DRIVE_FOLDER_ID",
];

// Las cuentas de servicio de Google no tienen cuota de almacenamiento en un
// Drive personal (solo en Drive compartido de Workspace), así que en vez de
// una cuenta de servicio nos autenticamos como la cuenta real de Drive
// usando un refresh token (obtenido una sola vez, no vence salvo que se
// revoque) — así el espacio ocupado se descuenta de esa cuenta, que sí tiene
// cuota.
async function getGoogleAccessToken() {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: process.env.GOOGLE_OAUTH_REFRESH_TOKEN,
      client_id: process.env.GOOGLE_OAUTH_CLIENT_ID,
      client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`No se pudo autenticar con Google: ${JSON.stringify(json)}`);
  return json.access_token;
}

async function uploadToDrive(accessToken, filePath, folderId) {
  const fileName = path.basename(filePath);
  const fileBuffer = await fs.readFile(filePath);
  const metadata = { name: fileName, parents: [folderId] };
  const boundary = `dermalashbackup${Date.now()}`;
  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`),
    Buffer.from(`--${boundary}\r\nContent-Type: application/octet-stream\r\n\r\n`),
    fileBuffer,
    Buffer.from(`\r\n--${boundary}--`),
  ]);

  const res = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": `multipart/related; boundary=${boundary}` },
    body,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`Error subiendo ${fileName} a Drive: ${JSON.stringify(json)}`);
  console.log(`Subido a Drive: ${fileName} (${(fileBuffer.length / 1024 / 1024).toFixed(1)} MB)`);
  return json;
}

// Borra de la carpeta de Drive los respaldos más viejos que RETENTION_DAYS,
// para que la carpeta no crezca sin límite.
async function deleteOldBackups(accessToken, folderId, retentionDays) {
  const cutoff = new Date(Date.now() - retentionDays * 24 * 3600 * 1000).toISOString();
  const q = encodeURIComponent(`'${folderId}' in parents and createdTime < '${cutoff}' and trashed = false`);
  const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`No se pudo listar respaldos antiguos: ${JSON.stringify(json)}`);
  for (const file of json.files ?? []) {
    const del = await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (del.ok) console.log(`Respaldo antiguo borrado: ${file.name}`);
  }
}

// Supabase Storage no tiene un "listar todo recursivo": hay que bajar
// carpeta por carpeta (una entrada sin `id` es una subcarpeta, no un archivo).
async function listAllFiles(supabase, bucket, prefix = "") {
  const { data, error } = await supabase.storage.from(bucket).list(prefix, { limit: 1000 });
  if (error) throw new Error(`Error listando ${bucket}/${prefix}: ${error.message}`);
  const files = [];
  for (const entry of data) {
    const fullPath = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.id === null) {
      files.push(...(await listAllFiles(supabase, bucket, fullPath)));
    } else {
      files.push(fullPath);
    }
  }
  return files;
}

async function downloadBucket(supabase, bucket, destRoot) {
  const files = await listAllFiles(supabase, bucket);
  for (const filePath of files) {
    const { data, error } = await supabase.storage.from(bucket).download(filePath);
    if (error) {
      console.warn(`No se pudo descargar ${bucket}/${filePath}: ${error.message}`);
      continue;
    }
    const destPath = path.join(destRoot, bucket, filePath);
    await fs.mkdir(path.dirname(destPath), { recursive: true });
    await fs.writeFile(destPath, Buffer.from(await data.arrayBuffer()));
  }
  return files.length;
}

async function main() {
  for (const key of REQUIRED_ENV) {
    if (!process.env[key]) throw new Error(`Falta la variable de entorno ${key}`);
  }

  const stamp = new Date().toISOString().slice(0, 10);
  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), "dermalash-backup-"));

  console.log("Generando respaldo de la base de datos...");
  const dumpPath = path.join(workDir, `base-de-datos-${stamp}.dump`);
  execFileSync("pg_dump", ["--format=custom", "--file", dumpPath, process.env.BACKUP_DATABASE_URL], {
    stdio: "inherit",
  });

  console.log("Descargando archivos de Supabase Storage...");
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const storageDir = path.join(workDir, "storage");
  await fs.mkdir(storageDir, { recursive: true });
  const mediaBucket = process.env.SUPABASE_STORAGE_BUCKET ?? "media";
  const privateBucket = process.env.SUPABASE_PRIVATE_BUCKET ?? "private";
  const downloaded =
    (await downloadBucket(supabase, mediaBucket, storageDir)) +
    (await downloadBucket(supabase, privateBucket, storageDir));
  console.log(`Archivos descargados: ${downloaded}`);

  const storageArchivePath = path.join(workDir, `archivos-${stamp}.tar.gz`);
  execFileSync("tar", ["-czf", storageArchivePath, "-C", storageDir, "."], { stdio: "inherit" });

  console.log("Autenticando con Google Drive...");
  const accessToken = await getGoogleAccessToken();

  console.log("Subiendo respaldos a Google Drive...");
  await uploadToDrive(accessToken, dumpPath, process.env.GOOGLE_DRIVE_FOLDER_ID);
  await uploadToDrive(accessToken, storageArchivePath, process.env.GOOGLE_DRIVE_FOLDER_ID);

  const retentionDays = Number(process.env.BACKUP_RETENTION_DAYS ?? 30);
  console.log(`Borrando respaldos de más de ${retentionDays} días...`);
  await deleteOldBackups(accessToken, process.env.GOOGLE_DRIVE_FOLDER_ID, retentionDays);

  await fs.rm(workDir, { recursive: true, force: true });
  console.log("Respaldo completo.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
