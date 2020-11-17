from outils.common_imports import *
from outils.for_view_imports import *
from datetime import date, time, datetime, timedelta

from django.views.generic import View
from django.conf import settings



import timeit


from .models import CagetteStock


from django.shortcuts import render




# ??? a voir si on garde les heur d'ouverture de la cagette ici

listWeekOpenHour = [[14,21],[8,21],[8,21],[8,21],[8,21],[8,21],[0,0]]


# La Cagette Order -------------------------------------------------
nbWeek = 4
now = datetime.combine(date.today(), datetime.min.time())
startDate = now - timedelta(weeks=nbWeek) + timedelta(days=1)
endDate = now


# Order module with breaking of article


def stockOrder(request):

    """
    Page de la commande
    Template :  stock_order.html
    """

    context = {'title': 'Commande de '}
    template = loader.get_template('stock/stock_order.html')

    return HttpResponse(template.render(context, request))


"""Doit recuperer la liste des fournisseur """

def get_liste_supplyer(request):
    data = CagetteStock.get_liste_supplyer()

    return JsonResponse(data, safe=False)


def get_list_article_fournisseur(request, four_id):
    """ Recupère la liste des fournisseur suivant l'identifiant du fournisseur

    """

    print(four_id)
    data =CagetteStock.get_article_from_supplyer(four_id)

    lProduct_id =[]
    for article in data:
        lProduct_id.append(article['product_id'])
    lAverBreaking = get_sale_average_with_breaking_liste(lProduct_id, startDate, endDate)

    for article in data:
        article['average_breaking'] = round(lAverBreaking[article['product_id']]['breakAverage'] * 8 ,2)
        article['average'] = round(lAverBreaking[article['product_id']]['average'] * 8, 2)



    return JsonResponse({"data" : data}, safe=False)



def get_sale_average_with_breaking_liste(listeProduct_id, startDate, endDate):
    """

    Recupère la moyen des vente en comptablisant les ruptures
    suivant la liste de d'article  et une plage de date
    startDate - endDate

    """
    nbHourOpen = get_nb_hour_open_period(startDate, endDate)

     # recupere la liste des ventes
    dicSale = CagetteStock.get_list_sale_qty(listeProduct_id)

    dicBreak = CagetteStock.get_list_breaking_by_list(listeProduct_id)

    res = {}

    for id in listeProduct_id:
        # recupere la liste des ventes
        #print ("id {} : ".format(id))
        try:
            saleQty = dicSale[id]
        except KeyError:
            saleQty = 0

        # recupere la liste des ruptures
        try:
            myBreakingList = dicBreak[id]
        except KeyError:
            myBreakingList = []
        d = startDate
        delta = timedelta(days=1)
        nbHourBreaking = 0

        while d <= endDate:
            nbHourBreaking += get_hour_breaking_day(myBreakingList, d)
            d += delta
            if d.weekday() == 6:
                d += delta
        #print (" {} nbHourBreaking {}".format(id, nbHourBreaking))
        res[id] = {'average': 8*saleQty/nbHourOpen, 'breakAverage': 8*saleQty/ (nbHourOpen-nbHourBreaking)}

        print ("qty : {} - heure ouvet : {} - heure Breaking : {}".format(saleQty, nbHourOpen, nbHourBreaking))

    return res



# Breaking Date of Last Sale of articles      -----------------------------------

def stockQuantLastSale(request):

    """   Page de la liste des dernière vente par article
    Template :  stock_stockQuantLastSale.html
    """
    context = {'title': 'Date des dernière vente des articles'}
    template = loader.get_template('stock/stock_stockQuantLastSale.html')

    return HttpResponse(template.render(context, request))

def get_list_date_last_sale(request):

    """Liste des dernière vente des articles recupere par ajax
        pour le tableau
     """

    arcticle = CagetteStock.get_list_date_last_sale()

    for a in arcticle.copy():
        if a['stockqt'] <= 0:
            arcticle.remove(a)

    return JsonResponse({"data":arcticle}, safe=False)



# Following sale article with breaking                                  graph  -------------------------------------

def graphSale(request):

    """

    Html pour le graph des vente/rupture
    Template : stock_graphSale.html

    """

    context = {'title': 'Graph de Ventes'}
    template = loader.get_template('stock/stock_graphSale.html')

    return HttpResponse(template.render(context, request))





