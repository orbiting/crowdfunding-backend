begin;

create schema if not exists cf;

create table cf.crowdfundings (
  id          serial primary key,
  name        varchar not null,
  begin_date  timestamptz not null,
  end_date    timestamptz not null,
  goal_people integer not null,
  goal_money  integer not null,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create table cf.packages (
  id              serial primary key,
  crowdfunding_id integer not null references cf.crowdfundings on update cascade on delete cascade,
  name            varchar not null,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create type cf.reward_type as ENUM ('GOODIE', 'MEMBERSHIP');
create table cf.rewards (
  id              serial primary key,
  type            cf.reward_type not null,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now(),
  unique (id, type)
);

create table cf.package_options (
  id              serial primary key,
  package_id      integer not null references cf.packages on update cascade on delete cascade,
  reward_id       integer not null references cf.rewards on update cascade on delete cascade,
--  name            varchar not null,
  min_amount      integer not null,
  max_amount      integer not null,
  default_amount  integer not null,
  price           integer not null,
  user_price      boolean not null default false,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create table cf.goodies (
  id          serial primary key,
  reward_id   integer not null unique,
  reward_type cf.reward_type not null check (reward_type = 'GOODIE'),
  name        varchar not null,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),
  foreign key (reward_id, reward_type) references cf.rewards (id, type) on update cascade on delete cascade
);

create table cf.membership_types (
  id          serial primary key,
  reward_id   integer not null unique,
  reward_type cf.reward_type not null check (reward_type = 'MEMBERSHIP'),
  name        varchar not null,
  duration    integer not null,
  price       integer not null,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),
  foreign key (reward_id, reward_type) references cf.rewards (id, type) on update cascade on delete cascade
);


create type cf.pledge_status as ENUM ('DRAFT', 'PAYED', 'REFUNDED');
create table cf.pledges (
  id          serial primary key,
  package_id  integer not null references cf.packages on update cascade on delete cascade,
  user_id     integer not null references cf.users on update cascade on delete cascade,
  status      cf.pledge_status not null default 'DRAFT',
  total       integer not null,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create table cf.pledge_options (
  template_id integer not null references cf.package_options(id) on update cascade on delete cascade,
  pledge_id   integer not null references cf.pledges(id) on update cascade on delete cascade,
  amount      integer not null,
  price       integer not null,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),
  PRIMARY KEY (template_id, pledge_id)
);

commit;
