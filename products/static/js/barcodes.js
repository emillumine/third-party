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
                    this.aliases = bc_data.res.aliases;
                    this.codes = bc_data.res.list.pdts;
                    this.uoms = bc_data.res.list.uoms;
                    this.keys = bc_data.res.keys;
                } else {
                    this.errors.push(bc_data.res.error);
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
        var index = 0,
            pattern_found = false,
            is_alias = false,
            encoded_value = '',
            pattern_type = '',
            odoo_product = null,
            product_data = null;
        // Let's find out if it matches a pattern

        while (index < this.patterns.length -1 && pattern_found === false) {
            var pattern = this.patterns[index].pattern;
            var significant_prefix = pattern.replace(/[^0-9]/g, ''); //remove all but figures

            if (bc.indexOf(significant_prefix) === 0) {
                /*
                    For example,
                    bc = 0493213018809
                    pattern = 0493...{NNDDD}
                */
                //console.log(pattern)
                // console.log(bc)
                odoo_bc = '';
                pattern_found = true;
                pattern_type = this.patterns[index].type;
                pattern = pattern.replace(/[^0-9.ND]/, '');
                bc = bc.slice(0, -1); // remove original check figure

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

        // let's seek "normalized" bc in codes array or alias map
        for (alias in this.aliases) {
            if (bc == alias) {
                is_alias = true;
                for (barcode in this.codes) {
                    if (barcode == this.aliases[alias]) {
                        product_data = this.codes[barcode];
                    }
                }
            }
        }
        if (is_alias === false) {
            for (code in this.codes) {
                if (code == bc) {
                    product_data = this.codes[code];
                }
            }
        }

        if (product_data !== null) {
            p_uom = (this.uoms)[product_data[this.keys.uom_id]];
            if (encoded_value.length > 0 && !isNaN(encoded_value)) {
                if (p_uom == 'Unit(s)' || p_uom == 'unité') {
                    encoded_value = parseInt(encoded_value, 10);
                } else {
                    encoded_value = parseFloat(encoded_value);
                }
            }

            odoo_product = {barcode: bc, data: product_data, rule: pattern_type, value: encoded_value};

        }

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
