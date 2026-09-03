"""
The two shared helpers the nightly run needs.

Everything else this module used to hold was a one-shot maintenance script from
before the rebuild — column renames, duplicate sweeps, an icon-sorting routine
that walked a `server/pictures` directory which no longer exists. None of it had
a caller, so none of it was carried over.
"""
import datetime as dt
import os

from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv()

client = MongoClient(
    os.getenv('MONGO_URI', 'mongodb://localhost:27017'),
    serverSelectionTimeoutMS=60000,
    connectTimeoutMS=60000,
    socketTimeoutMS=600000,
    maxPoolSize=50,
    retryWrites=True,
    retryReads=True,
)
db = client[os.getenv('MONGO_DB', 'EreunaDB')]


def maintenanceMode(mode):
    """Hold sign-ins while the nightly run rewrites the collections it reads."""
    db['systemSettings'].update_one(
        {'name': 'EreunaApp'},
        {'$set': {'maintenance': mode, 'lastUpdated': dt.datetime.now()}},
    )


def remove_documents_with_timestamp(timestamp_str):
    """Drop a weekly bar before it is rebuilt, so the rebuild cannot duplicate it."""
    timestamp = dt.datetime.strptime(timestamp_str, '%Y-%m-%dT%H:%M:%S.%f+00:00')
    db['OHCLVData2'].delete_many({'timestamp': timestamp})
