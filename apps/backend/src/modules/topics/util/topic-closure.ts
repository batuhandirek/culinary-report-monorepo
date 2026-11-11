/**
 * SQL: every topic with each topic it counts for, as `topic_closure` holds them. A walk over
 * `topic_edges` from each topic (itself at depth 0), following `is_a` and `has` alike; per pair the
 * shortest depth, and `has_edge` false as soon as one path of `is_a` edges alone reaches the
 * ancestor. Deleted topics are out on both ends. Edges never form a cycle (`TopicService`); the
 * depth cap only keeps a bad row from looping.
 */
export const TOPIC_CLOSURE_SQL = `with recursive walk(topic_id, ancestor_id, depth, has_edge) as (
		select id, id, 0, false from topics where deleted_at is null
		union
		select w.topic_id, e.to_id, w.depth + 1, w.has_edge or e.type = 'has'
		from walk w
		join topic_edges e on e.from_id = w.ancestor_id
		join topics a on a.id = e.to_id and a.deleted_at is null
		where w.depth < 12
	)
	select topic_id, ancestor_id, min(depth)::int as depth, bool_and(has_edge) as has_edge
	from walk group by topic_id, ancestor_id`;

/** What runs SQL in the caller's transaction: an entity manager (`em.execute`) or a migration's `execute` */
type Run = (sql: string) => Promise<unknown>;

/**
 * Rebuilds `topic_closure` whole from the topics and their edges: a few hundred topics, so a full
 * rebuild is cheaper than keeping it by hand. Called whenever a topic or an edge changes
 * (`TopicClosureSubscriber` for every entity-manager writer, `TopicService.rebuildClosure` after
 * raw SQL).
 */
export const rebuildTopicClosure = async (run: Run): Promise<void> => {
	await run('delete from topic_closure');
	await run(
		`insert into topic_closure (topic_id, ancestor_id, depth, has_edge) ${TOPIC_CLOSURE_SQL}`,
	);
};
