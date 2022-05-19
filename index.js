"use strict";

const roomSize = 80;
const roomMarginSize = 2;

let idCount = 0;
let game;

let newGameDiv;
let gameDiv;
let newGameForm;
let nPlayersInput;
let nTreasureInput;
let startButton;
let gameFieldDiv;
let winnerP;

function $(id) {
    return document.querySelector('#' + id);
}

class Point {
    x;
    y;

    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    equals(other) {
        if (other == null) return false;
        return this.x === other.x && this.y === other.y;
    }

    copy() {
        return new Point(this.x, this.y);
    }

    isOnField() {
        return 0 <= this.x && this.x < 7 && 0 <= this.y && this.y < 7;
    }

    closestArrowLocation() {
        if (this.x === 0) {
            return new Point(-1, this.y);
        }
        else if (this.x === 6) {
            return new Point(7, this.y);
        }
        else if (this.y === 0) {
            return new Point(this.x, -1);
        }
        else if (this.y === 6) {
            return new Point(this.x, 7);
        }
        else {
            throw new Error(`point ${this} is not on the edge`);
        }
    }

    isCorner() {
        return (this.x === 0 && this.y === 0) ||
            (this.x === 0 && this.y === 6) ||
            (this.x === 6 && this.y === 0) ||
            (this.x === 6 && this.y === 6);
    }
}

class GridControl {
    indexes;
    id;
    classList;
    innerHtml;

    get location() {
        return new Point(this.indexes.x * (roomSize + roomMarginSize), this.indexes.y * (roomSize + roomMarginSize));
    }

    get element() {
        return $(this.id);
    }

    constructor(indexes, classList, innerHtml) {
        this.indexes = indexes;
        this.classList = classList;
        this.innerHtml = innerHtml;
    }

    draw() {
        this.id = `id-${idCount}`
        idCount++;
        const loc = this.location;
        gameFieldDiv.innerHTML += `<div id="${this.id}" class="${this.classList.join(' ')}" style="position: absolute; top: ${loc.y}px; left: ${loc.x}px;">${this.innerHtml}</div>`;
    }

    move(point) {
        if (point == null) throw new Error(`point is ${point}`);

        this.indexes = point;
        const loc = this.location;
        this.element.style.left = `${loc.x}px`;
        this.element.style.top = `${loc.y}px`;
    }
}

class Room extends GridControl {
    rotation = 0;
    roomType;
    imageUrl;
    lastIndexesOnField = null;

    get isHighlighted() {
        return this.element.style.backgroundColor == 'greenyellow';
    }

    set isHighlighted(value) {

        this.element.style.backgroundColor = value ? 'greenyellow' : 'burlywood';
    }

    constructor(indexes, roomType, rotation) {
        let imageUrl;

        switch (roomType) {
            case Room.types.corridor:
                imageUrl = './assets/corridor.png';
                break;
            case Room.types.turn:
                imageUrl = './assets/turn.png';
                break;
            case Room.types.T:
                imageUrl = './assets/T.png';
                break;
        }
        super(new Point(0, 0), ['room-div'], `<img src="${imageUrl}">`);
        this.imageUrl = imageUrl;
        this.roomType = roomType;
        this.indexes = indexes;
        this.rotation = rotation;
    }

    rotateLeft(deg) {
        if (deg % 90 !== 0) {
            throw new Error(`Can't rotate with: ${deg}`);
        }

        this.rotation = (this.rotation + deg) % 360;

        this.element.style.transform = `rotate(${this.rotation}deg)`;

    }

    draw() {
        super.draw();
        this.element.style.transform = `rotate(${this.rotation}deg)`;
    }