def get_nb_hour_open_period(startDate, endDate):

    """
    Donne le nombre d'heure d'ouverture du magazin sur la periode startDate, endDate
    """

    print ("-----------------------")
    #print (str (startDate) + " --- "  + str(endDate))
    if startDate.strftime("%Y-%m-%d") == endDate.strftime("%Y-%m-%d"):
        return endDate.hour - startDate.hour
    else:
        if startDate.hour < listWeekOpenHour[startDate.weekday()][0]:
            nbHour = listWeekOpenHour[startDate.weekday()][1] - listWeekOpenHour[startDate.weekday()][0]
        elif startDate.hour > listWeekOpenHour[startDate.weekday()][1]:
            nbHour = 0
        else:
            nbHour = listWeekOpenHour[startDate.weekday()][1] - startDate.hour
        print (nbHour)
        if endDate.hour < listWeekOpenHour[endDate.weekday()][0]:
            nbHour += 0
        elif endDate.hour > listWeekOpenHour[endDate.weekday()][1]:
            nbHour += listWeekOpenHour[endDate.weekday()][1] - listWeekOpenHour[endDate.weekday()][0]
        else:
            nbHour += endDate.hour - listWeekOpenHour[endDate.weekday()][0]
        print (nbHour)
        d = startDate + timedelta(days=1)
        while d < endDate - timedelta(days=1):

            nbHour += listWeekOpenHour[d.weekday()][1] - listWeekOpenHour[d.weekday()][0]
            #print (str(d) + "  --- " + str(nbHour))
            d += timedelta(days=1)
        return nbHour


def get_hour_breaking_day(listBreaking, myDate):

    """
    Donne le nombre d'heure de rupture sur la journee myDate
    avec en entre le liste des ruptures formater sur la forme : start end
    """

    oneDay = timedelta(days=1)
    for b in listBreaking:

        startDate = datetime.strptime(b["start"], '%Y-%m-%dT%H:%M')
        endDate = datetime.strptime(b["end"], '%Y-%m-%dT%H:%M')
        if myDate > startDate   and myDate <  endDate :
                return listWeekOpenHour[myDate.weekday()][1] - listWeekOpenHour[myDate.weekday()][0]
        elif myDate.strftime("%Y-%m-%d") == startDate.strftime("%Y-%m-%d") :
            return listWeekOpenHour[myDate.weekday()][1] - startDate.hour
        elif myDate.strftime("%Y-%m-%d") == endDate.strftime("%Y-%m-%d") :
            return startDate.hour - listWeekOpenHour[myDate.weekday()][0]

    return 0


def isBreaking(listBreaking, myDate):
    """
    Suivant la liste de rupture au format : start end s'il le jours est en rupture
    """
    oneDay = timedelta(days=1)



    for b in listBreaking:
        startDate = datetime.strptime(b["start"], '%Y-%m-%dT%H:%M')
        endDate = datetime.strptime(b["end"], '%Y-%m-%dT%H:%M')
        if myDate.date() > startDate.date()  and myDate.date() <  endDate.date() :
            return 1
        elif myDate.date() == startDate.date()  or  myDate.date() ==  endDate.date() :
            return 1
    return 0


# Graph liste data

def get_list_sale_breaking(request, product_id):


    product_id = int(product_id)

    # definit le periode d'affichage ??? a voir ou on definir cette periode
    nbWeek = 10



    # recupere la liste des ruptures
    try:
        myBreakingList = CagetteStock.get_list_breaking_by_list([product_id])[product_id]
    except KeyError:
        myBreakingList = []

    # recupere la liste des ventes
    listSale = CagetteStock.get_list_sale(product_id, startDate, endDate)

    #moyenne de vente par heure

    averageSale = get_sale_average_with_breaking_liste([product_id], startDate, endDate)[product_id]['breakAverage']
    listAverage = []


    listLabel = []
    listQtySale = []
    listBreakingHour = []
    listSupplyingHour = []
    listOpenHour = []



    d = startDate
    delta = timedelta(days=1)

    iListSale =  iter(listSale)

    #initialise l'iteration et defini si on commence par une rupture ou pas sur le debut de la periode

    try:
        mySale = next(iListSale)
        mySaleDate = datetime.strptime(mySale["write_date"], '%Y-%m-%d %H:%M:%S')
    except StopIteration:
        mySaleDate = endDate + timedelta(days=1)
        print("rupture 1 :" + str(product_id))
        print (listSale)

    # Boucle sur la periode

    while d <= endDate:

        myQty = 0
        #print (d.strftime("%Y-%m-%d") + "  " + mySaleDate.strftime("%Y-%m-%d"))
        while d.strftime("%Y-%m-%d") == mySaleDate.strftime("%Y-%m-%d"):
            #print (mySale["qty"])
            myQty += float(mySale["qty"])
            try:
                mySale = next(iListSale)
                mySaleDate = datetime.strptime(mySale["write_date"], '%Y-%m-%d %H:%M:%S')
            except StopIteration:
                #print ("Plus rupture")
                break

        listLabel.append(d.strftime("%Y-%m-%d"))
        listQtySale.append(myQty)
        listOpenHour.append(listWeekOpenHour[d.weekday()][1] - listWeekOpenHour[d.weekday()][0])
        listBreakingHour.append(isBreaking(myBreakingList, d))

        listAverage.append(averageSale * (listWeekOpenHour[d.weekday()][1]-listWeekOpenHour[d.weekday()][0]))

        d += delta
        #Suppression du dimanche dans le graph
        if d.weekday() == 6:
            d += delta


    # Formate les données pour le graph
    data = {

      'labels': listLabel,
      'datasets': [{
          'label': "Vente",
          'type': "line",
          'borderColor': "#8e5ea2",
          'data': listQtySale,
          'fill': False
        }, {
          'label': "Rupture",
          'type': "bar",
          'backgroundColor': 'red',
          'borderColor': "#3e95cd",
          'data': listBreakingHour,
        }, {
          'label': "Moyen Vente",
          'type': "bubble",
          'backgroundColor': 'blue',
          'borderColor': "#3e95cd",
          'data': listAverage,
        }
      ]
    }


    return JsonResponse({"data":data}, safe=False)


