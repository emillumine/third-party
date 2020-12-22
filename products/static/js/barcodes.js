IFCBarcodes = {
    'codes': {},
    'patterns': [],
    'errors': [],
    init : async function() {
        // as it is a long time response task, restrict it
        if (is_time_to('load_barcodes', 5000)) {
            openWaiting('Récupération des informations code-barres....');
            try {
                let response = await fetch('/products/barcodes');
                let bc_data = await response.json();

                closeModal();
                if (typeof bc_data.res.error == "undefined") {
                    this.patterns = bc_data.res.patterns;
                    this.codes = bc_data.res.list.pdts;
                    this.uoms = bc_data.res.list.uoms;
                    this.keys = bc_data.res.keys;
                } else {
                    this.errors.push(bc_data.error);
                }
            } catch (e) {
                err = {msg: e.name + ' : ' + e.message, ctx: 'retrieve barcodes'};
                console.error(err);
                report_JS_error(err, 'products');
                closeModal();
                this.errors.push(JSON.stringify(err));
            }
        }
    },
    display_last_error: function() {
        alert(this.errors[this.errors.length - 1]);
    },
    get_corresponding_odoo_product: function(bc) {
        //console.log('To analyze :' + bc)
        var odoo_product = null;

        var index = 0,
            pattern_found = false,
            encoded_value = '';
        // Let's find out if it matches a pattern

        while (index < this.patterns.length -1 && pattern_found === false) {
            var pattern = this.patterns[index];
            var significant_prefix = pattern.replace(/[^0-9]/g, ''); //remove all but figures

            if (bc.indexOf(significant_prefix) === 0) {
                // console.log(pattern)
                // console.log(bc)
                //0493...{NNDDD} (pattern)
                //0493213018809 (bc)
                pattern_found = true;
                pattern = pattern.replace(/[^0-9.ND]/, '');
                bc = bc.slice(0, -1); // remove original check figure
                odoo_bc = '';
                // Read pattern character by character
                for (var i = 0; i < pattern.length; i++) {
                    if (/[0-9]/.exec(pattern[i])) {
                        odoo_bc += pattern[i];
                    } else if (pattern[i].indexOf('.') === 0) {
                        odoo_bc += bc[i];
                    } else if (/[ND]/.exec(pattern[i])) {
                        odoo_bc += '0';
                        if (pattern[i] === 'D' && encoded_value.indexOf('.') < 0)
                            encoded_value += '.';
                        encoded_value += bc[i];
                    }
                }
                // Add check digit at the end of odoo_bc to find out "normalized" code
                bc = odoo_bc + eanCheckDigit(odoo_bc);
            }
            index++;
        }

        // let's seek "normalized" bc in codes array
        for (code in this.codes) {
            if (code == bc) {
                odoo_product = {barcode: code, data: this.codes[code], value: encoded_value};
            }
        }
        //console.log(odoo_product)
        return odoo_product;
    }
};

init_barcodes = async function() {
    var result = null;
    var ifcb = Object.create(IFCBarcodes);

    await ifcb.init();
    if (ifcb.errors.length > 0)
        ifcb.display_last_error();
    else
        result = ifcb;
    // console.log(result.patterns)
    return result;
};
