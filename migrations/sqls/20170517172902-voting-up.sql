CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

create table "votings" (
  "id"                    uuid primary key not null default uuid_generate_v4(),
  "name"                  text not null,
  "beginDate"             timestamptz not null,
  "endDate"               timestamptz not null,
  "result"                jsonb,
  "createdAt"             timestamptz default now(),
  "updatedAt"             timestamptz default now(),
  unique("name")
);
create index "votings_result_idx" ON "votings" using GIN ("result");

create table "votingOptions" (
  "id"                    uuid primary key not null default uuid_generate_v4(),
  "votingId"              uuid not null references "votings" on update cascade on delete cascade,
  "name"                  text not null,
  "createdAt"             timestamptz default now(),
  "updatedAt"             timestamptz default now(),
  unique("name")
);

create table "ballots" (
  "id"                    uuid primary key not null default uuid_generate_v4(),
  "votingOptionId"        uuid not null references "votingOptions" on update cascade on delete cascade
);

create table "ballotIssuances" (
  "id"                    uuid primary key not null default uuid_generate_v4(),
  "votingId"              uuid not null references "votings" on update cascade on delete cascade,
  "userId"                uuid not null references "users" on update cascade on delete cascade,
  "createdAt"             timestamptz default now(),
  "updatedAt"             timestamptz default now()
);
