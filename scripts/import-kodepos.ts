import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { Prisma, PrismaClient } from "@prisma/client";

type KelurahanRecord = {
  id: number;
  name: string;
  postal_code: string;
  district: string;
  city: string;
  province: string;
  lat?: number;
  lng?: number;
  tz?: string;
};

type KodeposData = {
  kelurahan: Record<string, KelurahanRecord>;
};

function chunk<T>(items: T[], size: number) {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

async function main() {
  const prisma = new PrismaClient();

  const dataPath =
    process.env.KODEPOS_DATA_PATH ||
    path.resolve(process.cwd(), "..", "kodepos_optimized.json");

  console.log(`Reading: ${dataPath}`);
  const raw = await fs.readFile(dataPath, "utf-8");
  const parsed = JSON.parse(raw) as KodeposData;

  const rows = Object.values(parsed.kelurahan || {});
  console.log(`Rows: ${rows.length}`);

  const batches = chunk(rows, 1000);

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];

    const values = batch.map((r) =>
      Prisma.sql`(${r.id}, ${r.province}, ${r.city}, ${r.district}, ${r.name}, ${r.postal_code}, ${r.lat ?? null}, ${r.lng ?? null}, ${r.tz ?? null})`
    );

    await prisma.$executeRaw(
      Prisma.sql`
        insert into kodepos_locations
          (id, province, city, district, subdistrict, postal_code, lat, lng, tz)
        values ${Prisma.join(values)}
        on conflict (id) do update set
          province = excluded.province,
          city = excluded.city,
          district = excluded.district,
          subdistrict = excluded.subdistrict,
          postal_code = excluded.postal_code,
          lat = excluded.lat,
          lng = excluded.lng,
          tz = excluded.tz
      `
    );

    if ((i + 1) % 10 === 0 || i === batches.length - 1) {
      console.log(`Imported ${Math.min((i + 1) * 1000, rows.length)}/${rows.length}`);
    }
  }

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  process.exit(1);
});

