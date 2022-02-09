from django.core.management.base import BaseCommand, CommandError
from django.conf import settings
import couchdb

class Command(BaseCommand):
    help = 'Initialize needed couchDB databases'

    def handle(self, *args, **options):
        if 'admin' not in settings.COUCHDB:
            raise CommandError('''
                Veuillez définir les accès d'admin à CouchDB dans votre fichier settings_secret.py
                Vérifiez le fichier settings_secret_example.py pour un exemple.''')
        url = settings.COUCHDB['admin']['url'] % (settings.COUCHDB['admin']['user'], settings.COUCHDB['admin']['password'])
        dbnames = settings.COUCHDB['dbs']

        couchserver = couchdb.Server(url)
        for dbname in dbnames.values():
            if dbname not in couchserver:
                self.stdout.write(self.style.WARNING("Missing database %s" % dbname))
                db = couchserver.create(dbname)
                self.stdout.write(self.style.SUCCESS("✓ created db"))
                if dbname == 'coops':
                    self.createCoopsViews(db)
                elif dbname == 'envelop':
                    self.createEnvelopViews(db)
                # db.security
                self.createPublicAccess(db)

    def createCoopsViews(self, dbConn):
        byFpMapFunction = '''function(doc) {
          emit(doc.fingerprint);
        }'''
        byCompletedMapFunction = '''function(doc) {
          emit(doc.completed);
        }'''
        byOdooMapFunction = '''function(doc) {
          emit(doc.odoo_id);
        }'''
        views = {
            "by_fp": {
                "map": byFpMapFunction
            },
            "by_completed": {
                "map": byCompletedMapFunction
            },
            "by_odoo_id": {
                "map": byOdooMapFunction
            },
        }
        self.createView(dbConn, "index", views)

    def createEnvelopViews(self, dbConn):
        byTypeMapFunction = '''function(doc) {
          emit(doc.type);
        }'''
        byTypeNotArchiveMapFunction = '''function(doc) {
            if(doc.archive != true){
                emit(doc.type); 
            }
        }'''
        views = {
            "by_type": {
                "map": byTypeMapFunction
            },
            "by_type_not_archive": {
                "map": byTypeNotArchiveMapFunction
            }
        }
        self.createView(dbConn, "index", views)

    def createView(self, dbConn, designDoc, views):
        self.stdout.write(self.style.SUCCESS("✓ created view %s" % designDoc))
        data = {
            "_id": "_design/%s" % designDoc,
            "views": views,
            "language": "javascript",
            "options": {"partitioned": False }
        }
        dbConn.save(data)

    def createPublicAccess(self, dbConn):
        self.stdout.write(self.style.SUCCESS("✓ created security rule"))
        security_doc = dbConn.resource.get_json("_security")[2]
        dbConn.resource.put("_security", {})
