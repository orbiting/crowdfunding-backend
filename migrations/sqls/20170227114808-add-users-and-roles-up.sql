begin;

create schema if not exists cf;

create table cf.users (
  id          serial primary key,
  email       text not null unique check (email ~* '^.+@.+\..+$'),
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create table cf.roles (
  id          serial primary key,
  name        varchar not null,
  description text not null,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create table cf.users_roles (
  user_id     integer not null references cf.users(id) on update cascade on delete cascade,
  role_id     integer not null references cf.roles(id) on update cascade on delete cascade,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

commit;
