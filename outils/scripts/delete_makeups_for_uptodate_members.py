"""
Delete makeups_to_do for up_to_date members.


Run this script from the project root with:
$ python -m outils.scripts.delete_makeups_for_uptodate_members
"""
import os
from pathlib import Path
from importlib import import_module
import logging


logging.basicConfig(
     level=logging.DEBUG,
     format='[%(asctime)s] %(levelname)s - %(message)s',
     datefmt='%H:%M:%S'
 )

logger = logging.getLogger(__file__)

project_path = Path(__file__).resolve().parents[2]


def get_api():
    if not os.environ.get('DJANGO_SETTINGS_MODULE'):
        os.environ['DJANGO_SETTINGS_MODULE'] = "outils.settings"
    module = import_module('outils.common')
    return module.OdooAPI()


def get_concerned_users(api):
    cond = [
            ['cooperative_state', '=', 'up_to_date'],
            ['makeups_to_do', '>', 0]
           ]
    fields = ['id']
    return api.search_read('res.partner', cond, fields)


def main():
    api = get_api()
    concerned_users = get_concerned_users(api)
    logger.info('Number of concerned members %i', len(concerned_users))
    for user in concerned_users:
        logger.debug("Member: %s is concerned", user.get('name'))
        api.update('res.partner', user.get('id'), {'makeups_to_do': 0})
        logger.debug("Member: %s has no more make ups to do!",
                     user.get('name'))
    new_concerned_users = get_concerned_users(api)
    logger.info('Now the number of concerned members %i',
                len(new_concerned_users))


if __name__ == "__main__":
    main()
