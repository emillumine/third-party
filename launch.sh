#!/usr/bin/env bash

port=34001
ip=127.0.0.1

if [ -n "$1" ]
then
    ip=$1
fi
if [ -n "$2" ]
then
    port=$2
fi

current_path=$(pwd)
export PYTHONPATH="$current_path:$current_path/lib:$PYTHONPATH"
export DJANGO_SETTINGS_MODULE=outils.settings
# Collect static files
echo yes | django-admin collectstatic
# Make sure couchdb databases exist
python manage.py couchdb
# Run server
django-admin runserver "$ip:$port"


