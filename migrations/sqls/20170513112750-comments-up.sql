CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

create table "feeds" (
  "id"                    uuid primary key not null default uuid_generate_v4(),
  "name"                  text,
  "commentMaxLength"      integer,
  "newCommentWaitingTime" integer,
  "createdAt"             timestamptz default now(),
  "updatedAt"             timestamptz default now(),
  unique("name")
);

create table "comments" (
  "id"                    uuid primary key not null default uuid_generate_v4(),
  "feedId"                uuid not null references "feeds" on update cascade on delete cascade,
  "userId"                uuid not null references "users" on update cascade on delete cascade,
  "content"               text not null,
  "upVotes"               integer not null default 0,
  "downVotes"             integer not null default 0,
  "votes"                 jsonb not null default '[]',
  "createdAt"             timestamptz default now(),
  "updatedAt"             timestamptz default now()
);
create index "comments_content_idx" on "comments" using GIN ("content" gin_trgm_ops);
create index "comments_votes_idx" ON "comments" using GIN ("votes");

