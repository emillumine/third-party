# Django "La Cagette"

Le code source de ce dépôt est celui qui fournit actuellement les services suivants :

## Répertoires
### members

* Borne d'accueil (pour vérifier le statut de celles et ceux qui entrent faire leurs courses, et pour enregistrer les présences de celles et ceux qui viennent faire leur service)

* Inscription des nouveaux coopérateurs (partie utilisée au magasin et formulaire de confirmation affiché dans l'Espace Membre)

### reception

* Gestion des réceptions de marchandises (Sélection de Demandes de Prix, vérification des quantités et des prix de la marchandise livrée, génération de rapport, etc)

### shifts

* Choix de rattrapage (ou de services à venir pour les volants) et échanges de services (encapsulé dans une iframe de l'Espace Membre)

## stock

* Traçage des ruptures de stocks

## inventory

* Gestion des inventaires (préparation, inventaire, mise à jour Odoo)

### orders

* contient le code de gestion des commandes

## products

* Pour impression des étiquettes à la demande et génération fichiers pour les appli balances

### outils

* contient le code commun

### shop

* contient le code de la boutique en ligne

### shelfs

* contient le code de la gestion des rayons (dont une partie utilisée par shop)

### website

* contient le code de 'mon-espace-prive' (formulaire de confirmation données et services échanges)


## Installation (sous distribution linux)

Prérequis : une version de python3

Avec `virtualenvwrapper` (`sudo pip install virtualenvwrapper`)

Cloner le projet, se placer à la racine, puis :

```
mkvirtualenv dj_lacagette --python=$(which python3)

(il est possible de devoir faire 'source /usr/local/bin/virtualenvwrapper.sh' avant)

pip install Django==2.1.3 django-cors-headers couchdb python-dateutil requests pymysql openpyxl reportlab argon2-cffi
```

Copier le fichier `outils/settings_example.py` en le renommant `outils/settings.py`

Copier le fichier `outils/settings_secret_example.py` en le renommant `outils/settings_secret.py` et en adaptant les identifiants

Lancer le serveur Web avec la commande `./launch.sh` (chmod u+x préalable si nécessaire)

L'application sera accessible via http://127.0.0.1:34001/

L'adresse d'écoute et le numero de port peuvent être modifiés  en les passant en paramètre de la commande  `./launch.sh`, par exemple `./launch.sh 192.168.0.2 5678`
