#!/usr/bin/env bash
set -euo pipefail

OUTDIR="$(dirname "$0")/../certs/internal"
mkdir -p "$OUTDIR"
cd "$OUTDIR"

# Create internal CA
openssl genrsa -out ca.key 4096
openssl req -x509 -new -nodes -key ca.key -sha256 -days 3650 -subj "/CN=ereuna-internal-ca" -out ca.crt

# Helper to create service cert
create_cert() {
  name="$1"
  openssl genrsa -out "$name.key" 2048
  cat > "$name.cnf" <<EOF
[req]
distinguished_name = req_distinguished_name
[req_distinguished_name]

[ v3_req ]
subjectAltName = @alt_names
[alt_names]
DNS.1 = $name
DNS.2 = $name.local
EOF
  openssl req -new -key "$name.key" -out "$name.csr" -subj "/CN=$name" -config "$name.cnf"
  openssl x509 -req -in "$name.csr" -CA ca.crt -CAkey ca.key -CAcreateserial -out "$name.crt" -days 365 -sha256 -extfile "$name.cnf" -extensions v3_req
  rm -f "$name.csr" "$name.cnf"
}

cat <<EOF
Created internal CA in $OUTDIR
Use the generated ca.crt as a root CA for Traefik serversTransport if you later enable backend TLS.
EOF
