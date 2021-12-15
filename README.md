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

1. Uniquement l'application third-party avec le reste installé sur l'hôte.

```
docker build -t third-party -f ./dockerfiles/Dockerfile .
```

Puis créer un container à partir de l'image.
```
docker run third-party
```

note: Pour accéder au services installés sur l'hôte remplacer `localhost` par `host.docker.internal`

2. Lancer la pile de développement complète avec docker-compose

    1. Dans le repo odoo, créer l'image odoo/foodcoops

    ```
    docker build -t odoo/foodcoops .
    ```
    Modifier la valeur `POSTGRES_DB=lacagette_anon` dans le `.env`

    2. Depuis le repo third-party
    ```
    docker-compose up
    ```

    3. Une fois tout les services lancés appuyez sur crtl+C
    4. Relancer la base de données uniquement pour charger les données
    ```
    docker-compose start database
    ```
    5. Recharger les données depuis PgAdmin

      - Il est nécessaire de recréer les rôles
   ```
    CREATE ROLE lacagette;
    CREATE ROLE visu;
    ```
      - Supprimer complètement la base.
      - Recréer la base `cagette_anon` puis restorer les données.


    6. Placer le fichier FScontent.zip dans le dossier data
    7. Arrêter la pile de développement avec `docker-compose down`
    8. Relancer la pile complète en arrière plan `docker-compose up -d`
    9. Se connecter au container docker odoo et déziper le FScontent
    ```
    docker-compose exec odoo /bin/bash
    root@<instance>:/usr/src/odoo#cd /external-data
    root@<instance>:/external-data#cp FScontent.zip /root/.local/share/Odoo/filestore/lacagette_anon/
    root@<instance>:/external-data#cd /root/.local/share/Odoo/filestore/lacagette_anon/
    root@<instance>:~/.local/share/Odoo/filestore/lacagette_anon#unzip FScontent.zip
    root@<instance>:~/.local/share/Odoo/filestore/lacagette_anon#rm FScontent.zip
    root@<instance>:~/.local/share/Odoo/filestore/lacagette_anon#exit
    ```
    10. redémarrer la pile complète `docker-compose down` suivi de `docker-compose up -d`

    L'application est dispo sur localhost:8080 et odoo sur localhost:8069

note: les données sont persistantes (stockées dans des volumes docker)
