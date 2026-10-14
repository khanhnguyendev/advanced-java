# Image provenance

All 125 images come from the upstream repository doocs/advanced-java
(https://github.com/doocs/advanced-java) at commit 1a35221 and are included under
that repository's license, CC-BY-SA-4.0. Their original authorship is not
documented upstream. They are listed in `advanced-java/import-report.md` and on
`/about`.

## Redrawn diagrams

All 125 upstream images are replaced in the documents by diagrams redrawn
for this site (`content/advanced-java/_diagrams/`). The licence of each diagram
file is recorded in its `license` field:

- 96 are `derived`: redrawn from the upstream image at commit 1a35221
  (doocs/advanced-java), CC-BY-SA-4.0; original authorship is not documented
  upstream.
- 29 are `third-party`: redrawn from figures by other authors (Fowler,
  Richardson, the Sentinel wiki). They are credited to the author and title
  from `source-credits.json`, and are NOT relicensed under CC-BY-SA-4.0.

All of them are credited individually on `/about`.

The replaced upstream rasters remain in `_assets` for the diagram review route
only; they are not copied to the public build (`DIAGRAM_REVIEW=1` copies them).
