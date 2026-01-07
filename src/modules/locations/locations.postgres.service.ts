import { Prisma, PrismaClient } from "@prisma/client";
import { ApiError } from "../../utils/api-error";

type SearchResultItem = {
  id: number;
  subdistrict: string;
  district: string;
  city: string;
  province: string;
  postalCode: string;
  label: string;
  lat?: number | null;
  lng?: number | null;
};

type SearchResponse = {
  total: number;
  items: SearchResultItem[];
};

function buildLabel(row: {
  subdistrict: string;
  district: string;
  city: string;
  province: string;
  postal_code: string;
}) {
  const postal = row.postal_code ? ` ${row.postal_code}` : "";
  return `${row.subdistrict}, ${row.district}, ${row.city}, ${row.province}${postal}`;
}

function isNumericQuery(q: string) {
  return /^[0-9]+$/.test(q.trim());
}

export class LocationsPostgresService {
  private prisma = new PrismaClient();

  search = async ({
    q,
    limit,
    offset,
  }: {
    q: string;
    limit: number;
    offset: number;
  }): Promise<SearchResponse> => {
    const qNorm = q.trim();
    if (!qNorm || qNorm.length < 2) return { total: 0, items: [] };

    const safeLimit = Math.min(Math.max(limit, 1), 50);
    const safeOffset = Math.max(offset, 0);

    const digitsOnly = isNumericQuery(qNorm);
    const postalPrefix = digitsOnly ? qNorm : "";

    const whereSql = digitsOnly
      ? Prisma.sql`(postal_code = ${qNorm} OR postal_code LIKE ${postalPrefix + "%"})`
      : Prisma.sql`(search_text ILIKE ${"%" + qNorm + "%"} OR postal_code LIKE ${qNorm + "%"})`;

    // Prefer pg_trgm similarity if available; fallback if extension isn't enabled.
    const orderByWithSimilarity = Prisma.sql`
      ORDER BY
        CASE
          WHEN postal_code = ${qNorm} THEN 0
          WHEN postal_code LIKE ${qNorm + "%"} THEN 1
          ELSE 2
        END,
        similarity(search_text, ${qNorm}) DESC
    `;

    const orderByFallback = Prisma.sql`
      ORDER BY
        CASE
          WHEN postal_code = ${qNorm} THEN 0
          WHEN postal_code LIKE ${qNorm + "%"} THEN 1
          ELSE 2
        END,
        search_text ASC
    `;

    const baseFrom = Prisma.sql`FROM kodepos_locations WHERE ${whereSql}`;

    try {
      const totalRows = await this.prisma.$queryRaw<{ total: bigint }[]>(
        Prisma.sql`SELECT COUNT(*)::bigint AS total ${baseFrom}`
      );

      const rows = await this.prisma.$queryRaw<
        {
          id: number;
          subdistrict: string;
          district: string;
          city: string;
          province: string;
          postal_code: string;
          lat: number | null;
          lng: number | null;
        }[]
      >(
        Prisma.sql`
          SELECT id, subdistrict, district, city, province, postal_code, lat, lng
          ${baseFrom}
          ${orderByWithSimilarity}
          LIMIT ${safeLimit}
          OFFSET ${safeOffset}
        `
      );

      return {
        total: Number(totalRows?.[0]?.total || 0n),
        items: rows.map((r) => ({
          id: r.id,
          subdistrict: r.subdistrict,
          district: r.district,
          city: r.city,
          province: r.province,
          postalCode: r.postal_code,
          label: buildLabel(r),
          lat: r.lat,
          lng: r.lng,
        })),
      };
    } catch (error: any) {
      const message = String(error?.message || "");
      const maybeTrgmMissing =
        message.toLowerCase().includes("similarity") ||
        message.toLowerCase().includes("pg_trgm");

      if (!maybeTrgmMissing) {
        throw new ApiError("Failed to search locations", 500);
      }

      // Retry without similarity ordering.
      const totalRows = await this.prisma.$queryRaw<{ total: bigint }[]>(
        Prisma.sql`SELECT COUNT(*)::bigint AS total ${baseFrom}`
      );

      const rows = await this.prisma.$queryRaw<
        {
          id: number;
          subdistrict: string;
          district: string;
          city: string;
          province: string;
          postal_code: string;
          lat: number | null;
          lng: number | null;
        }[]
      >(
        Prisma.sql`
          SELECT id, subdistrict, district, city, province, postal_code, lat, lng
          ${baseFrom}
          ${orderByFallback}
          LIMIT ${safeLimit}
          OFFSET ${safeOffset}
        `
      );

      return {
        total: Number(totalRows?.[0]?.total || 0n),
        items: rows.map((r) => ({
          id: r.id,
          subdistrict: r.subdistrict,
          district: r.district,
          city: r.city,
          province: r.province,
          postalCode: r.postal_code,
          label: buildLabel(r),
          lat: r.lat,
          lng: r.lng,
        })),
      };
    }
  };
}

