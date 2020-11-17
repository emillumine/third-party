"""Custom logging, entry point for reacting to errors."""

from django.conf import settings
import logging
import traceback

logger = logging.getLogger("coop.trace")


def custom_process_error(record):
    """
    dir(record)
    ['__class__', '__delattr__', '__dict__', '__dir__', '__doc__', '__eq__', '__format__', '__ge__', '__getattribute__', '__gt__', '__hash__', '__init__', '__le__', '__lt__', '__module__', '__ne__', '__new__', '__reduce__', '__reduce_ex__', '__repr__', '__setattr__', '__sizeof__', '__str__', '__subclasshook__', '__weakref__', 'args', 'created', 'exc_info', 'exc_text', 'filename', 'funcName', 'getMessage', 'levelname', 'levelno', 'lineno', 'module', 'msecs', 'msg', 'name', 'pathname', 'process', 'processName', 'relativeCreated', 'request', 'stack_info', 'status_code', 'thread', 'threadName']
    """
    """
      dir(record.request)
      ['COOKIES', 'FILES', 'GET', 'META', 'POST', '__class__', '__delattr__', '__dict__', '__dir__', '__doc__', '__eq__', '__format__', '__ge__', '__getattribute__', '__gt__', '__hash__', '__init__', '__iter__', '__le__', '__lt__', '__module__', '__ne__', '__new__', '__reduce__', '__reduce_ex__', '__repr__', '__setattr__', '__sizeof__', '__str__', '__subclasshook__', '__weakref__', '_cached_user', '_cors_enabled', '_current_scheme_host', '_encoding', '_files', '_get_full_path', '_get_post', '_get_raw_host', '_get_scheme', '_initialize_handlers', '_load_post_and_files', '_mark_post_parse_error', '_messages', '_post', '_post_parse_error', '_read_started', '_set_post', '_stream', '_upload_handlers', 'body', 'build_absolute_uri', 'close', 'content_params', 'content_type', 'csrf_processing_done', 'encoding', 'environ', 'get_full_path', 'get_full_path_info', 'get_host', 'get_port', 'get_raw_uri', 'get_signed_cookie', 'is_ajax', 'is_secure', 'method', 'parse_file_upload', 'path', 'path_info', 'read', 'readline', 'readlines', 'resolver_match', 'scheme', 'session', 'upload_handlers', 'user', 'xreadlines']

    """
    """
    print(record.getMessage())
    print(record.module)
    print(record.stack_info)
    print(record.threadName)
    print(record.processName)
    #print(record.exc_info)
    print(record.filename)
    print(record.funcName)
    print(record.request.get_full_path())
    # print(record.request.method)
    """


    if record.levelname == 'ERROR':
        if hasattr(record, 'request'):
            logger.error(record.request.get_full_path() + ' --> ' + str(traceback.format_exc()))
        else:
            logger.error(record.getMessage())
    return True
