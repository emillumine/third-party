
from django.conf.urls import  url

from . import views

urlpatterns = [
    url(r'^$', views.listArticleBreaking),
    #Order
    
    url(r'^stockOrder', views.stockOrder),
    url(r'^get_liste_supplyer', views.get_liste_supplyer),
    url(r'^get_list_article_fournisseur/(?P<four_id>\d+)/$', views.get_list_article_fournisseur),
    
    # Graph of Sale 
    url(r'^graphSale', views.graphSale),
    url(r'^get_list_sale_breaking/(?P<product_id>\d+)$', views.get_list_sale_breaking),
    
    # lien of Liste Articles Breaking
    url(r'^listArticleBreaking', views.listArticleBreaking),
    url(r'^get_list_article_breaking', views.get_list_article_breaking),
    
    # lien of commande
    url(r'^commandLacagette', views.commandLacagette),
    
    # lien of breaking Article Set
    url(r'^breakingArticleSet', views.breakingArticleSet),
    url(r'^get_list_article', views.get_list_article),
    url(r'^get_article_byBarcode', views.get_article_byBarcode),
    url(r'^set_rupture', views.set_rupture),
    
    # lien of last Sale of Articles
    url(r'^stockQuantLastSale', views.stockQuantLastSale),
    url(r'^get_list_date_last_sale', views.get_list_date_last_sale),
    url(r'^set_archive', views.set_archive),
    url(r'^set_dontPurchase', views.set_dontPurchase),
    
    # Lien saleWithNotSale
    url(r'^saleWithNotSale', views.saleWithNotSale),
    url(r'^get_saleWitheNotSale', views.get_saleWitheNotSale),
    
    
    
    url(r'^get_test', views.get_test),
]
