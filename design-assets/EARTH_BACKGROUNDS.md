# Workspace and login backgrounds

The interface uses IFB's neutral black/white surfaces and Arial. The main project area displays a large photographic background; primary actions use a restrained mint-to-blue pastel gradient.

## Dark mode: macOS Earth collection

All 22 Earth entries from the user's macOS aerial wallpaper collection are represented by actual video frames at 12 seconds, resized to 1920 pixels wide. Eighteen videos were cached locally; four frames were read from Apple video URLs in the local wallpaper manifest.

Runtime files: `public/earth/earth-01.jpg` through `earth-22.jpg`. `catalog.json` records each view's label, source ID and timestamp. `prepare-earth-gallery.py` reproduces extraction and preserves the sky catalog.

These are source video frames from the requested wallpaper collection. Original macOS videos and wallpaper settings were not changed. There is no live satellite feed.

## Light mode: blue sky and multiple clouds

Two original sky images were generated with the built-in image_gen tool in generation mode, without a reference image or CLI fallback. Both images were inspected before being integrated.

The unused original PNG copies were moved to Trash during cleanup. The runtime JPEGs below are retained; generation prompts remain documented.

Runtime JPEGs: `public/earth/sky-clouds-01.jpg`, `sky-clouds-02.jpg`.

Exact generation prompts:

1. Use case: photorealistic-natural. Asset type: widescreen background photograph for a light-mode SaaS workspace, 2048x1152. An expansive pale powder-blue sky filled with several soft white cumulus clouds, viewed looking upward from within the atmosphere. Airy natural photographic detail, bright daylight, broad white cloud formations in the lower and side areas, open subtle sky-blue space near the top center for a dark interface heading. Gentle lighting, whites and restrained light blues, calm clean high-key composition. Sky and clouds only: no Earth, planet, orbital horizon, space, ground, sun disk, birds, aircraft, text, logos, gradients drawn as graphics, or purple color. Real sky photograph aesthetics, not an illustration.

2. Use case: photorealistic-natural. Asset type: widescreen background photograph for a light-mode SaaS workspace, 2048x1152. A beautiful bright blue morning sky with multiple billowy white cloud banks and fine wisps of high clouds spread across the frame. Looking upward, photographic water-vapor texture and soft depth. Light pastel blue sky with clean white clouds, very soft sunlight, serene airy daylight, quiet top-center area for a dark interface heading. Sky and clouds only: no Earth, planet, orbital horizon, black space, ground, sun disk, birds, aircraft, text, logos, or purple color. Natural detailed cloudscape photography.

The two rejected white-space Earth source images and their runtime copies were deleted at the user's request. They are absent from the gallery and production build.

## Rotation and login

Selection is stored per user and theme. The project background advances on a new login, every two hours while the workspace is open, without an image selector. Reloads preserve the selection. New project-background images preload before the short fade; reduced motion disables that fade.

Login uses a static image from this same collection: Earth in dark mode, sky/clouds in light mode. The previous runtime video and poster were deleted. The decorative image panel is hidden and its image is not loaded below 1024px.
