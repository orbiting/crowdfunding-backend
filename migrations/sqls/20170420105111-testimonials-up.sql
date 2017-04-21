CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

create table "testimonials" (
  "id"              uuid primary key not null default uuid_generate_v4(),
  "userId"          uuid not null references "users" on update cascade on delete cascade,
  "role"            text,
  "quote"           text,
  "video"           jsonb,
  "image"           text not null,
  "createdAt"       timestamptz default now(),
  "updatedAt"       timestamptz default now(),
  unique("userId")
);