    getAccessabelNeighbors() {
        let arr;
        const { x, y } = this.indexes;
        switch (this.roomType) {
            case Room.types.corridor:
                if (this.rotation === 0 || this.rotation === 180 || this.rotation === 360) {
                    arr = [new Point(x - 1, y), new Point(x + 1, y)];
                }
                else {
                    arr = [new Point(x, y - 1), new Point(x, y + 1)];
                }
                break;

            case Room.types.turn:
                switch (this.rotation) {
                    case 0:
                        arr = [new Point(x, y + 1), new Point(x - 1, y)];
                        break;
                    case 90:
                        arr = [new Point(x - 1, y), new Point(x, y - 1)];
                        break;
                    case 180:
                        arr = [new Point(x, y - 1), new Point(x + 1, y)];
                        break;
                    case 270:
                        arr = [new Point(x + 1, y), new Point(x, y + 1)];
                        break;
                }
                break;

            case Room.types.T:
                switch (this.rotation) {
                    case 0:
                        arr = [new Point(x, y + 1), new Point(x - 1, y), new Point(x + 1, y)];
                        break;
                    case 90:
                        arr = [new Point(x - 1, y), new Point(x, y - 1), new Point(x, y + 1)];
                        break;
                    case 180:
                        arr = [new Point(x, y - 1), new Point(x + 1, y), new Point(x - 1, y)];
                        break;
                    case 270:
                        arr = [new Point(x + 1, y), new Point(x, y + 1), new Point(x, y - 1)];
                        break;
                }
                break;


            default:
                throw new Error(`invalid room type in ${this}`)

        }

        return arr.filter(point => 0 <= point.x && point.x <= 6 && 0 <= point.y && point.y <= 6);
    }

    move(indexes) {

        let entityIndexes;

        if (indexes.equals(Room.extraRoomPlace)) {
            entityIndexes = this.indexes.copy();
            if (this.indexes.x === 0) {
                entityIndexes.x = 7;
            }
            else if (this.indexes.x === 6) {
                entityIndexes.x = -1;
            }
            else if (this.indexes.y === 0) {
                entityIndexes.y = 7;
            }
            else if (this.indexes.y === 6) {
                entityIndexes.y = -1;
            }
        }
        else {
            entityIndexes = indexes.copy();
        }


        game.players.filter(p => p.indexes.equals(this.indexes)).forEach(p => p.move(entityIndexes));

        const treasure = game.players.flatMap(p => p.treasures).find(t => t.indexes.equals(this.indexes));
        if (treasure !== undefined) {
            treasure.move(indexes);
        }

        if (this.indexes.isOnField()) {
            this.lastIndexesOnField = this.indexes.copy();
        }

        this.lastIndexes = this.indexes.copy();
        super.move(indexes);
    }


    static arrayOfRandomRooms() {
        const arr = [];
        for (let i = 0; i < 13; i++) {
            const rotation = Math.floor(Math.random() * 4) * 90;
            arr.push(new Room(null, Room.types.corridor, rotation));
        }
        for (let i = 0; i < 15; i++) {
            const rotation = Math.floor(Math.random() * 4) * 90;
            arr.push(new Room(null, Room.types.turn, rotation));
        }
        for (let i = 0; i < 6; i++) {
            const rotation = Math.floor(Math.random() * 4) * 90;
            arr.push(new Room(null, Room.types.T, rotation));
        }
        return arr;
    }

    static types = { corridor: 'corridor', turn: 'turn', T: 'T' };

    static extraRoomPlace = new Point(8, 0);
}

class Treasure extends GridControl {

    constructor(indexes) {
        super(indexes, ['treasure-icon'], Treasure.getNextInnerHtml());
    }

    hide() {
        this.element.style.display = 'none';
    }

    static getNextInnerHtml() {
        const res = `<span style="color: ${this.colors[this.colorCounter]};">${this.shapes[this.shapeCounter]}</span>`;
        this.shapeCounter++;
        if (this.shapeCounter === this.shapes.length) {
            this.shapeCounter = 0;
            this.colorCounter++;
        }
        return res;
    }
    static colors = ['gold', 'turquoise', 'purple', 'grey', 'pink', 'white'];
    static colorCounter = 0;
    static shapes = ['&#9734;', '&#9641;', '&#9825;', '&#9651;'];
    static shapeCounter = 0;
}

