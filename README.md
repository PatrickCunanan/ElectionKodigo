# ElectionKodigo — May 2028 draft

ElectionKodigo is a small, static browser app for creating a ballot-style image
of a personal voting reference ("kodigo"). This branch is a **draft scaffold** for
the May 2028 Philippine national elections. It is not an official ballot or
election service, and it does not submit or save votes.

> **Placeholder data:** Candidate and party-list names and all displayed list
> sizes are sample placeholders, not proposed or verified 2028 ballot
> information. Replace and verify them against authoritative sources before
> publishing or using the page.

## Current behavior

- Renders placeholder choices for President, Vice President, Senators, and
  Party-list from one configuration file.
- Displays choices in a compact, ballot-inspired layout.
- Allows one President, one Vice President, one Party-list choice, and up to
  12 Senators. Image creation requires the three single-choice selections and
  at least one Senator.
- Reports missing required choices and enforces the Senator limit.
- Generates a high-resolution, portrait 9:16 PNG (1080 × 1920 pixels) with
  selected entries stacked in one column, and shows an image preview with a
  download link. Downloaded filenames include the UTC generation timestamp.
- Clears an outdated image preview whenever selections change and describes
  the generated image's selected entries to assistive technology.
- Keeps the current choice summary and the make/clear buttons visible in a
  bottom action bar while the user scrolls.
- Keeps all selections in the current page only; no server or browser storage
  is used.
- Uses local assets only; no CDN or runtime package dependencies are required.

The placeholder counts currently set to 10 President, 9 Vice President, 64
Senator, and 177 Party-list entries are temporary UI/testing values. They are
not estimates or claims about the 2028 ballot. The Senator limit is also a
configurable draft setting and must be confirmed before release.

## Project structure

| Path | Purpose |
| --- | --- |
| `index.html` | Accessible page shell, draft notice, action buttons, and PNG preview. |
| `assets/js/placeholder-data.js` | 2028 draft metadata, office labels, placeholder counts, and selection limits. |
| `assets/js/app.js` | Renders choices, validates selections, and generates the PNG reference. |
| `assets/css/app.css` | Responsive ballot-inspired selection UI and image preview styles. |
| `index.php` | PHP hosting entry point that includes `index.html`. |

## Run locally

There is no build or installation step. Open `index.html` directly in a
browser, or serve the repository root with a static web server. The page uses
no network requests, so its ballot and interactions also work offline.

## Updating the 2028 ballot

1. Verify the offices, candidate names, affiliations, ballot numbers, and
   selection rules against authoritative election information.
2. Replace the placeholder counts and labels in
   `assets/js/placeholder-data.js` with verified data. For production use,
   replace generated placeholder entries with an explicit, reviewed candidate
   data list so the page cannot imply that sequential sample numbers are
   official ballot numbers.
3. Confirm required offices and selection limits, especially the Senator
   limit. Update the selection validation and copy if the official rules differ.
4. Review the screen layout and generated PNG at desktop and mobile sizes.
   Test missing selections, valid selections, the maximum Senator count, an
   attempted extra Senator, and clearing the form.
5. Remove the draft warning only after all ballot data and behavior have been
   checked and approved.

## Validation

The repository does not currently define a build, lint, or automated test
suite. A JavaScript syntax check can be run with Node.js:

```sh
node --check assets/js/placeholder-data.js
node --check assets/js/app.js
```

Also test the user flow in a browser and inspect the generated PNG before
publishing.
