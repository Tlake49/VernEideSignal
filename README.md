# Vern Eide Signal website prototype

A standalone HTML/CSS/JavaScript site for Vern Eide Signal that runs locally and is ready for GitHub Pages. It includes:

- Home page with the newest issue and its current stories
- Readable article overlays that dim and blur the page behind them
- Articles / Previous Issues page with a keyboard-, click- and swipe-friendly page-turning reader
- Games page with working daily Verdle and Sudoku games
- Source PDFs plus browser-sized page images for the issue reader
- A content structure designed to translate cleanly into WordPress later

## Run it locally

The site needs a small local web server because Verdle loads its word list as a separate file.

1. Open Terminal and move into the `signal-site` folder.
2. Run `python3 -m http.server 8000`.
3. Visit `http://localhost:8000` in a browser.

Do not open `index.html` directly from Finder: most browsers block the word-list request when a site is opened as a `file://` URL.

## Publish with GitHub Pages

The repository is structured to publish directly from its root folder—no build step is required.

1. In the GitHub repository, open **Settings → Pages**.
2. Under **Build and deployment**, choose **Deploy from a branch**.
3. Select the `main` branch and `/ (root)`, then save.
4. After `verneidesignal.com` is purchased, enter it under **Custom domain** in the same Pages settings.
5. Add the DNS records GitHub displays, then enable **Enforce HTTPS** after DNS verification completes.

Do not add a `CNAME` file until the domain is owned and ready to connect; GitHub will create or update it when the custom domain is saved.

## Folder guide

```text
signal-site/
├── index.html              Home
├── articles.html           Web articles and issue reader
├── games.html              Games landing page
├── css/site.css            Shared Signal visual system
├── js/
│   ├── content.js          Issue and article content
│   ├── site.js             Navigation and article overlays
│   └── reader.js           Page-turn reader behavior
├── assets/
│   ├── issues/             Original PDFs
│   └── pages/              Reader-ready JPG pages
└── games/
    ├── shared/css/         Original shared game styling
    ├── verdle/             Verdle page, styling, word list and logic
    └── sudoku/             Sudoku page, styling and logic
```

The uploaded game HTML and CSS were preserved and integrated. The uploaded bundle referenced two `app.js` files that were not included in the available attachments, so replacement daily game logic is included. Both games use a local calendar date as their seed, and progress is stored by date in `localStorage`. Sudoku also stores each difficulty separately.

## Add a new article

Open `js/content.js` and add an object to the `articles` array. Each article needs:

- `id`: a short unique slug
- `category`
- `title`
- `dek`: the card summary and modal standfirst
- `byline`
- `image`: a path to an image or newsletter page
- `body`: an array with one paragraph per quoted string

The Home and Articles pages build their cards from that single list. No HTML rewiring is required. Put the newest stories first. The Home page currently shows the first five; change `data-limit="5"` in `index.html` if a future issue needs a different number.

## Add a new issue

1. Export the PDF from InDesign using the settings below.
2. Place it in `assets/issues/`.
3. Export or render each page as a JPG and place the files in `assets/pages/your-issue-id/` as `page-1.jpg`, `page-2.jpg`, and so on.
4. Add the issue to the beginning of the `issues` array in `js/content.js`. Set `id`, `title`, `kicker`, `pages`, `pdf`, and `note`.
5. Update the Home hero cover path, issue label and introductory copy in `index.html`.

The archive currently contains the web-ready Fall 2026, Summer 2026, Spring 2026, Winter 2026 and Fall 2025 editions. Fall 2026 is the current issue.

## Recommended InDesign export workflow

Maintain two PDF presets: one for print and one for the website. Keep the existing PDF/X-4 preset for the printer; do not use that large press file as the web reader asset.

For the web preset:

1. Choose **File → Export → Adobe PDF (Interactive)** when the document only needs links, or **Adobe PDF (Print)** with the **High Quality Print** preset when production consistency matters more.
2. Export as **Pages**, not Spreads. The reader pairs or turns pages itself and needs one image per page.
3. Use the document page size with **no printer marks** and **no bleed** in the web export.
4. Downsample color and grayscale images to **144 ppi** for images above 216 ppi. Use JPEG compression at **High** quality.
5. Convert colors to **sRGB IEC61966-2.1** for predictable browser color. Include the profile.
6. Enable **Create Tagged PDF**, **Optimize for Fast Web View**, bookmarks and hyperlinks when available.
7. Keep fonts embedded/subset. Avoid interactive InDesign page transitions; the website supplies its own page-turn behavior.
8. Name the file with a stable lowercase slug, such as `signal-summer-2026.pdf`.

For page images, export JPEG from InDesign as individual pages at **144 ppi**, RGB, High quality. The page reader performs best when every page in an issue has identical pixel dimensions. A target around 1200 pixels on the long edge balances sharpness and speed. Use sequential names beginning with `page-1.jpg`.

Before publishing, open the PDF in both Acrobat and a web browser, confirm the page count, test all links, and verify that the first and last pages display. This catches the type of broken page index present in the supplied Spring file.

## WordPress migration path

The prototype is deliberately content-driven:

- Convert each item in `articles` to a WordPress **Article** custom post type with Category, Dek, Byline and Issue fields.
- Convert each item in `issues` to an **Issue** custom post type with Season, PDF, Page Count, Cover and Page Images fields.
- Use Advanced Custom Fields or native post meta for those fields.
- Turn the shared header/footer and article card into template parts.
- Move `site.css`, the modal behavior and reader behavior into the theme assets.
- Query the newest Issue on the front page, then query Articles related to that Issue.

That model preserves the current experience while letting an editor add a new issue and its articles from the WordPress dashboard rather than editing templates.

## Daily game behavior

- Verdle selects from the short editorial answer list in `games/verdle/app.js` and validates guesses against `valid-words.txt`.
- Sudoku deterministically generates one puzzle per date and difficulty.
- Saved game keys include the date, so a new local day creates new boards without deleting past results.
- Keep the date-key and storage-key formats stable when moving the games into WordPress; changing them will reset players' in-progress games.
