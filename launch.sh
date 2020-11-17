#! /bin/sh

port=34001
ip=127.0.0.1
if [ ! -z "$1" ]
 then 
     ip=$1
fi

if [ ! -z "$2" ]
 then 
     port=$2
fi
current_path=$(pwd)
export PYTHONPATH="$current_path:$current_path/lib:$PYTHONPATH"
echo yes | django-admin collectstatic --settings=outils.settings
django-admin runserver $ip:$port --settings=outils.settings