class Player extends GridControl {
    startIndexes;
    color;
    treasures = [];
    nTreasuresFound = 0;
    actualTreasure;
    number;

    get hasWon() {
        return this.hasCollectedAllTreasure() && this.hasReturnedToStart();
    }

    constructor() {
        super(new Point(0, 0), ['player-icon', `player-icon-${Player.colors[Player.playerCounter]}`], '');
        this.color = Player.colors[Player.playerCounter];
        this.indexes = Player.locations[Player.playerCounter];
        this.startIndexes = this.indexes;
        this.number = Player.playerCounter + 1;
        Player.playerCounter++;

    }

    draw() {
        super.draw();
        this.treasures.forEach(t => t.draw());
    }

    move(indexes) {
        super.move(indexes);
        if (indexes.equals(this.actualTreasure.indexes)) {
            this.actualTreasure.hide();
            this.nTreasuresFound++;
            this.actualTreasure = this.treasures[this.nTreasuresFound];
        }

        game.playerCards.find(pc => pc.player === this).refresh();


        if (this.hasReturnedToStart() && this.hasCollectedAllTreasure()) {
            winnerP.classList.remove('hidden');
            endGame(this);
        }
    }

    hasCollectedAllTreasure() {
        return this.nTreasuresFound === this.treasures.length;
    }

    hasReturnedToStart() {
        return this.startIndexes.equals(this.indexes);
    }

    static colors = ['red', 'blue', 'green', 'yellow'];
    static locations = [new Point(0, 0), new Point(6, 6), new Point(6, 0), new Point(0, 6)];
    static playerCounter = 0;

}

class PlayerCard extends GridControl {
    player;

    set isActive(val) {
        if(this.element != null) {
            this.element.classList.toggle('active-player-card', val);

        }
    }

    constructor(player) {
        const indexes = PlayerCard.#locations[PlayerCard.#locationCounter];
        PlayerCard.#locationCounter++;
        super(indexes, ['player-card'], `<p>Játékos #${player.number} <span class="player-icon" style="background-color: ${player.color};"></span></p><p> Megtalált kincsek: <span class="n-treasures-found">${player.nTreasuresFound}</span>/${player.treasures.length}</p><p class="go-to-start hidden">Menj vissza a<br> kezdő mezőre!</p><p class="actual-treasure-p">Aktuális kincs:</p><div class="treasure-card"><span>${player.actualTreasure.innerHtml}</span></div>`);
        this.player = player;
    }

    refresh() {
        this.element.querySelector('.n-treasures-found').innerHTML = this.player.nTreasuresFound;
        const allFound = this.player.hasCollectedAllTreasure();
        this.element.querySelector('.treasure-card').innerHTML = this.player.actualTreasure.innerHtml;
        this.element.querySelector('.actual-treasure-p').classList.toggle('hidden', allFound);
        this.element.querySelector('.treasure-card').classList.toggle('hidden', allFound);
        this.element.querySelector('.go-to-start').classList.toggle('hidden', !allFound);

        /*if(allFound) {
            this.element.querySelector('.treasure-card').style.display = 'hidden';
        }*/
    }
    

    static #locations = [new Point(8, 2), new Point(10, 2), new Point(8, 5), new Point(10, 5)];
    static #locationCounter = 0;
}

class Field {
    rooms = []
    extraRoom;

