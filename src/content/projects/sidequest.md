---
title: "SideQuest"
description: "A Chrome extension that turns any highlighted passage in a Claude reply into its own side chat, so follow-up questions never derail the main conversation."
tags: ["JavaScript", "CSS", "HTML"]
link: "https://chromewebstore.google.com/detail/sidequest/hgkkigjjnbjfbplckakbldnadnmepefm"
linkLabel: "Chrome Web Store"
image: "/projects/sidequest.png"
imageAlt: "SideQuest extension icon: a blue speech bubble reading SQ."
imageFit: "contain"
order: 2
draft: false
---

A Chrome extension for claude.ai. Highlight any passage in a Claude reply, click
the SideQuest button, and a small side chat opens about that passage — so asking
a follow-up doesn't push the thread you were already in off course.

The side chat is given the context surrounding the highlight rather than the
highlighted words alone, so a question about one line in a code block or one term
in a table is answered against where it came from instead of in isolation. A
single highlight can branch into more than one side chat.

## Features

- Full markdown rendering in the side chat, including code blocks and tables
- A panel that drags and resizes from any edge, and remembers where you left it
- Search across past side chats from the toolbar
- Any side chat can be opened as a full claude.ai tab
- Light and dark themes
- Sidebar saving can be switched off, and any chat deleted, at any point

## Privacy

There's no backend. The extension runs entirely in the browser and talks to
claude.ai directly over your existing session, so there's no API key to supply
and nothing to sign up for. It stores no keys and collects no data.

## Installing

After adding the extension, claude.ai needs a hard reload — cmd/ctrl + shift + R
— before the SideQuest button appears.

SideQuest is not affiliated with, endorsed by, or sponsored by Anthropic. Claude
is a trademark of Anthropic, used here to describe what the extension does.

Available on the
[Chrome Web Store](https://chromewebstore.google.com/detail/sidequest/hgkkigjjnbjfbplckakbldnadnmepefm).
