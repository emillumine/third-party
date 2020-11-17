# Tâches programmées (crons pour utilisateur django)

## Pour les services
```
# m h  dom mon dow   command
0 8,11,14,17,20,23 * * * /etc/record_absences.sh

0 2 * * 6 wget -O /var/log/django-cronlog/cloture_volant_$(date +%F_%T).log  [url_appli_django]/members/close_ftop_service

```
## Pour les réceptions

```
# m h  dom mon dow   command
*/5 6,7,8,9,10,11,12,13,14,15,16,17,18,19 * * * wget -O /var/log/django-cronlog/reception_process_$(date +%F_%T).log [url_appli_django]/reception/po_process_picking

```

Ajoutez ```--user x -- password y``` si le service est protégé par une barrière HTTP

# Scripts appelés par les crons

### record_abscences.sh

```
#! /bin/bash

fn=$(date +%Y-%m-%d_%H-%M-%S).json
curl [url_appli_django]/members/record_absences > /home/django/absences/$fn

```

Lorsque le service est protégé par une barrière HTTP, ajoutez l'option ``` -u user:password```

