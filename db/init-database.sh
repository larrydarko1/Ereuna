#!/bin/bash
set -e

echo "Starting database initialization..."

# Print directory contents for debugging
echo "Contents of /docker-entrypoint-initdb.d:"
ls -la /docker-entrypoint-initdb.d

echo "Contents of /docker-entrypoint-initdb.d/dump:"
ls -la /docker-entrypoint-initdb.d/dump

# Wait for MongoDB to be ready
until mongosh --host localhost --eval "print('Connected successfully')"; do
  echo "Waiting for MongoDB to start..."
  sleep 2
done

# Verbose restoration
mongorestore --verbose --host localhost --db EreunaDB /docker-entrypoint-initdb.d/dump/EreunaDB

if [ $? -eq 0 ]; then
  echo "Database restoration successful"
else
  echo "Database restoration failed"
  exit 1
fi