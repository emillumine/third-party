//pouchDB persistent queries
// document that tells PouchDB/CouchDB


var oidoc = {
    _id: '_design/index',
    views: {
        by_fp: {
            map: function (doc) {
                emit(doc.fingerprint);
            }.toString()
        },
        by_completed: {
            map: function (doc) {
                emit(doc.completed);
            }.toString()
        },
        by_odoo_id: {
            map: function (doc) {
                emit(doc.odoo_id);
            }.toString()
        }
    }
};
// save it

dbc.put(oidoc, function (err, result) {
    if (!err) {
        console.log('index enregistré');
    } else {
    //console.log(err);
    }
});