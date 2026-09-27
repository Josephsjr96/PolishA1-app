A single-file Polish learning web app. No build step, no server, no accounts. Just open index.html and go.

Covers greetings, ordering coffee, directions, the alphabet, grammar notes, plus two tabs most apps skip: 💘 Flirt (real lines, and what the answer actually means) and 🤬 Street (swearing — for understanding, not speaking).

✨ Features
📖 Learn — daily conversations, alphabet, word list, lessons, 31 grammar notes

💘 Flirt — openers, compliments, and how Polish refusals really sound

🤬 Street — swearing by level, and how to tell if it's aimed at you

➕ My Polish — add your own words and dialogues, saved locally

🎮 Fun Mode — quizzes, points, badges, homework

🧪 Exam — 15-question test with saved scores

🔥 Ahwaz Mode — hidden easter egg

📲 Install as an app
Works as a PWA — installable and offline-capable on Android, iOS, and desktop.

Android — tap Install, or ⋮ → Add to Home screen

iOS — Share → Add to Home Screen

Desktop — install icon in the address bar

🔊 Sound
Text-to-speech uses your browser's Polish voice — no audio files

Sound effects generated with the Web Audio API — zero kilobytes

Mute with the 🔊 button in the header

🗂 Structure
text
index.html      ← the entire app
manifest.json   ← PWA manifest
sw.js           ← service worker (offline)
icon-192.png
icon-512.png
sw.js and manifest.json are optional — the app works without them, minus offline mode and the install prompt.

🛠 Running it
Locally: just open index.html.

As a real PWA (needed for install + offline):

bash
python3 -m http.server 8000
Deploying: drop the files on GitHub Pages, Netlify, Vercel — anything static.

✍️ Adding content
In the app: use the ➕ My Polish tab. Saved to localStorage, never leaves your device.

In the code: content lives in constants near the top of the <script> block — DATA, ALPHABET, FLIRT_NOTES, STREET_NOTES, GRAMMAR_QUIZ, SLANG. Add to DATA and it becomes tappable, speakable, and quiz-ready automatically. Omit the letters field and a breakdown is auto-generated.

🔒 Privacy
No accounts, no server, no analytics. Only network request is Google Translate when you tap it. Clearing browser data deletes your entries — no cloud backup.

🤝 Contributing
PRs welcome — more content, better letter breakdowns, corrections, UI translations. In the Flirt and Street tabs, accuracy beats comfort: if a cultural note misleads, that's a bug.

📄 License
MIT

🙏 Credits
Made by Joe.

Powodzenia! 🇵🇱
