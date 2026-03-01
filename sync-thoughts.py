#!/usr/bin/env python3
"""
Sync thoughts from Apple Notes to thoughts.json.

Reads a note titled "Thoughts" from Apple Notes (synced via iCloud).
Each paragraph (separated by blank lines) becomes a separate thought.
The note's modification date is used for all thoughts.

Requirements:
- macOS with Apple Notes
- Full Disk Access for the terminal/app running this script
  (System Settings > Privacy & Security > Full Disk Access)

Usage:
  python3 sync-thoughts.py
"""

import json
import os
import shutil
import sqlite3
import subprocess
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path

# Configuration
NOTE_TITLE = "Thoughts - Personal Website"
SCRIPT_DIR = Path(__file__).parent
OUTPUT_FILE = SCRIPT_DIR / "thoughts.json"
NOTES_DB = Path.home() / "Library/Group Containers/group.com.apple.notes/NoteStore.sqlite"

# Apple Notes stores dates as seconds since 2001-01-01 (Core Data epoch)
CORE_DATA_EPOCH = datetime(2001, 1, 1, tzinfo=timezone.utc)


def extract_text_from_note_data(data):
    """Extract plain text from Apple Notes protobuf/attributed string data."""
    if not data:
        return ""
    try:
        # The note body is stored as a gzipped protobuf.
        # We can extract readable text by decoding and filtering.
        import gzip
        decompressed = gzip.decompress(data)
        # Extract UTF-8 text fragments from the binary data
        text = ""
        i = 0
        while i < len(decompressed):
            byte = decompressed[i]
            if 32 <= byte < 127 or byte in (10, 13):  # printable ASCII + newlines
                text += chr(byte)
            elif byte >= 128:
                # Try to decode as UTF-8 multi-byte
                for length in (4, 3, 2):
                    if i + length <= len(decompressed):
                        try:
                            char = decompressed[i:i+length].decode('utf-8')
                            text += char
                            i += length - 1
                            break
                        except (UnicodeDecodeError, ValueError):
                            continue
            i += 1
        return text.strip()
    except Exception:
        # Fallback: try raw decode
        try:
            return data.decode('utf-8', errors='ignore').strip()
        except Exception:
            return ""


def get_thoughts():
    """Read the 'Thoughts' note from Apple Notes database."""
    if not NOTES_DB.exists():
        print(f"Error: Notes database not found at {NOTES_DB}", file=sys.stderr)
        sys.exit(1)

    # Copy database to temp location (Notes may have it locked)
    with tempfile.TemporaryDirectory() as tmp:
        db_copy = os.path.join(tmp, "NoteStore.sqlite")
        # Copy the database and WAL files
        shutil.copy2(NOTES_DB, db_copy)
        wal = str(NOTES_DB) + "-wal"
        shm = str(NOTES_DB) + "-shm"
        if os.path.exists(wal):
            shutil.copy2(wal, db_copy + "-wal")
        if os.path.exists(shm):
            shutil.copy2(shm, db_copy + "-shm")

        conn = sqlite3.connect(db_copy)
        cursor = conn.cursor()

        # Find the note titled "Thoughts"
        cursor.execute("""
            SELECT
                n.Z_PK,
                n.ZTITLE1 AS title,
                n.ZMODIFICATIONDATE1 AS modified,
                nd.ZDATA AS body
            FROM ZICCLOUDSYNCINGOBJECT n
            LEFT JOIN ZICCLOUDSYNCINGOBJECT nd
                ON nd.ZNOTE = n.Z_PK
                AND nd.ZTYPEUTI = 'com.apple.notes.richtext'
            WHERE n.ZTITLE1 = ?
                AND n.ZMARKEDFORDELETION != 1
            ORDER BY n.ZMODIFICATIONDATE1 DESC
            LIMIT 1
        """, (NOTE_TITLE,))

        row = cursor.fetchone()
        conn.close()

        if not row:
            print(f"Error: No note titled '{NOTE_TITLE}' found.", file=sys.stderr)
            sys.exit(1)

        pk, title, modified_ts, body_data = row

        # Parse modification date
        if modified_ts:
            modified_dt = CORE_DATA_EPOCH + __import__('datetime').timedelta(seconds=modified_ts)
            mod_date = modified_dt.strftime("%Y-%m-%d")
        else:
            mod_date = datetime.now().strftime("%Y-%m-%d")

        # Extract text
        text = extract_text_from_note_data(body_data)
        if not text:
            print(f"Warning: Note '{NOTE_TITLE}' appears empty.", file=sys.stderr)
            return []

        # Split by blank lines into paragraphs (thoughts)
        # Remove the title line if it appears at the start
        lines = text.split('\n')
        if lines and lines[0].strip() == NOTE_TITLE:
            lines = lines[1:]

        # Group into paragraphs separated by blank lines
        paragraphs = []
        current = []
        for line in lines:
            if line.strip() == '':
                if current:
                    paragraphs.append(' '.join(current))
                    current = []
            else:
                current.append(line.strip())
        if current:
            paragraphs.append(' '.join(current))

        # Filter out empty paragraphs
        thoughts = []
        for p in paragraphs:
            p = p.strip()
            if p:
                thoughts.append({"text": p, "date": mod_date})

        return thoughts


def main():
    thoughts = get_thoughts()

    data = {"thoughts": thoughts}

    with open(OUTPUT_FILE, 'w') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write('\n')

    print(f"Synced {len(thoughts)} thoughts to {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