# Breaking Article liste, at time                                                     -----------------------------------

def listArticleBreaking(request):

    """Page de selection de la commande suivant un fournisseurs"""

    context = {'title': 'Liste des Articles en Ruptures'}
    template = loader.get_template('stock/stock_listArticleBreaking.html')

    return HttpResponse(template.render(context, request))

def get_list_article_breaking(request):

    """Page de selection de la commande suivant un fournisseurs"""

    arcticle = CagetteStock.get_list_article_breaking()

    return JsonResponse({"data":arcticle}, safe=False)


# Commande with breaking time

def commandLacagette(request):

    context = {'title': 'Rupture'}
    template = loader.get_template('stock/stock_rupture.html')

    return HttpResponse(template.render(context, request))



# Set in odoo breaking article stock 0.

def breakingArticleSet(request):
    """Page de selection de la commande suivant un fournisseurs"""

    context = {'title': 'Rupture'}
    template = loader.get_template('stock/stock_breakingArticleSet.html')

    return HttpResponse(template.render(context, request))


# get list arctil by name
def get_list_article(request):

    """Page de selection de la commande suivant un fournisseurs"""

    arcticle = CagetteStock.get_list_article(request.GET['rech'])

    return JsonResponse({"data":arcticle}, safe=False)

# get list arctil by Codbare
def get_article_byBarcode(request):

    """Page de selection de la commande suivant un fournisseurs"""

    arcticle = CagetteStock.get_article_byBarcode(request.GET['rech'])

    return JsonResponse({"data":arcticle}, safe=False)


# set Rupture of article
def set_rupture(request):
    rep = HttpResponse("Not")
    if request.is_ajax():
        if request.method == 'PUT':
            dataJson = json.loads(request.body.decode())
            m = CagetteStock.set_article_rupture(dataJson)


    return HttpResponse(m)

# set arcticle en archive
def set_archive(request):
    rep = HttpResponse("Not")
    if request.is_ajax():
        if request.method == 'PUT':
            dataJson = json.loads(request.body.decode())
            #print (dataJson['idArticle'])


            CagetteStock.set_article_archive(dataJson['idArticle'])


    return JsonResponse({"data":"toto"}, safe=False)

# set le valeur ne pas acheter a true
def set_dontPurchase(request):
    rep = HttpResponse("Not")
    if request.is_ajax():
        if request.method == 'PUT':
            dataJson = json.loads(request.body.decode())

            CagetteStock.set_dont_purchase(dataJson['idArticle'])


    return JsonResponse({"data":"toto"}, safe=False)

#-------------------------------------------------------- Vente semaine avec jours sans vente


def saleWithNotSale(request):

    """
    Page vente de la semaines avec les jours sans vente
    Template :  stock_saleWithNotSale.html
    """

    context = {'title': 'Vente avec jours sans vente'}
    template = loader.get_template('stock/stock_saleWithNotSale.html')

    return HttpResponse(template.render(context, request))

def get_saleWitheNotSale(request):
    nbW = 4
    dArticleSale = {}
    #recupere les vente avec les quantité sur depuis nbW de semaines
    listSale = CagetteStock.get_sale_qty_by_from(nbW)
    print(len(listSale))

    for a in listSale:
            dArticleSale[a['product_id']] = {'qty':a['sumqty'],'daySale':0, 'name':a['name']}

    print (len(dArticleSale))

    dArticle = {}
    stDay = now - timedelta(weeks=nbW)
    #stDay = datetime(2019, 1, 20)
    for i in range(nbW*7):
        mListSale = CagetteStock.get_saleWitheNotSale(stDay + timedelta(days=i))
        nbErrorKey =0
        for a in mListSale:
            try:
                dArticleSale[a['product_id']]['daySale'] += 1
            except KeyError:
                nbErrorKey +=1
        print ('Errorkey:{}'.format(nbErrorKey))

    print (len(dArticleSale))

    lArticleSale =[]
    for key, valeur in dArticleSale.items():
        lArticleSale.append({'product_id':key,'qty': valeur['qty'], 'daySale': valeur['daySale'], 'name': valeur['name']})

    return JsonResponse({"data":lArticleSale}, safe=True)



def get_test(request):
    res = CagetteStock.get_sale_qty_by_from(1)
    return JsonResponse({"data":res}, safe=False)
