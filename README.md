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

Pour faire fonctionner `virtualenvwrapper`, il faut charger son environnement via :

```
source /usr/local/bin/virtualenvwrapper.sh
```

(vous pouvez par exemple mettre cette ligne dans votre profile de terminal préféré)

Cloner le projet, se placer à la racine, puis :

```
mkvirtualenv . --python=$(which python3)

pip install -r requirements.txt
```

Copier le fichier `outils/settings_example.py` en le renommant `outils/settings.py`

Copier le fichier `outils/settings_secret_example.py` en le renommant `outils/settings_secret.py` et en adaptant les identifiants

Copier le fichier `outils/config.example.py` en le renommant `outils/config.py`

Lancer le serveur Web avec la commande `./launch.sh` (chmod u+x préalable si nécessaire)

L'application sera accessible via http://127.0.0.1:34001/

L'adresse d'écoute et le numero de port peuvent être modifiés  en les passant en paramètre de la commande  `./launch.sh`, par exemple `./launch.sh 192.168.0.2 5678`


## Docker (not suitable for production)

1. Dupliquer les fichiers config_example, setting, setting_secret dans `third-party/outils`

    changer le port de Odoo et vérifier celui de couchdb :

    ```python
    ODOO = {
     'url': '[http://odoo:8069](http://odoo:8069/)',
    ...
    }

    COUCHDB = {
     'private_url': 'http://couchdb:5984',
    ...
    }
    ```

2. Pour commencer, créer l’image sur third-party

    `docker build -t third-party -f ./dockerfiles/Dockerfile .`

3.  Puis créer un container à partir de l'image.

    `docker run third-party`
    note : Pour accéder au services installés sur l'hôte remplacer localhost par host.docker.internal

4.  Lancer la pile de développement complète avec docker-compose
    1. Dans le repo odoo, créer l'image odoo/foodcoops

        `docker build -t odoo/foodcoops .`

        Si c'est sur mac avec une puce apple : `docker build -t odoo/foodcoops --platform linux/amd64 .`

    2. Dans le repo third-party, modifier la valeur POSTGRES_DB=lacagette_anon dans le .env
    3. Depuis le repo third-party

        `docker-compose up`


    Une fois tous les services sont lancés appuyer sur crtl+C

5.  Relancer la base de données uniquement pour charger les données

    `docker-compose start database`

6. Depuis PgAdmin :
    - Créer le serveur `lacagette`
        - General : mettre en name lacagette
        - Connection : en hostname : localhost, garder le port 5432, en username et mot de passe, mettre ceux du fichier .env puis sauvegarder.
    - Une fois le serveur lacagette créé, créer une nouvelle database au nom de `lacagette_anon`
    - Puis cliquer sur `lacagette_anon`pour créer les rôles :

    ```
     CREATE ROLE lacagette;
     CREATE ROLE visu;
    ```

7. Placer le fichier FScontent.zip dans le dossier `third-party/data` puis :

    Arrêter la pile de développement avec `docker-compose down`
    Relancer la pile complète en arrière plan `docker-compose up -d`


Ouvrir la console shell du container docker odoo et déziper le FScontent :

```python
docker-compose exec odoo /bin/bash
root@<instance>:/usr/src/odoo#cd /external-data
root@<instance>:/external-data#cp FScontent.zip /root/.local/share/Odoo/filestore/lacagette_anon/
root@<instance>:/external-data#cd /root/.local/share/Odoo/filestore/lacagette_anon/
root@<instance>:~/.local/share/Odoo/filestore/lacagette_anon#unzip FScontent.zip
root@<instance>:~/.local/share/Odoo/filestore/lacagette_anon#rm FScontent.zip
root@<instance>:~/.local/share/Odoo/filestore/lacagette_anon#exit
```

Redémarrer la pile complète `docker-compose down` suivi de `docker-compose up -d`

1. Configurer Odoo :

    Se connecter à Odoo via l’utilisateur admin

    Modifier le mot de passe de l’utilisateur api :

    Se rendre dans configuration puis à gauche, utilisateurs

    Ouvrir l’utilisateur api, cliquer sur modifier le mot de passe et mettre celui indiqué dans le fichier `setting secret`

    Mettre à jour les applications lacagette :

    Se rendre dans applications, dans la barre de recherches, décocher applications, remplacer par lacagette

    A gauche cliquer sur Mettre à jour la liste des Applications


L'application est dispo sur localhost:8080 et odoo sur localhost:8069

note: les données sont persistantes (stockées dans des volumes docker)
