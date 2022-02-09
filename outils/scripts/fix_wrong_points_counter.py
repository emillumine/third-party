# coding: utf-8
"""Interact with Odoo by python code
Before launching script, launch the following command:
export DJANGO_SETTINGS_MODULE='scripts_settings'
(a file named scripts_settings.py is present in this directory)
"""
#
import sys, getopt, os
sys.path.append(os.path.abspath('../..'))
from outils.common import OdooAPI
import datetime

def main():
    """For coops in alert state, reajust points counter so they get to 0 after adding their makeups to their actual calculated total"""
    api = OdooAPI()

    cond = [
        '|',
        '|',
        '|',
        ['cooperative_state','=', 'alert'],
        ['cooperative_state','=', 'unsubscribed'],
        ['cooperative_state','=', 'suspended'],
        ['cooperative_state','=', 'delay']
    ]
    fields = ['id', 'name', 'makeups_to_do', 'cooperative_state']
    res = api.search_read('res.partner', cond, fields)

    cpt = 0

    for p in res:
        # Get real points count
        cond = [['partner_id','=', p["id"]], ['type','=', 'standard']]
        fields = ['point_qty', 'name']
        res_counter_event = api.search_read('shift.counter.event', cond, fields)

        total_pts = 0
        for item in res_counter_event:
            total_pts += item['point_qty']

        # Get future makeups
        cond = [
            ['name','=', p["name"]], 
            ['shift_type','=', 'standard'], 
            ['is_makeup','=', True], 
            ['date_begin', '>=', datetime.datetime.now().isoformat()]
        ]
        fields = ['id']
        res_shift_reg = api.search_read('shift.registration', cond, fields)

        final_theoric_pts = total_pts + p['makeups_to_do'] + len(res_shift_reg)

        if final_theoric_pts < 0:
            cpt += 1

            print(p["name"])
            print('theoric total : ' + str(final_theoric_pts))
            print('>> total_pts : ' + str(total_pts))
            print('>> makeups_to_do : ' + str(p['makeups_to_do']))
            print('>> nb future makeups : ' + str(len(res_shift_reg)))

            """
                For unsubscribed people, 
                adding a point and going through run_process_target_status may lead them to be suspended 
                whereas they're not subscribed to any shift.
                Adding a fake point will lead odoo to reset Unsuscribed status.
            """
            add_second_corrective_pt = p['cooperative_state'] == 'unsubscribed'

            # Add/remove points so their final theoric points is 0
            points_to_add = -final_theoric_pts
            fields = {
                'name': "Correction de l'historique de points",
                'shift_id': False,
                'type': 'standard',
                'partner_id': p['id'],
                'point_qty': points_to_add
            }
            api.create('shift.counter.event', fields)
            print('===> Pts ajoutés : ' + str(points_to_add))

            if add_second_corrective_pt is True:
                api.execute('res.partner', 'run_process_target_status', [])
                fields = {
                    'name': "Correction de l'historique - Sécurité pour les désinscrit.es",
                    'shift_id': False,
                    'type': 'standard',
                    'partner_id': p['id'],
                    'point_qty': 0
                }
                api.create('shift.counter.event', fields)
                print('===> Pt correctif pour désinscrits')

            print('--------')

    print('Nb de personnes concernées : ' + str(cpt))

if __name__ == "__main__":
    main()