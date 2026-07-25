import sqlite3
import os
from contextlib import contextmanager

DB_PATH = os.path.join(os.path.dirname(__file__), '..', '..', 'documents.db')

def init_db():
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS documents (
                id TEXT PRIMARY KEY,
                filename TEXT NOT NULL,
                size INTEGER NOT NULL,
                upload_time TEXT NOT NULL
            )
        ''')
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS datasets (
                id TEXT PRIMARY KEY,
                filename TEXT NOT NULL,
                size INTEGER NOT NULL,
                upload_time TEXT NOT NULL,
                summary TEXT NOT NULL,
                local_path TEXT NOT NULL
            )
        ''')
        conn.commit()

@contextmanager
def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()

def add_document(doc_id: str, filename: str, size: int, upload_time: str):
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            'INSERT INTO documents (id, filename, size, upload_time) VALUES (?, ?, ?, ?)',
            (doc_id, filename, size, upload_time)
        )
        conn.commit()

def get_all_documents():
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM documents ORDER BY upload_time DESC')
        rows = cursor.fetchall()
        return [dict(row) for row in rows]

def delete_document(doc_id: str):
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute('DELETE FROM documents WHERE id = ?', (doc_id,))
        conn.commit()

def get_document(doc_id: str):
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM documents WHERE id = ?', (doc_id,))
        row = cursor.fetchone()
        return dict(row) if row else None

def add_dataset(dataset_id: str, filename: str, size: int, upload_time: str, summary: str, local_path: str):
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            'INSERT INTO datasets (id, filename, size, upload_time, summary, local_path) VALUES (?, ?, ?, ?, ?, ?)',
            (dataset_id, filename, size, upload_time, summary, local_path)
        )
        conn.commit()

def get_all_datasets():
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM datasets ORDER BY upload_time DESC')
        rows = cursor.fetchall()
        return [dict(row) for row in rows]

def get_dataset(dataset_id: str):
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM datasets WHERE id = ?', (dataset_id,))
        row = cursor.fetchone()
        return dict(row) if row else None

def delete_dataset(dataset_id: str):
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute('DELETE FROM datasets WHERE id = ?', (dataset_id,))
        conn.commit()
