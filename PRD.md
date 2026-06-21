# draw.nous.my.id PRD

## Product idea
A lightweight, frontend-only whiteboard for quick sketching, diagrams, and note-taking. The experience should feel like an Excalidraw-style canvas: open, simple, fast, and friendly.

## Goals
- Help people sketch ideas without signing in or using a backend.
- Make it easy to draw on a dotted whiteboard canvas.
- Support quick diagramming, basic shapes, arrows, text, and freehand drawing.
- Save work locally in the browser.
- Work well on desktop and tablet, with basic touch support.

## Non-goals
- No accounts.
- No collaboration or sync.
- No AI or external API dependency.
- No server-side storage.
- No heavy editor complexity.

## Core experience
1. User opens the page and sees a clean whiteboard with a subtle dotted grid.
2. A toolbar provides tools like select, pen, rectangle, ellipse, arrow, text, and erase.
3. User can draw directly on the canvas.
4. User can drag shapes, edit text, and undo/redo.
5. The board auto-saves locally and can be exported as an image or JSON.

## MVP features
- Canvas with dotted background.
- Pan and zoom.
- Freehand pen tool.
- Rectangle tool.
- Ellipse tool.
- Arrow/line tool.
- Text tool.
- Select/move tool.
- Undo and redo.
- Clear board.
- Export PNG.
- Export/import JSON.
- Local persistence via localStorage or IndexedDB.

## Visual direction
- Whiteboard-first design.
- Neutral paper-like canvas.
- Fine dotted grid and soft shadows.
- Minimal tool chrome with clear icon buttons.
- Calm, functional, slightly handmade feel.
- Should evoke a real desk sketching surface rather than a generic SaaS app.

## Suggested stack
- Vanilla HTML, CSS, and JavaScript.
- Canvas 2D API for drawing.
- localStorage for MVP persistence.

## Success criteria
- A user can open the page and start drawing within seconds.
- The interface feels polished and obvious without a tutorial.
- Boards persist across refreshes.
- Export works cleanly.
- The app is useful even with no backend at all.
