create type "faqStatus" as ENUM ('DRAFT', 'PUBLISHED');
create table "faqs" (
  "id"              uuid primary key not null default uuid_generate_v4(),
  "status"          "faqStatus" not null default 'DRAFT',
  "question"        text not null,
  "answer"          text not null,
  "createdAt"       timestamptz default now(),
  "updatedAt"       timestamptz default now()
);
