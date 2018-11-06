# QuestOfRealms
A new take on an old-school text-based adventure.

QuestOfRealms was intended as a "just good enough" implementation to allow students to
improve their programming skills by enhancing the game. It includes technologies that
are likely to be encountered in modern software development:
- Electron node.js-based desktop app
- web application frameworks (backbone)
- document database (nedb)
- client-side javascript libraries (jQuery)

The game includes a game editor and the ability to play games.
The framework is designed for modding, and you can add your own characters and
specify their attributes and behaviours - create subdirectories in QuestOfRealms/assets/QuestOfRealms-plugins/
in the game editor. When exporting a game, all module dependencies will be exportted.
Some examples are provided in QuestOfRealms-plugins/default
