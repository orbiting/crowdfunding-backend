
-- http://rob.conery.io/2014/05/29/a-better-id-generator-for-postgresql/
-- https://engineering.instagram.com/sharding-ids-at-instagram-1cf5a71e5a5c#.ybyftmp3q
--create sequence global_id_sequence;
--CREATE OR REPLACE FUNCTION id_generator(OUT result bigint) AS $$
--DECLARE
--    our_epoch bigint := 1314220021721;
--    seq_id bigint;
--    now_millis bigint;
--    -- the id of this DB shard, must be set for each
--    -- schema shard you have - you could pass this as a parameter too
--    shard_id int := 1;
--BEGIN
--    SELECT nextval('global_id_sequence') % 1024 INTO seq_id;
--
--    SELECT FLOOR(EXTRACT(EPOCH FROM clock_timestamp()) * 1000) INTO now_millis;
--    result := (now_millis - our_epoch) << 23;
--    result := result | (shard_id << 10);
--    result := result | (seq_id);
--END;
--$$ LANGUAGE PLPGSQL;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


create table "crowdfundings" (
  "id"          uuid primary key not null default uuid_generate_v4(),
--	"id"          bigint primary key not null default id_generator(),
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
  "rewardId"        uuid not null references "rewards" on update cascade on delete cascade,
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


create type "pledgeStatus" as ENUM ('DRAFT', 'PAYED', 'REFUNDED');
create table "pledges" (
  "id"          uuid primary key not null default uuid_generate_v4(),
  "packageId"   uuid not null references "packages" on update cascade on delete cascade,
  "userId"      uuid not null references "users" on update cascade on delete cascade,
  "status"      "pledgeStatus" not null default 'DRAFT',
  "total"       integer not null,
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
