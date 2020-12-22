from django.db import models
from django.conf import settings
from outils.common_imports import *
from outils.common import OdooAPI
from decimal import *
from datetime import datetime

class CagetteStock(models.Model):

    @staticmethod
    def do_stock_movement(stock_movement_data):
        """Do a stock movement : """

        TWOPLACES = Decimal(10) ** -2
        api = OdooAPI()
        errors = []
        picking = False

        # Set stock movement details according to destination
        if stock_movement_data['movement_type'] == 'losses':
            picking_name = 'Pertes - ' + datetime.now().strftime("%d/%m/%Y %H:%M:%S")
            picking_type = settings.LOSSES_PICKING_TYPE_ID
            destination = settings.LOSSES_LOC_ID
        elif stock_movement_data['movement_type'] == 'meals':
            picking_name = 'Repas Salarié - ' + datetime.now().strftime("%d/%m/%Y %H:%M:%S")
            picking_type = settings.MEALS_PICKING_TYPE_ID
            destination = settings.MEALS_LOC_ID
        elif stock_movement_data['movement_type'] == 'autoconso':
            picking_name = 'Autoconsommation - ' + datetime.now().strftime("%d/%m/%Y %H:%M:%S")
            picking_type = settings.AUTOCONSO_PICKING_TYPE_ID
            destination = settings.AUTOCONSO_LOC_ID
        else:
            errors.append('Type de mouvement incorrect')
            return {'errors': errors, 'picking_id': picking}

        fields = {
            'company_id': 1,
            'name': picking_name,
            'picking_type_id' : picking_type,       # mouvement type
            'location_id': settings.STOCK_LOC_ID,   # movement origin
            'location_dest_id': destination,        # movement dest
            "move_lines": [],
            "pack_operation_ids": []
        }

        for p in stock_movement_data['products']:
            qty = Decimal(p['qty']).quantize(TWOPLACES)
            if qty < 0:
                qty = 0

            # Add stock.move to stock.picking
            fields['move_lines'].append([
                0,
                False,
                {
                  "date_expected": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                  "product_id": p['id'],
                  "name": p['name'],
                  "product_uom": p['uom_id'],
                  "product_uom_qty": str(qty),
                  "picking_type_id": picking_type,
                  "location_id": settings.STOCK_LOC_ID,
                  "location_dest_id": destination,
                  "state": "draft",
                  "scrapped": False,
                }
            ])

            # Add stock.pack.operation to stock.picking
            fields['pack_operation_ids'].append([
                0,
                False,
                {
                  "product_qty": str(qty),
                  "qty_done": str(qty),
                  "location_id": settings.STOCK_LOC_ID,
                  "location_dest_id": destination,
                  "product_id": p['id'],
                  "name": p['name'],
                  "product_uom_id": p['uom_id'],
                  "state": 'done',
                  "fresh_record": False
                }
            ])

        # Exception rises when odoo method returns nothing
        marshal_none_error = 'cannot marshal None unless allow_none is enabled'
        try:
            picking = api.create('stock.picking', fields)


            if not (picking is None):
                # Set stock.picking done
                api.execute('stock.picking', 'action_done', [picking])

                # Generate accounting writings for this picking
                api.execute('stock.picking', 'generate_expense_entry', picking)

        except Exception as e:
            if not (marshal_none_error in str(e)):
                coop_logger.error(str(e))
                errors.append(str(e))

        return {'errors': errors,
                'picking_id': picking}


    ### NOT IN USE ###

    def get_liste_supplyer():

        o_api = OdooAPI()
        f=['display_name', 'id']
        c=[['supplier', "=",1]]

        res = o_api.search_read('res.partner', c, f, order = "write_date asc")
        return res


    def get_article_from_supplyer(id):
        "4148"
        print ("c'est la "+id)
        o_api = OdooAPI()

        res = o_api.execute('lacagette_tools',"get_list_article_of_fournisseur", id)

        return res


    # Following sale article with breaking

    def get_list_sale(product_id, startDate, endDate):
        o_api = OdooAPI()
        f=['write_date', 'qty']
        c=[['product_id','=',product_id],['location_id','=',9], ['write_date', '>', startDate.strftime("%Y-%m-%d")], ['write_date', '<', endDate.strftime("%Y-%m-%d")]]
        res = o_api.search_read('stock.quant', c, f, order = "write_date asc")

        return res


    def get_list_sale_qty(lProduct_id):
        o_api = OdooAPI()
        res = o_api.execute('lacagette_tools',"get_sale_qty_by_article", lProduct_id)
        dRes = {}
        for r in res:
                dRes[r['product_id']] = r['sumqty']
        return dRes

    # get list breaking for a artile
    def get_list_breaking(product_id):
        o_api = OdooAPI()
        f=['create_date', 'state_breaking']
        c=[['product_id','=',product_id]]
        res = o_api.search_read('stock.breaking', c, f)

        return res

    # get list breaking for a artile by list sous
    def get_list_breaking_by_list(lProduct_id):
        """ sous forme date de début  -  dadte de fin"""

        o_api = OdooAPI()
        res = o_api.execute('stock.breaking', 'get_artile_breaking_period_by_list', lProduct_id)

        dRes = {}
        product_id =0
        listBreak =[]
        for r in res:
            if product_id != r['product_id']:
                product_id = r['product_id']
                listBreak = [r]
                dRes[product_id] = listBreak

            else:

                listBreak.append(r)



        return dRes

    # Liste of last Sale article
    def get_list_date_last_sale():
        o_api = OdooAPI()
        resLastDate = o_api.execute('lacagette_tools',"get_stockQuant_last_Sale", [])

        return resLastDate


    # Liste of arcticle breacking

    def get_list_article_breaking():
        o_api = OdooAPI()
        #Recuper les articles en rupture
        resBreaking = o_api.execute('stock.breaking',"get_artile_breaking", [])
        #print (resBreaking)
        #creation d'une liste avec tout les articles en rupture pour recuperer les donnée de product_produt
        listId = []
        for a in resBreaking:
            listId.append(a['product_id'])
        print (len(listId))

        f=['id', 'name','image_small', 'active', 'sale_ok', 'purchase_ok']
        c=[['id','in',listId]]

        res = o_api.search_read('product.product', c, f)

        print (len(res))
        for a in resBreaking.copy():
            for b in res:
                if b['id'] == a['product_id']:
                    if b['sale_ok'] and b['active']: # a mettre purchase_ok si on veut rajouter l'achat
                        a['name']=b['name']
                        a['purchase_ok']=b['purchase_ok']
                        a['image_small']=b['image_small']
                    else:
                        resBreaking.remove(a)
                    break
                #else:
                    #a['name']=a['product_id']
                    #a['image_small']=""
            else:
                resBreaking.remove(a)


        return (resBreaking)

    # Search list arctil o name

    def get_article_history_breaking(id,startDate,endDate):
        o_api = OdooAPI()
        f=['state_breaking','qty', 'product_id','create_date']
        c=[['product_id','=',id]]
        res = o_api.search_read('stock.breaking', c,f)

        return (res)


    #Search list arcticle with name

    def get_list_article(rech):

        o_api = OdooAPI()
        #f=['name','currency_id','virtual_available','product_variant_count','lst_price','qty_available','type','product_variant_ids','image_small','uom_id','default_code','is_product_variant','__last_update']

        f=['name','lst_price','qty_available','image_small','barcode','uom_id']
        c=[['name','ilike',rech]]

        res = o_api.search_read('product.product', c,f, 100)

        return (res)

    # Search list arctil with barcode

    def get_article_byBarcode(rech):
        o_api = OdooAPI()
        f=['name','lst_price','qty_available','image_small']
        c=[['barcode','ilike',rech]]

        res = o_api.search_read('product.product', c,f, 100)

        return (res)

    # Artile on breaking with product_id et uom_id
    def set_article_rupture(data):
        o_api = OdooAPI()
        print (data['idArticle'])
        print (data['uom_id'])
        fields = {'company_id': 1, 'name': 'Ajustement qty rupture2',
                  'filter': 'product', 'product_id': data['idArticle'], 'location_id': 12}
        inv = o_api.create('stock.inventory', fields)

        if not (inv is None):
            fields = {'product_id': data['idArticle'], 'inventory_id': inv,
                      'product_qty': 0, 'product_uom_id': data['uom_id'], #uQtyArticle, # quanttié vérifée , unité de mesure d'article
                      'location_id': 12}
            invLi = o_api.create('stock.inventory.line', fields)
            if not (invLi is None):
                try:
                    o_api.execute('stock.inventory', 'action_done', [inv])
                except:
                    print ('Probleme action_done avec ' + str(data['idArticle']))
            else:
                print('Probleme invLi avec ' + str(data['idArticle']))
        else:
            print ('Probleme inv avec ' + str(data['idArticle']))

        return inv

    def set_article_archive(id_product_product):
        """Met l'article en statut archivé"""

        o_api = OdooAPI()
        #recherche l'id_product_template

        f=["product_tmpl_id"]
        c=[['id','=',id_product_product]]

        res = o_api.search_read('product.product', c,f, 1)
        # print (res)
        # print (res[0]['product_tmpl_id'][0])
        try:
            o_api.execute('product.template','toggle_active', res[0]['product_tmpl_id'][0])
        except Exception as e:
            coop_logger.error("Stock set_article_archive : %s, %s", str(e), str(id_product_product))

        return True

    def set_dont_purchase(id_product_product):

        o_api = OdooAPI()

        f=["product_tmpl_id"]
        c=[['id','=',id_product_product]]
        #recherche l'id_product_template
        res = o_api.search_read('product.product', c,f, 1)
        print (res)
        #change la valeur
        res = o_api.update('product.template', res[0]['product_tmpl_id'][0],{"purchase_ok":False})
        # print (res)
        return True

    def get_saleWitheNotSale(mDate):

        o_api = OdooAPI()

        res = o_api.execute('lacagette_tools', "get_sale_article_by_date", mDate)

        return res

    def get_sale_qty_by_from(nbW):
        o_api = OdooAPI()
        dArticleSale = {}
        res = o_api.execute('lacagette_tools', "get_sale_qty_by_from", nbW)


        return res



    def set_test():
        o_api = OdooAPI()
        res = o_api.execute('lacagette_tools', "get_sale_qty_by_from", 125)
        # print (res)
        return res
