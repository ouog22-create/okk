"""SQLite locally; Supabase PostgreSQL in production."""
import sqlite3

class Row(dict):
    def __getitem__(self, key):
        return list(self.values())[key] if isinstance(key, int) else super().__getitem__(key)

def row_factory(cursor):
    names = [column.name for column in cursor.description] if cursor.description else []
    return lambda values: Row(zip(names, values))

class Postgres:
    def __init__(self, url):
        import psycopg
        self.connection = psycopg.connect(url, sslmode='require', connect_timeout=10,
                                         prepare_threshold=None, row_factory=row_factory)
        self.connection.execute('SET LOCAL search_path TO okk_private, public')

    def execute(self, sql, params=()):
        import psycopg
        if sql == 'BEGIN IMMEDIATE':
            # Serialize changes and re-read versions inside this transaction.
            sql = "SELECT pg_advisory_xact_lock(20260926)"
        elif sql.startswith('PRAGMA'):
            return self.connection.execute('SELECT 1')
        sql = sql.replace('?', '%s')
        sql = sql.replace('count=count+1', 'count=attempts.count+1')
        try:
            return self.connection.execute(sql, tuple(int(v) if isinstance(v, bool) else v for v in params))
        except psycopg.IntegrityError as exc:
            self.connection.rollback()
            raise sqlite3.IntegrityError(str(exc)) from exc

    def executemany(self, sql, params):
        # Transaction poolers do not support psycopg pipeline mode.
        for values in params:
            self.execute(sql, values)

    def executescript(self, sql):
        # Schema is provisioned by supabase-schema.sql, never by each request.
        return None

    def commit(self):
        self.connection.commit()
        self.connection.execute('SET LOCAL search_path TO okk_private, public')

    def close(self):
        self.connection.close()


def connect(data, url=None):
    if url:
        return Postgres(url)
    con = sqlite3.connect(data / 'okk.sqlite3', timeout=15)
    con.row_factory = sqlite3.Row
    con.execute('PRAGMA foreign_keys=ON')
    return con
