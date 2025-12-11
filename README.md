# PoE2 Campaign Guide

A web application for creating and managing personal Path of Exile 2 campaign guides. Users can create guides organized by game acts with a rich text editor supporting images.

## Features

- Multi-user support with separate guide data per user
- Organize content by Acts (1-4) and Interludes (I-III)
- Rich text editor with formatting and image upload
- Dark/light theme toggle
- Click-to-expand image lightbox

## Setup

```bash
pip install -r requirements.txt
python server.py
```

Open http://localhost:5000 in your browser.

## Usage

1. Create a new user or select an existing one
2. Click "Edit Guide" to add/edit sections
3. Use the sidebar to navigate between acts
4. Click images to view them at full size
