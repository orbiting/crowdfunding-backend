CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

create table "users" (
  "id"          uuid primary key not null default uuid_generate_v4(),
  "email"       text not null,
  "name"        varchar,
  "verified"    boolean not null default false,
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
