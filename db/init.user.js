// This script will run when the MongoDB container is first created
db = db.getSiblingDB('EreunaDB');

db.createUser({
    user: "Ereuna",
    pwd: "Testingthispassword66", // Use the same password from your .env
    roles: [
        { role: "readWrite", db: "EreunaDB" }
    ]
});