## Ricochet Robots
Online multiplayer board game with multiple gamerooms and chat. Based on the board game designed by Alex Randolph, built with nodejs, socket.io, and express.

## What the game does right now:
- [x] User goes to website, sees landing page asking for roomID input, offers random roomID
- [x] They can type in a friend's room, or their own ID to create that room
- [x] They are redirected to the game url, which can be shared with friends. Chat displays url for first person in room.
- [x] They are asked for a display name
- [x] They can chat only with others in their room
- [x] Chat shows messages from server when players enter and leave
- [x] Users can use 1,2,3,4 keys to switch between pieces
- [x] Users can move pieces using arrow keys
- [x] Everyone should be able to control the four colored pieces
- [x] The pieces move until they hit a wall
- [x] Random board generation (420 unique boards)
- [x] Reset level button to bring pieces back to starting position so player can try again
- [x] New level button to see a new challenge with new board, piece positions, and goal

## Things to work on:

- [ ] Add keyboard shortcuts for reset button (not new game button because player may accidentally press)
- [ ] Add timer and other board game elements
- [ ] Add ui element: 4 boxes with colors and numbers associated with pieces to remind user, also clickable, and box fills in for active piece
- [ ] Make mobile friendly! Add mobile friendly buttons for movement, and get rid of chat on mobile (probably)
- [ ] Send only room relevant data to sockets instead of all games
- [ ] Improve movement code to include visual transitions
- [ ] Polish ui (buttons, layout) and graphics
