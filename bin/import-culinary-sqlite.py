#!/usr/bin/env python3
"""
One-off: copies what the old scripts repo collected (its SQLite database) into this
project's Postgres, so nothing has to be scraped and paid for again.

    python3 bin/import-culinary-sqlite.py ../culinary-report/data/culinary.db

Pipes COPY statements into the dev database container. Refuses to run when the target
tables already hold venues, so it cannot import twice.
"""
import csv
import io
import json
import sqlite3
import subprocess
import sys
import uuid

CONTAINER = 'culinary-report-dev-db'
PSQL = ['docker', 'exec', '-i', CONTAINER, 'psql', '-U', 'postgres', '-d', 'culinary_report', '-v', 'ON_ERROR_STOP=1', '-q']


def psql(sql: str) -> str:
    return subprocess.run(PSQL + ['-tA'], input=sql, capture_output=True, text=True, check=True).stdout.strip()


def copy_block(table: str, columns: list[str], rows: list[list]) -> str:
    buf = io.StringIO()
    writer = csv.writer(buf)
    for row in rows:
        writer.writerow(['\\N' if v is None else v for v in row])
    return f"COPY {table} ({', '.join(columns)}) FROM STDIN WITH (FORMAT csv, NULL '\\N');\n{buf.getvalue()}\\.\n"


def jsonb(value):
    if value is None:
        return None
    return value if isinstance(value, str) else json.dumps(value)


def main(path: str) -> None:
    if psql('select count(*) from venues;') != '0':
        sys.exit('venues is not empty: this import only runs once, on a fresh database')

    db = sqlite3.connect(path)
    db.row_factory = sqlite3.Row
    blocks = []

    # Venues, keyed here by Google Place ID; the latest snapshot gives the current rating
    latest = {
        r['place_id']: r
        for r in db.execute('select * from venue_snapshots order by snapshot_date')
    }
    venue_ids = {}
    rows = []
    for v in db.execute('select * from venues'):
        venue_ids[v['place_id']] = str(uuid.uuid4())
        snap = latest.get(v['place_id'])
        rows.append([
            venue_ids[v['place_id']], v['place_id'], v['name'], v['city'], v['district'], v['street'],
            v['postal_code'], v['category'], v['categories'], v['lat'], v['lng'], v['price_level'],
            v['website'], v['phone'], v['google_url'], 't' if v['closed'] else 'f',
            snap['rating'] if snap else None, snap['reviews_count'] if snap else None,
            v['first_seen_at'], v['updated_at'],
        ])
    blocks.append(copy_block('venues', [
        'id', 'place_id', 'name', 'city', 'district', 'street', 'postal_code', 'category', 'categories', 'lat',
        'lng', 'price_level', 'website', 'phone', 'google_url', 'closed', 'rating', 'reviews_count',
        'created_at', 'updated_at'], rows))

    blocks.append(copy_block('venue_snapshots', ['venue_id', 'snapshot_date', 'rating', 'reviews_count'], [
        [venue_ids[s['place_id']], s['snapshot_date'], s['rating'], s['reviews_count']]
        for s in db.execute('select * from venue_snapshots') if s['place_id'] in venue_ids]))

    blocks.append(copy_block('venue_lookups', ['query', 'results', 'created_at'], [
        [l['query'], l['results'], l['looked_up_at']] for l in db.execute('select * from venue_lookups')]))

    blocks.append(copy_block('google_reviews', [
        'id', 'review_id', 'venue_id', 'published_at', 'stars', 'text', 'text_translated', 'language', 'likes',
        'owner_response', 'owner_response_at', 'sentiment', 'praise', 'complaints', 'dishes', 'changes',
        'analysed_at', 'created_at', 'updated_at'], [
        [str(uuid.uuid4()), r['review_id'], venue_ids[r['place_id']], r['published_at'], r['stars'], r['text'],
         r['text_translated'], r['language'], r['likes'] or 0, r['owner_response'], r['owner_response_at'],
         r['sentiment'], jsonb(r['praise']), jsonb(r['complaints']), jsonb(r['dishes']), jsonb(r['changes']),
         r['analysed_at'], r['scraped_at'], r['scraped_at']]
        for r in db.execute('select * from google_reviews') if r['place_id'] in venue_ids and r['published_at']]))

    # Posts: the old ids are the platform ids
    post_ids = {}
    rows = []
    for p in db.execute('select * from posts'):
        post_ids[p['id']] = str(uuid.uuid4())
        source = p['source']
        if source and not source.startswith(('#', 'search:', 'place:')):
            source = f'#{source}'
        rows.append([
            post_ids[p['id']], p['id'], p['platform'], p['url'], p['created_at'], p['author'], p['author_fans'],
            p['views'] or 0, p['likes'] or 0, p['shares'] or 0, p['comments'] or 0, p['saves'] or 0,
            't' if p['is_ad'] else 'f', p['location_name'], source, p['text'], p['hashtags'], p['tagged_handles'],
            p['subtitles'], p['subtitles_language'], p['analysed_at'],
            None if p['is_promotional'] is None else ('t' if p['is_promotional'] else 'f'),
            p['analysis_tokens'], p['ingested_at'], p['ingested_at'],
        ])
    blocks.append(copy_block('social_posts', [
        'id', 'external_id', 'platform', 'url', 'posted_at', 'author', 'author_fans', 'views', 'likes', 'shares',
        'comments', 'saves', 'is_ad', 'location_name', 'source', 'text', 'hashtags', 'tagged_handles',
        'subtitles', 'subtitles_language', 'analysed_at', 'is_promotional', 'analysis_tokens', 'created_at',
        'updated_at'], rows))

    blocks.append(copy_block('mentions', [
        'post_id', 'venue_name', 'location_hint', 'cuisine', 'city', 'visited', 'sentiment', 'summary', 'dishes',
        'praise', 'complaints', 'venue_id', 'match_method', 'match_score', 'matched_at', 'created_at'], [
        [post_ids[m['post_id']], m['venue_name'], m['location_hint'], m['cuisine'], m['city'],
         't' if m['visited'] else 'f', m['sentiment'], m['summary'], m['dishes'], m['praise'], m['complaints'],
         venue_ids.get(m['place_id']), m['match_method'], m['match_score'], m['matched_at'],
         m['matched_at'] or '2026-10-15T00:00:00Z']
        for m in db.execute('select * from mentions') if m['post_id'] in post_ids]))

    subprocess.run(PSQL, input='BEGIN;\n' + ''.join(blocks) + 'COMMIT;\n', text=True, check=True)
    for table in ['venues', 'venue_snapshots', 'venue_lookups', 'google_reviews', 'social_posts', 'mentions']:
        print(f'{table}: {psql(f"select count(*) from {table};")}')


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else '../culinary-report/data/culinary.db')
