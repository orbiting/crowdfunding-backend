CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

create table "addresses" (
  "id"          uuid primary key not null default uuid_generate_v4(),
  "name"        varchar not null,
  "line1"       varchar not null,
  "line2"       varchar,
  "postalCode"  varchar not null,
  "city"        varchar not null,
  "country"     varchar not null
);

create table "users" (
  "id"          uuid primary key not null default uuid_generate_v4(),
  "email"       text not null,
  "verified"    boolean not null default false,
  "name"        varchar,
  "birthday"    date,
  "addressId"   uuid references "addresses" on update cascade on delete cascade,
  "createdAt"   timestamptz default now(),
  "updatedAt"   timestamptz default now()
);

create table "roles" (
  "id"          uuid primary key not null default uuid_generate_v4(),
  "name"        varchar not null,
  "description" text not null,
  "createdAt"   timestamptz default now(),
  "updatedAt"   timestamptz default now()
);

create table "usersRoles" (
  "userId"      uuid not null references "users"(id) on update cascade on delete cascade,
  "roleId"      uuid not null references "roles"(id) on update cascade on delete cascade,
  "createdAt"   timestamptz default now(),
  "updatedAt"   timestamptz default now()
);
