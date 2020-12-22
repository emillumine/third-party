function products_shelf_label_print (products, callback) {
    console.log('Demande impression etiquettes rayon');
    params = {products: JSON.stringify(products)};
    post_form('/products/shelf_labels', params, callback);
}
/*
$.ajax({
            url: tools_server + "/products/label_print/"
            + updatedProducts[i].product_tmpl_id + "/"
            + updatedProducts[i].new_shelf_price
});
*/