    constructor() {
        const fixRooms = [
            { x: 0, y: 0, type: Room.types.turn, rotation: 270 },
            { x: 0, y: 6, type: Room.types.turn, rotation: 180 },
            { x: 6, y: 0, type: Room.types.turn, rotation: 0 },
            { x: 6, y: 6, type: Room.types.turn, rotation: 90 },

            { x: 6, y: 2, type: Room.types.T, rotation: 90 },
            { x: 6, y: 4, type: Room.types.T, rotation: 90 },

            { x: 0, y: 2, type: Room.types.T, rotation: 270 },
            { x: 0, y: 4, type: Room.types.T, rotation: 270 },
            { x: 2, y: 0, type: Room.types.T, rotation: 0 },
            { x: 2, y: 2, type: Room.types.T, rotation: 270 },
            { x: 2, y: 4, type: Room.types.T, rotation: 180 },
            { x: 2, y: 6, type: Room.types.T, rotation: 180 },
            { x: 4, y: 0, type: Room.types.T, rotation: 0 },
            { x: 4, y: 2, type: Room.types.T, rotation: 0 },
            { x: 4, y: 4, type: Room.types.T, rotation: 90 },
            { x: 4, y: 6, type: Room.types.T, rotation: 180 }
        ];

        fixRooms.forEach(data => this.rooms.push(new Room(new Point(data.x, data.y), data.type, data.rotation)));

        const randRooms = Room.arrayOfRandomRooms();

        for (let i = 0; i < 7; i++) {
            for (let j = 0; j < 7; j++) {
                if (this.getRoom(i, j) == undefined) {
                    const randI = Math.floor(Math.random() * randRooms.length);
                    const room = randRooms[randI];
                    randRooms.splice(randI, 1);
                    room.indexes = new Point(i, j);
                    this.rooms.push(room);
                }
            }
        }

        this.extraRoom = randRooms[0];
        this.extraRoom.indexes = Room.extraRoomPlace;
    }

    getRoom(x, y) {
        return this.rooms.find(room => room.indexes.x === x && room.indexes.y === y);
    }

    draw() {
        this.rooms.forEach(room => room.draw());
        this.extraRoom.draw();
    }

    pushExtraRoomIn(arrowIndexes) {
        const { x, y } = arrowIndexes;
        //left -> right
        if (x === -1) {
            const temp = this.extraRoom;
            this.extraRoom = this.getRoom(6, y);
            const ind = this.rooms.indexOf(this.extraRoom);
            this.rooms.splice(ind, 1);
            this.extraRoom.move(Room.extraRoomPlace);

            for (let i = 5; i >= 0; i--) {
                this.getRoom(i, y).move(new Point(i + 1, y));
            }

            temp.move(new Point(0, y));
            this.rooms.push(temp);
        }
        //left <- right
        else if (x === 7) {
            const temp = this.extraRoom;
            this.extraRoom = this.getRoom(0, y);
            this.rooms.splice(this.rooms.indexOf(this.extraRoom), 1);
            this.extraRoom.move(Room.extraRoomPlace);


            for (let i = 1; i < 7; i++) {
                this.getRoom(i, y).move(new Point(i - 1, y));
            }

            temp.move(new Point(6, y));
            this.rooms.push(temp);
        }
        else if (y === -1) {
            const temp = this.extraRoom;
            this.extraRoom = this.getRoom(x, 6);
            const ind = this.rooms.indexOf(this.extraRoom);
            this.rooms.splice(ind, 1);
            this.extraRoom.move(Room.extraRoomPlace);

            for (let i = 5; i >= 0; i--) {
                this.getRoom(x, i).move(new Point(x, i + 1));
            }

            temp.move(new Point(x, 0));
            this.rooms.push(temp);
        }
        else if (y === 7) {
            const temp = this.extraRoom;
            this.extraRoom = this.getRoom(x, 0);
            this.rooms.splice(this.rooms.indexOf(this.extraRoom), 1);
            this.extraRoom.move(Room.extraRoomPlace);


            for (let i = 1; i < 7; i++) {
                this.getRoom(x, i).move(new Point(x, i - 1));
            }

            temp.move(new Point(x, 6));
            this.rooms.push(temp);
        }
    }

