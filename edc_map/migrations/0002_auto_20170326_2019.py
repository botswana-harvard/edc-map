# -*- coding: utf-8 -*-
# Generated by Django 1.10.6 on 2017-03-26 18:19
from __future__ import unicode_literals

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('edc_map', '0001_initial'),
    ]

    operations = [
        migrations.AlterUniqueTogether(
            name='innercontainer',
            unique_together=set([('device_id', 'name', 'map_area', 'container')]),
        ),
    ]
