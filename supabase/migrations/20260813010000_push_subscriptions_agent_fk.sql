-- Point push subscriptions at delivery_agents rather than auth.users.
--
-- Two reasons: only an actual agent should ever hold one, and the sender needs
-- to filter on is_active — which PostgREST can only join across a declared
-- foreign key. Pointing at auth.users left "notify every active agent"
-- unexpressible in a single query.
--
-- delivery_agents.user_id is that table's primary key, and it already cascades
-- from auth.users, so deleting the user still cleans up the subscriptions.

alter table agent_push_subscriptions
  drop constraint if exists agent_push_subscriptions_user_id_fkey;

alter table agent_push_subscriptions
  add constraint agent_push_subscriptions_user_id_fkey
  foreign key (user_id) references delivery_agents (user_id) on delete cascade;
