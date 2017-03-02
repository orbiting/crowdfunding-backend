create table "crowdfundings" (
  "id"          serial primary key,
  "name"        varchar not null,
  "beginDate"   timestamptz not null,
  "endDate"     timestamptz not null,
  "goalPeople"  integer not null,
  "goalMoney"   integer not null,
  "createdAt"   timestamptz default now(),
  "updatedAt"   timestamptz default now()
);

create table "packages" (
  "id"              serial primary key,
  "crowdfundingId"  integer not null references "crowdfundings" on update cascade on delete cascade,
  "name"            varchar not null,
  "createdAt"       timestamptz default now(),
  "updatedAt"       timestamptz default now()
);

create type "rewardType" as ENUM ('Goodie', 'MembershipType');
create table "rewards" (
  "id"              serial primary key,
  "type"            "rewardType" not null,
  "createdAt"       timestamptz default now(),
  "updatedAt"       timestamptz default now(),
  unique ("id", "type")
);

create table "packageOptions" (
  "id"              serial primary key,
  "packageId"       integer not null references "packages" on update cascade on delete cascade,
  "rewardId"        integer not null references "rewards" on update cascade on delete cascade,
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
  "id"          serial primary key,
  "rewardId"    integer not null unique,
  "rewardType"  "rewardType" not null check ("rewardType" = 'Goodie'),
  "name"        varchar not null,
  "createdAt"   timestamptz default now(),
  "updatedAt"   timestamptz default now(),
  foreign key ("rewardId", "rewardType") references "rewards" ("id", "type") on update cascade on delete cascade
);

create table "membershipTypes" (
  "id"          serial primary key,
  "rewardId"    integer not null unique,
  "rewardType"  "rewardType" not null check ("rewardType" = 'MembershipType'),
  "name"        varchar not null,
  "duration"    integer not null,
  "price"       integer not null,
  "createdAt"   timestamptz default now(),
  "updatedAt"   timestamptz default now(),
  foreign key ("rewardId", "rewardType") references "rewards" ("id", "type") on update cascade on delete cascade
);


create type "pledgeStatus" as ENUM ('DRAFT', 'PAYED', 'REFUNDED');
create table "pledges" (
  "id"          serial primary key,
  "packageId"   integer not null references "packages" on update cascade on delete cascade,
  "userId"      integer not null references "users" on update cascade on delete cascade,
  "status"      "pledgeStatus" not null default 'DRAFT',
  "total"       integer not null,
  "createdAt"   timestamptz default now(),
  "updatedAt"   timestamptz default now()
);

create table "pledgeOptions" (
  "templateId"  integer not null references "packageOptions"(id) on update cascade on delete cascade,
  "pledgeId"    integer not null references "pledges"(id) on update cascade on delete cascade,
  "amount"      integer not null,
  "price"       integer not null,
  "createdAt"   timestamptz default now(),
  "updatedAt"   timestamptz default now(),
  PRIMARY KEY ("templateId", "pledgeId")
);
