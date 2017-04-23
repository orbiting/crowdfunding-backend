CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

create table "addresses" (
  "id"          uuid primary key not null default uuid_generate_v4(),
  "name"        varchar not null,
  "line1"       varchar not null,
  "line2"       varchar,
  "postalCode"  varchar not null,
  "city"        varchar not null,
  "country"     varchar not null,
  "createdAt"   timestamptz default now(),
  "updatedAt"   timestamptz default now()
);

create table "users" (
  "id"          uuid primary key not null default uuid_generate_v4(),
  "email"       text not null,
  "verified"    boolean not null default false,
  "firstName"   text,
  "lastName"    text,
  "birthday"    date,
  "phoneNumber" text,
  "addressId"   uuid references "addresses" on update cascade on delete cascade,
  "createdAt"   timestamptz default now(),
  "updatedAt"   timestamptz default now()
);
CREATE INDEX user_firstname_idx ON "users" USING GIN ("firstName" gin_trgm_ops);
CREATE INDEX user_lastname_idx ON "users" USING GIN ("lastName" gin_trgm_ops);

