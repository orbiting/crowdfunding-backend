CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


create table "crowdfundings" (
  "id"          uuid primary key not null default uuid_generate_v4(),
  "name"        varchar not null,
  "beginDate"   timestamptz not null,
  "endDate"     timestamptz not null,
  "goalPeople"  integer not null,
  "goalMoney"   integer not null,
  "createdAt"   timestamptz default now(),
  "updatedAt"   timestamptz default now()
);

create table "packages" (
  "id"              uuid primary key not null default uuid_generate_v4(),
  "crowdfundingId"  uuid not null references "crowdfundings" on update cascade on delete cascade,
  "name"            varchar not null,
  "createdAt"       timestamptz default now(),
  "updatedAt"       timestamptz default now()
);

create type "rewardType" as ENUM ('Goodie', 'MembershipType');
create table "rewards" (
  "id"              uuid primary key not null default uuid_generate_v4(),
  "type"            "rewardType" not null,
  "createdAt"       timestamptz default now(),
  "updatedAt"       timestamptz default now(),
  unique ("id", "type")
);

create table "packageOptions" (
  "id"              uuid primary key not null default uuid_generate_v4(),
  "packageId"       uuid not null references "packages" on update cascade on delete cascade,
  "rewardId"        uuid references "rewards" on update cascade on delete cascade,
--  "name"            varchar not null,
  "minAmount"       integer not null,
  "maxAmount"       integer not null,
  "defaultAmount"   integer not null,
  "price"           integer not null,
  "userPrice"       boolean not null default false,
  "createdAt"       timestamptz default now(),
  "updatedAt"       timestamptz default now()
);

create table "goodies" (
  "id"          uuid primary key not null default uuid_generate_v4(),
  "rewardId"    uuid not null unique,
  "rewardType"  "rewardType" not null check ("rewardType" = 'Goodie'),
  "name"        varchar not null,
  "createdAt"   timestamptz default now(),
  "updatedAt"   timestamptz default now(),
  foreign key ("rewardId", "rewardType") references "rewards" ("id", "type") on update cascade on delete cascade
);

create table "membershipTypes" (
  "id"          uuid primary key not null default uuid_generate_v4(),
  "rewardId"    uuid not null unique,
  "rewardType"  "rewardType" not null check ("rewardType" = 'MembershipType'),
  "name"        varchar not null,
  "duration"    integer not null,
  "price"       integer not null,
  "createdAt"   timestamptz default now(),
  "updatedAt"   timestamptz default now(),
  foreign key ("rewardId", "rewardType") references "rewards" ("id", "type") on update cascade on delete cascade
);


create type "pledgeStatus" as ENUM ('DRAFT', 'COMPLETED', 'PAID', 'REFUNDED');
create table "pledges" (
  "id"          uuid primary key not null default uuid_generate_v4(),
  "packageId"   uuid not null references "packages" on update cascade on delete cascade,
  "userId"      uuid references "users" on update cascade on delete cascade,
  "addressId"   uuid references "addresses" on update cascade on delete cascade,
  "status"      "pledgeStatus" not null default 'DRAFT',
  "total"       integer not null,
  "draft"       jsonb,
  "createdAt"   timestamptz default now(),
  "updatedAt"   timestamptz default now()
);

create table "pledgeOptions" (
  "templateId"  uuid not null references "packageOptions"(id) on update cascade on delete cascade,
  "pledgeId"    uuid not null references "pledges"(id) on update cascade on delete cascade,
  "amount"      integer not null,
  "price"       integer not null,
  "createdAt"   timestamptz default now(),
  "updatedAt"   timestamptz default now(),
  PRIMARY KEY ("templateId", "pledgeId")
);
