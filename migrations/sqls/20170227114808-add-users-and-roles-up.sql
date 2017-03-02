create table "users" (
  "id"          serial primary key,
  "email"       text not null unique check ("email" ~* '^.+@.+\..+$'),
  "createdAt"   timestamptz default now(),
  "updatedAt"   timestamptz default now()
);

create table "roles" (
  "id"          serial primary key,
  "name"        varchar not null,
  "description" text not null,
  "createdAt"   timestamptz default now(),
  "updatedAt"   timestamptz default now()
);

create table "usersRoles" (
  "userId"      integer not null references "users"(id) on update cascade on delete cascade,
  "roleId"      integer not null references "roles"(id) on update cascade on delete cascade,
  "createdAt"   timestamptz default now(),
  "updatedAt"   timestamptz default now()
);
