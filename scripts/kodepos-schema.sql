-- Create table + indexes for kodepos search
-- Run this in Supabase SQL editor (in the `tcg-e-commerce` schema) before importing data.

create extension if not exists pg_trgm;

create table if not exists kodepos_locations (
  id integer primary key,
  province text not null,
  city text not null,
  district text not null,
  subdistrict text not null,
  postal_code text not null,
  lat double precision,
  lng double precision,
  tz text,
  search_text text generated always as (
    province || ' ' || city || ' ' || district || ' ' || subdistrict || ' ' || postal_code
  ) stored
);

create index if not exists kodepos_locations_postal_code_idx
  on kodepos_locations (postal_code);

create index if not exists kodepos_locations_search_trgm_idx
  on kodepos_locations using gin (search_text gin_trgm_ops);

