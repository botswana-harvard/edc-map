import os

from django.apps import AppConfig
from django.conf import settings

from edc_map.exceptions import FolderDoesNotExist


class EdcMapAppConfig(AppConfig):
    name = 'edc_map'
    verbose_name = 'Edc Map'
    image_folder = os.path.join(settings.MEDIA_ROOT, 'edc_map')
    image_folder_url = os.path.join(settings.MEDIA_URL, 'edc_map')

    def ready(self):
        from edc_map import signals
        from edc_map.site_mappers import site_mappers
        if not os.path.exists(self.image_folder):
            raise FolderDoesNotExist(
                'Map Image folder for \'{}\' does not exist. Got \'{}\''.format(
                    self.name, self.image_folder))
        site_mappers.autodiscover()
