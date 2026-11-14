import { Migration } from '@mikro-orm/migrations';

export class Migration20261113134249 extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`drop index "statements_embedding_hnsw_index";`);
    // Added by hand: an HNSW build on a full table runs serially, in the server's own memory. A
    // parallel build keeps its working memory in /dev/shm, which Docker caps at 64 MB ("could not
    // resize shared memory segment"), and a failed migration stops the boot. `set local` lasts
    // only for this migration's transaction.
    this.addSql(`set local max_parallel_maintenance_workers = 0;`);
    this.addSql(`set local maintenance_work_mem = '512MB';`);
    this.addSql(`create index "statements_embedding_prefix_hnsw_index" on "statements" using hnsw ((subvector("embedding", 1, 256)::halfvec(256)) halfvec_cosine_ops);`);
  }

  override down(): void | Promise<void> {
    this.addSql(`drop index "statements_embedding_prefix_hnsw_index";`);
    // Corrected by hand: the generator wrote the old HNSW index back as a plain index on the column
    this.addSql(`set local max_parallel_maintenance_workers = 0;`);
    this.addSql(`set local maintenance_work_mem = '512MB';`);
    this.addSql(`create index "statements_embedding_hnsw_index" on "statements" using hnsw ("embedding" halfvec_cosine_ops);`);
  }

}
