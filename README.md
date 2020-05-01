## Ricochet Robots
Online multiplayer board game with multiple gamerooms and chat. Based on the board game designed by Alex Randolph, built with nodejs, socket.io, and express.

## What the game does right now:
- [x] User goes to website, sees landing page asking for roomID input
- [x] They can type in a friend's room, or their own ID to create that room
- [x] They are redirected to the game url, which can be shared with friends
- [x] They are asked for a display name
- [x] They can chat only with others in their room
- [x] Users can use 1,2,3,4 keys to switch between pieces
- [x] Users can move pieces using arrow keys
- [x] Everyone should be able to control the four colored pieces
- [x] The pieces move until they hit a wall

## Things to work on:
- [ ] Render persistent blocks at starting position
- [ ] Random board generation, along with piece start location randomizer button
- [ ] Add buttons so users can grab control, and show that in the chat
- [ ] Add mobile friendly buttons for movement, and get rid of chat on mobile (probably)
- [ ] Send only current gama data to sockets instead of all games
- [ ] Improve movement code to include visual transitions
- [ ] Make user elements pretty
- [ ] Add more server messages to chat (player leaving, player taking control)
- [ ] Add timer and other board game elements
