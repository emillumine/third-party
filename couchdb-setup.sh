#!/usr/bin/env sh

sleep 3

curl -X PUT http://admin:123abc@couchdb:5984/coops
curl -X PUT http://admin:123abc@couchdb:5984/inventory
curl -X PUT http://admin:123abc@couchdb:5984/envelop
curl -X PUT http://admin:123abc@couchdb:5984/shopping_carts
curl -X PUT http://admin:123abc@couchdb:5984/coops/_design/index \
     -d @couchdb-coops-init.json
curl -X PUT http://admin:123abc@couchdb:5984/envelop/_design/index \
     -d @couchdb-envelop-init.json

# Set databases to public to allow app to access documents
curl -X PUT http://admin:123abc@couchdb:5984/coops/_security -d '{}'
curl -X PUT http://admin:123abc@couchdb:5984/inventory/_security -d '{}'
curl -X PUT http://admin:123abc@couchdb:5984/envelop/_security -d '{}'
curl -X PUT http://admin:123abc@couchdb:5984/shopping_carts/_security -d '{}'
