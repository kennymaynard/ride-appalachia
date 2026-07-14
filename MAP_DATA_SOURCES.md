# Map data sources

Only agency-published or land-manager-published geometry should be rendered as an exact trail route.

| System | Geometry source | Source date/status |
| --- | --- | --- |
| Redbird Crest Trail 801 | [USDA Forest Service National Forest System Trails](https://apps.fs.usda.gov/arcx/rest/services/EDW/EDW_TrailNFSPublishWithDataStatus_01/MapServer/0) (`admin_org=080217`, `trail_no=801`) | Queried July 12, 2026 |
| Peters Mill Run / Taskers Gap | [USDA Forest Service National Forest System Trails](https://apps.fs.usda.gov/arcx/rest/services/EDW/EDW_TrailNFSPublishWithDataStatus_01/MapServer/0) (`admin_org=080804`; published motorized trail records 433, 457, 474, 493–499, and 553 series) | Queried July 12, 2026 |
| South Pedlar ATV Trail System | [USDA Forest Service National Forest System Trails](https://apps.fs.usda.gov/arcx/rest/services/EDW/EDW_TrailNFSPublishWithDataStatus_01/MapServer/0) (`admin_org=080805`, `trail_no=800–806`) | Queried July 12, 2026 |
| North Cumberland WMA / Royal Blue | [Tennessee Wildlife Resources Agency official GPX](https://www.tn.gov/content/dam/tn/twra/documents/north-cumberland-wma-trails/NorthCumberlandWMATrails_Nov14_2024_gpx.zip) | November 14, 2024 |
| Hatfield–McCoy systems | Official Hatfield–McCoy GIS/KMZ data, imported with `scripts/import_hatfield_mccoy_kmz.py` | See generated route module |

Do not trace geometry from screenshots or PDF maps. Listings without verified geometry may retain their official-map link, but must not receive a fabricated route line.
