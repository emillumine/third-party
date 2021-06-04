#!/usr/bin/env sh

set -euo pipefail

#setup de l'environnement de test
pip install -U pip setuptools 
pip install -r requirements.txt 

#setup des fichiers paramètres
cp outils/settings_example.py outils/settings.py  
cp outils/settings_secret_example.py outils/settings_secret.py
cp outils/config.example.py outils/config.py