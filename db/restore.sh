#!/bin/bash
echo "Restoring MongoDB database from dump..."
mongorestore --db EreunaDB /docker-entrypoint-initdb.d/dump/EreunaDB
echo "Database restoration completed."