import { Migration } from '@mikro-orm/migrations';

export class Migration20261031161036 extends Migration {

  override up(): void | Promise<void> {
    // Edited by hand: the generator emits halfvec without its length, and an HNSW index needs it (backend-entity skill)
    this.addSql(`alter table "statements" add "embedding" halfvec(1024) null, add "embedded_at" timestamptz null;`);
    this.addSql(`create index "statements_embedding_hnsw_index" on "statements" using hnsw ("embedding" halfvec_cosine_ops);`);
  }

  override down(): void | Promise<void> {
    this.addSql(`drop index "statements_embedding_hnsw_index";`);
    this.addSql(`alter table "statements" drop column "embedding", drop column "embedded_at";`);
  }

}
