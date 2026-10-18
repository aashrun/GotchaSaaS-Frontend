# Embedded preview navigation

The reported Story Map / Edit Planner blank screen was reproduced in the actual Gotcha preview. The saved HTML and validated project revision matched; this was not stale sandbox output.

A `srcdoc` iframe inherits its embedding page's base URL. Native `href="#story-map"` therefore resolved to the builder's `/projects?chat=...#story-map` URL. Clicking it loaded Gotcha inside the isolated iframe, producing a blank view. Earlier verification ran the compiled app as a top-level document, where the same anchors worked, so it missed this integration failure.

`Sandbox/preview-navigation.cjs` adds a platform-owned, idempotent fragment-navigation adapter. It respects app-handled clicks, modifier keys, explicit targets and downloads. Local fragment links update the iframe's own hash and scroll the matching section, preserving app state. It does not grant `allow-same-origin` or relax the offline CSP. Existing saved HTML receives this adapter through GET preview; new compiled artifacts receive it during `readPreview`. Original customer source and historical reports are not rewritten.

The compiled browser driver now runs the actual compiled artifact inside an opaque `srcdoc` frame, using the same sandbox permissions as the product. It scopes interactions and evidence to the app frame and rejects navigation away from that document. Game checks accept the frame while resizing the containing browser page. The driver is installed whenever a sandbox is created or connected; no template rebuild is required.

Validation:

- A regression reproduces the old builder-navigation failure without the adapter.
- Desktop and phone checks verify fragment URLs, actual section scrolling, preserved state and blocked parent-document access.
- The actual Cutroom source was typechecked, rebuilt and tested in a fresh cloud sandbox on desktop and mobile. Story Map, Edit Planner, brief editing, style selection and refreshed plan output passed, without browser errors or failed requests.
- Both links were verified in the owner's Chrome preview. The prompt-box help sentence was removed.