    highlightAccessableRooms(indexes) {
        const queue = [];
        const alreadyDone = []
        const start = this.getRoom(indexes.x, indexes.y)
        queue.push(start);
        alreadyDone.push(start);




        while (queue.length > 0) {
            const elem = queue.shift();

            elem.isHighlighted = true;
            const assumedNeighbours = elem.getAccessabelNeighbors().map(n => this.getRoom(n.x, n.y));
            const neighbours = assumedNeighbours.filter(r => r.getAccessabelNeighbors().find(i => i.x === elem.indexes.x && i.y === elem.indexes.y) !== undefined);
            const newNeighbours = neighbours.filter(n => !alreadyDone.includes(n));


            alreadyDone.push(...newNeighbours);
            queue.push(...newNeighbours);

        }

    }
}

class Game {
    players = [];
    field;
    #actualPlayer;
    arrows = [];
    playerCards = [];

    get actualPlayer() {
        return this.#actualPlayer;
    }

    set actualPlayer(val) {
        const oldIndex = this.players.indexOf(this.#actualPlayer);

        if(oldIndex !== -1) {
            this.playerCards[oldIndex].isActive = false;
        }

        
        this.#actualPlayer = val;
        const newIndex = this.players.indexOf(this.#actualPlayer);
        this.playerCards[newIndex].isActive = true;
    }

    constructor(nPlayers, nTreasure) {
        for (let i = 0; i < nPlayers; i++) {
            this.players.push(new Player());
        }

        this.field = new Field();

        for (let i = 0; i < 3; i++) {
            this.arrows.push(new Arrow(new Point(i * 2 + 1, -1), Arrow.directions.down));
            this.arrows.push(new Arrow(new Point(i * 2 + 1, 7), Arrow.directions.up));
            this.arrows.push(new Arrow(new Point(-1, i * 2 + 1), Arrow.directions.right));
            this.arrows.push(new Arrow(new Point(7, i * 2 + 1), Arrow.directions.left));
        }

        const treasreIndexes = this.generateTreasureIndexes(nPlayers, nTreasure);

        this.players.forEach(p => p.treasures = treasreIndexes.splice(0, nTreasure).map(i => new Treasure(i)));
        this.players.forEach(p => p.actualTreasure = p.treasures[0]);

        this.players.forEach(p => this.playerCards.push(new PlayerCard(p)));
        this.actualPlayer = this.players[0];

    }

    draw() {
        this.field.draw();
        this.players.forEach(player => player.draw());
        this.arrows.forEach(arrow => arrow.draw());
        this.playerCards.forEach(p => p.draw());
        
        this.playerCards.find(pc => pc.player === this.actualPlayer).isActive = true;
    }

    nextPlayer() {
        const oldIndex = this.players.indexOf(this.actualPlayer);
        const newIndex = oldIndex === this.players.length - 1 ? 0 : oldIndex + 1;
        this.actualPlayer = this.players[newIndex];
    }

    generateTreasureIndexes(nPlayers, nTreasure) {
        const nAllTreasure = nPlayers * nTreasure;
        const allIndexes = this.field.rooms.map(r => r.indexes).filter(r => !r.isCorner());
        const treasureIndexes = [];

        for (let i = 0; i < nAllTreasure; i++) {
            const ind = Math.floor(Math.random() * allIndexes.length);
            treasureIndexes.push(...allIndexes.splice(ind, 1));
        }

        return treasureIndexes;
    }

}

class Arrow extends GridControl {
    direction;

    constructor(indexes, direction) {
        const dirClass = `${direction}-arrow`;
        let char;
        switch (direction) {
            case Arrow.directions.up:
                char = '&#8593;';
                break;
            case Arrow.directions.down:
                char = '&#8595';
                break;
            case Arrow.directions.left:
                char = '&#8592;';
                break;
            case Arrow.directions.right:
                char = '&#8594;';
                break;
        }
        super(indexes, ['arrow-div', dirClass], char);
        this.direction = direction;
        this.indexes = indexes;
    }

    static directions = { up: 'up', down: 'down', left: 'left', right: 'right' }
}

window.addEventListener('load', init);

function init() {
    newGameDiv = $('new-game-div');
    gameDiv = $('game-div');
    newGameForm = $('new-game-form');
    nPlayersInput = $('nPlayers');
    nTreasureInput = $('nTreasure');
    gameFieldDiv = $('game-field-div');
    winnerP = $('winner-p');

    newGameForm.addEventListener('submit', newGameFormSubmitted);
    nPlayersInput.addEventListener('change', nPlayersInputChange);
    $('game-text-button').addEventListener('click', showGameText);

}

function newGameFormSubmitted(e) {
    e.preventDefault();

    const nPlayers = parseInt(nPlayersInput.value);
    const nTreasure = parseInt(nTreasureInput.value);

    game = new Game(nPlayers, nTreasure);
    game.draw();

    

    gameDiv.classList.remove('hidden');
    newGameDiv.classList.add('hidden');
    $('game-text').classList.add('hidden');

    document.addEventListener('mousedown', documentClicked);
    document.addEventListener('contextmenu', (ev) => ev.preventDefault());

    arrowsSubscribeListeners();

}

function nPlayersInputChange(e) {
    nTreasureInput.max = 24 / parseInt(e.target.value);
}

function documentClicked(e) {
    if (e.button === 2) {
        game.field.extraRoom.rotateLeft(90);
    }
}

function arrowControlMouseEntered(e) {
    const arrow = game.arrows.find(a => a.id === e.target.id);
    const indexes = arrow.indexes;
    game.field.extraRoom.move(indexes);
}

function arrowControlMouseLeft() {
    game.field.extraRoom.move(Room.extraRoomPlace);
}

function arrowControlClicked(e) {
    const arrow = game.arrows.find(a => a.id === e.target.id);
    game.field.pushExtraRoomIn(arrow.indexes);
    game.field.highlightAccessableRooms(game.actualPlayer.indexes);
    game.field.rooms.filter(r => r.isHighlighted).map(r => r.element.querySelector('img')).forEach(el => el.addEventListener('click', roomClicked));
    arrowsUnscrubscribeListeners();
}

function roomClicked(e) {
    const room = game.field.rooms.find(r => r.id === e.target.parentElement.id);
    game.actualPlayer.move(room.indexes);
    game.field.rooms.filter(r => r.isHighlighted).map(r => r.element.querySelector('img')).forEach(el => el.removeEventListener('click', roomClicked));
    game.field.rooms.forEach(r => { if (r.isHighlighted) { r.isHighlighted = false } });

    if (!game.actualPlayer.hasWon) {
        game.nextPlayer();
        arrowsSubscribeListeners();
    }
}

function arrowsSubscribeListeners() {
    const lastExtraRoomLoc = game.field.extraRoom.lastIndexesOnField;
    let lastArrowLoc;
    if (lastExtraRoomLoc != null) {
        lastArrowLoc = lastExtraRoomLoc.closestArrowLocation();
    }

    game.arrows.forEach(arrowControl => {
        if (!arrowControl.indexes.equals(lastArrowLoc)) {

            const element = arrowControl.element;
            element.addEventListener('mouseenter', arrowControlMouseEntered);
            element.addEventListener('mouseleave', arrowControlMouseLeft);
            element.addEventListener('click', arrowControlClicked);
            element.classList.add('arrow-active');
        }
    });
}

function arrowsUnscrubscribeListeners() {
    game.arrows.forEach(arrowControl => {
        const element = arrowControl.element;
        element.removeEventListener('mouseenter', arrowControlMouseEntered);
        element.removeEventListener('mouseleave', arrowControlMouseLeft);
        element.removeEventListener('click', arrowControlClicked);
        element.classList.remove('arrow-active');

    });
}

function endGame(winner) {
    arrowsUnscrubscribeListeners();
    winnerP.innerHTML = `A nyertes: ${winner.number}. számú játékos!<br><button>Új játék</button>`;
    winnerP.classList.remove('hidden');
    winnerP.querySelector('button').addEventListener('click', restartGame);
}

function showGameText() {
    $('game-text').classList.remove('hidden');
}

function restartGame() {
    location.reload();
}